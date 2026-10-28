import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Send,
  CheckCircle2,
  AlertCircle,
  Building2,
  User,
  Mail,
  Phone,
  FileText,
  Clock,
  ShieldCheck,
  MessageSquare,
  HelpCircle,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { formatCnpj, formatPhone, cleanCnpj, sendSupportRequest, SupportRequestPayload } from '../utils/trialService';

interface SolicitarSuporteModalProps {
  isOpen: boolean;
  initialType?: 'teste_15_dias' | 'suporte_login' | 'liberacao_cnpj' | 'extensao_teste';
  initialCnpj?: string;
  initialCompanyName?: string;
  onClose: () => void;
  onSuccess?: (protocol: string) => void;
}

export const SolicitarSuporteModal: React.FC<SolicitarSuporteModalProps> = ({
  isOpen,
  initialType = 'teste_15_dias',
  initialCnpj = '',
  initialCompanyName = '',
  onClose,
  onSuccess,
}) => {
  const [requestType, setRequestType] = useState<'teste_15_dias' | 'suporte_login' | 'liberacao_cnpj' | 'extensao_teste'>(initialType);
  const [cnpj, setCnpj] = useState(formatCnpj(initialCnpj));
  const [companyName, setCompanyName] = useState(initialCompanyName);
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submittedProtocol, setSubmittedProtocol] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!companyName.trim()) {
      setErrorMessage('Informe o nome da sua empresa / razão social.');
      return;
    }
    if (!contactName.trim()) {
      setErrorMessage('Informe seu nome de contato.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Informe um e-mail de contato válido.');
      return;
    }
    const cleanPhoneDigits = (phone || '').replace(/\D/g, '');
    if (!cleanPhoneDigits || cleanPhoneDigits.length < 10) {
      setErrorMessage('Informe seu WhatsApp ou telefone com DDD (mínimo 10 dígitos).');
      return;
    }

    setIsLoading(true);

    try {
      const payload: SupportRequestPayload = {
        cnpj: cnpj.trim() || undefined,
        companyName: companyName.trim(),
        contactName: contactName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        requestType,
        message: message.trim() || undefined,
      };

      const result = await sendSupportRequest(payload);

      setIsLoading(false);
      setSubmittedProtocol(result.protocol);
      onSuccess?.(result.protocol);
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err?.message || 'Falha ao enviar a solicitação. Tente novamente.');
    }
  };

  const handleResetAndClose = () => {
    setSubmittedProtocol(null);
    setErrorMessage(null);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      id="modal-solicitar-suporte-superadmin"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full text-slate-100 shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0C4A6E] via-[#073047] to-slate-900 p-5 sm:p-6 text-white relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <Sparkles className="w-4 h-4 fill-amber-400" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                  Canal Direto com o Superadmin
                </span>
                <h3 className="text-base sm:text-lg font-black text-white leading-tight">
                  {requestType === 'teste_15_dias' ? 'Solicitar Teste Grátis de 15 Dias' : 'Suporte & Atendimento ao Cliente'}
                </h3>
              </div>
            </div>

            <button
              type="button"
              onClick={handleResetAndClose}
              className="p-1.5 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
              title="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-sky-200/90 mt-2">
            Sua mensagem será entregue imediatamente no painel de controle do Superadmin para atendimento prioritário.
          </p>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6">
          {submittedProtocol ? (
            /* Tela de Sucesso */
            <div className="text-center py-4 space-y-4 animate-in fade-in duration-200">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h4 className="text-lg font-black text-white">Solicitação Enviada com Sucesso!</h4>
                <p className="text-xs text-slate-300 mt-1 max-w-sm mx-auto">
                  O Superadmin da plataforma já recebeu sua mensagem. Nossa equipe entrará em contato via WhatsApp e E-mail.
                </p>
              </div>

              <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-2xl text-xs space-y-1.5 max-w-sm mx-auto">
                <div className="flex justify-between items-center text-slate-400">
                  <span>Protocolo de Atendimento:</span>
                  <span className="font-mono font-bold text-sky-400">{submittedProtocol}</span>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span>Empresa:</span>
                  <span className="font-bold text-slate-200">{companyName}</span>
                </div>
                {cnpj && (
                  <div className="flex justify-between items-center text-slate-400">
                    <span>CNPJ:</span>
                    <span className="font-mono text-slate-300">{cnpj}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-slate-400">
                  <span>Previsão de Retorno:</span>
                  <span className="font-bold text-amber-400">Até 30 minutos em horário comercial</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  className="w-full py-2.5 px-4 bg-[#0284C7] hover:bg-[#0369A1] text-white font-extrabold text-xs rounded-xl shadow-lg transition cursor-pointer"
                >
                  Concluir & Voltar ao Login
                </button>
              </div>
            </div>
          ) : (
            /* Formulário */
            <form onSubmit={handleSubmit} className="space-y-4" id="form-solicitar-suporte">
              {errorMessage && (
                <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Seletor de Tipo de Solicitação */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  Motivo do Contato *
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setRequestType('teste_15_dias')}
                    className={`p-2.5 rounded-xl border text-left font-bold transition flex flex-col cursor-pointer ${
                      requestType === 'teste_15_dias'
                        ? 'bg-[#0284C7]/20 border-[#0284C7] text-sky-300 shadow-xs'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      Teste 15 Dias Grátis
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal mt-0.5">
                      Avaliação completa do ERP
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRequestType('suporte_login')}
                    className={`p-2.5 rounded-xl border text-left font-bold transition flex flex-col cursor-pointer ${
                      requestType === 'suporte_login'
                        ? 'bg-[#0284C7]/20 border-[#0284C7] text-sky-300 shadow-xs'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5 text-sky-400" />
                      Suporte de Login
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal mt-0.5">
                      Dificuldade para acessar
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRequestType('liberacao_cnpj')}
                    className={`p-2.5 rounded-xl border text-left font-bold transition flex flex-col cursor-pointer ${
                      requestType === 'liberacao_cnpj'
                        ? 'bg-[#0284C7]/20 border-[#0284C7] text-sky-300 shadow-xs'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-purple-400" />
                      Liberação de CNPJ
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal mt-0.5">
                      CNPJ bloqueado ou novo
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRequestType('extensao_teste')}
                    className={`p-2.5 rounded-xl border text-left font-bold transition flex flex-col cursor-pointer ${
                      requestType === 'extensao_teste'
                        ? 'bg-[#0284C7]/20 border-[#0284C7] text-sky-300 shadow-xs'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-emerald-400" />
                      Extensão de Período
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal mt-0.5">
                      Mais dias para testar
                    </span>
                  </button>
                </div>
              </div>

              {/* CNPJ & Empresa */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="modal-input-cnpj" className="text-xs font-bold text-slate-300 block mb-1">
                    CNPJ da Empresa
                  </label>
                  <div className="relative">
                    <Building2 className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      id="modal-input-cnpj"
                      value={cnpj}
                      onChange={(e) => setCnpj(formatCnpj(e.target.value))}
                      placeholder="00.000.000/0000-00"
                      maxLength={18}
                      className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder:text-slate-500 font-mono focus:outline-none focus:ring-2 focus:ring-[#0284C7]"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="modal-input-empresa" className="text-xs font-bold text-slate-300 block mb-1">
                    Nome da Empresa / Fantasia *
                  </label>
                  <input
                    type="text"
                    id="modal-input-empresa"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Ex: São Paulo Peças & Oficina"
                    required
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0284C7]"
                  />
                </div>
              </div>

              {/* Nome do Contato & WhatsApp */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="modal-input-contato" className="text-xs font-bold text-slate-300 block mb-1">
                    Seu Nome *
                  </label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      id="modal-input-contato"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="Ex: Roberto Silva"
                      required
                      className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0284C7]"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="modal-input-phone" className="text-xs font-bold text-slate-300 block mb-1">
                    WhatsApp com DDD *
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      id="modal-input-phone"
                      value={phone}
                      onChange={(e) => setPhone(formatPhone(e.target.value))}
                      placeholder="(00) 00000-0000"
                      maxLength={15}
                      required
                      className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder:text-slate-500 font-medium focus:outline-none focus:ring-2 focus:ring-[#0284C7]"
                    />
                  </div>
                </div>
              </div>

              {/* E-mail */}
              <div>
                <label htmlFor="modal-input-email" className="text-xs font-bold text-slate-300 block mb-1">
                  E-mail Corporativo *
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="email"
                    id="modal-input-email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contato@suaempresa.com.br"
                    required
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0284C7]"
                  />
                </div>
              </div>

              {/* Mensagem / Observações */}
              <div>
                <label htmlFor="modal-input-message" className="text-xs font-bold text-slate-300 block mb-1">
                  Mensagem / Observações (Opcional)
                </label>
                <textarea
                  id="modal-input-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Ex: Gostaria de testar a emissão de NFe, estoque de autopeças e frente de caixa para 2 filiais..."
                  rows={2}
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0284C7]"
                />
              </div>

              {/* Botão de Envio */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-700 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-2.5 px-4 bg-gradient-to-r from-amber-500 via-[#0284C7] to-indigo-600 hover:opacity-95 text-white font-extrabold text-xs rounded-xl shadow-lg transition active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  id="btn-enviar-solicitacao-suporte"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Enviando ao Superadmin...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Enviar Mensagem ao Superadmin</span>
                    </>
                  )}
                </button>
              </div>

              <div className="text-center pt-1">
                <span className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  Privacidade LGPD garantida • Mensagem direta aos administradores da plataforma
                </span>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
