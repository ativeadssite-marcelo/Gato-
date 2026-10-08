// =========================================================================
// TESTES DAS REGRAS DA ORDEM DE SERVIÇO (src/utils/serviceOrder.ts)
// =========================================================================
// Duas coisas que não podem regredir:
//  - o ciclo de vida não deixa a OS pular etapas nem sair de Faturada/Cancelada;
//  - o total é recalculado das peças + mão de obra − desconto, nunca lido de um
//    campo guardado (nos seeds havia OS com total que não fechava a conta).
// =========================================================================

import { test } from "node:test";
import assert from "node:assert";
import {
  OS_TRANSICOES,
  calcularTotaisOs,
  osEstaAberta,
  podeTransicionarOs,
  proximoNumeroOs,
} from "../../src/utils/serviceOrder";
import type { ServiceOrder, ServiceOrderStatus } from "../../src/types";

const TODOS_STATUS: ServiceOrderStatus[] = [
  "Orcamento",
  "Aprovada",
  "Em Execucao",
  "Aguardando Pecas",
  "Finalizada",
  "Faturada",
  "Cancelada",
];

// -------------------------------------------------------------------------
// Ciclo de vida
// -------------------------------------------------------------------------

test("toda transição declarada é entre status que existem", () => {
  for (const [de, destinos] of Object.entries(OS_TRANSICOES)) {
    assert.ok(TODOS_STATUS.includes(de as ServiceOrderStatus), `origem desconhecida: ${de}`);
    for (const para of destinos) {
      assert.ok(TODOS_STATUS.includes(para), `destino desconhecido: ${para}`);
    }
  }
});

test("orçamento não pula direto para finalizada", () => {
  assert.strictEqual(podeTransicionarOs("Orcamento", "Finalizada"), false);
  assert.strictEqual(podeTransicionarOs("Orcamento", "Aprovada"), true);
});

test("OS finalizada reabre para execução, mas não volta para orçamento", () => {
  assert.strictEqual(podeTransicionarOs("Finalizada", "Em Execucao"), true);
  assert.strictEqual(podeTransicionarOs("Finalizada", "Orcamento"), false);
});

test("faturada e cancelada são fim de linha", () => {
  assert.deepStrictEqual(OS_TRANSICOES.Faturada, []);
  assert.deepStrictEqual(OS_TRANSICOES.Cancelada, []);
  for (const status of TODOS_STATUS) {
    assert.strictEqual(podeTransicionarOs("Faturada", status), false);
    assert.strictEqual(podeTransicionarOs("Cancelada", status), false);
  }
});

test("toda OS pode ser cancelada antes de fechar", () => {
  for (const status of ["Orcamento", "Aprovada", "Em Execucao", "Aguardando Pecas"] as ServiceOrderStatus[]) {
    assert.strictEqual(podeTransicionarOs(status, "Cancelada"), true, `${status} deveria cancelar`);
  }
});

test("osEstaAberta distingue o que dá trabalho do que acabou", () => {
  assert.strictEqual(osEstaAberta("Em Execucao"), true);
  assert.strictEqual(osEstaAberta("Aguardando Pecas"), true);
  assert.strictEqual(osEstaAberta("Finalizada"), false);
  assert.strictEqual(osEstaAberta("Faturada"), false);
  assert.strictEqual(osEstaAberta("Cancelada"), false);
});

// -------------------------------------------------------------------------
// Totais
// -------------------------------------------------------------------------

test("total é peças + mão de obra − desconto", () => {
  const totais = calcularTotaisOs({
    parts: [
      { productId: "p1", productCode: "A", productName: "PEÇA A", brand: "X", quantity: 2, unitPrice: 100, costPrice: 60, total: 200 },
      { productId: "p2", productCode: "B", productName: "PEÇA B", brand: "Y", quantity: 1, unitPrice: 50, costPrice: 30, total: 50 },
    ],
    labor: [
      { id: "l1", description: "Troca de correia", hours: 2, price: 180 },
      { id: "l2", description: "Alinhamento", price: 70 },
    ],
    discount: 30,
  });

  assert.strictEqual(totais.partsTotal, 250);
  assert.strictEqual(totais.laborTotal, 250);
  assert.strictEqual(totais.totalAmount, 470);
});

test("o campo `total` de cada peça NÃO é usado — quem manda é quantidade × preço", () => {
  // Era exatamente assim que um total guardado errado entrava na conta.
  const totais = calcularTotaisOs({
    parts: [
      { productId: "p1", productCode: "A", productName: "PEÇA A", brand: "X", quantity: 3, unitPrice: 10, costPrice: 5, total: 999 },
    ],
    labor: [],
    discount: 0,
  });
  assert.strictEqual(totais.partsTotal, 30);
  assert.strictEqual(totais.totalAmount, 30);
});

test("desconto maior que o serviço não gera total negativo", () => {
  const totais = calcularTotaisOs({ parts: [], labor: [{ id: "l1", description: "Serviço", price: 100 }], discount: 500 });
  assert.strictEqual(totais.totalAmount, 0);
});

test("OS sem peças nem serviços fecha em zero, sem estourar", () => {
  const totais = calcularTotaisOs({ parts: [], labor: [], discount: 0 });
  assert.deepStrictEqual(totais, { partsTotal: 0, laborTotal: 0, totalAmount: 0 });
});

// -------------------------------------------------------------------------
// Numeração
// -------------------------------------------------------------------------

test("próximo número continua a sequência do ano", () => {
  const existentes = [
    { id: "OS-2026-001" },
    { id: "OS-2026-007" },
    { id: "OS-2025-099" },
  ] as ServiceOrder[];

  assert.strictEqual(proximoNumeroOs(existentes, 2026), "OS-2026-008");
});

test("primeira OS do ano começa em 001", () => {
  assert.strictEqual(proximoNumeroOs([], 2026), "OS-2026-001");
});
