import { test, before, after } from "node:test";
import assert from "node:assert";
import http from "node:http";
import type { AddressInfo } from "node:net";
import express from "express";
import { rbacRouter } from "./rbacRoutes";
import { authRouter } from "./authRoutes";
import { issueSessionToken } from "./auth";
import { AUDIT_LOGS_DATA, RBAC_USERS_DATA } from "./rbacEngine";
import { appendAuditLog } from "./auditStore";
import type { RbacUser } from "../src/types/rbac";

// =========================================================================
// SENHA DE LOGIN NA CRIAÇÃO DE USUÁRIO E NO RESET
//
// A regressão que estes testes guardam: `POST /api/rbac/users` criava o usuário
// e nunca registrava credencial, então a conta criada pela tela era incapaz de
// logar; e o reset gerava um token que não era guardado nem devolvido, sem
// mudar senha alguma. Os dois casos só aparecem no caminho COMPLETO (criar →
// autenticar), por isso o teste sobe o express de verdade e faz o login.
// =========================================================================

const MGN_TENANT = "cmtt58e6o0000ju346a0g6s32";

const mgnAdmin = RBAC_USERS_DATA.find((u) => u.id === "usr_tenant_mgn_adm")!;
const mgnUser = RBAC_USERS_DATA.find((u) => u.id === "usr_tenant_mgn_user")!;
const pantanalReadonly = RBAC_USERS_DATA.find((u) => u.id === "usr_tenant_pantanal_ro")!;

const app = express();
app.use(express.json());
app.use("/api/rbac", rbacRouter);
app.use("/api/auth", authRouter);
const server = http.createServer(app);
let baseUrl = "";

before(async () => {
  await new Promise<void>((resolve) => server.listen(0, resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(() => {
  server.close();
});

/** E-mail único por chamada: as credenciais ficam num Map sem remoção pública. */
let emailSeq = 0;
const uniqueEmail = (prefix: string) => `${prefix}.${Date.now()}.${emailSeq++}@teste.com.br`;

async function request(method: string, path: string, token: string, body?: unknown) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: (await res.json().catch(() => null)) as any };
}

/** Login sem token: é o caminho que o usuário real percorre. */
async function login(email: string, password: string) {
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return { status: res.status, body: (await res.json().catch(() => null)) as any };
}

/** Remove o usuário criado pelo teste do array compartilhado. */
function cleanupUser(userId: string) {
  const index = RBAC_USERS_DATA.findIndex((u) => u.id === userId);
  if (index >= 0) RBAC_USERS_DATA.splice(index, 1);
}

async function createUser(
  token: string,
  overrides: Record<string, unknown> = {},
): Promise<{ status: number; body: any; email: string }> {
  const email = (overrides.email as string) || uniqueEmail("novo");
  const res = await request("POST", "/api/rbac/users", token, {
    name: "Amanda Nogueira",
    email,
    roleCode: "tenant_user",
    department: "Balcão",
    tenantPermissions: ["sales"],
    password: "SenhaForte123",
    ...overrides,
  });
  return { ...res, email };
}

// -------------------------------------------------------------------------
// Criação com senha — o caminho que destrava a camada de equipe
// -------------------------------------------------------------------------

test("usuário criado pelo admin do tenant consegue logar com a senha definida", async () => {
  const token = issueSessionToken(mgnAdmin).token;
  const created = await createUser(token);
  const user = created.body?.user as RbacUser;

  try {
    assert.equal(created.status, 200, JSON.stringify(created.body));
    assert.ok(user?.id, "a resposta deve trazer o usuário criado");
    assert.equal(user.tenantId, MGN_TENANT, "o servidor força o tenant do chamador");

    const auth = await login(created.email, "SenhaForte123");
    assert.equal(auth.status, 200, "a conta recém-criada precisa conseguir autenticar");
    assert.equal(auth.body.user.email, created.email);
  } finally {
    cleanupUser(user?.id);
  }
});

test("criação sem senha é recusada e não deixa usuário pela metade", async () => {
  const token = issueSessionToken(mgnAdmin).token;
  const antes = RBAC_USERS_DATA.length;

  const res = await request("POST", "/api/rbac/users", token, {
    name: "Sem Senha",
    email: uniqueEmail("semsenha"),
    roleCode: "tenant_user",
    password: "",
  });

  assert.equal(res.status, 400);
  assert.equal(res.body.code, "RBAC_WEAK_PASSWORD");
  assert.equal(RBAC_USERS_DATA.length, antes, "nada pode ter sido criado");
});

test("senha fraca é recusada e o usuário não entra no array", async () => {
  const token = issueSessionToken(mgnAdmin).token;
  const antes = RBAC_USERS_DATA.length;

  const curta = await createUser(token, { password: "1234" });
  assert.equal(curta.status, 400);
  assert.equal(curta.body.code, "RBAC_WEAK_PASSWORD");

  const previsivel = await createUser(token, { password: "senha123" });
  assert.equal(previsivel.status, 400);

  assert.equal(RBAC_USERS_DATA.length, antes, "nenhuma tentativa recusada pode criar usuário");
});

test("e-mail já cadastrado é recusado com 409 sem criar usuário", async () => {
  const token = issueSessionToken(mgnAdmin).token;
  const antes = RBAC_USERS_DATA.length;

  const res = await createUser(token, { email: mgnUser.email });

  assert.equal(res.status, 409);
  assert.equal(res.body.code, "RBAC_EMAIL_ALREADY_REGISTERED");
  assert.equal(RBAC_USERS_DATA.length, antes);
});

test("admin do tenant não cria usuário apontando para outra empresa", async () => {
  const token = issueSessionToken(mgnAdmin).token;
  const antes = RBAC_USERS_DATA.length;

  // O middleware de isolamento recusa a requisição ANTES do handler: pedir outro
  // tenant pelo corpo é tratado como tentativa de acesso cruzado, não como um
  // valor a ser ignorado.
  const res = await createUser(token, { tenantId: "cmtvk1ieq0000ju8c3kg5n85l" });

  assert.equal(res.status, 403, JSON.stringify(res.body));
  assert.equal(res.body.code, "RBAC_TENANT_ISOLATION");
  assert.equal(RBAC_USERS_DATA.length, antes, "nada pode ter sido criado");
});

// -------------------------------------------------------------------------
// Reset de senha — antes era decorativo
// -------------------------------------------------------------------------

test("reset troca a senha de verdade: a antiga para de funcionar", async () => {
  const token = issueSessionToken(mgnAdmin).token;
  const created = await createUser(token, { password: "SenhaAntiga123" });
  const user = created.body?.user as RbacUser;

  try {
    const antes = await login(created.email, "SenhaAntiga123");
    assert.equal(antes.status, 200, "a senha definida na criação precisa valer");

    const res = await request("POST", `/api/rbac/users/${user.id}/reset-password`, token, {
      newPassword: "SenhaNova456",
    });
    assert.equal(res.status, 200, JSON.stringify(res.body));

    const antiga = await login(created.email, "SenhaAntiga123");
    assert.equal(antiga.status, 401, "a senha anterior não pode continuar valendo");

    const nova = await login(created.email, "SenhaNova456");
    assert.equal(nova.status, 200, "a senha redefinida precisa autenticar");
  } finally {
    cleanupUser(user?.id);
  }
});

test("reset recusa senha fraca sem alterar a atual", async () => {
  const token = issueSessionToken(mgnAdmin).token;
  const created = await createUser(token, { password: "SenhaBoa123" });
  const user = created.body?.user as RbacUser;

  try {
    const res = await request("POST", `/api/rbac/users/${user.id}/reset-password`, token, {
      newPassword: "abc",
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.code, "RBAC_WEAK_PASSWORD");

    const atual = await login(created.email, "SenhaBoa123");
    assert.equal(atual.status, 200, "a senha atual não pode ser afetada por uma tentativa inválida");
  } finally {
    cleanupUser(user?.id);
  }
});

test("reset em usuário de outra empresa segue bloqueado pelo isolamento", async () => {
  const token = issueSessionToken(mgnAdmin).token;

  const res = await request("POST", `/api/rbac/users/${pantanalReadonly.id}/reset-password`, token, {
    newPassword: "SenhaInvasor123",
  });

  assert.equal(res.status, 403);
  assert.equal(res.body.code, "RBAC_TENANT_ISOLATION");
});

test("trilha registra o reset sem guardar a senha nem o hash", async () => {
  const token = issueSessionToken(mgnAdmin).token;
  const created = await createUser(token, { password: "SenhaAntiga123" });
  const user = created.body?.user as RbacUser;

  try {
    await request("POST", `/api/rbac/users/${user.id}/reset-password`, token, {
      newPassword: "SenhaNova456",
    });

    const registro = AUDIT_LOGS_DATA[0];
    assert.equal(registro.action, "TRIGGER_PASSWORD_RESET");

    const serializado = JSON.stringify(registro);
    assert.equal(
      serializado.includes("SenhaNova456"),
      false,
      "a senha em claro nunca entra na trilha",
    );
    assert.equal(serializado.includes("SenhaAntiga123"), false);
    assert.ok(registro.afterState?.resetBy, "a trilha deve dizer quem redefiniu");
  } finally {
    cleanupUser(user?.id);
  }
});

test("criação de usuário não grava a senha na trilha de auditoria", async () => {
  const token = issueSessionToken(mgnAdmin).token;
  const created = await createUser(token, { password: "SenhaSecreta999" });
  const user = created.body?.user as RbacUser;

  try {
    const registro = AUDIT_LOGS_DATA[0];
    assert.equal(registro.action, "CREATE_USER_ACCOUNT");
    assert.equal(JSON.stringify(registro).includes("SenhaSecreta999"), false);
  } finally {
    cleanupUser(user?.id);
  }
});

// -------------------------------------------------------------------------
// appendAuditLog — o ponto único de escrita da trilha
// -------------------------------------------------------------------------

test("appendAuditLog mantém o mais recente primeiro e respeita o teto de memória", () => {
  const backup = [...AUDIT_LOGS_DATA];
  const base = {
    tenantId: "system",
    userId: "usr_teste",
    userName: "Teste",
    userRole: "super_admin" as const,
    ipAddress: "127.0.0.1",
    resource: "security_compliance",
    entityId: "x",
    status: "success" as const,
  };

  try {
    AUDIT_LOGS_DATA.length = 0;
    appendAuditLog({ ...base, id: "aud_ordem_1", action: "PRIMEIRO", timestamp: "2026-01-01T00:00:00Z" });
    appendAuditLog({ ...base, id: "aud_ordem_2", action: "SEGUNDO", timestamp: "2026-01-01T00:00:01Z" });
    assert.equal(AUDIT_LOGS_DATA[0].action, "SEGUNDO", "o mais recente fica na frente");

    AUDIT_LOGS_DATA.length = 0;
    for (let i = 0; i < 5200; i++) {
      appendAuditLog({ ...base, id: `aud_cap_${i}`, action: "ENCHIMENTO", timestamp: "2026-01-01T00:00:00Z" });
    }
    assert.ok(
      AUDIT_LOGS_DATA.length <= 5000,
      `a trilha em memória não pode passar do teto (ficou em ${AUDIT_LOGS_DATA.length})`,
    );
  } finally {
    AUDIT_LOGS_DATA.length = 0;
    AUDIT_LOGS_DATA.push(...backup);
  }
});
