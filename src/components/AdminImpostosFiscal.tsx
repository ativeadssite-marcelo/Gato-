import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Globe, 
  Building2, 
  FileText, 
  Calculator, 
  Search, 
  Save, 
  RefreshCw, 
  Ship, 
  CheckCircle2, 
  AlertCircle, 
  Zap, 
  Layers, 
  DollarSign, 
  TrendingUp, 
  Info, 
  Scale, 
  Percent, 
  Sliders, 
  FileCode2,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Lock,
  ArrowRight
} from 'lucide-react';
import { 
  FederalTaxSettings, 
  StateTaxRule, 
  Product, 
  CompanyProfile, 
  BranchUnit,
  TaxSimulationRequest,
  TaxSimulationResult
} from '../types';
import { DEFAULT_FEDERAL_TAX_SETTINGS, INITIAL_STATE_TAX_RULES } from '../data/initialData';

interface AdminImpostosFiscalProps {
  companyProfile?: CompanyProfile | null;
  branches?: BranchUnit[];
  products?: Product[];
  onShowNotification?: (title: string, message: string, type?: 'success' | 'warning' | 'info') => void;
}

export const AdminImpostosFiscal: React.FC<AdminImpostosFiscalProps> = ({
  companyProfile,
  branches = [],
  products = [],
  onShowNotification,
}) => {
  const [activeTab, setActiveTab] = useState<'classificacao' | 'mkt_sales' | 'estaduais' | 'federais' | 'importacao' | 'simulador' | 'sefaz_rfb'>('classificacao');

  // Federal & Classification State
  const [federalSettings, setFederalSettings] = useState<FederalTaxSettings>(() => {
    try {
      const saved = localStorage.getItem('gato_federal_tax_settings');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn(e);
    }
    return {
      ...DEFAULT_FEDERAL_TAX_SETTINGS,
      legalNature: companyProfile?.legalNature || 'LTDA',
      companySize: companyProfile?.companySize || 'EPP',
      regime: companyProfile?.taxRegime as any || 'simples_nacional',
    };
  });

  // State Tax Rules State (All 27 UFs)
  const [stateRules, setStateRules] = useState<StateTaxRule[]>(() => {
    try {
      const saved = localStorage.getItem('gato_state_tax_rules');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn(e);
    }
    return INITIAL_STATE_TAX_RULES;
  });

  // Search & Filters for State Tax Table
  const [ufSearch, setUfSearch] = useState('');
  const [regionFilter, setRegionFilter] = useState<string>('TODAS');

  // Simulator Form State
  const [simNcm, setSimNcm] = useState('8708.30.90'); // Pastilhas/Discos de Freio
  const [simUfOrigem, setSimUfOrigem] = useState('MS');
  const [simUfDestino, setSimUfDestino] = useState('SP');
  const [simTipoOperacao, setSimTipoOperacao] = useState<'revenda_balcao' | 'distribuicao_b2b' | 'importacao_direta' | 'venda_consumidor_final'>('importacao_direta');
  const [simRegime, setSimRegime] = useState<'simples_nacional' | 'lucro_presumido' | 'lucro_real'>('lucro_presumido');
  const [simValorCustoFob, setSimValorCustoFob] = useState(150.00); // USD ou R$
  const [simFreteSeguro, setSimFreteSeguro] = useState(25.00);
  const [simPrecoVenda, setSimPrecoVenda] = useState(380.00);
  const [simQuantidade, setSimQuantidade] = useState(100);
  const [simResultado, setSimResultado] = useState<TaxSimulationResult | null>(null);

  // Marketplace & Balcão Sales Tax Form State
  const [mktUfOrigem, setMktUfOrigem] = useState('MS');
  const [mktUfDestino, setMktUfDestino] = useState('SP');
  const [mktChannel, setMktChannel] = useState<'balcao' | 'mercadolivre' | 'shopee' | 'amazon'>('mercadolivre');
  const [mktPrecoVenda, setMktPrecoVenda] = useState(280.00);
  const [mktCustoProduto, setMktCustoProduto] = useState(120.00);
  const [mktIsImportado, setMktIsImportado] = useState(true);

  // Selected state rule for modal/editing
  const [selectedUfForEdit, setSelectedUfForEdit] = useState<StateTaxRule | null>(null);

  // Save Federal Tax Handler
  const handleSaveFederalSettings = () => {
    try {
      localStorage.setItem('gato_federal_tax_settings', JSON.stringify(federalSettings));
      if (onShowNotification) {
        onShowNotification(
          'Impostos Federais Salvos!',
          'Alíquotas de PIS/COFINS Monofásico, IPI e Imposto de Importação atualizadas.',
          'success'
        );
      }
    } catch (e) {
      console.warn(e);
    }
  };

  // Save State Tax Handler
  const handleSaveStateRules = (updatedRules: StateTaxRule[]) => {
    setStateRules(updatedRules);
    try {
      localStorage.setItem('gato_state_tax_rules', JSON.stringify(updatedRules));
      if (onShowNotification) {
        onShowNotification(
          'Matriz Tributária Estadual Salva!',
          'Alíquotas de ICMS, MVA Ajustada e Regras de Importação atualizadas para todos os estados.',
          'success'
        );
      }
    } catch (e) {
      console.warn(e);
    }
  };

  // Update a single state field
  const handleUpdateSingleUf = (ufCode: string, field: keyof StateTaxRule, value: any) => {
    const updated = stateRules.map(rule => {
      if (rule.uf === ufCode) {
        const newRule = { ...rule, [field]: value };
        // Recalculate adjusted MVAs if icmsInterno or mvaOriginal change
        if (field === 'icmsInterno' || field === 'mvaOriginal') {
          const mva = Number(newRule.mvaOriginal) / 100;
          const aliqInt = Number(newRule.icmsInterno) / 100;
          // Formula: [(1 + MVA) * (1 - ALIQ_INTER) / (1 - ALIQ_INT) - 1] * 100
          newRule.mvaAjustada4 = Number((((1 + mva) * (1 - 0.04) / (1 - aliqInt) - 1) * 100).toFixed(2));
          newRule.mvaAjustada7 = Number((((1 + mva) * (1 - 0.07) / (1 - aliqInt) - 1) * 100).toFixed(2));
          newRule.mvaAjustada12 = Number((((1 + mva) * (1 - 0.12) / (1 - aliqInt) - 1) * 100).toFixed(2));
        }
        return newRule;
      }
      return rule;
    });
    handleSaveStateRules(updated);
  };

  // Calculate Tax Simulation
  const handleRunSimulation = () => {
    const origRule = stateRules.find(r => r.uf === simUfOrigem) || stateRules[0];
    const destRule = stateRules.find(r => r.uf === simUfDestino) || stateRules[0];

    const isImportation = simTipoOperacao === 'importacao_direta';
    const totalBase = (simValorCustoFob + simFreteSeguro) * simQuantidade;
    
    // Impostos Federais
    let iiValor = 0;
    let ipiValor = 0;
    let pisValor = 0;
    let cofinsValor = 0;
    let afrmmValor = 0;
    let taxasSiscomex = 0;

    if (isImportation) {
      iiValor = totalBase * (federalSettings.iiAliquotaMedia / 100);
      const baseIpi = totalBase + iiValor;
      ipiValor = baseIpi * (federalSettings.ipiAliquotaDefault / 100);
      
      const basePisCofins = totalBase + iiValor;
      pisValor = basePisCofins * (federalSettings.pisAliquotaImportacao / 100);
      cofinsValor = basePisCofins * (federalSettings.cofinsAliquotaImportacao / 100);
      
      afrmmValor = (simFreteSeguro * simQuantidade) * (federalSettings.afrmmPercent / 100);
      taxasSiscomex = federalSettings.taxaSiscomexPorDi + (federalSettings.taxaSiscomexPorAdicao * 2);
    }

    // ICMS no Desembaraço/Entrada
    const icmsImportRate = isImportation ? (destRule.icmsImportacaoDesembaraco || destRule.icmsInterno) : destRule.icmsInterno;
    const baseIcmsDesembaraco = totalBase + iiValor + ipiValor + pisValor + cofinsValor + taxasSiscomex;
    const icmsProprioValor = baseIcmsDesembaraco * (icmsImportRate / 100);

    // Custo Total Nacionalizado
    const custoTotalNacionalizado = totalBase + iiValor + ipiValor + pisValor + cofinsValor + afrmmValor + taxasSiscomex + icmsProprioValor;

    // Venda & ST
    const totalVendaBruta = simPrecoVenda * simQuantidade;
    let icmsStValor = 0;
    let difalValor = 0;
    let fcpValor = 0;

    if (simUfOrigem !== simUfDestino && simTipoOperacao === 'distribuicao_b2b') {
      const mvaAjustada = destRule.mvaAjustada4; // Assumindo alíquota 4% interestadual para autopeças importadas
      const baseCalcSt = totalVendaBruta * (1 + mvaAjustada / 100);
      const icmsStBruto = baseCalcSt * (destRule.icmsInterno / 100);
      const icmsCreditoOrigem = totalVendaBruta * 0.04;
      icmsStValor = Math.max(0, icmsStBruto - icmsCreditoOrigem);
    } else if (simUfOrigem !== simUfDestino && simTipoOperacao === 'venda_consumidor_final') {
      const difalPercent = Math.max(0, destRule.icmsInterno - 12);
      difalValor = totalVendaBruta * (difalPercent / 100);
      fcpValor = totalVendaBruta * (destRule.fcpPercent / 100);
    }

    const impostosTotaisVenda = icmsStValor + difalValor + fcpValor + (simRegime === 'simples_nacional' ? totalVendaBruta * 0.045 : totalVendaBruta * 0.08);
    const margemLiquidaR = totalVendaBruta - custoTotalNacionalizado - impostosTotaisVenda;
    const margemLiquidaPercent = totalVendaBruta > 0 ? (margemLiquidaR / totalVendaBruta) * 100 : 0;

    const obs: string[] = [];
    if (federalSettings.pisCofinsMonofasico) {
      obs.push('✓ PIS/COFINS Monofásico aplicado (Lei 10.485/2002): Revenda com Alíquota Zero no varejo balcão (CST 04).');
    }
    if (destRule.regimeIncentivoImportacao) {
      obs.push(`✓ Benefício Fiscal Estadual (${destRule.uf}): ${destRule.regimeIncentivoImportacao} utilizado no cálculo.`);
    }
    if (destRule.temProtocoloComMs) {
      obs.push(`✓ Protocolo/Convênio ICMS Ativo entre ${simUfOrigem} e ${simUfDestino} para autopeças.`);
    }

    setSimResultado({
      ncm: simNcm,
      ufOrigem: simUfOrigem,
      ufDestino: simUfDestino,
      valorBase: totalBase,
      iiValor,
      ipiValor,
      pisValor,
      cofinsValor,
      icmsProprioValor,
      icmsStValor,
      difalValor,
      fcpValor,
      afrmmValor,
      taxaSiscomexTotal: taxasSiscomex,
      custoTotalNacionalizado,
      impostosTotaisVenda,
      margemLiquidaR,
      margemLiquidaPercent,
      observacoesFiscais: obs,
    });
  };

  // Helper for Marketplace & Balcao Sales Tax Determination
  const getMarketplaceSalesTaxDetail = () => {
    const destRule = stateRules.find(r => r.uf === mktUfDestino) || stateRules[0];
    const origRule = stateRules.find(r => r.uf === mktUfOrigem) || stateRules[0];
    const isInterna = mktUfOrigem === mktUfDestino;
    const isInterestadual = !isInterna;
    
    const regime = federalSettings.regime || 'simples_nacional';
    const legalNature = federalSettings.legalNature || 'LTDA';

    let cfop = isInterna ? '5.102' : '6.108';
    let icmsProprioPercent = 0;
    let difalPercent = 0;
    let fcpPercent = 0;
    let aliquotaEfetivaImposto = 0;
    let impostoTotalR$ = 0;
    let baseLegal = '';

    // Calculate Marketplace Fee
    let mktFeePercent = 0;
    let mktFixedFee = 0;
    let mktChannelName = 'Balcão / Loja';

    if (mktChannel === 'mercadolivre') {
      mktChannelName = 'Mercado Livre (ML)';
      mktFeePercent = 16.5; // Premium autopeças
      if (mktPrecoVenda < 79) mktFixedFee = 6.00;
    } else if (mktChannel === 'shopee') {
      mktChannelName = 'Shopee Xpress';
      mktFeePercent = 14.0;
      mktFixedFee = 4.00;
    } else if (mktChannel === 'amazon') {
      mktChannelName = 'Amazon FBA / DBA';
      mktFeePercent = 13.0;
    } else {
      mktChannelName = 'Balcão Loja Física';
      mktFeePercent = 1.8; // Taxa maquininha PIX/Cartão
    }

    const comissaoMktR$ = (mktPrecoVenda * (mktFeePercent / 100)) + mktFixedFee;

    if (regime === 'simei' || legalNature === 'MEI') {
      impostoTotalR$ = 0;
      aliquotaEfetivaImposto = 0;
      baseLegal = 'MEI (SIMEI): DAS-MEI fixo mensal. Sem acréscimo de imposto na nota de venda. Isento de DIFAL interestadual (Decisão STF ADI 5469 e LC 190/2021).';
    } else if (regime === 'simples_nacional') {
      aliquotaEfetivaImposto = 3.85; // Anexo I com abatimento Monofásico PIS/COFINS (Lei 10.485/2002)
      impostoTotalR$ = mktPrecoVenda * (aliquotaEfetivaImposto / 100);
      if (isInterestadual) {
        baseLegal = `Simples Nacional (ME/EPP): Alíquota Efetiva DAS de ${aliquotaEfetivaImposto}% com dedução do PIS/COFINS Monofásico. Isento de DIFAL na saída interestadual B2C a não contribuinte (STF ADI 5469 mantida na LC 190/2021).`;
      } else {
        baseLegal = `Simples Nacional (Venda Interna ${mktUfOrigem}): Alíquota Efetiva DAS de ${aliquotaEfetivaImposto}% (Anexo I Comércio com abatimento Monofásico).`;
      }
    } else {
      // Lucro Presumido ou Lucro Real
      if (isInterna) {
        icmsProprioPercent = origRule.icmsInterno; // ex: 17% MS ou 18% SP
        aliquotaEfetivaImposto = icmsProprioPercent;
        impostoTotalR$ = mktPrecoVenda * (icmsProprioPercent / 100);
        baseLegal = `Lucro Presumido/Real (Venda Interna ${mktUfOrigem}): ICMS Próprio de ${icmsProprioPercent}%. PIS/COFINS Monofásico Alíquota Zero (CST 04).`;
      } else {
        const icmsInterestadualRate = mktIsImportado ? 4.0 : (['SP', 'RJ', 'PR', 'SC', 'RS', 'MG'].includes(mktUfOrigem) ? 12.0 : 7.0);
        const icmsInternoDestino = destRule.icmsInterno;
        difalPercent = Math.max(0, icmsInternoDestino - icmsInterestadualRate);
        fcpPercent = destRule.fcpPercent || 0;
        
        const icmsOrigemR$ = mktPrecoVenda * (icmsInterestadualRate / 100);
        const difalR$ = mktPrecoVenda * (difalPercent / 100);
        const fcpR$ = mktPrecoVenda * (fcpPercent / 100);

        impostoTotalR$ = icmsOrigemR$ + difalR$ + fcpR$;
        aliquotaEfetivaImposto = (impostoTotalR$ / mktPrecoVenda) * 100;
        baseLegal = `Lucro Presumido/Real (Interestadual B2C ${mktUfOrigem} ➔ ${mktUfDestino}): ICMS Origem ${icmsInterestadualRate}% + DIFAL EC 87/15 de ${difalPercent.toFixed(1)}% recolhido para a UF de Destino + FCP ${fcpPercent}%. PIS/COFINS Monofásico Alíquota Zero.`;
      }
    }

    const lucroLiquidoR$ = mktPrecoVenda - mktCustoProduto - impostoTotalR$ - comissaoMktR$;
    const margemLiquidaPercent = mktPrecoVenda > 0 ? (lucroLiquidoR$ / mktPrecoVenda) * 100 : 0;

    return {
      isInterna,
      isInterestadual,
      cfop,
      regime,
      legalNature,
      mktChannelName,
      mktFeePercent,
      comissaoMktR$,
      icmsProprioPercent,
      difalPercent,
      fcpPercent,
      aliquotaEfetivaImposto,
      impostoTotalR$,
      lucroLiquidoR$,
      margemLiquidaPercent,
      baseLegal,
    };
  };

  // Filtered State Tax Rules
  const filteredStateRules = stateRules.filter(rule => {
    const matchUf = rule.uf.toLowerCase().includes(ufSearch.toLowerCase()) || 
                    rule.ufName.toLowerCase().includes(ufSearch.toLowerCase()) ||
                    rule.regimeIncentivoImportacao.toLowerCase().includes(ufSearch.toLowerCase());
    const matchRegion = regionFilter === 'TODAS' || rule.region === regionFilter;
    return matchUf && matchRegion;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner & Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-6 rounded-3xl shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-amber-500/20 via-orange-600/10 to-transparent pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-orange-500/20 text-orange-400 font-mono text-xs font-bold border border-orange-500/30 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" /> www.gatogestao.com.br/superadmin
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-semibold border border-emerald-500/30 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Módulo Fiscal Avançado v2026.9
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              Configuração Tributária & Impostos
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              Gestão centralizada de Impostos Federais (PIS/COFINS Monofásico, IPI, II), Matriz de ICMS/MVA Ajustada por Estado (27 UFs) e Benefícios Fiscais de Importação de Autopeças.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/superadmin"
              onClick={(e) => {
                e.preventDefault();
                window.history.pushState({}, '', '/superadmin');
              }}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-2xl text-xs font-bold transition-all border border-slate-700/60 flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <ExternalLink className="w-4 h-4 text-amber-400" /> Rota Direct: /superadmin
            </a>
            <button
              onClick={() => handleSaveStateRules(stateRules)}
              className="px-5 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white rounded-2xl text-xs font-bold shadow-lg shadow-orange-600/30 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" /> Salvar Toda Matriz
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-800 overflow-x-auto custom-scrollbar">
          <button
            onClick={() => setActiveTab('classificacao')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'classificacao'
                ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30 ring-1 ring-orange-400/40'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Building2 className="w-4 h-4 text-emerald-400" /> Classificação & Porte (MEI, LTDA, S.A.)
          </button>

          <button
            onClick={() => setActiveTab('mkt_sales')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'mkt_sales'
                ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30 ring-1 ring-orange-400/40'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Zap className="w-4 h-4 text-amber-400" /> Imposto Venda ML, Shopee & Amazon
          </button>

          <button
            onClick={() => setActiveTab('estaduais')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'estaduais'
                ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30 ring-1 ring-orange-400/40'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Globe className="w-4 h-4 text-amber-400" /> Impostos Estaduais (27 UFs)
          </button>

          <button
            onClick={() => setActiveTab('federais')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'federais'
                ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30 ring-1 ring-orange-400/40'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Building2 className="w-4 h-4 text-sky-400" /> Federais (PIS/COFINS & IPI)
          </button>

          <button
            onClick={() => setActiveTab('importacao')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'importacao'
                ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30 ring-1 ring-orange-400/40'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Ship className="w-4 h-4 text-emerald-400" /> Importação por Estado
          </button>

          <button
            onClick={() => {
              setActiveTab('simulador');
              handleRunSimulation();
            }}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'simulador'
                ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30 ring-1 ring-orange-400/40'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Calculator className="w-4 h-4 text-purple-400" /> Simulador Tributário
          </button>

          <button
            onClick={() => setActiveTab('sefaz_rfb')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'sefaz_rfb'
                ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30 ring-1 ring-orange-400/40'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <FileCode2 className="w-4 h-4 text-amber-400" /> Integração SEFAZ & RFB
          </button>
        </div>
      </div>

      {/* Content View Switch */}
      {/* 0. CLASSIFICAÇÃO JURÍDICA E PORTE DA EMPRESA */}
      {activeTab === 'classificacao' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-black">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Classificação Jurídica, Porte & Enquadramento Fiscal</h3>
                  <p className="text-slate-500 text-xs">Definição oficial da Natureza Jurídica (MEI, LTDA, S.A., SLU), Porte e Regime Tributário</p>
                </div>
              </div>

              <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200">
                Empresa Ativa: {companyProfile?.tradeName || 'GATO Autopeças'}
              </span>
            </div>

            {/* Selection Form */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Tipo Jurídico */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  Natureza Jurídica (Tipo Jurídico)
                </label>
                <select
                  value={federalSettings.legalNature || 'LTDA'}
                  onChange={(e) => setFederalSettings({ ...federalSettings, legalNature: e.target.value as any })}
                  className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-300 font-bold text-xs text-slate-900 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                >
                  <option value="MEI">MEI - Microempreendedor Individual</option>
                  <option value="SLU">SLU - Sociedade Limitada Unipessoal (1 Sócio)</option>
                  <option value="LTDA">LTDA - Sociedade Limitada (Recomendado para Autopeças)</option>
                  <option value="EI">EI - Empresário Individual</option>
                  <option value="SA_FECHADA">S.A. Fechada - Sociedade Anônima de Capital Fechado</option>
                  <option value="SA_ABERTA">S.A. Aberta - Sociedade Anônima (Capital Aberto - B3)</option>
                  <option value="SS">SS - Sociedade Simples</option>
                </select>
                <p className="text-[11px] text-slate-500">
                  Define a estrutura societária e responsabilidade dos sócios.
                </p>
              </div>

              {/* Porte da Empresa */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  Porte da Empresa (Faturamento Anual)
                </label>
                <select
                  value={federalSettings.companySize || 'EPP'}
                  onChange={(e) => setFederalSettings({ ...federalSettings, companySize: e.target.value as any })}
                  className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-300 font-bold text-xs text-slate-900 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                >
                  <option value="MEI">MEI (Até R$ 81.000,00/ano)</option>
                  <option value="ME">ME - Microempresa (Até R$ 360.000,00/ano)</option>
                  <option value="EPP">EPP - Empresa de Pequeno Porte (Até R$ 4.800.000,00/ano)</option>
                  <option value="MEDIO">Médio Porte (R$ 4,8 milhões a R$ 78 milhões/ano)</option>
                  <option value="GRANDE">Grande Porte (Acima de R$ 78 milhões/ano / Importadora)</option>
                </select>
                <p className="text-[11px] text-slate-500">
                  Determina enquadramento de incentivos, Simples Nacional e obrigações acessórias.
                </p>
              </div>

              {/* Regime Tributário */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  Regime Tributário Oficial
                </label>
                <select
                  value={federalSettings.regime || 'simples_nacional'}
                  onChange={(e) => setFederalSettings({ ...federalSettings, regime: e.target.value as any })}
                  className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-300 font-bold text-xs text-slate-900 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                >
                  <option value="simei">SIMEI - Sistema Recolhimento em Valor Fixo (MEI)</option>
                  <option value="simples_nacional">Simples Nacional (Anexo I Comércio + Dedução Monofásica)</option>
                  <option value="lucro_presumido">Lucro Presumido (PIS 0.65% / COFINS 3% / IRPJ Presumido 8%)</option>
                  <option value="lucro_real">Lucro Real (Não-Cumulativo - Obrigatório para Importadores / S.A.)</option>
                </select>
                <p className="text-[11px] text-slate-500">
                  Determina a apuração fiscal e o recolhimento de PIS/COFINS, IRPJ, CSLL e ICMS.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={handleSaveFederalSettings}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4 text-emerald-400" /> Salvar Enquadramento da Empresa
              </button>
            </div>
          </div>

          {/* Cards Explicativos da Classificação */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            {/* MEI */}
            <div className={`p-5 rounded-3xl border transition-all ${
              federalSettings.legalNature === 'MEI' || federalSettings.regime === 'simei'
                ? 'bg-emerald-950 text-white border-emerald-500 shadow-xl ring-2 ring-emerald-500/30'
                : 'bg-white text-slate-800 border-slate-200'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-black text-sm">MEI (SIMEI)</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">Faturamento até R$ 81k</span>
              </div>
              <p className="leading-relaxed opacity-90 mb-3">
                Ideal para mecânicos autônomos ou pequenos vendedores de balcão. Pagamento fixo mensal de DAS (~R$ 75,00/mês). Dispensa de retenção e PIS/COFINS.
              </p>
              <div className="pt-2 border-t border-slate-200/20 font-bold text-[11px]">
                • Limite de 1 funcionário<br/>
                • Venda para consumidor final
              </div>
            </div>

            {/* LTDA */}
            <div className={`p-5 rounded-3xl border transition-all ${
              federalSettings.legalNature === 'LTDA' || federalSettings.legalNature === 'SLU'
                ? 'bg-slate-900 text-white border-orange-500 shadow-xl ring-2 ring-orange-500/30'
                : 'bg-white text-slate-800 border-slate-200'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-black text-sm">LTDA / SLU</span>
                <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 text-[10px] font-bold">Mais Comum no Ramo</span>
              </div>
              <p className="leading-relaxed opacity-90 mb-3">
                Sociedade Limitada com proteção de bens pessoais. Permite enquadramento no Simples Nacional, Lucro Presumido ou Lucro Real. Ideal para auto peças e centro automotivo.
              </p>
              <div className="pt-2 border-t border-slate-200/20 font-bold text-[11px]">
                • Proteção patrimonial dos sócios<br/>
                • Emissão ilimitada de NF-e
              </div>
            </div>

            {/* S.A. */}
            <div className={`p-5 rounded-3xl border transition-all ${
              federalSettings.legalNature === 'SA_FECHADA' || federalSettings.legalNature === 'SA_ABERTA'
                ? 'bg-slate-900 text-white border-sky-500 shadow-xl ring-2 ring-sky-500/30'
                : 'bg-white text-slate-800 border-slate-200'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-black text-sm">S.A. (Sociedade Anônima)</span>
                <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 text-[10px] font-bold">Grandes Redes / Distribuidoras</span>
              </div>
              <p className="leading-relaxed opacity-90 mb-3">
                Estrutura por Ações (Ordinárias/Preferenciais). Comum em distribuidoras multinacionais de peças, importadoras e redes com auditoria externa obrigatoriamente em Lucro Real.
              </p>
              <div className="pt-2 border-t border-slate-200/20 font-bold text-[11px]">
                • Governança corporativa avançada<br/>
                • Lucro Real Obrigatório
              </div>
            </div>

            {/* EI / Outros */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 text-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="font-black text-sm">EI / Empresário Individual</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">Individual</span>
              </div>
              <p className="text-slate-600 leading-relaxed mb-3">
                Empresa em nome de uma pessoa física. Responsabilidade ilimitada (bens da empresa e pessoais se misturam). Pode optar por Simples ou Presumido.
              </p>
              <div className="pt-2 border-t border-slate-100 font-bold text-[11px] text-slate-500">
                • Sem sócios<br/>
                • Responsabilidade ilimitada
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 0.5. CALCULADORA DE IMPOSTO DE VENDA POR CNPJ & MARKETPLACE */}
      {activeTab === 'mkt_sales' && (() => {
        const detail = getMarketplaceSalesTaxDetail();
        return (
          <div className="space-y-6">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-6 rounded-3xl shadow-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-mono text-[11px] font-bold border border-amber-500/30">
                    Calculadora Fiscal Inteligente
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-extrabold uppercase">
                    CNPJ: {federalSettings.legalNature || 'LTDA'} ({federalSettings.regime === 'simei' ? 'MEI' : federalSettings.regime === 'simples_nacional' ? 'Simples Nacional' : federalSettings.regime === 'lucro_presumido' ? 'Lucro Presumido' : 'Lucro Real'})
                  </span>
                </div>
                <h2 className="text-xl font-black text-white">
                  Imposto de Venda: Balcão vs. Mercado Livre, Shopee & Amazon
                </h2>
                <p className="text-slate-300 text-xs max-w-2xl">
                  Identifique automaticamente a tributação interna (mesmo estado) e interestadual (outros estados) para vendas B2C faturadas via marketplace conforme a classificação fiscal do seu CNPJ.
                </p>
              </div>

              <div className="shrink-0 flex items-center gap-2 bg-slate-800/80 p-3 rounded-2xl border border-slate-700/60">
                <div className="w-8 h-8 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-medium">CFOP Aplicado:</p>
                  <p className="font-mono text-sm font-extrabold text-amber-400">{detail.cfop}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Form Input Side */}
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Sliders className="w-4 h-4 text-orange-600" />
                  <h3 className="font-extrabold text-slate-900 text-sm">Parâmetros da Venda</h3>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Canal de Venda / Plataforma</label>
                    <select
                      value={mktChannel}
                      onChange={(e) => setMktChannel(e.target.value as any)}
                      className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-300 font-bold text-slate-900 focus:ring-2 focus:ring-orange-500/20"
                    >
                      <option value="mercadolivre">Mercado Livre (ML Premium/Clássico)</option>
                      <option value="shopee">Shopee Xpress</option>
                      <option value="amazon">Amazon FBA / DBA</option>
                      <option value="balcao">Balcão Loja Física / E-commerce Próprio</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">UF Origem (CD)</label>
                      <select
                        value={mktUfOrigem}
                        onChange={(e) => setMktUfOrigem(e.target.value)}
                        className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-300 font-bold text-slate-900"
                      >
                        {stateRules.map(r => (
                          <option key={r.uf} value={r.uf}>{r.uf} - {r.ufName}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">UF Destino Cliente</label>
                      <select
                        value={mktUfDestino}
                        onChange={(e) => setMktUfDestino(e.target.value)}
                        className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-300 font-bold text-slate-900"
                      >
                        {stateRules.map(r => (
                          <option key={r.uf} value={r.uf}>{r.uf} - {r.ufName}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Preço Venda Item (R$)</label>
                      <input
                        type="number"
                        step="1"
                        value={mktPrecoVenda}
                        onChange={(e) => setMktPrecoVenda(parseFloat(e.target.value) || 0)}
                        className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-300 font-extrabold text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Custo Compra Item (R$)</label>
                      <input
                        type="number"
                        step="1"
                        value={mktCustoProduto}
                        onChange={(e) => setMktCustoProduto(parseFloat(e.target.value) || 0)}
                        className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-300 font-bold text-slate-800"
                      />
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                    <span className="block font-bold text-slate-800">Origem da Peça Automotiva:</span>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-1.5 font-semibold text-slate-700 cursor-pointer">
                        <input
                          type="radio"
                          name="origemPeca"
                          checked={mktIsImportado}
                          onChange={() => setMktIsImportado(true)}
                          className="accent-orange-600"
                        />
                        Importada (Alíq. 4%)
                      </label>
                      <label className="flex items-center gap-1.5 font-semibold text-slate-700 cursor-pointer">
                        <input
                          type="radio"
                          name="origemPeca"
                          checked={!mktIsImportado}
                          onChange={() => setMktIsImportado(false)}
                          className="accent-orange-600"
                        />
                        Nacional (7% ou 12%)
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Detailed Output Side */}
              <div className="lg:col-span-2 space-y-4">
                <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl border border-slate-800 space-y-6">
                  {/* Top Result Banner */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          detail.isInterna ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}>
                          {detail.isInterna ? `Venda Interna (Dentro do Estado - ${mktUfOrigem})` : `Venda Interestadual (${mktUfOrigem} ➔ ${mktUfDestino})`}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-bold font-mono">
                          CFOP {detail.cfop}
                        </span>
                      </div>
                      <h3 className="text-xl font-black text-white mt-1">
                        {detail.mktChannelName} • R$ {mktPrecoVenda.toFixed(2)}
                      </h3>
                    </div>

                    <div className="bg-slate-800/80 px-4 py-3 rounded-2xl border border-slate-700/80 text-right">
                      <p className="text-[10px] text-slate-400 font-medium uppercase">Lucro Líquido no Bolso</p>
                      <p className={`text-xl font-black ${detail.lucroLiquidoR$ > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        R$ {detail.lucroLiquidoR$.toFixed(2)} ({detail.margemLiquidaPercent.toFixed(1)}%)
                      </p>
                    </div>
                  </div>

                  {/* Breakdown Cards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    {/* Custo Produto */}
                    <div className="p-3.5 rounded-2xl bg-slate-800/70 border border-slate-700/60">
                      <p className="text-slate-400 text-[10px] uppercase font-bold">Custo de Aquisição</p>
                      <p className="font-extrabold text-slate-200 text-base mt-0.5">R$ {mktCustoProduto.toFixed(2)}</p>
                      <p className="text-[10px] text-slate-400">Preço de compra fornecedor</p>
                    </div>

                    {/* Imposto de Venda */}
                    <div className="p-3.5 rounded-2xl bg-slate-800/70 border border-slate-700/60">
                      <p className="text-slate-400 text-[10px] uppercase font-bold">Imposto Efetivo de Venda</p>
                      <p className="font-extrabold text-amber-400 text-base mt-0.5">
                        R$ {detail.impostoTotalR$.toFixed(2)} ({detail.aliquotaEfetivaImposto.toFixed(1)}%)
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {detail.regime === 'simei' ? 'MEI (R$ 0,00 na nota)' : detail.regime === 'simples_nacional' ? 'DAS Simples Nacional' : 'ICMS Próprio + DIFAL EC 87/15'}
                      </p>
                    </div>

                    {/* Tarifa Marketplace */}
                    <div className="p-3.5 rounded-2xl bg-slate-800/70 border border-slate-700/60">
                      <p className="text-slate-400 text-[10px] uppercase font-bold">Tarifa {detail.mktChannelName}</p>
                      <p className="font-extrabold text-rose-400 text-base mt-0.5">
                        R$ {detail.comissaoMktR$.toFixed(2)} ({detail.mktFeePercent}%)
                      </p>
                      <p className="text-[10px] text-slate-400">Comissão de intermediação</p>
                    </div>
                  </div>

                  {/* Parecer de Enquadramento Legal */}
                  <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/80 space-y-2 text-xs">
                    <div className="flex items-center gap-2 text-emerald-400 font-extrabold">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Enquadramento Fiscal do CNPJ ({federalSettings.legalNature || 'LTDA'} - {federalSettings.regime === 'simei' ? 'MEI' : federalSettings.regime === 'simples_nacional' ? 'Simples Nacional' : federalSettings.regime === 'lucro_presumido' ? 'Lucro Presumido' : 'Lucro Real'})</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed text-[11px] font-medium">
                      {detail.baseLegal}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 1. IMPOSTOS ESTADUAIS */}
      {activeTab === 'estaduais' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por Estado (ex: MS, SP, SC) ou Benefício..."
                value={ufSearch}
                onChange={(e) => setUfSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto">
              <span className="text-xs font-bold text-slate-500 shrink-0">Região:</span>
              {['TODAS', 'Centro-Oeste', 'Sudeste', 'Sul', 'Nordeste', 'Norte'].map((region) => (
                <button
                  key={region}
                  onClick={() => setRegionFilter(region)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    regionFilter === region
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {region}
                </button>
              ))}
            </div>
          </div>

          {/* UFs Table */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-slate-300 font-bold border-b border-slate-800 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3.5">Estado (UF)</th>
                    <th className="px-3 py-3.5 text-center">Região</th>
                    <th className="px-3 py-3.5 text-center">ICMS Interno</th>
                    <th className="px-3 py-3.5 text-center">FCP (%)</th>
                    <th className="px-3 py-3.5 text-center">MVA Original</th>
                    <th className="px-3 py-3.5 text-center bg-slate-800/80">MVA Ajust. (4%)</th>
                    <th className="px-3 py-3.5 text-center bg-slate-800/80">MVA Ajust. (12%)</th>
                    <th className="px-3 py-3.5 text-center">Protocolo MS</th>
                    <th className="px-3 py-3.5 text-center">ICMS Desembaraço</th>
                    <th className="px-4 py-3.5 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStateRules.map((rule) => (
                    <tr key={rule.uf} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span className={`w-8 h-8 rounded-xl font-bold flex items-center justify-center text-xs shrink-0 ${
                            rule.uf === 'MS' 
                              ? 'bg-orange-500 text-white font-extrabold ring-2 ring-orange-500/30' 
                              : 'bg-slate-100 text-slate-800 border border-slate-200'
                          }`}>
                            {rule.uf}
                          </span>
                          <div>
                            <p className="font-bold text-slate-900 leading-tight">{rule.ufName}</p>
                            <p className="text-[10px] text-slate-500 truncate max-w-[200px]">{rule.regimeIncentivoImportacao}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-3 py-3 text-center text-slate-600 font-medium">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                          {rule.region}
                        </span>
                      </td>

                      <td className="px-3 py-3 text-center">
                        <div className="inline-flex items-center gap-1 font-bold text-slate-900 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200/60">
                          <input
                            type="number"
                            step="0.1"
                            value={rule.icmsInterno}
                            onChange={(e) => handleUpdateSingleUf(rule.uf, 'icmsInterno', parseFloat(e.target.value) || 0)}
                            className="w-12 text-center bg-transparent font-extrabold text-amber-900 focus:outline-none"
                          />
                          <span className="text-[10px] text-amber-700">%</span>
                        </div>
                      </td>

                      <td className="px-3 py-3 text-center font-semibold text-slate-700">
                        {rule.fcpPercent > 0 ? (
                          <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-bold border border-purple-200">
                            +{rule.fcpPercent}%
                          </span>
                        ) : (
                          <span className="text-slate-400">0%</span>
                        )}
                      </td>

                      <td className="px-3 py-3 text-center">
                        <input
                          type="number"
                          step="0.01"
                          value={rule.mvaOriginal}
                          onChange={(e) => handleUpdateSingleUf(rule.uf, 'mvaOriginal', parseFloat(e.target.value) || 0)}
                          className="w-16 text-center py-1 rounded-lg bg-slate-50 border border-slate-200 font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-500"
                        />
                      </td>

                      <td className="px-3 py-3 text-center font-extrabold text-orange-700 bg-orange-50/50">
                        {rule.mvaAjustada4}%
                      </td>

                      <td className="px-3 py-3 text-center font-bold text-slate-700 bg-slate-50/50">
                        {rule.mvaAjustada12}%
                      </td>

                      <td className="px-3 py-3 text-center">
                        <button
                          onClick={() => handleUpdateSingleUf(rule.uf, 'temProtocoloComMs', !rule.temProtocoloComMs)}
                          className={`px-2.5 py-1 rounded-xl text-[11px] font-bold cursor-pointer transition-all ${
                            rule.temProtocoloComMs
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}
                        >
                          {rule.temProtocoloComMs ? '✓ Sim' : '✕ Não'}
                        </button>
                      </td>

                      <td className="px-3 py-3 text-center font-extrabold text-emerald-700">
                        <span className="px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-200">
                          {rule.icmsImportacaoDesembaraco.toFixed(2)}%
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setSelectedUfForEdit(rule)}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-[11px] transition-colors cursor-pointer shadow-xs"
                        >
                          Detalhes & Benefícios
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. IMPOSTOS FEDERAIS */}
      {activeTab === 'federais' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* PIS / COFINS Monofásico */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-sky-500/10 text-sky-600 flex items-center justify-center font-black">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">PIS & COFINS (Regime Monofásico)</h3>
                <p className="text-slate-500 text-xs">Lei nº 10.485/2002 para Peças e Acessórios Automotivos</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-200/70 text-xs text-sky-900 space-y-2">
              <p className="font-bold flex items-center gap-2">
                <Info className="w-4 h-4 text-sky-600 shrink-0" />
                Como funciona o Monofásico de Autopeças no Balcão?
              </p>
              <p className="leading-relaxed">
                As alíquotas de PIS e COFINS são recolhidas concentradamente na fábrica ou na importação. Na revenda pelo varejista/distribuidor, a alíquota é <strong>Zero (CST 04)</strong>, reduzindo expressivamente o imposto na ponta final!
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-xs font-bold text-slate-700">Ativar Regime Monofásico de Autopeças:</span>
                <input
                  type="checkbox"
                  checked={federalSettings.pisCofinsMonofasico}
                  onChange={(e) => setFederalSettings({ ...federalSettings, pisCofinsMonofasico: e.target.checked })}
                  className="w-5 h-5 accent-orange-600 cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">PIS Revenda Balcão (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={federalSettings.pisAliquotaRevenda}
                    onChange={(e) => setFederalSettings({ ...federalSettings, pisAliquotaRevenda: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">COFINS Revenda Balcão (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={federalSettings.cofinsAliquotaRevenda}
                    onChange={(e) => setFederalSettings({ ...federalSettings, cofinsAliquotaRevenda: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">PIS Importação Peças (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={federalSettings.pisAliquotaImportacao}
                    onChange={(e) => setFederalSettings({ ...federalSettings, pisAliquotaImportacao: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">COFINS Importação Peças (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={federalSettings.cofinsAliquotaImportacao}
                    onChange={(e) => setFederalSettings({ ...federalSettings, cofinsAliquotaImportacao: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">CST PIS/COFINS Saída Padrão</label>
                  <select
                    value={federalSettings.cstPisCofinsSaidaDefault}
                    onChange={(e) => setFederalSettings({ ...federalSettings, cstPisCofinsSaidaDefault: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold text-slate-800"
                  >
                    <option value="04">04 - Monofásico (Alíquota Zero)</option>
                    <option value="06">06 - Alíquota Zero Geral</option>
                    <option value="01">01 - Operação Tributável Carga Básica</option>
                    <option value="49">49 - Outras Operações de Saída</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">CST PIS/COFINS Entrada Padrão</label>
                  <select
                    value={federalSettings.cstPisCofinsEntradaDefault}
                    onChange={(e) => setFederalSettings({ ...federalSettings, cstPisCofinsEntradaDefault: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold text-slate-800"
                  >
                    <option value="70">70 - Aquisição sem Crédito (Monofásico)</option>
                    <option value="50">50 - Operação com Direito a Crédito</option>
                    <option value="98">98 - Outras Entradas</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* IPI, II e Taxas Federais de Importação */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-orange-500/10 text-orange-600 flex items-center justify-center font-black">
                <Ship className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">IPI, II & Taxas Siscomex</h3>
                <p className="text-slate-500 text-xs">Impostos federais sobre industrialização e importação direta</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Alíquota Média IPI (NCM 8708 %)</label>
                <input
                  type="number"
                  step="0.1"
                  value={federalSettings.ipiAliquotaDefault}
                  onChange={(e) => setFederalSettings({ ...federalSettings, ipiAliquotaDefault: parseFloat(e.target.value) || 0 })}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Tarifa Externa Comum TEC - Imposto de Importação II (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={federalSettings.iiAliquotaMedia}
                  onChange={(e) => setFederalSettings({ ...federalSettings, iiAliquotaMedia: parseFloat(e.target.value) || 0 })}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Taxa Siscomex por DI (R$)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={federalSettings.taxaSiscomexPorDi}
                    onChange={(e) => setFederalSettings({ ...federalSettings, taxaSiscomexPorDi: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Taxa por Adição (R$)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={federalSettings.taxaSiscomexPorAdicao}
                    onChange={(e) => setFederalSettings({ ...federalSettings, taxaSiscomexPorAdicao: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">AFRMM - Marinha Mercante sobre Frete Marítimo (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={federalSettings.afrmmPercent}
                  onChange={(e) => setFederalSettings({ ...federalSettings, afrmmPercent: parseFloat(e.target.value) || 0 })}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold text-slate-800"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={handleSaveFederalSettings}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4 text-amber-400" /> Salvar Regras Federais
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. IMPORTAÇÃO CONFORME CADA ESTADO */}
      {activeTab === 'importacao' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 text-white p-6 rounded-3xl shadow-xl border border-emerald-900/50">
            <div className="flex items-center gap-3 mb-2">
              <Ship className="w-6 h-6 text-emerald-400" />
              <h2 className="text-xl font-black">Programas e Benefícios Fiscais Estaduais de Importação</h2>
            </div>
            <p className="text-slate-300 text-xs max-w-3xl leading-relaxed">
              Resumo comparativo dos regimes especiais estaduais para desembaraço aduaneiro de peças importadas (ex: TTD 409 Santa Catarina, PRODEIC MS, FUNDAP Espírito Santo, Zona Franca de Manaus, etc.).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stateRules.map((rule) => (
              <div 
                key={rule.uf}
                className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 hover:border-emerald-400/60 transition-all flex flex-col justify-between space-y-3 group"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 font-extrabold flex items-center justify-center text-sm border border-emerald-500/20">
                      {rule.uf}
                    </span>
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                      {rule.region}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-extrabold text-slate-900 text-sm group-hover:text-emerald-700 transition-colors">
                      {rule.ufName}
                    </h4>
                    <p className="text-xs font-bold text-emerald-600 mt-0.5">
                      {rule.regimeIncentivoImportacao}
                    </p>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    {rule.beneficioImportacaoDesc}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">ICMS Desembaraço:</span>
                  <span className="font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
                    {rule.icmsImportacaoDesembaraco.toFixed(2)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. SIMULADOR TRIBUTÁRIO */}
      {activeTab === 'simulador' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form Side */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <Calculator className="w-5 h-5 text-purple-600" />
              <h3 className="font-extrabold text-slate-900 text-base">Parâmetros da Simulação</h3>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">NCM da Peça</label>
                <select
                  value={simNcm}
                  onChange={(e) => setSimNcm(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-300 font-bold text-slate-800"
                >
                  <option value="8708.30.90">8708.30.90 - Pastilhas e Discos de Freio (5% IPI)</option>
                  <option value="8708.80.00">8708.80.00 - Amortecedores e Suspensão (5% IPI)</option>
                  <option value="8708.93.00">8708.93.00 - Embreagens e Partes (5% IPI)</option>
                  <option value="8421.23.00">8421.23.00 - Filtros de Óleo e Combustível (0% IPI)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">UF Origem (CD)</label>
                  <select
                    value={simUfOrigem}
                    onChange={(e) => setSimUfOrigem(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-300 font-bold text-slate-800"
                  >
                    {stateRules.map(r => (
                      <option key={r.uf} value={r.uf}>{r.uf} - {r.ufName}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">UF Destino</label>
                  <select
                    value={simUfDestino}
                    onChange={(e) => setSimUfDestino(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-300 font-bold text-slate-800"
                  >
                    {stateRules.map(r => (
                      <option key={r.uf} value={r.uf}>{r.uf} - {r.ufName}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Tipo de Operação</label>
                <select
                  value={simTipoOperacao}
                  onChange={(e) => setSimTipoOperacao(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-300 font-bold text-slate-800"
                >
                  <option value="importacao_direta">Importação Direta + Nacionalização</option>
                  <option value="revenda_balcao">Venda Interna Balcão (Varejo)</option>
                  <option value="distribuicao_b2b">Distribuição Interestadual B2B (ICMS-ST)</option>
                  <option value="venda_consumidor_final">Venda Interestadual B2C (DIFAL EC 87/15)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Custo FOB/Unit (R$ ou USD)</label>
                  <input
                    type="number"
                    value={simValorCustoFob}
                    onChange={(e) => setSimValorCustoFob(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-300 font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Frete + Seguro / Unit (R$)</label>
                  <input
                    type="number"
                    value={simFreteSeguro}
                    onChange={(e) => setSimFreteSeguro(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-300 font-bold text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Preço Venda Unit. (R$)</label>
                  <input
                    type="number"
                    value={simPrecoVenda}
                    onChange={(e) => setSimPrecoVenda(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-300 font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Quantidade de Peças</label>
                  <input
                    type="number"
                    value={simQuantidade}
                    onChange={(e) => setSimQuantidade(parseInt(e.target.value, 10) || 1)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-300 font-bold text-slate-800"
                  />
                </div>
              </div>

              <button
                onClick={handleRunSimulation}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-2xl font-bold shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer text-xs"
              >
                <Calculator className="w-4 h-4" /> Calcular Tributação Efetiva
              </button>
            </div>
          </div>

          {/* Results Side */}
          <div className="lg:col-span-2 space-y-4">
            {simResultado ? (
              <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl border border-slate-800 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">Resultado do Cálculo Tributário</span>
                    <h3 className="text-xl font-black text-white">NCM {simResultado.ncm} • {simResultado.ufOrigem} ➔ {simResultado.ufDestino}</h3>
                  </div>

                  <div className="text-right">
                    <p className="text-[11px] text-slate-400">Margem Líquida Real</p>
                    <p className={`text-xl font-black ${simResultado.margemLiquidaPercent >= 20 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {simResultado.margemLiquidaPercent.toFixed(1)}% (R$ {simResultado.margemLiquidaR.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
                    </p>
                  </div>
                </div>

                {/* Grid of Taxes Breakdown */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/60">
                    <p className="text-slate-400 text-[10px]">Imposto Importação (II)</p>
                    <p className="font-extrabold text-slate-200 mt-0.5">R$ {simResultado.iiValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/60">
                    <p className="text-slate-400 text-[10px]">IPI Industrial</p>
                    <p className="font-extrabold text-slate-200 mt-0.5">R$ {simResultado.ipiValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/60">
                    <p className="text-slate-400 text-[10px]">PIS + COFINS Imp.</p>
                    <p className="font-extrabold text-slate-200 mt-0.5">R$ {(simResultado.pisValor + simResultado.cofinsValor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/60">
                    <p className="text-slate-400 text-[10px]">ICMS Desembaraço</p>
                    <p className="font-extrabold text-emerald-400 mt-0.5">R$ {simResultado.icmsProprioValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>

                {/* Summary Totals */}
                <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/80 flex flex-col sm:flex-row justify-between gap-4 text-xs">
                  <div>
                    <p className="text-slate-400">Custo Total Nacionalizado (Posto Galpão):</p>
                    <p className="text-lg font-black text-amber-400">R$ {simResultado.custoTotalNacionalizado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>

                  <div>
                    <p className="text-slate-400">Impostos Totais de Saída / Venda:</p>
                    <p className="text-lg font-black text-rose-400">R$ {simResultado.impostosTotaisVenda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>

                {/* Observações Fiscais */}
                <div className="space-y-2">
                  <h4 className="font-bold text-xs text-slate-300">Parecer Técnico Fiscal:</h4>
                  <div className="space-y-1 text-xs">
                    {simResultado.observacoesFiscais.map((obs, idx) => (
                      <p key={idx} className="text-slate-300 flex items-center gap-2">
                        <span>{obs}</span>
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white p-12 rounded-3xl shadow-sm border border-slate-200 text-center space-y-3">
                <Calculator className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="font-extrabold text-slate-800 text-base">Clique em "Calcular Tributação Efetiva"</h3>
                <p className="text-slate-500 text-xs max-w-sm mx-auto">
                  Preencha o formulário ao lado com os dados do produto ou NCM para simular a carga tributária exata.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. INTEGRAÇÃO SEFAZ & RECEITA FEDERAL */}
      {activeTab === 'sefaz_rfb' && (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <FileCode2 className="w-6 h-6 text-orange-600" />
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Status de Integração SEFAZ & Receita Federal do Brasil</h3>
              <p className="text-slate-500 text-xs">Webservices de NF-e 4.00, NFC-e, MDF-e e Consulta de NCM/Tarifas</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">SEFAZ MS (Autorizador Sede)</span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-100 animate-pulse" />
              </div>
              <p className="text-slate-500 text-[11px]">Webservice NFeAutorizacao4 ONLINE (Latência 120ms)</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">Receita Federal (RFB Monofásico)</span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-100 animate-pulse" />
              </div>
              <p className="text-slate-500 text-[11px]">Tabela 4.3.10 - PIS/COFINS Peças Atualizada</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">Certificado Digital A1</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">VÁLIDO</span>
              </div>
              <p className="text-slate-500 text-[11px]">Expira em: 18/11/2027 (CNPJ Matriz GATO)</p>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detalhes do Estado */}
      {selectedUfForEdit && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-lg w-full rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-orange-600 text-white font-black flex items-center justify-center text-xs">
                  {selectedUfForEdit.uf}
                </span>
                <h3 className="font-extrabold text-slate-900 text-base">{selectedUfForEdit.ufName}</h3>
              </div>
              <button
                onClick={() => setSelectedUfForEdit(null)}
                className="text-slate-400 hover:text-slate-700 font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nome do Regime / Benefício de Importação</label>
                <input
                  type="text"
                  value={selectedUfForEdit.regimeIncentivoImportacao}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedUfForEdit({ ...selectedUfForEdit, regimeIncentivoImportacao: val });
                    handleUpdateSingleUf(selectedUfForEdit.uf, 'regimeIncentivoImportacao', val);
                  }}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-300 font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Descrição do Incentivo de Importação</label>
                <textarea
                  rows={3}
                  value={selectedUfForEdit.beneficioImportacaoDesc}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedUfForEdit({ ...selectedUfForEdit, beneficioImportacaoDesc: val });
                    handleUpdateSingleUf(selectedUfForEdit.uf, 'beneficioImportacaoDesc', val);
                  }}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ICMS Efetivo Desembaraço (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={selectedUfForEdit.icmsImportacaoDesembaraco}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setSelectedUfForEdit({ ...selectedUfForEdit, icmsImportacaoDesembaraco: val });
                      handleUpdateSingleUf(selectedUfForEdit.uf, 'icmsImportacaoDesembaraco', val);
                    }}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-300 font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">DIFAL sem Inscrição</label>
                  <select
                    value={selectedUfForEdit.difalSemInscricao ? 'sim' : 'nao'}
                    onChange={(e) => {
                      const val = e.target.value === 'sim';
                      setSelectedUfForEdit({ ...selectedUfForEdit, difalSemInscricao: val });
                      handleUpdateSingleUf(selectedUfForEdit.uf, 'difalSemInscricao', val);
                    }}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-300 font-bold text-slate-900"
                  >
                    <option value="sim">Sim (Exigido)</option>
                    <option value="nao">Não (Isento/Isenção)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedUfForEdit(null)}
                className="px-5 py-2.5 bg-slate-900 text-white rounded-2xl font-bold text-xs hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Concluído
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
