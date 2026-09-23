import { test } from "node:test";
import assert from "node:assert";
import {
  evaluatePermission,
  hasTenantPermission,
  TENANT_PERMISSION_CATALOG,
  ROLE_OVERRIDES,
  RBAC_USERS_DATA,
} from "./rbacEngine";

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

test("hasTenantPermission: tenant_admin e escopo SaaS possuem todas as capacidades", () => {
  const tenantAdmin = RBAC_USERS_DATA.find((u) => u.roleCode === "tenant_admin")!;
  const superAdmin = RBAC_USERS_DATA.find((u) => u.roleCode === "super_admin")!;

  for (const p of TENANT_PERMISSION_CATALOG) {
    assert.equal(hasTenantPermission(tenantAdmin, p.key), true);
    assert.equal(hasTenantPermission(superAdmin, p.key), true);
  }
});

test("hasTenantPermission: tenant_user depende do conjunto atribuído pelo admin", () => {
  const vendedor = RBAC_USERS_DATA.find((u) => u.roleCode === "tenant_user")!;

  // Seed do vendedor possui vendas/cadastro/faturamento.
  assert.equal(hasTenantPermission(vendedor, "sales"), true);
  assert.equal(hasTenantPermission(vendedor, "customer_register"), true);
  assert.equal(hasTenantPermission(vendedor, "invoicing"), true);

  // ...mas não possui capacidade de caixa nem gerência.
  assert.equal(hasTenantPermission(vendedor, "invoice_issuance"), false);
  assert.equal(hasTenantPermission(vendedor, "payment_machines"), false);
  assert.equal(hasTenantPermission(vendedor, "margin_reports"), false);
  assert.equal(hasTenantPermission(vendedor, "marketplace"), false);
});

test("hasTenantPermission: usuário sem tenantPermissions não tem capacidades finas", () => {
  const readonly = RBAC_USERS_DATA.find((u) => u.roleCode === "tenant_readonly")!;
  assert.equal(hasTenantPermission(readonly, "item_register"), false);
  assert.equal(hasTenantPermission(readonly, "sales"), false);
});

test("catálogo cobre os 5 grupos e 13 capacidades esperados", () => {
  assert.equal(TENANT_PERMISSION_CATALOG.length, 13);
  const groups = new Set(TENANT_PERMISSION_CATALOG.map((p) => p.group));
  assert.deepEqual([...groups].sort(), ["administrativo", "caixa", "estoque", "gerencia", "integracoes", "vendas"]);
});
