import { test } from "node:test";
import assert from "node:assert";
import { ROLE_DEFINITIONS, ROLE_OVERRIDES, RBAC_USERS_DATA } from "./rbacEngine";
import { authorize, effectiveAccessLevel, resolveDataScope } from "./auth";
import { isMenuVisible } from "../src/utils/menuAccess";
import type { RbacUser, PermissionResource } from "../src/types/rbac";
import type { UserSession } from "../src/types";

// =========================================================================
// FASE C — ESCOPO DO DONO DO SaaS
//
// O dono da plataforma NÃO opera o balcão: perde os dados operacionais dos
// contratantes (produtos, filiais, clientes, funcionários) e mantém apenas o
// que é comercial/administrativo da plataforma + as consultas de catálogo, que
// são dado de REFERÊNCIA (base de veículos, aplicação de peças).
// =========================================================================

const superAdmin = RBAC_USERS_DATA.find((u) => u.roleCode === "super_admin")!;
const tenantAdmin = RBAC_USERS_DATA.find((u) => u.roleCode === "tenant_admin")!;
const tenantUser = RBAC_USERS_DATA.find((u) => u.roleCode === "tenant_user")!;

/** Sessão de UI com a matriz REAL do papel, como o servidor entrega no login. */
function sessionForRole(roleCode: keyof typeof ROLE_DEFINITIONS): UserSession {
  return {
    id: "usr_test",
    name: "Teste",
    email: "teste@empresa.com.br",
    role: "administrador",
    roleLabel: ROLE_DEFINITIONS[roleCode].name,
    roleCode,
    isSaasScope: ROLE_DEFINITIONS[roleCode].scope === "saas",
    permissions: { ...ROLE_DEFINITIONS[roleCode].permissions },
    branchId: "br1",
    branchUf: "MS",
    branchName: "Matriz",
    cdName: "CD",
    cdCode: "CD1",
    avatarInitials: "TT",
    loginTime: "09:00",
  };
}

/** Requisição falsa, suficiente para `resolveDataScope`/`authorize`. */
function makeReq(user: RbacUser, headers: Record<string, string> = {}) {
  return {
    auth: {
      user,
      role: ROLE_DEFINITIONS[user.roleCode],
      isSaasScope: ROLE_DEFINITIONS[user.roleCode].scope === "saas",
      tenantId: user.tenantId,
      impersonating: false,
    },
    method: "GET",
    params: {},
    body: {},
    query: {},
    headers,
    socket: { remoteAddress: "127.0.0.1" },
    ip: "127.0.0.1",
  } as any;
}

// -------------------------------------------------------------------------
// A matriz do dono
// -------------------------------------------------------------------------

test("dono perde acesso aos dados operacionais dos contratantes", () => {
  const permissions = ROLE_DEFINITIONS.super_admin.permissions;
  assert.equal(permissions.company_data, "none");
  assert.equal(permissions.customers_employees, "none");
});

test("dono mantém o que é da plataforma", () => {
  const permissions = ROLE_DEFINITIONS.super_admin.permissions;
  for (const resource of [
    "billing_contracts",
    "limits_quotas",
    "manage_accounts",
    "contractor_users",
    "audit_logs",
    "security_compliance",
    "connectors",
  ] as PermissionResource[]) {
    assert.equal(permissions[resource], "full", `${resource} deveria seguir full`);
  }
});

test("dono mantém as consultas de catálogo, em leitura", () => {
  assert.equal(ROLE_DEFINITIONS.super_admin.permissions.catalog_reference, "read_only");
});

test("dados operacionais seguem bloqueados pelo authorize", () => {
  for (const resource of ["company_data", "customers_employees"] as PermissionResource[]) {
    const decision = authorize(superAdmin, resource, { method: "GET" });
    assert.equal(decision.allowed, false, `${resource} deveria ser negado`);
    assert.equal(decision.status, 403);
  }
});

test("catálogo de referência: dono lê, mas não escreve", () => {
  const read = authorize(superAdmin, "catalog_reference", { method: "GET" });
  assert.equal(read.allowed, true);

  const write = authorize(superAdmin, "catalog_reference", { method: "POST" });
  assert.equal(write.allowed, false, "read_only não pode escrever");
  assert.equal(write.code, "RBAC_READ_ONLY");
});

test("papéis de tenant não regridem no acesso ao catálogo", () => {
  for (const user of [tenantAdmin, tenantUser]) {
    assert.equal(ROLE_DEFINITIONS[user.roleCode].permissions.catalog_reference, "full");
    assert.equal(authorize(user, "catalog_reference", { method: "GET" }).allowed, true);
  }
});

// -------------------------------------------------------------------------
// O efeito no menu do dono
// -------------------------------------------------------------------------

test("menu do dono: some o operacional, fica a plataforma e o catálogo", () => {
  const owner = sessionForRole("super_admin");

  // Perdeu as telas de loja
  for (const item of ["dashboard", "estoque", "clientes", "cotacao", "orcamentos", "relatorios", "configuracoes"]) {
    assert.equal(isMenuVisible(item, owner), false, `${item} deveria sumir do menu do dono`);
  }

  // Mantém o catálogo de referência e os painéis da plataforma
  for (const item of ["consulta-pecas", "assinatura", "rbac", "camadas-acesso", "financeiro-saas", "conectores"]) {
    assert.equal(isMenuVisible(item, owner), true, `${item} deveria seguir no menu do dono`);
  }
});

test("menu do tenant não muda com a Fase C", () => {
  const admin = sessionForRole("tenant_admin");
  for (const item of ["dashboard", "estoque", "clientes", "cotacao", "consulta-pecas", "configuracoes"]) {
    assert.equal(isMenuVisible(item, admin), true, `${item} deveria seguir visível no tenant`);
  }
});

// -------------------------------------------------------------------------
// Caminho global do resolveDataScope
// -------------------------------------------------------------------------

test("consulta global de recurso audit_required passa a exigir justificativa", () => {
  // Nenhum papel tem audit_required em company_data depois da Fase C, então o
  // cenário é montado por override para travar a regra em si.
  const anterior = ROLE_OVERRIDES.super_admin;
  ROLE_OVERRIDES.super_admin = { ...(anterior || {}), company_data: "audit_required" };

  try {
    const semJustificativa = resolveDataScope(makeReq(superAdmin), "company_data");
    assert.equal(semJustificativa.ok, false);
    assert.equal(semJustificativa.status, 403);
    assert.equal(semJustificativa.code, "RBAC_JUSTIFICATION_REQUIRED");

    const curta = resolveDataScope(
      makeReq(superAdmin, { "x-justification": "curta" }),
      "company_data",
    );
    assert.equal(curta.ok, false, "justificativa com menos de 8 caracteres não vale");

    const valida = resolveDataScope(
      makeReq(superAdmin, { "x-justification": "Chamado 4471 - auditoria de cadastro" }),
      "company_data",
    );
    assert.equal(valida.ok, true);
    assert.equal(valida.global, true);
  } finally {
    if (anterior) ROLE_OVERRIDES.super_admin = anterior;
    else delete ROLE_OVERRIDES.super_admin;
  }
});

test("consulta global de recurso comum segue sem justificativa", () => {
  // `billing_contracts` é full para o dono: o caminho global não deve travar.
  assert.equal(effectiveAccessLevel(superAdmin, "billing_contracts"), "full");
  const scope = resolveDataScope(makeReq(superAdmin), "billing_contracts");
  assert.equal(scope.ok, true);
  assert.equal(scope.global, true);
});
