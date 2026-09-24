import { test } from "node:test";
import assert from "node:assert";
import { requireAnyPermission, requirePermission, requireTenantPermission } from "./auth";
import { RBAC_USERS_DATA } from "./rbacEngine";
import type { RbacUser } from "../src/types/rbac";

function makeReq(user: RbacUser, extra: Record<string, any> = {}) {
  return {
    auth: {
      user,
      tenantId: user.tenantId,
      isSaasScope: false,
      impersonating: false,
    },
    method: "POST",
    body: {},
    params: {},
    query: {},
    headers: {},
    socket: { remoteAddress: "127.0.0.1" },
    ...extra,
  } as any;
}

function makeRes() {
  const res: any = {
    statusCode: 200,
    headersSent: false,
    body: undefined,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: any) {
      this.body = body;
      return this;
    },
  };
  return res;
}

test("requireAnyPermission segue a rota quando qualquer recurso é permitido", () => {
  const admin = RBAC_USERS_DATA.find((u) => u.roleCode === "tenant_admin")!;
  const mw = requireAnyPermission(["customers_employees", "company_data"], { write: true });

  const res = makeRes();
  let nextCalled = false;
  mw(makeReq(admin), res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.notEqual(res.statusCode, 403);
});

test("requireAnyPermission nega quando nenhum recurso é permitido", () => {
  const vendedor = RBAC_USERS_DATA.find((u) => u.roleCode === "tenant_user")!;
  // tenant_user não possui billing_contracts nem connectors.
  const mw = requireAnyPermission(["billing_contracts", "connectors"], { write: true });

  const res = makeRes();
  let nextCalled = false;
  mw(makeReq(vendedor), res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
});

test("requireTenantPermission bloqueia usuário de tenant sem a capacidade", () => {
  const vendedor = RBAC_USERS_DATA.find((u) => u.roleCode === "tenant_user")!;
  const mw = requireTenantPermission("item_register");

  const res = makeRes();
  let nextCalled = false;
  mw(makeReq(vendedor), res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
  assert.equal(res.body?.code, "TENANT_PERMISSION_DENIED");
});

test("requireTenantPermission libera admin do tenant (tem todas as capacidades)", () => {
  const admin = RBAC_USERS_DATA.find((u) => u.roleCode === "tenant_admin")!;
  const mw = requireTenantPermission("item_register");

  const res = makeRes();
  let nextCalled = false;
  mw(makeReq(admin), res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.notEqual(res.statusCode, 403);
});

// =========================================================================
// SIMULAÇÃO DE PERSONA — separação entre plataforma e contratante
//
// O dono do SaaS assumia a identidade do admin do cliente e LIA o dado
// operacional dele: o bloqueio existente cobria só escrita. Estes testes travam
// a regra categórica de que dado do contratante não sai por essa via, nem leitura.
// =========================================================================

/** Requisição com persona simulada: o usuário efetivo passa a ser o do tenant. */
function makeImpersonatedReq(persona: RbacUser, realUser: RbacUser) {
  return makeReq(persona, {
    auth: {
      user: persona,
      realUser,
      impersonating: true,
      tenantId: persona.tenantId,
      isSaasScope: false,
    },
    method: "GET",
  });
}

test("sob persona, leitura de dado operacional do contratante é negada", () => {
  const personaAdmin = RBAC_USERS_DATA.find((u) => u.roleCode === "tenant_admin")!;
  const owner = RBAC_USERS_DATA.find((u) => u.roleCode === "super_admin")!;

  for (const resource of ["company_data", "customers_employees"] as const) {
    const mw = requirePermission(resource); // GET: antes passava, por ser leitura
    const res = makeRes();
    let nextCalled = false;
    mw(makeImpersonatedReq(personaAdmin, owner), res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, false, `${resource} não pode passar sob persona`);
    assert.equal(res.statusCode, 403);
    assert.equal(res.body?.code, "RBAC_IMPERSONATION_TENANT_DATA_DENIED");
  }
});

test("sob persona, recurso que NÃO é do contratante segue acessível", () => {
  // `catalog_reference` é dado de referência (veículos/peças): a persona continua
  // servindo para inspecionar, senão o simulador perderia a utilidade.
  const personaAdmin = RBAC_USERS_DATA.find((u) => u.roleCode === "tenant_admin")!;
  const owner = RBAC_USERS_DATA.find((u) => u.roleCode === "super_admin")!;

  const res = makeRes();
  let nextCalled = false;
  requirePermission("catalog_reference")(makeImpersonatedReq(personaAdmin, owner), res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.notEqual(res.statusCode, 403);
});

test("fora da persona, o admin do tenant lê o próprio dado normalmente", () => {
  // Regressão: o guard não pode vazar para a operação legítima do contratante.
  const admin = RBAC_USERS_DATA.find((u) => u.roleCode === "tenant_admin")!;

  for (const resource of ["company_data", "customers_employees"] as const) {
    const res = makeRes();
    let nextCalled = false;
    requirePermission(resource)(makeReq(admin, { method: "GET" }), res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true, `${resource} deveria ser liberado fora da persona`);
  }
});
