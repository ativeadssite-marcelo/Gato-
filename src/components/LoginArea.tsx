import React, { useState } from 'react';
import { 
  Building2, 
  MapPin, 
  ShieldCheck, 
  CheckCircle2, 
  Store, 
  User, 
  Lock, 
  ArrowRight, 
  KeyRound, 
  FileText, 
  Percent, 
  AlertCircle,
  Truck,
  Sparkles,
  Layers,
  X,
  Rocket,
  RefreshCw,
  Car,
  Bike,
  Tractor,
  Wrench,
  Boxes,
  Zap,
  CheckCircle
} from 'lucide-react';
import { GatoBrand } from './GatoBrand';
import { BranchUnit, UserSession, CompanyProfile } from '../types';
import { INITIAL_BRANCHES, AVAILABLE_USERS, AppUser } from '../data/initialData';
import { loginWithCredentials, registerCompany, getDemoLoginConfig } from '../utils/sessionService';

interface LoginAreaProps {
  currentSession: UserSession | null;
  companyProfile?: CompanyProfile | null;
  branches?: BranchUnit[];
  onLoginSuccess: (session: UserSession, newCompany?: CompanyProfile) => void;
  onCancel?: () => void; // Permite fechar se já estiver logado
}

export const LoginArea: React.FC<LoginAreaProps> = ({
  currentSession,
  companyProfile,
  branches,
  onLoginSuccess,
  onCancel,
}) => {
  const [activeTab, setActiveTab] = useState<'cadastro' | 'login' | 'rapido'>('rapido');

  const availableBranches = branches && branches.length > 0 ? branches : INITIAL_BRANCHES;

  // --- CADASTRO DE EMPRESA & TESTE GRÁTIS ---
  const [tradeName, setTradeName] = useState(''); // NOME FANTASIA
  const [corporateName, setCorporateName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [segment, setSegment] = useState('Autopeças Leves & Acessórios');
  const [adminName, setAdminName] = useState('');
  const [emailCadastro, setEmailCadastro] = useState('');
  const [phoneCadastro, setPhoneCadastro] = useState('');
  const [stateUfCadastro, setStateUfCadastro] = useState('MS');
  const [passwordCadastro, setPasswordCadastro] = useState('');
  const [cityCadastro, setCityCadastro] = useState('Campo Grande');
  const [ie, setIe] = useState('');

  // --- LOGIN EXISTENTE ---
  const [selectedUser, setSelectedUser] = useState<AppUser>(
    AVAILABLE_USERS.find(u => u.id === currentSession?.id) || AVAILABLE_USERS[0]
  );
  const [emailInput, setEmailInput] = useState(selectedUser.email);
  const [passwordInput, setPasswordInput] = useState('••••••••');
  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    currentSession?.branchId || selectedUser.defaultBranchId || 'matriz-ms'
  );

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activeBranch = availableBranches.find(b => b.id === selectedBranchId) || availableBranches[0];

  const handleFillDemo = () => {
    setTradeName('Auto Peças São Cristóvão');
    setCorporateName('São Cristóvão Comércio de Peças LTDA');
    setCnpj('18.234.567/0001-89');
    setSegment('Autopeças Leves & Acessórios');
    setAdminName('Ricardo Silveira');
    setEmailCadastro('ricardo@autopecas.com.br');
    setPhoneCadastro('(67) 99234-5678');
    setStateUfCadastro('MS');
    setCityCadastro('Campo Grande');
    setIe('');
    // Senha não é preenchida automaticamente: o usuário escolhe a própria.
    setErrorMessage(null);
  };

  const handleRegisterCompanySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!tradeName.trim()) {
      setErrorMessage('Por favor, defina o Nome Fantasia da sua empresa.');
      return;
    }

    if (!adminName.trim() || !emailCadastro.trim()) {
      setErrorMessage('Informe o nome do responsável e o e-mail de acesso.');
      return;
    }

    if (!passwordCadastro || passwordCadastro.length < 8) {
      setErrorMessage('A senha de acesso deve ter no mínimo 8 caracteres.');
      return;
    }

    setIsLoading(true);

    (async () => {
      try {
      const newCompany: CompanyProfile = {
        id: `empresa-${Date.now()}`,
        tradeName: tradeName.trim(), // Nome Fantasia
        corporateName: corporateName.trim() || `${tradeName.trim()} Peças LTDA`,
        cnpj: cnpj || '12.345.678/0001-90',
        segment,
        phone: phoneCadastro || '(67) 3345-0000',
        email: emailCadastro.trim(),
        city: 'Campo Grande',
        uf: stateUfCadastro,
        taxRegime: 'simples_nacional',
        cnae: '45.30-7-03',
        isTrial: true,
        trialDaysRemaining: 14,
        planName: 'GATO SaaS - Teste Grátis (14 Dias)',
        createdAt: new Date().toISOString(),
      };

      // Criar a Matriz Fiscal própria para o novo cliente vendedor
      const newMatrizBranch: BranchUnit = {
        id: `matriz-${stateUfCadastro.toLowerCase()}-${Date.now()}`,
        name: `${tradeName.trim()} - Matriz (${stateUfCadastro})`,
        cnpj: cnpj || '12.345.678/0001-90',
        ie: 'ISENTO',
        isMatriz: true,
        uf: stateUfCadastro,
        city: 'Campo Grande',
        address: `Sede Central - ${tradeName.trim()}`,
        sefazCode: stateUfCadastro === 'MS' ? '50' : stateUfCadastro === 'SP' ? '35' : '42',
        icmsInterno: stateUfCadastro === 'SP' ? 18 : 17,
        cdCode: `CD-${stateUfCadastro}`,
        cdName: `CD Central Matriz ${stateUfCadastro}`,
        description: `Matriz principal e galpão de expedição da ${tradeName.trim()}`,
        status: 'ativa',
      };

        // Cadastro REAL no servidor: a conta e a senha são criadas no backend
        // (SCrypt + tenant isolado) e a sessão volta com token assinado.
        const result = await registerCompany(
          {
            tradeName: tradeName.trim(),
            corporateName: corporateName.trim() || undefined,
            cnpj: cnpj || undefined,
            stateRegistration: ie || undefined,
            segment,
            adminName: adminName.trim(),
            email: emailCadastro.trim(),
            password: passwordCadastro,
            phone: phoneCadastro || undefined,
            city: cityCadastro || undefined,
            uf: stateUfCadastro,
          },
          [newMatrizBranch, ...availableBranches.filter(b => !b.isMatriz)]
        );
        const session = result.session;

      try {
        localStorage.setItem('gato_company_profile', JSON.stringify(newCompany));
        localStorage.setItem('gato_user_session', JSON.stringify(session));
        localStorage.setItem('gato_active_store', newMatrizBranch.id);
        const existingBranches = localStorage.getItem('gato_branches');
        let branchList: BranchUnit[] = existingBranches ? JSON.parse(existingBranches) : [];
        branchList = [newMatrizBranch, ...branchList.filter(b => !b.isMatriz)];
        localStorage.setItem('gato_branches', JSON.stringify(branchList));
      } catch (err) {
        console.warn('LocalStorage error:', err);
      }

        setIsLoading(false);
        onLoginSuccess(session, newCompany);
      } catch (err: any) {
        setIsLoading(false);
        setErrorMessage(err?.message || 'Falha ao criar a conta. Verifique os dados e tente novamente.');
      }
    })();
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!emailInput.trim() || !passwordInput) {
      setErrorMessage('Informe e-mail e senha corporativos.');
      return;
    }
    setIsLoading(true);

    (async () => {
      try {
        // Autenticação REAL: senha conferida com SCrypt no servidor.
        const result = await loginWithCredentials(emailInput.trim(), passwordInput, availableBranches, activeBranch.id);
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

  const handleQuickSelectUser = async (user: AppUser) => {
    const branch = availableBranches.find(b => b.id === (user.defaultBranchId || 'matriz-ms')) || availableBranches[0];
    setIsLoading(true);
    setErrorMessage(null);
    try {
      // Acesso rápido também exige autenticação no servidor — antes qualquer
      // visitante assumia o papel escolhido apenas editando o estado local.
      const demo = getDemoLoginConfig();
      if (!demo.enabled) {
        throw new Error('Login rápido desabilitado. Use e-mail e senha para autenticar.');
      }
      const result = await loginWithCredentials(user.email, demo.password, availableBranches, branch.id);
      try {
        localStorage.setItem('gato_user_session', JSON.stringify(result.session));
        localStorage.setItem('gato_active_store', branch.id);
      } catch (err) {
        console.warn('LocalStorage error:', err);
      }
      setIsLoading(false);
      onLoginSuccess(result.session);
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err?.message || 'Login rápido indisponível. Autentique-se com e-mail e senha.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto" id="gato-login-modal">
      <div className="bg-white rounded-3xl max-w-xl w-full text-slate-800 shadow-2xl border border-slate-100 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Chamativo Hero Header */}
        <div className="bg-gradient-to-r from-[#0C4A6E] via-[#073047] to-slate-900 p-5 text-white relative overflow-hidden">
          <div className="flex items-center justify-between relative z-10">
            <GatoBrand size="md" showSubtitle={true} />
            <button
              type="button"
              id="btn-close-login-modal"
              onClick={onCancel || (() => handleQuickSelectUser(AVAILABLE_USERS[0]))}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              title="Fechar e Abrir Sistema"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-3 relative z-10 flex items-center justify-between">
            <div>
              <p className="text-xs text-sky-200 font-semibold">
                SaaS de Balcão, Estoque & Aplicação de Peças
              </p>
              <h2 className="text-base sm:text-lg font-black text-white mt-0.5">
                {activeTab === 'cadastro' ? 'Cadastre sua Empresa • Teste 14 Dias Grátis' : 'Acesse sua Conta no GATO SaaS'}
              </h2>
            </div>
            <div className="hidden sm:flex items-center gap-1 bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-1 rounded-full uppercase">
              <Sparkles className="w-3 h-3 fill-slate-950" />
              <span>Sem Cartão</span>
            </div>
          </div>
        </div>

        {/* Fast Entry Bar */}
        <div className="bg-sky-50 px-5 py-2.5 border-b border-sky-200 flex items-center justify-between gap-3">
          <div className="text-xs">
            <span className="font-extrabold text-[#0C4A6E] block">Ambiente Operacional Pronto</span>
            <span className="text-[10px] text-slate-500">Acesso direto ao balcão e estoque</span>
          </div>
          <button
            type="button"
            id="btn-modal-open-system"
            onClick={onCancel || (() => handleQuickSelectUser(AVAILABLE_USERS[0]))}
            className="px-3.5 py-1.5 bg-[#0284C7] hover:bg-[#0284C7]/90 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
            <span>Entrar no Sistema</span>
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-100 bg-slate-50 p-1.5 gap-1">
          <button
            type="button"
            onClick={() => { setActiveTab('cadastro'); setErrorMessage(null); }}
            className={`flex-1 py-2 px-2 text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'cadastro'
                ? 'bg-[#0C4A6E] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Rocket className="w-3.5 h-3.5 text-amber-400" />
            <span>Cadastrar Empresa (14 Dias Grátis)</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('login'); setErrorMessage(null); }}
            className={`py-2 px-3 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1 cursor-pointer ${
              activeTab === 'login'
                ? 'bg-[#0C4A6E] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Entrar</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('rapido'); setErrorMessage(null); }}
            className={`py-2 px-3 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1 cursor-pointer ${
              activeTab === 'rapido'
                ? 'bg-[#0C4A6E] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Demo</span>
          </button>
        </div>

        {/* Modal Form Body */}
        <div className="p-5 max-h-[75vh] overflow-y-auto">
          {errorMessage && (
            <div className="mb-3 p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* TAB 1: CADASTRO DE EMPRESA & NOME FANTASIA */}
          {activeTab === 'cadastro' && (
            <form onSubmit={handleRegisterCompanySubmit} className="space-y-3.5">
              <div className="bg-sky-50/80 p-3 rounded-xl border border-sky-300">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-black text-[#0C4A6E] flex items-center gap-1.5 uppercase">
                    <Store className="w-3.5 h-3.5 text-[#0284C7]" />
                    Nome Fantasia da Empresa *
                  </label>
                  <span className="text-[9px] font-black bg-[#0284C7] text-white px-1.5 py-0.2 rounded">
                    Identificador de Marca
                  </span>
                </div>
                <input
                  type="text"
                  value={tradeName}
                  onChange={(e) => setTradeName(e.target.value)}
                  placeholder="Ex: Auto Peças São Cristóvão, Motopeças Brasil..."
                  required
                  className="w-full px-3 py-2 bg-white border border-sky-200 rounded-lg text-xs font-black text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0C4A6E]"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  O nome fantasia que seus clientes e o balcão verão nos orçamentos e relatórios.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Razão Social Oficial
                  </label>
                  <input
                    type="text"
                    value={corporateName}
                    onChange={(e) => setCorporateName(e.target.value)}
                    placeholder="Ex: Peças & Serviços LTDA"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    CNPJ da Empresa
                  </label>
                  <input
                    type="text"
                    value={cnpj}
                    onChange={(e) => setCnpj(e.target.value)}
                    placeholder="00.000.000/0000-00"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Nome do Proprietário / Gerente *
                  </label>
                  <input
                    type="text"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    placeholder="Ex: Ricardo Silveira"
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    E-mail Corporativo *
                  </label>
                  <input
                    type="email"
                    value={emailCadastro}
                    onChange={(e) => setEmailCadastro(e.target.value)}
                    placeholder="contato@empresa.com.br"
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    WhatsApp / Telefone
                  </label>
                  <input
                    type="text"
                    value={phoneCadastro}
                    onChange={(e) => setPhoneCadastro(e.target.value)}
                    placeholder="(00) 00000-0000"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Estado (UF) do CD / Matriz
                  </label>
                  <select
                    value={stateUfCadastro}
                    onChange={(e) => setStateUfCadastro(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                  >
                    <option value="MS">Mato Grosso do Sul (MS)</option>
                    <option value="SP">São Paulo (SP)</option>
                    <option value="SC">Santa Catarina (SC)</option>
                    <option value="PR">Paraná (PR)</option>
                    <option value="MT">Mato Grosso (MT)</option>
                    <option value="MG">Minas Gerais (MG)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Senha de Acesso do Administrador *
                </label>
                <input
                  type="password"
                  value={passwordCadastro}
                  onChange={(e) => setPasswordCadastro(e.target.value)}
                  placeholder="Mínimo 8 caracteres (letras e números)"
                  minLength={8}
                  autoComplete="new-password"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  A senha é conferida com segurança no servidor (SCrypt) — nunca fica guardada no navegador.
                </p>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleFillDemo}
                  className="text-[11px] font-extrabold text-[#0284C7] hover:underline flex items-center gap-1"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  <span>Preencher Exemplo de Empresa para Teste Rápido</span>
                </button>
                <span className="text-[10px] text-emerald-700 font-bold">14 Dias Grátis</span>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-sky-700 hover:from-amber-600 hover:to-sky-800 text-slate-950 hover:text-white font-black text-xs sm:text-sm rounded-xl shadow-md transition active:scale-98 flex items-center justify-center gap-2 cursor-pointer mt-1"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Cadastrando...</span>
                  </>
                ) : (
                  <>
                    <Rocket className="w-4 h-4 fill-current" />
                    <span>Criar Empresa & Iniciar Teste Grátis no GATO</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* TAB 2: LOGIN */}
          {activeTab === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">E-mail</label>
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="seu.email@empresa.com.br"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Senha</label>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Filial / CD:</label>
                <select
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                >
                  {availableBranches.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.cdCode} • {b.uf})
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-[#0C4A6E] hover:bg-[#073047] text-white font-extrabold text-xs rounded-xl shadow-xs transition cursor-pointer"
              >
                Acessar Sistema
              </button>
            </form>
          )}

          {/* TAB 3: DEMO */}
          {activeTab === 'rapido' && (
            <div className="space-y-2.5">
              <p className="text-xs text-slate-600 mb-2">Selecione um perfil para acesso em 1-clique:</p>
              {AVAILABLE_USERS.map((user) => (
                <div
                  key={user.id}
                  onClick={() => { void handleQuickSelectUser(user); }}
                  className="p-2.5 bg-slate-50 hover:bg-sky-50 border border-slate-200 hover:border-sky-300 rounded-xl transition cursor-pointer flex items-center gap-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#0C4A6E] text-white font-black text-xs flex items-center justify-center shrink-0">
                    {user.avatarInitials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <strong className="text-xs text-slate-900 block truncate">{user.name}</strong>
                    <span className="text-[10px] text-[#0284C7] font-semibold block truncate">{user.roleLabel}</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-100 text-center text-[10px] text-slate-400">
          GATO SaaS • Autopeças, Motopeças & Frota Nacional
        </div>
      </div>
    </div>
  );
};
