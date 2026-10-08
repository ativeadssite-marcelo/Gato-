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

/**
 * Estado inicial de uma entidade persistida: localStorage com fallback semeado.
 * No modo base limpa não lê nada e começa vazio — de propósito, para não trazer de
 * volta os dados de demonstração que já estejam salvos no navegador.
 */
export function loadEntityState<T>(storageKey: string, seed: T[]): T[] {
  if (!USE_SEED_DATA) return [];

  // `typeof` em vez de try/catch: fora do navegador (testes em Node) `localStorage` nem
  // existe, e usar exceção como fluxo normal sujaria a saída da suíte com avisos.
  if (typeof localStorage === 'undefined') return seed;

  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) return JSON.parse(saved) as T[];
  } catch (e) {
    console.warn(`Não foi possível ler ${storageKey} do localStorage`, e);
  }
  return seed;
}

/**
 * Persiste uma entidade. No modo base limpa é no-op — ver regra 3 no topo do arquivo.
 */
export function persistEntityState<T>(storageKey: string, value: T[]): void {
  if (!USE_SEED_DATA) return;
  if (typeof localStorage === 'undefined') return;

  try {
    localStorage.setItem(storageKey, JSON.stringify(value));
  } catch (e) {
    console.warn(`Não foi possível salvar ${storageKey} no localStorage`, e);
  }
}

/**
 * Números fixos que os painéis somam por cima dos dados reais para a demonstração parecer
 * movimentada (faturamento do dia, peças vendidas, contagem de pedidos, DRE).
 *
 * Numa base limpa isso vira mentira — o dashboard anunciaria R$ 18.450,00 de faturamento
 * sem um único pedido, e o teste perderia o sentido. Com o modo ligado o acréscimo vira
 * zero e a tela mostra apenas o que foi de fato registrado.
 */
export function demoAddon(value: number): number {
  return USE_SEED_DATA ? value : 0;
}
