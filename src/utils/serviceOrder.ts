// =========================================================================
// REGRAS DA ORDEM DE SERVIÇO (oficina) — funções puras
// =========================================================================
// O ciclo de vida da OS e as contas de peças/mão de obra vivem aqui, fora da
// tela, por dois motivos:
//
// 1. é o que dá para testar sem navegador — a tela é JSX, isto é regra;
// 2. o status não pode andar para qualquer lado: `Finalizada` só reabre para
//    `Em Execucao`, `Faturada` e `Cancelada` são fim de linha, e um orçamento
//    recém-aberto não pula direto para "finalizada" sem passar pela execução.
//
// Os valores são os do tipo `ServiceOrderStatus` (types.ts) — a tela mostra os
// rótulos, mas a regra compara os literais, como no resto do sistema.
// =========================================================================

import type { ServiceOrder, ServiceOrderStatus } from '../types';

/** Para onde cada status pode ir. Lista vazia = fim de linha. */
export const OS_TRANSICOES: Record<ServiceOrderStatus, ServiceOrderStatus[]> = {
  Orcamento: ['Aprovada', 'Cancelada'],
  Aprovada: ['Em Execucao', 'Cancelada'],
  'Em Execucao': ['Aguardando Pecas', 'Finalizada', 'Cancelada'],
  'Aguardando Pecas': ['Em Execucao', 'Cancelada'],
  // Reabrir uma OS finalizada volta para a execução — é o caso de retrabalho.
  Finalizada: ['Em Execucao', 'Faturada'],
  Faturada: [],
  Cancelada: [],
};

/** A transição é permitida? */
export function podeTransicionarOs(de: ServiceOrderStatus, para: ServiceOrderStatus): boolean {
  return (OS_TRANSICOES[de] || []).includes(para);
}

/** OS que ainda dá trabalho: nem finalizada, nem faturada, nem cancelada. */
export function osEstaAberta(status: ServiceOrderStatus): boolean {
  return status !== 'Finalizada' && status !== 'Faturada' && status !== 'Cancelada';
}

/** Rótulo legível do status (a tela usa estes). */
export const OS_STATUS_LABEL: Record<ServiceOrderStatus, string> = {
  Orcamento: 'Orçamento',
  Aprovada: 'Aprovada',
  'Em Execucao': 'Em Execução',
  'Aguardando Pecas': 'Aguardando Peças',
  Finalizada: 'Finalizada',
  Faturada: 'Faturada',
  Cancelada: 'Cancelada',
};

export interface OsTotais {
  partsTotal: number;
  laborTotal: number;
  totalAmount: number;
  sellerCommissionAmount: number;
  mechanicCommissionAmount: number;
  workshopPartsCommissionAmount: number;
}

const arredondar = (valor: number) => Math.round(valor * 100) / 100;

/**
 * Totais da OS a partir das peças, da mão de obra, do desconto e dos percentuais de comissão.
 *
 * O total é SEMPRE recalculado aqui — garantindo transparência para a oficina e vendedor.
 */
export function calcularTotaisOs(
  os: Pick<ServiceOrder, 'parts' | 'labor' | 'discount'> & {
    sellerCommissionPercent?: number;
    mechanicCommissionPercent?: number;
    workshopPartsCommissionPercent?: number;
  }
): OsTotais {
  const partsTotal = (os.parts || []).reduce(
    (acc, item) => acc + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
    0
  );
  const laborTotal = (os.labor || []).reduce((acc, item) => acc + (Number(item.price) || 0), 0);
  const discount = Number(os.discount) || 0;

  const sellerPercent = Number(os.sellerCommissionPercent) || 0;
  const mechanicPercent = Number(os.mechanicCommissionPercent) || 0;
  const workshopPartsPercent = Number(os.workshopPartsCommissionPercent) || 0;

  const sellerCommissionAmount = arredondar((partsTotal * sellerPercent) / 100);
  const mechanicCommissionAmount = arredondar((laborTotal * mechanicPercent) / 100);
  const workshopPartsCommissionAmount = arredondar((partsTotal * workshopPartsPercent) / 100);

  return {
    partsTotal: arredondar(partsTotal),
    laborTotal: arredondar(laborTotal),
    totalAmount: arredondar(Math.max(0, partsTotal + laborTotal - discount)),
    sellerCommissionAmount,
    mechanicCommissionAmount,
    workshopPartsCommissionAmount,
  };
}

/** Próximo número da sequência (OS-2026-001, -002…), a partir das existentes. */
export function proximoNumeroOs(existentes: ServiceOrder[], ano = new Date().getFullYear()): string {
  const prefixo = `OS-${ano}-`;
  const maior = existentes
    .filter((os) => os.id.startsWith(prefixo))
    .reduce((max, os) => {
      const n = parseInt(os.id.slice(prefixo.length), 10);
      return Number.isFinite(n) && n > max ? n : max;
    }, 0);
  return `${prefixo}${String(maior + 1).padStart(3, '0')}`;
}
