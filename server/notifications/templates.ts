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
  {
    code: "client_access_invitation",
    subject: "Seus dados de acesso ao GATO SaaS — {{companyName}}",
    body: [
      "Olá, {{adminName}}!",
      "",
      "Sua empresa {{companyName}} foi cadastrada com sucesso no GATO SaaS no plano {{planName}}.",
      "",
      "Abaixo estão os dados para acesso ao sistema:",
      "--------------------------------------------------",
      "🌐 Link de Acesso: {{loginUrl}}",
      "📧 E-mail Corporativo: {{email}}",
      "🔑 Senha Inicial / Temporária: {{password}}",
      "--------------------------------------------------",
      "",
      "Instruções:",
      "1. Clique no link de acesso acima;",
      "2. Digite seu e-mail corporativo e a senha inicial informada;",
      "3. No primeiro acesso, o sistema solicitará a criação da sua senha única definitiva.",
      "",
      "Seja muito bem-vindo à plataforma!",
      "",
      "Atenciosamente,",
      "Equipe GATO — Gestão de Estoque, Balcão & Frota Nacional",
    ].join("\n"),
  },
  {
    code: "user_access_invitation",
    subject: "Acesso liberado ao GATO SaaS — {{userName}} ({{companyName}})",
    body: [
      "Olá, {{userName}}!",
      "",
      "Você foi cadastrado como novo usuário no GATO SaaS pela empresa {{companyName}}.",
      "Função / Cargo: {{roleName}} (Departamento: {{department}}).",
      "",
      "Abaixo estão os dados para seu acesso:",
      "--------------------------------------------------",
      "🌐 Link de Acesso: {{loginUrl}}",
      "📧 E-mail de Login: {{email}}",
      "🔑 Senha Inicial / Temporária: {{password}}",
      "--------------------------------------------------",
      "",
      "Ao realizar o primeiro acesso, utilize a senha acima para autenticar.",
      "",
      "Atenciosamente,",
      "Equipe GATO — Gestão de Estoque e Balcão",
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
