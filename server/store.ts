// =========================================================================
// STORE DE COBRANÇA — GATO SaaS (memória autoritativa + espelho no Postgres)
// =========================================================================
// Segue a mesma filosofia do rbacEngine: os Maps em memória são a fonte de
// verdade imediata para o app funcionar mesmo sem banco (dev/demo). Quando o
// Postgres está configurado, as mutações são espelhadas de forma best-effort
// (nunca derrubam a requisição) e as tabelas são hidratadas na primeira leitura.
// Em produção, as migrations em db/migrations criam o schema definitivo.
// =========================================================================

import crypto from "node:crypto";
import { getDbPool, isDatabaseConfigured } from "./db";
import {
  EmailLogRecord,
  EmailStatus,
  GatewayCustomer,
  Invoice,
  PaymentGateway,
  PaymentMethod,
  SubscriptionStatus,
  TenantSubscription,
  TenantUsage,
  WebhookEventRecord,
} from "../src/types/billing";

const id = (prefix: string) => `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
const now = () => new Date().toISOString();

// -------------------------------------------------------------------------
// Estado em memória (fonte de verdade imediata)
// -------------------------------------------------------------------------
const invoices = new Map<string, Invoice>();
const subscriptions = new Map<string, TenantSubscription>();
const gatewayCustomers = new Map<string, GatewayCustomer>();
const webhookEvents = new Map<string, WebhookEventRecord>();
const emailLogs = new Map<string, EmailLogRecord>();
const usage = new Map<string, TenantUsage>();

// Hidratação: true após a primeira tentativa (evita repetir query a cada call).
let hydrated = false;

type Row = Record<string, unknown>;

/** Converte uma linha do Postgres (snake/camel) para um Invoice tipado. */
function rowToInvoice(r: Row): Invoice {
  return {
    id: String(r.id),
    tenantId: String(r.tenantId),
    subscriptionId: (r.subscriptionId as string) ?? null,
    amount: Number(r.amount) || 0,
    currency: String(r.currency || "BRL"),
    dueDate: String(r.dueDate).slice(0, 10),
    status: (r.status as Invoice["status"]) || "open",
    paidAt: (r.paidAt as string) ?? null,
    paymentMethod: (r.paymentMethod as PaymentMethod) ?? null,
    paymentLink: (r.paymentLink as string) ?? null,
    gatewayInvoiceId: (r.gatewayInvoiceId as string) ?? null,
    createdAt: String(r.createdAt ?? now()),
    updatedAt: String(r.updatedAt ?? now()),
  };
}

/** Executa uma query de espelho (write-through) sem lançar em caso de falha. */
function mirror(sql: string, params: unknown[] = []): void {
  if (!isDatabaseConfigured()) return;
  getDbPool()
    .query(sql, params)
    .catch((err) =>
      console.warn("[GATO Store] Espelho Postgres indisponível:", err?.message || err),
    );
}

/** Hidrata os Maps a partir do Postgres (best-effort, uma única vez). */
async function hydrate(): Promise<void> {
  if (hydrated || !isDatabaseConfigured()) return;
  hydrated = true;
  try {
    const db = getDbPool();
    const [inv, sub, evt] = await Promise.all([
      db.query('SELECT * FROM "Invoice" ORDER BY "createdAt" DESC LIMIT 5000;'),
      db.query('SELECT * FROM "TenantSubscription";'),
      db.query('SELECT * FROM "WebhookEvent" ORDER BY "receivedAt" DESC LIMIT 5000;'),
    ]);
    for (const r of inv.rows) if (!invoices.has(String(r.id))) invoices.set(String(r.id), rowToInvoice(r));
    for (const r of sub.rows as any[]) {
      const s = r as any;
      if (!subscriptions.has(String(s.id))) {
        subscriptions.set(String(s.id), {
          id: String(s.id),
          tenantId: String(s.tenantId),
          planId: String(s.planId),
          planName: String(s.planName),
          status: (s.status as SubscriptionStatus) || "trial",
          trialEndsAt: s.trialEndsAt ?? null,
          currentPeriodEndsAt: s.currentPeriodEndsAt ?? null,
          gateway: (s.gateway as PaymentGateway) ?? null,
          gatewayCustomerId: s.gatewayCustomerId ?? null,
          gatewaySubscriptionId: s.gatewaySubscriptionId ?? null,
          cancelAtPeriodEnd: Boolean(s.cancelAtPeriodEnd),
          createdAt: String(s.createdAt ?? now()),
          updatedAt: String(s.updatedAt ?? now()),
        });
      }
    }
    for (const r of evt.rows as any[]) {
      const e = r as any;
      if (!webhookEvents.has(String(e.id))) {
        webhookEvents.set(String(e.id), {
          id: String(e.id),
          gateway: String(e.gateway),
          eventType: String(e.eventType),
          eventId: String(e.eventId),
          payload: e.payload ?? null,
          processed: Boolean(e.processed),
          receivedAt: String(e.receivedAt ?? now()),
        });
      }
    }
  } catch (err: any) {
    console.warn("[GATO Store] Hidratação do Postgres falhou (seguindo em memória):", err?.message || err);
  }
}

// -------------------------------------------------------------------------
// INVOICES
// -------------------------------------------------------------------------
export interface CreateInvoiceInput {
  tenantId: string;
  subscriptionId?: string | null;
  amount: number;
  dueDate: string; // 'YYYY-MM-DD'
  currency?: string;
  paymentMethod?: PaymentMethod;
  paymentLink?: string | null;
  gatewayInvoiceId?: string | null;
}

export async function listInvoices(tenantId?: string): Promise<Invoice[]> {
  await hydrate();
  const all = [...invoices.values()].sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1));
  return tenantId ? all.filter((i) => i.tenantId === tenantId) : all;
}

export async function createInvoice(input: CreateInvoiceInput): Promise<Invoice> {
  await hydrate();
  const invoice: Invoice = {
    id: id("inv"),
    tenantId: input.tenantId,
    subscriptionId: input.subscriptionId ?? null,
    amount: input.amount,
    currency: input.currency || "BRL",
    dueDate: input.dueDate,
    status: "open",
    paidAt: null,
    paymentMethod: input.paymentMethod ?? null,
    paymentLink: input.paymentLink ?? null,
    gatewayInvoiceId: input.gatewayInvoiceId ?? null,
    createdAt: now(),
    updatedAt: now(),
  };
  invoices.set(invoice.id, invoice);
  mirror(
    `INSERT INTO "Invoice" (id, "tenantId", "subscriptionId", amount, currency, "dueDate", status, "paidAt", "paymentMethod", "paymentLink", "gatewayInvoiceId", "createdAt", "updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$12)
     ON CONFLICT (id) DO NOTHING;`,
    [invoice.id, invoice.tenantId, invoice.subscriptionId, invoice.amount, invoice.currency, invoice.dueDate, invoice.status, invoice.paidAt, invoice.paymentMethod, invoice.paymentLink, invoice.gatewayInvoiceId, invoice.createdAt],
  );
  return invoice;
}

export async function markInvoicePaid(
  invoiceId: string,
  opts: { paidAt?: string; paymentMethod?: PaymentMethod; gatewayInvoiceId?: string } = {},
): Promise<Invoice | null> {
  await hydrate();
  const inv = invoices.get(invoiceId);
  if (!inv) return null;
  inv.status = "paid";
  inv.paidAt = opts.paidAt || now();
  inv.paymentMethod = opts.paymentMethod ?? inv.paymentMethod;
  inv.gatewayInvoiceId = opts.gatewayInvoiceId ?? inv.gatewayInvoiceId;
  inv.updatedAt = now();
  mirror('UPDATE "Invoice" SET status=$1, "paidAt"=$2, "paymentMethod"=$3, "gatewayInvoiceId"=$4, "updatedAt"=$5 WHERE id=$6;',
    [inv.status, inv.paidAt, inv.paymentMethod, inv.gatewayInvoiceId, inv.updatedAt, inv.id]);
  return inv;
}

export async function getInvoice(invoiceId: string): Promise<Invoice | null> {
  await hydrate();
  return invoices.get(invoiceId) ?? null;
}

export async function setInvoiceStatus(invoiceId: string, status: Invoice["status"]): Promise<Invoice | null> {
  await hydrate();
  const inv = invoices.get(invoiceId);
  if (!inv) return null;
  inv.status = status;
  inv.updatedAt = now();
  mirror('UPDATE "Invoice" SET status=$1, "updatedAt"=$2 WHERE id=$3;', [status, inv.updatedAt, inv.id]);
  return inv;
}

// -------------------------------------------------------------------------
// SUBSCRIPTIONS
// -------------------------------------------------------------------------
export async function getSubscriptionByTenant(tenantId: string): Promise<TenantSubscription | null> {
  await hydrate();
  return [...subscriptions.values()].find((s) => s.tenantId === tenantId) ?? null;
}

export async function upsertSubscription(input: Omit<TenantSubscription, "id" | "createdAt" | "updatedAt"> & { id?: string; createdAt?: string; updatedAt?: string }): Promise<TenantSubscription> {
  await hydrate();
  const existing = [...subscriptions.values()].find((s) => s.tenantId === input.tenantId) ?? null;
  const sub: TenantSubscription = {
    ...input,
    id: input.id ?? existing?.id ?? id("sub"),
    createdAt: existing?.createdAt ?? input.createdAt ?? now(),
    updatedAt: input.updatedAt ?? now(),
  };
  subscriptions.set(sub.id, sub);
  mirror(
    `INSERT INTO "TenantSubscription" (id, "tenantId", "planId", "planName", status, "trialEndsAt", "currentPeriodEndsAt", gateway, "gatewayCustomerId", "gatewaySubscriptionId", "cancelAtPeriodEnd", "createdAt", "updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     ON CONFLICT (id) DO UPDATE SET status=EXCLUDED.status, "planId"=EXCLUDED."planId", "gatewayCustomerId"=EXCLUDED."gatewayCustomerId", "gatewaySubscriptionId"=EXCLUDED."gatewaySubscriptionId", "updatedAt"=EXCLUDED."updatedAt";`,
    [sub.id, sub.tenantId, sub.planId, sub.planName, sub.status, sub.trialEndsAt, sub.currentPeriodEndsAt, sub.gateway, sub.gatewayCustomerId, sub.gatewaySubscriptionId, sub.cancelAtPeriodEnd, sub.createdAt, sub.updatedAt],
  );
  return sub;
}

export async function listSubscriptions(): Promise<TenantSubscription[]> {
  await hydrate();
  return [...subscriptions.values()];
}

// -------------------------------------------------------------------------
// GATEWAY CUSTOMERS
// -------------------------------------------------------------------------
export async function getGatewayCustomer(tenantId: string): Promise<GatewayCustomer | null> {
  await hydrate();
  return [...gatewayCustomers.values()].find((g) => g.tenantId === tenantId) ?? null;
}

export async function upsertGatewayCustomer(
  tenantId: string,
  gateway: Exclude<PaymentGateway, null>,
  gatewayCustomerId: string,
): Promise<GatewayCustomer> {
  await hydrate();
  const existing = [...gatewayCustomers.values()].find((g) => g.tenantId === tenantId && g.gateway === gateway) ?? null;
  const customer: GatewayCustomer = {
    id: existing?.id ?? id("gc"),
    tenantId,
    gateway,
    gatewayCustomerId,
    createdAt: existing?.createdAt ?? now(),
    updatedAt: now(),
  };
  gatewayCustomers.set(customer.id, customer);
  mirror(
    `INSERT INTO "GatewayCustomer" (id, "tenantId", gateway, "gatewayCustomerId", "createdAt", "updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT ("tenantId", gateway) DO UPDATE SET "gatewayCustomerId"=EXCLUDED."gatewayCustomerId", "updatedAt"=EXCLUDED."updatedAt";`,
    [customer.id, tenantId, gateway, gatewayCustomerId, customer.createdAt, customer.updatedAt],
  );
  return customer;
}

// -------------------------------------------------------------------------
// WEBHOOK EVENTS (idempotência)
// -------------------------------------------------------------------------
export async function hasProcessedWebhookEvent(gateway: string, eventId: string): Promise<boolean> {
  await hydrate();
  return [...webhookEvents.values()].some((e) => e.gateway === gateway && e.eventId === eventId && e.processed);
}

export async function recordWebhookEvent(
  gateway: string,
  eventType: string,
  eventId: string,
  payload: unknown,
): Promise<{ record: WebhookEventRecord; alreadyProcessed: boolean }> {
  await hydrate();
  const existing = [...webhookEvents.values()].find((e) => e.gateway === gateway && e.eventId === eventId);
  if (existing) return { record: existing, alreadyProcessed: true };

  const record: WebhookEventRecord = {
    id: id("wh"),
    gateway,
    eventType,
    eventId,
    payload,
    processed: true,
    receivedAt: now(),
  };
  webhookEvents.set(record.id, record);
  mirror(
    `INSERT INTO "WebhookEvent" (id, gateway, "eventType", "eventId", payload, processed, "receivedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (gateway, "eventId") DO NOTHING;`,
    [record.id, gateway, eventType, eventId, JSON.stringify(payload ?? null), true, record.receivedAt],
  );
  return { record, alreadyProcessed: false };
}

// -------------------------------------------------------------------------
// EMAIL LOG (deduplicação + auditoria)
// -------------------------------------------------------------------------
export async function hasEmailBeenSent(dedupeKey: string): Promise<boolean> {
  await hydrate();
  return [...emailLogs.values()].some((e) => e.dedupeKey === dedupeKey && e.status === "sent");
}

export async function recordEmail(input: {
  tenantId: string | null;
  to: string;
  templateCode: string;
  subject: string;
  status: EmailStatus;
  provider: string;
  dedupeKey: string;
}): Promise<EmailLogRecord> {
  await hydrate();
  const record: EmailLogRecord = {
    id: id("mail"),
    tenantId: input.tenantId,
    to: input.to,
    templateCode: input.templateCode,
    subject: input.subject,
    status: input.status,
    provider: input.provider,
    dedupeKey: input.dedupeKey,
    createdAt: now(),
    sentAt: input.status === "sent" ? now() : null,
  };
  emailLogs.set(record.id, record);
  mirror(
    `INSERT INTO "EmailLog" (id, "tenantId", "to", "templateCode", subject, status, provider, "dedupeKey", "createdAt", "sentAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT ("dedupeKey") DO NOTHING;`,
    [record.id, record.tenantId, record.to, record.templateCode, record.subject, record.status, record.provider, record.dedupeKey, record.createdAt, record.sentAt],
  );
  return record;
}

// -------------------------------------------------------------------------
// USAGE (cotas)
// -------------------------------------------------------------------------
function periodOf(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export async function getUsage(tenantId: string): Promise<TenantUsage> {
  await hydrate();
  const key = `${tenantId}:${periodOf()}`;
  const cached = usage.get(key);
  if (cached) return cached;

  const fresh: TenantUsage = {
    tenantId,
    period: periodOf(),
    customers: 0,
    items: 0,
    users: 0,
    employees: 0,
    storageMb: 0,
    apiRequestsToday: 0,
    updatedAt: now(),
  };
  usage.set(key, fresh);
  return fresh;
}

export async function setUsage(tenantId: string, patch: Partial<Omit<TenantUsage, "tenantId" | "period" | "updatedAt">>): Promise<TenantUsage> {
  const current = await getUsage(tenantId);
  const updated: TenantUsage = { ...current, ...patch, updatedAt: now() };
  const key = `${tenantId}:${periodOf()}`;
  usage.set(key, updated);
  mirror(
    `INSERT INTO "TenantUsage" (id, "tenantId", period, customers, items, users, employees, "storageMb", "apiRequestsToday", "updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     ON CONFLICT ("tenantId", period) DO UPDATE SET customers=EXCLUDED.customers, items=EXCLUDED.items, users=EXCLUDED.users, employees=EXCLUDED.employees, "storageMb"=EXCLUDED."storageMb", "apiRequestsToday"=EXCLUDED."apiRequestsToday", "updatedAt"=EXCLUDED."updatedAt";`,
    [`u_${tenantId}_${updated.period}`, tenantId, updated.period, updated.customers, updated.items, updated.users, updated.employees, updated.storageMb, updated.apiRequestsToday, updated.updatedAt],
  );
  return updated;
}

// -------------------------------------------------------------------------
// SEED (dados de demonstração, análogo ao rbacEngine)
// -------------------------------------------------------------------------
export function seedBillingStore(): void {
  const starterTenant = "cmtvk1ieq0000ju8c3kg5n85l"; // Pantanal Diesel (Starter)
  if (!subscriptions.has(`sub_seed_${starterTenant}`)) {
    subscriptions.set(`sub_seed_${starterTenant}`, {
      id: `sub_seed_${starterTenant}`,
      tenantId: starterTenant,
      planId: "plan_starter",
      planName: "GATO Starter (Essencial)",
      status: "active",
      trialEndsAt: null,
      currentPeriodEndsAt: new Date(Date.now() + 3 * 86400000).toISOString(),
      gateway: "asaas",
      gatewayCustomerId: "cus_000000000000001",
      gatewaySubscriptionId: "sub_000000000000001",
      cancelAtPeriodEnd: false,
      createdAt: now(),
      updatedAt: now(),
    });
  }
  if (invoices.size === 0) {
    const due = (daysFromNow: number) => {
      const d = new Date(Date.now() + daysFromNow * 86400000);
      return d.toISOString().slice(0, 10);
    };
    const sample: CreateInvoiceInput[] = [
      { tenantId: starterTenant, amount: 189.9, dueDate: due(3) },
      { tenantId: "cmtt58e6o0000ju346a0g6s32", amount: 389.9, dueDate: due(1) },
    ];
    for (const s of sample) {
      const inv: Invoice = {
        id: id("inv"),
        tenantId: s.tenantId,
        subscriptionId: null,
        amount: s.amount,
        currency: "BRL",
        dueDate: s.dueDate,
        status: "open",
        paidAt: null,
        paymentMethod: "pix",
        paymentLink: "https://sandbox.asaas.com/c/000000000000001",
        gatewayInvoiceId: null,
        createdAt: now(),
        updatedAt: now(),
      };
      invoices.set(inv.id, inv);
    }
  }
}
