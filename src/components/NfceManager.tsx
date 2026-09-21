import React, { useState } from 'react';
import {
  Receipt,
  Printer,
  QrCode,
  CheckCircle2,
  AlertCircle,
  Plus,
  Eye,
  Download,
  CreditCard,
  Banknote,
  Smartphone,
  ShieldCheck,
  Search,
  ShoppingCart
} from 'lucide-react';
import { Product, Customer, BranchUnit, CompanyProfile } from '../types';

export interface NfceRecord {
  id: string;
  number: string;
  series: string;
  accessKey: string;
  issuedAt: string;
  cpfConsumer?: string;
  paymentMethod: 'pix' | 'dinheiro' | 'cartao_credito' | 'cartao_debito';
  totalAmount: number;
  discount: number;
  netAmount: number;
  sefazStatus: string;
  protocolAuth: string;
  items: Array<{
    code: string;
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
}

interface NfceManagerProps {
  products: Product[];
  activeBranch?: BranchUnit;
  companyProfile?: CompanyProfile | null;
  onShowNotification: (title: string, message: string, type?: 'success' | 'warning' | 'info') => void;
}

export const NfceManager: React.FC<NfceManagerProps> = ({
  products,
  activeBranch,
  companyProfile,
  onShowNotification,
}) => {
  // Lista inicial de NFC-e emitidas
  const [nfceList, setNfceList] = useState<NfceRecord[]>([
    {
      id: 'nfce-001',
      number: '000.089.412',
      series: '2',
      accessKey: '50260312345678000199650020000894121000894125',
      issuedAt: '2026-03-04T14:32:00',
      cpfConsumer: undefined,
      paymentMethod: 'pix',
      totalAmount: 320.0,
      discount: 20.0,
      netAmount: 300.0,
      sefazStatus: 'Autorizada SEFAZ',
      protocolAuth: '150260009876543',
      items: [
        { code: 'BOSCH-0250', name: 'Vela de Ignição Iridium FR7DCX+', quantity: 4, unitPrice: 80.0, total: 320.0 }
      ]
    },
    {
      id: 'nfce-002',
      number: '000.089.411',
      series: '2',
      accessKey: '50260312345678000199650020000894111000894119',
      issuedAt: '2026-03-04T11:15:00',
      cpfConsumer: undefined,
      paymentMethod: 'cartao_credito',
      totalAmount: 185.5,
      discount: 0,
      netAmount: 185.5,
      sefazStatus: 'Autorizada SEFAZ',
      protocolAuth: '150260009876522',
      items: [
        { code: 'FRAM-CH9973', name: 'Filtro de Óleo Ecológico Blindado', quantity: 1, unitPrice: 65.5, total: 65.5 },
        { code: 'MOBIL-5W30', name: 'Óleo Motor 5W30 Sintético 1L', quantity: 2, unitPrice: 60.0, total: 120.0 }
      ]
    }
  ]);

  const [selectedNfce, setSelectedNfce] = useState<NfceRecord | null>(nfceList[0]);
  const [showDanfceModal, setShowDanfceModal] = useState(false);
  const [showNewNfceModal, setShowNewNfceModal] = useState(false);

  // Form State para Nova Emissão Rápida
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');
  const [itemQuantity, setItemQuantity] = useState(1);
  const [cpfInput, setCpfInput] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'dinheiro' | 'cartao_credito' | 'cartao_debito'>('pix');
  const [discountAmount, setDiscountAmount] = useState(0);

  const handleEmitNfce = (e: React.FormEvent) => {
    e.preventDefault();
    const prod = products.find(p => p.id === selectedProductId) || products[0];
    const total = prod.sellingPrice * itemQuantity;
    const net = Math.max(0, total - discountAmount);
    const newNum = (89413 + nfceList.length).toString();
    const key = `5026031234567800019965002${newNum.padStart(9, '0')}1000894130`;

    const newRecord: NfceRecord = {
      id: `nfce-${Date.now()}`,
      number: `000.${newNum.slice(0, 3)}.${newNum.slice(3)}`,
      series: '2',
      accessKey: key,
      issuedAt: new Date().toISOString(),
      cpfConsumer: cpfInput.trim() || undefined,
      paymentMethod,
      totalAmount: total,
      discount: discountAmount,
      netAmount: net,
      sefazStatus: 'Autorizada SEFAZ',
      protocolAuth: `15026000${Math.floor(1000000 + Math.random() * 9000000)}`,
      items: [
        {
          code: prod.code,
          name: prod.name,
          quantity: itemQuantity,
          unitPrice: prod.sellingPrice,
          total
        }
      ]
    };

    setNfceList([newRecord, ...nfceList]);
    setSelectedNfce(newRecord);
    setShowNewNfceModal(false);
    setShowDanfceModal(true);
    onShowNotification(
      'NFC-e Autorizada com Sucesso!',
      `Cupom Fiscal Eletrônico Nº ${newRecord.number} transmitido à SEFAZ.`,
      'success'
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header NFC-e */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs uppercase tracking-wider mb-1">
            <Receipt className="w-4 h-4 text-emerald-600" />
            <span>NFC-e Modelo 65 - Venda Rápida de Balcão (PDV)</span>
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Emissão de Nota Fiscal de Consumidor Eletrônica (NFC-e)
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            Transmissão em tempo real para a SEFAZ, QR-Code de autenticação para o cliente e impressão em bobina térmica 80mm/58mm.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowNewNfceModal(true)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Emitir NFC-e Balcão</span>
        </button>
      </div>

      {/* Tabela de NFC-e emitidas */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <th className="p-3.5 pl-4">Número / Série</th>
                <th className="p-3.5">Chave NFC-e</th>
                <th className="p-3.5">Consumidor</th>
                <th className="p-3.5">Forma de Pagto</th>
                <th className="p-3.5 text-right">Valor Líquido</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-center pr-4">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {nfceList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    <Receipt className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-bold text-slate-600">Nenhum cupom fiscal emitido nesta sessão.</p>
                    <p className="text-[11px] text-slate-400">Clique em "Emitir NFC-e Balcão" para realizar a transmissão em contingência ou online à SEFAZ.</p>
                  </td>
                </tr>
              ) : (
                nfceList.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/70 transition">
                    <td className="p-3.5 pl-4 font-mono font-bold text-slate-900">
                      <span className="bg-emerald-50 text-emerald-900 px-2 py-0.5 rounded border border-emerald-200">
                        NFC-e {doc.number}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">Série {doc.series}</span>
                    </td>
                    <td className="p-3.5 font-mono text-[10px] text-slate-600">
                      {doc.accessKey.slice(0, 4)} {doc.accessKey.slice(4, 8)} ... {doc.accessKey.slice(-8)}
                    </td>
                    <td className="p-3.5 text-slate-700">
                      {doc.cpfConsumer ? (
                        <span className="font-semibold text-slate-900">CPF: {doc.cpfConsumer}</span>
                      ) : (
                        <span className="text-slate-400 italic">Consumidor Não Identificado</span>
                      )}
                    </td>
                    <td className="p-3.5 uppercase font-bold text-[11px] text-slate-600">
                      {doc.paymentMethod === 'pix' ? '⚡ PIX' : doc.paymentMethod === 'dinheiro' ? '💵 Dinheiro' : '💳 Cartão'}
                    </td>
                    <td className="p-3.5 text-right font-black text-slate-900 font-mono">
                      R$ {doc.netAmount.toFixed(2)}
                    </td>
                    <td className="p-3.5 text-center">
                      <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        {doc.sefazStatus}
                      </span>
                    </td>
                    <td className="p-3.5 pr-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedNfce(doc);
                            setShowDanfceModal(true);
                          }}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold transition cursor-pointer"
                          title="Ver Cupom DANFCE"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>DANFCE</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL: EMITIR NOVA NFC-e */}
      {/* ======================================================== */}
      {showNewNfceModal && (
        <div className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-black text-slate-900">Emissão Rápida de NFC-e (Balcão)</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNewNfceModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEmitNfce} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Selecione o Item / Peça</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} - {p.name.slice(0, 35)}... (R$ {p.sellingPrice.toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Quantidade</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={itemQuantity}
                    onChange={(e) => setItemQuantity(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Desconto (R$)</label>
                  <input
                    type="number"
                    min={0}
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">CPF na Nota (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ex: 000.000.000-00 (ou em branco)"
                  value={cpfInput}
                  onChange={(e) => setCpfInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Forma de Pagamento</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('pix')}
                    className={`p-2 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1 ${
                      paymentMethod === 'pix'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>PIX</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cartao_credito')}
                    className={`p-2 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1 ${
                      paymentMethod === 'cartao_credito'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Crédito</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cartao_debito')}
                    className={`p-2 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1 ${
                      paymentMethod === 'cartao_debito'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Débito</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('dinheiro')}
                    className={`p-2 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1 ${
                      paymentMethod === 'dinheiro'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Banknote className="w-4 h-4" />
                    <span>Dinheiro</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewNfceModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow transition"
                >
                  Transmitir à SEFAZ & Imprimir
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CUPOM FISCAL DANFCE TÉRMICO (80MM) */}
      {/* ======================================================== */}
      {showDanfceModal && selectedNfce && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-xs font-bold text-slate-500">Cupom Fiscal DANFCE (Bobina 80mm)</span>
              <button
                type="button"
                onClick={() => setShowDanfceModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>

            {/* Simulação da fita térmica */}
            <div className="bg-[#FFFFFE] border border-dashed border-slate-300 p-4 rounded-xl text-slate-900 font-mono text-[11px] leading-tight space-y-2 shadow-inner">
              <div className="text-center space-y-0.5 border-b border-dashed border-slate-300 pb-2">
                <strong className="block text-xs uppercase">{companyProfile?.corporateName || 'GATO COMÉRCIO E DISTRIBUIÇÃO DE AUTOPEÇAS LTDA'}</strong>
                <p className="text-[10px] text-slate-600">{companyProfile?.tradeName || activeBranch?.name || 'GATO Autopeças'}</p>
                <p className="text-[10px]">CNPJ: {activeBranch?.cnpj || companyProfile?.cnpj || '12.345.678/0001-90'} • IE: {activeBranch?.ie || '28.345.678-9'}</p>
                <p className="text-[9px] text-slate-500">{activeBranch?.city || 'Campo Grande'} - {activeBranch?.uf || 'MS'}</p>
              </div>

              <div className="text-center font-bold uppercase text-[11px]">
                DANFE NFC-e - Documento Auxiliar da Nota Fiscal de Consumidor Eletrônica
              </div>

              {/* Itens */}
              <div className="border-t border-b border-dashed border-slate-300 py-1.5 space-y-1">
                <div className="flex justify-between text-[10px] font-bold">
                  <span>ITEM / DESCRIÇÃO</span>
                  <span>TOTAL</span>
                </div>
                {selectedNfce.items.map((it, idx) => (
                  <div key={idx} className="space-y-0.5">
                    <div className="flex justify-between">
                      <span className="truncate max-w-[180px]">{idx + 1}. {it.name}</span>
                      <span>R$ {it.total.toFixed(2)}</span>
                    </div>
                    <div className="text-[9px] text-slate-500">
                      {it.quantity} UN x R$ {it.unitPrice.toFixed(2)} • Cód: {it.code}
                    </div>
                  </div>
                ))}
              </div>

              {/* Totais */}
              <div className="space-y-0.5 pt-1">
                <div className="flex justify-between">
                  <span>Qtd. Total de Itens:</span>
                  <span>{selectedNfce.items.reduce((a, b) => a + b.quantity, 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Valor Total:</span>
                  <span>R$ {selectedNfce.totalAmount.toFixed(2)}</span>
                </div>
                {selectedNfce.discount > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Desconto:</span>
                    <span>- R$ {selectedNfce.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-xs pt-1 border-t border-slate-200">
                  <span>VALOR A PAGAR:</span>
                  <span>R$ {selectedNfce.netAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-600">
                  <span>Forma de Pagto:</span>
                  <span className="uppercase font-bold">{selectedNfce.paymentMethod}</span>
                </div>
              </div>

              {/* Consumidor e Chave */}
              <div className="border-t border-dashed border-slate-300 pt-2 space-y-1 text-[9px] text-center">
                <p>CONSUMIDOR: {selectedNfce.cpfConsumer ? `CPF ${selectedNfce.cpfConsumer}` : 'NÃO IDENTIFICADO'}</p>
                <p className="font-bold">NFC-e Nº {selectedNfce.number} Série {selectedNfce.series}</p>
                <p className="text-[8px] break-all">{selectedNfce.accessKey}</p>
                <p>Protocolo de Autorização: {selectedNfce.protocolAuth}</p>
              </div>

              {/* Simulação QR Code */}
              <div className="flex flex-col items-center justify-center pt-2 space-y-1">
                <div className="w-24 h-24 bg-white border-2 border-slate-800 p-1 flex items-center justify-center">
                  <QrCode className="w-20 h-20 text-slate-900" />
                </div>
                <span className="text-[8px] text-slate-500">Consulte pela Chave de Acesso em sefaz.ms.gov.br</span>
              </div>
            </div>

            {/* Ações */}
            <div className="flex items-center justify-between gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDanfceModal(false)}
                className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={() => {
                  window.print();
                  onShowNotification('Impressão Enviada', 'Imprimindo cupom na impressora térmica 80mm.', 'success');
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow transition cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir 80mm</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
