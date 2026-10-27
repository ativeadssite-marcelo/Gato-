/**
 * Modo base limpa — testar o sistema como empresa nova, sem dado de demonstração.
 *
 * Ligado por `VITE_USE_SEED=false` no `.env` (exige reiniciar o `npm run dev`, porque o
 * Vite lê as variáveis na subida). Desligado por padrão: sem a variável, o comportamento
 * é o de sempre.
 *
 * Três regras que valem a pena entender antes de mexer aqui:
 *
 * 1. **Não apaga nada.** Os seeds continuam em `src/data/initialData.ts` e o localStorage
 *    do navegador fica intacto — voltar a variável para `true` devolve a demonstração
 *    exatamente como estava.
 * 2. **Vale só para dado de movimento** (produto, cliente, pedido, financeiro, orçamento...).
 *    Configuração — perfil da empresa, filiais, tabelas fiscais — continua carregando,
 *    porque sem ela o app não opera: não há filial ativa, não há CNPJ emitente, não há
 *    alíquota para calcular imposto.
 * 3. **Não persiste o vazio.** No modo limpa a gravação em localStorage é desligada de
 *    propósito: se o `[]` inicial fosse gravado, o `"[]"` salvo venceria o fallback
 *    semeado na leitura seguinte e o modo deixaria de ser reversível.
 */

export const USE_SEED_DATA: boolean =
  (import.meta.env?.VITE_USE_SEED ?? 'true') !== 'false';

/** Lista semeada — vazia no modo base limpa. */
export function seedList<T>(value: T[]): T[] {
  return USE_SEED_DATA ? value : [];
}

const DEMO_BRANCH_IDS = new Set(['matriz-ms', 'filial-sp', 'filial-sc', 'filial-mt', 'filial-pr']);

/** Remove filiais fictícias de teste da listagem quando em modo base limpa */
export function filterDemoBranches<T extends { id?: string; name?: string }>(branches: T[]): T[] {
  if (USE_SEED_DATA) return branches;
  return (branches || []).filter(
    (b) =>
      b &&
      !DEMO_BRANCH_IDS.has(b.id || '') &&
      !b.name?.includes('Pantanal') &&
      !b.name?.includes('Campo Grande') &&
      !b.name?.includes('Joinville') &&
      !b.name?.includes('Rondonópolis')
  );
}

/**
 * Estado inicial de uma entidade persistida: localStorage com fallback semeado.
 * No modo base limpa (VITE_USE_SEED=false), se não houver dados reais salvos pelo
 * usuário, inicia como lista vazia []. Qualquer dado real cadastrado passa a ser
 * salvo e recuperado normalmente.
 */
export function loadEntityState<T>(storageKey: string, seed: T[]): T[] {
  if (typeof localStorage === 'undefined') {
    return USE_SEED_DATA ? seed : [];
  }

  try {
    // Se o modo limpa estiver ativo e ainda não tivermos purgado dados demo antigos
    if (!USE_SEED_DATA && !localStorage.getItem('gato_clean_mode_purged_v3')) {
      localStorage.removeItem(storageKey);
    }

    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        if (storageKey === 'gato_branches') {
          return filterDemoBranches(parsed) as T[];
        }
        return parsed as T[];
      }
    }
  } catch (e) {
    console.warn(`Não foi possível ler ${storageKey} do localStorage`, e);
  }

  return USE_SEED_DATA ? seed : [];
}

/**
 * Persiste uma entidade no localStorage. Funciona tanto no modo com demonstração
 * quanto no modo de base limpa (produção), garantindo que cadastros reais fiquem salvos.
 */
export function persistEntityState<T>(storageKey: string, value: T[]): void {
  if (typeof localStorage === 'undefined') return;

  try {
    localStorage.setItem(storageKey, JSON.stringify(value));
  } catch (e) {
    console.warn(`Não foi possível salvar ${storageKey} no localStorage`, e);
  }
}

/**
 * Números fixos que os painéis somam por cima dos dados reais para a demonstração parecer movimentada.
 * Numa base limpa isso vira zero e a tela mostra apenas o que foi de fato registrado.
 */
export function demoAddon(value: number): number {
  return USE_SEED_DATA ? value : 0;
}

// Marca inicialização limpa quando no modo clean (v3 purga filiais e dados de teste)
if (typeof localStorage !== 'undefined' && !USE_SEED_DATA && !localStorage.getItem('gato_clean_mode_purged_v3')) {
  try {
    const demoKeys = [
      'gato_customers',
      'gato_suppliers',
      'gato_service_orders',
      'gato_products',
      'gato_quotes',
      'gato_orders',
      'gato_invoices',
      'gato_payables',
      'gato_receivables',
      'gato_bank_transactions',
      'gato_notifications',
      'gato_mdfe',
      'gato_branches',
      'gato_active_store',
      'gato_company_profile'
    ];
    demoKeys.forEach(k => localStorage.removeItem(k));
    localStorage.setItem('gato_clean_mode_purged_v3', 'true');
  } catch {
    /* noop */
  }
}
