// =========================================================================
// ROTAS DE BILLING — GATO SaaS
// =========================================================================
// - Webhook do gateway (sem sessão, autenticado por token + idempotente).
// - Autoatendimento do tenant: assinatura, faturas, conversão trial->pago.
// - Visão administrativa (escopo SaaS / financeiro): carteira de assinaturas.
// =========================================================================

import { Router, Request, Response } from "express";
import {
  requireAuth,
  requirePermission,
  requireSaasScope,
  resolveDataScope,
  sendScopeDenied,
} from "../auth";
import {
  cancelSubscription,
  convertTrialToPaid,
  tenantExists,
} from "./subscriptions";
import { handleAsaasEvent, verifyAsaasWebhook } from "./webhook";
import { getSubscriptionByTenant, listInvoices, listSubscriptions } from "../store";

export const billingRouter = Router();

// -------------------------------------------------------------------------
// WEBHOOK DO GATEWAY (idempotente + assinatura validada)
// -------------------------------------------------------------------------
billingRouter.post("/webhooks/asaas", async (req: Request, res: Response) => {
  const check = verifyAsaasWebhook(req);
  if (!check.ok) {
    return res.status(401).json({ success: false, error: check.error, code: "GATO_WEBHOOK_SIGNATURE" });
  }

  const body = req.body || {};
  const event = String(body.event || "").toUpperCase();
  const tenantId = String(body.tenantId || body.metadata?.tenantId || body.payment?.externalReference || "").trim();
  if (!tenantId || !tenantExists(tenantId)) {
    // Não divulgar se o tenant existe; apenas aceita e registra o evento.
    return res.json({ success: true, status: "ignored", reason: "tenant_invalid_or_missing" });
  }

  const paid = ["PAYMENT_RECEIVED", "PAYMENT_CONFIRMED"].includes(event);
  const result = await handleAsaasEvent({
    event,
    eventId: String(body.id || body.eventId || ""),
    tenantId,
    paid,
    paymentMethod: body.payment?.billingType === "CREDIT_CARD" ? "credit_card" : body.payment?.billingType === "BOLETO" ? "boleto" : "pix",
  });

  res.json({
    success: true,
    status: result.status,
    alreadyProcessed: result.alreadyProcessed,
    subscriptionStatus: result.subscription?.status ?? null,
    timestamp: new Date().toISOString(),
  });
});

// -------------------------------------------------------------------------
// AUTOSERVIÇO DO TENANT
// -------------------------------------------------------------------------

// Assinatura e plano atuais do tenant autenticado
billingRouter.get("/subscription", requireAuth, async (req: Request, res: Response) => {
  const scope = resolveDataScope(req, "billing_contracts");
  if (!scope.ok || !scope.tenantId) return sendScopeDenied(res, scope);
  const subscription = await getSubscriptionByTenant(scope.tenantId);
  res.json({ success: true, subscription });
});

// Faturas do tenant autenticado (isolamento estrito por tenant)
billingRouter.get("/invoices", requireAuth, requirePermission("billing_contracts"), async (req: Request, res: Response) => {
  const scope = resolveDataScope(req, "billing_contracts");
  if (!scope.ok) return sendScopeDenied(res, scope);
  const invoices = await listInvoices(scope.tenantId || req.auth!.tenantId);
  res.json({ success: true, count: invoices.length, invoices });
});

// Conversão trial -> pago (tenant_admin ou equipe SaaS financeira)
billingRouter.post("/subscribe", requireAuth, requirePermission("billing_contracts", { write: true }), async (req: Request, res: Response) => {
  const auth = req.auth!;
  const tenantId = auth.isSaasScope ? resolveDataScope(req, "billing_contracts").tenantId || auth.tenantId : auth.tenantId;
  if (!tenantId) {
    return res.status(400).json({ success: false, error: "Informe o tenant de destino (x-target-tenant-id)." });
  }
  if (!tenantExists(tenantId)) {
    return res.status(404).json({ success: false, error: "Tenant não encontrado." });
  }

  try {
    const result = await convertTrialToPaid({
      tenantId,
      tenantName: req.body?.tenantName || "Cliente GATO",
      contactEmail: req.body?.contactEmail || auth.user.email,
      cnpj: req.body?.cnpj,
      billingType: req.body?.billingType || "PIX",
      planId: req.body?.planId,
    });
    res.status(201).json({
      success: true,
      subscription: result.subscription,
      gateway: result.gateway,
      paymentLink: result.paymentLink,
      pendingExternalSetup: result.pendingExternalSetup,
      message: result.pendingExternalSetup
        ? "Assinatura ativada; gateway não configurado — financeiro gera a cobrança manualmente."
        : "Assinatura recorrente criada no gateway com sucesso.",
    });
  } catch (err: any) {
    console.error("[GATO Billing] Falha na conversão:", err?.message || err);
    res.status(502).json({ success: false, error: "Falha ao criar assinatura no gateway. Tente novamente." });
  }
});

// Cancelamento (tenant_admin ou SaaS)
billingRouter.post("/cancel", requireAuth, requirePermission("billing_contracts", { write: true }), async (req: Request, res: Response) => {
  const auth = req.auth!;
  const tenantId = auth.isSaasScope ? resolveDataScope(req, "billing_contracts").tenantId || auth.tenantId : auth.tenantId;
  if (!tenantId) return res.status(400).json({ success: false, error: "Tenant não informado." });
  const sub = await cancelSubscription(tenantId);
  res.json({ success: true, subscription: sub, message: "Assinatura cancelada." });
});

// -------------------------------------------------------------------------
// VISÃO ADMINISTRATIVA (escopo SaaS + permissão de billing)
// -------------------------------------------------------------------------
billingRouter.get("/admin/subscriptions", requireAuth, requireSaasScope, requirePermission("billing_contracts"), async (_req: Request, res: Response) => {
  const subscriptions = await listSubscriptions();
  res.json({ success: true, count: subscriptions.length, subscriptions });
});

billingRouter.get("/admin/invoices", requireAuth, requireSaasScope, requirePermission("billing_contracts"), async (_req: Request, res: Response) => {
  const invoices = await listInvoices();
  res.json({ success: true, count: invoices.length, invoices });
});
