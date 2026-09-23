// =========================================================================
// VISIBILIDADE DO MENU POR CAMADA DE ACESSO — GATO SaaS
// =========================================================================
// Cada item do menu é habilitado por um recurso RBAC. Se o papel do usuário
// tem nível 'none' (ou não tem permissão) naquele recurso, o item some do menu.
// O Super Admin redefine esses níveis por papel (role-overrides) e por usuário
// (customOverrides); o menu segue automaticamente.
// =========================================================================

import type { UserSession } from '../types';

/** Item do menu -> recurso RBAC que o habilita. */
export const MENU_RESOURCE: Record<string, string> = {
  dashboard: 'company_data',
  'consulta-pecas': 'customers_employees',
  estoque: 'company_data',
  cotacao: 'customers_employees',
  orcamentos: 'customers_employees',
  clientes: 'customers_employees',
  'leads-marketing': 'customers_employees',
  fornecedores: 'customers_employees',
  relatorios: 'company_data',
  'ordem-servico': 'company_data',
  'xml-import': 'company_data',
  configuracoes: 'company_data',
  assinatura: 'billing_contracts',
  conectores: 'connectors',
  admin: 'fiscal_config',
  rbac: 'manage_accounts',
  'financeiro-saas': 'billing_contracts',
  'banco-dados': 'security_compliance',
  'camadas-acesso': 'manage_accounts',
};

/** Nível de acesso suficiente para o item aparecer no menu (qualquer nível que não seja 'none'). */
export function isMenuVisible(itemId: string, user?: UserSession | null): boolean {
  if (!user) return true;
  const resource = MENU_RESOURCE[itemId];
  if (!resource) return true; // item sem mapeamento: visível por padrão
  const level = (user.permissions || {})[resource];
  return level !== 'none' && !!level;
}

/** Nível de acesso efetivo do usuário para um item do menu (para badges/tooltips). */
export function menuAccessLevel(itemId: string, user?: UserSession | null): string | undefined {
  if (!user) return undefined;
  const resource = MENU_RESOURCE[itemId];
  if (!resource) return undefined;
  return (user.permissions || {})[resource];
}
