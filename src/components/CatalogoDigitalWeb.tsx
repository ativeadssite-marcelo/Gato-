import React, { useState, useMemo } from 'react';
import {
  Search,
  ShoppingCart,
  Send,
  Car,
  Filter,
  Package,
  CheckCircle2,
  Phone,
  Tag,
  Share2,
  ExternalLink,
  Store,
  ChevronRight,
  Plus,
  Minus,
  Trash2,
  Sparkles,
  MapPin,
  ShieldCheck
} from 'lucide-react';
import { Product, CompanyProfile, BranchUnit } from '../types';

interface CatalogoDigitalWebProps {
  products: Product[];
  companyProfile: CompanyProfile | null;
  activeBranch?: BranchUnit;
  onShowNotification: (title: string, message: string, type?: 'success' | 'warning' | 'info') => void;
}

interface CartItem {
  product: Product;
  quantity: number;
}

export const CatalogoDigitalWeb: React.FC<CatalogoDigitalWebProps> = ({
  products,
  companyProfile,
  activeBranch,
  onShowNotification,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('todas');
  const [selectedCategory, setSelectedCategory] = useState('todas');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Filtros veiculares disponíveis
  const vehicleBrands = useMemo(() => {
    const brandsSet = new Set<string>();
    products.forEach((p) => {
      p.applications.forEach((app) => {
        if (app.brand) brandsSet.add(app.brand);
      });
    });
    return Array.from(brandsSet).sort();
  }, [products]);

  // Produtos filtrados
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchBrand =
        selectedBrand === 'todas' ||
        p.applications.some((app) => app.brand.toLowerCase() === selectedBrand.toLowerCase());
      const matchCat = selectedCategory === 'todas' || p.category === selectedCategory;

      const q = searchTerm.toLowerCase();
      const matchSearch =
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        p.oemCode.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.applications.some((app) =>
          app.vehicle.toLowerCase().includes(q) ||
          app.engine.toLowerCase().includes(q)
        );

      return matchBrand && matchCat && matchSearch;
    });
  }, [products, selectedBrand, selectedCategory, searchTerm]);

  // Adicionar ao carrinho
  const handleAddToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    onShowNotification('Item Adicionado', `${product.name} foi adicionado ao seu pedido.`, 'success');
  };

  // Alterar quantidade
  const handleUpdateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  // Totais do carrinho
  const cartTotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.product.sellingPrice * item.quantity, 0);
  }, [cart]);

  const cartItemsCount = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.quantity, 0);
  }, [cart]);

  // Enviar Pedido para o WhatsApp da Loja
  const handleSendOrderToWhatsApp = () => {
    if (cart.length === 0) return;

    const trade = companyProfile?.tradeName || 'Autopeças';
    const storePhone = companyProfile?.phone || '';

    let itemsText = '';
    cart.forEach((item, index) => {
      itemsText += `${index + 1}. *${item.product.name}*\n   Qtd: ${item.quantity} un | Cód: ${item.product.code} (${item.product.brand})\n   Subtotal: R$ ${(item.product.sellingPrice * item.quantity).toFixed(2)}\n\n`;
    });

    const message = encodeURIComponent(
      `🛒 *NOVO PEDIDO DE PEÇAS - CATÁLOGO WEB*\n` +
      `Loja: *${trade}*\n` +
      (activeBranch ? `Unidade de Atendimento: *${activeBranch.name}* (${activeBranch.uf})\n` : '') +
      `---------------------------------\n` +
      itemsText +
      `---------------------------------\n` +
      `💰 *VALOR TOTAL DO PEDIDO: R$ ${cartTotal.toFixed(2)}*\n\n` +
      `Por favor, confirme a disponibilidade para separação e formas de pagamento (PIX / Cartão / Faturado)!`
    );

    const cleanPhone = storePhone.replace(/\D/g, '');
    const url = cleanPhone ? `https://wa.me/55${cleanPhone}?text=${message}` : `https://wa.me/?text=${message}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Banner de Boas-Vindas do Catálogo */}
      <div className="bg-linear-to-r from-[#0C4A6E] via-[#0369A1] to-[#0284C7] rounded-3xl p-6 sm:p-8 text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-white/20 backdrop-blur-xs rounded-full text-xs font-black uppercase tracking-wider text-sky-100 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Catálogo Web & Autoatendimento
            </span>
            {activeBranch && (
              <span className="px-3 py-1 bg-emerald-500/30 backdrop-blur-xs rounded-full text-xs font-bold text-emerald-200 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {activeBranch.cdCode} • {activeBranch.city}/{activeBranch.uf}
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            {companyProfile?.tradeName || 'Catálogo de Peças Online'}
          </h1>
          <p className="text-xs sm:text-sm text-sky-100 max-w-2xl leading-relaxed">
            Consulte aplicações de peças para automóveis, utilitários, motos e caminhões. Adicione itens ao seu pedido e envie instantaneamente para a nossa equipe pelo WhatsApp!
          </p>
        </div>

        {/* Botão Ver Pedido / Carrinho */}
        <button
          type="button"
          onClick={() => setIsCartOpen(true)}
          className="relative px-6 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-sm rounded-2xl shadow-xl transition flex items-center gap-3 cursor-pointer shrink-0"
        >
          <ShoppingCart className="w-5 h-5" />
          <span>Ver Pedido</span>
          {cartItemsCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-white text-emerald-800 text-xs font-black shadow-xs">
              {cartItemsCount}
            </span>
          )}
        </button>
      </div>

      {/* Barra de Filtros Rápidos & Busca Veicular */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por peça, veículo (ex: Gol, Onix, Corolla), código de fábrica ou OEM..."
            className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0C4A6E]"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700">
            <Car className="w-4 h-4 text-[#0C4A6E]" />
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="todas">Todas as Montadoras</option>
              {vehicleBrands.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
          >
            <option value="todas">Todas as Categorias</option>
            <option value="auto">Automóveis & Utilitários</option>
            <option value="moto">Motos</option>
            <option value="caminhao">Caminhões & Pesados</option>
            <option value="agricola">Linha Agrícola</option>
          </select>
        </div>
      </div>

      {/* Grid de Produtos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredProducts.map((product) => {
          const inStock = product.stock > 0;
          return (
            <div
              key={product.id}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition flex flex-col justify-between group"
            >
              <div>
                {/* Imagem do Produto */}
                <div className="relative h-44 bg-slate-100 overflow-hidden">
                  <img
                    src={product.imageUrl || 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=600&auto=format&fit=crop&q=80'}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-2 left-2 flex items-center gap-1">
                    <span className="px-2 py-0.5 rounded-md bg-[#0C4A6E] text-white font-black text-[10px] uppercase">
                      {product.brand}
                    </span>
                    {inStock ? (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white font-black text-[10px]">
                        Em Estoque ({product.stock})
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-amber-600 text-white font-black text-[10px]">
                        Sob Encomenda
                      </span>
                    )}
                  </div>
                </div>

                {/* Conteúdo do Card */}
                <div className="p-4 space-y-2">
                  <h3 className="font-bold text-sm text-slate-900 line-clamp-2 leading-snug">
                    {product.name}
                  </h3>

                  <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                    <span>Cód: <strong>{product.code}</strong></span>
                    <span>• OEM: <strong>{product.oemCode}</strong></span>
                  </div>

                  {/* Aplicação Resumida */}
                  {product.applications.length > 0 && (
                    <div className="p-2 bg-slate-50 rounded-xl text-[11px] text-slate-600 space-y-0.5">
                      <span className="text-[10px] font-black text-[#0284C7] uppercase block">
                        Aplicação Veicular:
                      </span>
                      <p className="line-clamp-2">
                        {product.applications.map(a => `${a.brand} ${a.vehicle} (${a.yearRange})`).join('; ')}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Rodapé com Preço e Botão Adicionar */}
              <div className="p-4 pt-0 border-t border-slate-100 flex items-center justify-between mt-3">
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold block">Preço à Vista</span>
                  <div className="text-lg font-black text-[#0C4A6E]">
                    R$ {product.sellingPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleAddToCart(product)}
                  className="px-3 py-2 bg-[#0C4A6E] hover:bg-[#075985] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Adicionar</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredProducts.length === 0 && (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 text-slate-500 space-y-2">
          <Package className="w-12 h-12 mx-auto text-slate-300" />
          <h3 className="text-base font-bold text-slate-800">Nenhuma peça encontrada</h3>
          <p className="text-xs max-w-sm mx-auto">
            Tente buscar com outro termo ou selecione "Todas as Montadoras" para ver o catálogo completo.
          </p>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL / DRAWER DO CARRINHO */}
      {/* ======================================================== */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex justify-end">
          <div className="bg-white w-full max-w-md h-full flex flex-col justify-between shadow-2xl p-6 overflow-y-auto animate-in slide-in-from-right duration-300">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-[#0C4A6E]" />
                  <h3 className="text-base font-black text-slate-900">Seu Pedido de Peças</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCartOpen(false)}
                  className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {cart.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Seu carrinho está vazio. Adicione peças do catálogo para enviar seu pedido!
                </div>
              ) : (
                <div className="divide-y divide-slate-100 space-y-2">
                  {cart.map((item) => (
                    <div key={item.product.id} className="pt-2 flex items-center justify-between gap-3 text-xs">
                      <div className="min-w-0 flex-1">
                        <strong className="text-slate-900 block truncate font-bold">{item.product.name}</strong>
                        <span className="text-[11px] text-slate-500 block">
                          Cód: {item.product.code} • R$ {item.product.sellingPrice.toFixed(2)} un
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(item.product.id, -1)}
                          className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold text-slate-700"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center font-bold text-slate-900 text-xs">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(item.product.id, 1)}
                          className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold text-slate-700"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveFromCart(item.product.id)}
                          className="p-1 text-rose-500 hover:text-rose-700 ml-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Total e Botão WhatsApp */}
            <div className="pt-4 border-t border-slate-200 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600 font-semibold">Total do Pedido:</span>
                <span className="text-xl font-black text-slate-900">
                  R$ {cartTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <button
                type="button"
                disabled={cart.length === 0}
                onClick={handleSendOrderToWhatsApp}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-sm rounded-2xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Enviar Pedido pelo WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
