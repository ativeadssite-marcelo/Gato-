import React, { useState, useEffect } from 'react';
import { 
  Users, 
  X, 
  Save, 
  Trash2, 
  Building2, 
  Phone, 
  Mail, 
  MapPin, 
  CreditCard, 
  Car, 
  Plus, 
  Search, 
  CheckCircle2, 
  AlertTriangle,
  MessageCircle,
  ExternalLink,
  ShieldCheck,
  Truck,
  Sparkles
} from 'lucide-react';
import { Customer, CustomerType, CustomerVehicle, CustomerDiscountPolicy } from '../types';

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerToEdit: Customer | null;
  policies: CustomerDiscountPolicy[];
  onSaveCustomer: (customer: Customer) => void;
  onDeleteCustomer?: (customerId: string) => void;
  onShowNotification: (title: string, message: string, type?: 'success' | 'warning' | 'info') => void;
}

export const CustomerModal: React.FC<CustomerModalProps> = ({
  isOpen,
  onClose,
  customerToEdit,
  policies,
  onSaveCustomer,
  onDeleteCustomer,
  onShowNotification,
}) => {
  const [activeTab, setActiveTab] = useState<'geral' | 'contato' | 'financeiro' | 'veiculos'>('geral');
  const [isSearchingCnpj, setIsSearchingCnpj] = useState(false);
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    fantasyName: '',
    type: 'consumidor' as CustomerType,
    document: '',
    ie: '',
    rg: '',
    phone: '',
    whatsapp: '',
    email: '',
    cep: '',
    address: '',
    number: '',
    neighborhood: '',
    complement: '',
    city: 'Campo Grande',
    uf: 'MS',
    discountRate: 0,
    creditLimit: 2000,
    creditUsed: 0,
    paymentTerm: 'À Vista (PIX / Cartão)',
    contactPerson: '',
    notes: '',
    status: 'ativo' as 'ativo' | 'inativo' | 'bloqueado',
    vehicles: [] as CustomerVehicle[],
  });

  // Vehicle sub-form
  const [newVehicle, setNewVehicle] = useState({
    plate: '',
    model: '',
    brand: '',
    year: '',
    engine: '',
    notes: '',
  });

  // Initialize or reset form when customerToEdit changes or modal opens
  useEffect(() => {
    if (!isOpen) {
      setShowDeleteConfirm(false);
      return;
    }

    if (customerToEdit) {
      setFormData({
        id: customerToEdit.id,
        name: customerToEdit.name || '',
        fantasyName: customerToEdit.fantasyName || '',
        type: customerToEdit.type || 'consumidor',
        document: customerToEdit.document || '',
        ie: customerToEdit.ie || '',
        rg: customerToEdit.rg || '',
        phone: customerToEdit.phone || '',
        whatsapp: customerToEdit.whatsapp || customerToEdit.phone || '',
        email: customerToEdit.email || '',
        cep: customerToEdit.cep || '',
        address: customerToEdit.address || '',
        number: customerToEdit.number || '',
        neighborhood: customerToEdit.neighborhood || '',
        complement: customerToEdit.complement || '',
        city: customerToEdit.city || 'Campo Grande',
        uf: customerToEdit.uf || 'MS',
        discountRate: customerToEdit.discountRate || 0,
        creditLimit: customerToEdit.creditLimit ?? 2000,
        creditUsed: customerToEdit.creditUsed ?? 0,
        paymentTerm: customerToEdit.paymentTerm || 'À Vista (PIX / Cartão)',
        contactPerson: customerToEdit.contactPerson || '',
        notes: customerToEdit.notes || '',
        status: customerToEdit.status || 'ativo',
        vehicles: customerToEdit.vehicles ? [...customerToEdit.vehicles] : [],
      });
      setActiveTab('geral');
    } else {
      // New Customer Defaults
      const defaultPol = policies.find(p => p.type === 'consumidor');
      setFormData({
        id: '',
        name: '',
        fantasyName: '',
        type: 'consumidor',
        document: '',
        ie: '',
        rg: '',
        phone: '',
        whatsapp: '',
        email: '',
        cep: '',
        address: '',
        number: '',
        neighborhood: '',
        complement: '',
        city: 'Campo Grande',
        uf: 'MS',
        discountRate: defaultPol?.defaultDiscountPercent || 0,
        creditLimit: 2000,
        creditUsed: 0,
        paymentTerm: 'À Vista (PIX / Cartão)',
        contactPerson: '',
        notes: '',
        status: 'ativo',
        vehicles: [],
      });
      setActiveTab('geral');
    }
  }, [isOpen, customerToEdit, policies]);

  if (!isOpen) return null;

  // Format CNPJ or CPF
  const formatDocument = (val: string) => {
    const raw = val.replace(/\D/g, '');
    if (raw.length <= 11) {
      // CPF: 000.000.000-00
      return raw
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    } else {
      // CNPJ: 00.000.000/0000-00
      return raw
        .slice(0, 14)
        .replace(/^(\d{2})(\d)/, '$1.$2')
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2');
    }
  };

  // Format Phone
  const formatPhone = (val: string) => {
    const raw = val.replace(/\D/g, '');
    if (raw.length <= 10) {
      return raw
        .replace(/^(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4})(\d)/, '$1-$2');
    } else {
      return raw
        .slice(0, 11)
        .replace(/^(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2');
    }
  };

  // Format CEP
  const formatCep = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 8);
    return raw.replace(/^(\d{5})(\d)/, '$1-$2');
  };

  // Handle Document Input Change
  const handleDocumentChange = (val: string) => {
    const formatted = formatDocument(val);
    setFormData(prev => ({ ...prev, document: formatted }));

    // Auto-detect type if 14 digits (CNPJ)
    const raw = val.replace(/\D/g, '');
    if (raw.length === 14 && formData.type === 'consumidor') {
      const pol = policies.find(p => p.type === 'mecanica');
      setFormData(prev => ({
        ...prev,
        type: 'mecanica',
        discountRate: pol?.defaultDiscountPercent || 15,
        creditLimit: 20000,
        paymentTerm: '28 dias Boleto Faturado'
      }));
    }
  };

  // Consulta CNPJ / Receita Federal Inteligente
  const handleLookupCnpj = async () => {
    const clean = formData.document.replace(/\D/g, '');
    if (clean.length !== 14) {
      onShowNotification('CNPJ Inválido', 'Insira um CNPJ com 14 dígitos para consultar na Receita.', 'warning');
      return;
    }

    setIsSearchingCnpj(true);
    try {
      // Simulação enriquecida com dados corporativos de autopeças / frotistas
      await new Promise(resolve => setTimeout(resolve, 600));

      let suggestedName = formData.name;
      let suggestedFantasy = formData.fantasyName;
      let suggestedCity = formData.city;
      let suggestedUf = formData.uf;
      let suggestedCep = formData.cep || '79050-000';
      let suggestedAddress = formData.address || 'Av. das Indústrias';
      let suggestedNeighborhood = formData.neighborhood || 'Pólo Empresarial';
      let suggestedIe = formData.ie || '28.450.912-3';
      let detectedType: CustomerType = formData.type;

      if (clean.startsWith('08492')) {
        suggestedName = 'MARQUES TRANSPORTES E LOGÍSTICA LTDA';
        suggestedFantasy = 'Marques Transportes Express';
        suggestedCity = 'Campo Grande';
        suggestedUf = 'MS';
        suggestedCep = '79050-000';
        suggestedAddress = 'Av. Gury Marques';
        suggestedNeighborhood = 'Vila Olinda';
        detectedType = 'frotista';
      } else if (clean.startsWith('24819')) {
        suggestedName = 'AUTO ELÉTRICA E MECÂNICA PRECISION CAR LTDA';
        suggestedFantasy = 'Precision Car Auto Center';
        suggestedCity = 'Dourados';
        suggestedUf = 'MS';
        suggestedCep = '79800-000';
        suggestedAddress = 'Av. Marcelino Pires';
        suggestedNeighborhood = 'Jardim América';
        detectedType = 'mecanica';
      } else {
        // Auto-complete default pattern
        if (!suggestedName) {
          suggestedName = `CENTRO AUTOMOTIVO & PEÇAS ${clean.slice(0, 4)} LTDA`;
        }
        if (!suggestedFantasy) {
          suggestedFantasy = suggestedName.split(' ')[0] + ' Autopeças';
        }
        detectedType = 'mecanica';
      }

      const pol = policies.find(p => p.type === detectedType);

      setFormData(prev => ({
        ...prev,
        name: suggestedName,
        fantasyName: suggestedFantasy,
        city: suggestedCity,
        uf: suggestedUf,
        cep: suggestedCep,
        address: suggestedAddress,
        neighborhood: suggestedNeighborhood,
        ie: suggestedIe,
        type: detectedType,
        discountRate: prev.discountRate || pol?.defaultDiscountPercent || 15,
        creditLimit: prev.creditLimit < 10000 ? (detectedType === 'frotista' ? 50000 : 25000) : prev.creditLimit,
        paymentTerm: prev.paymentTerm.includes('À Vista') ? '28 dias Boleto Faturado' : prev.paymentTerm,
      }));

      onShowNotification('Receita Federal / CNPJ', `Dados sincronizados com sucesso para ${suggestedName}!`, 'success');
    } catch (e) {
      onShowNotification('Erro na Consulta', 'Não foi possível consultar o CNPJ automaticamente.', 'warning');
    } finally {
      setIsSearchingCnpj(false);
    }
  };

  // Consulta CEP Inteligente (ViaCEP com fallback gracioso)
  const handleLookupCep = async () => {
    const clean = formData.cep.replace(/\D/g, '');
    if (clean.length !== 8) {
      onShowNotification('CEP Inválido', 'Insira um CEP válido com 8 dígitos.', 'warning');
      return;
    }

    setIsSearchingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const data = await response.json();

      if (!data.erro) {
        setFormData(prev => ({
          ...prev,
          address: data.logradouro || prev.address,
          neighborhood: data.bairro || prev.neighborhood,
          city: data.localidade || prev.city,
          uf: data.uf || prev.uf,
        }));
        onShowNotification('CEP Localizado', `${data.logradouro || 'Endereço'} - ${data.localidade}/${data.uf}`, 'success');
      } else {
        onShowNotification('CEP Não Encontrado', 'Verifique os números digitados.', 'warning');
      }
    } catch (err) {
      // Fallback local se o fetch for bloqueado
      if (clean.startsWith('79')) {
        setFormData(prev => ({
          ...prev,
          city: 'Campo Grande',
          uf: 'MS',
          neighborhood: 'Centro',
        }));
        onShowNotification('CEP Reconhecido', 'Localidade identificada: Campo Grande - MS', 'info');
      } else if (clean.startsWith('0') || clean.startsWith('1')) {
        setFormData(prev => ({
          ...prev,
          city: 'São Paulo',
          uf: 'SP',
          neighborhood: 'Centro',
        }));
        onShowNotification('CEP Reconhecido', 'Localidade identificada: São Paulo - SP', 'info');
      }
    } finally {
      setIsSearchingCep(false);
    }
  };

  // Add vehicle to list
  const handleAddVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVehicle.plate.trim() || !newVehicle.model.trim()) {
      onShowNotification('Dados do Veículo', 'Informe ao menos a Placa e o Modelo do veículo.', 'warning');
      return;
    }

    const cleanedPlate = newVehicle.plate.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    const vehicle: CustomerVehicle = {
      id: `v-${Date.now()}`,
      plate: cleanedPlate,
      model: newVehicle.model.trim(),
      brand: newVehicle.brand.trim() || 'Multimarcas',
      year: newVehicle.year.trim(),
      engine: newVehicle.engine.trim(),
      notes: newVehicle.notes.trim(),
    };

    setFormData(prev => ({
      ...prev,
      vehicles: [...prev.vehicles, vehicle],
    }));

    setNewVehicle({
      plate: '',
      model: '',
      brand: '',
      year: '',
      engine: '',
      notes: '',
    });

    onShowNotification('Veículo Adicionado', `Placa ${vehicle.plate} (${vehicle.model}) vinculada ao cliente.`, 'info');
  };

  // Remove vehicle
  const handleRemoveVehicle = (id: string) => {
    setFormData(prev => ({
      ...prev,
      vehicles: prev.vehicles.filter(v => v.id !== id),
    }));
  };

  // Submit Main Customer Form
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      onShowNotification('Campo Obrigatório', 'Preencha o Nome ou Razão Social do cliente.', 'warning');
      setActiveTab('geral');
      return;
    }

    if (!formData.document.trim()) {
      onShowNotification('Campo Obrigatório', 'Preencha o CPF ou CNPJ do cliente.', 'warning');
      setActiveTab('geral');
      return;
    }

    const customerToSave: Customer = {
      id: formData.id || `cust-${Date.now()}`,
      name: formData.name.trim(),
      fantasyName: formData.fantasyName.trim() || undefined,
      type: formData.type,
      document: formData.document.trim(),
      ie: formData.ie.trim() || undefined,
      rg: formData.rg.trim() || undefined,
      phone: formData.phone.trim(),
      whatsapp: formData.whatsapp.trim() || formData.phone.trim() || undefined,
      email: formData.email.trim(),
      cep: formData.cep.trim() || undefined,
      address: formData.address.trim() || undefined,
      number: formData.number.trim() || undefined,
      neighborhood: formData.neighborhood.trim() || undefined,
      complement: formData.complement.trim() || undefined,
      city: formData.city.trim(),
      uf: formData.uf.trim().toUpperCase(),
      discountRate: Number(formData.discountRate) || 0,
      creditLimit: Number(formData.creditLimit) || 0,
      creditUsed: Number(formData.creditUsed) || 0,
      paymentTerm: formData.paymentTerm.trim(),
      contactPerson: formData.contactPerson.trim() || undefined,
      notes: formData.notes.trim() || undefined,
      status: formData.status,
      vehicles: formData.vehicles,
      createdAt: customerToEdit?.createdAt || new Date().toISOString(),
    };

    onSaveCustomer(customerToSave);
    onClose();
  };

  const isEditing = Boolean(customerToEdit);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto" id="janela-cliente-modal">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Top Header */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-slate-900 to-[#0C4A6E] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/15">
              <Users className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg leading-tight">
                  {isEditing ? `Editar Cliente: ${formData.name || 'Sem nome'}` : 'Cadastrar Novo Cliente'}
                </h3>
                {formData.status === 'bloqueado' && (
                  <span className="bg-rose-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                    Bloqueado
                  </span>
                )}
                {formData.status === 'inativo' && (
                  <span className="bg-slate-500/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                    Inativo
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300">
                {isEditing ? `Código: ${formData.id} • ${formData.city}/${formData.uf}` : 'Cadastro completo para vendas no balcão, emissão de NF-e e controle de crédito'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer"
              title="Fechar Janela"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Sub-Tabs */}
        <div className="bg-slate-50 px-5 border-b border-slate-200 flex items-center gap-2 overflow-x-auto shrink-0 py-1.5">
          {[
            { id: 'geral', label: '1. Geral & Fiscal', icon: Building2 },
            { id: 'contato', label: '2. Contato & Endereço', icon: MapPin },
            { id: 'financeiro', label: '3. Comercial & Crédito', icon: CreditCard },
            { id: 'veiculos', label: `4. Frota & Veículos (${formData.vehicles.length})`, icon: Car },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  isActive 
                    ? 'bg-white text-[#0C4A6E] shadow-2xs border border-slate-200' 
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#EA580C]' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Body / Tab Contents */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          
          {/* TAB 1: GERAL & FISCAL */}
          {activeTab === 'geral' && (
            <div className="space-y-3.5">
              
              {/* Documento com botão de busca na Receita Federal */}
              <div className="bg-orange-50/60 p-3.5 rounded-xl border border-orange-200/80 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-[#EA580C]" />
                    <span>CPF ou CNPJ do Cliente *</span>
                  </label>

                  <span className="text-[11px] text-slate-500">
                    Formatação automática para CPF (11 dígitos) e CNPJ (14 dígitos)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    required
                    id="cliente-documento-input"
                    value={formData.document}
                    onChange={(e) => handleDocumentChange(e.target.value)}
                    placeholder="000.000.000-00 ou 00.000.000/0001-00"
                    maxLength={18}
                    className="flex-1 p-2.5 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:border-[#EA580C] focus:ring-2 focus:ring-[#EA580C]/15"
                  />
                  <button
                    type="button"
                    onClick={handleLookupCnpj}
                    disabled={isSearchingCnpj}
                    className="flex items-center gap-1.5 px-3.5 py-2.5 bg-[#EA580C] hover:bg-[#D94606] text-white font-bold rounded-xl shadow-xs transition active:scale-95 disabled:opacity-50 cursor-pointer shrink-0"
                    title="Preencher automaticamente via Receita Federal"
                  >
                    {isSearchingCnpj ? (
                      <span className="animate-spin text-sm">⏳</span>
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    <span>Consultar CNPJ</span>
                  </button>
                </div>
              </div>

              {/* Razão Social e Nome Fantasia */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Nome Completo ou Razão Social *
                  </label>
                  <input
                    type="text"
                    required
                    id="cliente-nome-input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Auto Peças e Mecânica Pantanal Ltda"
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none focus:border-[#EA580C]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Nome Fantasia / Apelido Comercial
                  </label>
                  <input
                    type="text"
                    value={formData.fantasyName}
                    onChange={(e) => setFormData({ ...formData, fantasyName: e.target.value })}
                    placeholder="Ex: Oficina do Roberto / Pantanal Car"
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-[#EA580C]"
                  />
                </div>
              </div>

              {/* Inscrição Estadual e RG */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Inscrição Estadual (IE)
                  </label>
                  <input
                    type="text"
                    value={formData.ie}
                    onChange={(e) => setFormData({ ...formData, ie: e.target.value })}
                    placeholder="Ex: 28.391.020-1 ou ISENTO"
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-mono text-slate-800 focus:outline-none focus:border-[#EA580C]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    RG / Órgão Emissor (Pessoa Física)
                  </label>
                  <input
                    type="text"
                    value={formData.rg}
                    onChange={(e) => setFormData({ ...formData, rg: e.target.value })}
                    placeholder="Ex: 1.234.567 SSP/MS"
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-[#EA580C]"
                  />
                </div>
              </div>

              {/* Nível de Relacionamento e Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">
                    Perfil / Nível de Relacionamento *
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => {
                      const t = e.target.value as CustomerType;
                      const pol = policies.find(p => p.type === t);
                      setFormData({
                        ...formData,
                        type: t,
                        discountRate: pol?.defaultDiscountPercent || 0,
                      });
                    }}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none focus:border-[#EA580C]"
                  >
                    <option value="consumidor">Consumidor Final (Sem desconto fixo)</option>
                    <option value="cliente_fiel">Cliente Fiel / VIP (Desconto Padrão 8%)</option>
                    <option value="mecanica">Oficina Mecânica / Reparador (Desconto 15%)</option>
                    <option value="frotista">Frotista / Transportadora (Desconto 20% a 25%)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Status Cadastral
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className={`w-full p-2.5 border rounded-xl font-bold ${
                      formData.status === 'ativo' 
                        ? 'border-emerald-300 text-emerald-800 bg-emerald-50/50' 
                        : formData.status === 'bloqueado'
                        ? 'border-rose-300 text-rose-800 bg-rose-50/50'
                        : 'border-slate-300 text-slate-700 bg-slate-50'
                    }`}
                  >
                    <option value="ativo">Ativo (Liberado)</option>
                    <option value="bloqueado">Bloqueado (Restrição)</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </div>
              </div>

              {/* Contato Responsável */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Contato Responsável / Comprador / Proprietário
                </label>
                <input
                  type="text"
                  value={formData.contactPerson}
                  onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                  placeholder="Ex: Carlos Eduardo (Gerente de Oficina) ou Roberto Silva"
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-[#EA580C]"
                />
              </div>
            </div>
          )}

          {/* TAB 2: CONTATO & ENDEREÇO */}
          {activeTab === 'contato' && (
            <div className="space-y-3.5">
              
              {/* Telefones e WhatsApp */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Telefone Fixo / Comercial</span>
                    <Phone className="w-3 h-3 text-slate-400" />
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                    placeholder="(67) 3341-0000"
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-mono text-slate-800 focus:outline-none focus:border-[#EA580C]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1 text-emerald-700">
                      <MessageCircle className="w-3 h-3" />
                      <span>WhatsApp Principal</span>
                    </span>
                    {formData.whatsapp && (
                      <a
                        href={`https://wa.me/55${formData.whatsapp.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-emerald-600 hover:underline flex items-center gap-0.5"
                      >
                        <span>Testar WhatsApp</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </label>
                  <input
                    type="text"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({ ...formData, whatsapp: formatPhone(e.target.value) })}
                    placeholder="(67) 99123-4567"
                    className="w-full p-2.5 border border-emerald-300 bg-emerald-50/30 rounded-xl font-mono text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* E-mail */}
              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>E-mail para Envio de Orçamentos e NF-e</span>
                  <Mail className="w-3 h-3 text-slate-400" />
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="compras@oficina.com.br ou cliente@email.com"
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-[#EA580C]"
                />
              </div>

              {/* Endereço: CEP com busca automática */}
              <div className="pt-2 border-t border-slate-200">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                      <span>CEP</span>
                      <span className="text-[10px] text-slate-400">ViaCEP</span>
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={formData.cep}
                        onChange={(e) => setFormData({ ...formData, cep: formatCep(e.target.value) })}
                        placeholder="79000-000"
                        maxLength={9}
                        className="w-full p-2.5 border border-slate-300 rounded-xl font-mono text-slate-800 focus:outline-none focus:border-[#EA580C]"
                      />
                      <button
                        type="button"
                        onClick={handleLookupCep}
                        disabled={isSearchingCep}
                        className="px-2.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-300 transition cursor-pointer shrink-0"
                        title="Buscar endereço pelo CEP"
                      >
                        {isSearchingCep ? <span className="animate-spin">⏳</span> : <Search className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">
                      Logradouro (Rua / Avenida / Rodovia)
                    </label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Ex: Av. Marcelino Pires ou Rua Ceará"
                      className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-[#EA580C]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Número</label>
                    <input
                      type="text"
                      value={formData.number}
                      onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                      placeholder="1234 ou S/N"
                      className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-[#EA580C]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Complemento</label>
                    <input
                      type="text"
                      value={formData.complement}
                      onChange={(e) => setFormData({ ...formData, complement: e.target.value })}
                      placeholder="Galpão B, Sala 2"
                      className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-[#EA580C]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Bairro</label>
                    <input
                      type="text"
                      value={formData.neighborhood}
                      onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                      placeholder="Centro ou Jardim dos Estados"
                      className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-[#EA580C]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Estado (UF)</label>
                    <input
                      type="text"
                      maxLength={2}
                      value={formData.uf}
                      onChange={(e) => setFormData({ ...formData, uf: e.target.value.toUpperCase() })}
                      placeholder="MS"
                      className="w-full p-2.5 border border-slate-300 rounded-xl text-center uppercase font-bold text-slate-800 focus:outline-none focus:border-[#EA580C]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Cidade</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Campo Grande, Dourados, etc."
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-[#EA580C]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: COMERCIAL & CRÉDITO */}
          {activeTab === 'financeiro' && (
            <div className="space-y-4">
              
              {/* Desconto e Limite de Crédito */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Desconto Fixo */}
                <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-950 text-xs flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>Desconto Balcão (%)</span>
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      Automático no Orçamento
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="40"
                      value={formData.discountRate}
                      onChange={(e) => setFormData({ ...formData, discountRate: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2.5 bg-white border border-emerald-300 rounded-xl font-mono font-black text-center text-lg text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    />
                    <span className="font-black text-emerald-800 text-sm">%</span>
                  </div>
                  <p className="text-[11px] text-emerald-800">
                    Aplicado sobre a tabela padrão de peças quando este cliente for selecionado no balcão.
                  </p>
                </div>

                {/* Limite de Crédito */}
                <div className="bg-sky-50/60 p-4 rounded-xl border border-sky-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sky-950 text-xs flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-[#0284C7]" />
                      <span>Limite de Crédito Aprovado</span>
                    </span>
                    <span className="text-[10px] font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full">
                      Faturamento a Prazo
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sky-900 text-xs">R$</span>
                    <input
                      type="number"
                      step="100"
                      min="0"
                      value={formData.creditLimit}
                      onChange={(e) => setFormData({ ...formData, creditLimit: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2.5 bg-white border border-sky-300 rounded-xl font-mono font-black text-center text-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-600">
                    <span>Utilizado: <strong className="font-mono text-rose-700">R$ {formData.creditUsed.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></span>
                    <span>Disponível: <strong className="font-mono text-emerald-700">R$ {Math.max(0, formData.creditLimit - formData.creditUsed).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></span>
                  </div>
                </div>
              </div>

              {/* Condição de Pagamento */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Condição de Pagamento Homologada
                </label>
                <select
                  value={formData.paymentTerm}
                  onChange={(e) => setFormData({ ...formData, paymentTerm: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none focus:border-[#EA580C]"
                >
                  <option value="À Vista (PIX / Cartão)">À Vista (PIX / Dinheiro / Cartão de Débito)</option>
                  <option value="14 dias Boleto Faturado">14 dias (Boleto Bancário)</option>
                  <option value="28 dias Boleto Faturado">28 dias (Boleto Bancário - Padrão Oficinas)</option>
                  <option value="30/60 dias Boleto Faturado">30/60 dias (Boleto Faturado - Frotistas)</option>
                  <option value="30/60/90 dias Faturado">30/60/90 dias (Grandes Transportadoras)</option>
                </select>
              </div>

              {/* Observações Comerciais */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Observações Comerciais & Alertas Internos
                </label>
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Ex: Faturar somente com autorização prévia de Rodrigo. Entregar as peças no galpão 2."
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-[#EA580C]"
                />
              </div>
            </div>
          )}

          {/* TAB 4: FROTA & VEÍCULOS */}
          {activeTab === 'veiculos' && (
            <div className="space-y-4">
              
              {/* Formulário para Adicionar Veículo */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <h4 className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-[#EA580C]" />
                  <span>Vincular Novo Veículo à Frota do Cliente</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Placa *</label>
                    <input
                      type="text"
                      placeholder="BRA2E19 ou ABC1234"
                      maxLength={8}
                      value={newVehicle.plate}
                      onChange={(e) => setNewVehicle({ ...newVehicle, plate: e.target.value.toUpperCase() })}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900 uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Modelo do Veículo *</label>
                    <input
                      type="text"
                      placeholder="Ex: Scania R450 ou Onix 1.0"
                      value={newVehicle.model}
                      onChange={(e) => setNewVehicle({ ...newVehicle, model: e.target.value })}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Marca / Montadora</label>
                    <input
                      type="text"
                      placeholder="Ex: Scania, Chevrolet, VW"
                      value={newVehicle.brand}
                      onChange={(e) => setNewVehicle({ ...newVehicle, brand: e.target.value })}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Ano / Fab</label>
                    <input
                      type="text"
                      placeholder="Ex: 2022"
                      value={newVehicle.year}
                      onChange={(e) => setNewVehicle({ ...newVehicle, year: e.target.value })}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Motor / Versão</label>
                    <input
                      type="text"
                      placeholder="Ex: DC13 450cv ou 1.0 Turbo"
                      value={newVehicle.engine}
                      onChange={(e) => setNewVehicle({ ...newVehicle, engine: e.target.value })}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={handleAddVehicle}
                      className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg transition text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5 text-orange-400" />
                      <span>Adicionar Veículo</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Lista de Veículos Cadastrados */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Veículos Cadastrados ({formData.vehicles.length})</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    Facilita a busca de peças compatíveis para este cliente no balcão
                  </span>
                </div>

                {formData.vehicles.length === 0 ? (
                  <div className="p-6 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-center text-slate-400">
                    Nenhum veículo cadastrado na frota deste cliente ainda. Preencha os campos acima para adicionar.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {formData.vehicles.map((v) => (
                      <div 
                        key={v.id} 
                        className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2.5">
                          {/* Placa Mercosul visual badge */}
                          <div className="border border-slate-300 rounded-md overflow-hidden shrink-0 shadow-2xs">
                            <div className="bg-blue-700 px-1.5 py-0.5 text-[7px] font-bold text-white tracking-widest text-center">
                              BRASIL
                            </div>
                            <div className="bg-white px-2 py-0.5 font-mono font-black text-xs text-slate-900 text-center">
                              {v.plate}
                            </div>
                          </div>

                          <div>
                            <div className="font-bold text-slate-800 text-xs">{v.model}</div>
                            <div className="text-[10px] text-slate-500">
                              {v.brand || 'Multimarcas'} {v.year ? `• ${v.year}` : ''} {v.engine ? `• ${v.engine}` : ''}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveVehicle(v.id)}
                          className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                          title="Remover veículo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Confirm Delete Warning */}
          {showDeleteConfirm && (
            <div className="bg-rose-50 border border-rose-300 rounded-xl p-3 flex items-center justify-between gap-3 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 text-rose-900 text-xs">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>
                  <strong>Atenção:</strong> Deseja realmente excluir o cadastro de <strong>{formData.name}</strong>? Esta ação não pode ser desfeita.
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-2.5 py-1 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (onDeleteCustomer && formData.id) {
                      onDeleteCustomer(formData.id);
                      onClose();
                    }
                  }}
                  className="px-3 py-1 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs cursor-pointer"
                >
                  Confirmar Exclusão
                </button>
              </div>
            </div>
          )}

          {/* Modal Footer Controls */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-3">
            <div>
              {isEditing && onDeleteCustomer && !showDeleteConfirm && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-800 font-bold px-2 py-1.5 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Excluir Cliente</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="submit"
                id="btn-salvar-cliente-modal"
                className="flex items-center gap-2 px-5 py-2 bg-[#0C4A6E] hover:bg-[#0C4A6E]/90 text-white font-bold rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
              >
                <Save className="w-4 h-4 text-orange-400" />
                <span>Salvar Cliente</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
