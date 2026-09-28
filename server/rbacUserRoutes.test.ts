import { test, before, after } from "node:test";
import assert from "node:assert";
import http from "node:http";
import type { AddressInfo } from "node:net";
import express from "express";
import { rbacRouter } from "./rbacRoutes";
import { issueSessionToken } from "./auth";
import { RBAC_USERS_DATA } from "./rbacEngine";
import type { RbacUser } from "../src/types/rbac";

// =========================================================================
// CRUD DE USUÁRIO DO TENANT — capacidades operacionais finas
//
// Teste de integração real (express + token assinado), porque o que interessa
// aqui é a COMBINAÇÃO: middleware de permissão, fronteira de isolamento entre
// tenants e persistência. Testar o handler isolado não pegaria nenhuma dessas
// camadas.
// =========================================================================

const MGN_TENANT = "cmtt58e6o0000ju346a0g6s32";

const mgnAdmin = RBAC_USERS_DATA.find((u) => u.id === "usr_tenant_mgn_adm")!;
const mgnUser = RBAC_USERS_DATA.find((u) => u.id === "usr_tenant_mgn_user")!;
const pantanalReadonly = RBAC_USERS_DATA.find((u) => u.id === "usr_tenant_pantanal_ro")!;

const app = express();
app.use(express.json());
app.use("/api/rbac", rbacRouter);
const server = http.createServer(app);
let baseUrl = "";

before(async () => {
  await new Promise<void>((resolve) => server.listen(0, resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(() => {
  server.close();
});

/** Snapshot/restaura o estado de um usuário semeado, que os testes mutam. */
function snapshot(user: RbacUser) {
  const state = {
    roleCode: user.roleCode,
    roleName: user.roleName,
    tenantPermissions: user.tenantPermissions ? [...user.tenantPermissions] : user.tenantPermissions,
    customOverrides: user.customOverrides ? { ...user.customOverrides } : user.customOverrides,
  };
  return () => {
    user.roleCode = state.roleCode;
    user.roleName = state.roleName;
    user.tenantPermissions = state.tenantPermissions;
    user.customOverrides = state.customOverrides;
  };
}

async function request(method: string, path: string, token: string, body?: unknown) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: (await res.json().catch(() => null)) as any };
}

// -------------------------------------------------------------------------
// Fronteira de isolamento entre tenants
// -------------------------------------------------------------------------

test("admin do tenant não altera acessos de usuário de outra empresa", async () => {
  const token = issueSessionToken(mgnAdmin).token;
  const restore = snapshot(pantanalReadonly);
  const antes = pantanalReadonly.tenantPermissions ? [...pantanalReadonly.tenantPermissions] : undefined;

  try {
    const res = await request("PUT", `/api/rbac/users/${pantanalReadonly.id}/role`, token, {
      roleCode: pantanalReadonly.roleCode,
      tenantPermissions: ["sales", "margin_reports"],
    });

    assert.equal(res.status, 403);
    assert.deepEqual(
      pantanalReadonly.tenantPermissions,
      antes,
      "nada pode ter sido gravado no usuário de outro tenant",
    );
  } finally {
    restore();
  }
});

// -------------------------------------------------------------------------
// Gravação das capacidades
// -------------------------------------------------------------------------

test("admin do tenant grava capacidades de um usuário da própria empresa", async () => {
  const token = issueSessionToken(mgnAdmin).token;
  const restore = snapshot(mgnUser);

  try {
    const res = await request("PUT", `/api/rbac/users/${mgnUser.id}/role`, token, {
      roleCode: mgnUser.roleCode,
      tenantPermissions: ["sales", "customer_register"],
    });

    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.deepEqual(mgnUser.tenantPermissions, ["sales", "customer_register"]);
    assert.deepEqual(res.body.user.tenantPermissions, ["sales", "customer_register"]);
  } finally {
    restore();
  }
});

test("capacidades fora do catálogo são descartadas ao gravar", async () => {
  const token = issueSessionToken(mgnAdmin).token;
  const restore = snapshot(mgnUser);

  try {
    const res = await request("PUT", `/api/rbac/users/${mgnUser.id}/role`, token, {
      roleCode: mgnUser.roleCode,
      tenantPermissions: ["sales", "capacidade_inventada", "item_register"],
    });

    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.deepEqual(mgnUser.tenantPermissions, ["sales", "item_register"]);
  } finally {
    restore();
  }
});

test("gravar lista vazia deixa o usuário explicitamente sem capacidades", async () => {
  // Regressão: o vazio precisa virar `[]` e não `undefined`, senão o usuário
  // cai no fallback "nunca configurado" e volta a ver o menu inteiro.
  const token = issueSessionToken(mgnAdmin).token;
  const restore = snapshot(mgnUser);

  try {
    const res = await request("PUT", `/api/rbac/users/${mgnUser.id}/role`, token, {
      roleCode: mgnUser.roleCode,
      tenantPermissions: [],
    });

    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.deepEqual(mgnUser.tenantPermissions, []);
    assert.notEqual(mgnUser.tenantPermissions, undefined);
  } finally {
    restore();
  }
});

test("PUT sem roleCode preserva o papel do usuário", async () => {
  // Regressão: o handler gravava o valor cru do body em `roleCode`, então um
  // PUT só de capacidades apagava o papel do usuário.
  const token = issueSessionToken(mgnAdmin).token;
  const restore = snapshot(mgnUser);
  const papelOriginal = mgnUser.roleCode;
  const nomeDoPapelOriginal = mgnUser.roleName;

  try {
    const res = await request("PUT", `/api/rbac/users/${mgnUser.id}/role`, token, {
      tenantPermissions: ["sales"],
    });

    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(mgnUser.roleCode, papelOriginal);
    assert.equal(mgnUser.roleName, nomeDoPapelOriginal);
  } finally {
    restore();
  }
});

// -------------------------------------------------------------------------
// Fronteira de papéis — escalada de privilégio
// -------------------------------------------------------------------------

test("admin do tenant não consegue se promover a super_admin", async () => {
  // Sem este guard, o próprio admin do tenant enviava `roleCode: super_admin`
  // e, como requireAuth relê o usuário vivo, ganhava escopo SaaS (todos os
  // tenants) já na requisição seguinte.
  const token = issueSessionToken(mgnAdmin).token;
  const restore = snapshot(mgnAdmin);

  try {
    const res = await request("PUT", `/api/rbac/users/${mgnAdmin.id}/role`, token, {
      roleCode: "super_admin",
    });

    assert.equal(res.status, 403);
    assert.equal(res.body.code, "RBAC_ROLE_ESCALATION_DENIED");
    assert.equal(mgnAdmin.roleCode, "tenant_admin", "o papel não pode ter mudado");
  } finally {
    restore();
  }
});

test("admin do tenant não concede papéis da equipe SaaS a terceiros", async () => {
  const token = issueSessionToken(mgnAdmin).token;
  const restore = snapshot(mgnUser);

  try {
    const res = await request("PUT", `/api/rbac/users/${mgnUser.id}/role`, token, {
      roleCode: "saas_financeiro",
    });

    assert.equal(res.status, 403);
    assert.equal(res.body.code, "RBAC_ROLE_ESCALATION_DENIED");
    assert.equal(mgnUser.roleCode, "tenant_user");
  } finally {
    restore();
  }
});

test("admin do tenant não altera conta da plataforma que vive no mesmo tenant", async () => {
  // As personas de demonstração criam super_admin/saas_* dentro de um tenant.
  const token = issueSessionToken(mgnAdmin).token;
  const platformUser: RbacUser = {
    ...mgnUser,
    id: `usr_test_platform_${Date.now()}`,
    email: `platform_${Date.now()}@gato.com.br`,
    roleCode: "saas_suporte",
    roleName: "Admin SaaS — Suporte",
    tenantId: MGN_TENANT,
  };
  RBAC_USERS_DATA.push(platformUser);

  try {
    const res = await request("PUT", `/api/rbac/users/${platformUser.id}/role`, token, {
      roleCode: "tenant_readonly",
    });

    assert.equal(res.status, 403);
    assert.equal(res.body.code, "RBAC_PLATFORM_ACCOUNT_DENIED");
    assert.equal(platformUser.roleCode, "saas_suporte", "o papel não pode ter mudado");
  } finally {
    const idx = RBAC_USERS_DATA.findIndex((u) => u.id === platformUser.id);
    if (idx >= 0) RBAC_USERS_DATA.splice(idx, 1);
  }
});

test("admin do tenant não define overrides por usuário", async () => {
  // `customOverrides` sobrepõe a matriz do papel: era por aí que o admin do
  // tenant concedia a si mesmo security_compliance / manage_accounts.
  const token = issueSessionToken(mgnAdmin).token;
  const restore = snapshot(mgnAdmin);

  try {
    const res = await request("PUT", `/api/rbac/users/${mgnAdmin.id}/role`, token, {
      roleCode: "tenant_admin",
      customOverrides: { security_compliance: "full", manage_accounts: "full" },
    });

    assert.equal(res.status, 403);
    assert.equal(res.body.code, "RBAC_CUSTOM_OVERRIDES_DENIED");
    assert.equal(mgnAdmin.customOverrides, undefined);
  } finally {
    restore();
  }
});

test("escopo SaaS ainda define overrides, com recursos desconhecidos filtrados", async () => {
  const superAdmin = RBAC_USERS_DATA.find((u) => u.id === "usr_super_admin")!;
  const token = issueSessionToken(superAdmin).token;
  const restore = snapshot(mgnUser);

  try {
    const res = await request("PUT", `/api/rbac/users/${mgnUser.id}/role`, token, {
      roleCode: "tenant_user",
      customOverrides: { company_data: "none", recurso_inventado: "full" },
    });

    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.deepEqual(mgnUser.customOverrides, { company_data: "none" });
  } finally {
    restore();
  }
});

test("admin do tenant não dispara reset de senha de usuário de outra empresa", async () => {
  const token = issueSessionToken(mgnAdmin).token;

  const res = await request("POST", `/api/rbac/users/${pantanalReadonly.id}/reset-password`, token);

  assert.equal(res.status, 403);
  assert.equal(res.body.code, "RBAC_TENANT_ISOLATION");
  assert.equal(res.body.maskedEmail, undefined, "não pode vazar o e-mail do outro tenant");
});

test("admin do tenant ainda reseta senha da própria equipe", async () => {
  const token = issueSessionToken(mgnAdmin).token;

  try {
    // O reset agora define a senha de verdade (antes só emitia um token inócuo),
    // então a senha NOVA passa a valer e a antiga morre.
    const res = await request("POST", `/api/rbac/users/${mgnUser.id}/reset-password`, token, {
      newPassword: "SenhaEquipe123",
    });

    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.success, true);
  } finally {
    // `mgnUser` é semeado e compartilhado com os outros testes: devolve a senha
    // de demonstração para não deixar o estado alterado.
    await request("POST", `/api/rbac/users/${mgnUser.id}/reset-password`, token, {
      newPassword: "senha123456",
    });
  }
});

test("admin do tenant continua podendo trocar papéis dentro do próprio escopo", async () => {
  const token = issueSessionToken(mgnAdmin).token;
  const restore = snapshot(mgnUser);

  try {
    const res = await request("PUT", `/api/rbac/users/${mgnUser.id}/role`, token, {
      roleCode: "tenant_readonly",
    });

    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(mgnUser.roleCode, "tenant_readonly");
  } finally {
    restore();
  }
});

// -------------------------------------------------------------------------
// Criação de usuário
// -------------------------------------------------------------------------

test("criar usuário sem informar tenant grava na empresa de quem chamou", async () => {
  const token = issueSessionToken(mgnAdmin).token;
  const email = `teste_${Date.now()}@empresa.com.br`;

  try {
    const res = await request("POST", "/api/rbac/users", token, {
      name: "Usuário Sem Capacidade",
      email,
      roleCode: "tenant_user",
      tenantPermissions: [],
      password: "SenhaBalcao123",
    });

    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.user.tenantId, MGN_TENANT);
    assert.deepEqual(res.body.user.tenantPermissions, []);
  } finally {
    const idx = RBAC_USERS_DATA.findIndex((u) => u.email === email);
    if (idx >= 0) RBAC_USERS_DATA.splice(idx, 1);
  }
});

test("criar usuário apontando para outro tenant é recusado pelo isolamento", async () => {
  // O middleware lê `req.body.tenantId` e, para papéis de escopo tenant,
  // recusa a travessia antes do handler — por isso o cliente do admin do
  // tenant não envia `tenantId` (o servidor já usa o do chamador).
  const token = issueSessionToken(mgnAdmin).token;
  const email = `teste_${Date.now()}_outro_tenant@empresa.com.br`;

  try {
    const res = await request("POST", "/api/rbac/users", token, {
      name: "Usuário Indevido",
      email,
      roleCode: "tenant_user",
      tenantId: "cmtvk1ieq0000ju8c3kg5n85l",
    });

    assert.equal(res.status, 403);
    assert.equal(res.body.code, "RBAC_TENANT_ISOLATION");
    assert.equal(
      RBAC_USERS_DATA.findIndex((u) => u.email === email),
      -1,
      "nenhum usuário pode ter sido criado",
    );
  } finally {
    const idx = RBAC_USERS_DATA.findIndex((u) => u.email === email);
    if (idx >= 0) RBAC_USERS_DATA.splice(idx, 1);
  }
});

test("criar usuário com capacidades do catálogo as persiste", async () => {
  const token = issueSessionToken(mgnAdmin).token;
  const email = `teste_${Date.now()}_caps@empresa.com.br`;

  try {
    const res = await request("POST", "/api/rbac/users", token, {
      name: "Usuário Do Balcão",
      email,
      roleCode: "tenant_user",
      tenantPermissions: ["sales", "invoice_issuance", "id_invalido"],
      password: "SenhaBalcao123",
    });

    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.deepEqual(res.body.user.tenantPermissions, ["sales", "invoice_issuance"]);
  } finally {
    const idx = RBAC_USERS_DATA.findIndex((u) => u.email === email);
    if (idx >= 0) RBAC_USERS_DATA.splice(idx, 1);
  }
});
