import { test } from "node:test";
import assert from "node:assert";
import { evaluatePermission, ROLE_OVERRIDES, RBAC_USERS_DATA } from "./rbacEngine";

test("Super Admin redefine o que uma camada inferior pode ver (role override)", () => {
  const tenantUser = RBAC_USERS_DATA.find((u) => u.roleCode === "tenant_user")!;

  // Padrão: tenant_user NÃO vê cobrança (billing_contracts = none).
  assert.equal(evaluatePermission(tenantUser, "billing_contracts").allowed, false);

  // Super Admin redefine a camada: tenant_user passa a ler cobrança.
  ROLE_OVERRIDES["tenant_user"] = { ...ROLE_OVERRIDES["tenant_user"], billing_contracts: "read_only" };
  assert.equal(evaluatePermission(tenantUser, "billing_contracts").allowed, true);

  // Volta ao padrão ao remover o override.
  delete ROLE_OVERRIDES["tenant_user"];
  assert.equal(evaluatePermission(tenantUser, "billing_contracts").allowed, false);
});
