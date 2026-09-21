import React, { useState, useMemo } from 'react';
import {
  Wrench,
  Car,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  User,
  Phone,
  Calendar,
  DollarSign,
  Package,
  Printer,
  Share2,
  Trash2,
  Edit3,
  Check,
  X,
  Gauge,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Bike,
  Truck,
  ExternalLink,
  ChevronDown,
  Layers,
  Send,
  Download,
  Store,
  Zap,
  Info
} from 'lucide-react';
import { 
  ServiceOrder, 
  ServiceOrderStatus, 
  ServiceOrderItem, 
  ServiceLaborItem, 
  Product, 
  Customer, 
  CompanyProfile, 
  UserSession 
} from '../types';
import { 
  AVAILABLE_MECHANICS, 
  COMMON_AUTOMOTIVE_SERVICES, 
  StandardLaborService 
} from '../data/initialData';

interface OrdemServicoManagerProps {
  serviceOrders: ServiceOrder[];
  products: Product[];
  customers: Customer[];
  companyProfile?: CompanyProfile | null;
  userSession?: UserSession | null;
  onUpdateServiceOrders: (orders: ServiceOrder[]) => void;
  onUpdateProductStock?: (productId: string, quantitySold: number) => void;
  onShowNotification: (title: string, message: string, type?: 'success' | 'warning' | 'info') => void;
}

export const OrdemServicoManager: React.FC<OrdemServicoManagerProps> = ({
  serviceOrders,
  products,
  customers,
  companyProfile,
  userSession,
  onUpdateServiceOrders,
  onUpdateProductStock,
  onShowNotification,
}) => {
  // Filtros
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [mechanicFilter, setMechanicFilter] = useState<string>('todos');

  // Modais
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<ServiceOrder | null>(null);
  const [printingOrder, setPrintingOrder] = useState<ServiceOrder | null>(null);
  const [detailOrder, setDetailOrder] = useState<ServiceOrder | null>(null);

  // --- FORM STATE ---
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerDocument, setCustomerDocument] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');

  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleBrand, setVehicleBrand] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleYear, setVehicleYear] = useState<number>(new Date().getFullYear());
  const [vehicleColor, setVehicleColor] = useState('');
  const [vehicleKm, setVehicleKm] = useState<number>(0);
  const [vehicleMotor, setVehicleMotor] = useState('');

  const [mechanicAssigned, setMechanicAssigned] = useState(AVAILABLE_MECHANICS[0]?.name || 'Mecânico Geral');
  const [status, setStatus] = useState<ServiceOrderStatus>('Orcamento');
  const [problemReported, setProblemReported] = useState('');
  const [technicalDiagnosis, setTechnicalDiagnosis] = useState('');
  const [notes, setNotes] = useState('');

  // Checklist
  const [fuelLevel, setFuelLevel] = useState<'Reserva' | '1/4' | '1/2' | '3/4' | 'Cheio'>('1/2');
  const [spareTire, setSpareTire] = useState(true);
  const [jack, setJack] = useState(true);
  const [wheelWrench, setWheelWrench] = useState(true);
  const [scratchesNotes, setScratchesNotes] = useState('');

  // Peças e Serviços
  const [parts, setParts] = useState<ServiceOrderItem[]>([]);
  const [labor, setLabor] = useState<ServiceLaborItem[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState('À Vista / PIX');

  // Item selecionado para adicionar peças
  const [selectedProductId, setSelectedProductId] = useState('');
  const [partQty, setPartQty] = useState(1);

  // Serviço selecionado para adicionar mão de obra
  const [customLaborDesc, setCustomLaborDesc] = useState('');
  const [customLaborPrice, setCustomLaborPrice] = useState<number>(80);
  const [customLaborHours, setCustomLaborHours] = useState<number>(1);
  const [selectedStandardService, setSelectedStandardService] = useState('');

  // Totais calculados
  const partsTotal = useMemo(() => parts.reduce((acc, p) => acc + p.total, 0), [parts]);
  const laborTotal = useMemo(() => labor.reduce((acc, l) => acc + l.price, 0), [labor]);
  const grandTotal = Math.max(0, partsTotal + laborTotal - discount);

  // Estatísticas de OS
  const stats = useMemo(() => {
    const total = serviceOrders.length;
    const emExecucao = serviceOrders.filter(o => o.status === 'Em Execucao').length;
    const orcamentos = serviceOrders.filter(o => o.status === 'Orcamento').length;
    const aguardandoPecas = serviceOrders.filter(o => o.status === 'Aguardando Pecas').length;
    const finalizadas = serviceOrders.filter(o => o.status === 'Finalizada' || o.status === 'Faturada').length;
    const faturamentoTotal = serviceOrders
      .filter(o => o.status !== 'Cancelada')
      .reduce((acc, o) => acc + o.totalAmount, 0);

    return { total, emExecucao, orcamentos, aguardandoPecas, finalizadas, faturamentoTotal };
  }, [serviceOrders]);

  // Lista Filtrada
  const filteredOrders = useMemo(() => {
    return serviceOrders.filter(order => {
      const matchStatus = statusFilter === 'todos' || order.status === statusFilter;
      const matchMechanic = mechanicFilter === 'todos' || order.mechanicAssigned === mechanicFilter;
      const term = searchTerm.toLowerCase();
      const matchSearch = 
        !term ||
        order.id.toLowerCase().includes(term) ||
        order.customerName.toLowerCase().includes(term) ||
        order.vehiclePlate.toLowerCase().includes(term) ||
        order.vehicleModel.toLowerCase().includes(term) ||
        order.vehicleBrand.toLowerCase().includes(term);

      return matchStatus && matchMechanic && matchSearch;
    });
  }, [serviceOrders, statusFilter, mechanicFilter, searchTerm]);

  // Abrir modal para nova OS
  const handleOpenNewOrder = () => {
    setEditingOrder(null);
    const nextSeq = serviceOrders.length + 1;
    const formattedId = `OS-2026-${String(nextSeq).padStart(3, '0')}`;

    setCustomerId('');
    setCustomerName('');
    setCustomerDocument('');
    setCustomerPhone('');
    setCustomerEmail('');

    setVehiclePlate('');
    setVehicleBrand('Volkswagen');
    setVehicleModel('');
    setVehicleYear(2023);
    setVehicleColor('');
    setVehicleKm(45000);
    setVehicleMotor('1.6 MSI Flex');

    setMechanicAssigned(AVAILABLE_MECHANICS[0]?.name || 'Marcos Ribeiro');
    setStatus('Orcamento');
    setProblemReported('');
    setTechnicalDiagnosis('');
    setNotes('');

    setFuelLevel('1/2');
    setSpareTire(true);
    setJack(true);
    setWheelWrench(true);
    setScratchesNotes('');

    setParts([]);
    setLabor([]);
    setDiscount(0);
    setPaymentMethod('À Vista / PIX');

    setIsFormOpen(true);
  };

  // Abrir modal para editar OS existente
  const handleOpenEditOrder = (order: ServiceOrder) => {
    setEditingOrder(order);
    setCustomerId(order.customerId);
    setCustomerName(order.customerName);
    setCustomerDocument(order.customerDocument);
    setCustomerPhone(order.customerPhone);
    setCustomerEmail(order.customerEmail || '');

    setVehiclePlate(order.vehiclePlate);
    setVehicleBrand(order.vehicleBrand);
    setVehicleModel(order.vehicleModel);
    setVehicleYear(order.vehicleYear);
    setVehicleColor(order.vehicleColor || '');
    setVehicleKm(order.vehicleKm);
    setVehicleMotor(order.vehicleMotor || '');

    setMechanicAssigned(order.mechanicAssigned);
    setStatus(order.status);
    setProblemReported(order.problemReported);
    setTechnicalDiagnosis(order.technicalDiagnosis || '');
    setNotes(order.notes || '');

    setFuelLevel(order.checklist?.fuelLevel || '1/2');
    setSpareTire(order.checklist?.spareTire ?? true);
    setJack(order.checklist?.jack ?? true);
    setWheelWrench(order.checklist?.wheelWrench ?? true);
    setScratchesNotes(order.checklist?.scratchesNotes || '');

    setParts([...order.parts]);
    setLabor([...order.labor]);
    setDiscount(order.discount);
    setPaymentMethod(order.paymentMethod || 'À Vista / PIX');

    setIsFormOpen(true);
  };

  // Preencher dados do cliente ao selecionar um existente
  const handleSelectExistingCustomer = (id: string) => {
    setCustomerId(id);
    const found = customers.find(c => c.id === id);
    if (found) {
      setCustomerName(found.name);
      setCustomerDocument(found.document);
      setCustomerPhone(found.phone || '');
      setCustomerEmail(found.email || '');
    }
  };

  // Adicionar Peça do Estoque à OS
  const handleAddPart = () => {
    if (!selectedProductId) return;
    const prod = products.find(p => p.id === selectedProductId);
    if (!prod) return;

    if (partQty <= 0) return;

    const existingIndex = parts.findIndex(p => p.productId === prod.id);
    if (existingIndex >= 0) {
      const updated = [...parts];
      updated[existingIndex].quantity += partQty;
      updated[existingIndex].total = updated[existingIndex].quantity * updated[existingIndex].unitPrice;
      setParts(updated);
    } else {
      const newItem: ServiceOrderItem = {
        productId: prod.id,
        productCode: prod.code,
        productName: prod.name,
        brand: prod.brand,
        quantity: partQty,
        unitPrice: prod.sellingPrice,
        costPrice: prod.unitCost,
        total: prod.sellingPrice * partQty,
      };
      setParts([...parts, newItem]);
    }

    setSelectedProductId('');
    setPartQty(1);
    onShowNotification('Peça Adicionada', `${prod.name} vinculada à OS.`, 'info');
  };

  const handleRemovePart = (index: number) => {
    setParts(parts.filter((_, i) => i !== index));
  };

  // Adicionar Mão de Obra / Serviço à OS
  const handleAddLabor = () => {
    if (!customLaborDesc.trim() && !selectedStandardService) return;

    let desc = customLaborDesc.trim();
    let price = customLaborPrice;
    let hours = customLaborHours;

    if (selectedStandardService) {
      const std = COMMON_AUTOMOTIVE_SERVICES.find(s => s.id === selectedStandardService);
      if (std) {
        desc = std.name;
        price = std.defaultPrice;
        hours = std.estimatedHours;
      }
    }

    const newLabor: ServiceLaborItem = {
      id: `lab-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      description: desc,
      mechanicName: mechanicAssigned,
      hours,
      price,
    };

    setLabor([...labor, newLabor]);
    setCustomLaborDesc('');
    setSelectedStandardService('');
    setCustomLaborPrice(80);
    setCustomLaborHours(1);
    onShowNotification('Serviço Adicionado', `${desc} inserido na OS.`, 'info');
  };

  const handleRemoveLabor = (id: string) => {
    setLabor(labor.filter(l => l.id !== id));
  };

  // Salvar OS (Criar ou Atualizar)
  const handleSaveOrder = (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim()) {
      onShowNotification('Campo Obrigatório', 'Informe o nome do cliente.', 'warning');
      return;
    }
    if (!vehiclePlate.trim()) {
      onShowNotification('Campo Obrigatório', 'Informe a placa do veículo.', 'warning');
      return;
    }

    const orderId = editingOrder ? editingOrder.id : `OS-2026-${String(serviceOrders.length + 1).padStart(3, '0')}`;
    const now = new Date().toISOString().replace('T', ' ').substring(0, 16);

    const savedOrder: ServiceOrder = {
      id: orderId,
      dateOpened: editingOrder ? editingOrder.dateOpened : now,
      dateEstimated: editingOrder?.dateEstimated || now,
      dateFinished: (status === 'Finalizada' || status === 'Faturada') ? now : undefined,
      status,
      customerId: customerId || `cust-${Date.now()}`,
      customerName: customerName.trim(),
      customerDocument: customerDocument.trim(),
      customerPhone: customerPhone.trim(),
      customerEmail: customerEmail.trim(),
      vehiclePlate: vehiclePlate.trim().toUpperCase(),
      vehicleBrand: vehicleBrand.trim() || 'Volkswagen',
      vehicleModel: vehicleModel.trim() || 'Modelo Não Especificado',
      vehicleYear,
      vehicleColor: vehicleColor.trim(),
      vehicleKm,
      vehicleMotor: vehicleMotor.trim(),
      mechanicAssigned,
      problemReported: problemReported.trim() || 'Revisão preventiva periódica',
      technicalDiagnosis: technicalDiagnosis.trim(),
      parts,
      labor,
      partsTotal,
      laborTotal,
      discount,
      totalAmount: grandTotal,
      paymentMethod,
      checklist: {
        fuelLevel,
        spareTire,
        jack,
        wheelWrench,
        scratchesNotes,
      },
      warrantyDays: 90,
      branchId: userSession?.branchId || 'matriz-ms',
      notes,
    };

    let updatedList: ServiceOrder[];
    if (editingOrder) {
      updatedList = serviceOrders.map(o => o.id === editingOrder.id ? savedOrder : o);
      onShowNotification('OS Atualizada', `Ordem ${orderId} salva com sucesso!`, 'success');
    } else {
      updatedList = [savedOrder, ...serviceOrders];
      onShowNotification('Nova OS Aberta', `Ordem de Serviço ${orderId} aberta para ${savedOrder.vehiclePlate}!`, 'success');
    }

    onUpdateServiceOrders(updatedList);
    setIsFormOpen(false);
  };

  // Alterar Status Rápido
  const handleQuickStatusChange = (orderId: string, newStatus: ServiceOrderStatus) => {
    const updated = serviceOrders.map(o => {
      if (o.id === orderId) {
        const isFinishing = newStatus === 'Finalizada' || newStatus === 'Faturada';
        return {
          ...o,
          status: newStatus,
          dateFinished: isFinishing ? new Date().toISOString().replace('T', ' ').substring(0, 16) : o.dateFinished,
        };
      }
      return o;
    });

    onUpdateServiceOrders(updated);
    onShowNotification('Status Atualizado', `OS ${orderId} alterada para "${newStatus}".`, 'info');
  };

  // Faturar OS (Baixar estoque das peças)
  const handleInvoiceOrder = (order: ServiceOrder) => {
    if (order.status === 'Faturada') {
      onShowNotification('Aviso', 'Esta Ordem de Serviço já foi faturada.', 'info');
      return;
    }

    // Baixa de estoque das peças
    if (onUpdateProductStock && order.parts.length > 0) {
      order.parts.forEach(part => {
        onUpdateProductStock(part.productId, part.quantity);
      });
    }

    const updated = serviceOrders.map(o => {
      if (o.id === order.id) {
        return {
          ...o,
          status: 'Faturada' as ServiceOrderStatus,
          dateFinished: new Date().toISOString().replace('T', ' ').substring(0, 16),
        };
      }
      return o;
    });

    onUpdateServiceOrders(updated);
    onShowNotification(
      'OS Faturada com Sucesso!',
      `Ordem ${order.id} faturada. Estoque das ${order.parts.length} peças baixado automaticamente.`,
      'success'
    );
  };

  // Compartilhar no WhatsApp
  const handleShareWhatsApp = (order: ServiceOrder) => {
    const trade = companyProfile?.tradeName || 'Centro Automotivo & Peças';
    const text = encodeURIComponent(
      `Olá, *${order.customerName}*!\n\n` +
      `Aqui é da *${trade}*.\n` +
      `Sua Ordem de Serviço *#${order.id}* referente ao veículo *${order.vehicleBrand} ${order.vehicleModel}* (Placa: *${order.vehiclePlate}*) está com o status: *${order.status.toUpperCase()}*.\n\n` +
      `🛠 *Mão de Obra:* R$ ${order.laborTotal.toFixed(2)}\n` +
      `📦 *Peças Utilizadas:* R$ ${order.partsTotal.toFixed(2)}\n` +
      `💰 *Valor Total:* R$ ${order.totalAmount.toFixed(2)}\n` +
      `⏱ *Garantia:* ${order.warrantyDays || 90} dias em peças e serviços.\n\n` +
      `Agradecemos a preferência!`
    );

    const cleanPhone = order.customerPhone.replace(/\D/g, '');
    const url = cleanPhone ? `https://wa.me/55${cleanPhone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, '_blank');
  };

  // Helper para cor do status
  const getStatusBadge = (st: ServiceOrderStatus) => {
    switch (st) {
      case 'Orcamento':
        return <span className="bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full font-black text-[10px] uppercase">Orçamento</span>;
      case 'Aprovada':
        return <span className="bg-sky-100 text-sky-900 border border-sky-300 px-2 py-0.5 rounded-full font-black text-[10px] uppercase">Aprovada</span>;
      case 'Em Execucao':
        return <span className="bg-indigo-100 text-indigo-900 border border-indigo-300 px-2 py-0.5 rounded-full font-black text-[10px] uppercase animate-pulse">Em Execução</span>;
      case 'Aguardando Pecas':
        return <span className="bg-rose-100 text-rose-900 border border-rose-300 px-2 py-0.5 rounded-full font-black text-[10px] uppercase">Aguardando Peças</span>;
      case 'Finalizada':
        return <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-0.5 rounded-full font-black text-[10px] uppercase">Finalizada</span>;
      case 'Faturada':
        return <span className="bg-purple-100 text-purple-900 border border-purple-300 px-2 py-0.5 rounded-full font-black text-[10px] uppercase">Faturada / Paga</span>;
      case 'Cancelada':
        return <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-black text-[10px] uppercase">Cancelada</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6" id="ordem-servico-container">
      
      {/* Top Banner & Header */}
      <div className="bg-white rounded-2xl p-5 border border-sky-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#0C4A6E] text-white">
              <Wrench className="w-5 h-5 text-amber-400" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900 tracking-tight">
                  Ordens de Serviço (OS) & Oficina
                </h1>
                <span className="bg-amber-100 text-amber-900 text-[10px] font-black px-2 py-0.5 rounded-full border border-amber-300">
                  Centro Automotivo • Mão de Obra & Peças
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Gerenciamento de diagnósticos, mão de obra mecânica, aplicação de peças em veículos e emissão de comprovantes técnicos.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            id="btn-nova-ordem-servico"
            onClick={handleOpenNewOrder}
            className="px-4 py-2.5 bg-[#0C4A6E] hover:bg-[#073047] text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>Abrir Nova Ordem de Serviço</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-extrabold text-slate-500 uppercase block">Total de OS</span>
          <span className="text-xl font-black text-slate-900 block mt-0.5">{stats.total}</span>
          <span className="text-[10px] text-slate-400 font-semibold">Todas as unidades</span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-indigo-200 bg-indigo-50/20 shadow-2xs">
          <span className="text-[10px] font-extrabold text-indigo-700 uppercase block">Em Execução</span>
          <span className="text-xl font-black text-indigo-900 block mt-0.5">{stats.emExecucao}</span>
          <span className="text-[10px] text-indigo-600 font-semibold">Na oficina agora</span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-rose-200 bg-rose-50/20 shadow-2xs">
          <span className="text-[10px] font-extrabold text-rose-700 uppercase block">Aguardando Peça</span>
          <span className="text-xl font-black text-rose-900 block mt-0.5">{stats.aguardandoPecas}</span>
          <span className="text-[10px] text-rose-600 font-semibold">Gargalo de estoque</span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-2xs">
          <span className="text-[10px] font-extrabold text-amber-700 uppercase block">Orçamentos</span>
          <span className="text-xl font-black text-amber-900 block mt-0.5">{stats.orcamentos}</span>
          <span className="text-[10px] text-amber-600 font-semibold">Em aprovação</span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-2xs">
          <span className="text-[10px] font-extrabold text-emerald-700 uppercase block">Finalizadas</span>
          <span className="text-xl font-black text-emerald-900 block mt-0.5">{stats.finalizadas}</span>
          <span className="text-[10px] text-emerald-600 font-semibold">Prontas / Entregues</span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-sky-200 bg-sky-50/20 shadow-2xs">
          <span className="text-[10px] font-extrabold text-sky-800 uppercase block">Faturamento em OS</span>
          <span className="text-lg font-black text-sky-950 block mt-0.5 truncate">
            R$ {stats.faturamentoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] text-sky-600 font-semibold">Peças + Mão de obra</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
        {/* Status Tabs */}
        <div className="flex flex-wrap items-center gap-1">
          {[
            { id: 'todos', label: 'Todas' },
            { id: 'Em Execucao', label: 'Em Execução' },
            { id: 'Orcamento', label: 'Orçamentos' },
            { id: 'Aguardando Pecas', label: 'Aguard. Peças' },
            { id: 'Finalizada', label: 'Finalizadas' },
            { id: 'Faturada', label: 'Faturadas' },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-[#0C4A6E] text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input & Mechanic Selector */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              id="search-service-order"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por placa, cliente, modelo..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#0C4A6E] outline-none"
            />
          </div>

          <select
            value={mechanicFilter}
            onChange={(e) => setMechanicFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
          >
            <option value="todos">Todos os Mecânicos</option>
            {AVAILABLE_MECHANICS.map(m => (
              <option key={m.id} value={m.name}>{m.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid of Service Orders */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="lista-ordens-servico">
        {filteredOrders.length === 0 ? (
          <div className="col-span-full bg-white p-12 rounded-3xl border border-dashed border-slate-300 text-center text-slate-500 space-y-3">
            <Car className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-700">Nenhuma Ordem de Serviço Encontrada</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Nenhuma OS corresponde aos filtros selecionados. Clique em "Abrir Nova Ordem de Serviço" para cadastrar um novo atendimento.
            </p>
            <button
              type="button"
              onClick={handleOpenNewOrder}
              className="px-4 py-2 bg-[#0C4A6E] text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Criar Nova OS</span>
            </button>
          </div>
        ) : (
          filteredOrders.map(order => (
            <div
              key={order.id}
              className="bg-white rounded-2xl border border-slate-200 hover:border-sky-300 shadow-2xs hover:shadow-md transition flex flex-col justify-between overflow-hidden"
            >
              {/* Header do Card */}
              <div className="p-4 border-b border-slate-100 bg-slate-50/60">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-[#0C4A6E] font-mono tracking-wider">
                    {order.id}
                  </span>
                  {getStatusBadge(order.status)}
                </div>

                {/* Veículo & Placa em destaque */}
                <div className="mt-2.5 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 truncate">
                      {order.vehicleBrand} {order.vehicleModel}
                    </h3>
                    <span className="text-[11px] text-slate-500 block">
                      Ano {order.vehicleYear} • {order.vehicleMotor || 'Flex'} • {order.vehicleKm.toLocaleString('pt-BR')} km
                    </span>
                  </div>
                  
                  {/* Badge de Placa Mercosul */}
                  <div className="bg-white border-2 border-slate-800 rounded-md px-2 py-0.5 text-center shadow-2xs shrink-0">
                    <span className="text-[8px] font-black text-sky-800 tracking-widest block border-b border-slate-200">BRASIL</span>
                    <span className="text-xs font-black text-slate-900 font-mono tracking-wider">{order.vehiclePlate}</span>
                  </div>
                </div>
              </div>

              {/* Corpo do Card */}
              <div className="p-4 space-y-3 flex-1 text-xs">
                {/* Cliente */}
                <div className="flex items-start gap-2">
                  <User className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <strong className="text-slate-800 font-bold block truncate">{order.customerName}</strong>
                    <span className="text-[10px] text-slate-500 block truncate">{order.customerPhone}</span>
                  </div>
                </div>

                {/* Mecânico Responsável */}
                <div className="flex items-center gap-2 text-[11px] text-slate-600 bg-slate-50 p-2 rounded-xl">
                  <Wrench className="w-3.5 h-3.5 text-[#0284C7] shrink-0" />
                  <span className="truncate"><strong>Mecânico:</strong> {order.mechanicAssigned}</span>
                </div>

                {/* Defeito Reclamado */}
                <div className="text-[11px] text-slate-600 bg-amber-50/50 border border-amber-200/60 p-2.5 rounded-xl">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 block mb-0.5">
                    Defeito / Sintoma:
                  </span>
                  <p className="line-clamp-2 italic text-slate-700">{order.problemReported}</p>
                </div>

                {/* Resumo de Peças & Serviços */}
                <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                  <div className="p-2 bg-slate-50 rounded-xl">
                    <span className="text-[10px] text-slate-400 block font-bold">Peças ({order.parts.length})</span>
                    <strong className="text-slate-800">R$ {order.partsTotal.toFixed(2)}</strong>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-xl">
                    <span className="text-[10px] text-slate-400 block font-bold">Mão de Obra ({order.labor.length})</span>
                    <strong className="text-slate-800">R$ {order.laborTotal.toFixed(2)}</strong>
                  </div>
                </div>
              </div>

              {/* Rodapé com Valor Total & Ações Rápidas */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Valor Total:</span>
                  <span className="text-base font-black text-emerald-700">
                    R$ {order.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleShareWhatsApp(order)}
                    className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition cursor-pointer"
                    title="Enviar Orçamento via WhatsApp"
                  >
                    <Send className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setPrintingOrder(order)}
                    className="p-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 transition cursor-pointer"
                    title="Imprimir Comprovante da OS"
                  >
                    <Printer className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenEditOrder(order)}
                    className="p-2 rounded-xl bg-[#0C4A6E] hover:bg-[#073047] text-white transition cursor-pointer"
                    title="Editar Ordem de Serviço"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Botões de Ação de Fluxo Rápido */}
              <div className="px-4 pb-3 flex items-center gap-2">
                {order.status === 'Orcamento' && (
                  <button
                    type="button"
                    onClick={() => handleQuickStatusChange(order.id, 'Aprovada')}
                    className="flex-1 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-[10px] font-black uppercase transition cursor-pointer text-center"
                  >
                    Aprovar Orçamento
                  </button>
                )}

                {order.status === 'Aprovada' && (
                  <button
                    type="button"
                    onClick={() => handleQuickStatusChange(order.id, 'Em Execucao')}
                    className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black uppercase transition cursor-pointer text-center"
                  >
                    Iniciar Execução
                  </button>
                )}

                {order.status === 'Em Execucao' && (
                  <button
                    type="button"
                    onClick={() => handleQuickStatusChange(order.id, 'Finalizada')}
                    className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black uppercase transition cursor-pointer text-center"
                  >
                    Finalizar Serviço
                  </button>
                )}

                {order.status === 'Finalizada' && (
                  <button
                    type="button"
                    onClick={() => handleInvoiceOrder(order)}
                    className="flex-1 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[10px] font-black uppercase transition cursor-pointer text-center flex items-center justify-center gap-1"
                  >
                    <DollarSign className="w-3 h-3" />
                    <span>Faturar OS & Baixar Peças</span>
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ======================================================== */}
      {/* MODAL: CADASTRO / EDIÇÃO COMPLETA DE ORDEM DE SERVIÇO */}
      {/* ======================================================== */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto" id="modal-form-ordem-servico">
          <div className="bg-white rounded-3xl max-w-4xl w-full text-slate-800 shadow-2xl border border-slate-100 overflow-hidden my-auto max-h-[92vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="bg-[#0C4A6E] text-white p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-xl">
                  <Wrench className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black tracking-tight">
                    {editingOrder ? `Editar ${editingOrder.id}` : 'Abertura de Nova Ordem de Serviço'}
                  </h2>
                  <p className="text-xs text-sky-200">
                    Preencha os dados do cliente, veículo, peças necessárias e mão de obra mecânica.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition cursor-pointer"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <form onSubmit={handleSaveOrder} className="p-5 overflow-y-auto space-y-6 flex-1 text-xs">
              
              {/* 1. SEÇÃO DO CLIENTE & STATUS */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-[#0C4A6E]" />
                    <h3 className="font-extrabold text-sm text-slate-900">1. Dados do Cliente & Status da OS</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="font-bold text-slate-600">Status:</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as ServiceOrderStatus)}
                      className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg font-black text-xs text-[#0C4A6E]"
                    >
                      <option value="Orcamento">Orçamento Inicial</option>
                      <option value="Aprovada">Aprovada pelo Cliente</option>
                      <option value="Em Execucao">Em Execução na Oficina</option>
                      <option value="Aguardando Pecas">Aguardando Peças</option>
                      <option value="Finalizada">Finalizada (Pronto)</option>
                      <option value="Faturada">Faturada / Paga</option>
                      <option value="Cancelada">Cancelada</option>
                    </select>
                  </div>
                </div>

                {/* Seleção rápida de cliente existente */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Selecionar Cliente Cadastrado (Opcional):</label>
                  <select
                    value={customerId}
                    onChange={(e) => handleSelectExistingCustomer(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl"
                  >
                    <option value="">-- Digitar dados manualmente ou selecionar abaixo --</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.document} • {c.phone})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="sm:col-span-2">
                    <label className="font-bold text-slate-700 block mb-1">Nome do Cliente / Empresa *</label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Ex: João Carlos da Silva"
                      required
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">CPF / CNPJ</label>
                    <input
                      type="text"
                      value={customerDocument}
                      onChange={(e) => setCustomerDocument(e.target.value)}
                      placeholder="000.000.000-00"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">WhatsApp / Telefone *</label>
                    <input
                      type="text"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="(67) 90000-0000"
                      required
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>
              </div>

              {/* 2. SEÇÃO DO VEÍCULO & MECÂNICO */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                  <Car className="w-4 h-4 text-[#0C4A6E]" />
                  <h3 className="font-extrabold text-sm text-slate-900">2. Identificação do Veículo & Mecânico Chefe</h3>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Placa *</label>
                    <input
                      type="text"
                      value={vehiclePlate}
                      onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())}
                      placeholder="ABC-1D23"
                      required
                      className="w-full px-3 py-2 bg-white border-2 border-slate-700 rounded-xl font-mono font-black text-center text-xs"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Montadora *</label>
                    <select
                      value={vehicleBrand}
                      onChange={(e) => setVehicleBrand(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold"
                    >
                      <option value="Volkswagen">Volkswagen</option>
                      <option value="Chevrolet">Chevrolet</option>
                      <option value="Fiat">Fiat</option>
                      <option value="Ford">Ford</option>
                      <option value="Toyota">Toyota</option>
                      <option value="Honda">Honda</option>
                      <option value="Hyundai">Hyundai</option>
                      <option value="Renault">Renault</option>
                      <option value="Jeep">Jeep</option>
                      <option value="Nissan">Nissan</option>
                      <option value="Motos Honda">Motos Honda</option>
                      <option value="Motos Yamaha">Motos Yamaha</option>
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="font-bold text-slate-700 block mb-1">Modelo do Veículo *</label>
                    <input
                      type="text"
                      value={vehicleModel}
                      onChange={(e) => setVehicleModel(e.target.value)}
                      placeholder="Ex: Onix Hatch LTZ, Saveiro Cross..."
                      required
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Ano Fab/Mod</label>
                    <input
                      type="number"
                      value={vehicleYear}
                      onChange={(e) => setVehicleYear(parseInt(e.target.value, 10) || 2024)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">KM Atual</label>
                    <input
                      type="number"
                      value={vehicleKm}
                      onChange={(e) => setVehicleKm(parseInt(e.target.value, 10) || 0)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Motor / Versão</label>
                    <input
                      type="text"
                      value={vehicleMotor}
                      onChange={(e) => setVehicleMotor(e.target.value)}
                      placeholder="Ex: 1.0 Turbo, 1.6 8V Flex, 2.8 Diesel"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Cor do Veículo</label>
                    <input
                      type="text"
                      value={vehicleColor}
                      onChange={(e) => setVehicleColor(e.target.value)}
                      placeholder="Ex: Prata, Branco, Preto"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Mecânico Atribuído *</label>
                    <select
                      value={mechanicAssigned}
                      onChange={(e) => setMechanicAssigned(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-[#0C4A6E]"
                    >
                      {AVAILABLE_MECHANICS.map(m => (
                        <option key={m.id} value={m.name}>{m.name} ({m.specialty})</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Sintoma Reclamado e Parecer */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="font-bold text-amber-800 block mb-1">
                      Defeito Reclamado pelo Cliente (Sintoma relatado na entrada) *
                    </label>
                    <textarea
                      rows={2}
                      value={problemReported}
                      onChange={(e) => setProblemReported(e.target.value)}
                      placeholder="Ex: Barulho na suspensão dianteira ao frear, luz de injeção acesa, revisão dos 40.000 km..."
                      required
                      className="w-full p-2.5 bg-white border border-amber-300 rounded-xl text-xs"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-[#0C4A6E] block mb-1">
                      Diagnóstico Técnico / Laudo da Oficina
                    </label>
                    <textarea
                      rows={2}
                      value={technicalDiagnosis}
                      onChange={(e) => setTechnicalDiagnosis(e.target.value)}
                      placeholder="Ex: Pastilhas no ferro e folga na bieleta da barra estabilizadora esquerda..."
                      className="w-full p-2.5 bg-white border border-sky-300 rounded-xl text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* 3. PEÇAS DO ESTOQUE DA AUTOPEÇAS */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-[#0C4A6E]" />
                    <h3 className="font-extrabold text-sm text-slate-900">
                      3. Peças Utilizadas (Estoque GATO SaaS)
                    </h3>
                  </div>
                  <span className="font-black text-xs text-slate-700">
                    Subtotal Peças: R$ {partsTotal.toFixed(2)}
                  </span>
                </div>

                {/* Seletor de Peça para Inserir */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                  <div className="sm:col-span-8">
                    <label className="font-bold text-slate-700 block mb-1">Selecionar Peça do Estoque:</label>
                    <select
                      value={selectedProductId}
                      onChange={(e) => setSelectedProductId(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                    >
                      <option value="">-- Buscar peça no catálogo do GATO --</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.code} • {p.name} ({p.brand}) - R$ {p.sellingPrice.toFixed(2)} [Estoque: {p.stock} un]
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="font-bold text-slate-700 block mb-1">Qtd:</label>
                    <input
                      type="number"
                      min={1}
                      value={partQty}
                      onChange={(e) => setPartQty(parseInt(e.target.value, 10) || 1)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-center"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      onClick={handleAddPart}
                      disabled={!selectedProductId}
                      className="w-full py-2 bg-sky-700 hover:bg-sky-800 disabled:bg-slate-300 text-white font-bold rounded-xl transition cursor-pointer"
                    >
                      + Incluir Peça
                    </button>
                  </div>
                </div>

                {/* Tabela de Peças Inseridas */}
                {parts.length > 0 ? (
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-2.5">Código / Peça</th>
                          <th className="p-2.5">Marca</th>
                          <th className="p-2.5 text-center">Qtd</th>
                          <th className="p-2.5 text-right">Unitário</th>
                          <th className="p-2.5 text-right">Total</th>
                          <th className="p-2.5 text-center w-10">Remover</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parts.map((p, idx) => (
                          <tr key={`${p.productId}-${idx}`} className="hover:bg-slate-50">
                            <td className="p-2.5">
                              <span className="font-mono font-bold text-slate-700 block">{p.productCode}</span>
                              <span className="text-slate-900 font-semibold">{p.productName}</span>
                            </td>
                            <td className="p-2.5 text-slate-600">{p.brand}</td>
                            <td className="p-2.5 text-center font-bold">{p.quantity}</td>
                            <td className="p-2.5 text-right font-mono">R$ {p.unitPrice.toFixed(2)}</td>
                            <td className="p-2.5 text-right font-bold text-slate-900 font-mono">R$ {p.total.toFixed(2)}</td>
                            <td className="p-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemovePart(idx)}
                                className="p-1 text-rose-500 hover:text-rose-700"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-slate-400 italic text-center py-2">Nenhuma peça adicionada ainda a esta OS.</p>
                )}
              </div>

              {/* 4. MÃO DE OBRA & SERVIÇOS MECÂNICOS */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-[#0C4A6E]" />
                    <h3 className="font-extrabold text-sm text-slate-900">
                      4. Mão de Obra Mecânica & Serviços Prestados
                    </h3>
                  </div>
                  <span className="font-black text-xs text-slate-700">
                    Subtotal Serviços: R$ {laborTotal.toFixed(2)}
                  </span>
                </div>

                {/* Seletor rápido de Serviços Padrão */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                  <div className="sm:col-span-6">
                    <label className="font-bold text-slate-700 block mb-1">Catálogo Padrão de Serviços:</label>
                    <select
                      value={selectedStandardService}
                      onChange={(e) => {
                        setSelectedStandardService(e.target.value);
                        const std = COMMON_AUTOMOTIVE_SERVICES.find(s => s.id === e.target.value);
                        if (std) {
                          setCustomLaborDesc(std.name);
                          setCustomLaborPrice(std.defaultPrice);
                          setCustomLaborHours(std.estimatedHours);
                        }
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl"
                    >
                      <option value="">-- Escolha um serviço pré-cadastrado ou digite ao lado --</option>
                      {COMMON_AUTOMOTIVE_SERVICES.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.category} • R$ {s.defaultPrice.toFixed(2)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-3">
                    <label className="font-bold text-slate-700 block mb-1">Descrição:</label>
                    <input
                      type="text"
                      value={customLaborDesc}
                      onChange={(e) => setCustomLaborDesc(e.target.value)}
                      placeholder="Descrição do serviço"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="font-bold text-slate-700 block mb-1">Valor (R$):</label>
                    <input
                      type="number"
                      step="0.01"
                      value={customLaborPrice}
                      onChange={(e) => setCustomLaborPrice(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl"
                    />
                  </div>

                  <div className="sm:col-span-1">
                    <button
                      type="button"
                      onClick={handleAddLabor}
                      className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl transition cursor-pointer"
                    >
                      + Add
                    </button>
                  </div>
                </div>

                {/* Tabela de Serviços Inseridos */}
                {labor.length > 0 ? (
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-2.5">Descrição do Serviço / Mão de Obra</th>
                          <th className="p-2.5">Mecânico</th>
                          <th className="p-2.5 text-center">Horas Estimadas</th>
                          <th className="p-2.5 text-right">Valor</th>
                          <th className="p-2.5 text-center w-10">Remover</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {labor.map((l) => (
                          <tr key={l.id} className="hover:bg-slate-50">
                            <td className="p-2.5 font-semibold text-slate-900">{l.description}</td>
                            <td className="p-2.5 text-slate-600">{l.mechanicName || mechanicAssigned}</td>
                            <td className="p-2.5 text-center font-mono">{l.hours || 1}h</td>
                            <td className="p-2.5 text-right font-bold text-slate-900 font-mono">R$ {l.price.toFixed(2)}</td>
                            <td className="p-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveLabor(l.id)}
                                className="p-1 text-rose-500 hover:text-rose-700"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-slate-400 italic text-center py-2">Nenhum serviço de mão de obra inserido ainda.</p>
                )}
              </div>

              {/* 5. CHECKLIST DE ENTRADA & FECHAMENTO */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                  <Gauge className="w-4 h-4 text-[#0C4A6E]" />
                  <h3 className="font-extrabold text-sm text-slate-900">5. Checklist de Entrada & Termo de Garantia</h3>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Combustível no Tanque:</label>
                    <select
                      value={fuelLevel}
                      onChange={(e) => setFuelLevel(e.target.value as any)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold"
                    >
                      <option value="Reserva">Reserva</option>
                      <option value="1/4">1/4 Tanque</option>
                      <option value="1/2">1/2 Tanque</option>
                      <option value="3/4">3/4 Tanque</option>
                      <option value="Cheio">Tanque Cheio</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-3 pt-4">
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                      <input
                        type="checkbox"
                        checked={spareTire}
                        onChange={(e) => setSpareTire(e.target.checked)}
                        className="w-4 h-4 text-[#0C4A6E] rounded"
                      />
                      <span>Estepe Presente</span>
                    </label>
                  </div>

                  <div className="flex items-center gap-3 pt-4">
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                      <input
                        type="checkbox"
                        checked={jack}
                        onChange={(e) => setJack(e.target.checked)}
                        className="w-4 h-4 text-[#0C4A6E] rounded"
                      />
                      <span>Macaco Presente</span>
                    </label>
                  </div>

                  <div className="flex items-center gap-3 pt-4">
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                      <input
                        type="checkbox"
                        checked={wheelWrench}
                        onChange={(e) => setWheelWrench(e.target.checked)}
                        className="w-4 h-4 text-[#0C4A6E] rounded"
                      />
                      <span>Chave de Roda</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Avarias Prévias / Arranhões Observados:</label>
                  <input
                    type="text"
                    value={scratchesNotes}
                    onChange={(e) => setScratchesNotes(e.target.value)}
                    placeholder="Ex: Risco no para-lama traseiro direito, retrovisor esquerdo com marca..."
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              {/* 6. TOTALIZAÇÃO FINANCEIRA */}
              <div className="bg-gradient-to-br from-slate-900 to-sky-950 text-white p-5 rounded-2xl shadow-md space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] text-sky-400 font-bold uppercase tracking-wider block">
                      Condição de Pagamento Prevista
                    </span>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="mt-1 px-3 py-1.5 bg-white/10 border border-white/20 rounded-xl text-xs font-bold text-white outline-none"
                    >
                      <option value="À Vista / PIX" className="text-slate-900">À Vista / PIX (Chave Instantânea)</option>
                      <option value="Cartão de Crédito (1x a 12x)" className="text-slate-900">Cartão de Crédito</option>
                      <option value="Cartão de Débito" className="text-slate-900">Cartão de Débito</option>
                      <option value="Boleto Faturado (28 DDL)" className="text-slate-900">Boleto Faturado (Pessoa Jurídica)</option>
                      <option value="A Prazo / Crediário Loja" className="text-slate-900">A Prazo / Convênio Frota</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Desconto (R$):</span>
                      <input
                        type="number"
                        step="0.01"
                        value={discount}
                        onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                        className="w-24 px-2 py-1 bg-white/10 border border-white/20 rounded-lg text-right font-mono text-xs text-white"
                      />
                    </div>

                    <div className="border-l border-white/20 pl-4">
                      <span className="text-[10px] text-amber-400 font-black uppercase tracking-wider block">
                        TOTAL DA ORDEM DE SERVIÇO:
                      </span>
                      <strong className="text-2xl font-black text-white font-mono">
                        R$ {grandTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Botões do Modal */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  id="btn-salvar-ordem-servico"
                  className="px-6 py-2.5 bg-[#0C4A6E] hover:bg-[#073047] text-white font-black text-xs rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4 text-amber-400" />
                  <span>Salvar Ordem de Serviço</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: IMPRESSÃO DA ORDEM DE SERVIÇO (DAV / COMPROVANTE) */}
      {/* ======================================================== */}
      {printingOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto" id="modal-impressao-os">
          <div className="bg-white rounded-3xl max-w-3xl w-full text-slate-900 shadow-2xl p-6 sm:p-8 space-y-6 max-h-[92vh] overflow-y-auto">
            
            {/* Header da Impressão com Nome Fantasia */}
            <div className="flex items-center justify-between border-b-2 border-slate-800 pb-4">
              <div>
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                  {companyProfile?.tradeName || 'Centro Automotivo & Autopeças'}
                </h2>
                <p className="text-xs text-slate-600">
                  {companyProfile?.corporateName} • CNPJ: {companyProfile?.cnpj}
                </p>
                <p className="text-xs text-slate-600">
                  {companyProfile?.address} • {companyProfile?.city}/{companyProfile?.uf} • Tel: {companyProfile?.phone}
                </p>
              </div>

              <div className="text-right">
                <span className="text-lg font-black font-mono block text-[#0C4A6E]">
                  {printingOrder.id}
                </span>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">
                  Data: {printingOrder.dateOpened}
                </span>
                <span className="text-[10px] bg-slate-100 text-slate-800 px-2 py-0.5 rounded font-black uppercase">
                  Status: {printingOrder.status}
                </span>
              </div>
            </div>

            {/* Dados do Cliente e Veículo */}
            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <strong className="text-[10px] text-slate-500 uppercase font-black block">Cliente:</strong>
                <p className="font-bold text-slate-900">{printingOrder.customerName}</p>
                <p className="text-slate-600">CPF/CNPJ: {printingOrder.customerDocument}</p>
                <p className="text-slate-600">WhatsApp: {printingOrder.customerPhone}</p>
              </div>
              <div>
                <strong className="text-[10px] text-slate-500 uppercase font-black block">Veículo / Aplicação:</strong>
                <p className="font-bold text-slate-900">
                  {printingOrder.vehicleBrand} {printingOrder.vehicleModel} ({printingOrder.vehicleYear})
                </p>
                <p className="text-slate-600">
                  Placa: <strong className="font-mono">{printingOrder.vehiclePlate}</strong> • KM: {printingOrder.vehicleKm.toLocaleString('pt-BR')}
                </p>
                <p className="text-slate-600">Mecânico Responsável: {printingOrder.mechanicAssigned}</p>
              </div>
            </div>

            {/* Sintoma e Parecer Técnico */}
            <div className="text-xs space-y-2">
              <div>
                <strong className="text-[10px] text-slate-500 uppercase font-black block">Defeito Reclamado pelo Cliente:</strong>
                <p className="p-2 bg-slate-50 rounded-lg text-slate-800 italic">{printingOrder.problemReported}</p>
              </div>
              {printingOrder.technicalDiagnosis && (
                <div>
                  <strong className="text-[10px] text-slate-500 uppercase font-black block">Diagnóstico Técnico da Oficina:</strong>
                  <p className="p-2 bg-sky-50 rounded-lg text-slate-800">{printingOrder.technicalDiagnosis}</p>
                </div>
              )}
            </div>

            {/* Tabela de Peças */}
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                Peças Utilizadas ({printingOrder.parts.length})
              </h4>
              <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    <th className="p-2">Código</th>
                    <th className="p-2">Descrição da Peça</th>
                    <th className="p-2">Marca</th>
                    <th className="p-2 text-center">Qtd</th>
                    <th className="p-2 text-right">Unitário</th>
                    <th className="p-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {printingOrder.parts.map((p, i) => (
                    <tr key={i}>
                      <td className="p-2 font-mono">{p.productCode}</td>
                      <td className="p-2 font-semibold">{p.productName}</td>
                      <td className="p-2 text-slate-600">{p.brand}</td>
                      <td className="p-2 text-center">{p.quantity}</td>
                      <td className="p-2 text-right font-mono">R$ {p.unitPrice.toFixed(2)}</td>
                      <td className="p-2 text-right font-mono font-bold">R$ {p.total.toFixed(2)}</td>
                    </tr>
                  ))}
                  {printingOrder.parts.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-2 text-center text-slate-400 italic">Nenhuma peça cobrada nesta OS.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Tabela de Mão de Obra */}
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                Mão de Obra & Serviços Mecânicos ({printingOrder.labor.length})
              </h4>
              <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    <th className="p-2">Serviço</th>
                    <th className="p-2">Mecânico Executor</th>
                    <th className="p-2 text-center">Horas</th>
                    <th className="p-2 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {printingOrder.labor.map((l, i) => (
                    <tr key={i}>
                      <td className="p-2 font-semibold">{l.description}</td>
                      <td className="p-2 text-slate-600">{l.mechanicName || printingOrder.mechanicAssigned}</td>
                      <td className="p-2 text-center font-mono">{l.hours || 1}h</td>
                      <td className="p-2 text-right font-mono font-bold">R$ {l.price.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totalização */}
            <div className="p-4 bg-slate-100 rounded-xl flex items-center justify-between text-xs">
              <div>
                <p>Peças: <strong>R$ {printingOrder.partsTotal.toFixed(2)}</strong></p>
                <p>Mão de Obra: <strong>R$ {printingOrder.laborTotal.toFixed(2)}</strong></p>
                {printingOrder.discount > 0 && <p className="text-rose-600">Desconto: -R$ {printingOrder.discount.toFixed(2)}</p>}
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-black text-slate-500 block">TOTAL GERAL DA OS:</span>
                <span className="text-2xl font-black text-slate-900 font-mono">
                  R$ {printingOrder.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-slate-600 block">Forma: {printingOrder.paymentMethod}</span>
              </div>
            </div>

            {/* Termo de Garantia e Assinaturas */}
            <div className="pt-4 border-t border-slate-200 space-y-4 text-[10px] text-slate-500">
              <p>
                <strong>TERMO DE GARANTIA LEGAL:</strong> Conforme o Código de Defesa do Consumidor (Art. 26, II da Lei 8.078/90), as peças e serviços executados contam com 90 (noventa) dias de garantia contra defeitos de fabricação ou montagem, a contar da data de retirada do veículo. A garantia não cobre mau uso, sobrecarga ou sinistros externos.
              </p>

              <div className="grid grid-cols-2 gap-8 pt-8 text-center text-xs">
                <div className="border-t border-slate-400 pt-1">
                  <strong>{printingOrder.customerName}</strong>
                  <span className="block text-[10px] text-slate-400">Assinatura do Cliente</span>
                </div>
                <div className="border-t border-slate-400 pt-1">
                  <strong>{companyProfile?.tradeName || 'Oficina & Centro Automotivo'}</strong>
                  <span className="block text-[10px] text-slate-400">Mecânico Responsável / Gerente de Oficina</span>
                </div>
              </div>
            </div>

            {/* Botões do Modal de Impressão */}
            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPrintingOrder(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2.5 bg-[#0C4A6E] text-white text-xs font-black rounded-xl hover:bg-[#073047] flex items-center gap-2 shadow-xs"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Comprovante da OS</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
