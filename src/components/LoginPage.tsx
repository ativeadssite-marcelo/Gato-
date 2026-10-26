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
  Mail
} from 'lucide-react';
import gatoLogoNova from '../assets/images/gato_logo_2026.png';
import { BranchUnit, UserSession, CompanyProfile } from '../types';
import { INITIAL_BRANCHES } from '../data/initialData';
import { loginWithCredentials } from '../utils/sessionService';

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
  const availableBranches = branches && branches.length > 0 ? branches : INITIAL_BRANCHES;

  const [emailLogin, setEmailLogin] = useState('');
  const [passwordLogin, setPasswordLogin] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    currentSession?.branchId || availableBranches[0]?.id || 'matriz-ms'
  );

  // Feedback
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activeBranch = availableBranches.find(b => b.id === selectedBranchId) || availableBranches[0];

  // Executa o login corporativo
  const executeLogin = async (emailToUse: string, passwordToUse: string, branchIdToUse?: string) => {
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const targetBranchId = branchIdToUse || activeBranch?.id || 'matriz-ms';
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
        className="w-full max-w-xs sm:max-w-sm rounded-3xl border border-amber-500/30 shadow-[0_0_50px_-15px_rgba(249,115,22,0.4)] mb-6"
        id="img-logo-login-gato"
        referrerPolicy="no-referrer"
      />

      {/* CARD DO FORMULÁRIO DE LOGIN DE PRODUÇÃO */}
      <div className="w-full max-w-md bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div>
          <h1 className="text-xl font-extrabold text-white text-center tracking-tight">
            Acesso Corporativo
          </h1>
          <p className="text-xs text-slate-400 text-center mt-1.5">
            Informe suas credenciais corporativas para acessar o sistema
          </p>
        </div>

        {errorMessage && (
          <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 animate-in fade-in duration-150" id="alert-login-error">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleLoginExisting} className="space-y-4" id="form-login-cliente">
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

        <div className="pt-2 border-t border-slate-800 text-center">
          <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Ambiente Seguro • Autenticação Criptográfica SCrypt</span>
          </p>
        </div>
      </div>

      <p className="text-[10px] text-slate-500 mt-6 tracking-wide uppercase text-center">
        GATO SaaS • Gestão de Estoque, Balcão & Frota Nacional
      </p>
    </div>
  );
};
