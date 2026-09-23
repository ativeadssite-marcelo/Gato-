// =========================================================================
// MODELO DE DADOS DE COBRANÇA E ASSINATURA — GATO SaaS
// =========================================================================
// Domínio de billing separado do RBAC: assinatura, faturas, uso, clientes de
// gateway, eventos de webhook (idempotência) e log de e-mail transacional.
// =========================================================================

export type SubscriptionStatus =
  | 'trial'
  | 'active'
  | 'past_due'
  | 'suspended'
  | 'canceled'
  | 'expired';

export type PaymentGateway = 'asaas' | 'stripe' | 'mercadopago' | null;

export type InvoiceStatus = 'open' | 'paid' | 'overdue' | 'canceled';

export type PaymentMethod = 'boleto' | 'pix' | 'credit_card' | null;

export interface TenantSubscription {
  id: string;
  tenantId: string;
  planId: string;
  planName: string;
  status: SubscriptionStatus;
  /** Fim do período de teste (null quando nunca houve trial). */
  trialEndsAt: string | null;
  /** Fim do período corrente de cobrança (null enquanto em trial sem cobrança). */
  currentPeriodEndsAt: string | null;
  gateway: PaymentGateway;
  gatewayCustomerId: string | null;
  gatewaySubscriptionId: string | null;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  id: string;
  tenantId: string;
  subscriptionId: string | null;
  amount: number;
  currency: string;
  dueDate: string;
  status: InvoiceStatus;
  paidAt: string | null;
  paymentMethod: PaymentMethod;
  paymentLink: string | null;
  gatewayInvoiceId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GatewayCustomer {
  id: string;
  tenantId: string;
  gateway: Exclude<PaymentGateway, null>;
  gatewayCustomerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookEventRecord {
  id: string;
  gateway: string;
  eventType: string;
  /** Id de idempotência fornecido pelo gateway (evita processar evento duplicado). */
  eventId: string;
  payload: unknown;
  processed: boolean;
  receivedAt: string;
}

export type EmailStatus = 'queued' | 'sent' | 'failed';

export interface EmailLogRecord {
  id: string;
  tenantId: string | null;
  to: string;
  templateCode: string;
  subject: string;
  status: EmailStatus;
  provider: string;
  /** Chave de deduplicação (ex.: `fatura:${id}:d-3`) para não reenviar a mesma notificação. */
  dedupeKey: string;
  createdAt: string;
  sentAt: string | null;
}

export interface TenantUsage {
  tenantId: string;
  period: string; // 'YYYY-MM'
  customers: number;
  items: number;
  users: number;
  employees: number;
  storageMb: number;
  apiRequestsToday: number;
  updatedAt: string;
}

export type QuotaStatus = 'normal' | 'warning_90' | 'soft_blocked' | 'hard_blocked';

export interface QuotaCheckResult {
  allowed: boolean;
  status: QuotaStatus;
  resource: 'customers' | 'items' | 'users' | 'storage';
  current: number;
  limit: number;
  reason?: string;
}
