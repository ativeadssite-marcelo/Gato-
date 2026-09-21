import React, { useState, useEffect } from 'react';
import { 
  X, 
  Building2, 
  Phone, 
  Mail, 
  MapPin, 
  DollarSign, 
  Clock, 
  Truck, 
  Star, 
  Tag, 
  FileText, 
  Check, 
  Search, 
  Plus, 
  Trash2,
  ExternalLink
} from 'lucide-react';
import { Supplier } from '../types';

interface SupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (supplier: Supplier) => void;
  supplierToEdit?: Supplier | null;
}

export const SupplierModal: React.FC<SupplierModalProps> = ({
  isOpen,
  onClose,
  onSave,
  supplierToEdit,
}) => {
  const [activeTab, setActiveTab] = useState<'geral' | 'contato' | 'comercial' | 'marcas'>('geral');
  const [loadingCep, setLoadingCep] = useState(false);
  const [cepError, setCepError] = useState('');
  const [newBrand, setNewBrand] = useState('');

  const [formData, setFormData] = useState<Partial<Supplier>>({
    name: '',
    fantasyName: '',
    cnpj: '',
    ie: '',
    contact: '',
    phone: '',
    whatsapp: '',
    email: '',
    cep: '',
    address: '',
    number: '',
    neighborhood: '',
    city: '',
    state: 'SP',
    category: 'distribuidora',
    paymentTerms: '30 dias',
    leadTimeDays: 2,
    minOrderValue: 500,
    freightType: 'CIF',
    rating: 5,
    status: 'ativo',
    brandsSupplied: [],
    notes: '',
  });

  useEffect(() => {
    if (supplierToEdit) {
      setFormData({
        ...supplierToEdit,
        brandsSupplied: supplierToEdit.brandsSupplied || []
      });
    } else {
      setFormData({
        id: `sup-${Date.now().toString().slice(-6)}`,
        name: '',
        fantasyName: '',
        cnpj: '',
        ie: '',
        contact: '',
        phone: '',
        whatsapp: '',
        email: '',
        cep: '',
        address: '',
        number: '',
        neighborhood: '',
        city: '',
        state: 'SP',
        category: 'distribuidora',
        paymentTerms: '28/42 dias',
        leadTimeDays: 2,
        minOrderValue: 500,
        freightType: 'CIF',
        rating: 5,
        status: 'ativo',
        brandsSupplied: ['Bosch', 'Cofap'],
        notes: '',
        createdAt: new Date().toISOString().split('T')[0],
        totalPurchases: 0
      });
    }
    setActiveTab('geral');
    setCepError('');
  }, [supplierToEdit, isOpen]);

  if (!isOpen) return null;

  // Format CNPJ as user types
  const handleCnpjChange = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 14);
    let formatted = raw;
    if (raw.length > 2 && raw.length <= 5) {
      formatted = `${raw.slice(0, 2)}.${raw.slice(2)}`;
    } else if (raw.length > 5 && raw.length <= 8) {
      formatted = `${raw.slice(0, 2)}.${raw.slice(2, 5)}.${raw.slice(5)}`;
    } else if (raw.length > 8 && raw.length <= 12) {
      formatted = `${raw.slice(0, 2)}.${raw.slice(2, 5)}.${raw.slice(5, 8)}/${raw.slice(8)}`;
    } else if (raw.length > 12) {
      formatted = `${raw.slice(0, 2)}.${raw.slice(2, 5)}.${raw.slice(5, 8)}/${raw.slice(8, 12)}-${raw.slice(12)}`;
    }
    setFormData(prev => ({ ...prev, cnpj: formatted }));
  };

  // Format Phone
  const handlePhoneChange = (val: string, field: 'phone' | 'whatsapp') => {
    const raw = val.replace(/\D/g, '').slice(0, 11);
    let formatted = raw;
    if (raw.length > 2 && raw.length <= 6) {
      formatted = `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
    } else if (raw.length > 6 && raw.length <= 10) {
      formatted = `(${raw.slice(0, 2)}) ${raw.slice(2, 6)}-${raw.slice(6)}`;
    } else if (raw.length > 10) {
      formatted = `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7)}`;
    }
    setFormData(prev => ({ ...prev, [field]: formatted }));
  };

  // Format CEP & search ViaCEP
  const handleCepSearch = async (cepToSearch?: string) => {
    const rawCep = (cepToSearch || formData.cep || '').replace(/\D/g, '');
    if (rawCep.length !== 8) {
      setCepError('O CEP deve conter 8 dígitos.');
      return;
    }

    setLoadingCep(true);
    setCepError('');
    try {
      const res = await fetch(`https://viacep.com.br/ws/${rawCep}/json/`);
      const data = await res.json();
      if (data.erro) {
        setCepError('CEP não encontrado na base dos Correios.');
      } else {
        setFormData(prev => ({
          ...prev,
          address: data.logradouro || prev.address,
          neighborhood: data.bairro || prev.neighborhood,
          city: data.localidade || prev.city,
          state: data.uf || prev.state,
        }));
      }
    } catch {
      setCepError('Erro ao consultar CEP. Preencha manualmente.');
    } finally {
      setLoadingCep(false);
    }
  };

  const handleAddBrand = () => {
    if (!newBrand.trim()) return;
    const current = formData.brandsSupplied || [];
    if (!current.includes(newBrand.trim())) {
      setFormData(prev => ({
        ...prev,
        brandsSupplied: [...current, newBrand.trim()]
      }));
    }
    setNewBrand('');
  };

  const handleRemoveBrand = (brandToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      brandsSupplied: (prev.brandsSupplied || []).filter(b => b !== brandToRemove)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      setActiveTab('geral');
      return;
    }

    const finalSupplier: Supplier = {
      id: supplierToEdit?.id || formData.id || `sup-${Date.now().toString().slice(-6)}`,
      name: formData.name.trim(),
      fantasyName: formData.fantasyName?.trim() || formData.name.trim(),
      cnpj: formData.cnpj || '',
      ie: formData.ie || '',
      contact: formData.contact || '',
      phone: formData.phone || '',
      whatsapp: formData.whatsapp || '',
      email: formData.email || '',
      cep: formData.cep || '',
      address: formData.address || '',
      number: formData.number || '',
      neighborhood: formData.neighborhood || '',
      city: formData.city || 'São Paulo',
      state: formData.state || 'SP',
      category: formData.category || 'distribuidora',
      paymentTerms: formData.paymentTerms || '30 dias',
      leadTimeDays: Number(formData.leadTimeDays) || 2,
      minOrderValue: Number(formData.minOrderValue) || 0,
      freightType: formData.freightType || 'CIF',
      rating: Number(formData.rating) || 5,
      status: formData.status || 'ativo',
      brandsSupplied: formData.brandsSupplied || [],
      notes: formData.notes || '',
      totalPurchases: supplierToEdit?.totalPurchases || 0,
      lastPurchaseDate: supplierToEdit?.lastPurchaseDate || new Date().toISOString().split('T')[0],
      createdAt: supplierToEdit?.createdAt || new Date().toISOString().split('T')[0],
    };

    onSave(finalSupplier);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-[#EA580C]">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                {supplierToEdit ? 'Editar Fornecedor' : 'Cadastrar Novo Fornecedor'}
                {formData.status === 'ativo' && (
                  <span className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                    Ativo
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                Distribuidora, fabricante ou parceiro de reposição de autopeças
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 px-4 pt-2 gap-2 overflow-x-auto custom-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('geral')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'geral'
                ? 'bg-slate-900 text-orange-400 border-t-2 border-orange-500 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Dados Cadastrais
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('contato')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'contato'
                ? 'bg-slate-900 text-orange-400 border-t-2 border-orange-500 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <Phone className="w-4 h-4" />
            Contato & Endereço
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('comercial')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'comercial'
                ? 'bg-slate-900 text-orange-400 border-t-2 border-orange-500 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            Condições Comerciais
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('marcas')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'marcas'
                ? 'bg-slate-900 text-orange-400 border-t-2 border-orange-500 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <Tag className="w-4 h-4" />
            Marcas & Catálogos ({formData.brandsSupplied?.length || 0})
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
          {/* TAB: GERAL */}
          {activeTab === 'geral' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Razão Social <span className="text-orange-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: Robert Bosch Ltda"
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nome Fantasia
                  </label>
                  <input
                    type="text"
                    value={formData.fantasyName || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, fantasyName: e.target.value }))}
                    placeholder="Ex: Bosch Brasil"
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    CNPJ
                  </label>
                  <input
                    type="text"
                    value={formData.cnpj || ''}
                    onChange={(e) => handleCnpjChange(e.target.value)}
                    placeholder="00.000.000/0000-00"
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Inscrição Estadual (IE)
                  </label>
                  <input
                    type="text"
                    value={formData.ie || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, ie: e.target.value }))}
                    placeholder="Ex: 110.234.567.890 ou ISENTO"
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Categoria do Fornecedor
                  </label>
                  <select
                    value={formData.category || 'distribuidora'}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as any }))}
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="distribuidora">Distribuidora Atacadista</option>
                    <option value="fabricante">Fabricante / Indústria</option>
                    <option value="importadora">Importadora Oficial</option>
                    <option value="diesel">Linha Pesada / Diesel</option>
                    <option value="motos">Motopeças</option>
                    <option value="quimicos">Químicos & Lubrificantes</option>
                    <option value="outros">Outros / Especialidades</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Status do Fornecedor
                  </label>
                  <select
                    value={formData.status || 'ativo'}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="ativo">🟢 Ativo (Apto para compras e cotações)</option>
                    <option value="bloqueado">🔴 Bloqueado (Problemas fiscais ou atrasos)</option>
                    <option value="inativo">⚪ Inativo (Não utilizado atualmente)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Avaliação / Classificação
                  </label>
                  <div className="flex items-center gap-2 pt-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, rating: star }))}
                        className={`p-1.5 rounded-lg border transition cursor-pointer ${
                          (formData.rating || 5) >= star
                            ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                            : 'bg-slate-800 border-slate-700 text-slate-600'
                        }`}
                      >
                        <Star className="w-5 h-5 fill-current" />
                      </button>
                    ))}
                    <span className="text-xs text-slate-400 ml-2">
                      {formData.rating || 5} de 5 estrelas
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Anotações Internas
                </label>
                <textarea
                  rows={3}
                  value={formData.notes || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Informações sobre tabela de descontos, limites negociados, dias de corte de pedidos..."
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
          )}

          {/* TAB: CONTATO & ENDEREÇO */}
          {activeTab === 'contato' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Vendedor / Representante
                  </label>
                  <input
                    type="text"
                    value={formData.contact || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, contact: e.target.value }))}
                    placeholder="Ex: Carlos Eduardo Mendes"
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Telefone Comercial
                  </label>
                  <input
                    type="text"
                    value={formData.phone || ''}
                    onChange={(e) => handlePhoneChange(e.target.value, 'phone')}
                    placeholder="(00) 0000-0000"
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    WhatsApp para Pedidos
                  </label>
                  <input
                    type="text"
                    value={formData.whatsapp || ''}
                    onChange={(e) => handlePhoneChange(e.target.value, 'whatsapp')}
                    placeholder="(00) 90000-0000"
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  E-mail para Envio de Pedidos e XML
                </label>
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="pedidos@fornecedor.com.br"
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="pt-2 border-t border-slate-800">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-orange-400" />
                  Localização e Endereço da Distribuidora
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-3">
                  <div className="sm:col-span-1">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      CEP
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={formData.cep || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, cep: e.target.value }))}
                        onBlur={() => handleCepSearch()}
                        placeholder="00000-000"
                        className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleCepSearch()}
                        disabled={loadingCep}
                        className="px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs flex items-center justify-center cursor-pointer disabled:opacity-50"
                        title="Buscar endereço pelo CEP"
                      >
                        {loadingCep ? '...' : <Search className="w-4 h-4" />}
                      </button>
                    </div>
                    {cepError && <p className="text-[11px] text-red-400 mt-1">{cepError}</p>}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Logradouro / Rua
                    </label>
                    <input
                      type="text"
                      value={formData.address || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="Ex: Rua do Gasômetro"
                      className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <div className="sm:col-span-1">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Número
                    </label>
                    <input
                      type="text"
                      value={formData.number || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, number: e.target.value }))}
                      placeholder="1250"
                      className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Bairro
                    </label>
                    <input
                      type="text"
                      value={formData.neighborhood || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, neighborhood: e.target.value }))}
                      placeholder="Brás"
                      className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Cidade
                    </label>
                    <input
                      type="text"
                      value={formData.city || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                      placeholder="São Paulo"
                      className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Estado (UF)
                    </label>
                    <select
                      value={formData.state || 'SP'}
                      onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                      className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                    >
                      {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(uf => (
                        <option key={uf} value={uf}>{uf}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: CONDIÇÕES COMERCIAIS */}
          {activeTab === 'comercial' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-orange-400" />
                    Prazo de Pagamento Negociado
                  </label>
                  <input
                    type="text"
                    value={formData.paymentTerms || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, paymentTerms: e.target.value }))}
                    placeholder="Ex: 28/42/56 dias ou À vista"
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Condição que será sugerida ao dar entrada em notas fiscais.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-orange-400" />
                    Prazo Médio de Entrega (Lead Time)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="60"
                      value={formData.leadTimeDays ?? 2}
                      onChange={(e) => setFormData(prev => ({ ...prev, leadTimeDays: Number(e.target.value) }))}
                      className="w-24 bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white font-mono focus:outline-hidden focus:ring-2 focus:ring-orange-500 text-center"
                    />
                    <span className="text-sm text-slate-300">dias úteis</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-orange-400" />
                    Valor Mínimo de Pedido (R$)
                  </label>
                  <input
                    type="number"
                    step="50"
                    min="0"
                    value={formData.minOrderValue ?? 0}
                    onChange={(e) => setFormData(prev => ({ ...prev, minOrderValue: Number(e.target.value) }))}
                    placeholder="500.00"
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Alerta de corte mínimo ao gerar pedido de compra.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-orange-400" />
                    Tipo Padrão de Frete
                  </label>
                  <select
                    value={formData.freightType || 'CIF'}
                    onChange={(e) => setFormData(prev => ({ ...prev, freightType: e.target.value as any }))}
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="CIF">CIF (Frete por conta do fornecedor / Entregue)</option>
                    <option value="FOB">FOB (Frete por conta do comprador / Retira)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB: MARCAS & CATÁLOGOS */}
          {activeTab === 'marcas' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Marcas e Linhas de Peças Fornecidas
                </label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newBrand}
                    onChange={(e) => setNewBrand(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddBrand();
                      }
                    }}
                    placeholder="Digite o nome da marca (ex: Bosch, Cofap, Nakata, Fras-le)..."
                    className="flex-1 bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddBrand}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Adicionar
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 min-h-16 p-3 bg-slate-950/60 border border-slate-800 rounded-2xl">
                  {(formData.brandsSupplied && formData.brandsSupplied.length > 0) ? (
                    formData.brandsSupplied.map((brand) => (
                      <span
                        key={brand}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-xl text-xs font-medium group"
                      >
                        <Tag className="w-3 h-3 text-orange-400" />
                        {brand}
                        <button
                          type="button"
                          onClick={() => handleRemoveBrand(brand)}
                          className="text-slate-400 hover:text-red-400 ml-1 cursor-pointer transition-colors"
                          title={`Remover marca ${brand}`}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))
                  ) : (
                    <div className="flex items-center justify-center w-full text-slate-500 text-xs py-4">
                      Nenhuma marca adicionada ainda. Adicione marcas para facilitar a busca de peças.
                    </div>
                  )}
                </div>
              </div>

              {/* Suggestions */}
              <div className="pt-2">
                <p className="text-xs text-slate-400 mb-2">Sugestões rápidas de marcas do setor:</p>
                <div className="flex flex-wrap gap-1.5">
                  {['Bosch', 'Cofap', 'Nakata', 'Fras-le', 'TRW', 'Dayco', 'Mahle', 'Cobreq', 'Vaz', 'Cummins', 'Wabco', 'Scania', 'Volvo'].map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => {
                        const current = formData.brandsSupplied || [];
                        if (!current.includes(sug)) {
                          setFormData(prev => ({ ...prev, brandsSupplied: [...current, sug] }));
                        }
                      }}
                      className="px-2.5 py-1 bg-slate-800/60 hover:bg-slate-800 text-[11px] text-slate-300 hover:text-white border border-slate-700/50 rounded-lg transition cursor-pointer"
                    >
                      + {sug}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Footer actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <div className="text-xs text-slate-500">
              {supplierToEdit ? `ID: ${supplierToEdit.id}` : 'Novo cadastro de fornecedor'}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition cursor-pointer shadow-md shadow-orange-600/20"
              >
                <Check className="w-4 h-4" />
                Salvar Fornecedor
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
