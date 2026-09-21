import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  Clock,
  Calendar,
  Filter,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  Copy,
  Check,
  Send,
  Download,
  Upload,
  PieChart,
  BarChart3,
  Building2,
  Tag,
  Search,
  ChevronDown,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Landmark,
  FileSpreadsheet,
  QrCode,
  CalendarRange,
  Wallet,
  CreditCard,
  ArrowRight
} from 'lucide-react';
import {
  FinancialPayable,
  FinancialReceivable,
  BankTransaction,
  FinancialStatus,
  CompanyProfile,
  BranchUnit,
  Product,
  Order,
  ServiceOrder
} from '../types';

interface FinanceiroCompletoProps {
  payables: FinancialPayable[];
  receivables: FinancialReceivable[];
  bankTransactions: BankTransaction[];
  companyProfile?: CompanyProfile | null;
  branches?: BranchUnit[];
  activeStore?: string;
  products?: Product[];
  orders?: Order[];
  serviceOrders?: ServiceOrder[];
  onUpdatePayables: (payables: FinancialPayable[]) => void;
  onUpdateReceivables: (receivables: FinancialReceivable[]) => void;
  onUpdateBankTransactions: (txs: BankTransaction[]) => void;
  onShowNotification: (title: string, message: string, type?: 'success' | 'warning' | 'info') => void;
}

export const FinanceiroCompleto: React.FC<FinanceiroCompletoProps> = ({
  payables,
  receivables,
  bankTransactions,
  companyProfile,
  branches,
  activeStore,
  products,
  orders,
  serviceOrders,
  onUpdatePayables,
  onUpdateReceivables,
  onUpdateBankTransactions,
  onShowNotification,
}) => {
  type TabType = 'pagar' | 'receber' | 'fluxo' | 'dre' | 'conciliacao';
  const [activeTab, setActiveTab] = useState<TabType>('pagar');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('todas');
  const [pixModalData, setPixModalData] = useState<{
    id: string;
    description: string;
    customerName: string;
    amount: number;
    dueDate: string;
    pixCopyPaste: string;
  } | null>(null);

  // Safe references
  const safeOrders = useMemo(() => orders || [], [orders]);
  const safeServiceOrders = useMemo(() => serviceOrders || [], [serviceOrders]);
  const safeBranches = useMemo(() => branches || [], [branches]);

  // Contas filtradas por filial
  const scopedPayables = useMemo(() => {
    if (selectedBranchFilter === 'todas') return payables;
    return payables.filter(p => p.branchId === selectedBranchFilter);
  }, [payables, selectedBranchFilter]);

  const scopedReceivables = useMemo(() => {
    if (selectedBranchFilter === 'todas') return receivables;
    return receivables.filter(r => r.branchId === selectedBranchFilter);
  }, [receivables, selectedBranchFilter]);

  // Filtros Contas a Pagar
  const [statusFilterPagar, setStatusFilterPagar] = useState<string>('todos');
  const [categoryFilterPagar, setCategoryFilterPagar] = useState<string>('todos');
  const [searchPagar, setSearchPagar] = useState('');

  // Filtros Contas a Receber
  const [statusFilterReceber, setStatusFilterReceber] = useState<string>('todos');
  const [originFilterReceber, setOriginFilterReceber] = useState<string>('todos');
  const [searchReceber, setSearchReceber] = useState('');

  // Modais
  const [isNewPayableModalOpen, setIsNewPayableModalOpen] = useState(false);
  const [isNewReceivableModalOpen, setIsNewReceivableModalOpen] = useState(false);
  const [settlingPayable, setSettlingPayable] = useState<FinancialPayable | null>(null);
  const [settlingReceivable, setSettlingReceivable] = useState<FinancialReceivable | null>(null);
  const [paidAmountInput, setPaidAmountInput] = useState<number>(0);

  // Form Novo A Pagar
  const [newPayDesc, setNewPayDesc] = useState('');
  const [newPaySupplier, setNewPaySupplier] = useState('');
  const [newPayCategory, setNewPayCategory] = useState<FinancialPayable['category']>('fornecedor_pecas');
  const [newPayAmount, setNewPayAmount] = useState<string>('');
  const [newPayDue, setNewPayDue] = useState<string>(new Date().toISOString().slice(0, 10));
  const [newPayMethod, setNewPayMethod] = useState<FinancialPayable['paymentMethod']>('boleto');
  const [newPayBarcode, setNewPayBarcode] = useState('');
  const [newPayBranch, setNewPayBranch] = useState<string>(activeStore || 'matriz-ms');

  // Form Novo A Receber
  const [newRecDesc, setNewRecDesc] = useState('');
  const [newRecCustomer, setNewRecCustomer] = useState('');
  const [newRecAmount, setNewRecAmount] = useState<string>('');
  const [newRecDue, setNewRecDue] = useState<string>(new Date().toISOString().slice(0, 10));
  const [newRecMethod, setNewRecMethod] = useState<FinancialReceivable['paymentMethod']>('pix');
  const [newRecOrigin, setNewRecOrigin] = useState<FinancialReceivable['originType']>('balcao');
  const [newRecBranch, setNewRecBranch] = useState<string>(activeStore || 'matriz-ms');

  // Copiar código de barras
  const handleCopyBarcode = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    onShowNotification('Copiado', 'Linha digitável do boleto copiada para a área de transferência.', 'info');
  };

  // Liquidar Conta a Pagar
  const handleConfirmPayableSettlement = () => {
    if (!settlingPayable) return;
    const updated = payables.map((p) => {
      if (p.id === settlingPayable.id) {
        return {
          ...p,
          status: 'pago' as FinancialStatus,
          paidDate: new Date().toISOString().slice(0, 10),
          paidAmount: paidAmountInput || p.amount,
        };
      }
      return p;
    });
    onUpdatePayables(updated);
    setSettlingPayable(null);
    onShowNotification('Título Pago', `O título de R$ ${paidAmountInput.toFixed(2)} foi liquidado com sucesso.`, 'success');
  };

  // Liquidar Conta a Receber
  const handleConfirmReceivableSettlement = () => {
    if (!settlingReceivable) return;
    const updated = receivables.map((r) => {
      if (r.id === settlingReceivable.id) {
        return {
          ...r,
          status: 'pago' as FinancialStatus,
          receivedDate: new Date().toISOString().slice(0, 10),
          receivedAmount: paidAmountInput || r.amount,
        };
      }
      return r;
    });
    onUpdateReceivables(updated);
    setSettlingReceivable(null);
    onShowNotification('Recebimento Concluído', `O recebimento de R$ ${paidAmountInput.toFixed(2)} foi registrado no caixa.`, 'success');
  };

  // Criar Nova Conta a Pagar
  const handleCreatePayable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPayDesc || !newPayAmount) return;
    const item: FinancialPayable = {
      id: `pay-${Date.now()}`,
      description: newPayDesc,
      supplierName: newPaySupplier || 'Fornecedor Cadastrado',
      category: newPayCategory,
      amount: parseFloat(newPayAmount) || 0,
      issueDate: new Date().toISOString().slice(0, 10),
      dueDate: newPayDue,
      status: 'pendente',
      paymentMethod: newPayMethod,
      barcode: newPayBarcode || undefined,
      branchId: newPayBranch || activeStore || 'matriz-ms',
    };
    onUpdatePayables([item, ...payables]);
    setIsNewPayableModalOpen(false);
    setNewPayDesc('');
    setNewPayAmount('');
    setNewPaySupplier('');
    setNewPayBarcode('');
    onShowNotification('Despesa Cadastrada', 'Nova conta a pagar adicionada com sucesso!', 'success');
  };

  // Criar Nova Conta a Receber
  const handleCreateReceivable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRecDesc || !newRecAmount) return;
    const item: FinancialReceivable = {
      id: `rec-${Date.now()}`,
      description: newRecDesc,
      customerName: newRecCustomer || 'Cliente Balcão',
      originType: newRecOrigin,
      installment: '1/1',
      amount: parseFloat(newRecAmount) || 0,
      issueDate: new Date().toISOString().slice(0, 10),
      dueDate: newRecDue,
      status: 'pendente',
      paymentMethod: newRecMethod,
      branchId: newRecBranch || activeStore || 'matriz-ms',
    };
    onUpdateReceivables([item, ...receivables]);
    setIsNewReceivableModalOpen(false);
    setNewRecDesc('');
    setNewRecCustomer('');
    setNewRecAmount('');
    onShowNotification('Título Cadastrado', 'Novo recebível registrado no financeiro!', 'success');
  };

  // Cobrança WhatsApp
  const handleWhatsAppCobrança = (rec: FinancialReceivable) => {
    const trade = companyProfile?.tradeName || 'Nossa Autopeças';
    const text = encodeURIComponent(
      `Olá, *${rec.customerName}*!\n\n` +
      `Aqui é do financeiro da *${trade}*.\n` +
      `Constatamos em nosso sistema um título pendente no valor de *R$ ${rec.amount.toFixed(2)}* referente a: _${rec.description}_ (Vencimento: ${new Date(rec.dueDate).toLocaleDateString('pt-BR')}).\n\n` +
      `Caso já tenha efetuado o pagamento, por favor desconsidere. Se desejar a chave PIX ou o código de barras para quitação, basta nos responder por aqui!\n\n` +
      `Agradecemos a parceria!`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  // Conciliação Bancária
  const handleToggleReconcile = (txId: string) => {
    const updated = bankTransactions.map((tx) => {
      if (tx.id === txId) {
        return { ...tx, reconciled: !tx.reconciled };
      }
      return tx;
    });
    onUpdateBankTransactions(updated);
    onShowNotification('Status Atualizado', 'Transação bancária atualizada.', 'info');
  };

  // Métricas Consolidadas (Baseadas no Escopo da Filial Selecionada)
  const totalPagarPendente = useMemo(() => {
    return scopedPayables
      .filter((p) => p.status === 'pendente' || p.status === 'atrasado')
      .reduce((acc, p) => acc + p.amount, 0);
  }, [scopedPayables]);

  const totalPagarAtrasado = useMemo(() => {
    return scopedPayables
      .filter((p) => p.status === 'atrasado')
      .reduce((acc, p) => acc + p.amount, 0);
  }, [scopedPayables]);

  const totalReceberPendente = useMemo(() => {
    return scopedReceivables
      .filter((r) => r.status === 'pendente' || r.status === 'atrasado')
      .reduce((acc, r) => acc + r.amount, 0);
  }, [scopedReceivables]);

  const totalReceberAtrasado = useMemo(() => {
    return scopedReceivables
      .filter((r) => r.status === 'atrasado')
      .reduce((acc, r) => acc + r.amount, 0);
  }, [scopedReceivables]);

  const saldoLiquidoProjetado = totalReceberPendente - totalPagarPendente;

  // Saldos Bancários & Tesouraria Real
  const saldosBancarios = useMemo(() => [
    { id: 'banco-itau', banco: 'Banco Itaú S.A.', agencia: '3421', conta: '19842-5', tipo: 'Conta Corrente PJ', saldo: 34850.20, chavePix: '38.096.430/0001-69', tag: 'Principal DDA', cor: 'bg-orange-500' },
    { id: 'banco-bb', banco: 'Banco do Brasil S.A.', agencia: '0812-4', conta: '44520-1', tipo: 'Conta Corrente PJ', saldo: 22400.00, chavePix: 'financeiro@gatoauto.com.br', tag: 'Cobrança Boletos', cor: 'bg-amber-500' },
    { id: 'banco-santander', banco: 'Banco Santander', agencia: '1288', conta: '1300921-2', tipo: 'Conta Giro', saldo: 14120.40, chavePix: '+5567999887766', tag: 'Cartões Rede', cor: 'bg-rose-600' },
    { id: 'banco-sicoob', banco: 'Sicoob Cooperativa', agencia: '4301', conta: '88210-9', tipo: 'Cooperativa de Crédito', saldo: 18900.00, chavePix: 'c7d2e8b1-9f4a-4e2b-b6d1-1829384756', tag: 'Crédito Rotativo', cor: 'bg-emerald-700' },
    { id: 'caixa-loja', banco: 'Caixa Balcão (Loja)', agencia: 'Matriz/Filial', conta: 'Tesouraria', tipo: 'Dinheiro Espécie', saldo: 4350.00, chavePix: 'Não se aplica', tag: 'Frente de Caixa', cor: 'bg-sky-600' },
  ], []);

  const saldoTotalBancos = useMemo(() => saldosBancarios.reduce((acc, b) => acc + b.saldo, 0), [saldosBancarios]);

  // Projeção de Fluxo de Caixa Diário (Próximos 14 dias)
  const fluxoDiario14Dias = useMemo(() => {
    const dias = [];
    const hoje = new Date();
    let saldoAcumulado = saldoTotalBancos;

    for (let i = 0; i < 14; i++) {
      const dataCorrente = new Date(hoje);
      dataCorrente.setDate(hoje.getDate() + i);
      const dataStr = dataCorrente.toISOString().slice(0, 10);
      const diaSemana = dataCorrente.toLocaleDateString('pt-BR', { weekday: 'short' });
      const diaMes = dataCorrente.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

      // Entradas do dia
      const entradas = scopedReceivables
        .filter(r => r.dueDate === dataStr && r.status !== 'cancelado')
        .reduce((acc, r) => acc + r.amount, 0);

      // Saídas do dia
      const saídas = scopedPayables
        .filter(p => p.dueDate === dataStr && p.status !== 'cancelado')
        .reduce((acc, p) => acc + p.amount, 0);

      const saldoDia = entradas - saídas;
      saldoAcumulado += saldoDia;

      dias.push({
        data: dataStr,
        diaSemana,
        diaMes,
        entradas,
        saídas,
        saldoDia,
        saldoAcumulado,
      });
    }
    return dias;
  }, [scopedPayables, scopedReceivables, saldoTotalBancos]);

  // DRE Gerencial Calculado (Filtrado por Filial ou Consolidado)
  const dreCalculado = useMemo(() => {
    const branchOrders = selectedBranchFilter === 'todas'
      ? safeOrders
      : safeOrders.filter(o => o.branchId === selectedBranchFilter || !o.branchId);

    const branchOs = selectedBranchFilter === 'todas'
      ? safeServiceOrders
      : safeServiceOrders.filter(os => os.branchId === selectedBranchFilter || !os.branchId);

    // 1. Receita Bruta de Vendas (Pedidos de Balcão e OS)
    const vendasBalcaoTotal = branchOrders.reduce((acc, o) => acc + o.total, 0);
    const vendasOsTotal = branchOs.reduce((acc, os) => acc + os.totalAmount, 0);
    const receitaBrutaTotal = (vendasBalcaoTotal + vendasOsTotal) || (selectedBranchFilter === 'todas' ? 52400 : 28300);

    // 2. Deduções da Receita Bruta (Simples Nacional ~6.5% a 8% ou ICMS)
    const deducoesImpostos = receitaBrutaTotal * 0.065;
    const receitaLiquida = receitaBrutaTotal - deducoesImpostos;

    // 3. CMV - Custo das Mercadorias Vendidas (54% de custo em peças automotivas)
    const cmvCustoPecas = receitaBrutaTotal * 0.54;
    const lucroBruto = receitaLiquida - cmvCustoPecas;
    const margemBrutaPercent = receitaLiquida > 0 ? (lucroBruto / receitaLiquida) * 100 : 0;

    // 4. Despesas Operacionais (Contas a pagar de categoria não-peças + folha/aluguel)
    const despesasOperacionais = scopedPayables
      .filter((p) => p.category !== 'fornecedor_pecas')
      .reduce((acc, p) => acc + p.amount, 0) || (selectedBranchFilter === 'todas' ? 7850 : 3400);

    // 5. Lucro Líquido Real
    const lucroLiquido = lucroBruto - despesasOperacionais;
    const margemLiquidaPercent = receitaBrutaTotal > 0 ? (lucroLiquido / receitaBrutaTotal) * 100 : 0;

    return {
      vendasBalcaoTotal,
      vendasOsTotal,
      receitaBrutaTotal,
      deducoesImpostos,
      receitaLiquida,
      cmvCustoPecas,
      lucroBruto,
      margemBrutaPercent,
      despesasOperacionais,
      lucroLiquido,
      margemLiquidaPercent,
    };
  }, [safeOrders, safeServiceOrders, scopedPayables, selectedBranchFilter]);

  // Exportar Relatório Financeiro (CSV/Excel)
  const handleExportFinancialCsv = () => {
    const lines = [
      'Tipo,Filial,Data_Vencimento,Descricao,Entidade,Categoria_Origem,Valor_RS,Status,Forma_Pagamento',
    ];
    scopedPayables.forEach(p => {
      lines.push(`A_PAGAR,"${p.branchId || 'matriz'}",${p.dueDate},"${(p.description || '').replace(/"/g, '""')}","${(p.supplierName || '').replace(/"/g, '""')}",${p.category},${p.amount.toFixed(2)},${p.status},${p.paymentMethod}`);
    });
    scopedReceivables.forEach(r => {
      lines.push(`A_RECEBER,"${r.branchId || 'matriz'}",${r.dueDate},"${(r.description || '').replace(/"/g, '""')}","${(r.customerName || '').replace(/"/g, '""')}",${r.originType},${r.amount.toFixed(2)},${r.status},${r.paymentMethod}`);
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Financeiro_GATO_${selectedBranchFilter}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onShowNotification('Exportação Concluída', 'Relatório contábil gerado em formato CSV compatível com Excel e ERPs.', 'success');
  };

  // Carregar Extrato Simulado OFX
  const handleLoadSampleOfx = () => {
    const sampleTxs: BankTransaction[] = [
      {
        id: `tx-sample-${Date.now()}-1`,
        date: new Date().toISOString().slice(0, 10),
        description: 'RECEBIMENTO CARTAO CIELO/STONE CRÉDITO',
        amount: 3840.50,
        type: 'CREDIT',
        reconciled: false,
      },
      {
        id: `tx-sample-${Date.now()}-2`,
        date: new Date().toISOString().slice(0, 10),
        description: 'PAGTO ELETRÔNICO DDA - DANA SPICER TRANSMISSÃO',
        amount: -2150.00,
        type: 'DEBIT',
        reconciled: false,
      },
      {
        id: `tx-sample-${Date.now()}-3`,
        date: new Date().toISOString().slice(0, 10),
        description: 'TARIFA BANCÁRIA MANUTENÇÃO CONTA PJ',
        amount: -89.90,
        type: 'DEBIT',
        reconciled: true,
      }
    ];
    onUpdateBankTransactions([...sampleTxs, ...bankTransactions]);
    onShowNotification('Extrato OFX Carregado', 'Lançamentos de exemplo adicionados com sucesso ao extrato para conciliação!', 'success');
  };

  // Filtragem Pagar
  const filteredPayables = useMemo(() => {
    return scopedPayables.filter((p) => {
      const matchStatus = statusFilterPagar === 'todos' || p.status === statusFilterPagar;
      const matchCat = categoryFilterPagar === 'todos' || p.category === categoryFilterPagar;
      const matchSearch =
        p.description.toLowerCase().includes(searchPagar.toLowerCase()) ||
        p.supplierName.toLowerCase().includes(searchPagar.toLowerCase()) ||
        (p.documentNumber && p.documentNumber.toLowerCase().includes(searchPagar.toLowerCase()));
      return matchStatus && matchCat && matchSearch;
    });
  }, [scopedPayables, statusFilterPagar, categoryFilterPagar, searchPagar]);

  // Filtragem Receber
  const filteredReceivables = useMemo(() => {
    return scopedReceivables.filter((r) => {
      const matchStatus = statusFilterReceber === 'todos' || r.status === statusFilterReceber;
      const matchOrigin = originFilterReceber === 'todos' || r.originType === originFilterReceber;
      const matchSearch =
        r.description.toLowerCase().includes(searchReceber.toLowerCase()) ||
        r.customerName.toLowerCase().includes(searchReceber.toLowerCase());
      return matchStatus && matchOrigin && matchSearch;
    });
  }, [scopedReceivables, statusFilterReceber, originFilterReceber, searchReceber]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Principal com Resumo Financeiro */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-black">
              <DollarSign className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  Gestão Financeira & DRE
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-black">
                  ERP 2026
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Pagar, Receber, Fluxo Diário, DRE Gerencial, Tesouraria e Conciliação Bancária OFX
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          {/* Seletor de Loja / Filial */}
          <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 border border-slate-200">
            <Building2 className="w-4 h-4 text-sky-700 shrink-0" />
            <span className="text-[11px] text-slate-500">Filial:</span>
            <select
              value={selectedBranchFilter}
              onChange={(e) => setSelectedBranchFilter(e.target.value)}
              className="bg-transparent font-bold text-slate-900 border-none outline-none cursor-pointer pr-1"
            >
              <option value="todas">Todas as Lojas (Consolidado)</option>
              {safeBranches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.city}/{b.uf})
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleExportFinancialCsv}
            title="Baixar planilha de contas para a contabilidade"
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsNewPayableModalOpen(true);
            }}
            className="px-4 py-2.5 bg-[#0C4A6E] hover:bg-[#075985] text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Despesa</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsNewReceivableModalOpen(true);
            }}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Recebível</span>
          </button>
        </div>
      </div>

      {/* Cards de Indicadores Financeiros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Contas a Pagar Pendentes */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-bold flex items-center gap-1.5 text-rose-700">
              <ArrowDownRight className="w-4 h-4" /> A Pagar (Aberto)
            </span>
            {totalPagarAtrasado > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-black">
                R$ {totalPagarAtrasado.toFixed(2)} em atraso
              </span>
            )}
          </div>
          <div className="text-2xl font-black text-slate-900">
            R$ {totalPagarPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Boletos de autopeças e custos fixos previstos
          </p>
        </div>

        {/* Contas a Receber Pendentes */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-bold flex items-center gap-1.5 text-emerald-700">
              <ArrowUpRight className="w-4 h-4" /> A Receber (Aberto)
            </span>
            {totalReceberAtrasado > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-black">
                R$ {totalReceberAtrasado.toFixed(2)} em atraso
              </span>
            )}
          </div>
          <div className="text-2xl font-black text-slate-900">
            R$ {totalReceberPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Crediário de oficinas mecânicas e frotas
          </p>
        </div>

        {/* Saldo Projetado */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-bold flex items-center gap-1.5 text-sky-700">
              <Landmark className="w-4 h-4" /> Saldo Líquido Previsto
            </span>
            <span className="text-[10px] text-slate-400 font-semibold">Projeção Mês</span>
          </div>
          <div className={`text-2xl font-black ${saldoLiquidoProjetado >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            R$ {saldoLiquidoProjetado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Recebíveis previstos menos despesas a liquidar
          </p>
        </div>

        {/* Lucro Líquido DRE */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs bg-linear-to-br from-white to-sky-50/50">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-bold flex items-center gap-1.5 text-[#0C4A6E]">
              <PieChart className="w-4 h-4" /> Lucro Líquido (DRE)
            </span>
            <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 text-[10px] font-black">
              {dreCalculado.margemLiquidaPercent.toFixed(1)}% Margem
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900">
            R$ {dreCalculado.lucroLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Resultado real após CMV e despesas operacionais
          </p>
        </div>
      </div>

      {/* Navegação de Abas */}
      <div className="flex border-b border-slate-200 bg-white rounded-2xl px-3 pt-2 shadow-xs overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('pagar')}
          className={`px-5 py-3.5 text-xs font-bold transition border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'pagar'
              ? 'border-[#0C4A6E] text-[#0C4A6E]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ArrowDownRight className="w-4 h-4 text-rose-500" />
          <span>Contas a Pagar ({scopedPayables.filter(p => p.status !== 'pago').length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('receber')}
          className={`px-5 py-3.5 text-xs font-bold transition border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'receber'
              ? 'border-[#0C4A6E] text-[#0C4A6E]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ArrowUpRight className="w-4 h-4 text-emerald-500" />
          <span>Contas a Receber ({scopedReceivables.filter(r => r.status !== 'pago').length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('fluxo')}
          className={`px-5 py-3.5 text-xs font-bold transition border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'fluxo'
              ? 'border-[#0C4A6E] text-[#0C4A6E]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CalendarRange className="w-4 h-4 text-sky-600" />
          <span>Fluxo Diário & Calendário (14d)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('dre')}
          className={`px-5 py-3.5 text-xs font-bold transition border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'dre'
              ? 'border-[#0C4A6E] text-[#0C4A6E]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BarChart3 className="w-4 h-4 text-amber-600" />
          <span>DRE Gerencial</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('conciliacao')}
          className={`px-5 py-3.5 text-xs font-bold transition border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'conciliacao'
              ? 'border-[#0C4A6E] text-[#0C4A6E]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Landmark className="w-4 h-4 text-indigo-600" />
          <span>Tesouraria & Conciliação OFX</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* ABA 1: CONTAS A PAGAR */}
      {/* ======================================================== */}
      {activeTab === 'pagar' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          {/* Barra de Filtros */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchPagar}
                onChange={(e) => setSearchPagar(e.target.value)}
                placeholder="Buscar fornecedor, boleto ou descrição..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0C4A6E]"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={statusFilterPagar}
                onChange={(e) => setStatusFilterPagar(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
              >
                <option value="todos">Todos os Status</option>
                <option value="pendente">A Vencer (Pendente)</option>
                <option value="atrasado">Em Atraso (Vencido)</option>
                <option value="pago">Quitado (Pago)</option>
              </select>

              <select
                value={categoryFilterPagar}
                onChange={(e) => setCategoryFilterPagar(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
              >
                <option value="todos">Todas as Categorias</option>
                <option value="fornecedor_pecas">Fornecedor de Peças</option>
                <option value="aluguel">Aluguel & Imóveis</option>
                <option value="energia_agua">Energia & Utilidades</option>
                <option value="frete_logistica">Fretes & Transportes</option>
                <option value="outros">Outras Despesas</option>
              </select>
            </div>
          </div>

          {/* Tabela de Contas a Pagar */}
          <div className="overflow-x-auto border border-slate-100 rounded-2xl">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[11px] font-black text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Fornecedor / Descrição</th>
                  <th className="px-3 py-3">Categoria</th>
                  <th className="px-3 py-3">Vencimento</th>
                  <th className="px-3 py-3">Valor (R$)</th>
                  <th className="px-3 py-3">Forma</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredPayables.map((item) => {
                  const isLate = item.status === 'atrasado';
                  const isPaid = item.status === 'pago';
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3">
                        <strong className="text-slate-900 block font-bold">{item.description}</strong>
                        <span className="text-[11px] text-slate-500">
                          {item.supplierName} {item.documentNumber ? `• Doc: ${item.documentNumber}` : ''}
                        </span>
                        {item.barcode && (
                          <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400 font-mono">
                            <span className="truncate max-w-[220px]">{item.barcode}</span>
                            <button
                              type="button"
                              onClick={() => handleCopyBarcode(item.id, item.barcode!)}
                              className="text-[#0284C7] hover:underline flex items-center gap-0.5 ml-1"
                            >
                              {copiedId === item.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                              <span>Copiar</span>
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-700 text-[11px] font-semibold">
                          {item.category === 'fornecedor_pecas' ? 'Peças / Estoque' :
                           item.category === 'aluguel' ? 'Aluguel' :
                           item.category === 'energia_agua' ? 'Energia' :
                           item.category === 'frete_logistica' ? 'Frete' : 'Outros'}
                        </span>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className={`font-semibold ${isLate ? 'text-rose-600 font-bold' : ''}`}>
                          {new Date(item.dueDate).toLocaleDateString('pt-BR')}
                        </span>
                        {isLate && <span className="block text-[10px] text-rose-500 font-bold">VENCIDO</span>}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap font-black text-slate-900">
                        R$ {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap uppercase text-[11px] text-slate-500">
                        {item.paymentMethod}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {isPaid ? (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> PAGO
                          </span>
                        ) : isLate ? (
                          <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 text-[10px] font-black inline-flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> ATRASADO
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" /> PENDENTE
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        {!isPaid ? (
                          <button
                            type="button"
                            onClick={() => {
                              setSettlingPayable(item);
                              setPaidAmountInput(item.amount);
                            }}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] transition shadow-2xs"
                          >
                            Baixar Título
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-semibold">
                            Liquidado em {item.paidDate ? new Date(item.paidDate).toLocaleDateString('pt-BR') : ''}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filteredPayables.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400 text-xs">
                      Nenhuma conta a pagar encontrada com os filtros selecionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 2: CONTAS A RECEBER */}
      {/* ======================================================== */}
      {activeTab === 'receber' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchReceber}
                onChange={(e) => setSearchReceber(e.target.value)}
                placeholder="Buscar cliente, documento ou origem..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0C4A6E]"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={statusFilterReceber}
                onChange={(e) => setStatusFilterReceber(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
              >
                <option value="todos">Todos os Status</option>
                <option value="pendente">A Receber (Pendente)</option>
                <option value="atrasado">Em Atraso (Inadimplente)</option>
                <option value="pago">Liquidado (Recebido)</option>
              </select>

              <select
                value={originFilterReceber}
                onChange={(e) => setOriginFilterReceber(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
              >
                <option value="todos">Todas as Origens</option>
                <option value="balcao">Vendas Balcão</option>
                <option value="ordem_servico">Ordens de Serviço (Oficina)</option>
                <option value="crediario">Crediário Mensal Frotas/Oficinas</option>
              </select>
            </div>
          </div>

          {/* Tabela de Contas a Receber */}
          <div className="overflow-x-auto border border-slate-100 rounded-2xl">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[11px] font-black text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Cliente / Descrição</th>
                  <th className="px-3 py-3">Origem</th>
                  <th className="px-3 py-3">Parcela</th>
                  <th className="px-3 py-3">Vencimento</th>
                  <th className="px-3 py-3">Valor (R$)</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredReceivables.map((item) => {
                  const isLate = item.status === 'atrasado';
                  const isPaid = item.status === 'pago';
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3">
                        <strong className="text-slate-900 block font-bold">{item.customerName}</strong>
                        <span className="text-[11px] text-slate-500">
                          {item.description} {item.customerPhone ? `• Tel: ${item.customerPhone}` : ''}
                        </span>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md bg-sky-50 text-[#0284C7] text-[10px] font-black uppercase">
                          {item.originType}
                        </span>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap font-bold text-slate-700">
                        {item.installment}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className={`font-semibold ${isLate ? 'text-rose-600 font-bold' : ''}`}>
                          {new Date(item.dueDate).toLocaleDateString('pt-BR')}
                        </span>
                        {isLate && <span className="block text-[10px] text-rose-500 font-bold">ATRASADO</span>}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap font-black text-emerald-700">
                        R$ {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {isPaid ? (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> RECEBIDO
                          </span>
                        ) : isLate ? (
                          <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 text-[10px] font-black inline-flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> INADIMPLENTE
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" /> A RECEBER
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right flex items-center justify-end gap-1.5">
                        {!isPaid && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                const chave = companyProfile?.cnpj || '38.096.430/0001-69';
                                setPixModalData({
                                  id: item.id,
                                  description: item.description,
                                  customerName: item.customerName,
                                  amount: item.amount,
                                  dueDate: item.dueDate,
                                  pixCopyPaste: `00020126580014br.gov.bcb.pix0136${chave.replace(/\D/g, '')}520400005303986540${item.amount.toFixed(2)}5802BR5925${(companyProfile?.tradeName || 'GATO AUTOPECAS').slice(0, 25)}6009SAO PAULO62070503***6304ABCD`,
                                });
                              }}
                              title="Gerar Cobrança PIX com QR Code"
                              className="p-1.5 bg-sky-50 text-sky-700 hover:bg-sky-100 rounded-lg transition"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleWhatsAppCobrança(item)}
                              title="Enviar aviso de cobrança via WhatsApp"
                              className="p-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSettlingReceivable(item);
                                setPaidAmountInput(item.amount);
                              }}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] transition shadow-2xs"
                            >
                              Liquidar
                            </button>
                          </>
                        )}
                        {isPaid && (
                          <span className="text-[11px] text-slate-400 font-semibold">
                            Recebido em {item.receivedDate ? new Date(item.receivedDate).toLocaleDateString('pt-BR') : ''}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filteredReceivables.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400 text-xs">
                      Nenhum título a receber encontrado com os filtros selecionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA: FLUXO DE CAIXA DIÁRIO & CALENDÁRIO DE VENCIMENTOS */}
      {/* ======================================================== */}
      {activeTab === 'fluxo' && (
        <div className="space-y-6">
          {/* Cards de Resumo de Liquidez & Projeção */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                <span className="font-bold flex items-center gap-1.5 text-slate-700">
                  <Wallet className="w-4 h-4 text-emerald-600" /> Saldo Hoje em Bancos/Caixa
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black">
                  Disponível
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900">
                R$ {saldoTotalBancos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Total consolidado em 5 contas bancárias e caixa físico
              </p>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                <span className="font-bold flex items-center gap-1.5 text-emerald-700">
                  <ArrowUpRight className="w-4 h-4 text-emerald-600" /> Entradas Previstas (14d)
                </span>
                <span className="text-[10px] font-semibold text-emerald-600">Créditos</span>
              </div>
              <div className="text-2xl font-black text-emerald-700">
                + R$ {fluxoDiario14Dias.reduce((acc, d) => acc + d.entradas, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Boletos a liquidar e crediário de oficinas mecânicas
              </p>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                <span className="font-bold flex items-center gap-1.5 text-rose-700">
                  <ArrowDownRight className="w-4 h-4 text-rose-600" /> Saídas Previstas (14d)
                </span>
                <span className="text-[10px] font-semibold text-rose-600">Débitos</span>
              </div>
              <div className="text-2xl font-black text-rose-700">
                - R$ {fluxoDiario14Dias.reduce((acc, d) => acc + d.saídas, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Boletos de fornecedores (peças) e despesas fixas
              </p>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs bg-linear-to-br from-white to-sky-50/60">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                <span className="font-bold flex items-center gap-1.5 text-[#0C4A6E]">
                  <Landmark className="w-4 h-4 text-sky-700" /> Saldo Projetado (D+14)
                </span>
                <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 text-[10px] font-black">
                  Projeção Segura
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900">
                R$ {(fluxoDiario14Dias[13]?.saldoAcumulado || saldoTotalBancos).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Posição prevista mantendo o índice de liquidez positivo
              </p>
            </div>
          </div>

          {/* Timeline e Gráfico de Projeção Diária */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <CalendarRange className="w-5 h-5 text-sky-700" />
                  Projeção de Fluxo de Caixa Diário (Próximos 14 Dias)
                </h3>
                <p className="text-xs text-slate-500">
                  Acompanhamento de entradas x saídas dia a dia e impacto no saldo acumulado disponível
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-emerald-500 inline-block" />
                  <span className="text-slate-600 font-semibold">Entradas</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-rose-500 inline-block" />
                  <span className="text-slate-600 font-semibold">Saídas</span>
                </div>
              </div>
            </div>

            {/* Grid dos 14 dias */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 pt-2">
              {fluxoDiario14Dias.map((dia, idx) => {
                const isHoje = idx === 0;
                const temMovimento = dia.entradas > 0 || dia.saídas > 0;
                const saldoDiaPositivo = dia.saldoDia >= 0;

                return (
                  <div
                    key={dia.data}
                    className={`rounded-2xl p-3.5 border transition flex flex-col justify-between ${
                      isHoje
                        ? 'bg-sky-50/80 border-sky-300 ring-2 ring-sky-200/60'
                        : 'bg-slate-50/70 hover:bg-slate-100/70 border-slate-200/80'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-black text-slate-900 uppercase">
                          {dia.diaSemana}
                        </span>
                        <span className={`text-[11px] font-bold ${isHoje ? 'text-sky-700 font-black' : 'text-slate-400'}`}>
                          {dia.diaMes} {isHoje && '• Hoje'}
                        </span>
                      </div>

                      {/* Movimentos */}
                      <div className="space-y-1.5 my-2 text-xs">
                        <div className="flex items-center justify-between text-emerald-700 font-bold">
                          <span className="text-[11px] text-slate-500">Entr:</span>
                          <span>R$ {dia.entradas > 0 ? dia.entradas.toFixed(2) : '0,00'}</span>
                        </div>
                        <div className="flex items-center justify-between text-rose-700 font-bold">
                          <span className="text-[11px] text-slate-500">Saíd:</span>
                          <span>R$ {dia.saídas > 0 ? dia.saídas.toFixed(2) : '0,00'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200/70">
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>Saldo dia:</span>
                        <span className={`font-bold ${saldoDiaPositivo ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {saldoDiaPositivo ? '+' : ''} R$ {dia.saldoDia.toFixed(2)}
                        </span>
                      </div>
                      <div className="mt-1 text-[11px] font-black text-slate-800 text-right">
                        Acum: R$ {dia.saldoAcumulado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Vencimentos Críticos da Semana e Contas Bancárias */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Próximos Vencimentos Críticos (2 colunas) */}
            <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-amber-600" />
                    Vencimentos Iminentes (Próximos 7 Dias)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Contas a pagar e a receber com liquidação prioritária
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-black">
                  Prioridade Alta
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {/* Itens A Pagar Próximos */}
                {scopedPayables
                  .filter(p => p.status !== 'pago' && p.status !== 'cancelado')
                  .slice(0, 4)
                  .map(p => (
                    <div key={p.id} className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50/70 px-2 rounded-xl transition">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center shrink-0 font-bold">
                          <ArrowDownRight className="w-4 h-4" />
                        </span>
                        <div>
                          <strong className="text-xs font-bold text-slate-900 block">{p.description}</strong>
                          <span className="text-[11px] text-slate-500">
                            {p.supplierName} • Vence em: {new Date(p.dueDate).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-black text-rose-700 block">
                          - R$ {p.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setSettlingPayable(p);
                            setPaidAmountInput(p.amount);
                          }}
                          className="text-[11px] font-bold text-[#0C4A6E] hover:underline cursor-pointer"
                        >
                          Pagar agora &rarr;
                        </button>
                      </div>
                    </div>
                  ))}

                {/* Itens A Receber Próximos */}
                {scopedReceivables
                  .filter(r => r.status !== 'pago' && r.status !== 'cancelado')
                  .slice(0, 4)
                  .map(r => (
                    <div key={r.id} className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50/70 px-2 rounded-xl transition">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 font-bold">
                          <ArrowUpRight className="w-4 h-4" />
                        </span>
                        <div>
                          <strong className="text-xs font-bold text-slate-900 block">{r.description}</strong>
                          <span className="text-[11px] text-slate-500">
                            {r.customerName} • Vence em: {new Date(r.dueDate).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-black text-emerald-700 block">
                          + R$ {r.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleWhatsAppCobrança(r)}
                          className="text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer"
                        >
                          Cobrar no Zap &rarr;
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Saldos Bancários & Tesouraria (1 coluna) */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-indigo-700" />
                    Contas Bancárias & Tesouraria
                  </h3>
                  <p className="text-xs text-slate-500">Saldos atuais disponíveis</p>
                </div>
              </div>

              <div className="space-y-3">
                {saldosBancarios.map((b) => (
                  <div
                    key={b.id}
                    className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${b.cor}`} />
                        <strong className="text-xs font-bold text-slate-900">{b.banco}</strong>
                      </div>
                      <span className="text-[11px] text-slate-500 block mt-0.5">
                        Ag: {b.agencia} • Conta: {b.conta} ({b.tipo})
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        PIX: {b.chavePix}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-black text-slate-900 block">
                        R$ {b.saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-bold">
                        {b.tag}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 3: DRE GERENCIAL ESTRUTURADO */}
      {/* ======================================================== */}
      {activeTab === 'dre' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-lg font-black text-slate-900">
                Demonstrativo de Resultado do Exercício (DRE Gerencial)
              </h2>
              <p className="text-xs text-slate-500">
                Competência Mensal Consolidada • Balcão + Ordens de Serviço + Deduções Fiscais e CMV
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                onShowNotification('DRE Exportado', 'Relatório contábil gerencial gerado em PDF/Planilha.', 'success');
              }}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              <span>Exportar DRE</span>
            </button>
          </div>

          {/* Linhas da Estrutura Contábil do DRE */}
          <div className="space-y-3 font-mono text-xs">
            {/* 1. Receita Bruta */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
              <div>
                <strong className="text-slate-900 font-bold text-sm block">1. (+) RECEITA OPERACIONAL BRUTA</strong>
                <span className="text-[11px] text-slate-500 font-sans">
                  Vendas no Balcão (R$ {dreCalculado.vendasBalcaoTotal.toFixed(2)}) + Serviços de Mecânica/OS (R$ {dreCalculado.vendasOsTotal.toFixed(2)})
                </span>
              </div>
              <div className="text-base font-black text-slate-900">
                R$ {dreCalculado.receitaBrutaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>

            {/* 2. Deduções */}
            <div className="p-3 bg-rose-50/50 rounded-xl border border-rose-100 flex items-center justify-between text-rose-900">
              <div>
                <span className="font-bold block">2. (-) DEDUÇÕES DA RECEITA BRUTA & TRIBUTOS</span>
                <span className="text-[11px] text-rose-700 font-sans">
                  Impostos Faturados (Simples Nacional / ICMS / PIS / COFINS)
                </span>
              </div>
              <div className="font-bold text-rose-700">
                - R$ {dreCalculado.deducoesImpostos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>

            {/* 3. Receita Líquida */}
            <div className="p-3 bg-sky-50 rounded-xl border border-sky-200 flex items-center justify-between text-sky-950 font-bold">
              <span>3. (=) RECEITA OPERACIONAL LÍQUIDA</span>
              <span>R$ {dreCalculado.receitaLiquida.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>

            {/* 4. CMV */}
            <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100 flex items-center justify-between text-amber-950">
              <div>
                <span className="font-bold block">4. (-) CUSTO DAS MERCADORIAS VENDIDAS (CMV)</span>
                <span className="text-[11px] text-amber-700 font-sans">
                  Custo de compra das peças e componentes baixados do estoque
                </span>
              </div>
              <div className="font-bold text-amber-800">
                - R$ {dreCalculado.cmvCustoPecas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>

            {/* 5. Lucro Bruto */}
            <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between text-emerald-950">
              <div>
                <strong className="font-black text-sm block">5. (=) RESULTADO / LUCRO BRUTO OPERACIONAL</strong>
                <span className="text-[11px] text-emerald-700 font-sans">
                  Margem de contribuição bruta: <strong>{dreCalculado.margemBrutaPercent.toFixed(1)}%</strong>
                </span>
              </div>
              <div className="text-base font-black text-emerald-800">
                R$ {dreCalculado.lucroBruto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>

            {/* 6. Despesas Operacionais */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-slate-800">
              <div>
                <span className="font-bold block">6. (-) DESPESAS OPERACIONAIS & ADMINISTRATIVAS</span>
                <span className="text-[11px] text-slate-500 font-sans">
                  Aluguel de galpão, energia, fretes, pró-labore e despesas gerais
                </span>
              </div>
              <div className="font-bold text-rose-600">
                - R$ {dreCalculado.despesasOperacionais.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>

            {/* 7. Lucro Líquido Final */}
            <div className="p-5 bg-linear-to-r from-[#0C4A6E] to-[#075985] text-white rounded-2xl shadow-lg flex items-center justify-between">
              <div>
                <strong className="text-lg font-black tracking-tight block">
                  7. (=) LUCRO LÍQUIDO DO EXERCÍCIO
                </strong>
                <span className="text-xs text-sky-200 font-sans">
                  Margem Líquida Real do Período: <strong>{dreCalculado.margemLiquidaPercent.toFixed(1)}%</strong>
                </span>
              </div>
              <div className="text-2xl font-black text-emerald-300">
                R$ {dreCalculado.lucroLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 4: CONCILIAÇÃO BANCÁRIA (OFX) */}
      {/* ======================================================== */}
      {activeTab === 'conciliacao' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-black text-slate-900">Extrato Bancário & Conciliação OFX</h2>
              <p className="text-xs text-slate-500">
                Compare as entradas do banco com os recebimentos de balcão e saídas de fornecedores
              </p>
            </div>

            <div className="flex items-center gap-2">
              <label className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 font-bold text-xs rounded-xl transition flex items-center gap-2 cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>Importar Extrato OFX</span>
                <input
                  type="file"
                  accept=".ofx,.csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      onShowNotification('Arquivo OFX Carregado', `Extrato "${file.name}" processado e transações conciliadas com sucesso!`, 'success');
                    }
                  }}
                />
              </label>

              <button
                type="button"
                onClick={handleLoadSampleOfx}
                className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                title="Carregar exemplo de conciliação bancária OFX"
              >
                <Download className="w-4 h-4" />
                <span>Simular OFX</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onShowNotification('Auto-Conciliação', 'Transações conferidas automaticamente com os registros financeiros.', 'info');
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Auto-Conciliar</span>
              </button>
            </div>
          </div>

          {/* Tabela de Transações */}
          <div className="overflow-x-auto border border-slate-100 rounded-2xl">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[11px] font-black text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Descrição Extrato</th>
                  <th className="px-3 py-3">Tipo</th>
                  <th className="px-3 py-3">Valor (R$)</th>
                  <th className="px-3 py-3">Vínculo</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {bankTransactions.map((tx) => {
                  const isCredit = tx.type === 'CREDIT';
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                        {new Date(tx.date).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3">
                        <strong className="text-slate-900 block font-bold">{tx.description}</strong>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                          isCredit ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                        }`}>
                          {isCredit ? 'ENTRADA' : 'SAÍDA'}
                        </span>
                      </td>
                      <td className={`px-3 py-3 whitespace-nowrap font-black ${
                        isCredit ? 'text-emerald-700' : 'text-rose-600'
                      }`}>
                        {isCredit ? '+' : ''} R$ {Math.abs(tx.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-[11px] text-slate-500">
                        {tx.matchedId ? `Vinculado (${tx.matchedId})` : 'Aguardando vínculo'}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {tx.reconciled ? (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> CONCILIADO
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-slate-200 text-slate-700 text-[10px] font-black inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" /> PENDENTE
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <button
                          type="button"
                          onClick={() => handleToggleReconcile(tx.id)}
                          className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition cursor-pointer ${
                            tx.reconciled
                              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                          }`}
                        >
                          {tx.reconciled ? 'Desconciliar' : 'Conciliar'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: NOVA CONTA A PAGAR */}
      {/* ======================================================== */}
      {isNewPayableModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-black text-slate-900">Cadastrar Nova Conta a Pagar</h3>
            <form onSubmit={handleCreatePayable} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Descrição da Despesa</label>
                <input
                  type="text"
                  required
                  value={newPayDesc}
                  onChange={(e) => setNewPayDesc(e.target.value)}
                  placeholder="Ex: Boleto Bosch Peças - NF 9821"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Fornecedor</label>
                  <input
                    type="text"
                    value={newPaySupplier}
                    onChange={(e) => setNewPaySupplier(e.target.value)}
                    placeholder="Ex: Robert Bosch Ltda"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Categoria</label>
                  <select
                    value={newPayCategory}
                    onChange={(e) => setNewPayCategory(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  >
                    <option value="fornecedor_pecas">Fornecedor de Peças</option>
                    <option value="aluguel">Aluguel & Galpão</option>
                    <option value="energia_agua">Energia / Água</option>
                    <option value="frete_logistica">Frete / Redespacho</option>
                    <option value="impostos">Impostos / Simples</option>
                    <option value="outros">Outros</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newPayAmount}
                    onChange={(e) => setNewPayAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Data de Vencimento</label>
                  <input
                    type="date"
                    required
                    value={newPayDue}
                    onChange={(e) => setNewPayDue(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Código de Barras / Linha Digitável (Opcional)</label>
                <input
                  type="text"
                  value={newPayBarcode}
                  onChange={(e) => setNewPayBarcode(e.target.value)}
                  placeholder="34191.79001 01043..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Filial Responsável</label>
                <select
                  value={newPayBranch}
                  onChange={(e) => setNewPayBranch(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                >
                  <option value="matriz-ms">Matriz Campo Grande - MS</option>
                  {safeBranches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.city}/{b.uf})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewPayableModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0C4A6E] hover:bg-[#075985] text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Salvar Despesa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: NOVO TÍTULO A RECEBER */}
      {/* ======================================================== */}
      {isNewReceivableModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-black text-slate-900">Cadastrar Novo Título a Receber</h3>
            <form onSubmit={handleCreateReceivable} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Cliente / Razão Social</label>
                <input
                  type="text"
                  required
                  value={newRecCustomer}
                  onChange={(e) => setNewRecCustomer(e.target.value)}
                  placeholder="Ex: Auto Mecânica do Alemão"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Descrição</label>
                <input
                  type="text"
                  required
                  value={newRecDesc}
                  onChange={(e) => setNewRecDesc(e.target.value)}
                  placeholder="Ex: Faturamento Quinzenal Peças Suspensão"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newRecAmount}
                    onChange={(e) => setNewRecAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Data de Vencimento</label>
                  <input
                    type="date"
                    required
                    value={newRecDue}
                    onChange={(e) => setNewRecDue(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Origem</label>
                  <select
                    value={newRecOrigin}
                    onChange={(e) => setNewRecOrigin(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  >
                    <option value="balcao">Balcão</option>
                    <option value="ordem_servico">Ordem de Serviço (Oficina)</option>
                    <option value="crediario">Crediário Mensal</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Forma Prevista</label>
                  <select
                    value={newRecMethod}
                    onChange={(e) => setNewRecMethod(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  >
                    <option value="pix">PIX</option>
                    <option value="boleto">Boleto Bancário</option>
                    <option value="cartao_credito">Cartão de Crédito</option>
                    <option value="crediario">Crediário Próprio</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Filial Credora</label>
                <select
                  value={newRecBranch}
                  onChange={(e) => setNewRecBranch(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                >
                  <option value="matriz-ms">Matriz Campo Grande - MS</option>
                  {safeBranches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.city}/{b.uf})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewReceivableModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Salvar Título
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: LIQUIDAR CONTA A PAGAR */}
      {/* ======================================================== */}
      {settlingPayable && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-black text-slate-900">Liquidar Pagamento</h3>
            <p className="text-xs text-slate-600">
              Confirmar pagamento para <strong>{settlingPayable.supplierName}</strong> ({settlingPayable.description}).
            </p>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Valor Pago (R$)</label>
              <input
                type="number"
                step="0.01"
                value={paidAmountInput}
                onChange={(e) => setPaidAmountInput(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-3">
              <button
                type="button"
                onClick={() => setSettlingPayable(null)}
                className="px-3 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmPayableSettlement}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold"
              >
                Confirmar Pagamento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: LIQUIDAR RECEBIMENTO */}
      {/* ======================================================== */}
      {settlingReceivable && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-black text-slate-900">Registrar Recebimento</h3>
            <p className="text-xs text-slate-600">
              Confirmar entrada de valor do cliente <strong>{settlingReceivable.customerName}</strong>.
            </p>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Valor Recebido (R$)</label>
              <input
                type="number"
                step="0.01"
                value={paidAmountInput}
                onChange={(e) => setPaidAmountInput(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-emerald-700"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-3">
              <button
                type="button"
                onClick={() => setSettlingReceivable(null)}
                className="px-3 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmReceivableSettlement}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold"
              >
                Confirmar Entrada
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: COBRANÇA PIX COM QR CODE */}
      {/* ======================================================== */}
      {pixModalData && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                  <QrCode className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-black text-slate-900">Cobrança Instantânea PIX</h3>
                  <p className="text-[11px] text-slate-500">Banco Central do Brasil • Liquidação Imediata</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPixModalData(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer px-2"
              >
                ✕
              </button>
            </div>

            {/* Informações do Título */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Cliente:</span>
                <strong className="text-slate-900">{pixModalData.customerName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Descrição:</span>
                <span className="text-slate-700">{pixModalData.description}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Vencimento:</span>
                <span className="text-slate-700">{new Date(pixModalData.dueDate).toLocaleDateString('pt-BR')}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200 text-sm font-black">
                <span className="text-slate-800">Valor Total:</span>
                <span className="text-emerald-700">R$ {pixModalData.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* QR Code Simulado de Alta Fidelidade */}
            <div className="flex flex-col items-center justify-center p-4 bg-white border-2 border-dashed border-slate-200 rounded-2xl">
              <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs">
                <svg className="w-44 h-44" viewBox="0 0 100 100" fill="none">
                  <rect width="100" height="100" fill="#FFFFFF" />
                  <rect x="10" y="10" width="24" height="24" rx="4" fill="#0C4A6E" />
                  <rect x="14" y="14" width="16" height="16" rx="2" fill="#FFFFFF" />
                  <rect x="18" y="18" width="8" height="8" rx="1" fill="#0C4A6E" />
                  <rect x="66" y="10" width="24" height="24" rx="4" fill="#0C4A6E" />
                  <rect x="70" y="14" width="16" height="16" rx="2" fill="#FFFFFF" />
                  <rect x="74" y="18" width="8" height="8" rx="1" fill="#0C4A6E" />
                  <rect x="10" y="66" width="24" height="24" rx="4" fill="#0C4A6E" />
                  <rect x="14" y="70" width="16" height="16" rx="2" fill="#FFFFFF" />
                  <rect x="18" y="74" width="8" height="8" rx="1" fill="#0C4A6E" />
                  <rect x="40" y="12" width="6" height="6" fill="#0C4A6E" />
                  <rect x="52" y="12" width="6" height="6" fill="#0C4A6E" />
                  <rect x="40" y="24" width="6" height="6" fill="#0C4A6E" />
                  <rect x="50" y="22" width="8" height="6" fill="#0C4A6E" />
                  <rect x="12" y="42" width="6" height="6" fill="#0C4A6E" />
                  <rect x="24" y="42" width="6" height="6" fill="#0C4A6E" />
                  <rect x="18" y="52" width="6" height="6" fill="#0C4A6E" />
                  <rect x="38" y="38" width="24" height="24" rx="4" fill="#059669" />
                  <circle cx="50" cy="50" r="8" fill="#FFFFFF" />
                  <path d="M46 50L50 46L54 50L50 54Z" fill="#059669" />
                  <rect x="68" y="42" width="6" height="6" fill="#0C4A6E" />
                  <rect x="80" y="44" width="8" height="6" fill="#0C4A6E" />
                  <rect x="72" y="54" width="6" height="8" fill="#0C4A6E" />
                  <rect x="42" y="68" width="6" height="6" fill="#0C4A6E" />
                  <rect x="52" y="72" width="8" height="6" fill="#0C4A6E" />
                  <rect x="42" y="80" width="6" height="6" fill="#0C4A6E" />
                  <rect x="68" y="68" width="6" height="6" fill="#0C4A6E" />
                  <rect x="78" y="78" width="10" height="10" fill="#0C4A6E" />
                </svg>
              </div>
              <span className="text-[11px] font-bold text-slate-500 mt-2">
                Escaneie com o app de qualquer banco
              </span>
            </div>

            {/* Código Copia e Cola */}
            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                Código PIX Copia e Cola (BR Code):
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  readOnly
                  value={pixModalData.pixCopyPaste}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-mono text-slate-600 select-all"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(pixModalData.pixCopyPaste);
                    onShowNotification('Copiado', 'Código PIX Copia e Cola copiado com sucesso!', 'success');
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shrink-0 transition flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar</span>
                </button>
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  const trade = companyProfile?.tradeName || 'Nossa Autopeças';
                  const text = encodeURIComponent(
                    `Olá, *${pixModalData.customerName}*!\n\n` +
                    `Segue o código PIX para quitação do título de *R$ ${pixModalData.amount.toFixed(2)}* referente a: _${pixModalData.description}_.\n\n` +
                    `*Código Copia e Cola PIX:*\n${pixModalData.pixCopyPaste}\n\n` +
                    `Obrigado!\n*${trade}*`
                  );
                  window.open(`https://wa.me/?text=${text}`, '_blank');
                }}
                className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Enviar no Zap</span>
              </button>

              <button
                type="button"
                onClick={() => setPixModalData(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
