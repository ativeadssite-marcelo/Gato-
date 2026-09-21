import React, { useState, useMemo, useEffect } from 'react';
import { 
  Building2, 
  Search, 
  Plus, 
  Filter, 
  FileDown, 
  Phone, 
  Mail, 
  MapPin, 
  DollarSign, 
  Clock, 
  Truck, 
  Star, 
  Tag, 
  Edit3, 
  Trash2, 
  Eye, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  LayoutGrid, 
  Table, 
  MessageSquare,
  Database,
  RefreshCw,
  TrendingUp,
  PackageCheck,
  ShieldCheck,
  Boxes
} from 'lucide-react';
import { Supplier, Product } from '../types';
import { SupplierModal } from './SupplierModal';
import { SupplierDetailModal } from './SupplierDetailModal';

interface FornecedoresManagerProps {
  suppliers: Supplier[];
  products: Product[];
  onUpdateSuppliers: (suppliers: Supplier[]) => void;
  onNavigateToXmlImport: () => void;
  onShowNotification?: (type: 'success' | 'error' | 'warning' | 'info', message: string) => void;
}

export const FornecedoresManager: React.FC<FornecedoresManagerProps> = ({
  suppliers,
  products,
  onUpdateSuppliers,
  onNavigateToXmlImport,
  onShowNotification,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [selectedStatus, setSelectedStatus] = useState<string>('todos');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [supplierToEdit, setSupplierToEdit] = useState<Supplier | null>(null);
  const [viewingSupplier, setViewingSupplier] = useState<Supplier | null>(null);

  // Supabase sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [supabaseConnected, setSupabaseConnected] = useState<boolean | null>(null);

  // Check Supabase connection on mount
  useEffect(() => {
    fetch('/api/db/suppliers')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setSupabaseConnected(true);
          // If Supabase returned suppliers and we can complement our local state:
          if (Array.isArray(data.suppliers) && data.suppliers.length > 0) {
            // merge or note
          }
        } else {
          setSupabaseConnected(false);
        }
      })
      .catch(() => setSupabaseConnected(false));
  }, []);

  const handleSyncWithSupabase = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/db/suppliers');
      const data = await res.json();
      if (data.success && Array.isArray(data.suppliers)) {
        setSupabaseConnected(true);
        // Merge Supabase records with current suppliers
        const dbSuppliers: Supplier[] = data.suppliers.map((s: any) => ({
          id: s.id,
          name: s.name,
          fantasyName: s.name,
          cnpj: s.cnpj || '',
          contact: s.contact || '',
          phone: s.phone || '',
          whatsapp: s.phone || '',
          email: s.email || '',
          address: s.address || '',
          city: 'São Paulo',
          state: 'SP',
          category: 'distribuidora',
          paymentTerms: '30 dias',
          leadTimeDays: 2,
          minOrderValue: 500,
          freightType: 'CIF',
          rating: 5,
          status: 'ativo',
          brandsSupplied: [],
          totalPurchases: 0
        }));

        // Combine without duplicates
        const existingIds = new Set(suppliers.map(s => s.id));
        const newFromDb = dbSuppliers.filter(s => !existingIds.has(s.id));
        if (newFromDb.length > 0) {
          const updated = [...suppliers, ...newFromDb];
          onUpdateSuppliers(updated);
          onShowNotification?.('success', `${newFromDb.length} fornecedores importados do Supabase!`);
        } else {
          onShowNotification?.('info', `Supabase sincronizado: ${data.suppliers.length} registros no banco.`);
        }
      } else {
        onShowNotification?.('warning', 'Não foi possível ler fornecedores do Supabase.');
      }
    } catch {
      onShowNotification?.('error', 'Falha ao conectar com Supabase.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Format currency
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  // Handle Save
  const handleSaveSupplier = async (supplier: Supplier) => {
    let updated: Supplier[];
    const exists = suppliers.some(s => s.id === supplier.id);

    if (exists) {
      updated = suppliers.map(s => s.id === supplier.id ? supplier : s);
      onShowNotification?.('success', `Fornecedor "${supplier.name}" atualizado com sucesso!`);
    } else {
      updated = [supplier, ...suppliers];
      onShowNotification?.('success', `Fornecedor "${supplier.name}" cadastrado com sucesso!`);

      // Try to register in Supabase database
      try {
        await fetch('/api/db/suppliers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: supplier.name,
            cnpj: supplier.cnpj,
            contact: supplier.contact,
            phone: supplier.phone,
            email: supplier.email,
            address: supplier.address ? `${supplier.address}, ${supplier.number || ''} - ${supplier.city || ''}/${supplier.state || ''}` : null
          })
        });
      } catch {
        // local persistence still valid
      }
    }

    onUpdateSuppliers(updated);
    setIsModalOpen(false);
    setSupplierToEdit(null);
  };

  // Handle Delete
  const handleDeleteSupplier = (supplierId: string, supplierName: string) => {
    if (window.confirm(`Tem certeza que deseja excluir o fornecedor "${supplierName}"?`)) {
      const updated = suppliers.filter(s => s.id !== supplierId);
      onUpdateSuppliers(updated);
      onShowNotification?.('info', `Fornecedor "${supplierName}" removido.`);
    }
  };

  // KPI Calculations
  const totalSuppliers = suppliers.length;
  const activeSuppliers = suppliers.filter(s => s.status === 'ativo').length;
  const totalPurchases = suppliers.reduce((acc, s) => acc + (s.totalPurchases || 0), 0);
  const avgLeadTime = suppliers.length > 0
    ? (suppliers.reduce((acc, s) => acc + (s.leadTimeDays || 2), 0) / suppliers.length).toFixed(1)
    : '2.0';

  // Filtered Suppliers
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(s => {
      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchName = s.name.toLowerCase().includes(term);
        const matchFantasy = (s.fantasyName || '').toLowerCase().includes(term);
        const matchCnpj = s.cnpj.replace(/\D/g, '').includes(term.replace(/\D/g, ''));
        const matchContact = (s.contact || '').toLowerCase().includes(term);
        const matchCity = (s.city || '').toLowerCase().includes(term);
        const matchBrands = (s.brandsSupplied || []).some(b => b.toLowerCase().includes(term));
        const matchPhone = (s.phone || '').replace(/\D/g, '').includes(term.replace(/\D/g, ''));

        if (!matchName && !matchFantasy && !matchCnpj && !matchContact && !matchCity && !matchBrands && !matchPhone) {
          return false;
        }
      }

      // Category filter
      if (selectedCategory !== 'todos' && s.category !== selectedCategory) {
        return false;
      }

      // Status filter
      if (selectedStatus !== 'todos' && s.status !== selectedStatus) {
        return false;
      }

      return true;
    });
  }, [suppliers, searchTerm, selectedCategory, selectedStatus]);

  const categoryLabels: Record<string, string> = {
    distribuidora: 'Distribuidora Atacadista',
    fabricante: 'Fabricante / Indústria',
    importadora: 'Importadora Oficial',
    diesel: 'Linha Pesada / Diesel',
    motos: 'Motopeças',
    quimicos: 'Químicos & Lubrificantes',
    outros: 'Outros'
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-slate-900/90 border border-slate-800 p-5 rounded-3xl backdrop-blur-md shadow-xl">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-500/10 border border-orange-500/30 flex items-center justify-center text-[#EA580C] shadow-inner">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2.5">
                Gestão de Fornecedores & Fabricantes
                {supabaseConnected && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-bold text-emerald-400">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    Supabase Online
                  </span>
                )}
              </h1>
              <p className="text-xs text-slate-400">
                Cadastro de distribuidoras de autopeças, prazos de entrega, condições comerciais e homologação de marcas
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleSyncWithSupabase}
            disabled={isSyncing}
            className="px-3.5 py-2.5 rounded-2xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 text-xs font-semibold flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
            title="Sincronizar com banco de dados Supabase"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-orange-400 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>Sincronizar Supabase</span>
          </button>

          <button
            type="button"
            onClick={onNavigateToXmlImport}
            className="px-4 py-2.5 rounded-2xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700/60 text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-xs"
          >
            <FileDown className="w-4 h-4 text-blue-400" />
            <span>Baixar NF-e / XML</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSupplierToEdit(null);
              setIsModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-lg shadow-orange-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Fornecedor</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total */}
        <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-3xl shadow-lg relative overflow-hidden group hover:border-slate-700 transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400">Total Cadastrado</span>
            <div className="w-8 h-8 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-[#EA580C]">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{totalSuppliers}</span>
            <span className="text-xs font-semibold text-emerald-400">
              {activeSuppliers} ativos
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Parceiros de reposição e indústrias</p>
        </div>

        {/* Card 2: Fabricantes & Distribuidoras */}
        <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-3xl shadow-lg relative overflow-hidden group hover:border-slate-700 transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400">Distribuidoras & Fábricas</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">
              {suppliers.filter(s => s.category === 'distribuidora' || s.category === 'fabricante').length}
            </span>
            <span className="text-xs text-slate-400">principais</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Atendimento diário com frete CIF</p>
        </div>

        {/* Card 3: Lead Time */}
        <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-3xl shadow-lg relative overflow-hidden group hover:border-slate-700 transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400">Prazo Médio de Entrega</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{avgLeadTime}</span>
            <span className="text-xs font-bold text-slate-300">dias úteis</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Tempo médio de reposição de estoque</p>
        </div>

        {/* Card 4: Total Comprado */}
        <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-3xl shadow-lg relative overflow-hidden group hover:border-slate-700 transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400">Compras Acumuladas</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{formatCurrency(totalPurchases)}</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Volume histórico negociado no ERP</p>
        </div>
      </div>

      {/* Toolbar: Search, Filters & View Mode */}
      <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-3xl shadow-lg space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por razão social, fantasia, CNPJ, vendedor, cidade ou marcas (ex: Bosch, Nakata)..."
              className="w-full bg-slate-800/80 border border-slate-700/80 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                Limpar
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-800/80 border border-slate-700 rounded-2xl px-3 py-2 text-xs text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-orange-500 cursor-pointer"
            >
              <option value="todos">Todas as Categorias</option>
              <option value="distribuidora">Distribuidoras</option>
              <option value="fabricante">Fabricantes / Indústrias</option>
              <option value="importadora">Importadoras</option>
              <option value="diesel">Linha Pesada / Diesel</option>
              <option value="motos">Motopeças</option>
              <option value="quimicos">Químicos & Lubrificantes</option>
              <option value="outros">Outros</option>
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-slate-800/80 border border-slate-700 rounded-2xl px-3 py-2 text-xs text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-orange-500 cursor-pointer"
            >
              <option value="todos">Todos os Status</option>
              <option value="ativo">Ativos</option>
              <option value="bloqueado">Bloqueados</option>
              <option value="inativo">Inativos</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-800/80 border border-slate-700 rounded-2xl p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-xl transition cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-orange-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Visualização em Cards"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-xl transition cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-orange-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Visualização em Tabela"
              >
                <Table className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Count feedback */}
        <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
          <span>
            Mostrando <strong>{filteredSuppliers.length}</strong> de <strong>{suppliers.length}</strong> fornecedores
          </span>
          {searchTerm && (
            <span className="text-orange-400 font-medium">
              Filtro ativo: "{searchTerm}"
            </span>
          )}
        </div>
      </div>

      {/* SUPPLIER LIST / GRID */}
      {filteredSuppliers.length === 0 ? (
        <div className="text-center py-16 px-4 bg-slate-900/60 border border-slate-800 rounded-3xl">
          <div className="w-16 h-16 rounded-3xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-500 mx-auto mb-4">
            <Building2 className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-white mb-1">Nenhum fornecedor encontrado</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mb-6">
            Não encontramos nenhum parceiro com os filtros selecionados. Tente ajustar os termos de busca ou cadastre um novo fornecedor.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setSelectedCategory('todos');
              setSelectedStatus('todos');
            }}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl transition cursor-pointer"
          >
            Limpar Filtros de Busca
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSuppliers.map((supplier) => {
            const cleanWhatsapp = (supplier.whatsapp || supplier.phone || '').replace(/\D/g, '');
            const whatsappUrl = cleanWhatsapp
              ? `https://wa.me/55${cleanWhatsapp}?text=${encodeURIComponent(`Olá ${supplier.contact || ''}, sou da Pantanal Auto Peças. Gostaria de consultar pedidos e cotação de peças.`)}`
              : undefined;

            return (
              <div
                key={supplier.id}
                className="bg-slate-900/90 border border-slate-800/90 hover:border-orange-500/40 rounded-3xl p-5 shadow-xl flex flex-col justify-between transition-all duration-200 group hover:shadow-2xl hover:shadow-orange-500/5"
              >
                {/* Top Section */}
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center text-[#EA580C] group-hover:scale-105 transition-transform shrink-0">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-white text-sm tracking-tight truncate group-hover:text-orange-400 transition-colors" title={supplier.name}>
                          {supplier.name}
                        </h3>
                        <p className="text-xs text-slate-400 truncate">
                          {supplier.fantasyName && supplier.fantasyName !== supplier.name ? supplier.fantasyName : (supplier.city + '/' + supplier.state)}
                        </p>
                      </div>
                    </div>

                    {supplier.status === 'ativo' ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                        Ativo
                      </span>
                    ) : supplier.status === 'bloqueado' ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 shrink-0">
                        Bloqueado
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 shrink-0">
                        Inativo
                      </span>
                    )}
                  </div>

                  {/* Badges and rating */}
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-lg bg-slate-800/80 text-slate-300 border border-slate-700/60">
                      {categoryLabels[supplier.category || 'distribuidora'] || supplier.category}
                    </span>

                    <div className="flex items-center gap-0.5 text-amber-400 text-xs">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span className="font-bold text-[11px] ml-0.5">{supplier.rating || 5}.0</span>
                    </div>
                  </div>

                  {/* Information Rows */}
                  <div className="space-y-2 py-2 border-y border-slate-800/70 text-xs text-slate-300">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">CNPJ:</span>
                      <span className="font-mono text-slate-200">{supplier.cnpj || 'Não cadastrado'}</span>
                    </div>

                    {supplier.contact && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Vendedor:</span>
                        <span className="font-medium text-white truncate max-w-[180px]">{supplier.contact}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Prazo / Frete:</span>
                      <span className="text-slate-200">
                        <strong>{supplier.paymentTerms || '30 dias'}</strong> • {supplier.freightType || 'CIF'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Lead Time:</span>
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {supplier.leadTimeDays || 2} dias úteis
                      </span>
                    </div>
                  </div>

                  {/* Brands preview */}
                  {supplier.brandsSupplied && supplier.brandsSupplied.length > 0 && (
                    <div className="mt-3">
                      <div className="flex flex-wrap gap-1">
                        {supplier.brandsSupplied.slice(0, 4).map((brand) => (
                          <span
                            key={brand}
                            className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700/60"
                          >
                            {brand}
                          </span>
                        ))}
                        {supplier.brandsSupplied.length > 4 && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-400">
                            +{supplier.brandsSupplied.length - 4}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Actions */}
                <div className="pt-4 mt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {whatsappUrl && (
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition cursor-pointer"
                        title="Conversar no WhatsApp com o fornecedor"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </a>
                    )}

                    {supplier.phone && (
                      <a
                        href={`tel:${supplier.phone.replace(/\D/g, '')}`}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer"
                        title="Ligar para o fornecedor"
                      >
                        <Phone className="w-4 h-4 text-orange-400" />
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setViewingSupplier(supplier)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border border-slate-700/60"
                      title="Ver Ficha 360° do Fornecedor"
                    >
                      <Eye className="w-3.5 h-3.5 text-blue-400" />
                      <span>Detalhes</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSupplierToEdit(supplier);
                        setIsModalOpen(true);
                      }}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition cursor-pointer"
                      title="Editar fornecedor"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-orange-400" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteSupplier(supplier.id, supplier.name)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-slate-700/60 hover:border-red-500/30 transition cursor-pointer"
                      title="Excluir fornecedor"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-4">Fornecedor / Razão Social</th>
                  <th className="p-4">CNPJ</th>
                  <th className="p-4">Categoria</th>
                  <th className="p-4">Contato / Vendedor</th>
                  <th className="p-4">Cidade / UF</th>
                  <th className="p-4">Condição</th>
                  <th className="p-4">Prazo Entrega</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {filteredSuppliers.map((supplier) => {
                  const cleanWhatsapp = (supplier.whatsapp || supplier.phone || '').replace(/\D/g, '');
                  const whatsappUrl = cleanWhatsapp
                    ? `https://wa.me/55${cleanWhatsapp}?text=${encodeURIComponent(`Olá ${supplier.contact || ''}, sou da equipe GATO Autopeças.`)}`
                    : undefined;

                  return (
                    <tr key={supplier.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-white text-xs">{supplier.name}</div>
                        {supplier.fantasyName && supplier.fantasyName !== supplier.name && (
                          <div className="text-[11px] text-slate-400">{supplier.fantasyName}</div>
                        )}
                      </td>
                      <td className="p-4 font-mono text-slate-300">{supplier.cnpj || '—'}</td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 text-[11px] border border-slate-700/60">
                          {categoryLabels[supplier.category || 'distribuidora'] || supplier.category}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="font-medium text-slate-200">{supplier.contact || '—'}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{supplier.phone || supplier.whatsapp || ''}</div>
                      </td>
                      <td className="p-4">{supplier.city}/{supplier.state}</td>
                      <td className="p-4 font-medium text-slate-200">{supplier.paymentTerms || '30 dias'}</td>
                      <td className="p-4 text-emerald-400 font-semibold">{supplier.leadTimeDays || 2} dias</td>
                      <td className="p-4">
                        {supplier.status === 'ativo' ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Ativo
                          </span>
                        ) : supplier.status === 'bloqueado' ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                            Bloqueado
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                            Inativo
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {whatsappUrl && (
                            <a
                              href={whatsappUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition cursor-pointer"
                              title="WhatsApp"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => setViewingSupplier(supplier)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700 transition cursor-pointer"
                            title="Ver detalhes"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSupplierToEdit(supplier);
                              setIsModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-orange-400 border border-slate-700 transition cursor-pointer"
                            title="Editar"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSupplier(supplier.id, supplier.name)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-slate-700 transition cursor-pointer"
                            title="Excluir"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL DE CADASTRO / EDIÇÃO */}
      <SupplierModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSupplierToEdit(null);
        }}
        onSave={handleSaveSupplier}
        supplierToEdit={supplierToEdit}
      />

      {/* MODAL DE DETALHES 360° */}
      <SupplierDetailModal
        isOpen={!!viewingSupplier}
        onClose={() => setViewingSupplier(null)}
        supplier={viewingSupplier}
        products={products}
        onEdit={(supp) => {
          setViewingSupplier(null);
          setSupplierToEdit(supp);
          setIsModalOpen(true);
        }}
        onNavigateToXmlImport={onNavigateToXmlImport}
      />
    </div>
  );
};
