// =========================================================================
// IMPRESSÃO DO ORÇAMENTO — botão único + seletor de formato
// =========================================================================
// O mesmo orçamento sai em dois papéis diferentes:
//   - cupom térmico de 80mm (`buildOrcamentoThermalHtml`) — o do balcão;
//   - tabela A4 paisagem (`buildOrcamentoTabelaHtml`) — o "pedido" com ICMS
//     por item e rodapé de totais.
//
// Em vez de dois botões em cada uma das quatro telas que imprimem (barra do
// DAV, modal do documento, histórico de orçamentos e o modal do cupom), este
// componente guarda a escolha num diálogo — junto do aviso de pop-up
// bloqueado, que antes vivia repetido em cada tela.
//
// ⚠️ `printHtmlDocument` abre uma janela nova: a impressão tem de sair de um
// clique do usuário. Por isso o diálogo só decide o formato e chama na hora —
// nada de `await` antes do `printHtmlDocument`.
// =========================================================================

import React, { useEffect, useState } from 'react';
import { Printer, Receipt, Table, X } from 'lucide-react';
import type { Product, Quote } from '../types';
import {
  buildOrcamentoTabelaHtml,
  buildOrcamentoThermalHtml,
  DEFAULT_COMPANY_RECEIPT_INFO,
  type CompanyReceiptInfo,
} from '../utils/quoteMarketingSync';
import { printHtmlDocument } from '../utils/printDocument';

export type FormatoImpressao = 'termica' | 'tabela';

interface ImprimirOrcamentoSeletorProps {
  quote: Quote;
  /** Só serve à coluna EQUIVALÊNCIA da tabela (`Product.similarCodes`). */
  products?: Product[];
  company?: CompanyReceiptInfo;
  onShowNotification?: (title: string, message: string, type?: 'success' | 'warning' | 'info') => void;
  /** Classes do botão, para casar com o estilo de cada tela. */
  className?: string;
  label?: string;
}

export const ImprimirOrcamentoSeletor: React.FC<ImprimirOrcamentoSeletorProps> = ({
  quote,
  products = [],
  company = DEFAULT_COMPANY_RECEIPT_INFO,
  onShowNotification,
  className = 'flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer',
  label = 'Imprimir',
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Esc fecha o diálogo — o balcão usa teclado o dia inteiro.
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  const abrirSeletor = () => {
    if ((quote.items || []).length === 0) {
      onShowNotification?.(
        'Orçamento Vazio',
        'Adicione pelo menos um item antes de imprimir.',
        'warning'
      );
      return;
    }
    setIsOpen(true);
  };

  const imprimir = (formato: FormatoImpressao) => {
    const html =
      formato === 'termica'
        ? buildOrcamentoThermalHtml(quote, company)
        : buildOrcamentoTabelaHtml(quote, company, products);

    const resultado = printHtmlDocument(html, {
      title: `Orçamento ${quote.quoteNumber}`,
      // A4 paisagem a 96dpi — a janela já abre no formato do papel.
      ...(formato === 'tabela' ? { width: 1123, height: 794 } : {}),
    });

    if (!resultado.ok) {
      onShowNotification?.(
        'Pop-up bloqueado',
        'Autorize pop-ups neste site para imprimir o orçamento.',
        'warning'
      );
    }
    setIsOpen(false);
  };

  return (
    <>
      <button type="button" onClick={abrirSeletor} className={className} title="Imprimir o orçamento (escolher formato)">
        <Printer className="w-4 h-4" />
        <span>{label}</span>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-md p-5 shadow-2xl border border-slate-200"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-3">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Imprimir orçamento</span>
                <h3 className="text-sm font-black text-slate-900 font-mono">{quote.quoteNumber}</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer"
                aria-label="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-2">
              <button
                type="button"
                onClick={() => imprimir('termica')}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-orange-300 hover:bg-orange-50 text-left transition cursor-pointer"
              >
                <Receipt className="w-5 h-5 text-orange-600 shrink-0" />
                <span>
                  <strong className="block text-xs text-slate-900">Cupom térmico (80 mm)</strong>
                  <span className="block text-[11px] text-slate-500">
                    Para a impressora do balcão — texto corrido de 48 colunas.
                  </span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => imprimir('tabela')}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-sky-300 hover:bg-sky-50 text-left transition cursor-pointer"
              >
                <Table className="w-5 h-5 text-sky-600 shrink-0" />
                <span>
                  <strong className="block text-xs text-slate-900">Tabela A4 (paisagem)</strong>
                  <span className="block text-[11px] text-slate-500">
                    Pedido com código, equivalência, ICMS por item e totais.
                  </span>
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
