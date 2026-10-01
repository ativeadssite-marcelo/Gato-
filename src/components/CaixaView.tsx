// =========================================================================
// CAIXA (PDV) — GATO SaaS
// =========================================================================
// Tela de operação de caixa: abertura com fundo de caixa, registro de
// movimentações (vendas, sangrias, suprimentos, devoluções), fechamento com
// conferência de valor e histórico do turno. Consome /api/caixa — rotas já
// existentes no servidor, multi-tenant e auditadas. O menu e as rotas usam o
// mesmo gate: escopo `company_data` + capacidade `sales` no tenant.
// =========================================================================

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Wallet, RefreshCw, Lock, Unlock, Printer } from 'lucide-react';
import { apiJson } from '../services/apiClient';
import type { CompanyProfile } from '../types';
import type {
  CaixaSummary,
  CashMovement,
  CashRegister,
  CashMovementType,
  PaymentMethodCaixa,
} from '../types/caixa';

interface CaixaViewProps {
  companyProfile?: CompanyProfile | null;
  onShowNotification: (title: string, message: string, type?: 'success' | 'warning' | 'info') => void;
}

/** Opções do balcão → tipo/forma de pagamento aceitos pelo POST /api/caixa/movements. */
const MOVEMENT_OPTIONS: Array<{
  value: CashMovementType;
  paymentMethod: PaymentMethodCaixa;
  label: string;
  positive: boolean;
}> = [
  { value: 'sale_cash', paymentMethod: 'dinheiro', label: 'Venda — Dinheiro', positive: true },
  { value: 'sale_card', paymentMethod: 'cartao_debito', label: 'Venda — Cartão', positive: true },
  { value: 'sale_pix', paymentMethod: 'pix', label: 'Venda — PIX', positive: true },
  { value: 'sale_boleto', paymentMethod: 'boleto', label: 'Venda — Boleto', positive: true },
  { value: 'sale_vale', paymentMethod: 'vale_alimentacao', label: 'Venda — Vale Alimentação', positive: true },
  { value: 'sale_vale', paymentMethod: 'vale_refeicao', label: 'Venda — Vale Refeição', positive: true },
  { value: 'sale_vale', paymentMethod: 'voucher', label: 'Venda — Voucher / Vale-Presente', positive: true },
  { value: 'deposit', paymentMethod: 'dinheiro', label: 'Suprimento (entrada)', positive: true },
  { value: 'withdrawal', paymentMethod: 'dinheiro', label: 'Sangria (retirada)', positive: false },
  { value: 'refund_cash', paymentMethod: 'dinheiro', label: 'Devolução — Dinheiro', positive: false },
  { value: 'refund_card', paymentMethod: 'cartao_credito', label: 'Devolução — Cartão', positive: false },
  { value: 'adjustment', paymentMethod: 'outros', label: 'Ajuste manual', positive: true },
];

const brl = (v: number): string =>
  (Number.isFinite(v) ? v : 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const fmtDateTime = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};

const findOption = (m: CashMovement) =>
  MOVEMENT_OPTIONS.find((o) => o.value === m.type && o.paymentMethod === m.paymentMethod) ||
  MOVEMENT_OPTIONS.find((o) => o.value === m.type);

const movementLabel = (m: CashMovement): string =>
  findOption(m)?.label ||
  (m.type === 'opening' ? 'Abertura de caixa' : m.type === 'closing' ? 'Fechamento de caixa' : m.type);

const movementSign = (m: CashMovement): number => {
  const opt = findOption(m);
  return opt && !opt.positive ? -1 : 1;
};

/** Converte "1.234,56" (pt-BR) ou "1234.56" para número. */
const parseAmount = (raw: string): number => {
  const t = raw.trim();
  if (!t) return NaN;
  const n = t.includes(',') ? parseFloat(t.replace(/\./g, '').replace(',', '.')) : parseFloat(t);
  return Number.isNaN(n) ? NaN : n;
};

// ---------------------------------------------------------------------------
// CHECKLIST DE ABERTURA DO PDV — persistido por dia no navegador
// ---------------------------------------------------------------------------
const CHECKLIST_LABELS = [
  'Impressora de cupom fiscal testada',
  'Leitor de código de barras testado',
  'Gaveta de dinheiro conferida',
  'Fundo de caixa (troco inicial) conferido',
];

const checklistStorageKey = (): string => `gato_pdv_checklist_${new Date().toISOString().slice(0, 10)}`;

const loadChecklist = (): boolean[] => {
  try {
    const raw = localStorage.getItem(checklistStorageKey());
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length === CHECKLIST_LABELS.length) {
        return parsed.map(Boolean);
      }
    }
  } catch {
    /* localStorage indisponível — começa desmarcado */
  }
  return CHECKLIST_LABELS.map(() => false);
};

/** Escapa texto para injeção segura no HTML do relatório impresso. */
const esc = (s: string): string =>
  s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  );

interface ReportInput {
  company: CompanyProfile | null | undefined;
  register: CashRegister;
  movements: CashMovement[];
}

/**
 * Monta o HTML do RELATÓRIO DE CAIXA (bate-caixa) para impressão.
 * Totais recalculados no cliente com a mesma fórmula do servidor
 * (esperado = fundo + vendas em dinheiro − devoluções − sangrias + suprimentos),
 * permitindo emitir o relatório também de caixas já fechados.
 */
const buildReportHtml = ({ company, register, movements }: ReportInput): string => {
  const sum = (t: CashMovementType): number =>
    movements.filter((m) => m.type === t).reduce((s, m) => s + m.amount, 0);

  const opening = sum('opening');
  const salesCash = sum('sale_cash');
  const salesCard = sum('sale_card');
  const salesPix = sum('sale_pix');
  const salesBoleto = sum('sale_boleto');
  const salesVale = sum('sale_vale');
  const refunds = sum('refund_cash') + sum('refund_card');
  const withdrawals = sum('withdrawal');
  const deposits = sum('deposit');
  const expected = Number(
    (opening + salesCash + salesCard + salesPix + salesBoleto - refunds - withdrawals + deposits).toFixed(2),
  );

  const isOpen = register.status === 'open';
  const actual = isOpen ? null : register.actualAmount;
  const difference = isOpen ? null : register.difference;

  const totalRow = (label: string, value: number) =>
    `<tr><td>${esc(label)}</td><td class="num">${esc(brl(value))}</td></tr>`;

  const movementRows = movements.length
    ? movements
        .map(
          (m) =>
            `<tr><td>${esc(fmtDateTime(m.createdAt))}</td><td>${esc(movementLabel(m))}</td><td>${esc(
              m.description,
            )}</td><td>${esc(m.userName)}</td><td class="num">${
              movementSign(m) > 0 ? '+' : '−'
            } ${esc(brl(m.amount))}</td></tr>`,
        )
        .join('')
    : '<tr><td colspan="5" class="center">Nenhuma movimentação no turno.</td></tr>';

  const closingBlock =
    actual === null || difference === null
      ? '<p><strong>Situação:</strong> CAIXA ABERTO — fechamento pendente</p>'
      : `<p><strong>Valor esperado (sistema):</strong> ${esc(brl(expected))}</p>
         <p><strong>Valor contado (físico):</strong> ${esc(brl(actual))}</p>
         <p><strong>Diferença:</strong> ${esc(brl(difference))} — ${
           difference > 0 ? 'SOBRA' : difference < 0 ? 'FALTA' : 'CONFERIDO'
         }</p>
         ${register.notes ? `<p><strong>Observações:</strong> ${esc(register.notes)}</p>` : ''}`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Relatório de Caixa — ${esc(company?.tradeName || 'GATO SaaS')}</title>
<style>
  @page { margin: 12mm; }
  body { font-family: 'Courier New', monospace; color: #111; font-size: 13px; margin: 24px; }
  h1 { font-size: 16px; text-align: center; margin: 0 0 2px; }
  h2 { font-size: 13px; border-bottom: 1px solid #111; padding-bottom: 2px; margin: 18px 0 8px; text-transform: uppercase; }
  .center { text-align: center; }
  .muted { color: #444; font-size: 12px; }
  table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  th, td { border: 1px solid #999; padding: 4px 6px; text-align: left; font-size: 12px; }
  th { background: #eee; }
  .num { text-align: right; white-space: nowrap; }
  .badge { display: inline-block; border: 1px solid #111; padding: 1px 8px; font-weight: bold; }
  .totals td { border: none; padding: 2px 6px; }
  .signatures { display: flex; gap: 40px; margin-top: 56px; }
  .signatures div { flex: 1; border-top: 1px solid #111; text-align: center; padding-top: 4px; font-size: 12px; }
</style>
</head>
<body>
  <h1>${esc(company?.tradeName || 'GATO SaaS')}</h1>
  <p class="center muted">${company?.cnpj ? `CNPJ ${esc(company.cnpj)}` : ''}${
    company?.city ? ` — ${esc(company.city)}/${esc(company.uf)}` : ''
  }</p>
  <p class="center"><span class="badge">RELATÓRIO DE CAIXA — ${isOpen ? 'EM ABERTO' : 'FECHADO'}</span></p>

  <h2>Turno</h2>
  <table>
    <tr><td><strong>Operador</strong></td><td>${esc(register.userName)}</td></tr>
    <tr><td><strong>Abertura</strong></td><td>${esc(fmtDateTime(register.openedAt))}</td></tr>
    <tr><td><strong>Fechamento</strong></td><td>${register.closedAt ? esc(fmtDateTime(register.closedAt)) : '—'}</td></tr>
    <tr><td><strong>Fechado por</strong></td><td>${register.closedByUserName ? esc(register.closedByUserName) : '—'}</td></tr>
    <tr><td><strong>Identificador</strong></td><td>${esc(register.id)}</td></tr>
  </table>

  <h2>Resumo financeiro</h2>
  <table>
    <tr><th>Item</th><th class="num">Valor</th></tr>
    ${totalRow('Fundo de caixa (abertura)', opening)}
    ${totalRow('Vendas — dinheiro', salesCash)}
    ${totalRow('Vendas — cartão', salesCard)}
    ${totalRow('Vendas — PIX', salesPix)}
    ${totalRow('Vendas — boleto', salesBoleto)}
    ${totalRow('Vendas — vales/vouchers', salesVale)}
    ${totalRow('Devoluções', refunds)}
    ${totalRow('Sangrias', withdrawals)}
    ${totalRow('Suprimentos', deposits)}
    ${totalRow('ESPERADO EM DINHEIRO', expected)}
  </table>
  <div style="margin-top:10px">${closingBlock}</div>

  <h2>Movimentações (${movements.length})</h2>
  <table>
    <tr><th>Horário</th><th>Operação</th><th>Descrição</th><th>Operador</th><th class="num">Valor</th></tr>
    ${movementRows}
  </table>

  <div class="signatures">
    <div>Operador de caixa</div>
    <div>Responsável / Gerência</div>
  </div>
  <p class="center muted" style="margin-top:24px">Emitido em ${esc(
    new Date().toLocaleString('pt-BR'),
  )} — Sistema GATO</p>
</body>
</html>`;
};



const inputClass =
  'w-full bg-slate-950/60 border border-slate-700/60 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/40 transition';

const labelClass = 'block text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1.5';

const primaryButtonClass =
  'w-full px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-black shadow-lg shadow-orange-600/25 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

export const CaixaView: React.FC<CaixaViewProps> = ({ companyProfile, onShowNotification }) => {
  const [summary, setSummary] = useState<CaixaSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Abertura de caixa
  const [openingAmount, setOpeningAmount] = useState('');
  const [openingNotes, setOpeningNotes] = useState('');

  // Movimentação de balcão
  const [movOption, setMovOption] = useState<string>('sale_cash');
  const [movAmount, setMovAmount] = useState('');
  const [movDescription, setMovDescription] = useState('');

  // Fechamento de caixa
  const [closingAmount, setClosingAmount] = useState('');
  const [closingNotes, setClosingNotes] = useState('');

  // Checklist de abertura do PDV (persistido por dia no navegador)
  const [checklist, setChecklist] = useState<boolean[]>(loadChecklist);

  // Troco no recebimento em dinheiro
  const [receivedAmount, setReceivedAmount] = useState('');

  // Evita re-fetch a cada re-render do App (showNotification é recriado a cada render).
  const notifyRef = useRef(onShowNotification);
  useEffect(() => {
    notifyRef.current = onShowNotification;
  }, [onShowNotification]);

  // Persiste o checklist de abertura do dia (muda à meia-noite = novo turno).
  useEffect(() => {
    try {
      localStorage.setItem(checklistStorageKey(), JSON.stringify(checklist));
    } catch {
      /* localStorage indisponível — segue sem persistir */
    }
  }, [checklist]);

  const loadSummary = useCallback(async () => {
    try {
      const data = await apiJson<CaixaSummary & { success: boolean }>('/api/caixa/summary');
      setSummary(data);
    } catch (err: any) {
      notifyRef.current('Caixa', err?.message || 'Falha ao carregar o resumo do caixa.', 'warning');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const isOpen = summary?.cashRegister?.status === 'open';
  const totals = summary?.totals;
  const checklistAllChecked = checklist.every(Boolean);

  /**
   * Emite o relatório de caixa (bate-caixa) para impressão.
   * A janela é aberta ANTES do await para não ser bloqueada por popup blockers;
   * busca o último turno aberto (ou o mais recente fechado) e suas movimentações.
   */
  const handlePrintReport = async () => {
    const win = window.open('', '_blank', 'width=860,height=1000');
    if (!win) {
      notifyRef.current('Caixa', 'O bloqueador de pop-ups impediu abrir o relatório.', 'warning');
      return;
    }
    win.document.write(
      '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>Relatório de Caixa</title></head>' +
        '<body style="font-family:monospace;padding:24px"><p>Carregando relatório…</p></body></html>',
    );
    win.document.close();
    try {
      const regsRes = await apiJson<{ success: boolean; registers: CashRegister[] }>('/api/caixa/');
      const registers = [...(regsRes.registers || [])].sort((a, b) => (b.openedAt < a.openedAt ? -1 : 1));
      const target = registers.find((r) => r.status === 'open') || registers[0];
      if (!target) {
        win.close();
        notifyRef.current('Caixa', 'Nenhum caixa (turno) encontrado para emitir o relatório.', 'warning');
        return;
      }
      const movRes = await apiJson<{ success: boolean; movements: CashMovement[] }>(
        `/api/caixa/${target.id}/movements`,
      );
      win.document.write(
        buildReportHtml({ company: companyProfile, register: target, movements: movRes.movements || [] }),
      );
      win.document.close();
      win.focus();
      win.print();
      notifyRef.current('Caixa', 'Relatório de caixa enviado para impressão.', 'success');
    } catch (err: any) {
      win.close();
      notifyRef.current('Caixa', err?.message || 'Falha ao gerar o relatório de caixa.', 'warning');
    }
  };

  const handleOpenRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseAmount(openingAmount);
    if (Number.isNaN(value) || value < 0) {
      notifyRef.current('Caixa', 'Informe um fundo de caixa válido.', 'warning');
      return;
    }
    setIsSaving(true);
    try {
      await apiJson('/api/caixa/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ openingAmount: value, notes: openingNotes.trim() || undefined }),
      });
      notifyRef.current('Caixa', `Caixa aberto com fundo de ${brl(value)}.`, 'success');
      setOpeningAmount('');
      setOpeningNotes('');
      await loadSummary();
    } catch (err: any) {
      notifyRef.current('Caixa', err?.message || 'Falha ao abrir o caixa.', 'warning');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRecordMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    const option = MOVEMENT_OPTIONS.find((o) => o.value === movOption);
    if (!option) return;
    const value = parseAmount(movAmount);
    if (Number.isNaN(value) || value <= 0) {
      notifyRef.current('Caixa', 'Informe um valor maior que zero.', 'warning');
      return;
    }
    let description = movDescription.trim();
    if (!description) {
      notifyRef.current('Caixa', 'Descreva a movimentação para a trilha de auditoria.', 'warning');
      return;
    }

    // Troco: em venda em dinheiro, confere o recebido e registra o troco devolvido.
    if (option.value === 'sale_cash') {
      const received = parseAmount(receivedAmount);
      if (Number.isNaN(received) || received < value) {
        notifyRef.current('Caixa', 'Valor recebido menor que o total da venda.', 'warning');
        return;
      }
      description += ` • Recebido: ${brl(received)} • Troco: ${brl(received - value)}`;
    }

    setIsSaving(true);
    try {
      await apiJson('/api/caixa/movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: option.value,
          paymentMethod: option.paymentMethod,
          amount: value,
          description,
        }),
      });
      notifyRef.current('Caixa', `${option.label} registrado: ${brl(value)}.`, 'success');
      setMovAmount('');
      setMovDescription('');
      setReceivedAmount('');
      await loadSummary();
    } catch (err: any) {
      notifyRef.current('Caixa', err?.message || 'Falha ao registrar a movimentação.', 'warning');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCloseRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseAmount(closingAmount);
    if (Number.isNaN(value) || value < 0) {
      notifyRef.current('Caixa', 'Informe o valor contado em conferência.', 'warning');
      return;
    }
    const expected = totals?.expected ?? 0;
    const difference = value - expected;
    setIsSaving(true);
    try {
      await apiJson('/api/caixa/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actualAmount: value, notes: closingNotes.trim() || undefined }),
      });
      notifyRef.current(
        'Caixa',
        `Caixa fechado. Contagem: ${brl(value)} • Diferença: ${brl(difference)}.`,
        difference === 0 ? 'success' : 'warning',
      );
      setClosingAmount('');
      setClosingNotes('');
      await loadSummary();
    } catch (err: any) {
      notifyRef.current('Caixa', err?.message || 'Falha ao fechar o caixa.', 'warning');
    } finally {
      setIsSaving(false);
    }
  };

  const cards: Array<{ label: string; value: number; tone: string }> = [
    { label: 'Fundo de caixa', value: totals?.opening ?? 0, tone: 'text-slate-100' },
    { label: 'Esperado', value: totals?.expected ?? 0, tone: 'text-emerald-400' },
    { label: 'Vendas dinheiro', value: totals?.salesCash ?? 0, tone: 'text-emerald-300' },
    { label: 'Vendas cartão', value: totals?.salesCard ?? 0, tone: 'text-sky-400' },
    { label: 'Vendas PIX', value: totals?.salesPix ?? 0, tone: 'text-violet-400' },
    { label: 'Vendas boleto', value: totals?.salesBoleto ?? 0, tone: 'text-amber-400' },
    { label: 'Vales / vouchers', value: totals?.salesVale ?? 0, tone: 'text-teal-400' },
    { label: 'Suprimentos', value: totals?.deposits ?? 0, tone: 'text-sky-300' },
    { label: 'Sangrias', value: totals?.withdrawals ?? 0, tone: 'text-rose-400' },
  ];

  const movements = summary?.todayMovements ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400" id="caixa-container">
        <RefreshCw className="w-5 h-5 animate-spin text-orange-400 mr-3" />
        <span className="text-sm font-semibold">Carregando caixa…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 animate-fadeIn" id="caixa-container">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-slate-900/90 border border-slate-800 p-5 rounded-3xl backdrop-blur-md shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-500/10 border border-orange-500/30 flex items-center justify-center text-[#EA580C] shadow-inner">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2.5 flex-wrap">
              Caixa (PDV)
              {isOpen ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-bold text-emerald-400">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  Caixa Aberto
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-[10px] font-bold text-amber-400">
                  <Lock className="w-3 h-3" />
                  Caixa Fechado
                </span>
              )}
            </h1>
            <p className="text-xs text-slate-400">
              {isOpen && summary?.cashRegister
                ? `Operador: ${summary.cashRegister.userName} • Aberto em ${fmtDateTime(summary.cashRegister.openedAt)}`
                : 'Abertura, movimentações e fechamento do turno de caixa'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <span className="px-2.5 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-[11px] font-bold text-slate-300">
            Boletos em aberto: <span className="text-amber-400">{summary?.openBoletos?.length ?? 0}</span>
          </span>
          <span className="px-2.5 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-[11px] font-bold text-slate-300">
            Pendências fiscais: <span className="text-rose-400">{summary?.pendingFiscal ?? 0}</span>
          </span>
          <button
            type="button"
            id="btn-relatorio-caixa"
            onClick={() => void handlePrintReport()}
            className="px-3.5 py-2 rounded-2xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
            title="Imprimir relatório de caixa (bate-caixa do turno)"
          >
            <Printer className="w-3.5 h-3.5 text-orange-400" />
            <span>Relatório</span>
          </button>
          <button
            type="button"
            id="btn-atualizar-caixa"
            onClick={() => void loadSummary()}
            className="px-3.5 py-2 rounded-2xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
            title="Atualizar resumo do caixa"
          >
            <RefreshCw className="w-3.5 h-3.5 text-orange-400" />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map((c) => (
          <div
            key={c.label}
            className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm"
          >
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{c.label}</p>
            <p className={`mt-1 text-lg font-black tabular-nums ${c.tone}`}>{brl(c.value)}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Histórico de movimentações */}
        <section className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
            <h2 className="text-sm font-black text-white flex items-center gap-2">
              <Unlock className="w-4 h-4 text-orange-400" />
              Movimentações do turno
            </h2>
            <span className="text-[11px] font-bold text-slate-500">{movements.length} registro(s)</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs" id="caixa-movements-table">
              <thead>
                <tr className="text-[10px] uppercase tracking-wide text-slate-500 border-b border-slate-800/80">
                  <th className="text-left font-bold px-5 py-2.5">Horário</th>
                  <th className="text-left font-bold px-3 py-2.5">Operação</th>
                  <th className="text-left font-bold px-3 py-2.5">Operador</th>
                  <th className="text-right font-bold px-3 py-2.5">Valor</th>
                </tr>
              </thead>
              <tbody>
                {movements.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-slate-500 font-medium">
                      Nenhuma movimentação registrada neste turno.
                    </td>
                  </tr>
                )}
                {movements.map((m) => {
                  const sign = movementSign(m);
                  return (
                    <tr key={m.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition">
                      <td className="px-5 py-2.5 text-slate-400 whitespace-nowrap tabular-nums">
                        {fmtDateTime(m.createdAt)}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="font-semibold text-slate-200">{movementLabel(m)}</span>
                        <span className="block text-[10px] text-slate-500 truncate max-w-[220px]" title={m.description}>
                          {m.description}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-slate-400 whitespace-nowrap">{m.userName}</td>
                      <td
                        className={`px-3 py-2.5 text-right font-black tabular-nums whitespace-nowrap ${
                          sign > 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {sign > 0 ? '+' : '−'} {brl(m.amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Painel de operação */}
        <section className="space-y-6">
          {!isOpen ? (
            <form
              onSubmit={handleOpenRegister}
              className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4"
            >
              <h2 className="text-sm font-black text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-400" />
                Abrir Caixa
              </h2>
              <div>
                <label className={labelClass} htmlFor="caixa-open-amount">Fundo de caixa (R$)</label>
                <input
                  id="caixa-open-amount"
                  type="text"
                  inputMode="decimal"
                  className={inputClass}
                  placeholder="Ex.: 200,00"
                  value={openingAmount}
                  onChange={(e) => setOpeningAmount(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="caixa-open-notes">Observações</label>
                <textarea
                  id="caixa-open-notes"
                  className={inputClass}
                  rows={2}
                  placeholder="Opcional — turno, operador, conferência inicial…"
                  value={openingNotes}
                  onChange={(e) => setOpeningNotes(e.target.value)}
                />
              </div>

              {/* Checklist de abertura do PDV (equipamentos + fundo) */}
              <div className="space-y-2">
                <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                  Checklist de abertura do PDV
                </span>
                {CHECKLIST_LABELS.map((label, i) => (
                  <label
                    key={label}
                    className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer select-none hover:text-white transition-colors"
                  >
                    <input
                      type="checkbox"
                      id={`caixa-check-${i}`}
                      checked={checklist[i]}
                      onChange={(e) =>
                        setChecklist((prev) => prev.map((v, idx) => (idx === i ? e.target.checked : v)))
                      }
                      className="w-4 h-4 rounded accent-orange-500 cursor-pointer"
                    />
                    {label}
                  </label>
                ))}
              </div>

              <button
                type="submit"
                id="btn-abrir-caixa"
                className={primaryButtonClass}
                disabled={isSaving || !checklistAllChecked}
              >
                {isSaving ? 'Abrindo…' : 'Abrir Caixa'}
              </button>
              {!checklistAllChecked && (
                <p className="text-[11px] font-semibold text-amber-400 text-center">
                  Marque todos os itens do checklist para abrir o caixa.
                </p>
              )}
            </form>
          ) : (
            <>
              <form
                onSubmit={handleRecordMovement}
                className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4"
              >
                <h2 className="text-sm font-black text-white">Registrar Movimentação</h2>
                <div>
                  <label className={labelClass} htmlFor="caixa-mov-option">Operação</label>
                  <select
                    id="caixa-mov-option"
                    className={inputClass}
                    value={movOption}
                    onChange={(e) => setMovOption(e.target.value)}
                  >
                    {MOVEMENT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value} className="bg-slate-900">
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass} htmlFor="caixa-mov-amount">Valor (R$)</label>
                  <input
                    id="caixa-mov-amount"
                    type="text"
                    inputMode="decimal"
                    className={inputClass}
                    placeholder="Ex.: 150,00"
                    value={movAmount}
                    onChange={(e) => setMovAmount(e.target.value)}
                    required
                  />
                </div>

                {/* Troco — somente para venda em dinheiro */}
                {movOption === 'sale_cash' && (
                  <div>
                    <label className={labelClass} htmlFor="caixa-mov-received">Valor recebido (R$)</label>
                    <input
                      id="caixa-mov-received"
                      type="text"
                      inputMode="decimal"
                      className={inputClass}
                      placeholder="Ex.: 200,00"
                      value={receivedAmount}
                      onChange={(e) => setReceivedAmount(e.target.value)}
                    />
                    {(() => {
                      const recv = parseAmount(receivedAmount);
                      const val = parseAmount(movAmount);
                      if (Number.isNaN(recv) || Number.isNaN(val)) return null;
                      const diff = recv - val;
                      return (
                        <p
                          className={`mt-1.5 text-xs font-black ${
                            diff >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {diff >= 0
                            ? `Troco a devolver: ${brl(diff)}`
                            : `Faltam ${brl(-diff)} do cliente`}
                        </p>
                      );
                    })()}
                  </div>
                )}
                <div>
                  <label className={labelClass} htmlFor="caixa-mov-description">Descrição</label>
                  <input
                    id="caixa-mov-description"
                    type="text"
                    className={inputClass}
                    placeholder="Ex.: Venda balcão — pedido 1234"
                    value={movDescription}
                    onChange={(e) => setMovDescription(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" id="btn-registrar-movimento" className={primaryButtonClass} disabled={isSaving}>
                  {isSaving ? 'Registrando…' : 'Registrar'}
                </button>
              </form>

              <form
                onSubmit={handleCloseRegister}
                className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4"
              >
                <h2 className="text-sm font-black text-white flex items-center gap-2">
                  <Unlock className="w-4 h-4 text-rose-400" />
                  Fechar Caixa
                </h2>
                <div className="px-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-slate-700/60 text-xs">
                  <span className="text-slate-400 font-semibold">Valor esperado em gaveta:</span>{' '}
                  <span className="text-emerald-400 font-black tabular-nums">{brl(totals?.expected ?? 0)}</span>
                </div>
                <div>
                  <label className={labelClass} htmlFor="caixa-close-amount">Valor contado (R$)</label>
                  <input
                    id="caixa-close-amount"
                    type="text"
                    inputMode="decimal"
                    className={inputClass}
                    placeholder="Ex.: 1.450,00"
                    value={closingAmount}
                    onChange={(e) => setClosingAmount(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="caixa-close-notes">Observações</label>
                  <textarea
                    id="caixa-close-notes"
                    className={inputClass}
                    rows={2}
                    placeholder="Opcional — justificativa de diferença, conferência…"
                    value={closingNotes}
                    onChange={(e) => setClosingNotes(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  id="btn-fechar-caixa"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-300 hover:text-white text-xs font-black border border-rose-500/30 transition cursor-pointer disabled:opacity-50"
                  disabled={isSaving}
                >
                  {isSaving ? 'Fechando…' : 'Fechar Caixa'}
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
};





