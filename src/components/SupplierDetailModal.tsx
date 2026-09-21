import React from 'react';
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
  MessageSquare, 
  Edit3, 
  FileDown, 
  ExternalLink,
  PackageCheck,
  Boxes,
  Calendar,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { Supplier, Product } from '../types';

interface SupplierDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: Supplier | null;
  products?: Product[];
  onEdit: (supplier: Supplier) => void;
  onNavigateToXmlImport?: () => void;
}

export const SupplierDetailModal: React.FC<SupplierDetailModalProps> = ({
  isOpen,
  onClose,
  supplier,
  products = [],
  onEdit,
  onNavigateToXmlImport,
}) => {
  if (!isOpen || !supplier) return null;

  // Format currency
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  // Find products associated with this supplier
  const supplierProducts = products.filter(p => {
    const sName = supplier.name.toLowerCase();
    const sFantasia = (supplier.fantasyName || '').toLowerCase();
    const pSupp = (p.supplier || '').toLowerCase();
    return (
      (pSupp && (sName.includes(pSupp) || pSupp.includes(sName) || (sFantasia && (sFantasia.includes(pSupp) || pSupp.includes(sFantasia))))) ||
      (supplier.brandsSupplied && supplier.brandsSupplied.some(b => (p.brand || '').toLowerCase().includes(b.toLowerCase())))
    );
  });

  // Clean WhatsApp number
  const cleanWhatsapp = (supplier.whatsapp || supplier.phone || '').replace(/\D/g, '');
  const whatsappUrl = cleanWhatsapp ? `https://wa.me/55${cleanWhatsapp}?text=${encodeURIComponent(`Olá ${supplier.contact || ''}, sou da Pantanal Auto Peças. Gostaria de cotar produtos e consultar pedidos.`)}` : undefined;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Modal Top Bar */}
        <div className="p-6 border-b border-slate-800/80 bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-500/10 border border-orange-500/30 flex items-center justify-center text-[#EA580C] shrink-0 shadow-inner">
              <Building2 className="w-7 h-7" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h2 className="text-xl font-bold text-white tracking-tight">
                  {supplier.name}
                </h2>

                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {categoryLabels[supplier.category || 'distribuidora'] || supplier.category}
                </span>

                {supplier.status === 'ativo' ? (
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Ativo
                  </span>
                ) : supplier.status === 'bloqueado' ? (
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    Bloqueado
                  </span>
                ) : (
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-700 text-slate-400">
                    Inativo
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                {supplier.fantasyName && supplier.fantasyName !== supplier.name && (
                  <span>Fantasia: <strong className="text-slate-200">{supplier.fantasyName}</strong></span>
                )}
                <span>CNPJ: <strong className="text-slate-200 font-mono">{supplier.cnpj || 'Não informado'}</strong></span>
                {supplier.ie && (
                  <span>IE: <strong className="text-slate-200 font-mono">{supplier.ie}</strong></span>
                )}
                <span>{supplier.city}/{supplier.state}</span>
              </div>

              {/* Rating stars */}
              <div className="flex items-center gap-1 mt-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${
                      (supplier.rating || 5) >= star
                        ? 'text-amber-400 fill-amber-400'
                        : 'text-slate-700'
                    }`}
                  />
                ))}
                <span className="text-xs text-slate-400 ml-1.5">
                  Pontualidade & Homologação ({supplier.rating || 5}/5)
                </span>
              </div>
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

        {/* Action Bar */}
        <div className="px-6 py-3 bg-slate-950/70 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                Conversar no WhatsApp
              </a>
            )}

            {supplier.phone && (
              <a
                href={`tel:${supplier.phone.replace(/\D/g, '')}`}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-2 transition"
              >
                <Phone className="w-4 h-4 text-orange-400" />
                Ligar ({supplier.phone})
              </a>
            )}

            {supplier.email && (
              <a
                href={`mailto:${supplier.email}`}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-2 transition"
              >
                <Mail className="w-4 h-4 text-orange-400" />
                Enviar E-mail
              </a>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onNavigateToXmlImport && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateToXmlImport();
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
              >
                <FileDown className="w-4 h-4 text-blue-400" />
                Importar XML / NF-e
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(supplier);
              }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-md shadow-orange-600/20"
            >
              <Edit3 className="w-4 h-4" />
              Editar Cadastro
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {/* Grid 1: Informações Comerciais e Contato */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Contato & Representante */}
            <div className="p-4 bg-slate-800/50 border border-slate-700/60 rounded-2xl">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Phone className="w-4 h-4 text-orange-400" />
                Representante / Atendimento
              </h3>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-400 block">Vendedor:</span>
                  <span className="font-semibold text-white">{supplier.contact || 'Não especificado'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Telefone Comercial:</span>
                  <span className="font-mono text-slate-200">{supplier.phone || 'Não informado'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">WhatsApp:</span>
                  <span className="font-mono text-emerald-400">{supplier.whatsapp || supplier.phone || 'Não informado'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">E-mail:</span>
                  <span className="text-slate-200 break-all">{supplier.email || 'Não informado'}</span>
                </div>
              </div>
            </div>

            {/* Condições Comerciais */}
            <div className="p-4 bg-slate-800/50 border border-slate-700/60 rounded-2xl">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-orange-400" />
                Condições Negociadas
              </h3>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-400 block">Condição de Pagamento:</span>
                  <span className="font-semibold text-white">{supplier.paymentTerms || '30 dias'}</span>
                </div>
                <div className="flex justify-between">
                  <div>
                    <span className="text-slate-400 block">Lead Time:</span>
                    <span className="font-semibold text-slate-200">{supplier.leadTimeDays || 2} dias úteis</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Tipo de Frete:</span>
                    <span className="font-semibold text-slate-200">{supplier.freightType || 'CIF'}</span>
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 block">Pedido Mínimo:</span>
                  <span className="font-semibold text-white">{formatCurrency(supplier.minOrderValue || 0)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Volume Total Comprado:</span>
                  <span className="font-bold text-orange-400">{formatCurrency(supplier.totalPurchases || 0)}</span>
                </div>
              </div>
            </div>

            {/* Endereço & Localização */}
            <div className="p-4 bg-slate-800/50 border border-slate-700/60 rounded-2xl">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-orange-400" />
                Localização / Logística
              </h3>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-400 block">Endereço:</span>
                  <span className="text-slate-200">
                    {supplier.address ? `${supplier.address}, ${supplier.number || 's/n'}` : 'Não informado'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Bairro:</span>
                  <span className="text-slate-200">{supplier.neighborhood || 'Não informado'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Cidade / UF:</span>
                  <span className="font-semibold text-white">{supplier.city || 'São Paulo'} - {supplier.state || 'SP'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">CEP:</span>
                  <span className="font-mono text-slate-200">{supplier.cep || 'Não informado'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Marcas Fornecidas */}
          <div className="p-4 bg-slate-800/50 border border-slate-700/60 rounded-2xl">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Tag className="w-4 h-4 text-orange-400" />
              Marcas & Linhas Homologadas
            </h3>
            {supplier.brandsSupplied && supplier.brandsSupplied.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {supplier.brandsSupplied.map((brand) => (
                  <span
                    key={brand}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-900 border border-slate-700 text-slate-200 rounded-xl text-xs font-medium"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                    {brand}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">Nenhuma marca cadastrada para este fornecedor.</p>
            )}
          </div>

          {/* Produtos do Fornecedor em Estoque */}
          <div className="p-4 bg-slate-800/50 border border-slate-700/60 rounded-2xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Boxes className="w-4 h-4 text-orange-400" />
                Itens Vinculados no Estoque Atual ({supplierProducts.length})
              </h3>
              <span className="text-xs text-slate-400">
                Total de peças do catálogo associadas
              </span>
            </div>

            {supplierProducts.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-slate-700/80">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="p-3">Código</th>
                      <th className="p-3">Descrição da Peça</th>
                      <th className="p-3">Marca</th>
                      <th className="p-3 text-right">Estoque</th>
                      <th className="p-3 text-right">Preço de Custo</th>
                      <th className="p-3 text-right">Preço Balcão</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {supplierProducts.slice(0, 8).map((prod) => (
                      <tr key={prod.id} className="hover:bg-slate-800/40">
                        <td className="p-3 font-mono font-bold text-white">{prod.code}</td>
                        <td className="p-3 font-medium text-slate-200">{prod.name}</td>
                        <td className="p-3">{prod.brand}</td>
                        <td className="p-3 text-right font-mono font-bold">
                          <span className={prod.stock <= prod.minStock ? 'text-amber-400' : 'text-emerald-400'}>
                            {prod.stock} un
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono text-slate-400">{formatCurrency(prod.unitCost)}</td>
                        <td className="p-3 text-right font-mono font-bold text-orange-400">{formatCurrency(prod.sellingPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-6 text-slate-400 text-xs border border-dashed border-slate-700 rounded-xl bg-slate-900/30">
                <Boxes className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                Nenhum produto cadastrado no catálogo atualmente vinculado a este fornecedor.
              </div>
            )}
          </div>

          {/* Anotações e Observações */}
          {supplier.notes && (
            <div className="p-4 bg-slate-800/30 border border-slate-700/40 rounded-2xl">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-orange-400" />
                Anotações e Histórico Comercial
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                {supplier.notes}
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <div>
            Cadastrado em: <strong className="text-slate-300">{supplier.createdAt || '2024-01-15'}</strong>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
