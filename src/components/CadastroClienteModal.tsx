import React, { useState } from 'react';
import {
  X,
  Building2,
  User,
  Mail,
  Phone,
  Lock,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  RefreshCw,
  Send,
  Eye,
  EyeOff
} from 'lucide-react';
import { apiJson } from '../services/apiClient';
import { formatCnpj, formatPhone, cleanCnpj } from '../utils/trialService';
import { generateStrongPassword } from '../utils/passwordGenerator';

interface CadastroClienteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: {
    tenant: any;
    user: any;
    plainPassword: string;
    emailSent: boolean;
    loginUrl: string;
    formattedAccessText: string;
    whatsappUrl: string;
  }) => void;
}

export const CadastroClienteModal: React.FC<CadastroClienteModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [tradeName, setTradeName] = useState('');
  const [corporateName, setCorporateName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [stateRegistration, setStateRegistration] = useState('');
  const [segment, setSegment] = useState('Autopeças & Acessórios Automotivos');
  const [city, setCity] = useState('');
  const [uf, setUf] = useState('MS');
  const [phone, setPhone] = useState('');

  const [adminName, setAdminName] = useState('');
  const [email, setEmail] = useState('');
  const [planId, setPlanId] = useState('plan_pro');
  const [isTrial, setIsTrial] = useState(false);

  const [password, setPassword] = useState('AcessoInicial@2026!');
  const [showPassword, setShowPassword] = useState(false);
  const [sendEmail, setSendEmail] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCnpj(formatCnpj(e.target.value));
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhone(e.target.value));
  };

  const handleGeneratePassword = () => {
    const strong = generateStrongPassword();
    setPassword(strong);
    setShowPassword(true);
  };

  const handleUseDefaultPassword = () => {
    setPassword('AcessoInicial@2026!');
    setShowPassword(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!tradeName.trim()) {
      setErrorMessage('Informe o Nome Fantasia da empresa.');
      return;
    }
    if (!adminName.trim()) {
      setErrorMessage('Informe o nome do responsável.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Informe um e-mail corporativo válido.');
      return;
    }
    if (!password || password.length < 8) {
      setErrorMessage('A senha deve ter no mínimo 8 caracteres.');
      return;
    }

    const cleanCnpjDigits = cleanCnpj(cnpj);
    if (cleanCnpjDigits && cleanCnpjDigits.length !== 14) {
      setErrorMessage('CNPJ inválido: deve conter 14 dígitos.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await apiJson<{
        success: boolean;
        tenant: any;
        user: any;
        plainPassword: string;
        emailSent: boolean;
        emailError?: string;
        loginUrl: string;
        formattedAccessText: string;
        whatsappUrl: string;
        message: string;
      }>('/api/auth/register-client-with-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tradeName: tradeName.trim(),
          corporateName: corporateName.trim() || tradeName.trim(),
          cnpj: cleanCnpjDigits,
          stateRegistration: stateRegistration.trim(),
          segment,
          adminName: adminName.trim(),
          email: email.trim().toLowerCase(),
          password,
          planId,
          phone: phone.trim(),
          city: city.trim() || 'Campo Grande',
          uf,
          sendEmail,
          isTrial,
        }),
      });

      setIsLoading(false);
      onSuccess(result);
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err?.message || 'Falha ao cadastrar cliente e enviar acesso.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full shadow-2xl text-white overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-700 via-indigo-600 to-[#0284C7] p-5 sm:p-6 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center backdrop-blur-xs shadow-md">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-white">
                Cadastrar Novo Cliente & Enviar Acesso
              </h3>
              <p className="text-xs text-purple-100 flex items-center gap-1.5 mt-0.5">
                <span>Criação de Tenant + Envio automático de e-mail com credenciais</span>
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

        {/* Formulário com Scroll */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 overflow-y-auto custom-scrollbar">
          
          {errorMessage && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-2xl text-xs text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Seção 1: Dados da Empresa Contratante */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-400 pb-1 border-b border-slate-800">
              <Building2 className="w-4 h-4" />
              <span>1. Dados da Empresa (Tenant)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Nome Fantasia *
                </label>
                <input
                  type="text"
                  value={tradeName}
                  onChange={(e) => setTradeName(e.target.value)}
                  placeholder="Ex: MGN Autopeças Matriz"
                  required
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Razão Social (Opcional)
                </label>
                <input
                  type="text"
                  value={corporateName}
                  onChange={(e) => setCorporateName(e.target.value)}
                  placeholder="Ex: MGN Peças e Serviços Ltda"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  CNPJ (14 dígitos)
                </label>
                <input
                  type="text"
                  value={cnpj}
                  onChange={handleCnpjChange}
                  placeholder="00.000.000/0000-00"
                  maxLength={18}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Inscrição Estadual (IE)
                </label>
                <input
                  type="text"
                  value={stateRegistration}
                  onChange={(e) => setStateRegistration(e.target.value)}
                  placeholder="Ex: 283948291 ou ISENTO"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Cidade
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Ex: Campo Grande"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  UF (Estado)
                </label>
                <select
                  value={uf}
                  onChange={(e) => setUf(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-bold cursor-pointer"
                >
                  {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map((state) => (
                    <option key={state} value={state} className="bg-slate-900 text-white">
                      {state}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Telefone / WhatsApp
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={handlePhoneChange}
                  placeholder="(67) 99999-9999"
                  maxLength={15}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Segmento
                </label>
                <select
                  value={segment}
                  onChange={(e) => setSegment(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
                >
                  <option value="Autopeças & Acessórios Automotivos">Autopeças & Acessórios Automotivos</option>
                  <option value="Linha Pesada & Diesel Truck Center">Linha Pesada & Diesel Truck Center</option>
                  <option value="Auto Center & Mecânica Geral">Auto Center & Mecânica Geral</option>
                  <option value="Distribuidora de Peças & Importação">Distribuidora de Peças & Importação</option>
                  <option value="Motopeças & Acessórios">Motopeças & Acessórios</option>
                </select>
              </div>
            </div>
          </div>

          {/* Seção 2: Administrador Contratante */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-400 pb-1 border-b border-slate-800">
              <User className="w-4 h-4" />
              <span>2. Administrador da Empresa (Acesso Principal)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Nome do Responsável *
                </label>
                <input
                  type="text"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  placeholder="Ex: Carlos Eduardo de Oliveira"
                  required
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  E-mail Corporativo de Acesso *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="diretoria@cliente.com.br"
                  required
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                />
              </div>
            </div>
          </div>

          {/* Seção 3: Plano Contratado e Senha de Acesso */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400 pb-1 border-b border-slate-800">
              <KeyRound className="w-4 h-4" />
              <span>3. Plano SaaS & Credenciais de Acesso</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPlanId('plan_starter')}
                className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                  planId === 'plan_starter'
                    ? 'bg-purple-600/20 border-purple-500 text-white shadow-md'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="font-extrabold text-xs">GATO Starter</div>
                <div className="text-[11px] text-purple-300 font-bold mt-0.5">R$ 189,90/mês</div>
                <div className="text-[10px] text-slate-500 mt-1">Até 3 usuários • Balcão</div>
              </button>

              <button
                type="button"
                onClick={() => setPlanId('plan_pro')}
                className={`p-3 rounded-2xl border text-left transition cursor-pointer relative ${
                  planId === 'plan_pro'
                    ? 'bg-purple-600/20 border-purple-500 text-white shadow-md'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="absolute top-2 right-2 text-[9px] font-black bg-purple-500 text-white px-1.5 py-0.5 rounded">
                  POPULAR
                </span>
                <div className="font-extrabold text-xs">GATO Pro</div>
                <div className="text-[11px] text-purple-300 font-bold mt-0.5">R$ 389,90/mês</div>
                <div className="text-[10px] text-slate-500 mt-1">Até 10 usuários • Multi-CD</div>
              </button>

              <button
                type="button"
                onClick={() => setPlanId('plan_enterprise')}
                className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                  planId === 'plan_enterprise'
                    ? 'bg-purple-600/20 border-purple-500 text-white shadow-md'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="font-extrabold text-xs">GATO Enterprise</div>
                <div className="text-[11px] text-purple-300 font-bold mt-0.5">R$ 789,90/mês</div>
                <div className="text-[10px] text-slate-500 mt-1">Usuários ilimitados • Frota</div>
              </button>
            </div>

            {/* Senha Inicial */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-300">
                  Senha Inicial de Acesso (Temporária)
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="text-[10px] font-bold text-sky-400 hover:text-sky-300 hover:underline cursor-pointer"
                  >
                    Gerar Senha Forte
                  </button>
                  <span className="text-slate-600">•</span>
                  <button
                    type="button"
                    onClick={handleUseDefaultPassword}
                    className="text-[10px] font-bold text-amber-400 hover:text-amber-300 hover:underline cursor-pointer"
                  >
                    Usar AcessoInicial@2026!
                  </button>
                </div>
              </div>

              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Senha de acesso"
                  required
                  minLength={8}
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Checkbox de Envio de E-mail */}
            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendEmail}
                  onChange={(e) => setSendEmail(e.target.checked)}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-slate-900 border-slate-700 mt-0.5 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-extrabold text-white block">
                    Enviar e-mail de acesso e boas-vindas imediatamente
                  </span>
                  <span className="text-slate-400 text-[11px]">
                    Dispara automaticamente mensagem com link de login, e-mail corporativo e a senha inicial configurada.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer pt-2 border-t border-slate-800/80">
                <input
                  type="checkbox"
                  checked={isTrial}
                  onChange={(e) => setIsTrial(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 bg-slate-900 border-slate-700 mt-0.5 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-bold text-slate-200 block">
                    Marcar como Período de Teste Grátis (15 Dias)
                  </span>
                  <span className="text-slate-400 text-[11px]">
                    Se desmarcado, a conta entra imediatamente como cliente com contrato e faturamento ativo.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Footer de Ação */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 text-white font-extrabold text-xs shadow-lg shadow-purple-600/20 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              id="btn-confirmar-cadastro-cliente"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Cadastrando e enviando acesso...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Cadastrar e Enviar Acesso</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
