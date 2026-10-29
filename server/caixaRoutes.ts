// =========================================================================
// ROTAS DE CAIXA — GATO SaaS (PDV)
// =========================================================================
// - Abertura/fechamento de caixa
// - Registro de recebimentos (vendas, devoluções)
// - Emissão de boleto
// - Emissão de recibo/nota fiscal
// - Dados fiscais de boletos em aberto
// =========================================================================

import { Router, Request, Response } from "express";
import {
  getClientIp,
  requireAuth,
  requireTenantPermission,
  resolveDataScope,
  sendScopeDenied,
} from "./auth";
import {
  CaixaActor,
  openCashRegister,
  closeCashRegister,
  recordMovement,
  listCashRegisters,
  listCashMovements,
  issueReceipt,
  listReceipts,
  issueBoleto,
  getOpenBoletos,
  getBoletoById,
  markBoletoPaid,
  getCaixaSummary,
} from "./caixa";

export const caixaRouter = Router();

/**
 * Contexto de auditoria a partir da requisição. Papel, IP e user-agent só
 * existem aqui (a camada de caixa não conhece Express de propósito), então a
 * borda HTTP monta o ator e o serviço só registra.
 */
function actorFrom(req: Request): CaixaActor {
  return {
    userId: req.auth!.user.id,
    userName: req.auth!.user.name,
    roleCode: req.auth!.user.roleCode,
    ipAddress: getClientIp(req),
    userAgent: String(req.headers["user-agent"] || "").slice(0, 200),
  };
}

// -------------------------------------------------------------------------
// RESUMO DO CAIXA (visão rápida da abertura atual)
// -------------------------------------------------------------------------
caixaRouter.get(
  "/summary",
  requireAuth,
  requireTenantPermission("sales"),
  async (req: Request, res: Response) => {
    const scope = resolveDataScope(req, "company_data");
    if (!scope.ok) return sendScopeDenied(res, scope);
    const summary = await getCaixaSummary(scope.tenantId!);
    res.json({ success: true, ...summary });
  },
);

// -------------------------------------------------------------------------
// ABRIR CAIXA
// -------------------------------------------------------------------------
interface OpenCaixaBody {
  openingAmount: number;
  notes?: string;
}

caixaRouter.post(
  "/open",
  requireAuth,
  requireTenantPermission("sales"),
  async (req: Request, res: Response) => {
    const scope = resolveDataScope(req, "company_data");
    if (!scope.ok) return sendScopeDenied(res, scope);
    if (!scope.tenantId) return res.status(400).json({ success: false, error: "Tenant não informado." });

    const { openingAmount, notes } = req.body as OpenCaixaBody;

    if (typeof openingAmount !== "number" || !Number.isFinite(openingAmount) || openingAmount < 0) {
      return res.status(400).json({
        success: false,
        error: "openingAmount deve ser um número positivo.",
      });
    }

    try {
      const register = await openCashRegister(
        scope.tenantId,
        { openingAmount, notes },
        actorFrom(req),
      );
      res.status(201).json({ success: true, register });
    } catch (err: any) {
      res.status(409).json({
        success: false,
        error: err.message || "Já existe caixa aberto para este tenant.",
      });
    }
  },
);

// -------------------------------------------------------------------------
// FECHAR CAIXA
// -------------------------------------------------------------------------
interface CloseCaixaBody {
  actualAmount: number;
  notes?: string;
}

caixaRouter.post(
  "/close",
  requireAuth,
  requireTenantPermission("sales"),
  async (req: Request, res: Response) => {
    const scope = resolveDataScope(req, "company_data");
    if (!scope.ok) return sendScopeDenied(res, scope);
    if (!scope.tenantId) return res.status(400).json({ success: false, error: "Tenant não informado." });

    const { actualAmount, notes } = req.body as CloseCaixaBody;

    if (typeof actualAmount !== "number" || !Number.isFinite(actualAmount) || actualAmount < 0) {
      return res.status(400).json({
        success: false,
        error: "actualAmount é obrigatório.",
      });
    }

    try {
      const register = await closeCashRegister(
        scope.tenantId,
        { actualAmount, notes },
        actorFrom(req),
      );
      res.json({ success: true, register });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message || "Falha ao fechar caixa." });
    }
  },
);

// -------------------------------------------------------------------------
// LISTAR CAIXAS
// -------------------------------------------------------------------------
caixaRouter.get(
  "/",
  requireAuth,
  requireTenantPermission("sales"),
  async (req: Request, res: Response) => {
    const scope = resolveDataScope(req, "company_data");
    if (!scope.ok) return sendScopeDenied(res, scope);
    const registers = await listCashRegisters(scope.tenantId!);
    res.json({ success: true, count: registers.length, registers });
  },
);

// -------------------------------------------------------------------------
// MOVIMENTAÇÕES DO CAIXA
// -------------------------------------------------------------------------
caixaRouter.get(
  "/:registerId/movements",
  requireAuth,
  requireTenantPermission("sales"),
  async (req: Request, res: Response) => {
    const scope = resolveDataScope(req, "company_data");
    if (!scope.ok) return sendScopeDenied(res, scope);

    const registerId = req.params.registerId;
    const movements = await listCashMovements(registerId, scope.tenantId!);
    res.json({ success: true, count: movements.length, movements });
  },
);

// -------------------------------------------------------------------------
// REGISTRAR MOVIMENTAÇÃO
// -------------------------------------------------------------------------
interface MovementBody {
  type: "sale_cash" | "sale_card" | "sale_pix" | "sale_boleto" | "sale_vale" | "refund_cash" | "refund_card" | "withdrawal" | "deposit" | "adjustment";
  paymentMethod: "dinheiro" | "cartao_credito" | "cartao_debito" | "pix" | "boleto" | "cheque" | "vale_alimentacao" | "vale_refeicao" | "voucher" | "outros";
  amount: number;
  description: string;
  referenceId?: string;
  referenceType?: "sale" | "budget" | "boleto" | "refund" | "withdrawal" | "deposit" | "adjustment";
  customerId?: string;
  customerName?: string;
}

caixaRouter.post(
  "/movements",
  requireAuth,
  requireTenantPermission("sales"),
  async (req: Request, res: Response) => {
    const scope = resolveDataScope(req, "company_data");
    if (!scope.ok) return sendScopeDenied(res, scope);
    if (!scope.tenantId) return res.status(400).json({ success: false, error: "Tenant não informado." });

    const body = req.body as MovementBody;
    if (!body.type || !body.paymentMethod || typeof body.amount !== "number" || !Number.isFinite(body.amount) || body.amount <= 0) {
      return res.status(400).json({
        success: false,
        error: "Campos obrigatórios: type, paymentMethod e amount (número positivo).",
      });
    }

    // Procura caixa aberto do tenant
    const caixaAberto = (await listCashRegisters(scope.tenantId)).find(r => r.status === "open");

    if (!caixaAberto) {
      return res.status(400).json({ success: false, error: "Nenhum caixa aberto encontrado." });
    }

    const movement = await recordMovement(
      scope.tenantId,
      caixaAberto.id,
      {
        type: body.type as any,
        paymentMethod: body.paymentMethod as any,
        amount: body.amount,
        description: body.description,
        referenceId: body.referenceId ?? null,
        referenceType: body.referenceType ?? null,
        customerId: body.customerId ?? null,
        customerName: body.customerName ?? null,
      },
      actorFrom(req),
    );

    res.status(201).json({ success: true, movement });
  },
);

// -------------------------------------------------------------------------
// RECIBOS / NOTA FISCAL
// -------------------------------------------------------------------------
interface ReceiptBody {
  cashRegisterId?: string;
  type: "receipt" | "invoice" | "credit_note";
  customerId?: string;
  customerName?: string;
  customerDocument?: string;
  items: Array<{
    productId?: string;
    sku?: string | null;
    name: string;
    quantity: number;
    unitPrice: number;
    discount?: number;
    total?: number;
    ncm?: string;
    cest?: string;
    cfop?: string;
    taxIcms?: number;
    taxIpi?: number;
    taxPis?: number;
    taxCofins?: number;
  }>;
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: "dinheiro" | "cartao_credito" | "cartao_debito" | "pix" | "boleto" | "cheque" | "vale_alimentacao" | "vale_refeicao" | "voucher" | "outros";
  paymentDetails?: any;
  fiscalData?: {
    model?: "55" | "65";
    series?: string;
    number?: string;
    accessKey?: string;
    protocol?: string;
    xmlPath?: string;
    pdfPath?: string;
    qrCodeUrl?: string;
    issuedAt?: string;
    authorizedAt?: string;
    environment?: "production" | "homologation";
  };
}

caixaRouter.post(
  "/receipts",
  requireAuth,
  requireTenantPermission("sales"),
  async (req: Request, res: Response) => {
    const scope = resolveDataScope(req, "company_data");
    if (!scope.ok) return sendScopeDenied(res, scope);
    if (!scope.tenantId) return res.status(400).json({ success: false, error: "Tenant não informado." });

    const body = req.body as ReceiptBody;
    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Itens do recibo são obrigatórios.",
      });
    }

    // Normaliza os itens para o modelo completo de ReceiptItem (o cliente pode
    // enviar só os campos essenciais): `total` calculado quando ausente — evita
    // NaN no resumo — e nulos/percentuais com defaults seguros.
    const receipt = await issueReceipt(
      scope.tenantId,
      {
        ...body,
        items: body.items.map((it) => ({
          ...it,
          productId: it.productId ?? null,
          sku: it.sku ?? null,
          discount: it.discount ?? 0,
          total: it.total ?? Number((it.quantity * it.unitPrice - (it.discount ?? 0)).toFixed(2)),
          ncm: it.ncm ?? null,
          cest: it.cest ?? null,
          cfop: it.cfop ?? null,
          taxIcms: it.taxIcms ?? 0,
          taxIpi: it.taxIpi ?? 0,
          taxPis: it.taxPis ?? 0,
          taxCofins: it.taxCofins ?? 0,
        })),
      },
      actorFrom(req),
    );

    res.status(201).json({ success: true, receipt });
  },
);

caixaRouter.get(
  "/receipts",
  requireAuth,
  requireTenantPermission("sales"),
  async (req: Request, res: Response) => {
    const scope = resolveDataScope(req, "company_data");
    if (!scope.ok) return sendScopeDenied(res, scope);
    const receipts = await listReceipts(scope.tenantId!);
    res.json({ success: true, count: receipts.length, receipts });
  },
);

// -------------------------------------------------------------------------
// BOLETOS
// -------------------------------------------------------------------------
interface BoletoBody {
  cashRegisterId?: string;
  customerId: string;
  customerName: string;
  customerDocument: string;
  customerEmail?: string;
  customerPhone?: string;
  amount: number;
  dueDate: string;
  description: string;
  gateway?: "asaas" | "manual";
}

caixaRouter.post(
  "/boletos",
  requireAuth,
  requireTenantPermission("sales"),
  async (req: Request, res: Response) => {
    const scope = resolveDataScope(req, "company_data");
    if (!scope.ok) return sendScopeDenied(res, scope);
    if (!scope.tenantId) return res.status(400).json({ success: false, error: "Tenant não informado." });

    const body = req.body as BoletoBody;
    if (!body.customerId || typeof body.amount !== "number" || !Number.isFinite(body.amount) || body.amount <= 0 || !body.dueDate) {
      return res.status(400).json({
        success: false,
        error: "Campos obrigatórios: customerId, amount (positivo), dueDate.",
      });
    }

    const boleto = await issueBoleto(scope.tenantId, body, actorFrom(req));
    res.status(201).json({ success: true, boleto });
  },
);

caixaRouter.get(
  "/boletos/open",
  requireAuth,
  requireTenantPermission("sales"),
  async (req: Request, res: Response) => {
    const scope = resolveDataScope(req, "company_data");
    if (!scope.ok) return sendScopeDenied(res, scope);
    const openBoletos = await getOpenBoletos(scope.tenantId!);
    res.json({ success: true, count: openBoletos.length, boletos: openBoletos });
  },
);

caixaRouter.get(
  "/boletos/:id",
  requireAuth,
  requireTenantPermission("sales"),
  async (req: Request, res: Response) => {
    const scope = resolveDataScope(req, "company_data");
    if (!scope.ok) return sendScopeDenied(res, scope);

    const boleto = await getBoletoById(req.params.id, scope.tenantId!);
    if (!boleto) {
      return res.status(404).json({ success: false, error: "Boleto não encontrado." });
    }
    res.json({ success: true, boleto });
  },
);

caixaRouter.put(
  "/boletos/:id/paid",
  requireAuth,
  requireTenantPermission("sales"),
  async (req: Request, res: Response) => {
    const scope = resolveDataScope(req, "company_data");
    if (!scope.ok) return sendScopeDenied(res, scope);

    const { paymentMethod, paidAmount } = req.body as {
      paymentMethod: "dinheiro" | "cartao_credito" | "cartao_debito" | "pix" | "boleto" | "cheque" | "outros";
      paidAmount: number;
    };
    if (typeof paidAmount !== "number" || !Number.isFinite(paidAmount) || paidAmount <= 0) {
      return res.status(400).json({ success: false, error: "paidAmount deve ser um número positivo." });
    }

    const boleto = await markBoletoPaid(req.params.id, scope.tenantId!, paymentMethod, paidAmount, actorFrom(req));
    if (!boleto) {
      return res.status(404).json({ success: false, error: "Boleto não encontrado." });
    }
    res.json({ success: true, boleto });
  },
);

// -------------------------------------------------------------------------
// CAIXA ATUAL
// -------------------------------------------------------------------------
caixaRouter.get(
  "/open",
  requireAuth,
  requireTenantPermission("sales"),
  async (req: Request, res: Response) => {
    const scope = resolveDataScope(req, "company_data");
    if (!scope.ok) return sendScopeDenied(res, scope);

    const allRegisters = await listCashRegisters(scope.tenantId!);
    const openCaixa = allRegisters.find(r => r.status === "open");

    if (!openCaixa) {
      return res.json({ success: true, cashRegister: null, message: "Nenhum caixa aberto." });
    }

    const movements = await listCashMovements(openCaixa.id, scope.tenantId!);
    res.json({ success: true, cashRegister: openCaixa, movements });
  },
);