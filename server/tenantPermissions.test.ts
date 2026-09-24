import { test } from "node:test";
import assert from "node:assert";
import { sanitizeTenantPermissions } from "./rbacRoutes";
import {
  hasAllTenantPermissions,
  hasAnyTenantPermission,
  hasTenantPermission,
} from "../src/utils/tenantPermissions";
import { hasConfiguredTenantPermissions, isMenuVisible } from "../src/utils/menuAccess";
import type { UserSession } from "../src/types";

// =========================================================================
// CAPACIDADES OPERACIONAIS FINAS DO TENANT (construtor flexível)
//
// Estes testes travam a diferença entre "nunca configurado" (`undefined`,
// mantém o acesso padrão do papel) e "configurado sem nenhuma capacidade"
// (`[]`, recorta o menu). Confundir os dois tranca ou libera gente demais.
// =========================================================================

/** Sessão de UI mínima, com os recursos RBAC que o menu consulta. */
function session(overrides: Partial<UserSession> = {}): UserSession {
  return {
    id: "usr_test",
    name: "Usuário de Teste",
    email: "teste@empresa.com.br",
    role: "vendedor",
    roleLabel: "Usuário do Tenant",
    roleCode: "tenant_user",
    isSaasScope: false,
    permissions: {
      company_data: "full",
      customers_employees: "full",
      connectors: "full",
      billing_contracts: "full",
      catalog_reference: "full",
    },
    branchId: "br1",
    branchUf: "MS",
    branchName: "Matriz",
    cdName: "CD",
    cdCode: "CD1",
    avatarInitials: "UT",
    loginTime: "09:00",
    ...overrides,
  };
}

// -------------------------------------------------------------------------
// sanitizeTenantPermissions — normalização vinda do servidor
// -------------------------------------------------------------------------

test("sanitizeTenantPermissions: descarta chaves fora do catálogo", () => {
  assert.deepEqual(sanitizeTenantPermissions(["sales", "chave_inventada", "item_register"]), [
    "sales",
    "item_register",
  ]);
});

test("sanitizeTenantPermissions: array vazio continua array vazio (não vira undefined)", () => {
  // Regressão: antes o vazio virava `undefined`, que significa "nunca
  // configurado" — criar um usuário sem capacidade alguma o deixava com o
  // menu inteiro, contrariando o admin que desmarcou tudo.
  assert.deepEqual(sanitizeTenantPermissions([]), []);
});

test("sanitizeTenantPermissions: entradas não-array viram undefined", () => {
  assert.equal(sanitizeTenantPermissions(undefined), undefined);
  assert.equal(sanitizeTenantPermissions(null), undefined);
  assert.equal(sanitizeTenantPermissions("sales"), undefined);
  assert.equal(sanitizeTenantPermissions({ sales: true }), undefined);
});

test("sanitizeTenantPermissions: ignora itens que não são string", () => {
  assert.deepEqual(sanitizeTenantPermissions([1, true, "sales", null]), ["sales"]);
});

// -------------------------------------------------------------------------
// hasTenantPermission — espelho do servidor (rbacEngine.hasTenantPermission)
// -------------------------------------------------------------------------

test("hasTenantPermission: admin do tenant e escopo SaaS têm todas", () => {
  const admin = session({ roleCode: "tenant_admin", tenantPermissions: [] });
  assert.equal(hasAllTenantPermissions(admin), true);
  assert.equal(hasTenantPermission(admin, "marketplace"), true);
  assert.equal(hasTenantPermission(admin, "sales"), true);

  const saas = session({ roleCode: "saas_suporte", isSaasScope: true, tenantPermissions: [] });
  assert.equal(hasTenantPermission(saas, "marketplace"), true);
});

test("hasTenantPermission: usuário comum depende do conjunto atribuído", () => {
  const vendedor = session({ tenantPermissions: ["sales", "customer_register"] });
  assert.equal(hasTenantPermission(vendedor, "sales"), true);
  assert.equal(hasTenantPermission(vendedor, "customer_register"), true);
  assert.equal(hasTenantPermission(vendedor, "margin_reports"), false);
  assert.equal(hasTenantPermission(vendedor, "item_register"), false);
});

test("hasTenantPermission: campo ausente conta como sem capacidade (igual ao servidor)", () => {
  const naoConfigurado = session({ tenantPermissions: undefined });
  assert.equal(hasTenantPermission(naoConfigurado, "sales"), false);
});

test("hasAnyTenantPermission: basta uma das capacidades, e lista vazia libera", () => {
  const user = session({ tenantPermissions: ["item_register"] });
  assert.equal(hasAnyTenantPermission(user, ["stock_inbound", "item_register"]), true);
  assert.equal(hasAnyTenantPermission(user, ["stock_inbound", "margin_reports"]), false);
  assert.equal(hasAnyTenantPermission(user, []), true);
});

// -------------------------------------------------------------------------
// Menu: a regra de fallback que evita trancar (ou liberar) quem não devia
// -------------------------------------------------------------------------

test("menu: admin do tenant vê tudo mesmo com lista de capacidades vazia", () => {
  const admin = session({ roleCode: "tenant_admin", tenantPermissions: [] });
  assert.equal(hasConfiguredTenantPermissions(admin), false);
  for (const item of ["estoque", "cotacao", "clientes", "relatorios", "conectores"]) {
    assert.equal(isMenuVisible(item, admin), true, `${item} deveria estar visível para o admin`);
  }
});

test("menu: sem capacidades configuradas vale só o recurso RBAC do papel", () => {
  // `undefined` = nunca passou pelo construtor (seeds legados, tenant_readonly).
  const legado = session({ tenantPermissions: undefined });
  assert.equal(hasConfiguredTenantPermissions(legado), false);
  assert.equal(isMenuVisible("estoque", legado), true);
  assert.equal(isMenuVisible("cotacao", legado), true);
});

test("menu: lista de capacidades configurada recorta os itens operacionais", () => {
  const vendedor = session({ tenantPermissions: ["sales", "customer_register"] });
  assert.equal(hasConfiguredTenantPermissions(vendedor), true);

  // Liberados pelas capacidades
  assert.equal(isMenuVisible("cotacao", vendedor), true, "cotacao exige 'sales'");
  assert.equal(isMenuVisible("orcamentos", vendedor), true, "orcamentos aceita 'sales'");
  assert.equal(isMenuVisible("clientes", vendedor), true, "clientes exige 'customer_register'");

  // Recortados
  assert.equal(isMenuVisible("estoque", vendedor), false, "estoque exige capacidade de estoque");
  assert.equal(isMenuVisible("relatorios", vendedor), false, "relatorios exige 'margin_reports'");
  assert.equal(isMenuVisible("conectores", vendedor), false, "conectores exige 'marketplace'");
});

test("menu: capacidades vazias escondem o operacional mas mantêm o básico", () => {
  const semNada = session({ tenantPermissions: [] });
  assert.equal(hasConfiguredTenantPermissions(semNada), true);

  assert.equal(isMenuVisible("estoque", semNada), false);
  assert.equal(isMenuVisible("cotacao", semNada), false);
  assert.equal(isMenuVisible("relatorios", semNada), false);

  // `consulta-pecas` consulta a base de veículos/aplicação (dado de referência),
  // então não é gateada por capacidade operacional e segue visível.
  assert.equal(isMenuVisible("consulta-pecas", semNada), true);
  // `configuracoes` ficou fora do gate por capacidade de propósito.
  assert.equal(isMenuVisible("configuracoes", semNada), true);
});

test("menu: os dois critérios se somam — nenhum sobrepõe o outro", () => {
  // Recurso RBAC libera, mas falta a capacidade: continua oculto.
  // (`estoque` passa por company_data, porém exige capacidade de estoque.)
  const semCapacidadeDeEstoque = session({
    permissions: { company_data: "full", customers_employees: "none" },
    tenantPermissions: ["sales", "customer_register"],
  });
  assert.equal(isMenuVisible("estoque", semCapacidadeDeEstoque), false);

  // Capacidade marcada, mas o recurso RBAC nega: continua oculto.
  // (`cotacao` tem 'sales', mas customers_employees = none.)
  assert.equal(isMenuVisible("cotacao", semCapacidadeDeEstoque), false);

  // Com os dois satisfeitos, aparece.
  const completo = session({
    permissions: { company_data: "full", customers_employees: "full" },
    tenantPermissions: ["sales", "item_register"],
  });
  assert.equal(isMenuVisible("cotacao", completo), true);
  assert.equal(isMenuVisible("estoque", completo), true);
});
