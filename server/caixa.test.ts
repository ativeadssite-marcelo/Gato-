// =========================================================================
// TESTES DO CAIXA (PDV) — abertura, movimentação, fechamento e auditoria
// =========================================================================
// Rodam SEM banco: a suíte não carrega o .env, então `isDatabaseConfigured()`
// é falso e tanto a hidratação quanto o espelho viram no-op. O que se testa
// aqui é a lógica de memória e — principalmente — a trilha de auditoria, que
// é requisito inegociável do projeto em toda operação sensível.
// =========================================================================

import { test } from "node:test";
import assert from "node:assert";
import {
  CaixaActor,
  cancelReceipt,
  closeCashRegister,
  getCaixaSummary,
  issueBoleto,
  issueReceipt,
  listCashMovements,
  markBoletoPaid,
  openCashRegister,
  recordMovement,
} from "./caixa";
import { AUDIT_LOGS_DATA } from "./rbacEngine";

/** Ator de teste — na aplicação real vem do `req` (server/caixaRoutes.ts). */
function actor(overrides: Partial<CaixaActor> = {}): CaixaActor {
  return {
    userId: "usr_test_caixa",
    userName: "Operador de Teste",
    roleCode: "tenant_user",
    ipAddress: "127.0.0.1",
    userAgent: "node:test",
    ...overrides,
  };
}

function auditFor(tenantId: string, action: string) {
  return AUDIT_LOGS_DATA.filter((l) => l.tenantId === tenantId && l.action === action);
}

test("abertura registra movimento de abertura com id próprio", async () => {
  const tenantId = "t_caixa_abertura";
  const register = await openCashRegister(tenantId, { openingAmount: 200 }, actor());

  assert.equal(register.status, "open");
  assert.equal(register.openingAmount, 200);
  // O caixa abre com expected = fundo (nenhuma venda ainda).
  assert.equal(register.expectedAmount, 200);

  const movements = await listCashMovements(register.id, tenantId);
  assert.equal(movements.length, 1);
  assert.equal(movements[0].type, "opening");
  assert.equal(movements[0].amount, 200);
  // Regressão: a chave do Map já foi o id do CAIXA, não do movimento — o que
  // duplicava o movimento quando a hidratação passou a ler por id.
  assert.match(movements[0].id, /^mov_/);
  assert.notEqual(movements[0].id, register.id);
});

test("não permite abrir um segundo caixa para o mesmo tenant", async () => {
  const tenantId = "t_caixa_duplicado";
  await openCashRegister(tenantId, { openingAmount: 100 }, actor());

  await assert.rejects(
    () => openCashRegister(tenantId, { openingAmount: 50 }, actor()),
    /Já existe um caixa aberto/,
  );

  // A tentativa bloqueada precisa deixar rastro — é o sintoma de outra pessoa
  // achando que o turno foi fechado.
  const blocked = auditFor(tenantId, "OPEN_CASH_REGISTER_BLOCKED");
  assert.equal(blocked.length, 1);
  assert.equal(blocked[0].status, "blocked");
  assert.equal(blocked[0].anomalous, true);
});

test("caixa não aceita movimentação de outro tenant", async () => {
  const tenantId = "t_caixa_isolamento_a";
  const register = await openCashRegister(tenantId, { openingAmount: 10 }, actor());

  await assert.rejects(
    () =>
      recordMovement(
        "t_caixa_isolamento_b",
        register.id,
        { type: "sale_cash", paymentMethod: "dinheiro", amount: 5, description: "Venda" },
        actor(),
      ),
    /Caixa não encontrado para este tenant/,
  );

  // E o caixa do outro tenant continua sem enxergar nada.
  assert.equal((await listCashMovements(register.id, "t_caixa_isolamento_b")).length, 0);
});

test("fechamento calcula a diferença e marca a trilha como anômala", async () => {
  const tenantId = "t_caixa_diferenca";
  const register = await openCashRegister(tenantId, { openingAmount: 100 }, actor());

  await recordMovement(
    tenantId,
    register.id,
    { type: "sale_cash", paymentMethod: "dinheiro", amount: 50, description: "Venda à vista" },
    actor(),
  );

  // Fundo 100 + venda 50 = 150 esperado; contado 140 => falta de R$ 10.
  const closed = await closeCashRegister(tenantId, { actualAmount: 140 }, actor());
  assert.equal(closed.expectedAmount, 150);
  assert.equal(closed.actualAmount, 140);
  assert.equal(closed.difference, -10);
  assert.equal(closed.status, "closed");

  const entry = auditFor(tenantId, "CLOSE_CASH_REGISTER");
  assert.equal(entry.length, 1);
  assert.equal(entry[0].status, "warning");
  assert.equal(entry[0].anomalous, true);
  assert.equal(entry[0].beforeState?.status, "open");
  assert.equal(entry[0].afterState?.difference, -10);
});

test("fechamento conferido não é marcado como anômalo", async () => {
  const tenantId = "t_caixa_conferido";
  const register = await openCashRegister(tenantId, { openingAmount: 80 }, actor());
  await recordMovement(
    tenantId,
    register.id,
    { type: "sale_pix", paymentMethod: "pix", amount: 20, description: "Venda PIX" },
    actor(),
  );

  const closed = await closeCashRegister(tenantId, { actualAmount: 100 }, actor());
  assert.equal(closed.difference, 0);

  const entry = auditFor(tenantId, "CLOSE_CASH_REGISTER");
  assert.equal(entry[0].status, "success");
  assert.equal(entry[0].anomalous, false);
});

test("sangria e ajuste manual ganham ação própria na trilha", async () => {
  const tenantId = "t_caixa_sangria";
  const register = await openCashRegister(tenantId, { openingAmount: 500 }, actor());

  await recordMovement(
    tenantId,
    register.id,
    { type: "withdrawal", paymentMethod: "dinheiro", amount: 200, description: "Sangria para cofre" },
    actor(),
  );
  await recordMovement(
    tenantId,
    register.id,
    { type: "adjustment", paymentMethod: "dinheiro", amount: 10, description: "Ajuste de contagem" },
    actor(),
  );

  const sangria = auditFor(tenantId, "CASH_WITHDRAWAL");
  assert.equal(sangria.length, 1);
  assert.equal(sangria[0].status, "warning");
  assert.equal(sangria[0].anomalous, false);

  // Ajuste manual é o vetor clássico de fraude no PDV: anômalo.
  const ajuste = auditFor(tenantId, "CASH_ADJUSTMENT");
  assert.equal(ajuste.length, 1);
  assert.equal(ajuste[0].anomalous, true);
});

test("sangria reduz o esperado no fechamento", async () => {
  const tenantId = "t_caixa_sangria_valor";
  const register = await openCashRegister(tenantId, { openingAmount: 300 }, actor());
  await recordMovement(
    tenantId,
    register.id,
    { type: "withdrawal", paymentMethod: "dinheiro", amount: 100, description: "Sangria" },
    actor(),
  );

  const closed = await closeCashRegister(tenantId, { actualAmount: 200 }, actor());
  assert.equal(closed.expectedAmount, 200);
  assert.equal(closed.difference, 0);
});

test("recibo vincula o movimento e persiste os itens", async () => {
  const tenantId = "t_caixa_recibo";
  const register = await openCashRegister(tenantId, { openingAmount: 0 }, actor());

  const receipt = await issueReceipt(
    tenantId,
    {
      cashRegisterId: register.id,
      type: "receipt",
      customerName: "Cliente Teste",
      items: [
        {
          productId: null,
          sku: "SKU-1",
          name: "Filtro de óleo",
          quantity: 2,
          unitPrice: 25,
          discount: 0,
          total: 50,
          ncm: "84212300",
          cest: null,
          cfop: "5102",
          taxIcms: 18,
          taxIpi: 0,
          taxPis: 1.65,
          taxCofins: 7.6,
        },
      ],
      subtotal: 50,
      discount: 0,
      total: 50,
      paymentMethod: "dinheiro",
    },
    actor(),
  );

  assert.equal(receipt.total, 50);
  // Os itens são o detalhe fiscal — antes eram perdidos na persistência.
  assert.equal(receipt.items.length, 1);
  assert.equal(receipt.items[0].sku, "SKU-1");
  assert.equal(receipt.items[0].ncm, "84212300");

  // O vínculo recibo → movimento existia no tipo e nunca era preenchido.
  assert.ok(receipt.movementId, "recibo deve apontar para o movimento da venda");
  const movements = await listCashMovements(register.id, tenantId);
  const sale = movements.find((m) => m.id === receipt.movementId);
  assert.ok(sale, "movimento do recibo deve existir no caixa");
  assert.equal(sale!.amount, 50);
  assert.equal(sale!.referenceId, receipt.id);

  assert.equal(auditFor(tenantId, "ISSUE_RECEIPT").length, 1);
});

test("recibos classificam a venda pela forma de pagamento sem alterar o esperado total", async () => {
  const tenantId = "t_caixa_recibos_forma_pagamento";
  const register = await openCashRegister(tenantId, { openingAmount: 10 }, actor());
  const payments = [
    { paymentMethod: "dinheiro" as const, movementType: "sale_cash" },
    { paymentMethod: "cartao_credito" as const, movementType: "sale_card" },
    { paymentMethod: "pix" as const, movementType: "sale_pix" },
    { paymentMethod: "boleto" as const, movementType: "sale_boleto" },
  ];

  for (const payment of payments) {
    const receipt = await issueReceipt(
      tenantId,
      {
        cashRegisterId: register.id,
        type: "receipt",
        items: [
          {
            productId: null,
            sku: null,
            name: "Peça",
            quantity: 1,
            unitPrice: 10,
            discount: 0,
            total: 10,
            ncm: null,
            cest: null,
            cfop: null,
            taxIcms: 0,
            taxIpi: 0,
            taxPis: 0,
            taxCofins: 0,
          },
        ],
        subtotal: 10,
        discount: 0,
        total: 10,
        paymentMethod: payment.paymentMethod,
      },
      actor(),
    );
    const movements = await listCashMovements(register.id, tenantId);
    assert.equal(movements.find((movement) => movement.id === receipt.movementId)?.type, payment.movementType);
  }

  const summary = await getCaixaSummary(tenantId);
  assert.equal(summary.totals.expected, 50);
  assert.equal(summary.totals.salesCash, 10);
  assert.equal(summary.totals.salesCard, 10);
  assert.equal(summary.totals.salesPix, 10);
  assert.equal(summary.totals.salesBoleto, 10);
});

test("cancelamento de recibo entra na trilha como warning", async () => {
  const tenantId = "t_caixa_cancelamento";
  await openCashRegister(tenantId, { openingAmount: 0 }, actor());

  const receipt = await issueReceipt(
    tenantId,
    {
      type: "receipt",
      items: [
        {
          productId: null, sku: null, name: "Peça", quantity: 1, unitPrice: 10, discount: 0,
          total: 10, ncm: null, cest: null, cfop: null, taxIcms: 0, taxIpi: 0, taxPis: 0, taxCofins: 0,
        },
      ],
      subtotal: 10,
      discount: 0,
      total: 10,
      paymentMethod: "dinheiro",
    },
    actor(),
  );

  const cancelled = await cancelReceipt(tenantId, receipt.id, actor());
  assert.equal(cancelled?.status, "cancelled");
  assert.equal(cancelled?.cancelledBy, "usr_test_caixa");

  const entry = auditFor(tenantId, "CANCEL_RECEIPT");
  assert.equal(entry.length, 1);
  assert.equal(entry[0].status, "warning");
  assert.equal(entry[0].beforeState?.status, "issued");
});

test("boleto emitido é auditado e baixa divergente vira anomalia", async () => {
  const tenantId = "t_caixa_boleto";
  await openCashRegister(tenantId, { openingAmount: 0 }, actor());

  const boleto = await issueBoleto(
    tenantId,
    {
      customerId: "cli_1",
      customerName: "Cliente Boleto",
      customerDocument: "12345678900",
      amount: 300,
      dueDate: "2026-11-30",
      description: "Parcela 1/3",
    },
    actor(),
  );

  assert.equal(boleto.status, "issued");
  assert.equal(auditFor(tenantId, "ISSUE_BOLETO").length, 1);

  // Baixa com valor menor que o emitido: divergência que o financeiro precisa ver.
  const paid = await markBoletoPaid(boleto.id, tenantId, "dinheiro", 250, actor());
  assert.equal(paid?.status, "paid");
  assert.equal(paid?.paidAmount, 250);

  const entry = auditFor(tenantId, "MARK_BOLETO_PAID");
  assert.equal(entry.length, 1);
  assert.equal(entry[0].anomalous, true);
  assert.equal(entry[0].status, "warning");
});

test("baixa de boleto pelo valor correto não é anômala", async () => {
  const tenantId = "t_caixa_boleto_ok";
  await openCashRegister(tenantId, { openingAmount: 0 }, actor());

  const boleto = await issueBoleto(
    tenantId,
    {
      customerId: "cli_2",
      customerName: "Cliente Quite",
      customerDocument: "98765432100",
      amount: 150,
      dueDate: "2026-11-30",
      description: "Parcela única",
    },
    actor(),
  );

  await markBoletoPaid(boleto.id, tenantId, "pix", 150, actor());
  const entry = auditFor(tenantId, "MARK_BOLETO_PAID");
  assert.equal(entry[0].anomalous, false);
  assert.equal(entry[0].status, "success");
});

test("resumo do caixa consolida os totais do turno aberto", async () => {
  const tenantId = "t_caixa_resumo";
  const register = await openCashRegister(tenantId, { openingAmount: 100 }, actor());
  await recordMovement(
    tenantId, register.id,
    { type: "sale_cash", paymentMethod: "dinheiro", amount: 40, description: "Venda dinheiro" }, actor(),
  );
  await recordMovement(
    tenantId, register.id,
    { type: "sale_pix", paymentMethod: "pix", amount: 60, description: "Venda PIX" }, actor(),
  );

  const summary = await getCaixaSummary(tenantId);
  assert.equal(summary.cashRegister?.id, register.id);
  assert.equal(summary.totals.opening, 100);
  assert.equal(summary.totals.salesCash, 40);
  assert.equal(summary.totals.salesPix, 60);
  // O `expected` do resumo soma TODAS as formas de venda (dinheiro, cartão,
  // PIX, boleto) e deixa de fora apenas vales/vouchers — mesma fórmula do
  // fechamento (closeCashRegister) e do relatório impresso.
  assert.equal(summary.totals.expected, 200);
});
