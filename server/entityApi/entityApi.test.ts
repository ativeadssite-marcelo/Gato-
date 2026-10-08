// =========================================================================
// TESTES DOS MAPEADORES DA PONTE FRONT ↔ BANCO (src/services/entityApi.ts)
// =========================================================================
// O que se trava aqui: os nomes de campo da API (`sku`, `salePrice`,
// `costPrice`, `state`, `PENDING`) virarem os do front (`code`, `sellingPrice`,
// `unitCost`, `uf`, `Pendente`) e os campos que o banco não guarda saírem
// NEUTROS em vez de inventados. Um erro neste arquivo põe preço ou estoque
// errado na tela.
//
// Só funções puras: nada de fetch nem de pool — a suíte roda hermética.
// =========================================================================

import { test } from "node:test";
import assert from "node:assert";
import { ApiError } from "../../src/services/apiClient";
import {
  isAccessDeniedError,
  isDatabaseNotConfiguredError,
  mapCustomerRow,
  mapProductRow,
  mapQuoteRow,
  mapSupplierRow,
} from "../../src/services/entityApi";

// -------------------------------------------------------------------------
// PRODUTO
// -------------------------------------------------------------------------

test("produto: sku vira code e os preços da API viram o vocabulário do front", () => {
  const product = mapProductRow({
    id: "prod_1",
    sku: "RET-1113",
    barcode: "7891234567890",
    name: "RETENTOR CUBO TRASEIRO",
    brand: "Sabó",
    costPrice: "42.00",
    salePrice: "85.50",
    minStock: 5,
    stock: 12,
    updatedAt: "2026-10-08T12:00:00.000Z",
  });

  assert.strictEqual(product.id, "prod_1");
  assert.strictEqual(product.code, "RET-1113");
  assert.strictEqual(product.barcode, "7891234567890");
  assert.strictEqual(product.unitCost, 42);
  assert.strictEqual(product.sellingPrice, 85.5);
  assert.strictEqual(product.minStock, 5);
  assert.strictEqual(product.stock, 12);
  assert.strictEqual(product.updatedAt, "2026-10-08T12:00:00.000Z");
});

test("produto: stockCentral acompanha o saldo (o banco soma um depósito só)", () => {
  const product = mapProductRow({ id: "p", sku: "S", name: "N", stock: 7 });
  assert.strictEqual(product.stockCentral, 7);
});

test("produto: markup é derivado do custo e da venda; custo zero não divide por zero", () => {
  const comCusto = mapProductRow({ id: "p", sku: "S", name: "N", costPrice: 100, salePrice: 145 });
  assert.strictEqual(comCusto.markupPercent, 45);

  const semCusto = mapProductRow({ id: "p", sku: "S", name: "N", costPrice: 0, salePrice: 50 });
  assert.strictEqual(semCusto.markupPercent, 0);
});

test("produto: campo sem coluna no banco sai neutro, não inventado", () => {
  const product = mapProductRow({ id: "p", sku: "S", name: "N" });
  assert.strictEqual(product.oemCode, "");
  assert.strictEqual(product.supplier, "");
  assert.strictEqual(product.ncm, "");
  assert.strictEqual(product.taxBaseIcms, 0);
  assert.deepStrictEqual(product.applications, []);
  assert.deepStrictEqual(product.location, { corridor: "", shelf: "", box: "" });
  assert.deepStrictEqual(product.similarCodes, []);
});

// -------------------------------------------------------------------------
// CLIENTE E FORNECEDOR
// -------------------------------------------------------------------------

test("cliente: state da API vira uf; o segmento comercial fica no padrão", () => {
  const customer = mapCustomerRow({
    id: "cust_1",
    name: "MARQUES TRANSPORTES LTDA",
    document: "08.492.119/0001-72",
    phone: "(67) 3384-9000",
    email: "frotas@marques.com.br",
    city: "Campo Grande",
    state: "MS",
  });

  assert.strictEqual(customer.uf, "MS");
  assert.strictEqual(customer.city, "Campo Grande");
  assert.strictEqual(customer.type, "consumidor");
  assert.strictEqual(customer.discountRate, 0);
});

test("fornecedor: nulos do banco viram vazio/undefined, não a string 'null'", () => {
  const supplier = mapSupplierRow({
    id: "sup_1",
    name: "DISTRIBUIDORA CENTRAL",
    cnpj: null,
    phone: null,
    contact: null,
    state: "SP",
  });

  assert.strictEqual(supplier.cnpj, "");
  assert.strictEqual(supplier.phone, "");
  assert.strictEqual(supplier.contact, undefined);
  assert.strictEqual(supplier.state, "SP");
});

// -------------------------------------------------------------------------
// ORÇAMENTO
// -------------------------------------------------------------------------

const budgetRow = {
  id: "bud_1",
  number: "DAV-2026-00489",
  customerId: "cust_1",
  customerName: "MARQUES TRANSPORTES LTDA",
  customerDocument: "08.492.119/0001-72",
  customerUf: "MS",
  total: "340.00",
  status: "PENDING",
  createdAt: "2026-10-01T10:00:00.000Z",
  items: [
    { id: "i1", budgetId: "bud_1", productId: "p1", productName: "RETENTOR", productCode: "RET-1113", brand: "Sabó", quantity: "4", unitPrice: "85.00" },
  ],
};

test("orçamento: status do banco vira o status do front", () => {
  assert.strictEqual(mapQuoteRow(budgetRow).status, "Pendente");
  assert.strictEqual(mapQuoteRow({ ...budgetRow, status: "APPROVED" }).status, "Aprovado");
  assert.strictEqual(mapQuoteRow({ ...budgetRow, status: "Convertido" }).status, "Convertido");
  assert.strictEqual(mapQuoteRow({ ...budgetRow, status: "QUALQUER_COISA" }).status, "Pendente");
});

test("orçamento: itens somam no subtotal e multiplicam quantidade x preço", () => {
  const quote = mapQuoteRow(budgetRow);
  assert.strictEqual(quote.items.length, 1);
  assert.strictEqual(quote.items[0].quantity, 4);
  assert.strictEqual(quote.items[0].finalUnitPrice, 85);
  assert.strictEqual(quote.items[0].total, 340);
  assert.strictEqual(quote.subtotalAmount, 340);
  assert.strictEqual(quote.totalAmount, 340);
});

test("orçamento: validade é derivada da criação (convenção de 15 dias do balcão)", () => {
  const quote = mapQuoteRow(budgetRow);
  assert.strictEqual(quote.validUntil, "2026-10-16");
});

test("orçamento: data inválida não vira 'Invalid Date' na tela", () => {
  const quote = mapQuoteRow({ ...budgetRow, createdAt: "" });
  assert.strictEqual(quote.validUntil, "");
  assert.strictEqual(quote.createdAt, "");
});

test("orçamento sem cliente (LEFT JOIN) não estoura", () => {
  const quote = mapQuoteRow({ ...budgetRow, customerId: null, customerName: null, customerUf: null, items: [] });
  assert.strictEqual(quote.customerId, "");
  assert.strictEqual(quote.customerName, "");
  assert.deepStrictEqual(quote.items, []);
  assert.strictEqual(quote.subtotalAmount, 0);
});

// -------------------------------------------------------------------------
// Classificação de erro (decide seed x vazio x aviso no App)
// -------------------------------------------------------------------------

test("503 é 'sem banco' (mantém o seed de dev)", () => {
  assert.strictEqual(isDatabaseNotConfiguredError(new ApiError("sem banco", 503)), true);
  assert.strictEqual(isDatabaseNotConfiguredError(new ApiError("negado", 403)), false);
  assert.strictEqual(isDatabaseNotConfiguredError(new Error("rede")), false);
});

test("403 e 401 são 'acesso negado' (silêncio, sem aviso na tela)", () => {
  assert.strictEqual(isAccessDeniedError(new ApiError("negado", 403)), true);
  assert.strictEqual(isAccessDeniedError(new ApiError("sessão", 401)), true);
  assert.strictEqual(isAccessDeniedError(new ApiError("sem banco", 503)), false);
});
