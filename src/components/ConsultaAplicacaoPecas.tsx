import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  Car, 
  Layers, 
  Filter, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  FileSpreadsheet, 
  ArrowRight, 
  RotateCcw, 
  Boxes, 
  Zap, 
  Wrench, 
  Tag, 
  ChevronRight, 
  ExternalLink,
  PlusCircle,
  Truck,
  Bike,
  Tractor,
  SlidersHorizontal,
  Info,
  Building2,
  Calendar,
  Sparkles,
  RefreshCw,
  Copy,
  Check
} from 'lucide-react';
import { Product, FleetVehicleModel, PartSystemCategory, VehicleFleetSegment, VehicleFleetItem } from '../types';
import { 
  BRAZILIAN_FLEET_DATABASE, 
  getDistinctFleetMakes, 
  getModelsByFleetMake, 
  getAvailableYearsForSelection, 
  getEnginesForSelection,
  queryPartsByVehicleApplication,
  reverseLookupVehiclesForPart 
} from '../data/fleetDatabase';

interface ConsultaAplicacaoPecasProps {
  products: Product[];
  initialVehicle?: VehicleFleetItem | null;
  initialSegment?: string;
  onSelectProductForQuote?: (product: Product, vehicleContext?: { montadora: string; modelo: string; ano: string; motor: string }) => void;
  onNavigateToQuote?: () => void;
  onNavigateToNfe?: () => void;
  onShowNotification?: (title: string, message: string, type?: 'success' | 'warning' | 'info') => void;
  onNavigateToFleet?: () => void;
}

export const ConsultaAplicacaoPecas: React.FC<ConsultaAplicacaoPecasProps> = ({
  products,
  initialVehicle,
  initialSegment,
  onSelectProductForQuote,
  onNavigateToQuote,
  onNavigateToNfe,
  onShowNotification,
  onNavigateToFleet,
}) => {
  // Tabs: 'filtro-aplicacao' | 'busca-reversa' | 'banco-frota'
  const [activeTab, setActiveTab] = useState<'filtro-aplicacao' | 'busca-reversa' | 'banco-frota'>('filtro-aplicacao');

  // Filtro de segmento rápido (Todos, Carros, SUVs, Picapes, Caminhões, Motos, Agrícola)
  const [selectedSegmentFilter, setSelectedSegmentFilter] = useState<string>(initialSegment || 'todos');

  // Filtros de Aplicação
  const [selectedMake, setSelectedMake] = useState<string>('');
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedEngine, setSelectedEngine] = useState<string>('');
  const [selectedSystem, setSelectedSystem] = useState<string>('todos');
  const [freeSearch, setFreeSearch] = useState<string>('');

  // Busca Reversa
  const [reverseSearchCode, setReverseSearchCode] = useState<string>('FRAS-PD58');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Filtros na aba do Banco da Frota
  const [fleetSegmentFilter, setFleetSegmentFilter] = useState<string>('Todos');
  const [fleetYearFilter, setFleetYearFilter] = useState<string>('Todos');
  const [fleetSearchTerm, setFleetSearchTerm] = useState<string>('');
  const [fleetSelectedMakeFilter, setFleetSelectedMakeFilter] = useState<string>('Todas');

  // Export state
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Listas dinâmicas
  const makesList = useMemo(() => getDistinctFleetMakes(), []);

  // Lista de montadoras filtrada por segmento
  const filteredMakesList = useMemo(() => {
    if (selectedSegmentFilter === 'todos') return makesList;
    const segmentVehicles = BRAZILIAN_FLEET_DATABASE.filter(v => v.segmento === selectedSegmentFilter);
    const makesSet = new Set<string>();
    segmentVehicles.forEach(v => makesSet.add(v.montadora));
    return Array.from(makesSet).sort((a, b) => a.localeCompare(b));
  }, [makesList, selectedSegmentFilter]);
  
  const modelsList = useMemo(() => {
    return getModelsByFleetMake(selectedMake);
  }, [selectedMake]);

  const yearsList = useMemo(() => {
    return getAvailableYearsForSelection(selectedMake, selectedModelId);
  }, [selectedMake, selectedModelId]);

  const enginesList = useMemo(() => {
    if (!selectedModelId) return [];
    return getEnginesForSelection(selectedModelId, selectedYear ? parseInt(selectedYear, 10) : undefined);
  }, [selectedModelId, selectedYear]);

  // Efeito para carregar veículo inicial (ex: quando o usuário clica em buscar peças da frota)
  useEffect(() => {
    if (initialVehicle) {
      if (initialVehicle.montadora) {
        setSelectedMake(initialVehicle.montadora);
        const models = getModelsByFleetMake(initialVehicle.montadora);
        const match = models.find(m => 
          (initialVehicle.modelo && m.modelo.toLowerCase().includes(initialVehicle.modelo.toLowerCase())) ||
          (initialVehicle.veiculo && m.modelo.toLowerCase().includes(initialVehicle.veiculo.toLowerCase())) ||
          (m.id === initialVehicle.id)
        );
        if (match) {
          setSelectedModelId(match.id);
        }
      }
      if (initialVehicle.ano) {
        setSelectedYear(String(initialVehicle.ano));
      }
      if (initialVehicle.motor) {
        setSelectedEngine(initialVehicle.motor);
      }
      setActiveTab('filtro-aplicacao');
    }
  }, [initialVehicle]);

  // Handler para troca de segmento rápido
  const handleSelectSegment = (segment: string) => {
    setSelectedSegmentFilter(segment);
    if (segment === 'todos') {
      // mantém montadora se possível
    } else {
      // Verifica se a montadora atual está no segmento, senão escolhe a primeira do segmento
      const segmentVehicles = BRAZILIAN_FLEET_DATABASE.filter(v => v.segmento === segment);
      const makesInSegment = Array.from(new Set(segmentVehicles.map(v => v.montadora)));
      if (!makesInSegment.includes(selectedMake)) {
        const firstMake = makesInSegment[0] || '';
        setSelectedMake(firstMake);
        setSelectedModelId('');
        setSelectedYear('');
        setSelectedEngine('');
      }
    }
    // Sincroniza também com o filtro da aba 3
    setFleetSegmentFilter(segment === 'todos' ? 'Todos' : segment);
  };

  // Limpa campos dependentes ao mudar montadora
  const handleMakeChange = (make: string) => {
    setSelectedMake(make);
    setSelectedModelId('');
    setSelectedYear('');
    setSelectedEngine('');
  };

  // Limpa campos dependentes ao mudar modelo
  const handleModelChange = (modelId: string) => {
    setSelectedModelId(modelId);
    setSelectedYear('');
    setSelectedEngine('');
  };

  // Reset geral dos filtros
  const handleResetFilters = () => {
    setSelectedMake('');
    setSelectedModelId('');
    setSelectedYear('');
    setSelectedEngine('');
    setSelectedSystem('todos');
    setFreeSearch('');
  };

  // Query de aplicação de peças
  const applicationResults = useMemo(() => {
    return queryPartsByVehicleApplication(products, {
      montadora: selectedMake,
      modeloId: selectedModelId,
      ano: selectedYear ? parseInt(selectedYear, 10) : undefined,
      motor: selectedEngine,
      sistema: selectedSystem,
      termoBusca: freeSearch
    });
  }, [products, selectedMake, selectedModelId, selectedYear, selectedEngine, selectedSystem, freeSearch]);

  // Consulta Reversa (Peça -> Frota)
  const reverseLookupResult = useMemo(() => {
    if (!reverseSearchCode.trim()) return null;
    return reverseLookupVehiclesForPart(products, reverseSearchCode.trim());
  }, [products, reverseSearchCode]);

  // Filtro do Banco da Frota
  const filteredFleetList = useMemo(() => {
    let list = [...BRAZILIAN_FLEET_DATABASE];

    if (fleetSelectedMakeFilter && fleetSelectedMakeFilter !== 'Todas') {
      list = list.filter(v => v.montadora === fleetSelectedMakeFilter);
    }

    if (fleetSegmentFilter && fleetSegmentFilter !== 'Todos') {
      list = list.filter(v => v.segmento === fleetSegmentFilter);
    }

    if (fleetYearFilter && fleetYearFilter !== 'Todos') {
      const year = parseInt(fleetYearFilter, 10);
      list = list.filter(v => year >= v.anoInicio && year <= v.anoFim);
    }

    if (fleetSearchTerm.trim()) {
      const s = fleetSearchTerm.toLowerCase();
      list = list.filter(v => 
        v.montadora.toLowerCase().includes(s) ||
        v.modelo.toLowerCase().includes(s) ||
        v.geracaoFase.toLowerCase().includes(s) ||
        v.motores.some(m => m.toLowerCase().includes(s)) ||
        (v.pecasChave && v.pecasChave.some(p => p.toLowerCase().includes(s)))
      );
    }

    return list;
  }, [fleetSelectedMakeFilter, fleetSegmentFilter, fleetYearFilter, fleetSearchTerm]);

  // Manipulador de Lançamento na Cotação
  const handleSendToQuote = (product: Product) => {
    const selectedModelObj = BRAZILIAN_FLEET_DATABASE.find(m => m.id === selectedModelId);
    const vehicleContext = {
      montadora: selectedMake || (selectedModelObj ? selectedModelObj.montadora : 'Diversos'),
      modelo: selectedModelObj ? selectedModelObj.modelo : 'Veículo Selecionado',
      ano: selectedYear || 'Todos',
      motor: selectedEngine || 'Padrão'
    };

    if (onSelectProductForQuote) {
      onSelectProductForQuote(product, vehicleContext);
      if (onShowNotification) {
        onShowNotification(
          'Item Lançado no Balcão!',
          `Peça ${product.code} - ${product.name} pronta para orçamento com o veículo vinculado.`,
          'success'
        );
      }
    }
  };

  // Download da Base de Dados da Frota (1995-2027)
  const handleDownloadDatabase = (format: 'json' | 'csv') => {
    setIsExporting(true);
    try {
      if (format === 'json') {
        const payload = {
          titulo: "Banco da Frota Comercializada no Brasil (1995 a 2027) & Aplicação de Peças",
          geradoEm: new Date().toISOString(),
          versao: "2.4.0",
          totalModelos: BRAZILIAN_FLEET_DATABASE.length,
          periodo: "1995 a 2027",
          marcas: makesList,
          modelosFrota: BRAZILIAN_FLEET_DATABASE,
          produtosCatalogo: products.map(p => ({
            id: p.id,
            codigo: p.code,
            codigoOEM: p.oemCode,
            similares: p.similarCodes,
            nome: p.name,
            marca: p.brand,
            categoria: p.category,
            estoque: p.stock,
            precoVenda: p.sellingPrice,
            aplicacoes: p.applications
          }))
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `frota_brasil_1995_2027_aplicacao_pecas.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        const headers = [
          "ID_MODELO", "MONTADORA", "MODELO", "SEGMENTO", "GERACAO_FASE", 
          "ANO_INICIO", "ANO_FIM", "MOTORES", "COMBUSTIVEIS", "SISTEMAS_COMPATIVEIS", "PECAS_CHAVE"
        ];
        const rows = BRAZILIAN_FLEET_DATABASE.map(v => [
          `"${v.id}"`,
          `"${v.montadora}"`,
          `"${v.modelo.replace(/"/g, '""')}"`,
          `"${v.segmento}"`,
          `"${v.geracaoFase.replace(/"/g, '""')}"`,
          v.anoInicio,
          v.anoFim,
          `"${v.motores.join("; ").replace(/"/g, '""')}"`,
          `"${v.combustiveis.join("; ")}"`,
          `"${v.sistemasCompativeis.join("; ")}"`,
          `"${(v.pecasChave || []).join("; ").replace(/"/g, '""')}"`
        ]);
        const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\r\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `frota_brasil_1995_2027_aplicacao_pecas.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

      if (onShowNotification) {
        onShowNotification(
          'Download Concluído!',
          `A base de dados da frota brasileira (1995 a 2027) foi exportada em formato ${format.toUpperCase()}.`,
          'success'
        );
      }
    } catch (err: any) {
      if (onShowNotification) {
        onShowNotification('Erro na exportação', err.message, 'warning');
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const selectedModelObj = BRAZILIAN_FLEET_DATABASE.find(m => m.id === selectedModelId);

  return (
    <div id="consulta-aplicacao-view" className="space-y-6">
      {/* Top Banner & Title */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-6 sm:p-8 rounded-3xl shadow-xl border border-slate-700/60 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-gradient-to-l from-indigo-500/10 to-transparent pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Frota Comercializada no Brasil • 1995 a 2027
              </span>
              <span className="px-2.5 py-0.5 bg-sky-500/20 text-sky-300 border border-sky-500/30 rounded-full text-xs font-medium">
                {BRAZILIAN_FLEET_DATABASE.length} Plataformas Nacionais
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <Car className="w-8 h-8 text-sky-400" />
              Consulta & Aplicação de Peças
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl leading-relaxed">
              Filtre instantaneamente peças do seu estoque compatíveis com qualquer veículo vendido no Brasil entre 1995 e 2027 (Passeio, Utilitários, SUVs, Caminhões, Motos e Tratores Agrícolas).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => handleDownloadDatabase('json')}
              disabled={isExporting}
              className="px-4 py-2.5 bg-slate-800/80 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold border border-slate-600 transition flex items-center gap-2 cursor-pointer shadow-sm hover:shadow"
              title="Baixar banco completo da frota e peças em formato JSON"
            >
              <Download className="w-4 h-4 text-sky-400" />
              Baixar Banco (JSON)
            </button>
            <button
              type="button"
              onClick={() => handleDownloadDatabase('csv')}
              disabled={isExporting}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-md hover:shadow-indigo-500/20"
              title="Exportar tabela de aplicação formatada para Excel"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Exportar p/ Excel (CSV)
            </button>
          </div>
        </div>

        {/* Quick Navigation Tabs */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-700/50 overflow-x-auto text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('filtro-aplicacao')}
            className={`px-4 py-2 rounded-xl transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'filtro-aplicacao'
                ? 'bg-sky-500 text-slate-950 font-bold shadow'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Filter className="w-4 h-4" />
            1. Filtrar Peças por Veículo (1995-2027)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('busca-reversa')}
            className={`px-4 py-2 rounded-xl transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'busca-reversa'
                ? 'bg-sky-500 text-slate-950 font-bold shadow'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            2. Busca Reversa (Peça → Veículos)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('banco-frota')}
            className={`px-4 py-2 rounded-xl transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'banco-frota'
                ? 'bg-sky-500 text-slate-950 font-bold shadow'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            3. Base da Frota Comercializada ({BRAZILIAN_FLEET_DATABASE.length} Modelos)
          </button>
        </div>
      </div>

      {/* Sequential Sales Stepper */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-3 shadow-xs flex items-center justify-between gap-3 overflow-x-auto">
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-black uppercase text-indigo-700 tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Fluxo Sequencial de Venda:
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 text-xs font-bold">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-950">
            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black">1</span>
            <span>Aplicação Veicular (1995-2027)</span>
            <span className="text-[10px] text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded font-bold">Passo Atual</span>
          </div>

          <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />

          <button
            type="button"
            onClick={onNavigateToQuote}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 transition cursor-pointer"
            title="Ir para o Balcão e Cotação"
          >
            <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-black">2</span>
            <span>Cotação & Balcão (DAV)</span>
          </button>

          <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />

          <button
            type="button"
            onClick={onNavigateToNfe}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 transition cursor-pointer"
            title="Ir para Emissão de NF-e"
          >
            <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-black">3</span>
            <span>Faturamento & NF-e</span>
          </button>
        </div>

        {onNavigateToQuote && (
          <button
            type="button"
            onClick={onNavigateToQuote}
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer shrink-0"
          >
            <span>Avançar para o Balcão</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* ========================================== */}
      {/* ABA 1: FILTRAR PEÇAS POR VEÍCULO */}
      {/* ========================================== */}
      {activeTab === 'filtro-aplicacao' && (
        <div className="space-y-6">
          {/* Caixa de Seleção em Cascata */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-sm">
                  1
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Selecione o Veículo para Buscar Peças Compatíveis</h3>
                  <p className="text-xs text-slate-500">
                    O sistema cruza as especificações do veículo com as aplicações do catálogo técnico e estoque físico.
                  </p>
                </div>
              </div>

              {(selectedMake || selectedModelId || selectedYear || selectedEngine || selectedSystem !== 'todos' || freeSearch) && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Limpar Todos os Filtros
                </button>
              )}
            </div>

            {/* Filtros Rápidos de Segmento / Tipo de Veículo */}
            <div className="space-y-1.5 pt-1">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Filtrar por Categoria / Segmento:
              </label>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                {[
                  { id: 'todos', label: 'Todos os Segmentos', icon: '🌐' },
                  { id: 'Caminhão / Pesado', label: '🚛 Caminhões & Pesados', highlight: true },
                  { id: 'Automóvel / Hatch', label: '🚗 Carros & Hatches' },
                  { id: 'SUV / Crossover', label: '🚙 SUVs & Crossovers' },
                  { id: 'Picape / Utilitário', label: '🛻 Picapes & Utilitários' },
                  { id: 'Motocicleta', label: '🏍️ Motos' },
                  { id: 'Agrícola / Máquina', label: '🚜 Agrícola & Tratores' },
                ].map(seg => (
                  <button
                    key={seg.id}
                    type="button"
                    onClick={() => handleSelectSegment(seg.id)}
                    className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                      selectedSegmentFilter === seg.id
                        ? 'bg-sky-600 text-white shadow-sm ring-2 ring-sky-300'
                        : seg.highlight
                        ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-extrabold'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <span>{seg.icon || ''}</span>
                    <span>{seg.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Selectores em Cascata */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 1. Montadora */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Montadora</span>
                  {selectedMake && <span className="text-[10px] text-sky-600 font-semibold">{modelsList.length} modelos</span>}
                </label>
                <select
                  value={selectedMake}
                  onChange={(e) => handleMakeChange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition cursor-pointer"
                >
                  <option value="">{selectedSegmentFilter !== 'todos' ? `Montadoras de ${selectedSegmentFilter} (${filteredMakesList.length})` : `Todas as Montadoras (${makesList.length})`}</option>
                  {filteredMakesList.map(make => (
                    <option key={make} value={make}>{make}</option>
                  ))}
                </select>
              </div>

              {/* 2. Modelo */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Modelo do Veículo
                </label>
                <select
                  value={selectedModelId}
                  onChange={(e) => handleModelChange(e.target.value)}
                  disabled={!selectedMake && modelsList.length > 30}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <option value="">{selectedMake ? "Todos os Modelos da Marca" : "Selecione a Montadora Primeiro"}</option>
                  {modelsList.map(model => (
                    <option key={model.id} value={model.id}>
                      {model.modelo} ({model.anoInicio}-{model.anoFim})
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Ano de Fabricação (1995 a 2027) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Ano (1995 a 2027)</span>
                  <span className="text-[10px] text-emerald-600 font-semibold">Frota 33 Anos</span>
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition cursor-pointer"
                >
                  <option value="">Qualquer Ano (1995 a 2027)</option>
                  {yearsList.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

              {/* 4. Motorização */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Motorização / Versão
                </label>
                <select
                  value={selectedEngine}
                  onChange={(e) => setSelectedEngine(e.target.value)}
                  disabled={!selectedModelId || enginesList.length === 0}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <option value="">Todos os Motores</option>
                  {enginesList.map(eng => (
                    <option key={eng} value={eng}>{eng}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Linha Secundária: Filtro por Sistema e Busca Livre */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
              {/* Sistema da Peça */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Sistema / Categoria da Peça
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'todos', label: 'Todos' },
                    { id: 'Freio', label: 'Freios' },
                    { id: 'Suspensão', label: 'Suspensão' },
                    { id: 'Filtros', label: 'Filtros' },
                    { id: 'Motor', label: 'Motor' },
                    { id: 'Transmissão', label: 'Transmissão' },
                    { id: 'Arrefecimento', label: 'Arrefecimento' }
                  ].map(sys => (
                    <button
                      key={sys.id}
                      type="button"
                      onClick={() => setSelectedSystem(sys.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                        selectedSystem === sys.id
                          ? 'bg-slate-900 text-white font-bold shadow-sm'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {sys.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Busca Livre por Descrição, SKU ou OEM */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Busca Textual (Nome da Peça, Código Original OEM, Similar ou Fabricante)
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={freeSearch}
                    onChange={(e) => setFreeSearch(e.target.value)}
                    placeholder="Ex: Pastilha cerâmica, W712/52, 044650D020, Amortecedor dianteiro, Cofap..."
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-xl pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition"
                  />
                  {freeSearch && (
                    <button
                      type="button"
                      onClick={() => setFreeSearch('')}
                      className="text-xs text-slate-400 hover:text-slate-600 absolute right-3 top-3 cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Informações do Veículo Selecionado */}
            {selectedModelObj && (
              <div className="bg-sky-50/60 rounded-2xl p-4 border border-sky-200/70 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sky-950 text-sm">{selectedModelObj.montadora} {selectedModelObj.modelo}</span>
                    <span className="px-2 py-0.5 bg-sky-200 text-sky-800 rounded-md font-bold text-[11px]">
                      {selectedModelObj.anoInicio} a {selectedModelObj.anoFim}
                    </span>
                    <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded-md font-medium text-[11px]">
                      {selectedModelObj.segmento}
                    </span>
                  </div>
                  <p className="text-slate-600">
                    <strong className="text-slate-800">Geração/Fase:</strong> {selectedModelObj.geracaoFase} • <strong className="text-slate-800">Combustível:</strong> {selectedModelObj.combustiveis.join(', ')}
                  </p>
                  {selectedModelObj.descricaoMercado && (
                    <p className="text-slate-500 italic">{selectedModelObj.descricaoMercado}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 self-start md:self-center shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setFreeSearch('');
                      setSelectedSystem('todos');
                    }}
                    className="px-3 py-1.5 bg-white hover:bg-sky-100 text-sky-900 rounded-xl border border-sky-300 font-semibold transition cursor-pointer"
                  >
                    Ver Todas as Peças Deste Carro
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Grade de Resultados de Peças Compatíveis */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Boxes className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-lg">
                  Peças Compatíveis Encontradas
                </h3>
                <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-800 rounded-full text-xs font-bold">
                  {applicationResults.length} {applicationResults.length === 1 ? 'item' : 'itens'}
                </span>
              </div>

              <div className="text-xs text-slate-500">
                {selectedMake || selectedModelId || selectedYear ? (
                  <span>Filtrado para: <strong className="text-slate-800">{selectedMake || 'Qualquer'} {selectedModelObj?.modelo || ''} {selectedYear ? `(${selectedYear})` : ''}</strong></span>
                ) : (
                  <span>Exibindo catálogo completo de peças com aplicação na frota</span>
                )}
              </div>
            </div>

            {applicationResults.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm space-y-3">
                <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
                <h4 className="text-base font-bold text-slate-900">Nenhuma peça compatível encontrada com os filtros atuais</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Tente alterar o ano, selecionar outro sistema ou limpar os filtros para expandir a busca em outras marcas e categorias.
                </p>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition cursor-pointer"
                >
                  Restaurar Filtros Padrão
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {applicationResults.map((match) => {
                  const p = match.product;
                  return (
                    <div
                      key={p.id}
                      className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden p-5 group"
                    >
                      <div className="space-y-3">
                        {/* Header: Categoria e Badge de Compatibilidade */}
                        <div className="flex items-start justify-between gap-2">
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wide ${
                            match.compatibilityType === 'Exata'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : match.compatibilityType === 'Multi-aplicação'
                              ? 'bg-sky-100 text-sky-800 border border-sky-300'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {match.compatibilityType}
                          </span>

                          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                            {p.brand}
                          </span>
                        </div>

                        {/* Imagem + Título */}
                        <div className="flex gap-3 items-start">
                          {p.imageUrl ? (
                            <img
                              src={p.imageUrl}
                              alt={p.name}
                              referrerPolicy="no-referrer"
                              className="w-16 h-16 rounded-xl object-cover border border-slate-100 shrink-0 bg-slate-50"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center shrink-0 border border-slate-200">
                              <Boxes className="w-7 h-7" />
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <h4 className="font-extrabold text-slate-900 text-sm leading-snug group-hover:text-indigo-600 transition">
                              {p.name}
                            </h4>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                                {p.code}
                              </span>
                              {p.oemCode && (
                                <span className="text-[10px] text-slate-500 font-mono" title="Código Original de Montadora">
                                  OEM: {p.oemCode}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Nota Técnica de Aplicação */}
                        <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 text-xs text-slate-600 leading-snug">
                          <p className="line-clamp-2">
                            <strong className="text-slate-800 font-semibold">Aplicação:</strong> {match.technicalNotes}
                          </p>
                        </div>

                        {/* Similar Codes / Cruzamento */}
                        {p.similarCodes && p.similarCodes.length > 0 && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-500">
                            <span className="font-semibold text-slate-600">Similares:</span>
                            <div className="flex flex-wrap gap-1">
                              {p.similarCodes.slice(0, 3).map((sim, i) => (
                                <span key={i} className="bg-slate-100 px-1.5 py-0.2 rounded font-mono text-[10px]">
                                  {sim}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Localização Física e Estoque */}
                        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 text-slate-600">
                          <div>
                            <span className="text-[11px] text-slate-400">Armazém:</span>{' '}
                            <span className="font-semibold text-slate-800">
                              {p.location.corridor} • {p.location.shelf} • {p.location.box}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 font-bold">
                            <span className="text-slate-500 text-[11px]">Estoque:</span>
                            <span className={p.stock > 0 ? 'text-emerald-700' : 'text-rose-600'}>
                              {p.stock} un
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Preço e Botão de Ação para Cotação / Balcão */}
                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Preço Balcão</span>
                          <span className="text-lg font-black text-slate-950">
                            {p.sellingPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setReverseSearchCode(p.code);
                              setActiveTab('busca-reversa');
                            }}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                            title="Ver todos os veículos onde esta peça aplica"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSendToQuote(p)}
                            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm hover:shadow"
                          >
                            <PlusCircle className="w-4 h-4" />
                            Cotar Peça
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* ABA 2: CONSULTA REVERSA (PEÇA -> VEÍCULOS) */}
      {/* ========================================== */}
      {activeTab === 'busca-reversa' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <RotateCcw className="w-5 h-5 text-sky-600" />
              <div>
                <h3 className="font-bold text-slate-900 text-base">Consulta Reversa: Onde Esta Peça Aplica?</h3>
                <p className="text-xs text-slate-500">
                  Informe o SKU interno, Código Original (OEM) ou Código Similar para obter a lista completa de modelos e anos atendidos.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={reverseSearchCode}
                  onChange={(e) => setReverseSearchCode(e.target.value)}
                  placeholder="Ex: FRAS-PD58, BOS-0986AF0043, 25010792, COF-GP30123, WK8109..."
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-xl pl-10 pr-4 py-3 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition font-mono uppercase"
                />
              </div>

              {/* Botões rápidos com peças populares */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-bold text-slate-500">Exemplos:</span>
                {['FRAS-PD58', 'BOS-0986AF0043', 'COF-GP30123', 'MANN-WK8109', 'NGK-BKR6E-D', 'CER-BYD01'].map(code => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setReverseSearchCode(code)}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-mono font-semibold transition cursor-pointer"
                  >
                    {code}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Resultado da Consulta Reversa */}
          {reverseLookupResult && reverseLookupResult.product ? (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
              {/* Cabeçalho do Produto */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                <div className="flex items-center gap-4">
                  {reverseLookupResult.product.imageUrl ? (
                    <img
                      src={reverseLookupResult.product.imageUrl}
                      alt={reverseLookupResult.product.name}
                      referrerPolicy="no-referrer"
                      className="w-20 h-20 rounded-2xl object-cover border border-slate-200 bg-slate-50"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                      <Boxes className="w-10 h-10" />
                    </div>
                  )}

                  <div>
                    <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-800 rounded-md text-xs font-extrabold uppercase">
                      {reverseLookupResult.product.brand}
                    </span>
                    <h2 className="text-xl font-black text-slate-900 mt-1">
                      {reverseLookupResult.product.name}
                    </h2>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 mt-1">
                      <span className="font-mono bg-slate-100 px-2 py-0.5 rounded font-bold">
                        SKU: {reverseLookupResult.product.code}
                      </span>
                      {reverseLookupResult.product.oemCode && (
                        <span className="font-mono text-slate-500">
                          OEM: {reverseLookupResult.product.oemCode}
                        </span>
                      )}
                      <span className="font-bold text-emerald-700">
                        Estoque: {reverseLookupResult.product.stock} un
                      </span>
                      <span className="font-black text-slate-900">
                        {reverseLookupResult.product.sellingPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleSendToQuote(reverseLookupResult.product!)}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <PlusCircle className="w-4 h-4" />
                  Inserir na Cotação de Venda
                </button>
              </div>

              {/* Aplicações Técnicas Especificadas na Peça */}
              {reverseLookupResult.customApplications.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Aplicações Específicas Cadastradas na Ficha da Peça:
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {reverseLookupResult.customApplications.map((appStr, idx) => (
                      <div key={idx} className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-3 text-xs text-emerald-950 flex items-start gap-2.5">
                        <Check className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                        <span className="font-medium leading-relaxed">{appStr}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Veículos da Frota Comercializada Associados */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Car className="w-4 h-4 text-sky-600" />
                  Veículos Compatíveis no Banco da Frota Brasileira (1995-2027):
                </h4>

                {reverseLookupResult.appliedVehicles.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">
                    Nenhum modelo da frota brasileira diretamente cruzado. Verifique as aplicações específicas acima.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {reverseLookupResult.appliedVehicles.map(veh => (
                      <div
                        key={veh.id}
                        className="bg-slate-50 hover:bg-sky-50/50 border border-slate-200 hover:border-sky-300 rounded-2xl p-4 transition text-xs space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 text-sm">{veh.montadora}</span>
                          <span className="px-2 py-0.5 bg-sky-100 text-sky-800 rounded font-bold text-[11px]">
                            {veh.anoInicio} - {veh.anoFim}
                          </span>
                        </div>

                        <p className="font-semibold text-slate-800">{veh.modelo}</p>
                        <p className="text-slate-500 text-[11px]">{veh.geracaoFase}</p>

                        <div className="pt-2 border-t border-slate-200/60 text-[11px] text-slate-600">
                          <span className="font-semibold">Motores:</span> {veh.motores.join(', ')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm space-y-2">
              <AlertCircle className="w-10 h-10 text-slate-400 mx-auto" />
              <h4 className="text-base font-bold text-slate-800">Código de peça não localizado</h4>
              <p className="text-xs text-slate-500">
                Digite um código válido como <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">FRAS-PD58</code> ou <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">BOS-0986AF0043</code>.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ========================================== */}
      {/* ABA 3: BANCO DA FROTA NACIONAL (1995-2027) */}
      {/* ========================================== */}
      {activeTab === 'banco-frota' && (
        <div className="space-y-6">
          {/* Painel de Filtros da Frota */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Banco Completo da Frota Brasileira (1995 - 2027)</h3>
                <p className="text-xs text-slate-500">
                  Total de {BRAZILIAN_FLEET_DATABASE.length} plataformas estruturadas para montagem de catálogos e filtros de autopeças.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadDatabase('json')}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-sky-600" />
                  JSON
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadDatabase('csv')}
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-emerald-200 transition cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  CSV / Excel
                </button>
              </div>
            </div>

            {/* Linha de Filtros */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Filtro por Marca */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">Montadora</label>
                <select
                  value={fleetSelectedMakeFilter}
                  onChange={(e) => setFleetSelectedMakeFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl px-3 py-2"
                >
                  <option value="Todas">Todas as Montadoras ({makesList.length})</option>
                  {makesList.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              {/* Filtro por Segmento */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">Segmento</label>
                <select
                  value={fleetSegmentFilter}
                  onChange={(e) => setFleetSegmentFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl px-3 py-2"
                >
                  <option value="Todos">Todos os Segmentos</option>
                  <option value="Passeio">Passeio (Hatch, Sedan, SW)</option>
                  <option value="SUV">SUV / Crossover</option>
                  <option value="Pickup / Utilitário">Pickup / Utilitário</option>
                  <option value="Van / Comercial Leve">Van / Comercial Leve</option>
                  <option value="Caminhão / Pesado">Caminhão / Linha Pesada</option>
                  <option value="Moto">Motocicletas</option>
                  <option value="Agrícola">Tratores & Máquinas Agrícolas</option>
                </select>
              </div>

              {/* Filtro por Ano */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">Ano de Fabricação</label>
                <select
                  value={fleetYearFilter}
                  onChange={(e) => setFleetYearFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl px-3 py-2"
                >
                  <option value="Todos">Todos os Anos (1995 a 2027)</option>
                  {Array.from({ length: 33 }, (_, i) => 2027 - i).map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

              {/* Busca Livre */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">Pesquisar Modelo ou Motor</label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={fleetSearchTerm}
                    onChange={(e) => setFleetSearchTerm(e.target.value)}
                    placeholder="Ex: Gol, Hilux, FH, CG 160..."
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl pl-9 pr-3 py-2"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Tabela do Banco da Frota */}
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-900 text-white uppercase text-[10px] tracking-wider font-extrabold">
                  <tr>
                    <th className="py-3.5 px-4">Montadora</th>
                    <th className="py-3.5 px-4">Modelo & Geração</th>
                    <th className="py-3.5 px-3">Segmento</th>
                    <th className="py-3.5 px-3">Período Vendas</th>
                    <th className="py-3.5 px-4">Motorizações no Brasil</th>
                    <th className="py-3.5 px-3">Combustível</th>
                    <th className="py-3.5 px-4">Peças-Chave de Reposição</th>
                    <th className="py-3.5 px-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredFleetList.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-950 whitespace-nowrap">
                        {item.montadora}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-slate-900">{item.modelo}</div>
                        <div className="text-[11px] text-slate-500">{item.geracaoFase}</div>
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                          item.segmento === 'Caminhão / Pesado' ? 'bg-amber-100 text-amber-800' :
                          item.segmento === 'Agrícola' ? 'bg-emerald-100 text-emerald-800' :
                          item.segmento === 'Moto' ? 'bg-purple-100 text-purple-800' :
                          item.segmento === 'SUV' ? 'bg-sky-100 text-sky-800' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {item.segmento}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap font-mono font-bold text-sky-700">
                        {item.anoInicio} - {item.anoFim}
                      </td>
                      <td className="py-3.5 px-4 max-w-xs text-[11px] text-slate-600">
                        {item.motores.join(' • ')}
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap text-[11px] text-slate-600">
                        {item.combustiveis.join(', ')}
                      </td>
                      <td className="py-3.5 px-4 max-w-sm text-[11px] text-slate-500">
                        {item.pecasChave && item.pecasChave.length > 0 ? (
                          <div className="line-clamp-2">{item.pecasChave.join(' • ')}</div>
                        ) : (
                          <span className="italic">Peças padrão</span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedMake(item.montadora);
                            setSelectedModelId(item.id);
                            setActiveTab('filtro-aplicacao');
                          }}
                          className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-lg text-xs font-bold transition flex items-center gap-1 ml-auto cursor-pointer"
                        >
                          Filtrar Peças
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Mostrando {filteredFleetList.length} de {BRAZILIAN_FLEET_DATABASE.length} modelos cadastrados (1995 a 2027)</span>
              <span className="font-semibold text-slate-700">Abrangência de Mercado: Brasil Nacional</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
