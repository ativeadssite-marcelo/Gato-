import { test, before, after } from "node:test";
import assert from "node:assert";
import http from "node:http";
import type { AddressInfo } from "node:net";
import express from "express";
import { credentialsRouter } from "./credentialsRoutes";
import { licenseRouter } from "./licenseRoutes";
import { v1Router } from "./v1Routes";
import { issueSessionToken } from "./auth";
import { RBAC_USERS_DATA } from "./rbacEngine";
import { consumeApiRequest, getApiRequestsToday } from "./store";
import { createOrRotateCredential, revokeCredential } from "./credentials";

// =========================================================================
// API v1, LICENÇA DE MÁQUINA E GESTÃO DE CREDENCIAIS — integração real
//
// O BANCO NÃO ESTÁ CONFIGURADO neste ambiente, então o caminho de DADO da
// /api/v1 para no 503 (igual ao /api/db/* hoje). O que este arquivo prova é o que
// dá para provar aqui, e é justamente a parte de segurança: autenticação por
// chave, escopo travado no tenant, capacidade exigida por rota, cota diária e o
// vínculo de máquina.
// =========================================================================

const MGN_TENANT = "cmtt58e6o0000ju346a0g6s32";

const tenantAdmin = RBAC_USERS_DATA.find((u) => u.id === "usr_tenant_mgn_adm")!;
const saasSupport = RBAC_USERS_DATA.find((u) => u.roleCode === "saas_suporte")!;
const superAdmin = RBAC_USERS_DATA.find((u) => u.roleCode === "super_admin")!;

const app = express();
app.use(express.json());
app.use("/api/credentials", credentialsRouter);
app.use("/api/license", licenseRouter);
app.use("/api/v1", v1Router);
const server = http.createServer(app);
let baseUrl = "";

before(async () => {
  await new Promise<void>((resolve) => server.listen(0, resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(() => {
  server.close();
});

async function request(
  method: string,
  path: string,
  opts: { token?: string; apiKey?: string; licenseKey?: string; body?: unknown } = {},
) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  if (opts.apiKey) headers["x-api-key"] = opts.apiKey;
  if (opts.licenseKey) headers["x-license-key"] = opts.licenseKey;

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  return { status: res.status, headers: res.headers, body: (await res.json().catch(() => null)) as any };
}

const tokenOf = (user: typeof tenantAdmin) => issueSessionToken(user).token;

/** Emite uma chave de API direto no store, para não depender da rota de gestão. */
async function apiKeyFor(tenantId: string, capabilities: string[], label = "Teste") {
  const { secret } = await createOrRotateCredential({
    tenantId,
    kind: "api_key",
    label,
    capabilities: capabilities as any,
    actor: { id: "usr_test", name: "Teste" },
  });
  return secret;
}

// -------------------------------------------------------------------------
// Autenticação por chave de API
// -------------------------------------------------------------------------

test("sem chave: 401 API_KEY_REQUIRED", async () => {
  const res = await request("GET", "/api/v1/products");
  assert.equal(res.status, 401);
  assert.equal(res.body.code, "API_KEY_REQUIRED");
});

test("chave inexistente: 401 API_KEY_INVALID", async () => {
  const res = await request("GET", "/api/v1/products", { apiKey: "gato_live_naoexiste0000" });
  assert.equal(res.status, 401);
  assert.equal(res.body.code, "API_KEY_INVALID");
});

test("chave válida passa da autenticação (e para no banco não configurado)", async () => {
  const key = await apiKeyFor(MGN_TENANT, ["item_register"]);
  const res = await request("GET", "/api/v1/products", { apiKey: key });
  // 503 = autorização passou, só falta o banco. Seria 403 se o escopo falhasse.
  assert.equal(res.status, 503, JSON.stringify(res.body));
  assert.equal(res.body.code, "DB_NOT_CONFIGURED");
});

test("chave sem a capacidade da rota: 403 API_KEY_CAPABILITY_DENIED", async () => {
  const key = await apiKeyFor(MGN_TENANT, ["sales"]); // sem item_register
  const res = await request("GET", "/api/v1/products", { apiKey: key });
  assert.equal(res.status, 403);
  assert.equal(res.body.code, "API_KEY_CAPABILITY_DENIED");
});

test("a capacidade vale por rota, não para a chave inteira", async () => {
  const key = await apiKeyFor(MGN_TENANT, ["sales"]); // sales cobre /quotes
  const res = await request("GET", "/api/v1/quotes", { apiKey: key });
  assert.equal(res.status, 503, "com 'sales' a rota de orçamentos precisa passar da autorização");
});

test("chave revogada: 401 API_KEY_REVOKED (distinto de inválida)", async () => {
  const tenantId = "tenant_apitest_revoked";
  const key = await apiKeyFor(tenantId, ["item_register"]);
  await revokeCredential(tenantId, "api_key");

  const res = await request("GET", "/api/v1/products", { apiKey: key });
  assert.equal(res.status, 401);
  assert.equal(res.body.code, "API_KEY_REVOKED");
});

test("rotacionar corta a chave anterior imediatamente", async () => {
  const tenantId = "tenant_apitest_rotate";
  const oldKey = await apiKeyFor(tenantId, ["item_register"]);
  await apiKeyFor(tenantId, ["item_register"]);

  const res = await request("GET", "/api/v1/products", { apiKey: oldKey });
  assert.equal(res.status, 401);
  assert.equal(res.body.code, "API_KEY_INVALID");
});

test("cota diária estourada: 429 com Retry-After", async () => {
  const tenantId = "tenant_apitest_quota";
  const key = await apiKeyFor(tenantId, ["item_register"]);

  // Consome a franquia inteira do dia de uma vez (o plano do tenant sintético é o
  // padrão, 5.000/dia). Requisição recusada não conta, então o valor fica no teto.
  await consumeApiRequest(tenantId, 5000);
  const before = await getApiRequestsToday(tenantId);

  const res = await request("GET", "/api/v1/products", { apiKey: key });
  assert.equal(res.status, 429);
  assert.equal(res.body.code, "API_QUOTA_EXCEEDED");
  assert.ok(Number(res.headers.get("retry-after")) > 0, "informa quando tentar de novo");
  assert.equal(res.headers.get("x-ratelimit-remaining"), "0");

  const after = await getApiRequestsToday(tenantId);
  assert.equal(after, before, "requisição recusada NÃO consome cota");
});

test("requisição aceita conta na cota e informa o restante", async () => {
  const tenantId = "tenant_apitest_count";
  const key = await apiKeyFor(tenantId, ["item_register"]);

  const res = await request("GET", "/api/v1/products", { apiKey: key });
  assert.equal(res.status, 503);
  assert.equal(await getApiRequestsToday(tenantId), 1);
  assert.equal(res.headers.get("x-ratelimit-limit"), "5000");
  assert.equal(res.headers.get("x-ratelimit-remaining"), "4999");
});

// -------------------------------------------------------------------------
// Licença de máquina (rotas públicas: a licença é a credencial)
// -------------------------------------------------------------------------

test("licença: inválida não ativa; ativa em uma máquina e recusa a segunda", async () => {
  const tenantId = "tenant_apitest_license";
  const { secret: licenseKey } = await createOrRotateCredential({
    tenantId,
    kind: "machine_license",
    actor: { id: "usr_test", name: "Teste" },
  });

  assert.equal((await request("POST", "/api/license/activate", { body: { key: "gato_lic_xxx", machineId: "m1" } })).status, 401);

  const first = await request("POST", "/api/license/activate", {
    body: { key: licenseKey, machineId: "machine-A", machineLabel: "Balcão 1" },
  });
  assert.equal(first.status, 200, JSON.stringify(first.body));
  assert.equal(first.body.activation.machineId, "machine-A");

  const second = await request("POST", "/api/license/activate", {
    body: { key: licenseKey, machineId: "machine-B" },
  });
  assert.equal(second.status, 409);
  assert.equal(second.body.code, "MACHINE_ALREADY_BOUND");
  assert.equal(second.body.currentMachine.machineId, "machine-A", "informa qual está ativa");

  // Mesma máquina: idempotente, o app pode reiniciar sem intervenção.
  assert.equal(
    (await request("POST", "/api/license/activate", { body: { key: licenseKey, machineId: "machine-A" } })).status,
    200,
  );

  // Status pelo header.
  const status = await request("GET", "/api/license/status", { licenseKey });
  assert.equal(status.status, 200);
  assert.equal(status.body.active, true);
  assert.equal(status.body.machineLabel, "Balcão 1");

  // Desativar pela própria máquina libera o posto.
  assert.equal(
    (await request("POST", "/api/license/deactivate", { body: { key: licenseKey, machineId: "machine-A" } })).status,
    200,
  );
  assert.equal(
    (await request("POST", "/api/license/activate", { body: { key: licenseKey, machineId: "machine-B" } })).status,
    200,
  );
});

test("licença revogada não ativa mais", async () => {
  const tenantId = "tenant_apitest_license_revoked";
  const { secret: licenseKey } = await createOrRotateCredential({
    tenantId,
    kind: "machine_license",
    actor: { id: "usr_test", name: "Teste" },
  });
  await revokeCredential(tenantId, "machine_license");

  const res = await request("POST", "/api/license/activate", {
    body: { key: licenseKey, machineId: "machine-A" },
  });
  assert.equal(res.status, 403);
  assert.equal(res.body.code, "LICENSE_KEY_REVOKED");
});

// -------------------------------------------------------------------------
// Gestão de credenciais: escopo e fronteira entre tenants
// -------------------------------------------------------------------------

test("admin do tenant gera, rotaciona e revoga a chave da própria empresa", async () => {
  const token = tokenOf(tenantAdmin);

  const created = await request("POST", "/api/credentials/api-key", {
    token,
    body: { capabilities: ["sales"], label: "Integração teste" },
  });
  assert.equal(created.status, 200, JSON.stringify(created.body));
  assert.ok(created.body.secret?.startsWith("gato_live_"), "devolve o segredo uma vez");
  assert.equal(created.body.credential.tenantId, MGN_TENANT, "força o tenant do chamador");

  // A listagem NUNCA devolve o segredo.
  const listed = await request("GET", "/api/credentials", { token });
  assert.equal(listed.status, 200);
  assert.equal(listed.body.secret, undefined);
  assert.ok(!JSON.stringify(listed.body).includes(created.body.secret), "segredo não reaparece");

  // Exigir ao menos uma capacidade: chave que nasce podendo nada é inútil.
  const empty = await request("POST", "/api/credentials/api-key", { token, body: { capabilities: [] } });
  assert.equal(empty.status, 400);
  assert.equal(empty.body.code, "API_KEY_NO_CAPABILITIES");

  const revoked = await request("DELETE", "/api/credentials/api-key", { token });
  assert.equal(revoked.status, 200);
  assert.equal(revoked.body.credential.active, false);
});

test("admin do tenant não alcança as credenciais de outra empresa", async () => {
  const token = tokenOf(tenantAdmin);

  // Nomear outro tenant no corpo esbarra no isolamento antes do handler.
  const write = await request("POST", "/api/credentials/api-key", {
    token,
    body: { capabilities: ["sales"], tenantId: "cmtvk1ieq0000ju8c3kg5n85l" },
  });
  assert.equal(write.status, 403);
  assert.equal(write.body.code, "RBAC_TENANT_ISOLATION");

  const read = await request("GET", "/api/credentials?tenantId=cmtvk1ieq0000ju8c3kg5n85l", { token });
  assert.equal(read.status, 403, "leitura de outro tenant também é barrada");
});

test("suporte do SaaS rotaciona em nome do cliente, mirando o tenant", async () => {
  const token = tokenOf(saasSupport);

  const res = await request("POST", "/api/credentials/api-key", {
    token,
    body: { capabilities: ["sales"], tenantId: MGN_TENANT },
  });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(res.body.credential.tenantId, MGN_TENANT);

  // Mas precisa dizer QUAL cliente.
  const semAlvo = await request("GET", "/api/credentials", { token });
  assert.equal(semAlvo.status, 400, "escopo SaaS sem tenant alvo não sabe de quem falar");
});

test("dono enxerga as credenciais de um cliente", async () => {
  const token = tokenOf(superAdmin);
  const res = await request("GET", `/api/credentials?tenantId=${MGN_TENANT}`, { token });
  assert.equal(res.status, 200);
  assert.equal(res.body.tenantId, MGN_TENANT);
  assert.equal(res.body.catalog.length, 13, "entrega o catálogo para a matriz da UI");
});

test("papel de tenant sem o recurso não acessa a gestão de credenciais", async () => {
  const tenantUser = RBAC_USERS_DATA.find((u) => u.roleCode === "tenant_user")!;
  const res = await request("GET", "/api/credentials", { token: tokenOf(tenantUser) });
  assert.equal(res.status, 403);
  assert.equal(res.body.code, "RBAC_PERMISSION_DENIED");
});
