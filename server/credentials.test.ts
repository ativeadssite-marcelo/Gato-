import { test } from "node:test";
import assert from "node:assert";
import crypto from "node:crypto";
import {
  activateMachine,
  createOrRotateCredential,
  deactivateMachine,
  findCredentialBySecret,
  getActiveActivation,
  getCredential,
  listCredentials,
  revokeCredential,
} from "./credentials";
import { ROLE_DEFINITIONS } from "./rbacEngine";
import { isMenuVisible } from "../src/utils/menuAccess";
import type { UserSession } from "../src/types";

// =========================================================================
// CREDENCIAIS DE INTEGRAÇÃO DO TENANT (chave de API + licença de máquina)
//
// O que estes testes protegem, em ordem de importância:
//  1. O segredo em claro nunca é persistido.
//  2. Rotacionar/revogar cortam o acesso de verdade.
//  3. A licença trava em UMA máquina ativa.
// =========================================================================

const actor = { id: "usr_test_actor", name: "Admin do Tenant" };
const sha256 = (s: string) => crypto.createHash("sha256").update(s, "utf8").digest("hex");

async function issue(tenantId: string, kind: "api_key" | "machine_license", capabilities = ["sales" as const]) {
  return createOrRotateCredential({ tenantId, kind, capabilities: [...capabilities], actor });
}

// -------------------------------------------------------------------------
// Segredo
// -------------------------------------------------------------------------

test("a credencial guarda só prefixo e hash — o segredo não fica em claro", async () => {
  const tenantId = "tenant_cred_hash";
  const { credential, secret } = await issue(tenantId, "api_key");

  assert.ok(secret.startsWith("gato_live_"), "formato esperado do segredo");
  assert.equal(credential.keyHash, sha256(secret));
  assert.ok(secret.startsWith(credential.keyPrefix), "o prefixo é o início do segredo");
  assert.equal(credential.keyLast4, secret.slice(-4));
  assert.ok(
    !JSON.stringify(credential).includes(secret),
    "o objeto persistido não pode conter o segredo",
  );
  // Nem a senha do hash pode estar em claro em algum campo.
  assert.equal(credential.keyHash.length, 64);
});

test("resolver pelo segredo funciona; um segredo vizinho não", async () => {
  const tenantId = "tenant_cred_lookup";
  const { credential, secret } = await issue(tenantId, "api_key");

  const found = await findCredentialBySecret(secret);
  assert.equal(found?.id, credential.id);

  const tampered = `${secret.slice(0, -1)}${secret.endsWith("A") ? "B" : "A"}`;
  assert.equal(await findCredentialBySecret(tampered), undefined);

  assert.equal(await findCredentialBySecret("gato_live_naoexiste"), undefined);
  assert.equal(await findCredentialBySecret(""), undefined);
});

test("rotacionar invalida o segredo anterior na hora", async () => {
  const tenantId = "tenant_cred_rotate";
  const first = await issue(tenantId, "api_key");
  assert.equal((await findCredentialBySecret(first.secret))?.id, first.credential.id);

  const second = await issue(tenantId, "api_key");

  assert.equal(await findCredentialBySecret(first.secret), undefined, "o segredo antigo morre");
  assert.equal((await findCredentialBySecret(second.secret))?.id, second.credential.id);
  // Segue sendo UMA credencial por tenant: o id se mantém.
  assert.equal(second.credential.id, first.credential.id);
  assert.ok(second.credential.rotatedAt, "marca a rotação");
  assert.equal((await listCredentials(tenantId)).filter((c) => c.kind === "api_key").length, 1);
});

test("revogar impede a autenticação, mas a credencial segue localizável", async () => {
  const tenantId = "tenant_cred_revoke";
  const { credential, secret } = await issue(tenantId, "api_key");

  const revoked = await revokeCredential(tenantId, "api_key");
  assert.equal(revoked?.active, false);

  // Localizável (para a auditoria distinguir "revogada" de "inexistente")...
  const found = await findCredentialBySecret(secret);
  assert.equal(found?.id, credential.id);
  // ...porém inativa, que é o que o middleware usa para recusar.
  assert.equal(found?.active, false);
});

test("cada tipo tem no máximo uma credencial por tenant", async () => {
  const tenantId = "tenant_cred_unique";
  await issue(tenantId, "api_key");
  await issue(tenantId, "machine_license");

  const all = await listCredentials(tenantId);
  assert.equal(all.filter((c) => c.kind === "api_key").length, 1);
  assert.equal(all.filter((c) => c.kind === "machine_license").length, 1);
  assert.equal(all.length, 2);
});

test("credenciais de tenants diferentes não se cruzam", async () => {
  const a = await issue("tenant_cred_iso_a", "api_key");
  const b = await issue("tenant_cred_iso_b", "api_key");

  assert.equal((await findCredentialBySecret(a.secret))?.tenantId, "tenant_cred_iso_a");
  assert.equal((await findCredentialBySecret(b.secret))?.tenantId, "tenant_cred_iso_b");
  assert.notEqual(a.credential.id, b.credential.id);
});

// -------------------------------------------------------------------------
// Licença de máquina: uma ativa por vez
// -------------------------------------------------------------------------

test("a licença ativa em uma máquina e recusa a segunda", async () => {
  const tenantId = "tenant_lic_bound";
  const { credential } = await issue(tenantId, "machine_license");

  const first = await activateMachine(credential, "machine-A", "Balcão 1");
  assert.equal(first.outcome, "activated");

  const second = await activateMachine(credential, "machine-B", "Balcão 2");
  assert.equal(second.outcome, "already_bound");
  if (second.outcome === "already_bound") {
    assert.equal(second.current.machineId, "machine-A", "informa qual máquina está ativa");
  }
});

test("reativar a MESMA máquina é idempotente (o app pode reiniciar)", async () => {
  const tenantId = "tenant_lic_idem";
  const { credential } = await issue(tenantId, "machine_license");

  const first = await activateMachine(credential, "machine-A");
  const again = await activateMachine(credential, "machine-A");

  assert.equal(again.outcome, "activated");
  if (first.outcome === "activated" && again.outcome === "activated") {
    assert.equal(again.activation.id, first.activation.id, "não cria vínculo novo");
  }
});

test("desativar libera o posto para outra máquina", async () => {
  const tenantId = "tenant_lic_rebind";
  const { credential } = await issue(tenantId, "machine_license");

  await activateMachine(credential, "machine-A");
  assert.deepEqual(await deactivateMachine(credential, "machine-A"), { ok: true });

  const moved = await activateMachine(credential, "machine-B");
  assert.equal(moved.outcome, "activated");
  if (moved.outcome === "activated") assert.equal(moved.activation.machineId, "machine-B");
});

test("só a máquina vinculada consegue se desativar", async () => {
  const tenantId = "tenant_lic_mismatch";
  const { credential } = await issue(tenantId, "machine_license");
  await activateMachine(credential, "machine-A");

  const wrong = await deactivateMachine(credential, "machine-B");
  assert.equal(wrong.ok, false);
  assert.equal(wrong.reason, "machine_mismatch");

  // E o vínculo continua de pé.
  assert.equal((await getActiveActivation(credential.id))?.machineId, "machine-A");
});

test("licença revogada não ativa", async () => {
  const tenantId = "tenant_lic_revoked";
  const { credential } = await issue(tenantId, "machine_license");
  await revokeCredential(tenantId, "machine_license");

  const attempt = await activateMachine(credential, "machine-A");
  assert.equal(attempt.outcome, "revoked");
});

test("revogar a licença desativa a máquina vinculada", async () => {
  const tenantId = "tenant_lic_revoke_unbind";
  const { credential } = await issue(tenantId, "machine_license");
  await activateMachine(credential, "machine-A");

  await revokeCredential(tenantId, "machine_license");

  // Sem isto o aplicativo continuaria "ativado" com uma licença morta.
  assert.equal(await getActiveActivation(credential.id), undefined);
});

test("gerar a licença de novo limpa o estado de revogação", async () => {
  const tenantId = "tenant_lic_reissue";
  await issue(tenantId, "machine_license");
  await revokeCredential(tenantId, "machine_license");

  const { credential } = await issue(tenantId, "machine_license");
  assert.equal(credential.active, true);
  assert.equal(credential.revokedAt, undefined);

  const activation = await activateMachine(credential, "machine-A");
  assert.equal(activation.outcome, "activated");
});

test("getCredential devolve a credencial do tipo pedido", async () => {
  const tenantId = "tenant_cred_get";
  await issue(tenantId, "api_key");
  assert.equal((await getCredential(tenantId, "api_key"))?.kind, "api_key");
  assert.equal(await getCredential(tenantId, "machine_license"), undefined);
});

// -------------------------------------------------------------------------
// Menu: quem enxerga a tela
// -------------------------------------------------------------------------

function sessionForRole(roleCode: string): UserSession {
  const role = ROLE_DEFINITIONS[roleCode as keyof typeof ROLE_DEFINITIONS]!;
  return {
    id: "usr_menu_test",
    name: "Teste",
    email: "teste@empresa.com.br",
    role: "administrador",
    roleLabel: role.name,
    roleCode,
    isSaasScope: role.scope === "saas",
    permissions: { ...role.permissions },
    branchId: "br1",
    branchUf: "MS",
    branchName: "Matriz",
    cdName: "CD",
    cdCode: "CD1",
    avatarInitials: "TT",
    loginTime: "09:00",
  };
}

test("menu: Chaves & Integrações aparece para o admin do tenant e para o dono", () => {
  assert.equal(isMenuVisible("chaves", sessionForRole("super_admin")), true, "dono/SaaS");
  assert.equal(isMenuVisible("chaves", sessionForRole("tenant_admin")), true, "admin do tenant");
  assert.equal(isMenuVisible("chaves", sessionForRole("saas_suporte")), true, "suporte rotaciona por chamado");
});

test("menu: Chaves & Integrações não aparece para quem não administra credenciais", () => {
  assert.equal(isMenuVisible("chaves", sessionForRole("tenant_user")), false);
  assert.equal(isMenuVisible("chaves", sessionForRole("tenant_readonly")), false);
  assert.equal(isMenuVisible("chaves", sessionForRole("saas_financeiro")), false);
});
