// =========================================================================
// SERVIÇO DE E-MAIL TRANSACIONAL — GATO SaaS
// =========================================================================
// Interface única com adaptadores por provedor. Sem provedor configurado, o
// adaptador "console" registra o e-mail em log (JSON) — útil em dev/demo.
// Todo envio passa por deduplicação via store (dedupeKey) e é registrado no
// log de e-mail (auditoria + evita reenvio).
// =========================================================================

import { hasEmailBeenSent, recordEmail } from "../store";

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
  templateCode: string;
  tenantId: string | null;
  dedupeKey: string;
}

export interface EmailProvider {
  name: string;
  send(message: EmailMessage): Promise<void>;
}

/** Adaptador padrão: registra no log estruturado (dev/demo). */
const consoleProvider: EmailProvider = {
  name: "console",
  async send(message) {
    console.log(JSON.stringify({
      ts: new Date().toISOString(),
      level: "email",
      provider: "console",
      to: message.to,
      subject: message.subject,
      templateCode: message.templateCode,
      tenantId: message.tenantId,
      text: message.text.slice(0, 500),
    }));
  },
};

/** Adaptador SendGrid via API HTTP (requer SENDGRID_API_KEY + SENDGRID_FROM). */
const sendgridProvider: EmailProvider = {
  name: "sendgrid",
  async send(message) {
    const apiKey = process.env.SENDGRID_API_KEY;
    const from = process.env.SENDGRID_FROM || "noreply@gatosistemas.com.br";
    const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: message.to }] }],
        from: { email: from },
        subject: message.subject,
        content: [
          { type: "text/plain", value: message.text },
          ...(message.html ? [{ type: "text/html", value: message.html }] : []),
        ],
      }),
    });
    if (!res.ok) {
      throw new Error(`SendGrid ${res.status}: ${(await res.text()).slice(0, 200)}`);
    }
  },
};

export function getEmailProvider(): EmailProvider {
  if (process.env.SENDGRID_API_KEY) return sendgridProvider;
  return consoleProvider;
}

export interface SendEmailResult {
  sent: boolean;
  alreadySent: boolean;
  provider: string;
  failed?: boolean;
}

/**
 * Envia um e-mail com deduplicação: se a mesma dedupeKey já foi enviada, não
 * reenvia. Registra o resultado no EmailLog (sent/failed).
 */
export async function sendTransactionalEmail(message: EmailMessage): Promise<SendEmailResult> {
  if (await hasEmailBeenSent(message.dedupeKey)) {
    return { sent: false, alreadySent: true, provider: "dedupe" };
  }

  const provider = getEmailProvider();
  try {
    await provider.send(message);
    await recordEmail({
      tenantId: message.tenantId,
      to: message.to,
      templateCode: message.templateCode,
      subject: message.subject,
      status: "sent",
      provider: provider.name,
      dedupeKey: message.dedupeKey,
    });
    return { sent: true, alreadySent: false, provider: provider.name };
  } catch (err: any) {
    console.error("[GATO Email] Falha no envio:", err?.message || err);
    await recordEmail({
      tenantId: message.tenantId,
      to: message.to,
      templateCode: message.templateCode,
      subject: message.subject,
      status: "failed",
      provider: provider.name,
      dedupeKey: message.dedupeKey,
    });
    return { sent: false, alreadySent: false, provider: provider.name, failed: true };
  }
}
