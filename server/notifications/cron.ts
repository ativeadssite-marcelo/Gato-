// =========================================================================
// CRON DIÁRIO DE VENCIMENTOS E TRIAL — GATO SaaS
// =========================================================================
// - Lembretes de fatura: 3 dias antes, 1 dia antes, no dia do vencimento.
// - Avisos de atraso: 1, 3 e 7 dias após o vencimento.
// - Expiração de trials sem pagamento (modo somente leitura).
// Deduplicação via dedupeKey garante que cada aviso só é enviado uma vez.
// =========================================================================

import { TENANTS_DATA } from "../rbacEngine";
import { listInvoices, listSubscriptions, setInvoiceStatus } from "../store";
import { expireTrials } from "../billing/subscriptions";
import { renderTemplate } from "./templates";
import { enqueueEmail } from "./queue";

const DAY_MS = 86400000;

function daysUntil(dateStr: string): number {
  const due = new Date(`${dateStr}T00:00:00Z`).getTime();
  const today = new Date();
  const todayStart = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Math.floor((due - todayStart) / DAY_MS);
}

function contactEmailFor(tenantId: string): string | null {
  return TENANTS_DATA.find((t) => t.id === tenantId)?.contactEmail || null;
}

function formatBrl(value: number): string {
  return value.toFixed(2).replace(".", ",");
}

function daysText(days: number): string {
  if (days === 0) return "hoje";
  if (days === 1) return "amanhã";
  return `${days} dias`;
}

export interface CronRunSummary {
  remindersSent: number;
  overdueNoticesSent: number;
  invoicesMarkedOverdue: number;
  trialsExpired: number;
}

/** Verifica faturas abertas e envia lembretes/avisos conforme o vencimento. */
export async function checkDueInvoices(): Promise<CronRunSummary> {
  const invoices = await listInvoices();
  const summary: CronRunSummary = {
    remindersSent: 0,
    overdueNoticesSent: 0,
    invoicesMarkedOverdue: 0,
    trialsExpired: 0,
  };

  for (const inv of invoices) {
    if (inv.status !== "open") continue;
    const email = contactEmailFor(inv.tenantId);
    if (!email) continue;

    const d = daysUntil(inv.dueDate);

    if (d === 3 || d === 1 || d === 0) {
      const rendered = renderTemplate("invoice_reminder", {
        tenantName: TENANTS_DATA.find((t) => t.id === inv.tenantId)?.name || "Cliente",
        planName: "GATO SaaS",
        amount: formatBrl(inv.amount),
        dueDate: inv.dueDate,
        daysText: daysText(d),
      });
      if (rendered) {
        enqueueEmail({
          to: email,
          subject: rendered.subject,
          text: rendered.text,
          templateCode: "invoice_reminder",
          tenantId: inv.tenantId,
          dedupeKey: `fatura:${inv.id}:d${d}`,
        });
        summary.remindersSent += 1;
      }
    }

    if (d < 0) {
      const late = Math.abs(d);
      if (late === 1 || late === 3 || late === 7) {
        const rendered = renderTemplate("invoice_overdue", {
          tenantName: TENANTS_DATA.find((t) => t.id === inv.tenantId)?.name || "Cliente",
          planName: "GATO SaaS",
          amount: formatBrl(inv.amount),
          dueDate: inv.dueDate,
          daysLate: String(late),
        });
        if (rendered) {
          enqueueEmail({
            to: email,
            subject: rendered.subject,
            text: rendered.text,
            templateCode: "invoice_overdue",
            tenantId: inv.tenantId,
            dedupeKey: `fatura:${inv.id}:late${late}`,
          });
          summary.overdueNoticesSent += 1;
        }
      }
      await setInvoiceStatus(inv.id, "overdue");
      summary.invoicesMarkedOverdue += 1;
    }
  }

  return summary;
}

/** Expira trials vencidos e envia lembretes de trial acabando. */
export async function checkTrials(): Promise<number> {
  const expired = await expireTrials();
  const subs = await listSubscriptions();
  for (const sub of subs) {
    if (sub.status !== "trial" || !sub.trialEndsAt) continue;
    const d = daysUntil(sub.trialEndsAt.slice(0, 10));
    const email = contactEmailFor(sub.tenantId);
    if (!email) continue;
    if (d === 3 || d === 1 || d === 0) {
      const rendered = renderTemplate("trial_ending", {
        tenantName: TENANTS_DATA.find((t) => t.id === sub.tenantId)?.name || "Cliente",
        planName: sub.planName,
        amount: "",
        dueDate: sub.trialEndsAt.slice(0, 10),
        daysLeft: String(d),
      });
      if (rendered) {
        enqueueEmail({
          to: email,
          subject: rendered.subject,
          text: rendered.text,
          templateCode: "trial_ending",
          tenantId: sub.tenantId,
          dedupeKey: `trial:${sub.tenantId}:d${d}`,
        });
      }
    }
  }
  return expired;
}

/** Executa todos os jobs do ciclo diário. */
export async function runDailyBillingJobs(): Promise<CronRunSummary> {
  const invoices = await checkDueInvoices();
  const trialsExpired = await checkTrials();
  invoices.trialsExpired = trialsExpired;
  console.log("[GATO Cron] Ciclo diário:", JSON.stringify(invoices));
  return invoices;
}

/** Inicia o agendador. Intervalo configurável (padrão 60 min); dedupe evita reenvio. */
export function startBillingCron(): void {
  const minutes = Math.max(5, parseInt(process.env.GATO_BILLING_CRON_MINUTES || "60", 10) || 60);
  const interval = setInterval(() => {
    runDailyBillingJobs().catch((err) =>
      console.error("[GATO Cron] Erro no ciclo:", err?.message || err),
    );
  }, minutes * 60 * 1000);
  interval.unref?.();

  // Primeira execução após o servidor subir (sem bloquear o boot).
  setTimeout(() => {
    runDailyBillingJobs().catch((err) =>
      console.error("[GATO Cron] Erro no ciclo inicial:", err?.message || err),
    );
  }, 15_000);

  console.log(`[GATO Cron] Agendador de cobrança iniciado (a cada ${minutes} min).`);
}
