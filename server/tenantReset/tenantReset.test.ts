// =========================================================================
// TESTES DO RESET DO CONTRATANTE
// =========================================================================
// O reset é a ação mais destrutiva do sistema: ele apaga o cadastro e o
// movimento da empresa. Estes testes existem para travar as duas garantias que
// ninguém pode descobrir erradas em produção:
//
//  - a trilha de auditoria e a configuração NUNCA entram na lista de exclusão;
//  - a ordem de exclusão respeita as FKs (filho antes do pai).
// =========================================================================

import { test } from "node:test";
import assert from "node:assert";
import {
  RESET_TABLES,
  TABELAS_PRESERVADAS,
  confirmacaoValida,
  normalizarConfirmacao,
  resetStatements,
} from "./tenantReset";

test("toda exclusão é limitada ao tenant — nenhum DELETE solto", () => {
  for (const { tabela, sql } of resetStatements("tenant_x")) {
    assert.match(sql, /WHERE/, `${tabela}: DELETE sem WHERE apagaria a base inteira`);
    assert.match(sql, /tenantId/, `${tabela}: DELETE sem filtro de tenant`);
    assert.doesNotMatch(sql, /;\s*DELETE/i, `${tabela}: mais de um comando no mesmo statement`);
  }
});

test("as exclusões seguem a ordem declarada em RESET_TABLES", () => {
  assert.deepStrictEqual(
    resetStatements("t").map((s) => s.tabela),
    RESET_TABLES
  );
});

test("o reset nunca toca auditoria, acesso, cobrança nem configuração", () => {
  const proibidas = [
    "AuditLog",
    "RbacUser",
    "UserCredential",
    "Tenant",
    "Warehouse",
    "TenantSubscription",
    "Invoice",
    "WebhookEvent",
    "EmailLog",
    "TenantUsage",
    "User",
  ];
  for (const tabela of proibidas) {
    assert.ok(!RESET_TABLES.includes(tabela), `o reset não pode apagar ${tabela}`);
    assert.ok(TABELAS_PRESERVADAS.includes(tabela), `${tabela} deveria estar na lista de preservadas`);
  }
});

test("filhos são apagados antes dos pais (ordem das FKs)", () => {
  const posicao = (tabela: string) => RESET_TABLES.indexOf(tabela);
  assert.ok(posicao("BudgetItem") < posicao("Budget"), "BudgetItem antes de Budget");
  assert.ok(posicao("StockLevel") < posicao("Product"), "StockLevel antes de Product");
});

test("a lista não tem tabela repetida", () => {
  assert.strictEqual(new Set(RESET_TABLES).size, RESET_TABLES.length);
});

test("a confirmação aceita o nome digitado sem acento e sem caixa", () => {
  assert.strictEqual(confirmacaoValida("mg auto pecas", "MG Auto Peças"), true);
  assert.strictEqual(confirmacaoValida("  MG AUTO PEÇAS  ", "MG Auto Peças"), true);
});

test("a confirmação recusa nome diferente, vazio ou só espaço", () => {
  assert.strictEqual(confirmacaoValida("MG Auto", "MG Auto Peças"), false);
  assert.strictEqual(confirmacaoValida("", "MG Auto Peças"), false);
  assert.strictEqual(confirmacaoValida("   ", "MG Auto Peças"), false);
});

test("empresa sem nome não pode ser confirmada (evita reset por acidente)", () => {
  assert.strictEqual(confirmacaoValida("qualquer coisa", ""), false);
});

test("normalizarConfirmacao colapsa espaços internos", () => {
  assert.strictEqual(normalizarConfirmacao("MG   Auto    Peças"), "mg auto pecas");
});
