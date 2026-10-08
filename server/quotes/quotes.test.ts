// =========================================================================
// TESTES DA LEITURA DE ORÇAMENTOS (Budget + BudgetItem)
// =========================================================================
// O que este arquivo trava: o filtro de tenant não escapa da query, escopo
// vazio NÃO devolve a base inteira (fail-closed), os itens vêm agrupados por
// orçamento e o dinheiro sai como número mesmo quando o driver devolve NUMERIC
// como string.
//
// Roda sem banco de propósito: a suíte (`npm test`) é hermética, sem `.env`, e
// `getDbPool()` não existe aqui — o pool do teste é um duble que registra as
// chamadas e devolve linhas prontas.
// =========================================================================

import { test } from "node:test";
import assert from "node:assert";
import {
  buildItemsQuery,
  buildQuotesQuery,
  groupItemsByBudget,
  listQuotes,
  type QuoteQueryable,
} from "./quotes";

const TENANT = "cmtt58e6o0000ju346a0g6s32";

/** Pool que devolve as linhas na ordem em que for chamado e registra as queries. */
function stubPool(responses: Array<Record<string, unknown>[]> = []) {
  const calls: Array<{ sql: string; params?: unknown[] }> = [];
  const pool: QuoteQueryable = {
    async query(sql: string, params?: unknown[]) {
      calls.push({ sql, params });
      return { rows: responses[calls.length - 1] ?? [] };
    },
  };
  return { pool, calls };
}

// -------------------------------------------------------------------------
// Filtro de tenant (a garantia que não pode regredir)
// -------------------------------------------------------------------------

test("query de orçamentos filtra pelo tenant e passa o id como parâmetro", () => {
  const { sql, params } = buildQuotesQuery({ tenantId: TENANT });
  assert.match(sql, /WHERE b\."tenantId" = \$1/);
  assert.deepStrictEqual(params, [TENANT]);
  assert.doesNotMatch(sql, /WHERE FALSE/);
});

test("escopo global (plataforma) não recebe filtro de tenant", () => {
  const { sql, params } = buildQuotesQuery({ global: true });
  assert.doesNotMatch(sql, /tenantId" = \$1/);
  assert.doesNotMatch(sql, /WHERE FALSE/);
  assert.deepStrictEqual(params, []);
});

test("escopo sem tenant fecha a query em vez de devolver a base inteira", () => {
  const { sql, params } = buildQuotesQuery({});
  assert.match(sql, /WHERE FALSE/);
  assert.deepStrictEqual(params, []);
});

// -------------------------------------------------------------------------
// Itens
// -------------------------------------------------------------------------

test("itens são agrupados por orçamento preservando a ordem", () => {
  const grouped = groupItemsByBudget([
    { id: "i1", budgetId: "b1", productId: null, productName: null, productCode: null, brand: null, quantity: 1, unitPrice: 10 },
    { id: "i2", budgetId: "b2", productId: null, productName: null, productCode: null, brand: null, quantity: 2, unitPrice: 20 },
    { id: "i3", budgetId: "b1", productId: null, productName: null, productCode: null, brand: null, quantity: 3, unitPrice: 30 },
  ]);
  assert.deepStrictEqual(grouped.get("b1")!.map((i) => i.id), ["i1", "i3"]);
  assert.deepStrictEqual(grouped.get("b2")!.map((i) => i.id), ["i2"]);
  assert.strictEqual(grouped.get("b3"), undefined);
});

test("query de itens busca todos os orçamentos numa chamada só", () => {
  const { sql, params } = buildItemsQuery(["b1", "b2"]);
  assert.match(sql, /ANY\(\$1::text\[\]\)/);
  assert.deepStrictEqual(params, [["b1", "b2"]]);
});

// -------------------------------------------------------------------------
// listQuotes (com duble de pool)
// -------------------------------------------------------------------------

test("listQuotes anexa os itens e normaliza dinheiro que veio como string", async () => {
  const { pool, calls } = stubPool([
    [
      {
        id: "b1",
        number: "DAV-2026-00489",
        customerId: "c1",
        customerName: "MARQUES TRANSPORTES LTDA",
        total: "1234.50",
        status: "PENDING",
        createdAt: "2026-10-01T10:00:00.000Z",
        updatedAt: "2026-10-01T10:00:00.000Z",
      },
    ],
    [
      { id: "i1", budgetId: "b1", productId: "p1", productName: "RETENTOR", productCode: "RET-1113", brand: "Sabó", quantity: "4", unitPrice: "85.00" },
      { id: "i2", budgetId: "b1", productId: null, productName: null, productCode: null, brand: null, quantity: "1", unitPrice: "10.00" },
    ],
  ]);

  const quotes = await listQuotes(pool, { tenantId: TENANT });

  assert.strictEqual(quotes.length, 1);
  assert.strictEqual(quotes[0].total, 1234.5);
  assert.strictEqual(quotes[0].items.length, 2);
  assert.strictEqual(quotes[0].items[0].quantity, 4);
  assert.strictEqual(quotes[0].items[0].unitPrice, 85);
  assert.strictEqual(quotes[0].items[0].productName, "RETENTOR");
  // A segunda chamada recebeu os ids dos orçamentos carregados.
  assert.deepStrictEqual(calls[1].params, [["b1"]]);
  assert.deepStrictEqual(calls[0].params, [TENANT]);
});

test("listQuotes sem orçamentos não vai ao banco buscar itens", async () => {
  const { pool, calls } = stubPool([[]]);
  const quotes = await listQuotes(pool, { tenantId: TENANT });
  assert.deepStrictEqual(quotes, []);
  assert.strictEqual(calls.length, 1);
});

test("listQuotes global não filtra por tenant", async () => {
  const { pool, calls } = stubPool([[]]);
  await listQuotes(pool, { global: true });
  assert.deepStrictEqual(calls[0].params, []);
});

test("orçamento sem itens devolve lista vazia, não undefined", async () => {
  const { pool } = stubPool([
    [{ id: "b1", number: "DAV-1", total: 0, status: "PENDING", createdAt: "", updatedAt: "" }],
    [],
  ]);
  const quotes = await listQuotes(pool, { tenantId: TENANT });
  assert.deepStrictEqual(quotes[0].items, []);
  assert.strictEqual(quotes[0].customerName, null);
});
