// =========================================================================
// SERVIÇO DE E-MAIL TRANSACIONAL — GATO SaaS
// =========================================================================
// Interface única com adaptadores por provedor:
// 1. SMTP / Gmail (nodemailer): requer SMTP_USER + SMTP_PASS (ou GMAIL_APP_PASSWORD).
// 2. SendGrid via API HTTP: requer SENDGRID_API_KEY.
// 3. Console (fallback dev/demo): registra o e-mail em log estruturado JSON.
//
// Todo envio passa por deduplicação via store (dedupeKey), configura Reply-To
// oficial e é registrado no EmailLog.
// =========================================================================

import nodemailer from "nodemailer";
import { hasEmailBeenSent, recordEmail } from "../store";

export const DEFAULT_OFFICIAL_EMAIL = "pulodogatoerp@gmail.com";

export function getOfficialEmailAddress(): string {
  return (
    process.env.EMAIL_FROM ||
    process.env.SMTP_USER ||
    process.env.SENDGRID_FROM ||
    DEFAULT_OFFICIAL_EMAIL
  ).trim();
}

export function getReplyToEmailAddress(): string {
  return (process.env.EMAIL_REPLY_TO || getOfficialEmailAddress()).trim();
}

export function getSupportReceiverEmail(): string {
  return (
    process.env.SUPPORT_RECEIVER_EMAIL ||
    process.env.EMAIL_REPLY_TO ||
    getOfficialEmailAddress()
  ).trim();
}

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
  templateCode: string;
  tenantId: string | null;
  dedupeKey: string;
}

export interface EmailProvider {
  name: string;
  send(message: EmailMessage): Promise<void>;
}

function getSmtpConfig() {
  const user = (process.env.SMTP_USER || DEFAULT_OFFICIAL_EMAIL).trim();
  const pass = (process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || "").trim();
  const host = (process.env.SMTP_HOST || "smtp.gmail.com").trim();
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = process.env.SMTP_SECURE !== undefined ? process.env.SMTP_SECURE !== "false" : port === 465;

  return { host, port, secure, user, pass };
}

/** Adaptador padrão: registra no log estruturado (dev/demo). */
const consoleProvider: EmailProvider = {
  name: "console",
  async send(message) {
    console.log(JSON.stringify({
      ts: new Date().toISOString(),
      level: "email",
      provider: "console",
      from: getOfficialEmailAddress(),
      replyTo: message.replyTo || getReplyToEmailAddress(),
      to: message.to,
      subject: message.subject,
      templateCode: message.templateCode,
      tenantId: message.tenantId,
      text: message.text.slice(0, 500),
    }));
  },
};

/** Adaptador SMTP / Gmail via nodemailer (requer SMTP_PASS ou GMAIL_APP_PASSWORD). */
const smtpProvider: EmailProvider = {
  name: "smtp",
  async send(message) {
    const cfg = getSmtpConfig();
    if (!cfg.pass) {
      throw new Error("Senha de App SMTP (SMTP_PASS / GMAIL_APP_PASSWORD) não configurada.");
    }
    const transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      auth: {
        user: cfg.user,
        pass: cfg.pass,
      },
    });

    const fromAddress = getOfficialEmailAddress();
    const replyToAddress = message.replyTo || getReplyToEmailAddress();

    await transporter.sendMail({
      from: `"GATO ERP" <${fromAddress}>`,
      to: message.to,
      replyTo: replyToAddress,
      subject: message.subject,
      text: message.text,
      ...(message.html ? { html: message.html } : {}),
    });
  },
};

/** Adaptador SendGrid via API HTTP (requer SENDGRID_API_KEY). */
const sendgridProvider: EmailProvider = {
  name: "sendgrid",
  async send(message) {
    const apiKey = process.env.SENDGRID_API_KEY;
    const from = getOfficialEmailAddress();
    const replyTo = message.replyTo || getReplyToEmailAddress();
    const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: message.to }] }],
        from: { email: from, name: "GATO ERP" },
        reply_to: { email: replyTo },
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
  const smtpCfg = getSmtpConfig();
  if (smtpCfg.pass) return smtpProvider;
  if (process.env.SENDGRID_API_KEY) return sendgridProvider;
  return consoleProvider;
}

export function getEmailConfigurationStatus() {
  const smtpCfg = getSmtpConfig();
  const provider = getEmailProvider();
  return {
    provider: provider.name,
    configured: provider.name !== "console",
    from: getOfficialEmailAddress(),
    replyTo: getReplyToEmailAddress(),
    supportReceiver: getSupportReceiverEmail(),
    smtp: {
      host: smtpCfg.host,
      port: smtpCfg.port,
      user: smtpCfg.user,
      hasPassword: Boolean(smtpCfg.pass),
    },
    sendgrid: {
      hasApiKey: Boolean(process.env.SENDGRID_API_KEY),
    },
  };
}

export async function verifyEmailTransport(): Promise<{ ok: boolean; provider: string; error?: string }> {
  const provider = getEmailProvider();
  if (provider.name === "smtp") {
    const cfg = getSmtpConfig();
    try {
      const transporter = nodemailer.createTransport({
        host: cfg.host,
        port: cfg.port,
        secure: cfg.secure,
        auth: { user: cfg.user, pass: cfg.pass },
      });
      await transporter.verify();
      return { ok: true, provider: "smtp" };
    } catch (err: any) {
      return { ok: false, provider: "smtp", error: err?.message || String(err) };
    }
  }
  return { ok: provider.name !== "console", provider: provider.name };
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
