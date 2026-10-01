// =========================================================================
// SERVIÇO DE CAIXA — GATO SaaS
// =========================================================================
// Operações de PDV: abertura/fechamento de caixa, movimentações,
// emissão de boletos, recibos/Nota Fiscal, dados fiscais de boletos abertos.
// Multi-tenant: todos os registros são filtrados por tenantId.
// =========================================================================

import crypto from "node:crypto";
import { getDbPool, isDatabaseConfigured } from "./db";
import { appendAuditLog } from "./auditStore";
import { getClientIp } from "./auth";
import { TENANTS_DATA } from "./rbacEngine";
import {
  CashRegister,
  CashMovement,
  Receipt,
  ReceiptItem,
  BoletoIssuance,
  OpenBoletoData,
  CaixaSummary,
  OpenCaixaInput,
  CloseCaixaInput,
  RecordMovementInput,
  IssueReceiptInput,
  IssueBoletoInput,
  PaymentDetails,
  FiscalData,
  PaymentMethodCaixa,
} from "../src/types/caixa";
import { mirror } from "./dbMirror";

// -------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------
const id = (prefix: string) => `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
const now = () => new Date().toISOString();

function money(v: number): number {
  return Number(v.toFixed(2));
}

// -------------------------------------------------------------------------
// In-memory stores (mirror in Postgres)
// -------------------------------------------------------------------------
const registers = new Map<string, CashRegister>();
const movements = new Map<string, CashMovement>();
const receipts = new Map<string, Receipt>();
const boletos = new Map<string, BoletoIssuance>();

// Hidratação única do Postgres
let hydrated = false;

// =========================================================================
// CAIXA — ABERTURA / FECHAMENTO
// =========================================================================

export async function openCashRegister(
  tenantId: string,
  input: OpenCaixaInput,
  userId: string,
  userName: string,
): Promise<CashRegister> {
  // Evita abrir 2º caixa aberto para o mesmo tenant
  const existing = [...registers.values()].find(
    (r) => r.tenantId === tenantId && r.status === "open",
  );
  if (existing) {
    throw new Error("Já existe um caixa aberto para este tenant.");
  }

  const register: CashRegister = {
    id: id("caixa"),
    tenantId,
    userId,
    userName,
    status: "open",
    openingAmount: money(input.openingAmount),
    expectedAmount: money(input.openingAmount),
    actualAmount: 0,
    difference: 0,
    openedAt: now(),
    closedAt: null,
    closedByUserId: null,
    closedByUserName: null,
    notes: input.notes ?? null,
    createdAt: now(),
    updatedAt: now(),
  };

  registers.set(register.id, register);

  // Movimento de abertura
  movements.set(register.id, {
    id: id("mov"),
    tenantId,
    cashRegisterId: register.id,
    type: "opening",
    paymentMethod: "dinheiro",
    amount: register.openingAmount,
    description: `Abertura de caixa — Fundo: R$ ${register.openingAmount.toFixed(2)}`,
    referenceId: null,
    referenceType: null,
    customerId: null,
    customerName: null,
    userId,
    userName,
    createdAt: now(),
  });

  // Mirror no banco
  mirror(
    `INSERT INTO "CashRegister" (id, "tenantId", "userId", "userName", status, "openingAmount", "expectedAmount", "actualAmount", difference, "openedAt", "closedAt", "closedByUserId", "closedByUserName", notes, "createdAt", "updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
     ON CONFLICT (id) DO NOTHING;`,
    [register.id, tenantId, userId, userName, register.status, register.openingAmount, register.expectedAmount, register.actualAmount, register.difference, register.openedAt, register.closedAt, register.closedByUserId, register.closedByUserName, register.notes, register.createdAt, register.updatedAt],
  );

  return register;
}

export async function closeCashRegister(
  tenantId: string,
  input: CloseCaixaInput,
  userId: string,
  userName: string,
): Promise<CashRegister> {
  const register = [...registers.values()].find(
    (r) => r.tenantId === tenantId && r.status === "open",
  );
  if (!register) {
    throw new Error("Nenhum caixa aberto encontrado para este tenant.");
  }

  // Calcula expected a partir dos movimentos
  const totals = await computeMovementTotals(register.id);
  const totalSales = totals.salesCash + totals.salesCard + totals.salesPix + totals.salesBoleto;
  register.expectedAmount = money(register.openingAmount + totalSales - totals.refunds - totals.withdrawals + totals.deposits);
  register.actualAmount = money(input.actualAmount);
  register.difference = money(register.actualAmount - register.expectedAmount);
  register.status = "closed";
  register.closedAt = now();
  register.closedByUserId = userId;
  register.closedByUserName = userName;
  register.notes = input.notes ?? null;
  register.updatedAt = now();

  registers.set(register.id, register);

  // Movimento de fechamento
  movements.set(id("mov"), {
    id: id("mov"),
    tenantId,
    cashRegisterId: register.id,
    type: "closing",
    paymentMethod: "dinheiro",
    amount: register.actualAmount,
    description: `Fechamento de caixa — Esperado: R$ ${register.expectedAmount.toFixed(2)} | Real: R$ ${register.actualAmount.toFixed(2)} | Diferença: R$ ${register.difference.toFixed(2)}`,
    referenceId: null,
    referenceType: null,
    customerId: null,
    customerName: null,
    userId,
    userName,
    createdAt: now(),
  });

  mirror(
    `UPDATE "CashRegister" SET status=$1, "expectedAmount"=$2, "actualAmount"=$3, difference=$4, "closedAt"=$5, "closedByUserId"=$6, "closedByUserName"=$7, notes=$8, "updatedAt"=$9 WHERE id=$10;`,
    [register.status, register.expectedAmount, register.actualAmount, register.difference, register.closedAt, register.closedByUserId, register.closedByUserName, register.notes, register.updatedAt, register.id],
  );

  return register;
}

// =========================================================================
// MOVIMENTAÇÕES
// =========================================================================

export async function recordMovement(
  tenantId: string,
  registerId: string,
  input: RecordMovementInput,
  userId: string,
  userName: string,
): Promise<CashMovement> {
  const register = registers.get(registerId);
  if (!register || register.tenantId !== tenantId) {
    throw new Error("Caixa não encontrado para este tenant.");
  }
  if (register.status !== "open") {
    throw new Error("Somente caixa aberto aceita movimentações.");
  }

  const movement: CashMovement = {
    id: id("mov"),
    tenantId,
    cashRegisterId: registerId,
    type: input.type,
    paymentMethod: input.paymentMethod,
    amount: money(input.amount),
    description: input.description,
    referenceId: input.referenceId ?? null,
    referenceType: input.referenceType ?? null,
    customerId: input.customerId ?? null,
    customerName: input.customerName ?? null,
    userId,
    userName,
    createdAt: now(),
  };

  movements.set(movement.id, movement);

  mirror(
    `INSERT INTO "CashMovement" (id, "tenantId", "cashRegisterId", type, "paymentMethod", amount, description, "referenceId", "referenceType", "customerId", "customerName", "userId", "userName", "createdAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     ON CONFLICT (id) DO NOTHING;`,
    [movement.id, tenantId, registerId, movement.type, movement.paymentMethod, movement.amount, movement.description, movement.referenceId, movement.referenceType, movement.customerId, movement.customerName, movement.userId, movement.userName, movement.createdAt],
  );

  return movement;
}

export async function getCashRegister(registerId: string, tenantId: string): Promise<CashRegister | null> {
  const reg = registers.get(registerId);
  if (!reg || reg.tenantId !== tenantId) return null;
  return reg;
}

export async function listCashRegisters(tenantId: string, limit = 50): Promise<CashRegister[]> {
  return [...registers.values()]
    .filter((r) => r.tenantId === tenantId)
    .sort((a, b) => (b.openedAt < a.openedAt ? -1 : 1))
    .slice(0, limit);
}

export async function listCashMovements(registerId: string, tenantId: string, limit = 200): Promise<CashMovement[]> {
  return [...movements.values()]
    .filter((m) => m.cashRegisterId === registerId && m.tenantId === tenantId)
    .sort((a, b) => (b.createdAt < a.createdAt ? -1 : 1))
    .slice(0, limit);
}

// =========================================================================
// RECIBOS / NOTA FISCAL / CUPOM FISCAL
// =========================================================================

export async function issueReceipt(
  tenantId: string,
  input: IssueReceiptInput,
  userId: string,
  userName: string,
): Promise<Receipt> {
  // Se tem cashRegisterId, valida que está aberto
  if (input.cashRegisterId) {
    const reg = registers.get(input.cashRegisterId);
    if (!reg || reg.tenantId !== tenantId || reg.status !== "open") {
      throw new Error("Caixa não encontrado ou não aberto.");
    }
  }

  const total = money(input.items.reduce((s, i) => s + i.total, 0));
  const discount = money(input.discount);

  // Encontra próximo número sequencial do recibo
  const tenantReceipts = [...receipts.values()].filter((r) => r.tenantId === tenantId);
  const maxNum = tenantReceipts.reduce((max, r) => {
    const n = parseInt(r.number.replace(/[^0-9]/g, ""), 10);
    return n > max ? n : max;
  }, 0);
  const receiptNumber = `${tenantId.slice(-4)}-${String(maxNum + 1).padStart(6, "0")}`;

  const fiscal: FiscalData | null = input.fiscalData
    ? {
        model: (input.fiscalData.model as any) ?? "65",
        series: input.fiscalData.series ?? "1",
        number: input.fiscalData.number ?? receiptNumber,
        accessKey: input.fiscalData.accessKey ?? null,
        protocol: input.fiscalData.protocol ?? null,
        status: input.fiscalData.status ?? "pending",
        xmlPath: input.fiscalData.xmlPath ?? null,
        pdfPath: input.fiscalData.pdfPath ?? null,
        qrCodeUrl: input.fiscalData.qrCodeUrl ?? null,
        issuedAt: input.fiscalData.issuedAt ?? null,
        authorizedAt: input.fiscalData.authorizedAt ?? null,
        environment: input.fiscalData.environment ?? "homologation",
      }
    : null;

  const receipt: Receipt = {
    id: id("rec"),
    tenantId,
    cashRegisterId: input.cashRegisterId ?? null,
    movementId: null,
    number: receiptNumber,
    type: input.type,
    status: "issued",
    customerId: input.customerId ?? null,
    customerName: input.customerName ?? null,
    customerDocument: input.customerDocument ?? null,
    items: input.items.map((it, idx) => ({
      ...it,
      id: id("it"),
    })),
    subtotal: money(total + discount),
    discount,
    total,
    paymentMethod: input.paymentMethod,
    paymentDetails: input.paymentDetails ?? null,
    fiscalData: fiscal,
    issuedAt: now(),
    cancelledAt: null,
    cancelledBy: null,
    createdAt: now(),
    updatedAt: now(),
  };

  receipts.set(receipt.id, receipt);

  // Register movement for the sale
  const movementType = input.type === "credit_note" ? "refund_card" : "sale_cash";
  movements.set(id("mov"), {
    id: id("mov"),
    tenantId,
    cashRegisterId: input.cashRegisterId ?? null,
    type: movementType,
    paymentMethod: input.paymentMethod,
    amount: total,
    description: `${input.type === "receipt" ? "Recibo" : input.type === "invoice" ? "Nota Fiscal" : "Nota de Crédito"} ${receiptNumber} — ${receipt.customerName ?? "Cliente"}`,
    referenceId: receipt.id,
    referenceType: "sale",
    customerId: input.customerId ?? null,
    customerName: input.customerName ?? null,
    userId,
    userName,
    createdAt: now(),
  });

  mirror(
    `INSERT INTO "Receipt" (id, "tenantId", "cashRegisterId", "movementId", number, type, status, "customerId", "customerName", "customerDocument", subtotal, discount, total, "paymentMethod", "paymentDetails", "fiscalData", "issuedAt", "cancelledAt", "cancelledBy", "createdAt", "updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
     ON CONFLICT (id) DO NOTHING;`,
    [receipt.id, tenantId, receipt.cashRegisterId, receipt.movementId, receipt.number, receipt.type, receipt.status, receipt.customerId, receipt.customerName, receipt.customerDocument, receipt.subtotal, receipt.discount, receipt.total, receipt.paymentMethod, JSON.stringify(receipt.paymentDetails), JSON.stringify(receipt.fiscalData), receipt.issuedAt, receipt.cancelledAt, receipt.cancelledBy, receipt.createdAt, receipt.updatedAt],
  );

  return receipt;
}

export async function cancelReceipt(tenantId: string, receiptId: string, userId: string, userName: string): Promise<Receipt | null> {
  const rec = receipts.get(receiptId);
  if (!rec || rec.tenantId !== tenantId) return null;
  if (rec.status === "cancelled") return rec;

  rec.status = "cancelled";
  rec.cancelledAt = now();
  rec.cancelledBy = userId;
  rec.updatedAt = now();

  receipts.set(receiptId, rec);

  mirror(
    `UPDATE "Receipt" SET status=$1, "cancelledAt"=$2, "cancelledBy"=$3, "updatedAt"=$4 WHERE id=$5;`,
    [rec.status, rec.cancelledAt, rec.cancelledBy, rec.updatedAt, rec.id],
  );

  return rec;
}

export async function listReceipts(tenantId: string, limit = 100): Promise<Receipt[]> {
  return [...receipts.values()]
    .filter((r) => r.tenantId === tenantId)
    .sort((a, b) => (b.issuedAt < a.issuedAt ? -1 : 1))
    .slice(0, limit);
}

// =========================================================================
// BOLETO — EMISSÃO E BOLETOS EM ABERTO
// =========================================================================

export async function issueBoleto(
  tenantId: string,
  input: IssueBoletoInput,
): Promise<BoletoIssuance> {
  const boleto: BoletoIssuance = {
    id: id("bol"),
    tenantId,
    cashRegisterId: input.cashRegisterId ?? null,
    customerId: input.customerId,
    customerName: input.customerName,
    customerDocument: input.customerDocument,
    customerEmail: input.customerEmail ?? null,
    customerPhone: input.customerPhone ?? null,
    amount: money(input.amount),
    dueDate: input.dueDate,
    description: input.description,
    ourNumber: `${tenantId.slice(-6).toUpperCase()}-${String(Math.floor(Math.random() * 999999)).padStart(6, "0")}`,
    barcode: generateBarcode(input.amount, input.dueDate),
    qrCode: null,
    status: "issued",
    gateway: input.gateway ?? "manual",
    gatewayId: null,
    paymentLink: null,
    paidAt: null,
    paidAmount: null,
    paymentMethod: null,
    issuedAt: now(),
    createdAt: now(),
    updatedAt: now(),
  };

  boletos.set(boleto.id, boleto);

  mirror(
    `INSERT INTO "BoletoIssuance" (id, "tenantId", "cashRegisterId", "customerId", "customerName", "customerDocument", "customerEmail", "customerPhone", amount, "dueDate", description, "ourNumber", barcode, "qrCode", status, gateway, "gatewayId", "paymentLink", "paidAt", "paidAmount", "paymentMethod", "issuedAt", "createdAt", "updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
     ON CONFLICT (id) DO NOTHING;`,
    [boleto.id, tenantId, boleto.cashRegisterId, boleto.customerId, boleto.customerName, boleto.customerDocument, boleto.customerEmail, boleto.customerPhone, boleto.amount, boleto.dueDate, boleto.description, boleto.ourNumber, boleto.barcode, boleto.qrCode, boleto.status, boleto.gateway, boleto.gatewayId, boleto.paymentLink, boleto.paidAt, boleto.paidAmount, boleto.paymentMethod, boleto.issuedAt, boleto.createdAt, boleto.updatedAt],
  );

  return boleto;
}

export async function getOpenBoletos(tenantId: string): Promise<OpenBoletoData[]> {
  const today = new Date().toISOString().slice(0, 10);
  return [...boletos.values()]
    .filter((b) => b.tenantId === tenantId && (b.status === "issued" || b.status === "overdue"))
    .map((b): OpenBoletoData => {
      const daysOverdue = Math.max(0, Math.floor((new Date(today).getTime() - new Date(b.dueDate).getTime()) / 86400000));
      return {
        id: b.id,
        tenantId: b.tenantId,
        customerId: b.customerId,
        customerName: b.customerName,
        customerDocument: b.customerDocument,
        amount: b.amount,
        dueDate: b.dueDate,
        daysOverdue,
        status: b.status === "overdue" ? "overdue" : "open",
        ourNumber: b.ourNumber,
        barcode: b.barcode,
        paymentLink: b.paymentLink,
      };
    })
    .sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1));
}

export async function getBoletoById(boletoId: string, tenantId: string): Promise<BoletoIssuance | null> {
  const b = boletos.get(boletoId);
  if (!b || b.tenantId !== tenantId) return null;
  return b;
}

export async function markBoletoPaid(
  boletoId: string,
  tenantId: string,
  paymentMethod: PaymentMethodCaixa,
  paidAmount: number,
): Promise<BoletoIssuance | null> {
  const b = boletos.get(boletoId);
  if (!b || b.tenantId !== tenantId) return null;
  b.status = "paid";
  b.paidAt = now();
  b.paidAmount = money(paidAmount);
  b.paymentMethod = paymentMethod;
  b.updatedAt = now();
  boletos.set(boletoId, b);
  mirror(
    `UPDATE "BoletoIssuance" SET status=$1, "paidAt"=$2, "paidAmount"=$3, "paymentMethod"=$4, "updatedAt"=$5 WHERE id=$6;`,
    [b.status, b.paidAt, b.paidAmount, b.paymentMethod, b.updatedAt, b.id],
  );
  return b;
}

// =========================================================================
// RESUMO DO CAIXA (SUMMARY)
// =========================================================================

export async function getCaixaSummary(tenantId: string): Promise<CaixaSummary> {
  const openRegister = [...registers.values()].find(
    (r) => r.tenantId === tenantId && r.status === "open",
  );

  const todayMovements = openRegister
    ? [...movements.values()]
        .filter((m) => m.cashRegisterId === openRegister.id)
        .sort((a, b) => (b.createdAt < a.createdAt ? -1 : 1))
    : [];

  const rawTotals = openRegister
    ? await computeMovementTotals(openRegister.id)
    : {
        opening: 0, salesCash: 0, salesCard: 0, salesPix: 0, salesBoleto: 0, salesVale: 0,
        refunds: 0, withdrawals: 0, deposits: 0,
      };

  const totals = {
    ...rawTotals,
    // Vales/vouchers ficam FORA do esperado em dinheiro: são documentos na
    // gaveta, não circulação — entram em `salesVale` para o bater-caixa.
    expected: money(rawTotals.opening + rawTotals.salesCash + rawTotals.salesCard + rawTotals.salesPix + rawTotals.salesBoleto - rawTotals.refunds - rawTotals.withdrawals + rawTotals.deposits),
    actual: openRegister && openRegister.status === "closed" ? openRegister.actualAmount ?? 0 : 0,
    difference: 0,
  };

  const openBoletos = await getOpenBoletos(tenantId);

  const pendingFiscal = [...receipts.values()].filter(
    (r) => r.tenantId === tenantId && r.fiscalData?.status === "pending",
  ).length;

  return {
    cashRegister: openRegister ?? null,
    todayMovements,
    totals,
    openBoletos,
    pendingFiscal,
  };
}

async function computeMovementTotals(registerId: string): Promise<{
  opening: number; salesCash: number; salesCard: number; salesPix: number; salesBoleto: number;
  salesVale: number;
  refunds: number; withdrawals: number; deposits: number;
}> {
  const regs = [...movements.values()].filter((m) => m.cashRegisterId === registerId);
  return {
    opening: regs.filter((m) => m.type === "opening").reduce((s, m) => s + m.amount, 0),
    salesCash: regs.filter((m) => m.type === "sale_cash").reduce((s, m) => s + m.amount, 0),
    salesCard: regs.filter((m) => m.type === "sale_card").reduce((s, m) => s + m.amount, 0),
    salesPix: regs.filter((m) => m.type === "sale_pix").reduce((s, m) => s + m.amount, 0),
    salesBoleto: regs.filter((m) => m.type === "sale_boleto").reduce((s, m) => s + m.amount, 0),
    salesVale: regs.filter((m) => m.type === "sale_vale").reduce((s, m) => s + m.amount, 0),
    refunds: regs.filter((m) => ["refund_cash", "refund_card"].includes(m.type)).reduce((s, m) => s + m.amount, 0),
    withdrawals: regs.filter((m) => m.type === "withdrawal").reduce((s, m) => s + m.amount, 0),
    deposits: regs.filter((m) => m.type === "deposit").reduce((s, m) => s + m.amount, 0),
  };
}

// =========================================================================
// Utilitários
// =========================================================================

function generateBarcode(amount: number, dueDate: string): string {
  // Gera um código de barras simulado (em produção integrar com o gateway)
  const data = `${amount.toFixed(2)}|${dueDate}|${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
  return `BLO-${data.replace(/[^0-9]/g, "").slice(0, 20)}`;
}

// =========================================================================
// Export types
// =========================================================================

export type { CashRegister, CashMovement, Receipt, BoletoIssuance, OpenBoletoData, CaixaSummary };