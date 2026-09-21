import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Car, 
  Search, 
  Plus, 
  Pencil, 
  Trash2, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  RefreshCw, 
  Calculator, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight, 
  X, 
  Check, 
  AlertCircle, 
  AlertTriangle,
  Calendar,
  Layers,
  Sparkles,
  Copy,
  ChevronDown,
  Loader2,
  Eye,
  Info
} from 'lucide-react';
import { VehicleFleetItem, VehicleApiResponse } from '../types';

interface GestaoFrotaVeiculosProps {
  onSelectVehicleForQuote?: (vehicle: VehicleFleetItem) => void;
  onNavigateToPartsApplication?: (vehicle?: VehicleFleetItem) => void;
  onShowNotification: (title: string, message: string, type?: 'success' | 'warning' | 'info') => void;
}

type SortField = 'montadora' | 'modelo' | 'veiculo' | 'ano' | 'motor';
type SortOrder = 'asc' | 'desc';

// Sugestões rápidas de motorização para o campo com máscara
const MOTOR_SUGGESTIONS = [
  '1.0 8V Flex',
  '1.0 12V Turbo Flex',
  '1.3 8V Firefly Flex',
  '1.6 8V EA111 Total Flex',
  '1.6 16V MSI Flex',
  '2.0 16V Dynamic Force Flex',
  '2.0 Turbo Diesel 4x4',
  '2.8 CTDI Turbo Diesel',
  '2.2 CDI Bi-Turbo OM651',
  '13.0L Euro 6 540cv'
];

export const GestaoFrotaVeiculos: React.FC<GestaoFrotaVeiculosProps> = ({
  onSelectVehicleForQuote,
  onNavigateToPartsApplication,
  onShowNotification,
}) => {
  const currentYear = new Date().getFullYear();

  // API State
  const [vehicles, setVehicles] = useState<VehicleFleetItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);

  // Filter & Pagination State
  const [search, setSearch] = useState<string>('');
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [anoMin, setAnoMin] = useState<string>('');
  const [anoMax, setAnoMax] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortField>('modelo'); // Regra: ordenação padrão por "Modelo"
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Modal State (Create / Edit)
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingTargetId, setEditingTargetId] = useState<string | null>(null);
  const [editingTargetVeiculo, setEditingTargetVeiculo] = useState<string | null>(null);

  // Modal State: Detalhes do Veículo ao Clicar na Linha
  const [selectedVehicleForDetails, setSelectedVehicleForDetails] = useState<VehicleFleetItem | null>(null);
  const [copiedNotification, setCopiedNotification] = useState<boolean>(false);

  // Form Fields (JSON Schema: id, montadora, veiculo, ano, motor, modelo)
  const [formData, setFormData] = useState({
    montadora: '',
    modelo: '',
    veiculo: '',
    ano: currentYear.toString(),
    motor: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Autocomplete State for Montadora (Combobox Assíncrono)
  const [brandSuggestions, setBrandSuggestions] = useState<string[]>([]);
  const [isLoadingBrands, setIsLoadingBrands] = useState<boolean>(false);
  const [isBrandDropdownOpen, setIsBrandDropdownOpen] = useState<boolean>(false);
  const brandDropdownRef = useRef<HTMLDivElement>(null);

  // Autocomplete State for Modelo (Combobox Assíncrono)
  const [modelSuggestions, setModelSuggestions] = useState<string[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState<boolean>(false);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState<boolean>(false);
  const modelDropdownRef = useRef<HTMLDivElement>(null);

  // Delete Confirmation Modal State
  const [vehicleToDelete, setVehicleToDelete] = useState<VehicleFleetItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Close combobox dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (brandDropdownRef.current && !brandDropdownRef.current.contains(event.target as Node)) {
        setIsBrandDropdownOpen(false);
      }
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target as Node)) {
        setIsModelDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch Brands for Autocomplete (Async Combobox)
  const fetchBrandSuggestions = useCallback(async (query: string) => {
    setIsLoadingBrands(true);
    try {
      const res = await fetch(`/api/vehicles/makes?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.success) {
        setBrandSuggestions(data.data);
      }
    } catch {
      // Keep existing suggestions on error
    } finally {
      setIsLoadingBrands(false);
    }
  }, []);

  // Fetch Models for Autocomplete (Async Combobox)
  const fetchModelSuggestions = useCallback(async (brand: string, query: string) => {
    setIsLoadingModels(true);
    try {
      const res = await fetch(`/api/vehicles/models?brand=${encodeURIComponent(brand)}&q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.success) {
        setModelSuggestions(data.data);
      }
    } catch {
      // Keep existing suggestions on error
    } finally {
      setIsLoadingModels(false);
    }
  }, []);

  // Fetch Vehicles from REST API
  const fetchVehicles = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (selectedBrand) params.append('montadora', selectedBrand);
      if (anoMin) params.append('anoMin', anoMin);
      if (anoMax) params.append('anoMax', anoMax);
      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder);
      params.append('page', page.toString());
      params.append('pageSize', pageSize.toString());

      const res = await fetch(`/api/vehicles?${params.toString()}`);
      const data: VehicleApiResponse = await res.json();

      if (data.success) {
        setVehicles(data.data);
        setTotal(data.total);
        setTotalPages(data.totalPages);
        if (data.availableBrands) {
          setAvailableBrands(data.availableBrands);
        }
      } else {
        onShowNotification('Erro na API', data.error || 'Falha ao carregar veículos', 'warning');
      }
    } catch (err: any) {
      onShowNotification('Erro de Conexão', err.message || 'Não foi possível conectar à API REST', 'warning');
    } finally {
      setIsLoading(false);
    }
  }, [search, selectedBrand, anoMin, anoMax, sortBy, sortOrder, page, pageSize, onShowNotification]);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  // Reset page to 1 when filters change
  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const handleBrandChange = (val: string) => {
    setSelectedBrand(val);
    setPage(1);
  };

  const handleAnoMinChange = (val: string) => {
    const cleanVal = val.replace(/\D/g, '').slice(0, 4);
    setAnoMin(cleanVal);
    setPage(1);
  };

  const handleAnoMaxChange = (val: string) => {
    const cleanVal = val.replace(/\D/g, '').slice(0, 4);
    setAnoMax(cleanVal);
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearch('');
    setSelectedBrand('');
    setAnoMin('');
    setAnoMax('');
    setSortBy('modelo');
    setSortOrder('asc');
    setPage(1);
  };

  // Toggle Sorting for a Column
  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setPage(1);
  };

  // Open Modal for Create
  const handleOpenCreateModal = () => {
    setModalMode('create');
    setEditingTargetId(null);
    setEditingTargetVeiculo(null);
    setFormData({
      montadora: '',
      modelo: '',
      veiculo: '',
      ano: currentYear.toString(),
      motor: '',
    });
    setFormErrors({});
    setIsModalOpen(true);
    fetchBrandSuggestions('');
    fetchModelSuggestions('', '');
  };

  // Open Modal for Edit
  const handleOpenEditModal = (item: VehicleFleetItem) => {
    setModalMode('edit');
    setEditingTargetId(item.id || null);
    setEditingTargetVeiculo(item.veiculo);
    setFormData({
      montadora: item.montadora,
      modelo: item.modelo,
      veiculo: item.veiculo,
      ano: item.ano.toString(),
      motor: item.motor || '',
    });
    setFormErrors({});
    setIsModalOpen(true);
    fetchBrandSuggestions(item.montadora);
    fetchModelSuggestions(item.montadora, item.modelo);
  };

  // Input Masks: Máscara de Ano (4 dígitos numéricos)
  const handleAnoInputChange = (val: string) => {
    const digitsOnly = val.replace(/\D/g, '').slice(0, 4);
    setFormData(prev => ({ ...prev, ano: digitsOnly }));
    if (formErrors.ano) {
      setFormErrors(prev => {
        const copy = { ...prev };
        delete copy.ano;
        return copy;
      });
    }
  };

  // Input Masks: Formatação de Veículo (Placa Mercosul/Cinza ou Chassi)
  const handleVeiculoInputChange = (val: string) => {
    // Permite letras, números e hífen, convertendo sempre para maiúsculas
    let clean = val.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 20);

    // Se o usuário digitou exatamente 7 caracteres alfanuméricos sem hífen, tenta aplicar máscara de placa antiga se for o caso
    if (clean.length === 7 && /^[A-Z]{3}[0-9]{4}$/.test(clean)) {
      clean = `${clean.slice(0, 3)}-${clean.slice(3)}`;
    }

    setFormData(prev => ({ ...prev, veiculo: clean }));
    if (formErrors.veiculo) {
      setFormErrors(prev => {
        const copy = { ...prev };
        delete copy.veiculo;
        return copy;
      });
    }
  };

  // Input Masks: Formatação e Limpeza de Motor (VARCHAR 50)
  const handleMotorInputChange = (val: string) => {
    setFormData(prev => ({ ...prev, motor: val.slice(0, 50) }));
    if (formErrors.motor) {
      setFormErrors(prev => {
        const copy = { ...prev };
        delete copy.motor;
        return copy;
      });
    }
  };

  // Form Validation baseada no JSON Schema
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.montadora.trim()) {
      errors.montadora = 'Montadora é obrigatória (VARCHAR 100).';
    } else if (formData.montadora.trim().length > 100) {
      errors.montadora = 'Máximo de 100 caracteres permitido.';
    }

    if (!formData.modelo.trim()) {
      errors.modelo = 'Modelo é obrigatório (VARCHAR 100).';
    } else if (formData.modelo.trim().length > 100) {
      errors.modelo = 'Máximo de 100 caracteres permitido.';
    }

    if (!formData.veiculo.trim()) {
      errors.veiculo = 'Veículo (Placa ou Chassi) é obrigatório e único.';
    } else if (formData.veiculo.trim().length > 20) {
      errors.veiculo = 'Máximo de 20 caracteres permitido.';
    }

    const numAno = parseInt(formData.ano, 10);
    const maxYear = Math.max(2026, currentYear + 1);
    if (isNaN(numAno) || numAno < 1900 || numAno > maxYear) {
      errors.ano = `Ano deve ser um número inteiro de 4 dígitos entre 1900 e ${maxYear}.`;
    }

    if (formData.motor && formData.motor.trim().length > 50) {
      errors.motor = 'A especificação do motor não pode exceder 50 caracteres.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle Form Submit (POST / PUT)
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        montadora: formData.montadora.trim(),
        modelo: formData.modelo.trim(),
        veiculo: formData.veiculo.trim().toUpperCase(),
        ano: parseInt(formData.ano, 10),
        motor: formData.motor.trim(),
      };

      if (modalMode === 'create') {
        const res = await fetch('/api/vehicles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();

        if (data.success) {
          onShowNotification('Sucesso', data.message || 'Veículo cadastrado na frota com sucesso!', 'success');
          setIsModalOpen(false);
          fetchVehicles();
        } else {
          setFormErrors({ submit: data.error || 'Falha ao salvar veículo.' });
        }
      } else {
        const target = encodeURIComponent(editingTargetId || editingTargetVeiculo || formData.veiculo);
        const res = await fetch(`/api/vehicles/${target}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();

        if (data.success) {
          onShowNotification('Sucesso', data.message || 'Veículo atualizado com sucesso!', 'success');
          setIsModalOpen(false);
          // Se o veículo em detalhes for o mesmo, atualiza os dados locais dele
          if (selectedVehicleForDetails && (selectedVehicleForDetails.id === editingTargetId || selectedVehicleForDetails.veiculo === editingTargetVeiculo)) {
            setSelectedVehicleForDetails(data.data);
          }
          fetchVehicles();
        } else {
          setFormErrors({ submit: data.error || 'Falha ao atualizar veículo.' });
        }
      }
    } catch (err: any) {
      setFormErrors({ submit: err.message || 'Erro de conexão com a API REST.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete Confirmation (DELETE)
  const handleConfirmDelete = async () => {
    if (!vehicleToDelete) return;

    setIsDeleting(true);
    try {
      const target = encodeURIComponent(vehicleToDelete.id || vehicleToDelete.veiculo);
      const res = await fetch(`/api/vehicles/${target}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (data.success) {
        onShowNotification('Veículo Excluído', data.message || 'Registro removido com sucesso.', 'info');
        if (selectedVehicleForDetails && (selectedVehicleForDetails.id === vehicleToDelete.id || selectedVehicleForDetails.veiculo === vehicleToDelete.veiculo)) {
          setSelectedVehicleForDetails(null);
        }
        setVehicleToDelete(null);
        fetchVehicles();
      } else {
        onShowNotification('Erro na Exclusão', data.error || 'Não foi possível excluir o veículo.', 'warning');
      }
    } catch (err: any) {
      onShowNotification('Erro', err.message || 'Falha de conexão.', 'warning');
    } finally {
      setIsDeleting(false);
    }
  };

  // Fast action: Send vehicle to Quote & Counter
  const handleSendToQuote = (vehicle: VehicleFleetItem) => {
    if (onSelectVehicleForQuote) {
      onSelectVehicleForQuote(vehicle);
      onShowNotification(
        'Veículo Selecionado para Balcão',
        `${vehicle.montadora} ${vehicle.modelo} (${vehicle.veiculo}) carregado na cotação.`,
        'success'
      );
    }
  };

  // Copy vehicle identifier (Placa/Chassi) to clipboard
  const handleCopyIdentifier = (identifier: string) => {
    navigator.clipboard.writeText(identifier);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2000);
    onShowNotification('Copiado', `Identificador ${identifier} copiado para a área de transferência!`, 'info');
  };

  const hasActiveFilters = Boolean(search.trim() || selectedBrand || anoMin || anoMax);

  return (
    <div className="space-y-6" id="gestao-frota-veiculos-view">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-5 border border-sky-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sky-700 font-bold text-xs uppercase tracking-wider mb-1">
            <Car className="w-4 h-4 text-sky-600" />
            <span>Sistema de Gestão de Frotas & Balcão de Peças</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 font-['Outfit'] tracking-tight">
            Grade de Veículos & Frota
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
            Grade com mapeamento JSON exato (<strong className="text-slate-800 font-semibold">Montadora, Modelo, Veículo, Ano, Motor</strong>), clique de linha para detalhes, ordenação inteligente e busca assíncrona.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onNavigateToPartsApplication && (
            <button
              type="button"
              onClick={() => onNavigateToPartsApplication()}
              className="inline-flex items-center justify-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold px-3.5 py-2.5 rounded-xl shadow-xs transition cursor-pointer"
              id="btn-consultar-aplicacao-frota"
              title="Filtrar aplicação de peças compatíveis com a frota (1995-2027)"
            >
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>Filtrar Aplicação de Peças</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center justify-center gap-1.5 bg-sky-600 hover:bg-sky-700 active:scale-95 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition cursor-pointer"
            id="btn-novo-veiculo"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Veículo</span>
          </button>
          <button
            type="button"
            onClick={fetchVehicles}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-2.5 rounded-xl transition cursor-pointer disabled:opacity-50"
            title="Recarregar dados da API REST"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
          {/* Global Search Input */}
          <div className="lg:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Busca global em todas as colunas (ex: Gol, Fiat, BRA2E19, Turbo)..."
              className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-sky-500 focus:outline-hidden transition"
              id="input-busca-global-frota"
            />
            {search && (
              <button
                type="button"
                onClick={() => handleSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Specific Filter: Montadora */}
          <div className="lg:col-span-3">
            <select
              value={selectedBrand}
              onChange={(e) => handleBrandChange(e.target.value)}
              className="w-full py-2 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-sky-500 focus:outline-hidden text-slate-800 transition"
              id="select-filtro-montadora"
            >
              <option value="">Todas as Montadoras</option>
              {availableBrands.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* Specific Filter: Range de Ano (Mín / Máx com máscara de 4 dígitos) */}
          <div className="lg:col-span-3 flex items-center gap-2">
            <input
              type="text"
              inputMode="numeric"
              maxLength={4}
              value={anoMin}
              onChange={(e) => handleAnoMinChange(e.target.value)}
              placeholder="Ano Mín"
              className="w-1/2 py-2 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-sky-500 focus:outline-hidden text-center font-mono font-medium"
              id="input-filtro-ano-min"
            />
            <span className="text-slate-400 text-xs font-bold">até</span>
            <input
              type="text"
              inputMode="numeric"
              maxLength={4}
              value={anoMax}
              onChange={(e) => handleAnoMaxChange(e.target.value)}
              placeholder="Ano Máx"
              className="w-1/2 py-2 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-sky-500 focus:outline-hidden text-center font-mono font-medium"
              id="input-filtro-ano-max"
            />
          </div>

          {/* Clear Filters Button */}
          <div className="lg:col-span-1 flex items-center">
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={handleClearFilters}
                className="w-full py-2 px-2 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-200 transition text-center cursor-pointer"
                title="Limpar todos os filtros aplicados"
              >
                Limpar
              </button>
            ) : (
              <div className="w-full text-center text-[10px] text-slate-400 font-semibold uppercase">
                {total} itens
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table Controls Top Header */}
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">Registros Encontrados:</span>
            <span className="px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 font-mono font-bold text-[11px]">
              {total}
            </span>
            <span className="text-slate-400 hidden sm:inline">•</span>
            <span className="text-slate-500 hidden sm:inline">
              Clique em qualquer linha para abrir o modal de detalhes do veículo
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Page Size Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Exibir:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="bg-white border border-slate-300 rounded-lg py-1 px-2 text-xs font-semibold text-slate-700 focus:outline-hidden focus:border-sky-500"
                id="select-page-size"
              >
                <option value={10}>10 por página</option>
                <option value={25}>25 por página</option>
                <option value={50}>50 por página</option>
              </select>
            </div>
          </div>
        </div>

        {/* Data Table with Exact Proportional Column Widths */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs table-fixed min-w-[760px]">
            <thead>
              <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px] tracking-wider select-none">
                {/* Montadora - Largura Sugerida: 15% */}
                <th
                  onClick={() => handleSort('montadora')}
                  style={{ width: '18%' }}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-200/60 transition group"
                  title="Ordenar por Montadora"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Montadora</span>
                    {sortBy === 'montadora' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-sky-600 font-black" /> : <ArrowDown className="w-3.5 h-3.5 text-sky-600 font-black" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-40 group-hover:opacity-100" />
                    )}
                  </div>
                </th>

                {/* Modelo - Largura Sugerida: 20% (Ordenação Padrão) */}
                <th
                  onClick={() => handleSort('modelo')}
                  style={{ width: '24%' }}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-200/60 transition group"
                  title="Ordenar por Modelo (Padrão)"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Modelo</span>
                    {sortBy === 'modelo' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-sky-600 font-black" /> : <ArrowDown className="w-3.5 h-3.5 text-sky-600 font-black" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-40 group-hover:opacity-100" />
                    )}
                    {sortBy === 'modelo' && (
                      <span className="text-[9px] px-1 bg-sky-100 text-sky-700 rounded font-normal lowercase">padrão</span>
                    )}
                  </div>
                </th>

                {/* Veículo (Placa / Chassi) - Largura Sugerida: 15% */}
                <th
                  onClick={() => handleSort('veiculo')}
                  style={{ width: '18%' }}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-200/60 transition group"
                  title="Ordenar por Veículo (Placa / Chassi)"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Veículo (Placa/Chassi)</span>
                    {sortBy === 'veiculo' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-sky-600 font-black" /> : <ArrowDown className="w-3.5 h-3.5 text-sky-600 font-black" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-40 group-hover:opacity-100" />
                    )}
                  </div>
                </th>

                {/* Ano - Largura Sugerida: 10% */}
                <th
                  onClick={() => handleSort('ano')}
                  style={{ width: '12%' }}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-200/60 transition group text-center"
                  title="Ordenar por Ano de Fabricação (1900-2026)"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Ano</span>
                    {sortBy === 'ano' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-sky-600 font-black" /> : <ArrowDown className="w-3.5 h-3.5 text-sky-600 font-black" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-40 group-hover:opacity-100" />
                    )}
                  </div>
                </th>

                {/* Motor - Largura Sugerida: 15% */}
                <th
                  onClick={() => handleSort('motor')}
                  style={{ width: '18%' }}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-200/60 transition group"
                  title="Ordenar por Motorização"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Motor</span>
                    {sortBy === 'motor' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-sky-600 font-black" /> : <ArrowDown className="w-3.5 h-3.5 text-sky-600 font-black" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-40 group-hover:opacity-100" />
                    )}
                  </div>
                </th>

                {/* Ações - Largura Sugerida: 10% (Fixo) */}
                <th 
                  style={{ width: '10%' }}
                  className="py-3 px-4 text-right font-bold text-slate-700"
                >
                  <span>Ações</span>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {vehicles.length === 0 && !isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 px-4 text-center">
                    <div className="max-w-md mx-auto flex flex-col items-center justify-center space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600">
                        <Car className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-800">
                          {hasActiveFilters ? 'Nenhum veículo corresponde aos filtros aplicados' : 'Nenhum veículo cadastrado na frota'}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">
                          {hasActiveFilters
                            ? 'Tente remover os filtros de busca, montadora ou range de ano para visualizar os veículos.'
                            : 'Cadastre o primeiro automóvel, utilitário ou caminhão na grade para iniciar o gerenciamento.'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        {hasActiveFilters ? (
                          <button
                            type="button"
                            onClick={handleClearFilters}
                            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                          >
                            Limpar Filtros
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={handleOpenCreateModal}
                            className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Cadastrar Novo Veículo</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                vehicles.map((v) => (
                  <tr
                    key={v.id || v.veiculo}
                    onClick={() => setSelectedVehicleForDetails(v)}
                    className="hover:bg-sky-50/50 transition-colors group cursor-pointer"
                    id={`linha-veiculo-${v.veiculo}`}
                    title="Clique para ver os detalhes completos deste veículo"
                  >
                    {/* Montadora (18%) */}
                    <td className="py-3 px-4 font-semibold text-slate-800 truncate">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-sky-500 shrink-0" />
                        <span className="truncate">{v.montadora}</span>
                      </div>
                    </td>

                    {/* Modelo (24%) */}
                    <td className="py-3 px-4 font-bold text-slate-900 truncate">
                      <div className="flex items-center justify-between gap-1">
                        <span className="truncate">{v.modelo}</span>
                        <Eye className="w-3.5 h-3.5 text-slate-300 opacity-0 group-hover:opacity-100 group-hover:text-sky-600 transition shrink-0" />
                      </div>
                    </td>

                    {/* Veículo (Identificador Único: Placa ou Chassi) (18%) */}
                    <td className="py-3 px-4 font-mono font-bold truncate">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 border border-slate-300 text-slate-800 text-[11px] tracking-wide shadow-2xs truncate">
                        {v.veiculo}
                      </span>
                    </td>

                    {/* Ano (12%) */}
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[11px]">
                        {v.ano}
                      </span>
                    </td>

                    {/* Motor (18%) */}
                    <td className="py-3 px-4 text-slate-600 truncate">
                      {v.motor ? (
                        <span className="text-[11px] font-medium text-slate-700 truncate block">{v.motor}</span>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Opcional</span>
                      )}
                    </td>

                    {/* Ações por Linha (10% Fixo) */}
                    <td className="py-3 px-4 text-right">
                      <div 
                        className="inline-flex items-center justify-end gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Ação: Filtrar Peças Compatíveis */}
                        {onNavigateToPartsApplication && (
                          <button
                            type="button"
                            onClick={() => onNavigateToPartsApplication(v)}
                            className="p-1.5 text-indigo-700 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                            title={`Filtrar aplicação de peças compatíveis para ${v.montadora} ${v.modelo}`}
                          >
                            <Layers className="w-4 h-4" />
                          </button>
                        )}

                        {/* Ação Integrada: Cotar Peças no Balcão */}
                        <button
                          type="button"
                          onClick={() => handleSendToQuote(v)}
                          className="p-1.5 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                          title={`Cotar peças no balcão para ${v.montadora} ${v.modelo} (${v.veiculo})`}
                        >
                          <Calculator className="w-4 h-4" />
                        </button>

                        {/* Editar */}
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(v)}
                          className="p-1.5 text-sky-700 hover:text-sky-800 hover:bg-sky-50 rounded-lg transition cursor-pointer"
                          title={`Editar dados de ${v.modelo}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>

                        {/* Excluir */}
                        <button
                          type="button"
                          onClick={() => setVehicleToDelete(v)}
                          className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title={`Excluir ${v.modelo} da frota`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer: Pagination */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="text-slate-500">
            {total > 0 ? (
              <span>
                Mostrando <strong className="text-slate-800">{(page - 1) * pageSize + 1}</strong> a{' '}
                <strong className="text-slate-800">{Math.min(total, page * pageSize)}</strong> de{' '}
                <strong className="text-slate-800">{total}</strong> veículos
              </span>
            ) : (
              <span>Nenhum registro a exibir</span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {/* Primeira Página */}
            <button
              type="button"
              onClick={() => setPage(1)}
              disabled={page === 1 || isLoading}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
              title="Primeira Página"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>

            {/* Página Anterior */}
            <button
              type="button"
              onClick={() => setPage(prev => Math.max(1, prev - 1))}
              disabled={page === 1 || isLoading}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
              title="Página Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Indicador de Página Atual */}
            <span className="px-3 py-1 font-bold text-slate-800 bg-white border border-slate-200 rounded-lg text-xs shadow-2xs">
              Página {page} de {totalPages || 1}
            </span>

            {/* Próxima Página */}
            <button
              type="button"
              onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages || isLoading}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
              title="Próxima Página"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Última Página */}
            <button
              type="button"
              onClick={() => setPage(totalPages)}
              disabled={page >= totalPages || isLoading}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
              title="Última Página"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL DE DETALHES DO VEÍCULO (Ao clicar em uma linha da grade) */}
      {/* ========================================================================= */}
      {selectedVehicleForDetails && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-400/30">
                  <Car className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">{selectedVehicleForDetails.montadora}</span>
                    <span className="px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px] font-mono">
                      ID: {selectedVehicleForDetails.id || 'veh-auto'}
                    </span>
                  </div>
                  <h2 className="text-base font-black text-white">
                    {selectedVehicleForDetails.modelo}
                  </h2>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedVehicleForDetails(null)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Details Content */}
            <div className="p-6 space-y-5 text-xs">
              {/* Placa em Destaque no Padrão Mercosul / Brasão */}
              <div className="bg-gradient-to-br from-slate-50 to-sky-50/50 border border-sky-200 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                    IDENTIFICADOR ÚNICO (VEÍCULO):
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="bg-white px-3 py-1.5 border-2 border-sky-600 rounded-lg shadow-sm flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                      <span className="font-mono text-base font-black tracking-widest text-slate-950">
                        {selectedVehicleForDetails.veiculo}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyIdentifier(selectedVehicleForDetails.veiculo)}
                      className="p-2 text-slate-500 hover:text-sky-700 bg-white hover:bg-sky-50 border border-slate-200 rounded-lg transition cursor-pointer"
                      title="Copiar Placa/Chassi"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-500 block mb-1">ANO FABRICAÇÃO:</span>
                  <span className="px-3 py-1 bg-sky-100 text-sky-900 border border-sky-200 rounded-xl font-black text-sm font-mono">
                    {selectedVehicleForDetails.ano}
                  </span>
                </div>
              </div>

              {/* Especificações Técnicas em Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Montadora (Fabricante)</span>
                  <span className="font-extrabold text-slate-900 text-sm">{selectedVehicleForDetails.montadora}</span>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Modelo Comercial</span>
                  <span className="font-extrabold text-slate-900 text-sm">{selectedVehicleForDetails.modelo}</span>
                </div>

                <div className="col-span-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Especificação do Motor</span>
                  <span className="font-bold text-slate-800">
                    {selectedVehicleForDetails.motor || 'Não especificado (opcional)'}
                  </span>
                </div>
              </div>

              {/* Ações do Modal de Detalhes */}
              <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const veh = selectedVehicleForDetails;
                      setSelectedVehicleForDetails(null);
                      handleOpenEditModal(veh);
                    }}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Editar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const veh = selectedVehicleForDetails;
                      setSelectedVehicleForDetails(null);
                      setVehicleToDelete(veh);
                    }}
                    className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Excluir</span>
                  </button>

                  {onNavigateToPartsApplication && (
                    <button
                      type="button"
                      onClick={() => {
                        const veh = selectedVehicleForDetails;
                        setSelectedVehicleForDetails(null);
                        onNavigateToPartsApplication(veh);
                      }}
                      className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl flex items-center gap-1.5 border border-indigo-200 transition cursor-pointer"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Filtrar Peças</span>
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const veh = selectedVehicleForDetails;
                    setSelectedVehicleForDetails(null);
                    handleSendToQuote(veh);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Calculator className="w-4 h-4" />
                  <span>Cotar Peças no Balcão</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CADASTRO / EDIÇÃO COM COMBOBOX AUTOCOMPLETE & MÁSCARAS */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-sky-100 text-sky-700">
                  <Car className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    {modalMode === 'create' ? 'Cadastrar Novo Veículo na Frota' : `Editar Veículo (${formData.veiculo})`}
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Preencha os campos com autocomplete assíncrono e validação de regras
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitForm} className="p-6 space-y-4 text-xs">
              {formErrors.submit && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{formErrors.submit}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. MONTADORA: Combobox com Busca Assíncrona (Autocomplete) */}
                <div className="relative" ref={brandDropdownRef}>
                  <label className="block font-bold text-slate-700 mb-1">
                    Montadora <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.montadora}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData(prev => ({ ...prev, montadora: val }));
                        setIsBrandDropdownOpen(true);
                        fetchBrandSuggestions(val);
                      }}
                      onFocus={() => {
                        setIsBrandDropdownOpen(true);
                        fetchBrandSuggestions(formData.montadora);
                      }}
                      placeholder="Busque ou digite (ex: Fiat, VW, Toyota)"
                      maxLength={100}
                      autoComplete="off"
                      className={`w-full p-2.5 pr-8 bg-slate-50 border rounded-xl focus:bg-white focus:outline-hidden transition ${
                        formErrors.montadora ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 focus:border-sky-500'
                      }`}
                    />
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-slate-400 pointer-events-none">
                      {isLoadingBrands ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-600" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </div>
                  </div>

                  {/* Dropdown de Autocomplete Montadoras */}
                  {isBrandDropdownOpen && (
                    <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-100">
                      {brandSuggestions.length === 0 ? (
                        <div className="p-2.5 text-center text-slate-400 text-[11px]">
                          Nenhuma montadora pré-cadastrada. Você pode digitar uma nova.
                        </div>
                      ) : (
                        brandSuggestions.map((brand) => (
                          <button
                            key={brand}
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({ ...prev, montadora: brand }));
                              setIsBrandDropdownOpen(false);
                              // Atualiza sugestões de modelo para a nova montadora selecionada
                              fetchModelSuggestions(brand, '');
                            }}
                            className="w-full text-left px-3 py-2 text-xs text-slate-800 hover:bg-sky-50 hover:text-sky-900 transition flex items-center justify-between"
                          >
                            <span>{brand}</span>
                            {formData.montadora.toLowerCase() === brand.toLowerCase() && (
                              <Check className="w-3.5 h-3.5 text-sky-600" />
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  )}

                  {formErrors.montadora ? (
                    <span className="text-[10px] text-rose-600 block mt-0.5">{formErrors.montadora}</span>
                  ) : (
                    <span className="text-[10px] text-slate-400 block mt-0.5">Combobox com busca assíncrona</span>
                  )}
                </div>

                {/* 2. MODELO: Combobox com Busca Assíncrona (Autocomplete) */}
                <div className="relative" ref={modelDropdownRef}>
                  <label className="block font-bold text-slate-700 mb-1">
                    Modelo <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.modelo}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData(prev => ({ ...prev, modelo: val }));
                        setIsModelDropdownOpen(true);
                        fetchModelSuggestions(formData.montadora, val);
                      }}
                      onFocus={() => {
                        setIsModelDropdownOpen(true);
                        fetchModelSuggestions(formData.montadora, formData.modelo);
                      }}
                      placeholder="Busque ou digite (ex: Uno, Gol, Corolla)"
                      maxLength={100}
                      autoComplete="off"
                      className={`w-full p-2.5 pr-8 bg-slate-50 border rounded-xl focus:bg-white focus:outline-hidden transition ${
                        formErrors.modelo ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 focus:border-sky-500'
                      }`}
                    />
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-slate-400 pointer-events-none">
                      {isLoadingModels ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-600" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </div>
                  </div>

                  {/* Dropdown de Autocomplete Modelos */}
                  {isModelDropdownOpen && (
                    <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-100">
                      {modelSuggestions.length === 0 ? (
                        <div className="p-2.5 text-center text-slate-400 text-[11px]">
                          {formData.montadora 
                            ? `Nenhum modelo pré-cadastrado para ${formData.montadora}. Você pode digitar.` 
                            : 'Digite ou selecione a montadora para ver sugestões.'}
                        </div>
                      ) : (
                        modelSuggestions.map((model) => (
                          <button
                            key={model}
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({ ...prev, modelo: model }));
                              setIsModelDropdownOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 text-xs text-slate-800 hover:bg-sky-50 hover:text-sky-900 transition flex items-center justify-between"
                          >
                            <span>{model}</span>
                            {formData.modelo.toLowerCase() === model.toLowerCase() && (
                              <Check className="w-3.5 h-3.5 text-sky-600" />
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  )}

                  {formErrors.modelo ? (
                    <span className="text-[10px] text-rose-600 block mt-0.5">{formErrors.modelo}</span>
                  ) : (
                    <span className="text-[10px] text-slate-400 block mt-0.5">Combobox com busca assíncrona</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 3. VEÍCULO (Placa ou Chassi com Máscara e Validação de Unicidade) */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Veículo (Placa ou Chassi) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.veiculo}
                    onChange={(e) => handleVeiculoInputChange(e.target.value)}
                    placeholder="Ex: BRA2E19 ou 9BM34..."
                    maxLength={20}
                    className={`w-full p-2.5 font-mono uppercase bg-slate-50 border rounded-xl focus:bg-white focus:outline-hidden transition ${
                      formErrors.veiculo ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 focus:border-sky-500'
                    }`}
                  />
                  {formErrors.veiculo ? (
                    <span className="text-[10px] text-rose-600 block mt-0.5">{formErrors.veiculo}</span>
                  ) : (
                    <span className="text-[10px] text-slate-400 block mt-0.5">Identificador único (Placa/Chassi)</span>
                  )}
                </div>

                {/* 4. ANO: Campo de Texto com Máscara e Range 1900 a 2026 */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Ano <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formData.ano}
                      onChange={(e) => handleAnoInputChange(e.target.value)}
                      placeholder="Ex: 2023"
                      maxLength={4}
                      className={`w-full p-2.5 pr-8 bg-slate-50 border rounded-xl focus:bg-white focus:outline-hidden font-mono text-center font-bold transition ${
                        formErrors.ano ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 focus:border-sky-500'
                      }`}
                    />
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                      <Calendar className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  {formErrors.ano ? (
                    <span className="text-[10px] text-rose-600 block mt-0.5">{formErrors.ano}</span>
                  ) : (
                    <span className="text-[10px] text-slate-400 block mt-0.5">Máscara 4 dígitos (Range 1900-2026)</span>
                  )}
                </div>
              </div>

              {/* 5. MOTOR: Campo de Texto com Máscara e Sugestões Rápidas */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Motor <span className="text-slate-400 font-normal">(Opcional, VARCHAR 50)</span>
                </label>
                <input
                  type="text"
                  value={formData.motor}
                  onChange={(e) => handleMotorInputChange(e.target.value)}
                  placeholder="Ex: 1.0 Flex, 2.0 Turbo Diesel, 1.6 8V EA111"
                  maxLength={50}
                  className={`w-full p-2.5 bg-slate-50 border rounded-xl focus:bg-white focus:outline-hidden transition ${
                    formErrors.motor ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 focus:border-sky-500'
                  }`}
                />
                
                {/* Sugestões rápidas de motorização */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="text-[10px] text-slate-500 font-semibold self-center">Sugestões:</span>
                  {MOTOR_SUGGESTIONS.slice(0, 5).map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, motor: sug }))}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-sky-100 hover:text-sky-800 text-[10px] rounded-md border border-slate-200 transition cursor-pointer text-slate-600"
                    >
                      {sug}
                    </button>
                  ))}
                </div>

                {formErrors.motor ? (
                  <span className="text-[10px] text-rose-600 block mt-0.5">{formErrors.motor}</span>
                ) : (
                  <span className="text-[10px] text-slate-400 block mt-0.5">Texto com máscara (até 50 caracteres)</span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>{modalMode === 'create' ? 'Cadastrar Veículo' : 'Salvar Alterações'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Exclusão com Confirmação */}
      {vehicleToDelete && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 text-xs">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-100 text-rose-600 rounded-2xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Excluir Veículo da Frota?</h3>
                <p className="text-slate-500 mt-0.5">
                  Esta ação é irreversível e removerá o veículo da grade.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Montadora & Modelo:</span>
                <span className="font-bold text-slate-800">{vehicleToDelete.montadora} {vehicleToDelete.modelo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Veículo (Placa/Chassi):</span>
                <span className="font-mono font-bold text-slate-900">{vehicleToDelete.veiculo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Ano & Motor:</span>
                <span className="text-slate-700">{vehicleToDelete.ano} • {vehicleToDelete.motor || 'N/A'}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setVehicleToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Excluindo...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirmar Exclusão</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
