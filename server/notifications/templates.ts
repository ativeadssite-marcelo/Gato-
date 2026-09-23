// =========================================================================
// TEMPLATES DE E-MAIL TRANSACIONAL — GATO SaaS
// =========================================================================
// Templates com variáveis `{{chave}}`. Mantidos em código (fonte de verdade)
// e prontos para serem substituídos por templates editáveis no Super Admin.
// =========================================================================

export interface TemplateVariables {
  tenantName: string;
  planName: string;
  amount: string;
  dueDate: string;
  [key: string]: string;
}

export interface EmailTemplate {
  code: string;
  subject: string;
  body: string; // texto simples; suporta {{variaveis}}
}

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    code: "trial_welcome",
    subject: "Bem-vindo ao GATO — seu teste grátis começou",
    body: [
      "Olá {{tenantName}},",
      "",
      "Sua conta GATO SaaS foi criada com sucesso no plano {{planName}}.",
      "Seu teste grátis é válido até {{dueDate}}.",
      "",
      "Equipe GATO",
    ].join("\n"),
  },
  {
    code: "trial_ending",
    subject: "Seu teste grátis do GATO termina em breve",
    body: [
      "Olá {{tenantName}},",
      "",
      "Seu período de teste do plano {{planName}} termina em {{daysLeft}} dia(s).",
      "Cadastre um método de pagamento para não perder o acesso.",
      "",
      "Equipe GATO",
    ].join("\n"),
  },
  {
    code: "invoice_reminder",
    subject: "Lembrete: fatura GATO de R$ {{amount}} vence em {{daysText}}",
    body: [
      "Olá {{tenantName}},",
      "",
      "Sua fatura do plano {{planName}} no valor de R$ {{amount}} vence {{dueDate}}.",
      "",
      "Equipe GATO",
    ].join("\n"),
  },
  {
    code: "invoice_overdue",
    subject: "Atenção: fatura GATO vencida — regularize para evitar suspensão",
    body: [
      "Olá {{tenantName}},",
      "",
      "A fatura do plano {{planName}} no valor de R$ {{amount}} está vencida há {{daysLate}} dia(s).",
      "Regularize o quanto antes para evitar a suspensão do acesso.",
      "",
      "Equipe GATO",
    ].join("\n"),
  },
  {
    code: "payment_confirmed",
    subject: "Pagamento confirmado — sua assinatura GATO está ativa",
    body: [
      "Olá {{tenantName}},",
      "",
      "Confirmamos o pagamento da sua fatura. Sua assinatura do plano {{planName}} está ativa.",
      "",
      "Equipe GATO",
    ].join("\n"),
  },
];

export function renderTemplate(
  code: string,
  vars: TemplateVariables,
): { subject: string; text: string } | null {
  const template = EMAIL_TEMPLATES.find((t) => t.code === code);
  if (!template) return null;

  const interpolate = (source: string) =>
    source.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? "");

  return { subject: interpolate(template.subject), text: interpolate(template.body) };
}
