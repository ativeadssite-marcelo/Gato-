import { test, before, after } from "node:test";
import assert from "node:assert";
import http from "node:http";
import type { AddressInfo } from "node:net";
import express from "express";
import { rbacRouter } from "./rbacRoutes";
import { issueSessionToken } from "./auth";
import { RBAC_USERS_DATA } from "./rbacEngine";

// =========================================================================
// ESCOPO DA TRILHA DE AUDITORIA
//
// A trilha preserva CONTEÚDO — é o que a torna auditoria de verdade. Mas o
// conteúdo de NEGÓCIO do contratante não é exibido ao escopo da plataforma: o
// isolamento entre contratantes vale inclusive para o dono do SaaS. Estes testes
// travam as duas metades disso.
// =========================================================================

const app = express();
app.use(express.json());
app.use("/api/rbac", rbacRouter);
const server = http.createServer(app);
let baseUrl = "";

const owner = RBAC_USERS_DATA.find((u) => u.roleCode === "super_admin")!;
const pantanalAdmin = RBAC_USERS_DATA.find((u) => u.id === "usr_tenant_pantanal_adm")!;

before(async () => {
  await new Promise<void>((resolve) => server.listen(0, resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(() => server.close());

async function auditLogs(user: typeof owner) {
  const res = await fetch(`${baseUrl}/api/rbac/audit-logs`, {
    headers: { Authorization: `Bearer ${issueSessionToken(user).token}` },
  });
  return (await res.json()) as any;
}

/** O evento de negócio do contratante que o seed já traz (aud_005). */
const TENANT_BUSINESS_EVENT = "CREATE_CUSTOMER_RECORD";

test("o contratante vê o CONTEÚDO dos próprios eventos na trilha", async () => {
  const data = await auditLogs(pantanalAdmin);
  const evento = data.logs.find((l: any) => l.action === TENANT_BUSINESS_EVENT);

  assert.ok(evento, "o evento de negócio do próprio tenant está na trilha dele");
  assert.equal(evento.payloadWithheld, undefined, "para o dono do dado não há omissão");
  assert.ok(
    JSON.stringify(evento.afterState).includes("Auto Mecânica Modelo"),
    "o conteúdo do cadastro aparece para a própria empresa",
  );
});

test("a plataforma vê o EVENTO mas não o conteúdo de negócio do contratante", async () => {
  const data = await auditLogs(owner);
  const evento = data.logs.find((l: any) => l.action === TENANT_BUSINESS_EVENT);

  assert.ok(evento, "o evento continua visível: quem, quando, qual empresa, qual ação");
  assert.equal(evento.payloadWithheld, true, "marcado como omitido, para a UI explicar");
  assert.equal(evento.beforeState, undefined);
  assert.equal(evento.afterState, undefined);
  assert.equal(evento.justification, undefined);

  // O que importa: o nome do cliente do contratante não atravessa.
  assert.ok(
    !JSON.stringify(evento).includes("Auto Mecânica Modelo"),
    "nenhum campo pode carregar o conteúdo do cadastro",
  );
  assert.equal(evento.tenantId, "cmtvk1ieq0000ju8c3kg5n85l", "mas a empresa e o autor seguem");
  assert.ok(evento.userName, "e o responsável também");
});

test("eventos da PLATAFORMA seguem com conteúdo para o dono", async () => {
  // Auditoria é sobre conteúdo: o que se omite é conteúdo de negócio do
  // contratante, não a auditoria da própria plataforma.
  const data = await auditLogs(owner);
  const evento = data.logs.find(
    (l: any) => l.action === "AUDIT_INSPECT_TENANT_CONFIDENTIAL_DATA",
  );

  assert.ok(evento, "o evento existe no seed");
  // Este toca dado da empresa, então é omitido — mas um evento de plataforma puro
  // (credenciais, permissões) precisa continuar legível.
  const plataforma = data.logs.find((l: any) => l.resource === "tenant_credentials");
  if (plataforma) {
    assert.equal(plataforma.payloadWithheld, undefined, "evento de credencial não é omitido");
  }
});
