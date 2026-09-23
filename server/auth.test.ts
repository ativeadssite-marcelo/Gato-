import { test } from "node:test";
import assert from "node:assert";
import { requireAnyPermission, requireTenantPermission } from "./auth";
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
