// =========================================================================
// RESET DE DADOS DO CONTRATANTE — "iniciar operação com a casa limpa"
// =========================================================================
// O dono da loja testa o sistema com dado de demonstração e, no dia de começar
// a operar de verdade, precisa zerar o movimento — sem perder a configuração
// (perfil, filiais, impostos, usuários, assinatura) e SEM tocar na trilha de
// auditoria, que é registro do que aconteceu e não dado de operação.
//
// Duas regras que valem a pena entender antes de mexer:
//
// 1. **A ordem importa.** As tabelas são apagadas na ordem filho→pai por causa
//    das FKs (`BudgetItem` referencia `Budget`) — e `StockLevel` sai antes de
//    `Product`. A lista abaixo é a ordem; não é alfabética de propósito.
//
// 2. **A confirmação é comparada sem acento e sem caixa.** O dono vai digitar o
//    nome da empresa dele; exigir acentuação exata só produziria erro de
//    digitação num botão que apaga dados. Ainda assim é uma trava real: não é
//    um "clique duplo", é digitar o nome.
// =========================================================================

/**
 * O que o reset apaga, na ordem (filhos antes dos pais).
 *
 * Só dado de MOVIMENTO e de cadastro operacional. Ficam de fora, de propósito:
 * `Tenant`, `Warehouse`, `RbacUser`, `User`, `UserCredential`, `AuditLog`,
 * `TenantSubscription`, `Invoice`, `WebhookEvent`, `TenantUsage`, `EmailLog` —
 * configuração, acesso, cobrança e trilha.
 */
export const RESET_TABLES: string[] = [
  'BudgetItem',
  'Budget',
  'Receipt',
  'CashMovement',
  'BoletoIssuance',
  'CashRegister',
  'StockLevel',
  'Product',
  'Customer',
  'Supplier',
];

/** Tabelas que o reset NUNCA toca — conferidas por teste. */
export const TABELAS_PRESERVADAS: string[] = [
  'Tenant',
  'Warehouse',
  'RbacUser',
  'User',
  'UserCredential',
  'AuditLog',
  'TenantSubscription',
  'Invoice',
  'WebhookEvent',
  'TenantUsage',
  'EmailLog',
];

/** Compara ignorando caixa e acentos (o dono digita o nome da empresa). */
export function normalizarConfirmacao(texto: string): string {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** A confirmação digitada bate com o esperado (nome da empresa)? */
export function confirmacaoValida(digitado: string, esperado: string): boolean {
  const alvo = normalizarConfirmacao(esperado);
  if (!alvo) return false;
  return normalizarConfirmacao(digitado) === alvo;
}

export interface ResetStatement {
  tabela: string;
  sql: string;
}

/**
 * As exclusões, na ordem de `RESET_TABLES`.
 *
 * TODA exclusão é limitada ao tenant (por coluna própria ou por subconsulta do
 * pai) — nenhum `DELETE` solto. A trilha de auditoria registra o reset com o
 * número de linhas de cada tabela.
 */
export function resetStatements(tenantId: string): ResetStatement[] {
  return [
    {
      tabela: 'BudgetItem',
      sql: 'DELETE FROM "BudgetItem" WHERE "budgetId" IN (SELECT id FROM "Budget" WHERE "tenantId" = $1);',
    },
    { tabela: 'Budget', sql: 'DELETE FROM "Budget" WHERE "tenantId" = $1;' },
    { tabela: 'Receipt', sql: 'DELETE FROM "Receipt" WHERE "tenantId" = $1;' },
    { tabela: 'CashMovement', sql: 'DELETE FROM "CashMovement" WHERE "tenantId" = $1;' },
    { tabela: 'BoletoIssuance', sql: 'DELETE FROM "BoletoIssuance" WHERE "tenantId" = $1;' },
    { tabela: 'CashRegister', sql: 'DELETE FROM "CashRegister" WHERE "tenantId" = $1;' },
    {
      tabela: 'StockLevel',
      sql: 'DELETE FROM "StockLevel" WHERE "productId" IN (SELECT id FROM "Product" WHERE "tenantId" = $1);',
    },
    { tabela: 'Product', sql: 'DELETE FROM "Product" WHERE "tenantId" = $1;' },
    { tabela: 'Customer', sql: 'DELETE FROM "Customer" WHERE "tenantId" = $1;' },
    { tabela: 'Supplier', sql: 'DELETE FROM "Supplier" WHERE "tenantId" = $1;' },
  ];
}
