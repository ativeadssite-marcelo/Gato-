// =========================================================================
// VISIBILIDADE DO MENU POR CAMADA DE ACESSO — GATO SaaS
// =========================================================================
// Cada item do menu é habilitado por um recurso RBAC. Se o papel do usuário
// tem nível 'none' (ou não tem permissão) naquele recurso, o item some do menu.
// O Super Admin redefine esses níveis por papel (role-overrides) e por usuário
// (customOverrides); o menu segue automaticamente.
// =========================================================================

import type { UserSession } from '../types';
import type { TenantPermissionKey } from '../types/rbac';
import { hasAllTenantPermissions } from './tenantPermissions';

/** Item do menu -> recurso RBAC que o habilita. */
export const MENU_RESOURCE: Record<string, string> = {
  dashboard: 'company_data',
  // Consulta de Peças e Aplicação usam a base de veículos/aplicação, que é dado
  // de REFERÊNCIA — não o cadastro do contratante. Por isso não depende de
  // `customers_employees` (e o dono do SaaS mantém a consulta).
  'consulta-pecas': 'catalog_reference',
  estoque: 'company_data',
  cotacao: 'customers_employees',
  // Caixa (PDV): as rotas exigem escopo `company_data` + permissão `sales`.
  caixa: 'company_data',
  orcamentos: 'customers_employees',
  clientes: 'customers_employees',
  'leads-marketing': 'customers_employees',
  fornecedores: 'customers_employees',
  relatorios: 'company_data',
  'ordem-servico': 'company_data',
  'xml-import': 'company_data',
  configuracoes: 'company_data',
  assinatura: 'billing_contracts',
  // Chaves de API / licença de máquina. `tenant_credentials` é `own_tenant_only`
  // para o admin do tenant e `full` para o dono/SaaS, então a tela serve às duas
  // audiências com um único mapeamento.
  chaves: 'tenant_credentials',
  conectores: 'connectors',
  admin: 'fiscal_config',
  rbac: 'manage_accounts',
  'financeiro-saas': 'billing_contracts',
  'banco-dados': 'security_compliance',
  'camadas-acesso': 'manage_accounts',
};

/**
 * Item do menu -> capacidades operacionais do tenant que o habilitam.
 * "Visível se o usuário tiver QUALQUER UMA destas" (ver isMenuVisible).
 */
export const MENU_TENANT_PERMISSION: Record<string, TenantPermissionKey[]> = {
  estoque: ['stock_inbound', 'stock_picking', 'stock_location', 'item_register'],
  cotacao: ['sales'],
  caixa: ['sales'],
  orcamentos: ['sales', 'customer_register'],
  clientes: ['customer_register'],
  'leads-marketing': ['customer_register'],
  fornecedores: ['stock_inbound', 'item_register'],
  conectores: ['marketplace'],
  relatorios: ['margin_reports'],
  'ordem-servico': ['sales'],
  'xml-import': ['stock_inbound'],
  // `configuracoes` fica de fora de propósito: ali mora dado da empresa,
  // filiais e impostos, bem mais amplo que `accounting_config`.
};

/**
 * Rótulos dos itens do menu, usados na prévia de acesso do construtor flexível.
 * Os rótulos reais vivem no Sidebar; aqui é só para exibir o efeito do recorte.
 */
export const MENU_ITEM_LABELS: Record<string, string> = {
  dashboard: 'Início',
  'consulta-pecas': 'Consulta de Peças',
  estoque: 'Estoque',
  cotacao: 'Vendas',
  caixa: 'Caixa',
  orcamentos: 'Orçamentos',
  clientes: 'Clientes',
  'leads-marketing': 'Marketing & WhatsApp',
  fornecedores: 'Fornecedores',
  conectores: 'Conectores & Integrações',
  relatorios: 'Relatórios',
  'ordem-servico': 'Ordem de Serviço',
  'xml-import': 'Baixar NF-e / XML',
  chaves: 'Chaves & Integrações',
};

/**
 * As capacidades finas foram configuradas para este usuário?
 *
 * Só então o gate por capacidade é aplicado. `undefined` significa "nunca
 * configurado" (papéis legados e seeds como `tenant_readonly`) e mantém o
 * comportamento por recurso RBAC — sem isso, todo usuário que nunca passou
 * pelo construtor perderia o menu inteiro. Admin do tenant e escopo SaaS têm
 * tudo por definição e nunca são restringidos aqui.
 */
export function hasConfiguredTenantPermissions(user?: UserSession | null): boolean {
  if (!user) return false;
  if (hasAllTenantPermissions(user)) return false;
  return Array.isArray(user.tenantPermissions);
}

/**
 * Nível de acesso suficiente para o item aparecer no menu.
 *
 * Dois critérios, ambos precisam passar:
 * 1. Recurso RBAC do papel (qualquer nível que não seja 'none');
 * 2. Capacidade operacional fina — apenas quando o admin do tenant já
 *    configurou as capacidades daquele usuário.
 */
export function isMenuVisible(itemId: string, user?: UserSession | null): boolean {
  if (!user) return true;

  const resource = MENU_RESOURCE[itemId];
  if (resource) {
    const level = (user.permissions || {})[resource];
    if (level === 'none' || !level) return false;
  }

  const capabilities = MENU_TENANT_PERMISSION[itemId];
  if (capabilities && hasConfiguredTenantPermissions(user)) {
    return capabilities.some((key) => user.tenantPermissions!.includes(key));
  }

  return true;
}

/** Nível de acesso efetivo do usuário para um item do menu (para badges/tooltips). */
export function menuAccessLevel(itemId: string, user?: UserSession | null): string | undefined {
  if (!user) return undefined;
  const resource = MENU_RESOURCE[itemId];
  if (!resource) return undefined;
  return (user.permissions || {})[resource];
}
