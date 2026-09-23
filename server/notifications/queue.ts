// =========================================================================
// FILA DE E-MAIL COM RETRY — GATO SaaS
// =========================================================================
// Fila em memória com retry e backoff exponencial. Em produção, substitua por
// uma fila durável (Redis/SQS) para sobreviver a reinícios; o contrato de
// enfileiramento (enqueueEmail) permanece o mesmo.
//
// A deduplicação (dedupeKey) garante que uma entrega com sucesso não reenvia;
// falhas ficam com status "failed" e são retentadas pelo worker.
// =========================================================================

import { sendTransactionalEmail, EmailMessage } from "./email";

interface QueuedJob {
  message: EmailMessage;
  attempts: number;
  nextRunAt: number;
}

const MAX_RETRIES = Math.max(1, parseInt(process.env.GATO_EMAIL_MAX_RETRIES || "3", 10) || 3);
const BASE_BACKOFF_MS = Math.max(1000, parseInt(process.env.GATO_EMAIL_BACKOFF_MS || "5000", 10) || 5000);
const TICK_MS = 1000;

const jobs: QueuedJob[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

function removeJob(job: QueuedJob): void {
  const idx = jobs.indexOf(job);
  if (idx >= 0) jobs.splice(idx, 1);
}

function schedule(): void {
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    void processQueue();
  }, TICK_MS);
}

function stopWorker(): void {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
}

async function processQueue(): Promise<void> {
  const now = Date.now();
  const ready = jobs.filter((j) => j.nextRunAt <= now).slice(0, 10);

  for (const job of ready) {
    const result = await sendTransactionalEmail(job.message).catch(() => ({
      sent: false,
      alreadySent: false,
      failed: true,
      provider: "queue",
    }));

    if (result.sent || result.alreadySent) {
      removeJob(job);
      continue;
    }

    job.attempts += 1;
    if (job.attempts >= MAX_RETRIES) {
      console.warn(`[GATO Email] Desistindo após ${job.attempts} tentativas: ${job.message.dedupeKey}`);
      removeJob(job);
      continue;
    }
    // Backoff exponencial: 1ª retry em BASE, depois 2x, 4x, ...
    job.nextRunAt = now + BASE_BACKOFF_MS * Math.pow(2, job.attempts - 1);
  }

  if (jobs.length > 0) schedule();
  else stopWorker();
}

/** Enfileira um e-mail para entrega assíncrona com retry. */
export function enqueueEmail(message: EmailMessage): void {
  jobs.push({ message, attempts: 0, nextRunAt: Date.now() });
  schedule();
}

/** Quantidade de itens aguardando entrega (para diagnóstico/healthcheck). */
export function queueDepth(): number {
  return jobs.length;
}
