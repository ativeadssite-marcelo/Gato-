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
  buildCustomerPayload,
  buildProductPayload,
  buildQuotePayload,
  buildQuoteUpdatePayload,
  buildSyncCatalogPayload,
  isAccessDeniedError,
  isDatabaseNotConfiguredError,
  mapCustomerRow,
  mapProductRow,
  mapQuoteRow,
  mapSupplierRow,
} from "../../src/services/entityApi";
import type { Customer, Product, Quote } from "../../src/types";

/** Produto no formato do FRONT (o que a tela monta), para testar a ida à API. */
function produtoDoFront(overrides: Partial<Product> = {}): Product {
  return {
    id: "p-1",
    code: "RET-1113",
    oemCode: "",
    similarCodes: [],
    barcode: "",
    name: "RETENTOR CUBO TRASEIRO 1113",
    brand: "Sabó",
    category: "auto",
    supplier: "",
    location: { corridor: "", shelf: "", box: "" },
    stock: 0,
    minStock: 2,
    unitCost: 42,
    transportCost: 0,
    markupPercent: 0,
    sellingPrice: 85,
    ncm: "",
    cst: "",
    cfop: "",
    taxBaseIcms: 0,
    applications: [],
    updatedAt: "2026-10-08T00:00:00.000Z",
    ...overrides,
  };
}

/** Cliente no formato do FRONT (uf, type, discountRate...). */
function clienteDoFront(overrides: Partial<Customer> = {}): Customer {
  return {
    id: "cust-1",
    name: "CLIENTE DE TESTE",
    type: "consumidor",
    document: "123.456.789-09",
    phone: "(67) 99999-0000",
    email: "teste@exemplo.com.br",
    city: "Campo Grande",
    uf: "MS",
    discountRate: 0,
    ...overrides,
  };
}

/** Orçamento no formato do FRONT, com um item de 4 x 85,00. */
function quoteDoFront(overrides: Partial<Quote> = {}): Quote {
  return {
    id: "quot-1",
    quoteNumber: "DAV-2026-00489",
    customerId: "cust-1",
    customerName: "MARQUES TRANSPORTES LTDA",
    customerDocument: "08.492.119/0001-72",
    customerType: "frotista",
    customerUf: "MS",
    items: [
      {
        productId: "p-1",
        productName: "RETENTOR CUBO TRASEIRO 1113",
        productCode: "RET-1113",
        brand: "Sabó",
        quantity: 4,
        costPrice: 42,
        basePrice: 85,
        discountPercent: 0,
        finalUnitPrice: 85,
        total: 340,
        locationStr: "",
      },
    ],
    subtotalAmount: 340,
    discountAmount: 0,
    totalAmount: 340,
    taxAmount: 0,
    status: "Pendente",
    validUntil: "2026-10-23",
    createdAt: "2026-10-08T12:00:00.000Z",
    ...overrides,
  };
}

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

test("produto: campo sem coluna no banco sai neutro, não inventado", () => {  const product = mapProductRow({ id: "p", sku: "S", name: "N" });
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
  assert.strictEqual(mapQuoteRow({ ...budgetRow, status: "CANCELED" }).status, "Cancelado");
  assert.strictEqual(mapQuoteRow({ ...budgetRow, status: "Cancelado" }).status, "Cancelado");
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

// -------------------------------------------------------------------------
// Payloads de escrita (POST) — a tradução inversa, front → API
// -------------------------------------------------------------------------

test("payload de produto: code vira sku e os preços viram o vocabulário da API", () => {
  const payload = buildProductPayload({
    ...produtoDoFront(),
    code: "RET-1113",
    barcode: "7891234567890",
    unitCost: 42,
    sellingPrice: 85.5,
    minStock: 5,
    stock: 12,
    stockCentral: 12,
  });

  assert.strictEqual(payload.sku, "RET-1113");
  assert.strictEqual(payload.costPrice, 42);
  assert.strictEqual(payload.salePrice, 85.5);
  assert.strictEqual(payload.minStock, 5);
  assert.strictEqual(payload.initialStock, 12);
  assert.strictEqual(payload.barcode, "7891234567890");
});

test("payload de produto: sem stockCentral, o estoque inicial sai de stock", () => {
  const payload = buildProductPayload({
    ...produtoDoFront(),
    stock: 7,
    stockCentral: undefined,
  });
  assert.strictEqual(payload.initialStock, 7);
});

test("payload de produto: campo vazio vira undefined, não string vazia", () => {
  const payload = buildProductPayload({ ...produtoDoFront(), barcode: "", brand: "" });
  assert.strictEqual(payload.barcode, undefined);
  assert.strictEqual(payload.brand, undefined);
});

test("payload de cliente: uf vira state e 14 dígitos viram PJ", () => {
  const payload = buildCustomerPayload({
    ...clienteDoFront(),
    document: "08.492.119/0001-72",
    uf: "MS",
  });

  assert.strictEqual(payload.state, "MS");
  assert.strictEqual(payload.personType, "PJ");
  assert.strictEqual(payload.document, "08.492.119/0001-72");
});

test("payload de cliente: CPF de 11 dígitos vira PF e campo vazio vira undefined", () => {
  const payload = buildCustomerPayload({
    ...clienteDoFront(),
    document: "123.456.789-09",
    phone: "",
  });

  assert.strictEqual(payload.personType, "PF");
  assert.strictEqual(payload.phone, undefined);
});

test("payload de orçamento: cliente que veio do banco vai por id", () => {
  const payload = buildQuotePayload(
    quoteDoFront({ customerId: "cust_do_banco" }),
    [clienteDoFront({ id: "cust_do_banco" })],
  );

  assert.strictEqual(payload.customerId, "cust_do_banco");
  assert.strictEqual(payload.customerName, undefined);
});

test("payload de orçamento: cliente que NÃO veio do banco vai por nome", () => {
  // Id do seed/demonstração: mandá-lo faria a rota responder 400 sem tentar o nome.
  const payload = buildQuotePayload(quoteDoFront({ customerId: "cust-1" }), []);

  assert.strictEqual(payload.customerId, undefined);
  assert.strictEqual(payload.customerName, "MARQUES TRANSPORTES LTDA");
});

test("payload de orçamento: item leva preço final e quantidade", () => {
  const payload = buildQuotePayload(quoteDoFront(), []) as { items: Array<Record<string, unknown>> };
  assert.deepStrictEqual(payload.items[0], {
    productId: "p-1",
    quantity: 4,
    unitPrice: 85,
  });
});

// -------------------------------------------------------------------------
// Inativação (o "excluir" do sistema)
// -------------------------------------------------------------------------
test("produto do banco com active=false chega inativado no front", () => {
  const inativo = mapProductRow({ id: "p", sku: "S", name: "N", active: false });
  assert.strictEqual(inativo.active, false);
});

test("produto sem a coluna active (seed, cadastro novo) conta como ativo", () => {
  const produto = mapProductRow({ id: "p", sku: "S", name: "N" });
  assert.strictEqual(produto.active, true);
});

// -------------------------------------------------------------------------
// Alteração de orçamento (PUT)
// -------------------------------------------------------------------------

test("alteração de orçamento: mantém o número, o status e regrava os itens", () => {
  const payload = buildQuoteUpdatePayload(
    quoteDoFront({ id: "bud_1", customerId: "cust_do_banco", status: "Cancelado" }),
    [clienteDoFront({ id: "cust_do_banco" })],
  ) as Record<string, unknown> & { items: Array<Record<string, unknown>> };

  assert.strictEqual(payload.number, "DAV-2026-00489");
  assert.strictEqual(payload.status, "Cancelado");
  assert.strictEqual(payload.customerId, "cust_do_banco");
  assert.deepStrictEqual(payload.items[0], { productId: "p-1", quantity: 4, unitPrice: 85 });
});

test("alteração de orçamento: cliente fora da lista não é enviado (o vínculo do banco permanece)", () => {
  // Diferente do create: aqui NÃO cai para o nome — o orçamento já existe no
  // banco e mandar nome de cadastro ausente só daria 400.
  const payload = buildQuoteUpdatePayload(quoteDoFront({ id: "bud_1", customerId: "cust-1" }), []);

  assert.ok(!("customerId" in payload));
  assert.ok(!("customerName" in payload));
});

// -------------------------------------------------------------------------
// Entrada de nota (XML) — gravação de preço e saldo
// -------------------------------------------------------------------------

test("payload de sincronização leva o saldo JÁ SOMADO e o custo da nota", () => {
  const payload = buildSyncCatalogPayload([
    { ...produtoDoFront(), code: "RET-1113", unitCost: 44.9, sellingPrice: 89.9, minStock: 3, stock: 15, stockCentral: 15 },
  ]) as { products: Array<Record<string, unknown>> };

  assert.deepStrictEqual(payload.products[0], {
    code: "RET-1113",
    name: "RETENTOR CUBO TRASEIRO 1113",
    brand: "Sabó",
    costPrice: 44.9,
    salePrice: 89.9,
    minStock: 3,
    stock: 15,
  });
});

test("payload de sincronização usa stockCentral quando existe e nunca manda saldo negativo", () => {
  const comCentral = buildSyncCatalogPayload([
    { ...produtoDoFront(), stock: 99, stockCentral: 4 },
  ]) as { products: Array<Record<string, unknown>> };
  assert.strictEqual(comCentral.products[0].stock, 4);

  const negativo = buildSyncCatalogPayload([
    { ...produtoDoFront(), stock: -3, stockCentral: undefined },
  ]) as { products: Array<Record<string, unknown>> };
  assert.strictEqual(negativo.products[0].stock, 0);
});
