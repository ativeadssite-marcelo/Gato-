import React, { useState } from 'react';
import {
  X,
  Mail,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Send,
  Building2,
  User,
  KeyRound,
  RefreshCw,
  Globe,
  AlertCircle
} from 'lucide-react';

export interface AcessoEnviadoModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  recipientName: string;
  recipientEmail: string;
  companyName: string;
  roleName?: string;
  loginUrl: string;
  password?: string;
  emailSent?: boolean;
  emailError?: string | null;
  formattedAccessText?: string;
  whatsappUrl?: string;
  onResendEmail?: () => Promise<void>;
}

export const AcessoEnviadoModal: React.FC<AcessoEnviadoModalProps> = ({
  isOpen,
  onClose,
  title = 'Dados de Acesso Gerados com Sucesso!',
  recipientName,
  recipientEmail,
  companyName,
  roleName,
  loginUrl,
  password = '••••••••',
  emailSent = true,
  emailError,
  formattedAccessText,
  whatsappUrl,
  onResendEmail,
}) => {
  const [copied, setCopied] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const defaultFormattedText = [
    `*Dados de Acesso ao GATO SaaS*`,
    `Olá ${recipientName}, seu acesso foi configurado com sucesso!`,
    companyName ? `🏢 Empresa: ${companyName}` : '',
    roleName ? `👤 Função: ${roleName}` : '',
    `🌐 Link de Login: ${loginUrl}`,
    `📧 E-mail: ${recipientEmail}`,
    `🔑 Senha de Acesso: ${password}`,
    `\nInstruções: Acesse o link acima, faça login com seu e-mail e utilize a senha temporária informada.`,
  ].filter(Boolean).join('\n');

  const textToCopy = formattedAccessText || defaultFormattedText;

  const handleCopy = () => {
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleResend = async () => {
    if (!onResendEmail) return;
    setIsResending(true);
    setResendStatus(null);
    try {
      await onResendEmail();
      setResendStatus('E-mail reenviado com sucesso!');
      setTimeout(() => setResendStatus(null), 3500);
    } catch (err: any) {
      setResendStatus(err?.message || 'Falha ao reenviar e-mail.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full shadow-2xl text-white overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        
        {/* Header com Gradiente */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-[#0284C7] p-5 sm:p-6 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center backdrop-blur-xs shadow-md">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-white">
                {title}
              </h3>
              <p className="text-xs text-teal-100 flex items-center gap-1.5 mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                <span>Cadastro e credenciais salvas com segurança</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo do Modal com Scroll */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto custom-scrollbar">
          
          {/* Status do Envio por E-mail */}
          {emailSent ? (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-2.5 text-xs text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-white">E-mail de acesso enviado com sucesso!</p>
                <p className="text-slate-300 mt-0.5">
                  Uma mensagem com link de login e instruções foi despachada para <span className="font-mono font-bold text-emerald-300">{recipientEmail}</span>.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-300">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-white">Acesso gerado e registrado na fila</p>
                <p className="text-slate-300 mt-0.5">
                  {emailError || 'O e-mail foi registrado no sistema. Você também pode copiar as credenciais abaixo e enviar via WhatsApp.'}
                </p>
              </div>
            </div>
          )}

          {/* Card Resumo das Credenciais */}
          <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4 space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block pb-1 border-b border-slate-800">
              Resumo do Acesso Gerado
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[11px] text-slate-400 block">Destinatário:</span>
                <span className="font-bold text-white flex items-center gap-1.5 mt-0.5">
                  <User className="w-3.5 h-3.5 text-sky-400" />
                  {recipientName}
                </span>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 block">Empresa / Cliente:</span>
                <span className="font-bold text-white flex items-center gap-1.5 mt-0.5">
                  <Building2 className="w-3.5 h-3.5 text-purple-400" />
                  {companyName}
                </span>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 block">E-mail de Login:</span>
                <span className="font-mono font-bold text-sky-300 block mt-0.5 select-all">
                  {recipientEmail}
                </span>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 block">Senha Inicial / Temporária:</span>
                <span className="font-mono font-bold text-amber-400 block mt-0.5 select-all bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 w-fit">
                  {password}
                </span>
              </div>
            </div>

            <div>
              <span className="text-[11px] text-slate-400 block mb-1">Link de Acesso ao Sistema:</span>
              <a 
                href={loginUrl}
                target="_blank" 
                rel="noreferrer"
                className="font-mono text-[11px] text-sky-400 hover:text-sky-300 hover:underline flex items-center gap-1.5 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 break-all"
              >
                <Globe className="w-3.5 h-3.5 shrink-0" />
                <span>{loginUrl}</span>
                <ExternalLink className="w-3 h-3 shrink-0 ml-auto" />
              </a>
            </div>
          </div>

          {/* Prévia Formatada para Cópia e WhatsApp */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-slate-300">
                Texto Formatado de Apresentação:
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="text-[11px] font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1 transition cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiado!' : 'Copiar Texto'}</span>
              </button>
            </div>

            <textarea
              readOnly
              value={textToCopy}
              rows={5}
              className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 font-mono focus:outline-none select-all resize-none"
            />
          </div>

          {/* Feedback de Reenvio */}
          {resendStatus && (
            <div className="p-2.5 bg-sky-500/10 border border-sky-500/30 rounded-xl text-xs text-sky-300 text-center animate-in fade-in">
              {resendStatus}
            </div>
          )}

          {/* Ações Rápidas */}
          <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 text-center cursor-pointer"
                id="btn-enviar-acesso-whatsapp"
              >
                <Send className="w-4 h-4 shrink-0" />
                <span>Enviar via WhatsApp</span>
              </a>
            )}

            <button
              type="button"
              onClick={handleCopy}
              className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-extrabold text-xs border border-slate-700 transition flex items-center justify-center gap-1.5 cursor-pointer"
              id="btn-copiar-acesso"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copiado para Área de Transferência' : 'Copiar Dados de Acesso'}</span>
            </button>
          </div>

          {onResendEmail && (
            <div className="pt-1 flex items-center justify-center">
              <button
                type="button"
                onClick={handleResend}
                disabled={isResending}
                className="text-xs font-bold text-sky-400 hover:text-sky-300 hover:underline flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`} />
                <span>Reenviar E-mail de Acesso Novamente</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between shrink-0">
          <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Credenciais seguras • Troca obrigatória no 1º acesso</span>
          </p>

          <button
            type="button"
            onClick={onClose}
            className="py-2 px-4 rounded-xl bg-gradient-to-r from-[#0C4A6E] to-[#0284C7] hover:opacity-95 text-white font-extrabold text-xs transition cursor-pointer"
          >
            Concluir
          </button>
        </div>

      </div>
    </div>
  );
};
