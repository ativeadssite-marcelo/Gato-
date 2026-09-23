import React, { useState } from 'react';
import { 
  Lock, 
  Eye, 
  EyeOff, 
  RefreshCw, 
  AlertCircle, 
  ArrowRight 
} from 'lucide-react';
import gatoLogoNova from '../assets/images/gato_logo_nova.jpg';
import { BranchUnit, UserSession, CompanyProfile } from '../types';
import { INITIAL_BRANCHES, AVAILABLE_USERS, AppUser } from '../data/initialData';
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
}) => {
  // --- LOGIN DE CLIENTE EXISTENTE ---
  const availableBranches = branches && branches.length > 0 ? branches : INITIAL_BRANCHES;

  const [selectedUser] = useState<AppUser>(
    AVAILABLE_USERS.find(u => u.id === currentSession?.id) || AVAILABLE_USERS[0]
  );
  const [emailLogin, setEmailLogin] = useState(selectedUser.email);
  const [passwordLogin, setPasswordLogin] = useState('senha123456');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    currentSession?.branchId || selectedUser.defaultBranchId || 'matriz-ms'
  );

  // Feedback
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activeBranch = availableBranches.find(b => b.id === selectedBranchId) || availableBranches[0];

  // Submissão de Login com credenciais existentes
  const handleLoginExisting = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!emailLogin.trim() || !passwordLogin.trim()) {
      setErrorMessage('Informe seu e-mail e senha corporativos.');
      return;
    }

    setIsLoading(true);

    (async () => {
      try {
        // Autenticação REAL: a senha é conferida com SCrypt no servidor e a
        // sessão volta com token assinado (o localStorage é só espelho da UI).
        const result = await loginWithCredentials(
          emailLogin.trim(),
          passwordLogin,
          availableBranches,
          activeBranch.id
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
        setErrorMessage(err?.message || 'Falha no login. Verifique suas credenciais.');
      }
    })();
  };

  return (
    <div 
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center font-['Plus_Jakarta_Sans'] selection:bg-[#0284C7] selection:text-white px-4 py-10" 
      id="gato-login-page"
    >
      {/* LOGO OFICIAL — nova identidade GATO */}
      <img 
        src={gatoLogoNova} 
        alt="GATO - Gestão de Estoque e Balcão" 
        className="w-full max-w-md rounded-3xl border border-amber-500/30 shadow-[0_0_60px_-15px_rgba(249,115,22,0.5)] mb-8"
        id="img-logo-login-gato"
        referrerPolicy="no-referrer"
      />

      {/* CARD: APENAS O CAMPO DE LOGIN */}
      <div className="w-full max-w-md bg-slate-900/80 backdrop-blur border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
        <form onSubmit={handleLoginExisting} className="space-y-4" id="form-login-cliente">
          {errorMessage && (
            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400" id="alert-login-error">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div>
            <label htmlFor="input-email-login" className="text-xs font-bold text-slate-300 block mb-1">
              E-mail
            </label>
            <input
              type="email"
              id="input-email-login"
              value={emailLogin}
              onChange={(e) => setEmailLogin(e.target.value)}
              placeholder="seu.email@empresa.com.br"
              required
              className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0284C7] focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="input-password-login" className="text-xs font-bold text-slate-300 block mb-1">
              Senha
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type={showPassword ? 'text' : 'password'}
                id="input-password-login"
                value={passwordLogin}
                onChange={(e) => setPasswordLogin(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-9 pr-10 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0284C7] focus:border-transparent"
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

          <button
            type="submit"
            id="btn-submit-login-existing"
            disabled={isLoading}
            className="w-full py-3 px-4 bg-gradient-to-r from-[#0284C7] to-[#0369A1] hover:from-[#0369A1] hover:to-[#075985] text-white font-extrabold text-sm rounded-xl shadow-lg transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-wait mt-2"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Autenticando...</span>
              </>
            ) : (
              <>
                <span>Entrar no Sistema</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>

      <p className="text-[10px] text-slate-600 mt-6 tracking-wide uppercase">
        GATO SaaS • Controle hoje. Mais vendas amanhã.
      </p>
    </div>
  );
};


