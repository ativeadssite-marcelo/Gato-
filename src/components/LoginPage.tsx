import React, { useState, useEffect } from 'react';
import { 
  Eye, 
  EyeOff, 
  RefreshCw, 
  AlertCircle, 
  ArrowRight,
  ArrowLeft,
  X,
  Building2,
  Sparkles,
  Search,
  CheckCircle2,
  Clock,
  HelpCircle,
  Zap,
  KeyRound,
  ShieldCheck
} from 'lucide-react';
import gatoLogoNova from '../assets/images/gato_logo_2026.png';
import gatoLogoIcon from '../assets/images/gato_logo_2026_icon.jpg';
import { BranchUnit, UserSession, CompanyProfile } from '../types';
import { INITIAL_BRANCHES } from '../data/initialData';
import { loginWithCredentials, resetAdminPasswordDirectly } from '../utils/sessionService';
import { filterDemoBranches } from '../utils/seedMode';
import {
  formatCnpj,
  formatPhone,
  cleanCnpj,
  checkTrialStatusByCnpj,
  activateTrial15Days,
  loginWithTrialCnpj,
  TrialStatusResponse,
} from '../utils/trialService';
import { SolicitarSuporteModal } from './SolicitarSuporteModal';

interface LoginPageProps {
  currentSession: UserSession | null;
  companyProfile?: CompanyProfile | null;
  branches?: BranchUnit[];
  onLoginSuccess: (session: UserSession, newCompany?: CompanyProfile) => void;
  onBackToApp?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  currentSession,
  branches,
  onLoginSuccess,
  onBackToApp,
}) => {
  const rawBranches = branches && branches.length > 0 ? branches : INITIAL_BRANCHES;
  const availableBranches = filterDemoBranches(rawBranches);

  // Modo: 'credentials' (padrão como no layout) ou 'trial_cnpj' (rápido)
  const [authMode, setAuthMode] = useState<'credentials' | 'trial_cnpj'>('credentials');

  // Credenciais
  const [emailLogin, setEmailLogin] = useState(() => {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('gato_remember_email') || 'contato.ativeads@gmail.com';
    }
    return 'contato.ativeads@gmail.com';
  });
  const [passwordLogin, setPasswordLogin] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Filial Selecionada
  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    currentSession?.branchId || availableBranches[0]?.id || ''
  );

  // Teste 15 Dias CNPJ
  const [cnpjTrialInput, setCnpjTrialInput] = useState('');
  const [trialStatus, setTrialStatus] = useState<TrialStatusResponse | null>(null);
  const [isCheckingCnpj, setIsCheckingCnpj] = useState(false);
  const [showActivationForm, setShowActivationForm] = useState(false);
  const [tradeNameTrial, setTradeNameTrial] = useState('');
  const [adminNameTrial, setAdminNameTrial] = useState('');
  const [emailTrial, setEmailTrial] = useState('');
  const [phoneTrial, setPhoneTrial] = useState('');
  const [ufTrial, setUfTrial] = useState('MS');

  // Modais de suporte & senha única
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [supportModalType, setSupportModalType] = useState<'teste_15_dias' | 'suporte_login' | 'liberacao_cnpj' | 'extensao_teste'>('teste_15_dias');
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [newUniquePassword, setNewUniquePassword] = useState('');
  const [confirmUniquePassword, setConfirmUniquePassword] = useState('');
  const [showUniquePassword, setShowUniquePassword] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resetModalError, setResetModalError] = useState<string | null>(null);

  // Estados de feedback
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const activeBranch = availableBranches.find(b => b.id === selectedBranchId) || availableBranches[0];

  useEffect(() => {
    if (rememberMe && emailLogin) {
      localStorage.setItem('gato_remember_email', emailLogin);
    }
  }, [rememberMe, emailLogin]);

  // Executa login corporativo
  const executeLogin = async (emailToUse: string, passwordToUse: string, branchIdToUse?: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const targetBranchId = branchIdToUse || selectedBranchId || activeBranch?.id || 'matriz-principal';
      const result = await loginWithCredentials(
        emailToUse.trim(),
        passwordToUse,
        availableBranches,
        targetBranchId
      );

      try {
        localStorage.setItem('gato_user_session', JSON.stringify(result.session));
        localStorage.setItem('gato_active_store', result.session.branchId);
      } catch (err) {
        console.warn('LocalStorage error:', err);
      }

      setIsLoading(false);
      onLoginSuccess(result.session);
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err?.message || 'Credenciais inválidas. Verifique seu e-mail e senha corporativos.');
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailLogin.trim() || !passwordLogin.trim()) {
      setErrorMessage('Informe seu e-mail corporativo e sua senha.');
      return;
    }
    void executeLogin(emailLogin, passwordLogin);
  };

  // Login rápido de administrador (1 Clique)
  const handleQuickAdminLogin = () => {
    setEmailLogin('contato.ativeads@gmail.com');
    setPasswordLogin('AcessoInicial@2026!');
    void executeLogin('contato.ativeads@gmail.com', 'AcessoInicial@2026!');
  };

  // Consulta status do teste de 15 dias por CNPJ
  const handleCheckCnpjTrial = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const clean = cleanCnpj(cnpjTrialInput);
    if (clean.length !== 14) {
      setErrorMessage('Informe um CNPJ válido com 14 dígitos para consultar.');
      return;
    }

    setIsCheckingCnpj(true);
    try {
      const status = await checkTrialStatusByCnpj(clean);
      setTrialStatus(status);
      setShowActivationForm(!status.exists);
      if (!status.exists) {
        setErrorMessage(null);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Falha ao consultar CNPJ.');
    } finally {
      setIsCheckingCnpj(false);
    }
  };

  const handleEnterTrialWithCnpj = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const result = await loginWithTrialCnpj(cnpjTrialInput, availableBranches);
      setIsLoading(false);
      onLoginSuccess(result.session, result.companyProfile);
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err?.message || 'Falha ao acessar o teste do CNPJ.');
    }
  };

  const handleActivateTrialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const clean = cleanCnpj(cnpjTrialInput);
    if (clean.length !== 14) {
      setErrorMessage('Informe um CNPJ válido com 14 dígitos.');
      return;
    }
    if (!tradeNameTrial.trim()) {
      setErrorMessage('Informe o Nome Fantasia da sua empresa.');
      return;
    }
    if (!adminNameTrial.trim() || !emailTrial.trim()) {
      setErrorMessage('Informe seu nome e e-mail corporativo.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await activateTrial15Days({
        cnpj: clean,
        tradeName: tradeNameTrial.trim(),
        adminName: adminNameTrial.trim(),
        email: emailTrial.trim(),
        phone: phoneTrial.trim(),
        uf: ufTrial,
        branches: availableBranches,
      });

      setIsLoading(false);
      onLoginSuccess(result.session, result.companyProfile);
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err?.message || 'Falha ao ativar o teste de 15 dias.');
    }
  };

  const openSupportModal = (type: 'teste_15_dias' | 'suporte_login' | 'liberacao_cnpj' | 'extensao_teste') => {
    setSupportModalType(type);
    setIsSupportModalOpen(true);
  };

  const handleDefineUniquePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetModalError(null);
    if (!newUniquePassword || newUniquePassword.length < 8) {
      setResetModalError('A nova senha deve ter no mínimo 8 caracteres.');
      return;
    }
    if (newUniquePassword !== confirmUniquePassword) {
      setResetModalError('A confirmação da nova senha não confere.');
      return;
    }

    setIsResettingPassword(true);
    try {
      const res = await resetAdminPasswordDirectly(newUniquePassword);
      setIsResettingPassword(false);
      setIsResetModalOpen(false);
      setEmailLogin('contato.ativeads@gmail.com');
      setPasswordLogin(newUniquePassword);
      setSuccessMessage(res.message || 'Nova senha única cadastrada! Entrando no sistema...');
      void executeLogin('contato.ativeads@gmail.com', newUniquePassword);
    } catch (err: any) {
      setIsResettingPassword(false);
      setResetModalError(err?.message || 'Falha ao salvar a nova senha.');
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#0A0C13] font-['Plus_Jakarta_Sans'] text-slate-100 selection:bg-[#253B75] selection:text-white">
      
      {/* ===================================================================== */}
      {/* LEFT PANEL: DEEP CELESTIAL ATMOSPHERE + PROMINENT HIGHLIGHTED GATO LOGO */}
      {/* ===================================================================== */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-5/12 flex-col justify-between p-12 xl:p-16 relative overflow-hidden bg-gradient-to-b from-[#06080F] via-[#090E1D] to-[#0A1633] border-r border-[#192238]/60">
        
        {/* Subtle Ambient Glow and Atmospheric Horizon Effect */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,_rgba(37,59,117,0.25),_transparent_70%)] pointer-events-none" />
        <div className="absolute -bottom-24 -left-20 w-[140%] h-80 bg-gradient-to-t from-[#1E3A8A]/30 via-[#172554]/15 to-transparent blur-3xl pointer-events-none rounded-full" />
        
        {/* Stars / Dust Particles */}
        <div className="absolute top-1/4 left-1/3 w-1 h-1 bg-white/70 rounded-full shadow-[0_0_8px_white]" />
        <div className="absolute top-1/3 right-1/4 w-1.5 h-1.5 bg-blue-200/80 rounded-full shadow-[0_0_12px_rgba(147,197,253,0.9)]" />
        <div className="absolute top-2/3 left-1/4 w-1 h-1 bg-white/50 rounded-full" />
        <div className="absolute top-1/2 right-1/3 w-1 h-1 bg-white/60 rounded-full" />

        {/* TOP BRANDING: GATO LOGO PROMINENTLY IN HIGHLIGHT */}
        <div className="relative z-10 flex items-center gap-3.5">
          <div className="relative group">
            <div className="w-11 h-11 rounded-2xl bg-black/60 border border-amber-500/50 p-1 shadow-[0_0_25px_-5px_rgba(245,158,11,0.5)] flex items-center justify-center shrink-0">
              <img 
                src={gatoLogoIcon} 
                alt="GATO Logo" 
                className="w-full h-full object-cover rounded-xl"
              />
            </div>
            <div className="absolute inset-0 ring-1 ring-amber-400/30 rounded-2xl pointer-events-none" />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xl font-black tracking-tight text-white font-['Outfit']">
              GATO
            </span>
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse mt-0.5" />
            <span className="text-xs uppercase font-extrabold tracking-wider text-slate-300 ml-1">
              FLOW
            </span>
          </div>
        </div>

        {/* CENTER PROMINENT LOGO SHOWCASE (Requested: "apenas o logo mantenha em destaque") */}
        <div className="relative z-10 my-auto py-8 flex flex-col items-center text-center">
          <div className="relative group max-w-sm w-full mx-auto">
            {/* Luminous rim aura around the official logo */}
            <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/20 via-blue-600/30 to-amber-500/20 rounded-3xl blur-xl opacity-75 group-hover:opacity-100 transition duration-1000" />
            
            <img 
              src={gatoLogoNova} 
              alt="GATO - Gestão de Estoque & Balcão" 
              className="relative w-full h-auto object-contain rounded-2xl border border-white/10 shadow-[0_15px_40px_-15px_rgba(0,0,0,0.8)]"
              id="img-logo-login-destaque"
            />
          </div>
        </div>

        {/* BOTTOM HEADLINE & SUBTITLE (Matching Reference Layout) */}
        <div className="relative z-10 space-y-3 pt-6">
          <h2 className="text-3xl xl:text-4xl font-bold tracking-tight text-white leading-tight">
            Gestão Inteligente & Estoque Ágil.
          </h2>
          <p className="text-sm xl:text-base text-slate-400 max-w-md font-normal leading-relaxed">
            A plataforma moderna para controle de estoque, balcão de vendas, cotações fiscais e multi-loja.
          </p>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* RIGHT PANEL: CLEAN ULTRA-MINIMALIST LOGIN FORM (EXACT SCREENSHOT FIT)  */}
      {/* ===================================================================== */}
      <div className="w-full lg:w-1/2 xl:w-7/12 flex items-center justify-center p-6 sm:p-10 lg:p-16 bg-[#0B0D14] min-h-screen">
        <div className="w-full max-w-md space-y-6">
          
          {/* Header Action: Return to App if session exists */}
          {currentSession && onBackToApp && (
            <div className="flex items-center justify-between pb-2">
              <button
                type="button"
                onClick={onBackToApp}
                className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 text-blue-400" />
                <span>Voltar ao painel ({currentSession.name.split(' ')[0]})</span>
              </button>
              <button
                type="button"
                onClick={onBackToApp}
                className="p-1 rounded-lg text-slate-500 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Mobile-Only Logo in Highlight */}
          <div className="lg:hidden flex flex-col items-center text-center pb-2">
            <img 
              src={gatoLogoNova} 
              alt="GATO Logo" 
              className="w-44 h-auto object-contain rounded-xl border border-white/10 shadow-lg mb-3"
            />
          </div>

          {/* Heading (Matching Screenshot: "Welcome Back!" in PT-BR) */}
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Bem-vindo de Volta!
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Que bom ter você aqui! Digite seus dados para acessar o sistema.
            </p>
          </div>

          {/* Alerts: Error or Success */}
          {errorMessage && (
            <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB / MODE: CREDENTIALS (DEFAULT) vs CNPJ TEST                     */}
          {/* ================================================================= */}
          {authMode === 'credentials' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4" id="form-login-clean">
              
              {/* Field: Email */}
              <div className="space-y-1.5">
                <label 
                  htmlFor="input-email-clean" 
                  className="block text-xs font-semibold text-slate-200"
                >
                  E-mail Corporativo
                </label>
                <input
                  type="email"
                  id="input-email-clean"
                  value={emailLogin}
                  onChange={(e) => setEmailLogin(e.target.value)}
                  placeholder="Digite seu e-mail corporativo"
                  autoComplete="email"
                  required
                  className="w-full px-4 py-3 bg-white text-slate-900 rounded-lg text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#253B75] font-medium transition"
                />
              </div>

              {/* Field: Password with Eye Icon */}
              <div className="space-y-1.5">
                <label 
                  htmlFor="input-password-clean" 
                  className="block text-xs font-semibold text-slate-200"
                >
                  Senha de Acesso
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="input-password-clean"
                    value={passwordLogin}
                    onChange={(e) => setPasswordLogin(e.target.value)}
                    placeholder="Digite sua senha"
                    autoComplete="current-password"
                    required
                    className="w-full px-4 pr-11 py-3 bg-white text-slate-900 rounded-lg text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#253B75] font-medium transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-500 hover:text-slate-800 transition cursor-pointer"
                    aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Options Row: Remember me + Forgot password */}
              <div className="flex items-center justify-between text-xs pt-0.5">
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-3.5 h-3.5 rounded bg-slate-900 border-slate-700 text-[#253B75] focus:ring-0 cursor-pointer"
                  />
                  <span className="text-slate-300 font-medium">Lembrar-me</span>
                </label>

                <button
                  type="button"
                  onClick={() => {
                    setNewUniquePassword('');
                    setConfirmUniquePassword('');
                    setResetModalError(null);
                    setIsResetModalOpen(true);
                  }}
                  className="text-slate-400 hover:text-white transition font-medium cursor-pointer"
                >
                  Esqueceu a senha?
                </button>
              </div>

              {/* Primary Log In Button (Alto Contraste: Texto Branco Nítido em Negrito Forte) */}
              <button
                type="submit"
                id="btn-login-submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-[#25428C] hover:bg-[#1E3673] text-white font-extrabold rounded-lg text-sm shadow-md transition active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-wait mt-2 tracking-wide text-shadow"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span className="text-white font-extrabold">Entrando no sistema...</span>
                  </>
                ) : (
                  <span className="text-white font-extrabold">Acessar Sistema</span>
                )}
              </button>
            </form>
          ) : (
            /* =============================================================== */
            /* MODE: TESTE DE 15 DIAS POR CNPJ                                 */
            /* =============================================================== */
            <div className="space-y-4" id="section-login-cnpj-clean">
              <div className="space-y-1.5">
                <label htmlFor="input-cnpj-trial-clean" className="block text-xs font-semibold text-slate-200">
                  CNPJ da Empresa
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    id="input-cnpj-trial-clean"
                    value={cnpjTrialInput}
                    onChange={(e) => {
                      setCnpjTrialInput(formatCnpj(e.target.value));
                      setTrialStatus(null);
                      setShowActivationForm(false);
                    }}
                    placeholder="00.000.000/0000-00"
                    maxLength={18}
                    className="flex-1 px-4 py-3 bg-white text-slate-900 rounded-lg text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#253B75] font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => void handleCheckCnpjTrial()}
                    disabled={isCheckingCnpj || cleanCnpj(cnpjTrialInput).length !== 14}
                    className="px-5 py-3 bg-[#25428C] hover:bg-[#1E3673] disabled:opacity-50 text-white font-extrabold text-xs rounded-lg transition flex items-center gap-1.5 shrink-0 shadow-sm"
                  >
                    {isCheckingCnpj ? <RefreshCw className="w-4 h-4 animate-spin text-white" /> : <Search className="w-4 h-4 text-white" />}
                    <span className="text-white font-extrabold">Consultar</span>
                  </button>
                </div>
              </div>

              {/* Status do teste após consulta */}
              {trialStatus && trialStatus.exists && trialStatus.record && (
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white truncate">
                      {trialStatus.record.tradeName}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">
                      {trialStatus.daysRemaining} dias restantes
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleEnterTrialWithCnpj}
                    disabled={isLoading}
                    className="w-full py-2.5 bg-[#243B75] hover:bg-[#1D3162] text-white font-semibold text-xs rounded-lg transition flex items-center justify-center gap-2"
                  >
                    <span>Entrar no Ambiente de Teste</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Formulário de ativação rápida */}
              {showActivationForm && (
                <form onSubmit={handleActivateTrialSubmit} className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3 text-xs">
                  <div className="flex items-center gap-1.5 text-blue-400 font-bold">
                    <Zap className="w-3.5 h-3.5 fill-blue-400" />
                    <span>Ativar 15 Dias de Teste Gratuito</span>
                  </div>

                  <input
                    type="text"
                    value={tradeNameTrial}
                    onChange={(e) => setTradeNameTrial(e.target.value)}
                    placeholder="Nome Fantasia da Empresa *"
                    required
                    className="w-full px-3 py-2 bg-white text-slate-900 rounded-lg text-xs"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={adminNameTrial}
                      onChange={(e) => setAdminNameTrial(e.target.value)}
                      placeholder="Nome do Responsável *"
                      required
                      className="w-full px-3 py-2 bg-white text-slate-900 rounded-lg text-xs"
                    />
                    <input
                      type="text"
                      value={phoneTrial}
                      onChange={(e) => setPhoneTrial(formatPhone(e.target.value))}
                      placeholder="WhatsApp com DDD"
                      className="w-full px-3 py-2 bg-white text-slate-900 rounded-lg text-xs"
                    />
                  </div>
                  <input
                    type="email"
                    value={emailTrial}
                    onChange={(e) => setEmailTrial(e.target.value)}
                    placeholder="E-mail Corporativo *"
                    required
                    className="w-full px-3 py-2 bg-white text-slate-900 rounded-lg text-xs"
                  />

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 bg-[#243B75] hover:bg-[#1D3162] text-white font-bold text-xs rounded-lg transition"
                  >
                    {isLoading ? 'Ativando...' : 'Iniciar Teste de 15 Dias'}
                  </button>
                </form>
              )}

              <button
                type="button"
                onClick={() => setAuthMode('credentials')}
                className="w-full text-center text-xs text-slate-400 hover:text-white transition py-1"
              >
                ← Voltar para login com E-mail e Senha
              </button>
            </div>
          )}

          {/* Divider: Or continue with */}
          <div className="relative flex py-2 items-center justify-center">
            <div className="flex-grow border-t border-slate-800" />
            <span className="shrink-0 px-3 text-xs text-slate-400 font-normal">
              Ou continue com
            </span>
            <div className="flex-grow border-t border-slate-800" />
          </div>

          {/* Secondary Quick Action Buttons (Alto Contraste: Fundo com Borda Reforçada e Texto Branco Forte) */}
          <div className="grid grid-cols-2 gap-3">
            {/* Quick 1-Click Superadmin Access */}
            <button
              type="button"
              onClick={handleQuickAdminLogin}
              className="py-3 px-3.5 rounded-lg border border-slate-600 bg-[#161B2B] hover:bg-[#20273D] text-white text-xs font-extrabold flex items-center justify-center gap-2 transition cursor-pointer shadow-xs active:scale-[0.99]"
              title="Acessa imediatamente com a credencial inicial (contato.ativeads@gmail.com)"
            >
              <Zap className="w-4 h-4 text-amber-400 fill-amber-400 shrink-0" />
              <span className="text-white font-extrabold tracking-wide">1-Clique Admin</span>
            </button>

            {/* CNPJ Trial Mode Toggle */}
            <button
              type="button"
              onClick={() => setAuthMode(authMode === 'credentials' ? 'trial_cnpj' : 'credentials')}
              className="py-3 px-3.5 rounded-lg border border-slate-600 bg-[#161B2B] hover:bg-[#20273D] text-white text-xs font-extrabold flex items-center justify-center gap-2 transition cursor-pointer shadow-xs active:scale-[0.99]"
            >
              <Building2 className="w-4 h-4 text-sky-400 shrink-0" />
              <span className="text-white font-extrabold tracking-wide">{authMode === 'credentials' ? 'Teste 15d CNPJ' : 'Login E-mail'}</span>
            </button>
          </div>

          {/* Optional Branch Selector for Multi-store setups */}
          {availableBranches.length > 1 && (
            <div className="pt-2 text-center">
              <label htmlFor="select-branch-clean" className="text-[11px] text-slate-400 block mb-1">
                Filial / CD de Faturamento:
              </label>
              <select
                id="select-branch-clean"
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="w-full py-1.5 px-3 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-300 font-semibold focus:outline-none cursor-pointer"
              >
                {availableBranches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.cdCode} • {b.uf})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Help & Support Footer Link */}
          <div className="pt-3 text-center">
            <button
              type="button"
              onClick={() => openSupportModal('suporte_login')}
              className="text-xs text-slate-400 hover:text-slate-200 transition font-medium inline-flex items-center gap-1.5 cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Precisa de ajuda com o acesso ou liberação? Falar com suporte</span>
            </button>
          </div>

        </div>
      </div>

      {/* MODAL DE SUPORTE AO SUPERADMIN */}
      <SolicitarSuporteModal
        isOpen={isSupportModalOpen}
        initialType={supportModalType}
        initialCnpj={cnpjTrialInput}
        initialCompanyName={tradeNameTrial}
        onClose={() => setIsSupportModalOpen(false)}
        onSuccess={(proto) => {
          setSuccessMessage(`Solicitação ${proto} enviada ao Superadmin com sucesso!`);
        }}
      />

      {/* MODAL DE DEFINIÇÃO DE SENHA ÚNICA */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0E111A] border border-slate-800 rounded-2xl max-w-md w-full shadow-2xl p-6 text-white animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-blue-400" />
                <h3 className="font-bold text-sm text-white">
                  Cadastrar Nova Senha Única
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleDefineUniquePasswordSubmit} className="space-y-3.5 pt-4">
              {resetModalError && (
                <div className="p-2.5 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-300">
                  {resetModalError}
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Nova Senha (mínimo 8 caracteres)
                </label>
                <div className="relative">
                  <input
                    type={showUniquePassword ? 'text' : 'password'}
                    value={newUniquePassword}
                    onChange={(e) => setNewUniquePassword(e.target.value)}
                    placeholder="Digite a nova senha"
                    required
                    minLength={8}
                    className="w-full px-3 py-2 bg-white text-slate-900 rounded-lg text-xs font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowUniquePassword(!showUniquePassword)}
                    className="absolute right-2.5 top-2.5 text-slate-500"
                  >
                    {showUniquePassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Confirmar Nova Senha
                </label>
                <input
                  type={showUniquePassword ? 'text' : 'password'}
                  value={confirmUniquePassword}
                  onChange={(e) => setConfirmUniquePassword(e.target.value)}
                  placeholder="Confirme a nova senha"
                  required
                  minLength={8}
                  className="w-full px-3 py-2 bg-white text-slate-900 rounded-lg text-xs font-medium"
                />
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="submit"
                  disabled={isResettingPassword}
                  className="w-full py-2.5 bg-[#243B75] hover:bg-[#1D3162] text-white font-semibold text-xs rounded-lg transition"
                >
                  {isResettingPassword ? 'Salvando...' : 'Salvar e Acessar'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsResetModalOpen(false);
                    handleQuickAdminLogin();
                  }}
                  className="text-xs text-slate-400 hover:text-white transition py-1 text-center"
                >
                  Ou entrar com senha inicial (AcessoInicial@2026!)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
