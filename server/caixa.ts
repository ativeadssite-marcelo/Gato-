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
import type { AuditLogRecord, RbacRoleCode } from "../src/types/rbac";
import {
  CashRegister,
  CashMovement,
  CashMovementType,
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

// -------------------------------------------------------------------------
// Auditoria — a trilha é obrigatória em toda operação sensível do PDV
// -------------------------------------------------------------------------
// O ator chega pronto da rota (server/caixaRoutes.ts): a trilha precisa de
// papel, IP e user-agent, que só existem no `req`. O caixa não conhece Express
// de propósito — quem monta o contexto é a borda HTTP.
export interface CaixaActor {
  userId: string;
  userName: string;
  roleCode: RbacRoleCode;
  ipAddress: string;
  userAgent?: string;
}

/** Registra a operação na trilha (memória + espelho no Postgres). */
function audit(
  action: string,
  actor: CaixaActor,
  tenantId: string,
  entityId: string,
  options: {
    status?: AuditLogRecord["status"];
    details?: string;
    anomalous?: boolean;
    beforeState?: Record<string, any>;
    afterState?: Record<string, any>;
  } = {},
): void {
  const afterState = options.afterState
    ? { ...options.afterState, ...(options.details ? { details: options.details } : {}) }
    : options.details
      ? { details: options.details }
      : undefined;

  appendAuditLog({
    id: `aud_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
    tenantId: tenantId || "system",
    userId: actor.userId,
    userName: actor.userName,
    userRole: actor.roleCode,
    ipAddress: actor.ipAddress || "",
    userAgent: actor.userAgent,
    action,
    // Todo o PDV vive sob o recurso `company_data` (é o que as rotas escopam).
    resource: "company_data",
    entityId,
    timestamp: new Date().toISOString(),
    status: options.status ?? "success",
    anomalous: options.anomalous,
    beforeState: options.beforeState,
    afterState,
  });
}

// -------------------------------------------------------------------------
// Hidratação do Postgres
// -------------------------------------------------------------------------
// Sem isto o espelho era uma via de mão única: o caixa gravava no banco e
// nunca lia de volta. Na prática o turno aberto "desaparecia" no restart (o
// operador não conseguia fechar o caixa) e os registros ficavam órfãos no
// banco. Mesmo padrão dos outros stores: hidrata uma vez, mescla por id
// (nunca substitui) e falha em silêncio — o espelho é best-effort.
let hydrated = false;

const iso = (v: unknown): string =>
  v instanceof Date ? v.toISOString() : String(v ?? "");
const isoOrNull = (v: unknown): string | null =>
  v === null || v === undefined ? null : iso(v);
const num = (v: unknown): number => (v === null || v === undefined ? 0 : Number(v));
const numOrNull = (v: unknown): number | null =>
  v === null || v === undefined ? null : Number(v);
const str = (v: unknown): string => (v === null || v === undefined ? "" : String(v));
const strOrNull = (v: unknown): string | null =>
  v === null || v === undefined ? null : String(v);

function rowToRegister(r: Record<string, unknown>): CashRegister {
  return {
    id: str(r.id),
    tenantId: str(r.tenantId),
    userId: str(r.userId),
    userName: str(r.userName),
    status: r.status as CashRegister["status"],
    openingAmount: num(r.openingAmount),
    expectedAmount: num(r.expectedAmount),
    actualAmount: num(r.actualAmount),
    difference: num(r.difference),
    openedAt: iso(r.openedAt),
    closedAt: isoOrNull(r.closedAt),
    closedByUserId: strOrNull(r.closedByUserId),
    closedByUserName: strOrNull(r.closedByUserName),
    notes: strOrNull(r.notes),
    createdAt: iso(r.createdAt),
    updatedAt: iso(r.updatedAt),
  };
}

function rowToMovement(r: Record<string, unknown>): CashMovement {
  return {
    id: str(r.id),
    tenantId: str(r.tenantId),
    cashRegisterId: str(r.cashRegisterId),
    type: r.type as CashMovement["type"],
    paymentMethod: r.paymentMethod as CashMovement["paymentMethod"],
    amount: num(r.amount),
    description: str(r.description),
    referenceId: strOrNull(r.referenceId),
    referenceType: (r.referenceType as CashMovement["referenceType"]) ?? null,
    customerId: strOrNull(r.customerId),
    customerName: strOrNull(r.customerName),
    userId: str(r.userId),
    userName: str(r.userName),
    createdAt: iso(r.createdAt),
  };
}

function rowToReceipt(r: Record<string, unknown>): Receipt {
  return {
    id: str(r.id),
    tenantId: str(r.tenantId),
    cashRegisterId: strOrNull(r.cashRegisterId),
    movementId: strOrNull(r.movementId),
    number: str(r.number),
    type: r.type as Receipt["type"],
    status: r.status as Receipt["status"],
    customerId: strOrNull(r.customerId),
    customerName: strOrNull(r.customerName),
    customerDocument: strOrNull(r.customerDocument),
    items: Array.isArray(r.items) ? (r.items as ReceiptItem[]) : [],
    subtotal: num(r.subtotal),
    discount: num(r.discount),
    total: num(r.total),
    paymentMethod: r.paymentMethod as PaymentMethodCaixa,
    paymentDetails: (r.paymentDetails as PaymentDetails) ?? null,
    fiscalData: (r.fiscalData as FiscalData) ?? null,
    issuedAt: iso(r.issuedAt),
    cancelledAt: isoOrNull(r.cancelledAt),
    cancelledBy: strOrNull(r.cancelledBy),
    createdAt: iso(r.createdAt),
    updatedAt: iso(r.updatedAt),
  };
}

function rowToBoleto(r: Record<string, unknown>): BoletoIssuance {
  return {
    id: str(r.id),
    tenantId: str(r.tenantId),
    cashRegisterId: strOrNull(r.cashRegisterId),
    customerId: str(r.customerId),
    customerName: str(r.customerName),
    customerDocument: str(r.customerDocument),
    customerEmail: strOrNull(r.customerEmail),
    customerPhone: strOrNull(r.customerPhone),
    amount: num(r.amount),
    dueDate: str(r.dueDate).slice(0, 10),
    description: str(r.description),
    ourNumber: str(r.ourNumber),
    barcode: str(r.barcode),
    qrCode: strOrNull(r.qrCode),
    status: r.status as BoletoIssuance["status"],
    gateway: r.gateway as BoletoIssuance["gateway"],
    gatewayId: strOrNull(r.gatewayId),
    paymentLink: strOrNull(r.paymentLink),
    paidAt: isoOrNull(r.paidAt),
    paidAmount: numOrNull(r.paidAmount),
    paymentMethod: (r.paymentMethod as PaymentMethodCaixa) ?? null,
    issuedAt: iso(r.issuedAt),
    createdAt: iso(r.createdAt),
    updatedAt: iso(r.updatedAt),
  };
}

async function hydrate(): Promise<void> {
  if (hydrated || !isDatabaseConfigured()) return;
  hydrated = true;

  try {
    const db = getDbPool();
    const [regs, movs, recs, bols] = await Promise.all([
      db.query('SELECT * FROM "CashRegister" ORDER BY "openedAt" DESC LIMIT 2000;'),
      db.query('SELECT * FROM "CashMovement" ORDER BY "createdAt" DESC LIMIT 20000;'),
      db.query('SELECT * FROM "Receipt" ORDER BY "issuedAt" DESC LIMIT 5000;'),
      // `dueDate` é DATE: formatado no banco para não sofrer deslocamento de
      // fuso (um Date do driver viraria o dia anterior em UTC-3).
      db.query(
        `SELECT id, "tenantId", "cashRegisterId", "customerId", "customerName",
                "customerDocument", "customerEmail", "customerPhone", amount,
                to_char("dueDate", 'YYYY-MM-DD') AS "dueDate", description,
                "ourNumber", barcode, "qrCode", status, gateway, "gatewayId",
                "paymentLink", "paidAt", "paidAmount", "paymentMethod",
                "issuedAt", "createdAt", "updatedAt"
         FROM "BoletoIssuance" ORDER BY "issuedAt" DESC LIMIT 5000;`,
      ),
    ]);

    for (const r of regs.rows) {
      const v = rowToRegister(r);
      if (!registers.has(v.id)) registers.set(v.id, v);
    }
    for (const r of movs.rows) {
      const v = rowToMovement(r);
      if (!movements.has(v.id)) movements.set(v.id, v);
    }
    for (const r of recs.rows) {
      const v = rowToReceipt(r);
      if (!receipts.has(v.id)) receipts.set(v.id, v);
    }
    for (const r of bols.rows) {
      const v = rowToBoleto(r);
      if (!boletos.has(v.id)) boletos.set(v.id, v);
    }
  } catch (err: any) {
    console.warn(
      "[GATO Caixa] Hidratação do Postgres falhou (seguindo em memória):",
      err?.message || err,
    );
  }
}

// =========================================================================
// CAIXA — ABERTURA / FECHAMENTO
// =========================================================================

export async function openCashRegister(
  tenantId: string,
  input: OpenCaixaInput,
  actor: CaixaActor,
): Promise<CashRegister> {
  // A hidratação vem ANTES da checagem: sem ela, um caixa aberto que vivia só
  // no banco passaria despercebido e o tenant abriria um segundo turno.
  await hydrate();

  // Evita abrir 2º caixa aberto para o mesmo tenant
  const existing = [...registers.values()].find(
    (r) => r.tenantId === tenantId && r.status === "open",
  );
  if (existing) {
    audit("OPEN_CASH_REGISTER_BLOCKED", actor, tenantId, existing.id, {
      status: "blocked",
      anomalous: true,
      details: "Tentativa de abrir um segundo caixa com um turno já aberto.",
    });
    throw new Error("Já existe um caixa aberto para este tenant.");
  }

  const register: CashRegister = {
    id: id("caixa"),
    tenantId,
    userId: actor.userId,
    userName: actor.userName,
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

  // Movimento de abertura. A chave do Map é o id do PRÓPRIO movimento (antes
  // era o id do caixa): com a hidratação lendo por id, uma chave divergente
  // duplicaria o movimento em memória.
  const openingMovement: CashMovement = {
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
    userId: actor.userId,
    userName: actor.userName,
    createdAt: now(),
  };
  movements.set(openingMovement.id, openingMovement);

  audit("OPEN_CASH_REGISTER", actor, tenantId, register.id, {
    details: `Caixa aberto com fundo de R$ ${register.openingAmount.toFixed(2)}.`,
    afterState: {
      status: register.status,
      openingAmount: register.openingAmount,
      notes: register.notes,
    },
  });

  // Mirror no banco
  mirror(
    `INSERT INTO "CashRegister" (id, "tenantId", "userId", "userName", status, "openingAmount", "expectedAmount", "actualAmount", difference, "openedAt", "closedAt", "closedByUserId", "closedByUserName", notes, "createdAt", "updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
     ON CONFLICT (id) DO NOTHING;`,
    [register.id, tenantId, actor.userId, actor.userName, register.status, register.openingAmount, register.expectedAmount, register.actualAmount, register.difference, register.openedAt, register.closedAt, register.closedByUserId, register.closedByUserName, register.notes, register.createdAt, register.updatedAt],
  );

  // O movimento de abertura também precisa de espelho: ele não existia no
  // banco, e é dele que o resumo e o relatório impresso tiram o "fundo de
  // caixa" — depois de um restart o esperado aparecia sem o fundo.
  mirror(
    `INSERT INTO "CashMovement" (id, "tenantId", "cashRegisterId", type, "paymentMethod", amount, description, "referenceId", "referenceType", "customerId", "customerName", "userId", "userName", "createdAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     ON CONFLICT (id) DO NOTHING;`,
    [openingMovement.id, tenantId, openingMovement.cashRegisterId, openingMovement.type, openingMovement.paymentMethod, openingMovement.amount, openingMovement.description, openingMovement.referenceId, openingMovement.referenceType, openingMovement.customerId, openingMovement.customerName, openingMovement.userId, openingMovement.userName, openingMovement.createdAt],
  );

  return register;
}

export async function closeCashRegister(
  tenantId: string,
  input: CloseCaixaInput,
  actor: CaixaActor,
): Promise<CashRegister> {
  await hydrate();

  const register = [...registers.values()].find(
    (r) => r.tenantId === tenantId && r.status === "open",
  );
  if (!register) {
    throw new Error("Nenhum caixa aberto encontrado para este tenant.");
  }

  const before = {
    status: register.status,
    expectedAmount: register.expectedAmount,
    openingAmount: register.openingAmount,
  };

  // Calcula expected a partir dos movimentos
  const totals = await computeMovementTotals(register.id);
  const totalSales = totals.salesCash + totals.salesCard + totals.salesPix + totals.salesBoleto;
  register.expectedAmount = money(register.openingAmount + totalSales - totals.refunds - totals.withdrawals + totals.deposits);
  register.actualAmount = money(input.actualAmount);
  register.difference = money(register.actualAmount - register.expectedAmount);
  register.status = "closed";
  register.closedAt = now();
  register.closedByUserId = actor.userId;
  register.closedByUserName = actor.userName;
  register.notes = input.notes ?? null;
  register.updatedAt = now();

  registers.set(register.id, register);

  // Fechamento com diferença é o evento que o dono do caixa precisa enxergar:
  // entra como warning e anômalo (sobra/falta nunca é ruído numa auditoria).
  const hasDifference = register.difference !== 0;
  audit("CLOSE_CASH_REGISTER", actor, tenantId, register.id, {
    status: hasDifference ? "warning" : "success",
    anomalous: hasDifference,
    details: hasDifference
      ? `Fechamento com ${register.difference > 0 ? "sobra" : "falta"} de R$ ${Math.abs(register.difference).toFixed(2)}.`
      : "Fechamento conferido, sem diferença.",
    beforeState: before,
    afterState: {
      status: register.status,
      expectedAmount: register.expectedAmount,
      actualAmount: register.actualAmount,
      difference: register.difference,
      notes: register.notes,
    },
  });

  // Movimento de fechamento
  const closingMovement: CashMovement = {
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
    userId: actor.userId,
    userName: actor.userName,
    createdAt: now(),
  };
  movements.set(closingMovement.id, closingMovement);

  mirror(
    `UPDATE "CashRegister" SET status=$1, "expectedAmount"=$2, "actualAmount"=$3, difference=$4, "closedAt"=$5, "closedByUserId"=$6, "closedByUserName"=$7, notes=$8, "updatedAt"=$9 WHERE id=$10;`,
    [register.status, register.expectedAmount, register.actualAmount, register.difference, register.closedAt, register.closedByUserId, register.closedByUserName, register.notes, register.updatedAt, register.id],
  );

  // Mesmo caso do movimento de abertura: o fechamento não era espelhado, então
  // o extrato do turno ficava sem a linha final depois de um restart.
  mirror(
    `INSERT INTO "CashMovement" (id, "tenantId", "cashRegisterId", type, "paymentMethod", amount, description, "referenceId", "referenceType", "customerId", "customerName", "userId", "userName", "createdAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     ON CONFLICT (id) DO NOTHING;`,
    [closingMovement.id, tenantId, closingMovement.cashRegisterId, closingMovement.type, closingMovement.paymentMethod, closingMovement.amount, closingMovement.description, closingMovement.referenceId, closingMovement.referenceType, closingMovement.customerId, closingMovement.customerName, closingMovement.userId, closingMovement.userName, closingMovement.createdAt],
  );

  return register;
}

// =========================================================================
// MOVIMENTAÇÕES
// =========================================================================

/**
 * Nome da ação na trilha por natureza do movimento. Vendas são ruidosas e
 * ficam agrupadas; o que tira dinheiro da gaveta sem venda correspondente
 * (sangria, devolução, ajuste manual) ganha ação própria para ser consultável.
 */
const MOVEMENT_AUDIT_ACTION: Record<CashMovement["type"], string> = {
  opening: "CASH_OPENING_MOVEMENT",
  sale_cash: "CASH_SALE",
  sale_card: "CASH_SALE",
  sale_pix: "CASH_SALE",
  sale_boleto: "CASH_SALE",
  sale_vale: "CASH_SALE",
  refund_cash: "CASH_REFUND",
  refund_card: "CASH_REFUND",
  withdrawal: "CASH_WITHDRAWAL",
  deposit: "CASH_DEPOSIT",
  closing: "CASH_CLOSING_MOVEMENT",
  adjustment: "CASH_ADJUSTMENT",
};

export async function recordMovement(
  tenantId: string,
  registerId: string,
  input: RecordMovementInput,
  actor: CaixaActor,
): Promise<CashMovement> {
  await hydrate();

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
    userId: actor.userId,
    userName: actor.userName,
    createdAt: now(),
  };

  movements.set(movement.id, movement);

  // Ajuste manual é o vetor clássico de fraude no PDV (corrige o esperado sem
  // venda): sai marcado como anômalo. Sangria e devolução saem como warning —
  // são legítimas, mas movem dinheiro sem venda.
  const isAdjustment = movement.type === "adjustment";
  const isMoneyOut = movement.type === "withdrawal" || movement.type.startsWith("refund_");
  audit(MOVEMENT_AUDIT_ACTION[movement.type] ?? "CASH_MOVEMENT", actor, tenantId, movement.id, {
    status: isAdjustment || isMoneyOut ? "warning" : "success",
    anomalous: isAdjustment,
    details: `${movement.description} (${movement.type}, R$ ${movement.amount.toFixed(2)}).`,
    afterState: {
      cashRegisterId: registerId,
      type: movement.type,
      paymentMethod: movement.paymentMethod,
      amount: movement.amount,
    },
  });

  mirror(
    `INSERT INTO "CashMovement" (id, "tenantId", "cashRegisterId", type, "paymentMethod", amount, description, "referenceId", "referenceType", "customerId", "customerName", "userId", "userName", "createdAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     ON CONFLICT (id) DO NOTHING;`,
    [movement.id, tenantId, registerId, movement.type, movement.paymentMethod, movement.amount, movement.description, movement.referenceId, movement.referenceType, movement.customerId, movement.customerName, movement.userId, movement.userName, movement.createdAt],
  );

  return movement;
}

export async function getCashRegister(registerId: string, tenantId: string): Promise<CashRegister | null> {
  await hydrate();
  const reg = registers.get(registerId);
  if (!reg || reg.tenantId !== tenantId) return null;
  return reg;
}

export async function listCashRegisters(tenantId: string, limit = 50): Promise<CashRegister[]> {
  await hydrate();
  return [...registers.values()]
    .filter((r) => r.tenantId === tenantId)
    .sort((a, b) => (b.openedAt < a.openedAt ? -1 : 1))
    .slice(0, limit);
}

export async function listCashMovements(registerId: string, tenantId: string, limit = 200): Promise<CashMovement[]> {
  await hydrate();
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
  actor: CaixaActor,
): Promise<Receipt> {
  await hydrate();

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
    items: input.items.map((it) => ({
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

  // Movimento correspondente à venda — só existe DENTRO de um turno. O tipo
  // IssueReceiptInput permite emitir recibo sem caixa aberto (venda faturada,
  // emissão avulsa); nesse caso não há gaveta para movimentar, então não se
  // cria movimento órfão (que nunca apareceria em listCashMovements de turno
  // nenhum e ainda violaria o NOT NULL de "CashMovement"."cashRegisterId").
  let movementId: string | null = null;

  if (input.cashRegisterId) {
    // Um único id por movimento: antes havia duas chamadas a id("mov") (chave
    // do Map e campo `id` saíam diferentes), o que quebrava o vínculo entre
    // memória, espelho e o próprio recibo.
    const movementType: CashMovementType = input.type === "credit_note"
      ? input.paymentMethod === "dinheiro" ? "refund_cash" : "refund_card"
      : input.paymentMethod === "cartao_credito" || input.paymentMethod === "cartao_debito" ? "sale_card"
      : input.paymentMethod === "pix" ? "sale_pix"
      : input.paymentMethod === "boleto" ? "sale_boleto"
      : input.paymentMethod === "vale_alimentacao" || input.paymentMethod === "vale_refeicao" || input.paymentMethod === "voucher" ? "sale_vale"
      : "sale_cash";
    const movement: CashMovement = {
      id: id("mov"),
      tenantId,
      cashRegisterId: input.cashRegisterId,
      type: movementType,
      paymentMethod: input.paymentMethod,
      amount: total,
      description: `${input.type === "receipt" ? "Recibo" : input.type === "invoice" ? "Nota Fiscal" : "Nota de Crédito"} ${receiptNumber} — ${receipt.customerName ?? "Cliente"}`,
      referenceId: receipt.id,
      referenceType: "sale",
      customerId: input.customerId ?? null,
      customerName: input.customerName ?? null,
      userId: actor.userId,
      userName: actor.userName,
      createdAt: now(),
    };
    movements.set(movement.id, movement);
    movementId = movement.id;

    mirror(
      `INSERT INTO "CashMovement" (id, "tenantId", "cashRegisterId", type, "paymentMethod", amount, description, "referenceId", "referenceType", "customerId", "customerName", "userId", "userName", "createdAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       ON CONFLICT (id) DO NOTHING;`,
      [movement.id, tenantId, movement.cashRegisterId, movement.type, movement.paymentMethod, movement.amount, movement.description, movement.referenceId, movement.referenceType, movement.customerId, movement.customerName, movement.userId, movement.userName, movement.createdAt],
    );
  }

  // Vínculo recibo → movimento (o campo existia no tipo e nunca era preenchido).
  receipt.movementId = movementId;
  receipts.set(receipt.id, receipt);

  audit(input.type === "invoice" ? "ISSUE_FISCAL_DOCUMENT" : "ISSUE_RECEIPT", actor, tenantId, receipt.id, {
    details: `${receipt.type === "receipt" ? "Recibo" : receipt.type === "invoice" ? "Nota fiscal" : "Nota de crédito"} ${receiptNumber} emitido no valor de R$ ${receipt.total.toFixed(2)}.`,
    afterState: {
      number: receipt.number,
      type: receipt.type,
      status: receipt.status,
      total: receipt.total,
      discount: receipt.discount,
      paymentMethod: receipt.paymentMethod,
      cashRegisterId: receipt.cashRegisterId,
      movementId,
      itemCount: receipt.items.length,
    },
  });

  mirror(
    `INSERT INTO "Receipt" (id, "tenantId", "cashRegisterId", "movementId", number, type, status, "customerId", "customerName", "customerDocument", items, subtotal, discount, total, "paymentMethod", "paymentDetails", "fiscalData", "issuedAt", "cancelledAt", "cancelledBy", "createdAt", "updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
     ON CONFLICT (id) DO NOTHING;`,
    [receipt.id, tenantId, receipt.cashRegisterId, receipt.movementId, receipt.number, receipt.type, receipt.status, receipt.customerId, receipt.customerName, receipt.customerDocument, JSON.stringify(receipt.items), receipt.subtotal, receipt.discount, receipt.total, receipt.paymentMethod, JSON.stringify(receipt.paymentDetails), JSON.stringify(receipt.fiscalData), receipt.issuedAt, receipt.cancelledAt, receipt.cancelledBy, receipt.createdAt, receipt.updatedAt],
  );

  return receipt;
}

export async function cancelReceipt(tenantId: string, receiptId: string, actor: CaixaActor): Promise<Receipt | null> {
  await hydrate();

  const rec = receipts.get(receiptId);
  if (!rec || rec.tenantId !== tenantId) return null;
  if (rec.status === "cancelled") return rec;

  rec.status = "cancelled";
  rec.cancelledAt = now();
  rec.cancelledBy = actor.userId;
  rec.updatedAt = now();

  receipts.set(receiptId, rec);

  // Cancelamento de documento fiscal: sempre warning na trilha, com o valor
  // que deixou de valer — é o tipo de evento que o fiscal confere depois.
  audit("CANCEL_RECEIPT", actor, tenantId, rec.id, {
    status: "warning",
    details: `Documento ${rec.number} cancelado (valor de R$ ${rec.total.toFixed(2)}, ${rec.type}).`,
    beforeState: { status: "issued", total: rec.total },
    afterState: { status: rec.status, cancelledAt: rec.cancelledAt, cancelledBy: rec.cancelledBy },
  });

  mirror(
    `UPDATE "Receipt" SET status=$1, "cancelledAt"=$2, "cancelledBy"=$3, "updatedAt"=$4 WHERE id=$5;`,
    [rec.status, rec.cancelledAt, rec.cancelledBy, rec.updatedAt, rec.id],
  );

  return rec;
}

export async function listReceipts(tenantId: string, limit = 100): Promise<Receipt[]> {
  await hydrate();
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
  actor: CaixaActor,
): Promise<BoletoIssuance> {
  await hydrate();

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

  audit("ISSUE_BOLETO", actor, tenantId, boleto.id, {
    details: `Boleto ${boleto.ourNumber} emitido para ${boleto.customerName || "cliente"} — R$ ${boleto.amount.toFixed(2)}, vence ${boleto.dueDate}.`,
    afterState: {
      ourNumber: boleto.ourNumber,
      amount: boleto.amount,
      dueDate: boleto.dueDate,
      status: boleto.status,
      gateway: boleto.gateway,
      customerId: boleto.customerId,
    },
  });

  mirror(
    `INSERT INTO "BoletoIssuance" (id, "tenantId", "cashRegisterId", "customerId", "customerName", "customerDocument", "customerEmail", "customerPhone", amount, "dueDate", description, "ourNumber", barcode, "qrCode", status, gateway, "gatewayId", "paymentLink", "paidAt", "paidAmount", "paymentMethod", "issuedAt", "createdAt", "updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
     ON CONFLICT (id) DO NOTHING;`,
    [boleto.id, tenantId, boleto.cashRegisterId, boleto.customerId, boleto.customerName, boleto.customerDocument, boleto.customerEmail, boleto.customerPhone, boleto.amount, boleto.dueDate, boleto.description, boleto.ourNumber, boleto.barcode, boleto.qrCode, boleto.status, boleto.gateway, boleto.gatewayId, boleto.paymentLink, boleto.paidAt, boleto.paidAmount, boleto.paymentMethod, boleto.issuedAt, boleto.createdAt, boleto.updatedAt],
  );

  return boleto;
}

export async function getOpenBoletos(tenantId: string): Promise<OpenBoletoData[]> {
  await hydrate();
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
  await hydrate();
  const b = boletos.get(boletoId);
  if (!b || b.tenantId !== tenantId) return null;
  return b;
}

export async function markBoletoPaid(
  boletoId: string,
  tenantId: string,
  paymentMethod: PaymentMethodCaixa,
  paidAmount: number,
  actor: CaixaActor,
): Promise<BoletoIssuance | null> {
  await hydrate();

  const b = boletos.get(boletoId);
  if (!b || b.tenantId !== tenantId) return null;

  const before = { status: b.status, paidAmount: b.paidAmount };

  b.status = "paid";
  b.paidAt = now();
  b.paidAmount = money(paidAmount);
  b.paymentMethod = paymentMethod;
  b.updatedAt = now();
  boletos.set(boletoId, b);

  // Valor pago diferente do emitido (parcial/troco) é desvio que o financeiro
  // precisa ver: fica marcado como anômalo.
  const divergent = Math.abs(b.paidAmount - b.amount) > 0.01;
  audit("MARK_BOLETO_PAID", actor, tenantId, b.id, {
    status: divergent ? "warning" : "success",
    anomalous: divergent,
    details: divergent
      ? `Boleto ${b.ourNumber} baixado com valor divergente: emitido R$ ${b.amount.toFixed(2)}, pago R$ ${b.paidAmount.toFixed(2)}.`
      : `Boleto ${b.ourNumber} baixado como pago (R$ ${b.paidAmount.toFixed(2)}).`,
    beforeState: before,
    afterState: { status: b.status, paidAt: b.paidAt, paidAmount: b.paidAmount, paymentMethod: b.paymentMethod },
  });

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
  await hydrate();

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