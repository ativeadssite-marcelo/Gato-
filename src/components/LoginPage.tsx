import React, { useState } from 'react';
import { 
  Lock, 
  Eye, 
  EyeOff, 
  RefreshCw, 
  AlertCircle, 
  ArrowRight,
  ArrowLeft,
  X,
  ShieldCheck,
  Building2,
  Mail,
  Sparkles,
  Search,
  CheckCircle2,
  Clock,
  HelpCircle,
  Phone,
  User,
  Zap
} from 'lucide-react';
import gatoLogoNova from '../assets/images/gato_logo_2026.png';
import { BranchUnit, UserSession, CompanyProfile } from '../types';
import { INITIAL_BRANCHES } from '../data/initialData';
import { loginWithCredentials } from '../utils/sessionService';
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

  // Modo de Login: 'corporativo' ou 'teste_cnpj'
  const [activeTab, setActiveTab] = useState<'corporativo' | 'teste_cnpj'>('corporativo');

  // --- LOGIN CORPORATIVO TRADICIONAL ---
  const [emailLogin, setEmailLogin] = useState('');
  const [passwordLogin, setPasswordLogin] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    currentSession?.branchId || availableBranches[0]?.id || ''
  );

  // --- TESTE DE 15 DIAS POR CNPJ ---
  const [cnpjTrialInput, setCnpjTrialInput] = useState('');
  const [trialStatus, setTrialStatus] = useState<TrialStatusResponse | null>(null);
  const [isCheckingCnpj, setIsCheckingCnpj] = useState(false);

  // Ativação rápida se o CNPJ não tiver teste ainda
  const [showActivationForm, setShowActivationForm] = useState(false);
  const [tradeNameTrial, setTradeNameTrial] = useState('');
  const [adminNameTrial, setAdminNameTrial] = useState('');
  const [emailTrial, setEmailTrial] = useState('');
  const [phoneTrial, setPhoneTrial] = useState('');
  const [ufTrial, setUfTrial] = useState('MS');

  // --- MODAL DE SUPORTE / SOLICITAÇÃO AO SUPERADMIN ---
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [supportModalType, setSupportModalType] = useState<'teste_15_dias' | 'suporte_login' | 'liberacao_cnpj' | 'extensao_teste'>('teste_15_dias');

  // Feedback geral
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const activeBranch = availableBranches.find(b => b.id === selectedBranchId) || availableBranches[0];

  // Executa o login corporativo normal
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

  const handleLoginExisting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailLogin.trim() || !passwordLogin.trim()) {
      setErrorMessage('Informe seu e-mail corporativo e senha.');
      return;
    }
    void executeLogin(emailLogin, passwordLogin);
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

  // Entrar com CNPJ de teste já cadastrado
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

  // Ativar teste de 15 dias para o CNPJ
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

  return (
    <div 
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center font-['Plus_Jakarta_Sans'] selection:bg-[#0284C7] selection:text-white px-4 py-8" 
      id="gato-login-page"
    >
      {/* Botão de retorno caso o usuário já possua sessão ativa */}
      {currentSession && onBackToApp && (
        <div className="w-full max-w-md flex items-center justify-between mb-4">
          <button
            type="button"
            id="btn-voltar-ao-sistema"
            onClick={onBackToApp}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 text-xs font-bold transition shadow-md cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-[#0284C7]" />
            <span>Voltar ao Painel ({currentSession.name.split(' ')[0]})</span>
          </button>

          <button
            type="button"
            id="btn-fechar-login"
            onClick={onBackToApp}
            className="p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700 transition cursor-pointer"
            title="Fechar tela de login e voltar ao sistema"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* LOGO OFICIAL GATO */}
      <img 
        src={gatoLogoNova} 
        alt="GATO - Gestão de Estoque e Balcão" 
        className="w-full max-w-xs sm:max-w-sm rounded-3xl border border-amber-500/30 shadow-[0_0_50px_-15px_rgba(249,115,22,0.4)] mb-5"
        id="img-logo-login-gato"
        referrerPolicy="no-referrer"
      />

      {/* CARD PRINCIPAL DE LOGIN & TESTE 15 DIAS */}
      <div className="w-full max-w-md bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
        
        {/* TABS DE SELEÇÃO: ACESSO CORPORATIVO vs TESTE 15 DIAS POR CNPJ */}
        <div className="flex p-1 bg-slate-950 border border-slate-800 rounded-2xl gap-1">
          <button
            type="button"
            onClick={() => {
              setActiveTab('corporativo');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'corporativo'
                ? 'bg-gradient-to-r from-[#0C4A6E] to-[#0284C7] text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            id="tab-acesso-corporativo"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Acesso Corporativo</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('teste_cnpj');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-1.5 cursor-pointer relative ${
              activeTab === 'teste_cnpj'
                ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-slate-950 font-black shadow-md'
                : 'text-amber-400/90 hover:text-amber-300'
            }`}
            id="tab-teste-15-dias-cnpj"
          >
            <Sparkles className="w-3.5 h-3.5 fill-current" />
            <span>Teste 15 Dias (CNPJ)</span>
          </button>
        </div>

        {/* MENSAGEM DE ERRO OU SUCESSO */}
        {errorMessage && (
          <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 animate-in fade-in duration-150" id="alert-login-error">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="flex items-start gap-2 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 animate-in fade-in duration-150">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ABA 1: ACESSO CORPORATIVO (E-mail + Senha + CD) */}
        {/* ========================================================================= */}
        {activeTab === 'corporativo' && (
          <form onSubmit={handleLoginExisting} className="space-y-4" id="form-login-cliente">
            <div className="text-center pb-1">
              <h1 className="text-lg font-extrabold text-white tracking-tight">
                Entrar com Credenciais
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Acesse sua empresa ou CD com e-mail corporativo e senha
              </p>
            </div>

            {/* E-mail */}
            <div>
              <label htmlFor="input-email-login" className="text-xs font-bold text-slate-300 block mb-1">
                E-mail Corporativo
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="email"
                  id="input-email-login"
                  value={emailLogin}
                  onChange={(e) => setEmailLogin(e.target.value)}
                  placeholder="seu.email@empresa.com.br"
                  autoComplete="email"
                  required
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0284C7] focus:border-transparent font-medium"
                />
              </div>
            </div>

            {/* Senha */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="input-password-login" className="text-xs font-bold text-slate-300 block">
                  Senha de Acesso
                </label>
                <span className="text-[10px] text-slate-400 font-semibold bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/60">
                  Protegido LGPD
                </span>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="input-password-login"
                  value={passwordLogin}
                  onChange={(e) => setPasswordLogin(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0284C7] focus:border-transparent font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 cursor-pointer"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Filial / CD */}
            {availableBranches.length > 0 ? (
              <div>
                <label htmlFor="select-branch-login" className="text-xs font-bold text-slate-300 block mb-1">
                  Filial / Centro de Distribuição
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <select
                    id="select-branch-login"
                    value={selectedBranchId}
                    onChange={(e) => setSelectedBranchId(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0284C7] focus:border-transparent font-bold cursor-pointer"
                  >
                    {availableBranches.map((b) => (
                      <option key={b.id} value={b.id} className="bg-slate-900 text-slate-100">
                        {b.name} ({b.cdCode} • {b.uf})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                  <Building2 className="w-4 h-4 text-sky-400 shrink-0" />
                  <span>Base Limpa • Filial Principal será configurada após o acesso</span>
                </div>
              </div>
            )}

            {/* Botão de Entrar */}
            <button
              type="submit"
              id="btn-submit-login-existing"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-gradient-to-r from-[#0C4A6E] via-[#0284C7] to-indigo-600 hover:opacity-95 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-sky-600/20 transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-wait mt-2"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Autenticando sessão...</span>
                </>
              ) : (
                <>
                  <span>Acessar Sistema</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* ========================================================================= */}
        {/* ABA 2: TESTE DE 15 DIAS POR CNPJ CADASTRADO */}
        {/* ========================================================================= */}
        {activeTab === 'teste_cnpj' && (
          <div className="space-y-4" id="section-teste-15-dias-cnpj">
            <div className="text-center pb-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-black uppercase mb-1">
                <Sparkles className="w-3 h-3 fill-amber-400" />
                <span>15 Dias de Acesso Gratuito</span>
              </div>
              <h2 className="text-lg font-extrabold text-white tracking-tight">
                Acesse pelo CNPJ Cadastrado
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Consulte ou ative seu período de 15 dias de teste grátis
              </p>
            </div>

            {/* Formulário de Consulta de CNPJ */}
            <div className="space-y-2">
              <label htmlFor="input-cnpj-trial" className="text-xs font-bold text-slate-300 block">
                CNPJ da sua Empresa
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Building2 className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    id="input-cnpj-trial"
                    value={cnpjTrialInput}
                    onChange={(e) => {
                      setCnpjTrialInput(formatCnpj(e.target.value));
                      setTrialStatus(null);
                      setShowActivationForm(false);
                    }}
                    placeholder="00.000.000/0000-00"
                    maxLength={18}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder:text-slate-500 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void handleCheckCnpjTrial()}
                  disabled={isCheckingCnpj || cleanCnpj(cnpjTrialInput).length !== 14}
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed shrink-0"
                  id="btn-consultar-cnpj-teste"
                >
                  {isCheckingCnpj ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Search className="w-3.5 h-3.5" />
                  )}
                  <span>Consultar</span>
                </button>
              </div>
            </div>

            {/* STATUS DO TESTE APÓS CONSULTA */}
            {trialStatus && trialStatus.exists && trialStatus.record && (
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-white">
                    {trialStatus.record.tradeName}
                  </span>
                  {trialStatus.isExpired ? (
                    <span className="px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 text-[10px] font-black uppercase flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Expirado
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-black uppercase flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Teste Ativo
                    </span>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1">
                  <div className="flex justify-between text-slate-400">
                    <span>Responsável:</span>
                    <span className="text-slate-200 font-medium">{trialStatus.record.adminName}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Início do Teste:</span>
                    <span className="text-slate-200">
                      {new Date(trialStatus.record.createdAt).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Período Restante:</span>
                    <span className={`font-bold ${trialStatus.isExpired ? 'text-red-400' : 'text-amber-400'}`}>
                      {trialStatus.isExpired
                        ? '0 dias (Período de 15 dias encerrado)'
                        : `${trialStatus.daysRemaining} dias restantes de 15`}
                    </span>
                  </div>
                </div>

                {trialStatus.isExpired ? (
                  <div className="space-y-2">
                    <p className="text-[11px] text-red-300 leading-snug">
                      O teste gratuito de 15 dias para este CNPJ terminou. Solicite renovação ou a contratação da plataforma ao Superadmin.
                    </p>
                    <button
                      type="button"
                      onClick={() => openSupportModal('extensao_teste')}
                      className="w-full py-2.5 px-3 bg-gradient-to-r from-red-600 to-amber-600 hover:opacity-95 text-white font-extrabold text-xs rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5 fill-white" />
                      <span>Solicitar Extensão / Falar com Superadmin</span>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleEnterTrialWithCnpj}
                    disabled={isLoading}
                    className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-600 hover:opacity-95 text-white font-black text-xs rounded-xl shadow-lg transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    id="btn-entrar-teste-ativo"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Carregando ambiente de teste...</span>
                      </>
                    ) : (
                      <>
                        <span>Acessar Teste de 15 Dias ({trialStatus.daysRemaining} dias restantes)</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                )}
              </div>
            )}

            {/* FORMULÁRIO RÁPIDO DE ATIVAÇÃO SE O CNPJ NÃO POSSUIR TESTE */}
            {showActivationForm && (
              <form onSubmit={handleActivateTrialSubmit} className="p-4 rounded-2xl bg-slate-950 border border-amber-500/30 space-y-3 animate-in fade-in duration-200">
                <div className="flex items-center gap-2 text-amber-400">
                  <Zap className="w-4 h-4 fill-amber-400" />
                  <span className="text-xs font-black uppercase">
                    Ativação Rápida de 15 Dias Grátis
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-snug">
                  Este CNPJ ainda não iniciou o teste. Preencha os dados abaixo para liberar o acesso por 15 dias imediatamente:
                </p>

                {/* Nome Fantasia */}
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Nome Fantasia da Empresa *
                  </label>
                  <input
                    type="text"
                    value={tradeNameTrial}
                    onChange={(e) => setTradeNameTrial(e.target.value)}
                    placeholder="Ex: Auto Peças & Mecânica Central"
                    required
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Responsável & WhatsApp */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">
                      Nome do Responsável *
                    </label>
                    <input
                      type="text"
                      value={adminNameTrial}
                      onChange={(e) => setAdminNameTrial(e.target.value)}
                      placeholder="Ex: Carlos Andrade"
                      required
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">
                      WhatsApp com DDD
                    </label>
                    <input
                      type="text"
                      value={phoneTrial}
                      onChange={(e) => setPhoneTrial(formatPhone(e.target.value))}
                      placeholder="(00) 00000-0000"
                      maxLength={15}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                {/* E-mail & UF */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-2">
                    <label className="text-xs font-bold text-slate-300 block mb-1">
                      E-mail Corporativo *
                    </label>
                    <input
                      type="email"
                      value={emailTrial}
                      onChange={(e) => setEmailTrial(e.target.value)}
                      placeholder="contato@empresa.com.br"
                      required
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">
                      UF (Estado)
                    </label>
                    <select
                      value={ufTrial}
                      onChange={(e) => setUfTrial(e.target.value)}
                      className="w-full px-2 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                    >
                      <option value="MS">MS</option>
                      <option value="SP">SP</option>
                      <option value="SC">SC</option>
                      <option value="PR">PR</option>
                      <option value="MT">MT</option>
                      <option value="MG">MG</option>
                      <option value="RJ">RJ</option>
                      <option value="GO">GO</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-lg transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-1"
                  id="btn-ativar-teste-15-dias"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Ativando 15 dias de teste...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 fill-slate-950" />
                      <span>Iniciar Teste Grátis de 15 Dias Agora</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* BOTÕES DE SUPORTE & SOLICITAR TESTE POR 15 DIAS (COMUNICAÇÃO COM SUPERADMIN) */}
        {/* ========================================================================= */}
        <div className="pt-3 border-t border-slate-800 space-y-2.5">
          <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex flex-col gap-2">
            <span className="text-[11px] font-bold text-slate-300 text-center">
              Ainda não tem acesso ou precisa de ajuda técnica?
            </span>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => openSupportModal('teste_15_dias')}
                className="py-2 px-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-extrabold text-[11px] transition flex items-center justify-center gap-1.5 cursor-pointer text-center"
                id="btn-solicitar-teste-15-dias"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Solicite Teste 15 Dias</span>
              </button>

              <button
                type="button"
                onClick={() => openSupportModal('suporte_login')}
                className="py-2 px-2.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-300 font-extrabold text-[11px] transition flex items-center justify-center gap-1.5 cursor-pointer text-center"
                id="btn-suporte-superadmin"
              >
                <HelpCircle className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span>Suporte / Superadmin</span>
              </button>
            </div>
          </div>

          <div className="text-center">
            <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Ambiente Seguro • Autenticação Criptográfica SCrypt</span>
            </p>
          </div>
        </div>
      </div>

      <p className="text-[10px] text-slate-500 mt-6 tracking-wide uppercase text-center">
        GATO SaaS • Gestão de Estoque, Balcão & Frota Nacional
      </p>

      {/* MODAL DE SUPORTE & SOLICITAÇÃO AO SUPERADMIN */}
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
    </div>
  );
};
