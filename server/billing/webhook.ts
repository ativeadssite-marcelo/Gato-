// =========================================================================
// WEBHOOK DO GATEWAY — validação de assinatura + idempotência
// =========================================================================
// O Asaas autentica seus webhooks pelo header `asaas-access-token` (configurado
// no painel do gateway e comparado aqui em tempo constante). Cada evento é
// registrado por (gateway, eventId) para nunca processar duas vezes.
// =========================================================================

import crypto from "node:crypto";
import type { Request } from "express";
import { recordWebhookEvent } from "../store";
import { applyGatewayPaymentEvent } from "./subscriptions";

function safeEqual(a: string, b: string): boolean {
  const ha = crypto.createHash("sha256").update(a).digest();
  const hb = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

/** Confere o token do webhook do Asaas. Sem token configurado, o webhook fica fechado. */
export function verifyAsaasWebhook(req: Request): { ok: boolean; error?: string } {
  const configured = process.env.ASAAS_WEBHOOK_TOKEN;
  if (!configured || configured.length < 16) {
    return { ok: false, error: "Webhook fechado: defina ASAAS_WEBHOOK_TOKEN (mín. 16 caracteres)." };
  }
  const provided = String(req.headers["asaas-access-token"] || "").trim();
  if (!provided || !safeEqual(provided, configured)) {
    return { ok: false, error: "Assinatura de webhook inválida." };
  }
  return { ok: true };
}

export interface AsaasEventInput {
  event: string;
  eventId: string;
  tenantId: string;
  paid: boolean;
  paymentMethod?: "pix" | "boleto" | "credit_card" | null;
}

/**
 * Processa um evento de forma idempotente: se o eventId já foi processado,
 * retorna sem efeito. Caso contrário, aplica o novo status à assinatura.
 */
export async function handleAsaasEvent(input: AsaasEventInput): Promise<{
  alreadyProcessed: boolean;
  status: "processed" | "ignored";
  subscription: Awaited<ReturnType<typeof applyGatewayPaymentEvent>>;
}> {
  const gateway = "asaas";
  const eventId = input.eventId.trim();
  if (!eventId) {
    throw new Error("Evento Asaas sem identificador; processamento recusado para preservar idempotência.");
  }
  const recorded = await recordWebhookEvent(gateway, input.event, eventId, input);
  if (recorded.alreadyProcessed) {
    return {
      alreadyProcessed: true,
      status: "ignored",
      subscription: null,
    };
  }
  const subscription = await applyGatewayPaymentEvent({
    tenantId: input.tenantId,
    event: input.event,
    paid: input.paid,
    paymentMethod: input.paymentMethod ?? null,
  });
  return { alreadyProcessed: false, status: "processed", subscription };
}
