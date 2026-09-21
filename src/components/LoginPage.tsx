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
  Eye, 
  EyeOff, 
  Layers, 
  AlertCircle, 
  Sparkles, 
  Truck, 
  Database, 
  HelpCircle, 
  Check, 
  RefreshCw, 
  KeyRound, 
  ArrowLeft,
  ChevronRight,
  Boxes,
  Percent,
  Rocket,
  Wrench,
  Bike,
  Tractor,
  Car,
  BadgePercent,
  CheckCircle,
  FileText,
  Phone,
  Mail,
  Zap
} from 'lucide-react';
import { GatoBrand } from './GatoBrand';
import { BranchUnit, UserSession, CompanyProfile } from '../types';
import { INITIAL_BRANCHES, AVAILABLE_USERS, AppUser } from '../data/initialData';

interface LoginPageProps {
  currentSession: UserSession | null;
  companyProfile?: CompanyProfile | null;
  branches?: BranchUnit[];
  onLoginSuccess: (session: UserSession, newCompany?: CompanyProfile) => void;
  onBackToApp?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  currentSession,
  companyProfile,
  branches,
  onLoginSuccess,
  onBackToApp,
}) => {
  // Modo de tela: 'login' (Credenciais corporativas - padrão de produção), 'cadastro' (Criar Conta & Nova Empresa), 'rapido' (Acesso Administrativo)
  const [activeTab, setActiveTab] = useState<'cadastro' | 'login' | 'rapido'>('login');

  const availableBranches = branches && branches.length > 0 ? branches : INITIAL_BRANCHES;

  // --- FORMULÁRIO DE CADASTRO DE EMPRESA & TESTE GRÁTIS ---
  const [tradeName, setTradeName] = useState(''); // NOME FANTASIA (Principal identificador)
  const [corporateName, setCorporateName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [ie, setIe] = useState('');
  const [segment, setSegment] = useState('Autopeças Leves & Acessórios');
  const [adminName, setAdminName] = useState('');
  const [phone, setPhone] = useState('');
  const [emailCadastro, setEmailCadastro] = useState('');
  const [passwordCadastro, setPasswordCadastro] = useState('');
  const [stateUfCadastro, setStateUfCadastro] = useState('MS');
  const [cityCadastro, setCityCadastro] = useState('Campo Grande');

  // --- FORMULÁRIO DE LOGIN DE CLIENTE EXISTENTE ---
  const [selectedUser, setSelectedUser] = useState<AppUser>(
    AVAILABLE_USERS.find(u => u.id === currentSession?.id) || AVAILABLE_USERS[0]
  );
  const [emailLogin, setEmailLogin] = useState(selectedUser.email);
  const [passwordLogin, setPasswordLogin] = useState('senha123456');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    currentSession?.branchId || selectedUser.defaultBranchId || 'matriz-ms'
  );
  const [filterStateUf, setFilterStateUf] = useState<string>('todos');

  // Feedback e Modal
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  const activeBranch = availableBranches.find(b => b.id === selectedBranchId) || availableBranches[0];

  const filteredBranches = filterStateUf === 'todos'
    ? availableBranches
    : availableBranches.filter(b => b.uf === filterStateUf);

  // Formatação rápida de CNPJ
  const handleCnpjChange = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 14);
    let formatted = raw;
    if (raw.length > 2) formatted = `${raw.slice(0, 2)}.${raw.slice(2)}`;
    if (raw.length > 5) formatted = `${raw.slice(0, 2)}.${raw.slice(2, 5)}.${raw.slice(5)}`;
    if (raw.length > 8) formatted = `${raw.slice(0, 2)}.${raw.slice(2, 5)}.${raw.slice(5, 8)}/${raw.slice(8)}`;
    if (raw.length > 12) formatted = `${raw.slice(0, 2)}.${raw.slice(2, 5)}.${raw.slice(5, 8)}/${raw.slice(8, 12)}-${raw.slice(12, 14)}`;
    setCnpj(formatted);
  };

  // Formatação rápida de Telefone
  const handlePhoneChange = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 11);
    let formatted = raw;
    if (raw.length > 2) formatted = `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
    if (raw.length > 7) formatted = `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7, 11)}`;
    setPhone(formatted);
  };

  // Submissão do Cadastro de Empresa & Início do Teste Grátis
  const handleRegisterCompany = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!tradeName.trim()) {
      setErrorMessage('Por favor, informe o Nome Fantasia da sua empresa (ex: Auto Peças Central, Motopeças Veloz).');
      return;
    }

    if (!adminName.trim()) {
      setErrorMessage('Informe o nome do responsável ou proprietário da empresa.');
      return;
    }

    if (!emailCadastro.trim() || !emailCadastro.includes('@')) {
      setErrorMessage('Informe um e-mail válido para criar o login do administrador.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      // 1. Criar novo perfil da empresa
      const newCompany: CompanyProfile = {
        id: `empresa-${Date.now()}`,
        tradeName: tradeName.trim(), // Nome Fantasia
        corporateName: corporateName.trim() || `${tradeName.trim()} Comércio de Peças LTDA`,
        cnpj: cnpj || '12.345.678/0001-90',
        stateRegistration: ie || 'ISENTO',
        segment,
        phone: phone || '(67) 3345-0000',
        email: emailCadastro.trim(),
        city: cityCadastro || 'Campo Grande',
        uf: stateUfCadastro || 'MS',
        address: 'Sede Principal Cadastrada no GATO',
        taxRegime: 'simples_nacional',
        cnae: '45.30-7-03',
        isTrial: true,
        trialDaysRemaining: 14,
        planName: 'GATO SaaS - Teste Grátis (14 Dias)',
        createdAt: new Date().toISOString(),
      };

      // Criar a Matriz Fiscal própria para o novo cliente vendedor
      const newMatrizBranch: BranchUnit = {
        id: `matriz-${(stateUfCadastro || 'ms').toLowerCase()}-${Date.now()}`,
        name: `${tradeName.trim()} - Matriz (${stateUfCadastro || 'MS'})`,
        cnpj: cnpj || '12.345.678/0001-90',
        ie: ie || 'ISENTO',
        isMatriz: true,
        uf: stateUfCadastro || 'MS',
        city: cityCadastro || 'Campo Grande',
        address: `${cityCadastro || 'Campo Grande'}/${stateUfCadastro || 'MS'}`,
        sefazCode: stateUfCadastro === 'MS' ? '50' : stateUfCadastro === 'SP' ? '35' : '42',
        icmsInterno: stateUfCadastro === 'SP' ? 18 : 17,
        cdCode: `CD-${stateUfCadastro || 'MS'}`,
        cdName: `CD Central Matriz ${stateUfCadastro || 'MS'}`,
        description: `Matriz principal e galpão de expedição da ${tradeName.trim()}`,
        status: 'ativa',
      };

      // 2. Criar sessão de administrador
      const initials = adminName
        .split(' ')
        .map(w => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase() || 'AD';

      const session: UserSession = {
        id: `user-${Date.now()}`,
        name: adminName.trim(),
        email: emailCadastro.trim(),
        role: 'administrador',
        roleLabel: 'Diretor / Proprietário (Admin)',
        branchId: newMatrizBranch.id,
        branchUf: newMatrizBranch.uf,
        branchName: newMatrizBranch.name,
        cdName: newMatrizBranch.cdName,
        cdCode: newMatrizBranch.cdCode,
        avatarInitials: initials,
        loginTime: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      };

      // 3. Persistir no localStorage
      try {
        localStorage.setItem('gato_company_profile', JSON.stringify(newCompany));
        localStorage.setItem('gato_user_session', JSON.stringify(session));
        localStorage.setItem('gato_active_store', newMatrizBranch.id);
        const existingBranchesStr = localStorage.getItem('gato_branches');
        let branchList: BranchUnit[] = existingBranchesStr ? JSON.parse(existingBranchesStr) : [];
        branchList = [newMatrizBranch, ...branchList.filter(b => !b.isMatriz)];
        localStorage.setItem('gato_branches', JSON.stringify(branchList));
      } catch (err) {
        console.warn('LocalStorage error:', err);
      }

      setIsLoading(false);
      setSuccessMessage(`Empresa "${newCompany.tradeName}" cadastrada com sucesso! Seu teste de 14 dias está ativo.`);

      setTimeout(() => {
        onLoginSuccess(session, newCompany);
      }, 700);
    }, 800);
  };

  // Submissão de Login com credenciais existentes
  const handleLoginExisting = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!emailLogin.trim() || !passwordLogin.trim()) {
      setErrorMessage('Informe seu e-mail e senha corporativos.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const session: UserSession = {
        id: selectedUser.id,
        name: emailLogin.includes('@')
          ? (emailLogin.split('@')[0].replace('.', ' ').replace(/^\w/, c => c.toUpperCase()))
          : selectedUser.name,
        email: emailLogin || selectedUser.email,
        role: selectedUser.role,
        roleLabel: selectedUser.roleLabel,
        branchId: activeBranch.id,
        branchUf: activeBranch.uf,
        branchName: activeBranch.name,
        cdName: activeBranch.cdName,
        cdCode: activeBranch.cdCode,
        avatarInitials: selectedUser.avatarInitials,
        loginTime: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      };

      try {
        localStorage.setItem('gato_user_session', JSON.stringify(session));
        localStorage.setItem('gato_active_store', session.branchId);
      } catch (err) {
        console.warn('LocalStorage error:', err);
      }

      setIsLoading(false);
      onLoginSuccess(session);
    }, 600);
  };

  // Login Rápido (1-Clique Demo)
  const handleQuickLogin = (user: AppUser) => {
    setSelectedUser(user);
    const branch = availableBranches.find(b => b.id === (user.defaultBranchId || 'matriz-ms')) || availableBranches[0];

    const session: UserSession = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      roleLabel: user.roleLabel,
      branchId: branch.id,
      branchUf: branch.uf,
      branchName: branch.name,
      cdName: branch.cdName,
      cdCode: branch.cdCode,
      avatarInitials: user.avatarInitials,
      loginTime: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };

    try {
      localStorage.setItem('gato_user_session', JSON.stringify(session));
      localStorage.setItem('gato_active_store', session.branchId);
    } catch (err) {
      console.warn('LocalStorage error:', err);
    }

    onLoginSuccess(session);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-['Plus_Jakarta_Sans'] selection:bg-[#0284C7] selection:text-white" id="gato-login-page">
      
      {/* Top Banner chamativo com Destaque do Teste Grátis */}
      <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-sky-600 text-slate-950 text-xs font-black py-2 px-4 shadow-md flex items-center justify-center gap-2 text-center">
        <Sparkles className="w-4 h-4 text-slate-950 fill-slate-950 shrink-0" />
        <span>GATO SaaS para Autopeças e Motopeças: Cadastre sua empresa e aproveite 14 Dias Grátis sem compromisso e sem cartão de crédito!</span>
        <span className="hidden md:inline-block bg-slate-950 text-amber-400 text-[10px] uppercase font-black px-2 py-0.5 rounded-full ml-1">
          Ativação Imediata
        </span>
      </div>

      {/* Top Navigation Bar */}
      <header className="border-b border-white/10 bg-[#0C4A6E]/90 backdrop-blur-md sticky top-0 z-40">
        <div className="w-full px-4 sm:px-6 lg:px-8 2xl:px-10 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GatoBrand size="md" showSubtitle={true} />
            <span className="hidden md:inline-block h-5 w-px bg-white/20" />
            <span className="hidden md:inline-block text-xs font-semibold text-sky-200">
              Plataforma SaaS de Gestão de Estoque, Balcão & Frota
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 bg-emerald-500/10 border border-emerald-400/30 px-3 py-1 rounded-full text-xs font-semibold text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>SEFAZ & Tributação Interestadual Online</span>
            </div>

            {onBackToApp && (
              <button
                type="button"
                id="btn-header-open-gato"
                onClick={onBackToApp}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0284C7] hover:bg-[#0284C7]/90 text-xs font-black text-white shadow-md transition active:scale-95 cursor-pointer"
              >
                <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                <span>Abrir o Sistema GATO Agora</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT SIDE: HERO BANNER & SAAS CAPABILITIES (5 cols) */}
          <div className="lg:col-span-5 bg-gradient-to-br from-[#0C4A6E] via-[#073047] to-slate-900 rounded-3xl p-6 sm:p-8 border border-sky-800/60 shadow-2xl flex flex-col justify-between relative overflow-hidden space-y-6">
            
            {/* Background effects */}
            <div className="absolute -right-16 -top-16 w-64 h-64 bg-[#0284C7]/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 space-y-4">
              {/* Official 3D Brand Logo Banner */}
              <GatoBrand fullBanner={true} className="border border-amber-500/40 shadow-2xl" />

              {/* Badge Chamativo */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-xs font-black uppercase tracking-wider shadow-xs">
                <Rocket className="w-4 h-4 text-amber-400 animate-bounce" />
                <span>Experimente Grátis por 14 Dias</span>
              </div>

              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
                  <span className="text-amber-400">GATO</span> é o SaaS definitivo para sua Autopeças
                </h1>
                <p className="text-slate-300 text-xs sm:text-sm mt-2 leading-relaxed">
                  Cadastre sua loja, defina o <strong>Nome Fantasia</strong> da sua empresa e comece a testar na hora com o catálogo da frota brasileira, cotação de balcão e notas fiscais integradas.
                </p>
              </div>

              {/* Current Company Badge if already exists */}
              {companyProfile && (
                <div className="p-3 bg-white/10 rounded-2xl border border-white/10 text-xs">
                  <span className="text-[10px] text-sky-300 font-bold uppercase tracking-wider block">
                    Empresa Atualmente Configurada:
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <Store className="w-4 h-4 text-amber-400 shrink-0" />
                    <strong className="text-sm font-black text-white truncate">
                      {companyProfile.tradeName}
                    </strong>
                  </div>
                  <span className="text-[11px] text-slate-300 block mt-0.5">
                    Razão: {companyProfile.corporateName} • {companyProfile.city}/{companyProfile.uf}
                  </span>
                </div>
              )}

              {/* 4 Superpowers Showcase */}
              <div className="space-y-2.5 pt-2">
                <div className="flex items-start gap-3 p-2.5 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition">
                  <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg shrink-0 mt-0.5">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-xs font-extrabold text-white">Balcão de Cotações em 5 Segundos</h2>
                    <p className="text-[11px] text-slate-300">Markup inteligente, margem líquida em tempo real e descontos automáticos por perfil.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition">
                  <div className="p-2 bg-sky-500/20 text-sky-400 rounded-lg shrink-0 mt-0.5">
                    <Car className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-xs font-extrabold text-white">Banco da Frota Nacional 1995 a 2027</h2>
                    <p className="text-[11px] text-slate-300">Consulte aplicação técnica e compatibilidade exata de peças por veículo, motor e ano.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition">
                  <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg shrink-0 mt-0.5">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-xs font-extrabold text-white">Baixa de XML de NF-e em 1 Clique</h2>
                    <p className="text-[11px] text-slate-300">Entrada automática de compras, rateio de ST e formação de preço de venda sem esforço.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition">
                  <div className="p-2 bg-purple-500/20 text-purple-400 rounded-lg shrink-0 mt-0.5">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-xs font-extrabold text-white">Tributação SEFAZ & Multi-CD</h2>
                    <p className="text-[11px] text-slate-300">Cálculo de DIFAL e ICMS ST por estado para faturamento local e interestadual.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Social Proof Footer */}
            <div className="relative z-10 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-300">
              <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                <span>★★★★★</span>
                <span className="text-white text-xs">4.9/5</span>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">
                +2.840 autopeças & oficinas no Brasil
              </span>
            </div>
          </div>

          {/* RIGHT SIDE: INTERACTIVE REGISTRATION & LOGIN FORM (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 text-slate-800 shadow-2xl border border-slate-100 flex flex-col justify-between">
            
            <div>
              {/* Quick Direct Entry Banner */}
              <div className="mb-4 p-3.5 bg-gradient-to-r from-sky-50 via-sky-100/70 to-amber-50 border border-sky-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#0C4A6E] text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-950">Acesso Direto ao Painel GATO</h3>
                    <p className="text-[11px] text-slate-600">Entrar no sistema com balcão de vendas, estoque e filiais prontos.</p>
                  </div>
                </div>
                {onBackToApp && (
                  <button
                    type="button"
                    id="btn-fast-enter-gato"
                    onClick={onBackToApp}
                    className="w-full sm:w-auto px-4 py-2 bg-[#0284C7] hover:bg-[#0284C7]/90 text-white font-black text-xs rounded-xl shadow transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap"
                  >
                    <span>Abrir Sistema Agora</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Form Tab Selector with Chamativo Highlight */}
              <div className="flex p-1.5 bg-slate-100 rounded-2xl mb-6 gap-1">
                <button
                  type="button"
                  id="tab-cadastrar-empresa"
                  onClick={() => { setActiveTab('cadastro'); setErrorMessage(null); }}
                  className={`flex-1 py-2.5 px-3 rounded-xl font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer ${
                    activeTab === 'cadastro'
                      ? 'bg-[#0C4A6E] text-white shadow-md'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <Rocket className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Cadastrar Empresa & Testar</span>
                  <span className="hidden sm:inline-block bg-amber-400 text-slate-950 text-[10px] font-black px-1.5 py-0.2 rounded uppercase">
                    14 Dias
                  </span>
                </button>

                <button
                  type="button"
                  id="tab-entrar-cliente"
                  onClick={() => { setActiveTab('login'); setErrorMessage(null); }}
                  className={`py-2.5 px-3 sm:px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    activeTab === 'login'
                      ? 'bg-[#0C4A6E] text-white shadow-md'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <KeyRound className="w-4 h-4 text-sky-400 shrink-0" />
                  <span>Já sou Cliente</span>
                </button>

                <button
                  type="button"
                  id="tab-demo-rapido"
                  onClick={() => { setActiveTab('rapido'); setErrorMessage(null); }}
                  className={`py-2.5 px-3 sm:px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    activeTab === 'rapido'
                      ? 'bg-[#0C4A6E] text-white shadow-md'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <Zap className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Demo 1-Clique</span>
                </button>
              </div>

              {/* Alert Messages */}
              {errorMessage && (
                <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{successMessage}</span>
                </div>
              )}

              {/* ======================================================== */}
              {/* TAB 1: CADASTRO DE EMPRESA COM NOME FANTASIA (TESTE GRÁTIS) */}
              {/* ======================================================== */}
              {activeTab === 'cadastro' && (
                <form onSubmit={handleRegisterCompany} className="space-y-4" id="form-cadastro-empresa-gato">
                  
                  {/* Destaque do Nome Fantasia */}
                  <div className="bg-sky-50/70 p-3.5 rounded-2xl border-2 border-sky-300">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-black text-[#0C4A6E] uppercase tracking-wider flex items-center gap-1.5">
                        <Store className="w-4 h-4 text-[#0284C7]" />
                        Nome Fantasia da Empresa *
                      </label>
                      <span className="text-[10px] font-extrabold bg-[#0284C7] text-white px-2 py-0.5 rounded-full">
                        Destaque no Balcão
                      </span>
                    </div>
                    <input
                      type="text"
                      id="input-trade-name"
                      value={tradeName}
                      onChange={(e) => setTradeName(e.target.value)}
                      placeholder="Ex: Auto Peças São Cristóvão, Motopeças Veloz..."
                      required
                      className="w-full px-3.5 py-2.5 bg-white border border-sky-200 rounded-xl text-sm font-extrabold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0284C7] shadow-xs"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Este é o nome com o qual seus clientes, vendedores e parceiros identificarão sua loja no sistema GATO.
                    </p>
                  </div>

                  {/* Razão Social & CNPJ */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Razão Social Oficial
                      </label>
                      <input
                        type="text"
                        id="input-corporate-name"
                        value={corporateName}
                        onChange={(e) => setCorporateName(e.target.value)}
                        placeholder="Ex: São Cristóvão Peças LTDA"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0C4A6E]"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        CNPJ da Empresa
                      </label>
                      <input
                        type="text"
                        id="input-cnpj"
                        value={cnpj}
                        onChange={(e) => handleCnpjChange(e.target.value)}
                        placeholder="00.000.000/0000-00"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0C4A6E]"
                      />
                    </div>
                  </div>

                  {/* Segmento / Ramo de Atuação */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">
                      Segmento Principal da Empresa:
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[
                        { id: 'Autopeças Leves & Acessórios', label: 'Autopeças Leves', icon: Car },
                        { id: 'Motopeças & Oficinas 2 Rodas', label: 'Motopeças', icon: Bike },
                        { id: 'Linha Pesada & Diesel', label: 'Caminhões & Diesel', icon: Truck },
                        { id: 'Linha Agrícola & Tratores', label: 'Agrícola & Tratores', icon: Tractor },
                        { id: 'Centro Automotivo & Misto', label: 'Auto Center Misto', icon: Wrench },
                        { id: 'Distribuidora & Atacado', label: 'Distribuidora', icon: Boxes },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setSegment(item.id)}
                          className={`p-2 rounded-xl text-left border text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                            segment === item.id
                              ? 'bg-[#0C4A6E] text-white border-[#0C4A6E] shadow-xs'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <item.icon className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate text-[11px]">{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Responsável & WhatsApp */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Nome do Proprietário / Gerente *
                      </label>
                      <input
                        type="text"
                        id="input-admin-name"
                        value={adminName}
                        onChange={(e) => setAdminName(e.target.value)}
                        placeholder="Ex: Carlos Eduardo Silveira"
                        required
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0C4A6E]"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        WhatsApp / Celular Comercial
                      </label>
                      <input
                        type="text"
                        id="input-phone"
                        value={phone}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        placeholder="(00) 00000-0000"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0C4A6E]"
                      />
                    </div>
                  </div>

                  {/* E-mail & Senha */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        E-mail de Acesso do Administrador *
                      </label>
                      <input
                        type="email"
                        id="input-email-cadastro"
                        value={emailCadastro}
                        onChange={(e) => setEmailCadastro(e.target.value)}
                        placeholder="contato@suaempresa.com.br"
                        required
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0C4A6E]"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Criar Senha de Acesso *
                      </label>
                      <input
                        type="password"
                        id="input-password-cadastro"
                        value={passwordCadastro}
                        onChange={(e) => setPasswordCadastro(e.target.value)}
                        placeholder="Crie uma senha segura"
                        required
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0C4A6E]"
                      />
                    </div>
                  </div>

                  {/* Estado (UF) do CD / Matriz */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Estado (UF) Sede da Loja:
                      </label>
                      <select
                        id="select-uf-cadastro"
                        value={stateUfCadastro}
                        onChange={(e) => setStateUfCadastro(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0C4A6E]"
                      >
                        <option value="MS">Mato Grosso do Sul (MS) - Matriz Fiscal Padrão</option>
                        <option value="SP">São Paulo (SP) - Hub Sudeste</option>
                        <option value="SC">Santa Catarina (SC) - Hub Sul</option>
                        <option value="PR">Paraná (PR)</option>
                        <option value="MT">Mato Grosso (MT)</option>
                        <option value="MG">Minas Gerais (MG)</option>
                        <option value="GO">Goiás (GO)</option>
                        <option value="RS">Rio Grande do Sul (RS)</option>
                        <option value="RJ">Rio de Janeiro (RJ)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Cidade:
                      </label>
                      <input
                        type="text"
                        value={cityCadastro}
                        onChange={(e) => setCityCadastro(e.target.value)}
                        placeholder="Ex: Campo Grande, São Paulo..."
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0C4A6E]"
                      />
                    </div>
                  </div>

                  {/* BOTÃO PRINCIPAL CHAMATIVO */}
                  <button
                    type="submit"
                    id="btn-submit-register-company"
                    disabled={isLoading}
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 via-amber-600 to-sky-700 hover:from-amber-600 hover:to-sky-800 text-slate-950 hover:text-white font-black text-sm rounded-2xl shadow-lg transition transform active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Configurando sua Empresa no GATO SaaS...</span>
                      </>
                    ) : (
                      <>
                        <Rocket className="w-4 h-4 shrink-0 fill-current" />
                        <span>Cadastrar Empresa e Iniciar Teste Grátis Agora</span>
                        <ArrowRight className="w-4 h-4 shrink-0" />
                      </>
                    )}
                  </button>

                  <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] text-slate-500 pt-1">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      14 dias de acesso irrestrito
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Não requer cartão de crédito
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Suporte via WhatsApp incluso
                    </span>
                  </div>
                </form>
              )}

              {/* ======================================================== */}
              {/* TAB 2: JÁ SOU CLIENTE (ENTRAR COM E-MAIL E SENHA) */}
              {/* ======================================================== */}
              {activeTab === 'login' && (
                <form onSubmit={handleLoginExisting} className="space-y-4" id="form-login-cliente">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      E-mail Corporativo
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="email"
                        id="input-email-login"
                        value={emailLogin}
                        onChange={(e) => setEmailLogin(e.target.value)}
                        placeholder="seu.email@empresa.com.br"
                        required
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0C4A6E]"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700">
                        Senha de Acesso
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowForgotModal(true)}
                        className="text-[11px] text-[#0284C7] hover:underline"
                      >
                        Esqueci a senha
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        id="input-password-login"
                        value={passwordLogin}
                        onChange={(e) => setPasswordLogin(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0C4A6E]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* CD / Filial de Venda de Acesso */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Filial e CD de Expedição para Faturamento:
                    </label>
                    <select
                      id="select-branch-login"
                      value={selectedBranchId}
                      onChange={(e) => setSelectedBranchId(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0C4A6E]"
                    >
                      {availableBranches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.cdCode} • {b.uf} - ICMS {b.icmsInterno}%)
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    id="btn-submit-login-existing"
                    disabled={isLoading}
                    className="w-full py-3 px-4 bg-[#0C4A6E] hover:bg-[#073047] text-white font-extrabold text-sm rounded-xl shadow-md transition active:scale-98 flex items-center justify-center gap-2 cursor-pointer mt-2"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Autenticando...</span>
                      </>
                    ) : (
                      <>
                        <KeyRound className="w-4 h-4" />
                        <span>Acessar GATO SaaS</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={() => setActiveTab('cadastro')}
                      className="text-xs font-bold text-[#0284C7] hover:underline"
                    >
                      Não possui uma empresa cadastrada? <strong>Cadastre e teste grátis por 14 dias!</strong>
                    </button>
                  </div>
                </form>
              )}

              {/* ======================================================== */}
              {/* TAB 3: ACESSO RÁPIDO DEMO (1-CLIQUE) */}
              {/* ======================================================== */}
              {activeTab === 'rapido' && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-600">
                    Selecione um perfil de teste pré-configurado para navegar instantaneamente pelos módulos do <strong>GATO SaaS</strong>:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {AVAILABLE_USERS.map((user) => {
                      const branch = availableBranches.find(b => b.id === user.defaultBranchId) || availableBranches[0];
                      return (
                        <div
                          key={user.id}
                          onClick={() => handleQuickLogin(user)}
                          className="p-3 bg-slate-50 hover:bg-sky-50 border border-slate-200 hover:border-sky-300 rounded-2xl transition cursor-pointer flex items-center gap-3 group"
                        >
                          <div className="w-10 h-10 rounded-xl bg-[#0C4A6E] text-white font-black text-sm flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                            {user.avatarInitials}
                          </div>
                          <div className="min-w-0 flex-1">
                            <strong className="text-xs text-slate-900 block truncate group-hover:text-[#0C4A6E]">
                              {user.name}
                            </strong>
                            <span className="text-[10px] text-[#0284C7] font-bold block truncate">
                              {user.roleLabel}
                            </span>
                            <span className="text-[10px] text-slate-500 block truncate">
                              CD {branch.uf} ({branch.city})
                            </span>
                          </div>
                          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#0C4A6E] transition shrink-0" />
                        </div>
                      );
                    })}
                  </div>

                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Dica: Para personalizar com o nome da sua própria autopeças ou motopeças, use a aba <strong>Cadastrar Empresa</strong>!</span>
                  </div>
                </div>
              )}

            </div>

            {/* Footer info */}
            <div className="pt-6 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 mt-4">
              <span>GATO SaaS v2.8.4 • Cloud Powered</span>
              <span>Suporte SEFAZ Nacional • 2026</span>
            </div>
          </div>

        </div>
      </main>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 text-slate-800 shadow-2xl border border-slate-100">
            <h3 className="text-base font-extrabold text-slate-900 mb-1">Recuperar Acesso ao GATO SaaS</h3>
            <p className="text-xs text-slate-600 mb-4">
              Informe seu e-mail corporativo cadastrado para receber as instruções de redefinição de senha.
            </p>
            <form onSubmit={(e) => { e.preventDefault(); setForgotSent(true); setTimeout(() => setShowForgotModal(false), 2000); }}>
              <input
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="seu.email@empresa.com.br"
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 mb-3"
              />
              {forgotSent ? (
                <div className="p-2 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-bold text-center mb-3">
                  Instruções enviadas com sucesso para {forgotEmail}!
                </div>
              ) : (
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-[#0C4A6E] text-white text-xs font-bold rounded-lg hover:bg-[#073047]"
                  >
                    Enviar Link de Recuperação
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
