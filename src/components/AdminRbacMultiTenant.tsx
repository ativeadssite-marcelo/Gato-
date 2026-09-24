import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Users,
  Building,
  KeyRound,
  FileText,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  Lock,
  Layers,
  Send,
  RefreshCw,
  Search,
  Filter,
  Check,
  X,
  Play,
  Download,
  UserCheck,
  UserX,
  FileCheck,
  Clock,
  Sparkles,
  Info,
  ChevronRight,
  Database,
  Sliders,
  DollarSign,
  Receipt,
  Mail,
  Bell,
  HardDrive,
  Cpu
} from 'lucide-react';
import {
  RbacRoleCode,
  PermissionResource,
  PermissionAccessLevel,
  RoleDefinition,
  TenantAccount,
  RbacUser,
  PlanLimitConfig,
  TenantQuotaUsage,
  AuditLogRecord,
  InternalMessageTemplate,
  InternalMessageItem,
  IsolationTestResult,
  LgpdSubjectRequest,
  TenantPermissionDefinition,
  TenantPermissionKey
} from '../types/rbac';
import { apiFetch } from '../services/apiClient';
import { TenantPermissionMatrix } from './TenantPermissionMatrix';

interface AdminRbacProps {
  onNotify?: (message: string, type?: 'success' | 'warning' | 'error') => void;
}

export const AdminRbacMultiTenant: React.FC<AdminRbacProps> = ({ onNotify }) => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'users' | 'matrix' | 'audit' | 'plans' | 'messages' | 'lgpd' | 'tests' | 'docs'
  >('overview');

  // Estado Geral Carregado da API
  const [currentUser, setCurrentUser] = useState<RbacUser | null>(null);
  const [currentRole, setCurrentRole] = useState<RoleDefinition | null>(null);
  const [allRoles, setAllRoles] = useState<RoleDefinition[]>([]);
  const [availablePersonas, setAvailablePersonas] = useState<any[]>([]);
  const [tenants, setTenants] = useState<TenantAccount[]>([]);
  const [users, setUsers] = useState<RbacUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);
  const [plans, setPlans] = useState<PlanLimitConfig[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('cmtt58e6o0000ju346a0g6s32');
  const [quotaUsage, setQuotaUsage] = useState<TenantQuotaUsage | null>(null);
  const [messages, setMessages] = useState<InternalMessageItem[]>([]);
  const [templates, setTemplates] = useState<InternalMessageTemplate[]>([]);
  const [lgpdRequests, setLgpdRequests] = useState<LgpdSubjectRequest[]>([]);
  const [testResults, setTestResults] = useState<IsolationTestResult[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [loading, setLoading] = useState(true);

  // Modais
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isLogDetailOpen, setIsLogDetailOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLogRecord | null>(null);
  const [isJustificationModalOpen, setIsJustificationModalOpen] = useState(false);
  const [justificationText, setJustificationText] = useState('');
  const [isNewMessageModalOpen, setIsNewMessageModalOpen] = useState(false);
  const [isPlanChangeModalOpen, setIsPlanChangeModalOpen] = useState(false);
  const [selectedTargetPlan, setSelectedTargetPlan] = useState('plan_enterprise');

  // Form State: Novo Usuário
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<RbacRoleCode>('tenant_user');
  const [newUserTenant, setNewUserTenant] = useState('cmtt58e6o0000ju346a0g6s32');
  const [newUserDept, setNewUserDept] = useState('Operacional');

  // Construtor flexível: catálogo de capacidades do tenant (vindo do servidor)
  // e o rascunho de checkboxes do usuário em edição.
  const [tenantCatalog, setTenantCatalog] = useState<TenantPermissionDefinition[]>([]);
  const [tenantGroups, setTenantGroups] = useState<
    Array<{ id: TenantPermissionDefinition['group']; name: string }>
  >([]);
  const [newUserTenantPermissions, setNewUserTenantPermissions] = useState<TenantPermissionKey[]>([]);
  /** Quando definido, o modal está editando os acessos de um usuário existente. */
  const [editingUser, setEditingUser] = useState<RbacUser | null>(null);

  // Form State: Nova Mensagem
  const [msgTitle, setMsgTitle] = useState('');
  const [msgContent, setMsgContent] = useState('');
  const [msgTenant, setMsgTenant] = useState('all');
  const [msgTemplateCode, setMsgTemplateCode] = useState('');
  const [msgChannels, setMsgChannels] = useState<('in_app' | 'email')[]>(['in_app', 'email']);

  // Filtros
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userFilterRole, setUserFilterRole] = useState<string>('all');
  const [auditSearchTerm, setAuditSearchTerm] = useState('');
  const [auditFilterStatus, setAuditFilterStatus] = useState<string>('all');

  // Notificador Helper
  const notify = (msg: string, type: 'success' | 'warning' | 'error' = 'success') => {
    if (onNotify) {
      onNotify(msg, type);
    } else {
      console.log(`[RBAC ${type.toUpperCase()}]`, msg);
    }
  };

  // Carregar dados iniciais
  const loadRbacData = async () => {
    try {
      setLoading(true);
      const resMe = await apiFetch('/api/rbac/me');
      const dataMe = await resMe.json();
      if (dataMe.success) {
        setCurrentUser(dataMe.user);
        setCurrentRole(dataMe.role);
        setAllRoles(dataMe.allRoles || []);
        setAvailablePersonas(dataMe.availablePersonas || []);
      }

      const resTenants = await apiFetch('/api/rbac/tenants');
      const dataTenants = await resTenants.json();
      if (dataTenants.success) {
        setTenants(dataTenants.tenants);
      }

      const resUsers = await apiFetch('/api/rbac/users');
      const dataUsers = await resUsers.json();
      if (dataUsers.success) {
        setUsers(dataUsers.users);
      }

      const resLogs = await apiFetch('/api/rbac/audit-logs');
      const dataLogs = await resLogs.json();
      if (dataLogs.success) {
        setAuditLogs(dataLogs.logs);
      }

      const resPlans = await apiFetch('/api/rbac/plans');
      const dataPlans = await resPlans.json();
      if (dataPlans.success) {
        setPlans(dataPlans.plans);
      }

      const resQuota = await apiFetch(`/api/rbac/quotas/${selectedTenantId}`);
      const dataQuota = await resQuota.json();
      if (dataQuota.success) {
        setQuotaUsage(dataQuota.quota);
      }

      const resMessages = await apiFetch('/api/rbac/messages');
      const dataMessages = await resMessages.json();
      if (dataMessages.success) {
        setMessages(dataMessages.messages);
        setTemplates(dataMessages.templates);
      }

      const resLgpd = await apiFetch('/api/rbac/lgpd/requests');
      const dataLgpd = await resLgpd.json();
      if (dataLgpd.success) {
        setLgpdRequests(dataLgpd.requests);
      }

      // Catálogo do construtor flexível (grupos + capacidades operacionais)
      const resTenantPerms = await apiFetch('/api/rbac/tenant-permissions');
      const dataTenantPerms = await resTenantPerms.json();
      if (dataTenantPerms.success) {
        setTenantCatalog(dataTenantPerms.permissions || []);
        setTenantGroups(dataTenantPerms.groups || []);
      }
    } catch (err: any) {
      console.error('Erro ao carregar dados RBAC:', err);
      notify('Falha ao conectar com o serviço de segurança RBAC', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRbacData();
  }, [selectedTenantId]);

  // Alternar Persona para teste
  const handleSwitchPersona = async (userId: string) => {
    try {
      const res = await apiFetch('/api/rbac/switch-persona', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      const data = await res.json();
      if (data.success) {
        setCurrentUser(data.user);
        setCurrentRole(data.role);
        notify(`Alternado para persona: ${data.user.name} (${data.user.roleName})`, 'success');
        // Recarregar dados com novo contexto
        loadRbacData();
      }
    } catch (err) {
      notify('Erro ao alternar persona', 'error');
    }
  };

  // Abrir o modal em modo criação (limpa o rascunho de capacidades).
  const openCreateUserModal = () => {
    setEditingUser(null);
    setNewUserName('');
    setNewUserEmail('');
    setNewUserTenantPermissions([]);
    setIsUserModalOpen(true);
  };

  // Abrir o modal em modo edição de acessos de um usuário existente.
  const openEditAccesses = (user: RbacUser) => {
    setEditingUser(user);
    setNewUserTenantPermissions([...(user.tenantPermissions || [])]);
    setIsUserModalOpen(true);
  };

  const closeUserModal = () => {
    setIsUserModalOpen(false);
    setEditingUser(null);
  };

  // Criar usuário OU gravar os acessos de um usuário existente.
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();

    const isEdit = !!editingUser;
    if (!isEdit && (!newUserName || !newUserEmail)) return;

    try {
      const res = await apiFetch(
        isEdit ? `/api/rbac/users/${editingUser!.id}/role` : '/api/rbac/users',
        {
          method: isEdit ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(
            isEdit
              ? {
                  // `roleCode` vai junto para o endpoint não perder o papel.
                  roleCode: editingUser!.roleCode,
                  tenantPermissions: newUserTenantPermissions,
                }
              : {
                  name: newUserName,
                  email: newUserEmail,
                  roleCode: newUserRole,
                  tenantId: newUserTenant,
                  department: newUserDept,
                  tenantPermissions: newUserTenantPermissions,
                },
          ),
        },
      );
      const data = await res.json();
      if (data.success) {
        notify(
          isEdit
            ? `Acessos de ${editingUser!.name} atualizados (${newUserTenantPermissions.length} capacidades).`
            : `Usuário ${data.user.name} cadastrado com sucesso!`,
          'success',
        );
        closeUserModal();
        loadRbacData();
      } else {
        notify(data.error || 'Falha ao salvar usuário', 'error');
      }
    } catch (err) {
      notify('Erro na requisição de cadastro', 'error');
    }
  };

  // Reset de Senha Seguro
  const handleResetPassword = async (targetUser: RbacUser) => {
    try {
      const res = await apiFetch(`/api/rbac/users/${targetUser.id}/reset-password`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        notify(`Link de reset emitido com sucesso para ${data.maskedEmail}!`, 'success');
        loadRbacData();
      }
    } catch (err) {
      notify('Erro ao resetar senha', 'error');
    }
  };

  // Executar Bateria de Testes Automatizados
  const handleRunSecurityTests = async () => {
    setIsRunningTests(true);
    try {
      const res = await apiFetch('/api/rbac/test-isolation');
      const data = await res.json();
      if (data.success) {
        setTestResults(data.results);
        notify(`Bateria concluída: ${data.summary.passed}/${data.summary.totalTests} testes de segurança aprovados!`, 'success');
      }
    } catch (err) {
      notify('Falha ao executar testes de segurança', 'error');
    } finally {
      setIsRunningTests(false);
    }
  };

  // Solicitar Acesso Confidencial com Justificativa (Super Admin ✅*)
  const handleConfirmConfidentialAccess = async () => {
    if (!justificationText || justificationText.trim().length < 8) {
      notify('A justificativa deve conter no mínimo 8 caracteres para conformidade de auditoria.', 'warning');
      return;
    }

    try {
      const res = await apiFetch('/api/rbac/tenants', {
        headers: {
          'x-justification': justificationText,
          'x-target-tenant-id': selectedTenantId
        }
      });
      notify('Acesso confidencial autorizado e registrado na trilha de auditoria!', 'success');
      setIsJustificationModalOpen(false);
      setJustificationText('');
      loadRbacData();
    } catch (err) {
      notify('Erro ao registrar justificativa', 'error');
    }
  };

  // Executar Troca de Plano com Pró-rata
  const handleChangePlan = async () => {
    try {
      const res = await apiFetch('/api/rbac/plans/change', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenantId: selectedTenantId,
          targetPlanId: selectedTargetPlan
        })
      });
      const data = await res.json();
      if (data.success) {
        notify(`Plano atualizado! Diferença proporcional residual: R$ ${data.proRataAmount.toFixed(2)}`, 'success');
        setIsPlanChangeModalOpen(false);
        loadRbacData();
      }
    } catch (err) {
      notify('Erro ao atualizar plano', 'error');
    }
  };

  // Enviar Mensagem Interna
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgTitle || !msgContent) return;

    try {
      const res = await apiFetch('/api/rbac/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenantId: msgTenant,
          title: msgTitle,
          content: msgContent,
          templateCode: msgTemplateCode,
          channels: msgChannels
        })
      });
      const data = await res.json();
      if (data.success) {
        notify('Mensagem interna enviada com sucesso!', 'success');
        setIsNewMessageModalOpen(false);
        setMsgTitle('');
        setMsgContent('');
        loadRbacData();
      }
    } catch (err) {
      notify('Erro ao enviar mensagem', 'error');
    }
  };

  // Aplicar Template na Mensagem
  const applyTemplate = (code: string) => {
    setMsgTemplateCode(code);
    const tpl = templates.find((t) => t.code === code);
    if (tpl) {
      setMsgTitle(tpl.title);
      setMsgContent(tpl.content);
    }
  };

  // Helper para crachá de nível de acesso da matriz
  const renderAccessBadge = (level: PermissionAccessLevel) => {
    switch (level) {
      case 'full':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <Check className="w-3 h-3" /> Total (✅)
          </span>
        );
      case 'read_only':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30">
            <Eye className="w-3 h-3" /> Leitura (👁️)
          </span>
        );
      case 'own_tenant_only':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <Building className="w-3 h-3" /> Própria (🏢)
          </span>
        );
      case 'audit_required':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
            <ShieldAlert className="w-3 h-3" /> Auditoria (✅*)
          </span>
        );
      case 'masked':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
            <Lock className="w-3 h-3" /> Mascarado
          </span>
        );
      case 'none':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-500 border border-slate-700/50">
            <X className="w-3 h-3" /> Sem acesso (❌)
          </span>
        );
    }
  };

  const currentActiveTenant = tenants.find((t) => t.id === selectedTenantId) || tenants[0];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Banner: Simulador de Personas & Status de Segurança Ativo */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 rounded-2xl p-5 shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-500/20 border border-indigo-500/40 rounded-xl text-indigo-400">
              <Shield className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white tracking-tight">Centro de Governança RBAC & Multi-Tenant</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Isolamento por tenant_id Ativo
                </span>
              </div>
              <p className="text-sm text-slate-300 mt-0.5">
                Segregação de funções, auditoria rigorosa, proteção LGPD e limites de cota por plano.
              </p>
            </div>
          </div>

          {/* Seletor Rápido de Persona Ativa */}
          <div className="bg-slate-950/80 border border-slate-700/80 rounded-xl p-3 flex flex-wrap items-center gap-3">
            <div>
              <span className="text-xs text-slate-400 block font-medium">Persona Operacional Ativa:</span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-semibold text-sm text-white">{currentUser?.name || 'Super Admin'}</span>
                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${currentRole?.badgeColor || 'bg-rose-500/20 text-rose-400 border-rose-500/30'}`}>
                  {currentRole?.name || 'Super Admin'}
                </span>
              </div>
            </div>

            <div className="h-8 w-px bg-slate-800 hidden sm:block" />

            {/* Dropdown de Alternância Rápida para Testar as 9 Personas */}
            <div>
              <label className="text-xs text-slate-400 block font-medium">Testar como outra persona:</label>
              <select
                aria-label="Selecionar persona para teste"
                className="mt-0.5 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                value={currentUser?.id}
                onChange={(e) => handleSwitchPersona(e.target.value)}
              >
                {availablePersonas.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.roleName} ({p.name}) - {p.tenantName}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setIsJustificationModalOpen(true)}
              className="px-3 py-1.5 bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 border border-purple-500/40 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
              title="Testar acesso com justificativa técnica obrigatória"
            >
              <KeyRound className="w-3.5 h-3.5" /> Justificativa ✅*
            </button>
          </div>
        </div>

        {/* Indicadores de Segurança em Tempo Real */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-800/80">
          <div className="bg-slate-900/60 rounded-xl p-2.5 border border-slate-800 flex items-center gap-2.5">
            <Lock className="w-4 h-4 text-emerald-400" />
            <div>
              <span className="text-[11px] text-slate-400 block">Isolamento Multi-Tenant</span>
              <span className="text-xs font-bold text-emerald-400">100% Protegido</span>
            </div>
          </div>
          <div className="bg-slate-900/60 rounded-xl p-2.5 border border-slate-800 flex items-center gap-2.5">
            <KeyRound className="w-4 h-4 text-indigo-400" />
            <div>
              <span className="text-[11px] text-slate-400 block">Exigência de MFA</span>
              <span className="text-xs font-bold text-indigo-300">Obrigatório p/ Admins</span>
            </div>
          </div>
          <div className="bg-slate-900/60 rounded-xl p-2.5 border border-slate-800 flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-amber-400" />
            <div>
              <span className="text-[11px] text-slate-400 block">Sessão Segura & IP</span>
              <span className="text-xs font-bold text-amber-300">Expira em 4h • Allowlist</span>
            </div>
          </div>
          <div className="bg-slate-900/60 rounded-xl p-2.5 border border-slate-800 flex items-center gap-2.5">
            <FileCheck className="w-4 h-4 text-cyan-400" />
            <div>
              <span className="text-[11px] text-slate-400 block">Trilha de Auditoria</span>
              <span className="text-xs font-bold text-cyan-300">{auditLogs.length} Registros Gravados</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navegação por Abas */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-900/90 border border-slate-800 rounded-xl">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'overview'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Layers className="w-4 h-4" /> Visão Geral
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'users'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Users className="w-4 h-4" /> Equipe & Usuários ({users.length})
        </button>
        <button
          onClick={() => setActiveTab('matrix')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'matrix'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <ShieldCheck className="w-4 h-4" /> Matriz de Permissões
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'audit'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <FileText className="w-4 h-4" /> Auditoria (Antes/Depois)
        </button>
        <button
          onClick={() => setActiveTab('plans')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'plans'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Cpu className="w-4 h-4" /> Limites & Cotas
        </button>
        <button
          onClick={() => setActiveTab('messages')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'messages'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Mail className="w-4 h-4" /> Mensagens Internas
        </button>
        <button
          onClick={() => setActiveTab('lgpd')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'lgpd'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <ShieldAlert className="w-4 h-4" /> LGPD & Privacidade
        </button>
        <button
          onClick={() => setActiveTab('tests')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'tests'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Play className="w-4 h-4" /> Testes de Isolamento
        </button>
        <button
          onClick={() => setActiveTab('docs')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'docs'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Info className="w-4 h-4" /> Documentação
        </button>
      </div>

      {/* ========================================================================= */}
      {/* ABA 1: VISÃO GERAL */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Cartões de Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">Tenants Contratantes</span>
                <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                  <Building className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-white">{tenants.length}</span>
                <span className="text-xs text-emerald-400 font-semibold">100% isolados</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">Nenhum dado cruzado entre empresas</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">Usuários Ativos</span>
                <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-white">{users.length}</span>
                <span className="text-xs text-slate-400">em {tenants.length} tenants + SaaS</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">Super Admin, SaaS e Contratantes</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">Papéis Definidos</span>
                <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-white">9 Papéis</span>
                <span className="text-xs text-purple-400 font-semibold">Granulares</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">Conforme especificação exata</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">Eventos Auditados</span>
                <div className="p-2 bg-cyan-500/10 rounded-lg text-cyan-400">
                  <FileText className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-white">{auditLogs.length}</span>
                <span className="text-xs text-emerald-400 font-semibold">Com PII Mascarada</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">Quem, quando, IP e antes/depois</p>
            </div>
          </div>

          {/* Tenants Cadastrados com Ações Rápidas */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-white">Empresas Contratantes (Tenants)</h3>
                <p className="text-xs text-slate-400">Selecione uma empresa para inspecionar consumo de cota e usuários vinculados</p>
              </div>
              <div className="text-xs text-slate-400 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60">
                Isolamento estrito por <code className="text-indigo-300 font-mono">tenant_id</code>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {tenants.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setSelectedTenantId(t.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedTenantId === t.id
                      ? 'bg-indigo-950/40 border-indigo-500 shadow-md shadow-indigo-500/10'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/30'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-white text-sm">{t.name}</h4>
                      <p className="text-xs text-slate-400">{t.tradeName}</p>
                      <span className="text-[11px] font-mono text-slate-500 mt-1 block">CNPJ: {t.cnpj}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      {t.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-indigo-400 font-medium">{t.planName}</span>
                    <span className="text-slate-400">{t.city}/{t.uf}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 2: EQUIPE & USUÁRIOS */}
      {/* ========================================================================= */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Buscar por nome, email ou cargo..."
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-4 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-64"
                />
              </div>

              <select
                aria-label="Filtrar por papel"
                value={userFilterRole}
                onChange={(e) => setUserFilterRole(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="all">Todos os Papéis</option>
                <option value="super_admin">Super Admin</option>
                <option value="saas_financeiro">Admin SaaS — Financeiro</option>
                <option value="saas_fiscal">Admin SaaS — Fiscal</option>
                <option value="saas_suporte">Admin SaaS — Suporte</option>
                <option value="saas_config">Admin SaaS — Config</option>
                <option value="saas_cs">Admin SaaS — CS</option>
                <option value="tenant_admin">Admin do Tenant</option>
                <option value="tenant_user">Usuário do Tenant</option>
                <option value="tenant_readonly">Suporte Leitura</option>
              </select>
            </div>

            <button
              onClick={openCreateUserModal}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition-colors flex items-center gap-2"
            >
              <Users className="w-4 h-4" /> Convidar / Novo Usuário
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Usuário</th>
                    <th className="py-3 px-4">Papel & Escopo</th>
                    <th className="py-3 px-4">Empresa (Tenant)</th>
                    <th className="py-3 px-4">Segurança / MFA</th>
                    <th className="py-3 px-4">Último Acesso</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {users
                    .filter((u) => {
                      if (userFilterRole !== 'all' && u.roleCode !== userFilterRole) return false;
                      if (userSearchTerm) {
                        const term = userSearchTerm.toLowerCase();
                        return (
                          u.name.toLowerCase().includes(term) ||
                          u.email.toLowerCase().includes(term) ||
                          u.roleName.toLowerCase().includes(term) ||
                          u.tenantName.toLowerCase().includes(term)
                        );
                      }
                      return true;
                    })
                    .map((user) => (
                      <tr key={user.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center font-bold text-indigo-400 text-xs">
                              {user.avatarInitials}
                            </div>
                            <div>
                              <span className="font-semibold text-white block">{user.name}</span>
                              <span className="text-[11px] text-slate-400">{user.email}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 block w-max">
                            {user.roleName}
                          </span>
                          <span className="text-[10px] text-slate-500 mt-0.5 block">
                            Escopo: {user.roleCode.startsWith('saas_') || user.roleCode === 'super_admin' ? 'Plataforma SaaS' : 'Empresa Tenant'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="text-slate-300 font-medium block">{user.tenantName}</span>
                          <span className="text-[10px] font-mono text-slate-500">ID: {user.tenantId.slice(0, 14)}...</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            {user.mfaEnabled ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3" /> MFA Ativo
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                Sem MFA
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-400">
                          <span className="block">{user.lastLoginAt?.slice(0, 10) || 'Hoje'}</span>
                          <span className="text-[10px] font-mono text-slate-500">{user.lastLoginIp}</span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEditAccesses(user)}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors"
                              title="Editar as capacidades operacionais deste usuário (construtor flexível)"
                            >
                              Editar Acessos
                            </button>
                            <button
                              onClick={() => handleResetPassword(user)}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors"
                              title="Emitir reset seguro de senha"
                            >
                              Reset Senha
                            </button>
                            <button
                              onClick={() => handleSwitchPersona(user.id)}
                              className="px-2.5 py-1 bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded-lg text-xs font-medium transition-colors"
                              title="Assumir persona para teste"
                            >
                              Testar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 3: MATRIZ RESUMIDA DE PERMISSÕES (CONFORME ESPECIFICAÇÃO) */}
      {/* ========================================================================= */}
      {activeTab === 'matrix' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-white">Matriz Resumida de Permissões Granulares</h3>
                <p className="text-xs text-slate-400">
                  Especificação exata de controle de acesso por recurso x papel definida na regra de negócio.
                </p>
              </div>

              {/* Legenda */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-md font-semibold">
                  ✅ Total
                </span>
                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-md font-semibold">
                  👁️ Leitura / Limitado
                </span>
                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-md font-semibold">
                  🏢 Própria / Próprios (Tenant)
                </span>
                <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-md font-semibold">
                  ✅* Com auditoria e justificativa
                </span>
                <span className="px-2 py-0.5 bg-slate-800 text-slate-500 border border-slate-700 rounded-md font-semibold">
                  ❌ Sem acesso
                </span>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-950 border-b border-slate-800 text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-3.5 bg-slate-950 sticky left-0 z-10 border-r border-slate-800 min-w-[190px]">
                      Recurso
                    </th>
                    <th className="py-3 px-2.5 text-center min-w-[110px]">Super Admin</th>
                    <th className="py-3 px-2.5 text-center min-w-[110px]">Financeiro</th>
                    <th className="py-3 px-2.5 text-center min-w-[100px]">Fiscal</th>
                    <th className="py-3 px-2.5 text-center min-w-[100px]">Suporte</th>
                    <th className="py-3 px-2.5 text-center min-w-[100px]">Config</th>
                    <th className="py-3 px-2.5 text-center min-w-[90px]">CS</th>
                    <th className="py-3 px-2.5 text-center min-w-[130px]">Admin Tenant</th>
                    <th className="py-3 px-2.5 text-center min-w-[130px]">Usuário Tenant</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {/* Linhas da Matriz */}
                  <tr className="hover:bg-slate-800/30">
                    <td className="py-3 px-3.5 font-bold text-white bg-slate-900/90 sticky left-0 z-10 border-r border-slate-800">
                      Atualizações
                    </td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('full')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('none')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('none')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('read_only')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('full')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('none')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('none')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('none')}</td>
                  </tr>

                  <tr className="hover:bg-slate-800/30">
                    <td className="py-3 px-3.5 font-bold text-white bg-slate-900/90 sticky left-0 z-10 border-r border-slate-800">
                      Mensalidade / Contratos
                    </td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('full')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('full')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('none')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('none')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('none')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('read_only')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('own_tenant_only')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('none')}</td>
                  </tr>

                  <tr className="hover:bg-slate-800/30">
                    <td className="py-3 px-3.5 font-bold text-white bg-slate-900/90 sticky left-0 z-10 border-r border-slate-800">
                      Suporte a Bugs
                    </td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('full')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('none')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('none')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('full')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('read_only')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('read_only')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('none')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('none')}</td>
                  </tr>

                  <tr className="hover:bg-slate-800/30">
                    <td className="py-3 px-3.5 font-bold text-white bg-slate-900/90 sticky left-0 z-10 border-r border-slate-800">
                      Config. Fiscal
                    </td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('full')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('none')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('full')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('none')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('none')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('none')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('none')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('none')}</td>
                  </tr>

                  <tr className="hover:bg-slate-800/30">
                    <td className="py-3 px-3.5 font-bold text-white bg-slate-900/90 sticky left-0 z-10 border-r border-slate-800">
                      Conectores
                    </td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('full')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('none')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('none')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('none')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('full')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('none')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('none')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('none')}</td>
                  </tr>

                  <tr className="hover:bg-slate-800/30">
                    <td className="py-3 px-3.5 font-bold text-white bg-slate-900/90 sticky left-0 z-10 border-r border-slate-800">
                      Layout
                    </td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('full')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('none')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('none')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('none')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('full')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('none')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('none')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('none')}</td>
                  </tr>

                  <tr className="hover:bg-slate-800/30">
                    <td className="py-3 px-3.5 font-bold text-white bg-slate-900/90 sticky left-0 z-10 border-r border-slate-800">
                      Gerenciar Contas
                    </td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('full')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('read_only')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('none')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('read_only')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('none')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('full')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('own_tenant_only')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('none')}</td>
                  </tr>

                  <tr className="hover:bg-slate-800/30">
                    <td className="py-3 px-3.5 font-bold text-white bg-slate-900/90 sticky left-0 z-10 border-r border-slate-800">
                      Dados da Empresa
                    </td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('none')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('none')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('none')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('none')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('none')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('none')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('own_tenant_only')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('read_only')}</td>
                  </tr>

                  <tr className="hover:bg-slate-800/30">
                    <td className="py-3 px-3.5 font-bold text-white bg-slate-900/90 sticky left-0 z-10 border-r border-slate-800">
                      Dados Clientes / Funcionários
                    </td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('none')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('none')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('none')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('none')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('none')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('none')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('own_tenant_only')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('own_tenant_only')}</td>
                  </tr>

                  <tr className="hover:bg-slate-800/30">
                    <td className="py-3 px-3.5 font-bold text-white bg-slate-900/90 sticky left-0 z-10 border-r border-slate-800">
                      Usuários Contratantes
                    </td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('full')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('none')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('none')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('read_only')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('none')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('read_only')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('own_tenant_only')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('none')}</td>
                  </tr>

                  <tr className="hover:bg-slate-800/30">
                    <td className="py-3 px-3.5 font-bold text-white bg-slate-900/90 sticky left-0 z-10 border-r border-slate-800">
                      Limites / Cadastros
                    </td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('full')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('none')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('none')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('none')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('none')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('read_only')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('own_tenant_only')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('none')}</td>
                  </tr>

                  <tr className="hover:bg-slate-800/30">
                    <td className="py-3 px-3.5 font-bold text-white bg-slate-900/90 sticky left-0 z-10 border-r border-slate-800">
                      Mensagens Internas
                    </td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('full')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('full')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('none')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('none')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('none')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('full')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('own_tenant_only')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('read_only')}</td>
                  </tr>

                  <tr className="hover:bg-slate-800/30">
                    <td className="py-3 px-3.5 font-bold text-white bg-slate-900/90 sticky left-0 z-10 border-r border-slate-800">
                      Catálogo de Referência
                    </td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('read_only')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('none')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('none')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('none')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('none')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('none')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('full')}</td>
                    <td className="py-3 px-2.5 text-center">{renderAccessBadge('full')}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 4: AUDITORIA (QUEM, QUANDO, IP, ANTES/DEPOIS, PII MASCARADA) */}
      {/* ========================================================================= */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Buscar ação, usuário, recurso ou IP..."
                  value={auditSearchTerm}
                  onChange={(e) => setAuditSearchTerm(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-4 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-64"
                />
              </div>

              <select
                aria-label="Filtrar por status de auditoria"
                value={auditFilterStatus}
                onChange={(e) => setAuditFilterStatus(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="all">Todos os Status</option>
                <option value="success">Sucesso</option>
                <option value="blocked">Bloqueado / Violação</option>
                <option value="warning">Alerta</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Proteção LGPD:</span>
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> PII Mascarada
              </span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Timestamp & IP</th>
                    <th className="py-3 px-4">Responsável (Quem)</th>
                    <th className="py-3 px-4">Ação Realizada</th>
                    <th className="py-3 px-4">Recurso & Tenant</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Antes / Depois</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {auditLogs
                    .filter((log) => {
                      if (auditFilterStatus !== 'all' && log.status !== auditFilterStatus) return false;
                      if (auditSearchTerm) {
                        const term = auditSearchTerm.toLowerCase();
                        return (
                          log.action.toLowerCase().includes(term) ||
                          log.userName.toLowerCase().includes(term) ||
                          log.ipAddress.includes(term) ||
                          log.resource.toLowerCase().includes(term)
                        );
                      }
                      return true;
                    })
                    .map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-mono text-white block">{log.timestamp.slice(0, 19).replace('T', ' ')}</span>
                          <span className="text-[10px] font-mono text-slate-500">IP: {log.ipAddress}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-white block">{log.userName}</span>
                          <span className="text-[10px] text-indigo-400 block">{log.userRole}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono text-xs font-semibold text-slate-200 block">{log.action}</span>
                          {log.justification && (
                            <span className="text-[11px] text-purple-300 italic block mt-0.5">
                              Motivo: &quot;{log.justification}&quot;
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-slate-300 font-medium block">{log.resource}</span>
                          <span className="text-[10px] font-mono text-slate-500">Tenant: {log.tenantId.slice(0, 12)}...</span>
                        </td>
                        <td className="py-3 px-4">
                          {log.status === 'success' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              SUCESSO
                            </span>
                          )}
                          {log.status === 'blocked' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1 w-max">
                              <ShieldAlert className="w-3 h-3" /> BLOQUEADO
                            </span>
                          )}
                          {log.status === 'warning' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                              ALERTA
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedLog(log);
                              setIsLogDetailOpen(true);
                            }}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors"
                          >
                            Ver Diff
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 5: LIMITES POR PLANO & COTAS (QUOTAS) */}
      {/* ========================================================================= */}
      {activeTab === 'plans' && (
        <div className="space-y-6">
          {/* Seletor de Tenant para Inspecionar Cota */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <div>
              <span className="text-xs text-slate-400 block font-medium">Inspecionando Cotas da Empresa:</span>
              <div className="flex items-center gap-2 mt-1">
                <Building className="w-4 h-4 text-indigo-400" />
                <span className="text-sm font-bold text-white">{currentActiveTenant?.name}</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {currentActiveTenant?.planName}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <select
                aria-label="Selecionar empresa para inspecionar cota"
                value={selectedTenantId}
                onChange={(e) => setSelectedTenantId(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.planName})
                  </option>
                ))}
              </select>

              <button
                onClick={() => setIsPlanChangeModalOpen(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition-colors flex items-center gap-1.5"
              >
                <DollarSign className="w-4 h-4" /> Alterar Plano / Pró-Rata
              </button>
            </div>
          </div>

          {/* Barras de Consumo de Cota do Tenant Selecionado */}
          {quotaUsage && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">Consumo Atual vs Limites do Plano</h3>
                  <p className="text-xs text-slate-400">Ao atingir 90% um alerta preventivo é gerado. Ao exceder, aplica-se Soft Block ou Hard Block.</p>
                </div>
                <div>
                  {quotaUsage.status === 'normal' && (
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Cotas em Conformidade
                    </span>
                  )}
                  {quotaUsage.status === 'warning_90' && (
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" /> Alerta de Cota: &gt; 90%
                    </span>
                  )}
                  {quotaUsage.status === 'soft_blocked' && (
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5" /> Soft Block Ativo (+10% tolerância)
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Clientes */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold text-slate-300">Clientes Cadastrados</span>
                    <span className="font-mono text-slate-400">
                      {quotaUsage.currentCustomers.toLocaleString()} / {quotaUsage.maxCustomers.toLocaleString()} (
                      {((quotaUsage.currentCustomers / quotaUsage.maxCustomers) * 100).toFixed(0)}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-2.5 rounded-full transition-all ${
                        quotaUsage.currentCustomers / quotaUsage.maxCustomers > 0.9 ? 'bg-amber-500' : 'bg-indigo-500'
                      }`}
                      style={{ width: `${Math.min(100, (quotaUsage.currentCustomers / quotaUsage.maxCustomers) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* 2. Itens de Peças */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold text-slate-300">Peças no Catálogo & Estoque</span>
                    <span className="font-mono text-slate-400">
                      {quotaUsage.currentItems.toLocaleString()} / {quotaUsage.maxItems.toLocaleString()} (
                      {((quotaUsage.currentItems / quotaUsage.maxItems) * 100).toFixed(0)}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-2.5 rounded-full transition-all ${
                        quotaUsage.currentItems / quotaUsage.maxItems > 0.9 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, (quotaUsage.currentItems / quotaUsage.maxItems) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* 3. Usuários */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold text-slate-300">Usuários Ativos</span>
                    <span className="font-mono text-slate-400">
                      {quotaUsage.currentUsers} / {quotaUsage.maxUsers} (
                      {((quotaUsage.currentUsers / quotaUsage.maxUsers) * 100).toFixed(0)}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="h-2.5 rounded-full bg-indigo-500"
                      style={{ width: `${Math.min(100, (quotaUsage.currentUsers / quotaUsage.maxUsers) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* 4. Armazenamento */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold text-slate-300">Armazenamento em Nuvem (Fotos/XML)</span>
                    <span className="font-mono text-slate-400">
                      {(quotaUsage.currentStorageMb / 1024).toFixed(1)} GB / {(quotaUsage.maxStorageMb / 1024).toFixed(1)} GB (
                      {((quotaUsage.currentStorageMb / quotaUsage.maxStorageMb) * 100).toFixed(0)}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="h-2.5 rounded-full bg-purple-500"
                      style={{ width: `${Math.min(100, (quotaUsage.currentStorageMb / quotaUsage.maxStorageMb) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Cards dos Planos Disponíveis */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {plans.map((p) => (
              <div
                key={p.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between hover:border-slate-700 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-white text-base">{p.name}</h4>
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      R$ {p.priceMonthly.toFixed(2)}/mês
                    </span>
                  </div>

                  <ul className="mt-4 space-y-2 text-xs text-slate-300">
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400" /> Até {p.quotas.maxCustomers.toLocaleString()} clientes
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400" /> Até {p.quotas.maxItems.toLocaleString()} peças no estoque
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400" /> Até {p.quotas.maxUsers} usuários simultâneos
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400" /> {(p.quotas.maxStorageMb / 1024).toFixed(0)} GB de armazenamento
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400" /> {p.quotas.maxApiRequestsPerDay.toLocaleString()} req/dia API
                    </li>
                  </ul>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">{p.features.length} recursos premium</span>
                  <button
                    onClick={() => {
                      setSelectedTargetPlan(p.id);
                      setIsPlanChangeModalOpen(true);
                    }}
                    className="px-3 py-1.5 bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded-lg text-xs font-semibold transition-colors"
                  >
                    Simular Migração
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 6: MENSAGENS INTERNAS & TEMPLATES */}
      {/* ========================================================================= */}
      {activeTab === 'messages' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <div>
              <h3 className="text-base font-bold text-white">Central de Mensagens Internas & Notificações</h3>
              <p className="text-xs text-slate-400">
                Templates com segmentação por tenant/plano, canais in-app e e-mail com registro de opt-out.
              </p>
            </div>

            <button
              onClick={() => setIsNewMessageModalOpen(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition-colors flex items-center gap-2"
            >
              <Send className="w-4 h-4" /> Disparar Comunicado
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {messages.map((m) => (
              <div key={m.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-white text-sm">{m.title}</h4>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      De: {m.senderName} ({m.senderRole}) • {m.createdAt.slice(0, 10)}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                      m.priority === 'urgent' || m.priority === 'high'
                        ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                        : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                    }`}
                  >
                    {m.priority.toUpperCase()}
                  </span>
                </div>

                <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed">{m.content}</p>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <div className="flex items-center gap-1.5">
                    {m.channels.map((c) => (
                      <span key={c} className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">
                        {c === 'in_app' ? 'In-App' : 'E-mail'}
                      </span>
                    ))}
                  </div>
                  <span>Destino: {m.tenantId === 'all' ? 'Todos os Tenants' : 'Tenant Específico'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 7: LGPD & CONFORMIDADE */}
      {/* ========================================================================= */}
      {activeTab === 'lgpd' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-base font-bold text-white mb-1">Portal do Titular & Salvaguardas LGPD (Lei 13.709/18)</h3>
            <p className="text-xs text-slate-400 mb-5">
              Gestão de consentimento, portabilidade e anonimização de dados com preservação de registros contábeis legais (art. 16, I).
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
                <h4 className="font-bold text-sm text-indigo-300 mb-1">Dossiê de Portabilidade de Dados</h4>
                <p className="text-xs text-slate-400 mb-3">
                  Exporta todas as informações de um cliente ou funcionário em formato estruturado (Art. 19).
                </p>
                <button
                  onClick={async () => {
                    const res = await apiFetch('/api/rbac/lgpd/export', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ document: '29841283904', name: 'Carlos Eduardo Silveira' })
                    });
                    const d = await res.json();
                    notify(d.message, 'success');
                    loadRbacData();
                  }}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" /> Exportar Dados do Titular
                </button>
              </div>

              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
                <h4 className="font-bold text-sm text-rose-300 mb-1">Anonimização & Eliminação</h4>
                <p className="text-xs text-slate-400 mb-3">
                  Anonimiza dados cadastrais, preservando chaves de NF-e para cumprimento fiscal.
                </p>
                <button
                  onClick={async () => {
                    const res = await apiFetch('/api/rbac/lgpd/anonymize', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ document: '11298044412', name: 'Marcos de Oliveira' })
                    });
                    const d = await res.json();
                    notify(d.message, 'success');
                    loadRbacData();
                  }}
                  className="px-3.5 py-1.5 bg-rose-600/30 hover:bg-rose-600 text-rose-300 hover:text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
                >
                  <UserX className="w-3.5 h-3.5" /> Executar Anonimização Segura
                </button>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h4 className="font-bold text-white text-sm mb-3">Histórico de Solicitações LGPD</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Titular (Mascarado)</th>
                    <th className="py-2.5 px-3">Tipo de Solicitação</th>
                    <th className="py-2.5 px-3">Data</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Parecer Legal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {lgpdRequests.map((r) => (
                    <tr key={r.id}>
                      <td className="py-2.5 px-3 font-semibold text-white">
                        {r.subjectName} ({r.subjectDocument})
                      </td>
                      <td className="py-2.5 px-3 text-indigo-300">{r.requestType}</td>
                      <td className="py-2.5 px-3 text-slate-400">{r.requestedAt.slice(0, 10)}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          {r.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 text-[11px]">{r.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 8: BATERIA DE TESTES AUTOMATIZADOS DE ISOLAMENTO E PERMISSÕES */}
      {/* ========================================================================= */}
      {activeTab === 'tests' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div>
              <h3 className="text-base font-bold text-white">Bateria Automatizada de Testes de Isolamento & RBAC</h3>
              <p className="text-xs text-slate-400">
                Executa verificações profundas de vazamento cruzado entre tenants, validação de guards e mascaramento de PII.
              </p>
            </div>

            <button
              onClick={handleRunSecurityTests}
              disabled={isRunningTests}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isRunningTests ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Verificando...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" /> Executar Bateria de Testes
                </>
              )}
            </button>
          </div>

          {testResults.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="text-sm font-bold text-white">
                  Resultados da Execução ({testResults.filter((r) => r.passed).length}/{testResults.length} Aprovados)
                </span>
                <span className="text-xs font-mono text-emerald-400 font-bold">TODOS OS GUARDS ATIVOS</span>
              </div>

              <div className="space-y-3">
                {testResults.map((t) => (
                  <div
                    key={t.testId}
                    className="p-4 rounded-xl border bg-slate-950/70 border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-indigo-400 font-bold">{t.testId}</span>
                        <h4 className="font-bold text-white text-sm">{t.name}</h4>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{t.description}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                        <span className="text-slate-400">
                          Esperado: <span className="text-slate-200 font-medium">{t.expected}</span>
                        </span>
                        <span className="text-slate-400">
                          Resultado: <span className="text-emerald-300 font-medium">{t.actual}</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end md:self-center">
                      <span className="text-xs font-mono text-slate-500">{t.durationMs}ms</span>
                      {t.passed ? (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" /> APROVADO
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1.5">
                          <XCircle className="w-4 h-4" /> FALHOU
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 9: DOCUMENTAÇÃO TÉCNICA */}
      {/* ========================================================================= */}
      {activeTab === 'docs' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-white mb-2">Arquitetura de Segurança RBAC Multi-Tenant</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              O sistema foi modelado para garantir isolamento absoluto entre empresas contratantes, segregação de funções para a equipe interna e conformidade estrita com a LGPD.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-300">
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
              <h4 className="font-bold text-indigo-400 text-sm flex items-center gap-2">
                <Database className="w-4 h-4" /> 1. Isolamento por tenant_id
              </h4>
              <p>
                Todo e qualquer registro de banco de dados (clientes, estoque, faturas, fornecedores, orçamentos, mensagens) possui a coluna <code className="text-indigo-300 font-mono">tenant_id</code> obrigatória. O backend injeta o filtro em tempo de execução, impedindo qualquer acesso cruzado acidental ou malicioso.
              </p>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
              <h4 className="font-bold text-indigo-400 text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> 2. Validação no Backend (Guards)
              </h4>
              <p>
                A interface frontend apenas esconde ou desabilita controles visuais. A real segurança é aplicada no backend através do middleware <code className="text-indigo-300 font-mono">requireRbacPermission()</code>, que analisa o token/sessão, papel, escopo e justificativa antes de processar qualquer endpoint.
              </p>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
              <h4 className="font-bold text-indigo-400 text-sm flex items-center gap-2">
                <Lock className="w-4 h-4" /> 3. Mascaramento Automático de PII
              </h4>
              <p>
                Logs técnicos e relatórios de suporte passam pela função <code className="text-indigo-300 font-mono">sanitizePayloadForAudit()</code>, mascarando automaticamente CPFs, CNPJs, telefones, e-mails e redigindo senhas e tokens para atender a LGPD.
              </p>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
              <h4 className="font-bold text-indigo-400 text-sm flex items-center gap-2">
                <KeyRound className="w-4 h-4" /> 4. Regra ✅* do Super Admin
              </h4>
              <p>
                Para evitar abuso ou quebra de confidencialidade, quando o Super Admin precisa visualizar dados sensíveis de uma empresa contratante (dados cadastrais ou clientes), o sistema exige uma justificativa formal registrada na trilha de auditoria irreversível.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CONVIDAR / NOVO USUÁRIO */}
      {/* ========================================================================= */}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-400" />
                {editingUser ? `Acessos de ${editingUser.name}` : 'Cadastrar Novo Usuário'}
              </h3>
              <button
                onClick={closeUserModal}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-3.5 text-xs">
              {editingUser ? (
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                  <span className="text-slate-300 block">
                    <span className="font-semibold text-white">{editingUser.name}</span> — {editingUser.email}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Papel: {editingUser.roleName}. Esta janela altera apenas as capacidades operacionais.
                  </span>
                </div>
              ) : (
              <>
              <div>
                <label className="text-slate-300 block font-semibold mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Amanda Nogueira"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-slate-300 block font-semibold mb-1">E-mail Corporativo</label>
                <input
                  type="email"
                  required
                  placeholder="Ex: amanda@empresa.com.br"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block font-semibold mb-1">Papel (Role)</label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as RbacRoleCode)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="tenant_user">Usuário do Tenant (Operacional)</option>
                    <option value="tenant_admin">Admin do Tenant</option>
                    <option value="tenant_readonly">Suporte Somente Leitura</option>
                    <option value="saas_financeiro">Admin SaaS — Financeiro</option>
                    <option value="saas_fiscal">Admin SaaS — Fiscal</option>
                    <option value="saas_suporte">Admin SaaS — Suporte</option>
                    <option value="saas_config">Admin SaaS — Config</option>
                    <option value="saas_cs">Admin SaaS — CS</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 block font-semibold mb-1">Empresa (Tenant)</label>
                  <select
                    value={newUserTenant}
                    onChange={(e) => setNewUserTenant(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  >
                    {tenants.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                    <option value="system">Plataforma SaaS Central</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-300 block font-semibold mb-1">Departamento / Função</label>
                <input
                  type="text"
                  placeholder="Ex: Faturamento e NF-e"
                  value={newUserDept}
                  onChange={(e) => setNewUserDept(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
              </>
              )}

              <div className="pt-3 border-t border-slate-800">
                <h4 className="text-xs font-bold text-white mb-3">
                  Capacidades operacionais
                  <span className="text-[11px] font-normal text-slate-400 ml-2">
                    (o admin do tenant sempre tem todas; a matriz vale para os demais papéis)
                  </span>
                </h4>
                <TenantPermissionMatrix
                  catalog={tenantCatalog}
                  groups={tenantGroups}
                  selected={newUserTenantPermissions}
                  onChange={setNewUserTenantPermissions}
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeUserModal}
                  className="px-4 py-2 bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20"
                >
                  {editingUser ? 'Salvar Acessos' : 'Concluir Cadastro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: VER DETALHES DO LOG (DIFF ANTES / DEPOIS COM PII MASCARADA) */}
      {/* ========================================================================= */}
      {isLogDetailOpen && selectedLog && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-400" /> Registro de Auditoria: {selectedLog.action}
                </h3>
                <span className="text-xs text-slate-400">
                  Responsável: {selectedLog.userName} ({selectedLog.userRole}) • IP: {selectedLog.ipAddress}
                </span>
              </div>
              <button
                onClick={() => setIsLogDetailOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedLog.justification && (
              <div className="p-3 bg-purple-950/30 border border-purple-500/30 rounded-xl text-xs text-purple-300">
                <span className="font-bold block mb-0.5">Justificativa Técnica Registrada:</span>
                &quot;{selectedLog.justification}&quot;
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 text-xs font-mono">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <span className="text-rose-400 font-bold block mb-2 font-sans">Estado Anterior (Before State):</span>
                <pre className="text-slate-400 text-[11px] whitespace-pre-wrap overflow-x-auto max-h-48">
                  {JSON.stringify(selectedLog.beforeState || { info: 'Sem alterações prévias registradas' }, null, 2)}
                </pre>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <span className="text-emerald-400 font-bold block mb-2 font-sans">Estado Posterior (After State):</span>
                <pre className="text-slate-300 text-[11px] whitespace-pre-wrap overflow-x-auto max-h-48">
                  {JSON.stringify(selectedLog.afterState || { info: 'Ação executada sem mutação estrutural' }, null, 2)}
                </pre>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Campos de senha, token e PII foram automaticamente higienizados e criptografados neste log.
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: JUSTIFICATIVA OBRIGATÓRIA (REGRA ✅*) */}
      {/* ========================================================================= */}
      {isJustificationModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-purple-400" /> Justificativa Obrigatória (Regra ✅*)
              </h3>
              <button
                onClick={() => setIsJustificationModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              O acesso de Super Admin a dados confidenciais de empresa contratante exige o registro de uma justificativa técnica formal na trilha de auditoria para conformidade com o princípio do menor privilégio.
            </p>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Motivo / Ticket / Ordem de Serviço</label>
              <textarea
                rows={3}
                placeholder="Ex: Chamado #8821 - Verificação de divergência no cálculo de ICMS da NF-e solicitado pelo cliente."
                value={justificationText}
                onChange={(e) => setJustificationText(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                onClick={() => setIsJustificationModalOpen(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmConfidentialAccess}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-purple-600/20"
              >
                Registrar & Autorizar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DISPARAR MENSAGEM INTERNA */}
      {/* ========================================================================= */}
      {isNewMessageModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Send className="w-5 h-5 text-indigo-400" /> Disparar Mensagem Interna
              </h3>
              <button
                onClick={() => setIsNewMessageModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendMessage} className="space-y-3.5 text-xs">
              <div>
                <label className="text-slate-300 block font-semibold mb-1">Usar Template Pronto</label>
                <select
                  aria-label="Usar template pronto"
                  value={msgTemplateCode}
                  onChange={(e) => applyTemplate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="">Selecione um template (ou escreva livremente)...</option>
                  <option value="boleto_vencido">Boleto Vencido (Cobrança)</option>
                  <option value="proximo_vencimento">Próximo Vencimento (Lembrete 3 dias)</option>
                  <option value="pagamento_confirmado">Pagamento Confirmado</option>
                  <option value="limite_atingido">Alerta de Cota (90% atingido)</option>
                  <option value="aviso_manutencao">Aviso de Manutenção / Atualização</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 block font-semibold mb-1">Destinatário (Segmentação)</label>
                <select
                  aria-label="Destinatário da mensagem"
                  value={msgTenant}
                  onChange={(e) => setMsgTenant(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="all">Todos os Clientes Contratantes (Broadcast)</option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.planName})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-300 block font-semibold mb-1">Título do Comunicado</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Fatura em atraso ou comunicado operacional"
                  value={msgTitle}
                  onChange={(e) => setMsgTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-slate-300 block font-semibold mb-1">Conteúdo da Mensagem</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Digite o texto da mensagem..."
                  value={msgContent}
                  onChange={(e) => setMsgContent(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewMessageModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20"
                >
                  Disparar Mensagem
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: SIMULADOR DE TROCA DE PLANO & PRÓ-RATA */}
      {/* ========================================================================= */}
      {isPlanChangeModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-400" /> Alterar Plano com Pró-Rata
              </h3>
              <button
                onClick={() => setIsPlanChangeModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              A mudança de plano recalcula os limites de cota imediatamente e efetua o cálculo proporcional de dias restantes no ciclo mensal com notificação automática ao cliente.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 block font-semibold mb-1">Empresa Contratante</label>
                <input
                  type="text"
                  disabled
                  value={currentActiveTenant?.name || ''}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-400 font-medium"
                />
              </div>

              <div>
                <label className="text-slate-300 block font-semibold mb-1">Novo Plano Desejado</label>
                <select
                  aria-label="Selecionar novo plano"
                  value={selectedTargetPlan}
                  onChange={(e) => setSelectedTargetPlan(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — R$ {p.priceMonthly.toFixed(2)}/mês
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs space-y-1">
                <span className="text-slate-400 block">Cálculo Proporcional Estimado:</span>
                <span className="text-sm font-bold text-emerald-400">
                  R$ 133,33 (referente a 15 dias residuais no ciclo atual)
                </span>
                <span className="text-[10px] text-slate-500 block">
                  Auditoria de upgrade registrada automaticamente.
                </span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                onClick={() => setIsPlanChangeModalOpen(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleChangePlan}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-600/20"
              >
                Confirmar Migração
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
