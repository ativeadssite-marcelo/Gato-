import React from 'react';
import { 
  Users, 
  X, 
  Edit3, 
  Phone, 
  Mail, 
  MapPin, 
  CreditCard, 
  Car, 
  MessageCircle, 
  ExternalLink, 
  Printer, 
  ArrowRight, 
  Building2, 
  Calendar, 
  CheckCircle2, 
  FileText,
  Clock,
  ShieldCheck,
  Truck
} from 'lucide-react';
import { Customer, Quote } from '../types';

interface CustomerDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  quotes: Quote[];
  onEditCustomer: (customer: Customer) => void;
  onNavigateToQuote?: (customer: Customer) => void;
  onConvertQuote?: (quote: Quote) => void;
  onShowNotification: (title: string, message: string, type?: 'success' | 'warning' | 'info') => void;
}

export const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({
  isOpen,
  onClose,
  customer,
  quotes,
  onEditCustomer,
  onNavigateToQuote,
  onConvertQuote,
  onShowNotification,
}) => {
  if (!isOpen || !customer) return null;

  const customerQuotes = quotes.filter(
    q => q.customerId === customer.id || q.customerDocument === customer.document
  );

  const formatBRL = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const cleanPhone = customer.whatsapp 
    ? customer.whatsapp.replace(/\D/g, '') 
    : customer.phone ? customer.phone.replace(/\D/g, '') : '';

  const creditLimit = customer.creditLimit ?? 2000;
  const creditUsed = customer.creditUsed ?? 0;
  const creditAvailable = Math.max(0, creditLimit - creditUsed);
  const creditUsagePercent = creditLimit > 0 ? Math.min(100, Math.round((creditUsed / creditLimit) * 100)) : 0;

  const renderTypeBadge = (type: string) => {
    switch (type) {
      case 'consumidor':
        return <span className="bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full text-[11px] font-bold">Consumidor Balcão</span>;
      case 'cliente_fiel':
        return <span className="bg-sky-100 text-[#0C4A6E] px-2.5 py-0.5 rounded-full text-[11px] font-bold">Cliente Fiel / VIP</span>;
      case 'mecanica':
        return <span className="bg-orange-100 text-[#EA580C] px-2.5 py-0.5 rounded-full text-[11px] font-bold">Oficina Mecânica</span>;
      case 'frotista':
        return <span className="bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full text-[11px] font-bold">Frotista / Transportadora</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full text-[11px] font-bold">{type}</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto" id="ficha-cliente-modal">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Top Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-slate-900 to-[#0C4A6E] text-white flex items-start justify-between shrink-0">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center font-black text-xl text-orange-400 border border-white/15 shrink-0">
              {customer.name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg text-white">
                  {customer.name}
                </h3>
                {renderTypeBadge(customer.type)}
                {customer.status === 'bloqueado' && (
                  <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                    Bloqueado
                  </span>
                )}
              </div>
              {customer.fantasyName && (
                <p className="text-xs text-orange-300 font-bold mt-0.5">
                  Fantasia: {customer.fantasyName}
                </p>
              )}
              <p className="text-xs text-slate-300 mt-0.5 font-mono">
                {customer.document} {customer.ie ? `• IE: ${customer.ie}` : ''} • {customer.city}/{customer.uf}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => onEditCustomer(customer)}
              className="flex items-center gap-1 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-lg border border-white/20 transition cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 text-orange-400" />
              <span>Editar</span>
            </button>

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

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
          
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Desconto */}
            <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200">
              <span className="text-[10px] font-bold text-emerald-800 uppercase block">Desconto Balcão</span>
              <div className="text-xl font-black text-emerald-700 font-mono mt-0.5">
                {customer.discountRate}% OFF
              </div>
              <p className="text-[10px] text-emerald-800 mt-1">
                Aplicado automaticamente nas cotações
              </p>
            </div>

            {/* Condição de Pagamento */}
            <div className="bg-sky-50/70 p-3.5 rounded-xl border border-sky-200">
              <span className="text-[10px] font-bold text-sky-800 uppercase block">Condição de Pagamento</span>
              <div className="text-sm font-extrabold text-slate-800 mt-1">
                {customer.paymentTerm || 'À Vista (PIX / Cartão)'}
              </div>
              <p className="text-[10px] text-sky-700 mt-1">
                {customer.contactPerson ? `Comprador: ${customer.contactPerson}` : 'Balcão / Tele-vendas'}
              </p>
            </div>

            {/* Total Orçamentos */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Histórico Comercial</span>
              <div className="text-xl font-black text-[#0C4A6E] font-mono mt-0.5">
                {customerQuotes.length} cotações
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                {customerQuotes.filter(q => q.status === 'Convertido').length} faturados em NF-e
              </p>
            </div>
          </div>

          {/* Limite de Crédito & Saldo */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-[#0284C7]" />
                <span>Gestão de Limite de Crédito & Saldo a Prazo</span>
              </h4>
              <span className="font-mono text-xs text-slate-500">
                Limite Total: <strong className="text-slate-900">{formatBRL(creditLimit)}</strong>
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 ${
                  creditUsagePercent > 80 ? 'bg-rose-500' : creditUsagePercent > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${creditUsagePercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600">
                Saldo Utilizado: <strong className="font-mono text-rose-700">{formatBRL(creditUsed)}</strong> ({creditUsagePercent}%)
              </span>
              <span className="text-slate-600">
                Saldo Disponível: <strong className="font-mono text-emerald-700">{formatBRL(creditAvailable)}</strong>
              </span>
            </div>
          </div>

          {/* Contatos e Endereço */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Contatos */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
              <h4 className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-[#EA580C]" />
                <span>Contatos & Comunicação</span>
              </h4>

              <div className="space-y-2 text-slate-600">
                <div className="flex items-center justify-between">
                  <span>Telefone:</span>
                  <strong className="text-slate-800 font-mono">{customer.phone || 'Não informado'}</strong>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-emerald-700">
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp:</span>
                  </span>
                  {cleanPhone ? (
                    <a
                      href={`https://wa.me/55${cleanPhone}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 font-mono font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200"
                    >
                      <span>{customer.whatsapp || customer.phone}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-slate-400">Não informado</span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span>E-mail:</span>
                  <strong className="text-slate-800 truncate max-w-[180px]">{customer.email || 'Não informado'}</strong>
                </div>

                {customer.contactPerson && (
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                    <span>Responsável:</span>
                    <strong className="text-slate-800">{customer.contactPerson}</strong>
                  </div>
                )}
              </div>
            </div>

            {/* Endereço */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
              <h4 className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#0284C7]" />
                <span>Endereço de Faturamento & Entrega</span>
              </h4>

              <div className="space-y-1.5 text-slate-600">
                <p className="font-bold text-slate-800">
                  {customer.address ? `${customer.address}${customer.number ? `, ${customer.number}` : ''}` : 'Endereço não cadastrado'}
                </p>
                {customer.complement && <p className="text-slate-500">Comp: {customer.complement}</p>}
                {customer.neighborhood && <p className="text-slate-500">Bairro: {customer.neighborhood}</p>}
                <p className="font-mono text-slate-700 font-bold">
                  {customer.city} - {customer.uf} {customer.cep ? `• CEP: ${customer.cep}` : ''}
                </p>
              </div>
            </div>
          </div>

          {/* Frota e Veículos */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
                <Car className="w-4 h-4 text-[#EA580C]" />
                <span>Frota / Veículos do Cliente ({customer.vehicles?.length || 0})</span>
              </h4>
              <button
                type="button"
                onClick={() => onEditCustomer(customer)}
                className="text-[11px] font-bold text-[#0284C7] hover:underline cursor-pointer"
              >
                + Gerenciar Veículos
              </button>
            </div>

            {!customer.vehicles || customer.vehicles.length === 0 ? (
              <p className="text-slate-400 py-3 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                Nenhum veículo vinculado a este cliente. Clique em Editar para cadastrar a placa e modelo.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {customer.vehicles.map((v) => (
                  <div key={v.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-2.5">
                    <div className="border border-slate-300 rounded-md overflow-hidden shrink-0 shadow-2xs">
                      <div className="bg-blue-700 px-1 py-0.5 text-[6px] font-bold text-white tracking-widest text-center">
                        BRASIL
                      </div>
                      <div className="bg-white px-2 py-0.5 font-mono font-black text-xs text-slate-900 text-center">
                        {v.plate}
                      </div>
                    </div>
                    <div>
                      <div className="font-bold text-slate-800 text-xs truncate">{v.model}</div>
                      <div className="text-[10px] text-slate-500">
                        {v.brand || 'Multimarcas'} {v.year ? `• ${v.year}` : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Histórico Recente de Orçamentos */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <h4 className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-[#0C4A6E]" />
              <span>Orçamentos & Cotações Recentes ({customerQuotes.length})</span>
            </h4>

            {customerQuotes.length === 0 ? (
              <p className="text-slate-400 py-4 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                Nenhum orçamento emitido para este cliente ainda.
              </p>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {customerQuotes.map((q) => (
                  <div key={q.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#0C4A6E]">{q.quoteNumber}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          q.status === 'Convertido' ? 'bg-emerald-100 text-emerald-800' :
                          q.status === 'Aprovado' ? 'bg-sky-100 text-sky-800' :
                          q.status === 'Recusado' ? 'bg-rose-100 text-rose-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {q.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {q.items.length} item(ns) • {new Date(q.createdAt).toLocaleDateString('pt-BR')}
                      </p>
                    </div>

                    <div className="text-right flex items-center gap-3">
                      <div>
                        <div className="font-mono font-black text-slate-900 text-sm">
                          {formatBRL(q.totalAmount)}
                        </div>
                        <div className="text-[10px] text-emerald-600 font-mono">
                          Desc: {formatBRL(q.discountAmount)}
                        </div>
                      </div>

                      {q.status !== 'Convertido' && onConvertQuote && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onConvertQuote(q);
                          }}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] shadow-xs cursor-pointer"
                        >
                          Faturar NF-e
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 text-slate-600 hover:text-slate-900 font-bold text-xs rounded-xl hover:bg-slate-200/60 transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Ficha Cadastral</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-white transition cursor-pointer"
            >
              Fechar
            </button>

            {onNavigateToQuote && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateToQuote(customer);
                }}
                className="flex items-center gap-1.5 px-5 py-2 bg-[#0C4A6E] hover:bg-[#0C4A6E]/90 text-white font-bold rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
              >
                <span>Nova Cotação</span>
                <ArrowRight className="w-4 h-4 text-orange-400" />
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
