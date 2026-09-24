import React, { useEffect, useMemo, useState } from 'react';
import {
  Users,
  UserPlus,
  ShieldCheck,
  ShieldAlert,
  Pencil,
  RefreshCw,
  X,
  Check,
  KeyRound,
  AlertTriangle,
  Info,
} from 'lucide-react';
import type { RbacRoleCode, RbacUser, TenantPermissionDefinition, TenantPermissionKey } from '../types/rbac';
import type { UserSession } from '../types';
import { apiJson } from '../services/apiClient';
import { TenantPermissionMatrix } from './TenantPermissionMatrix';
import { MENU_ITEM_LABELS, MENU_TENANT_PERMISSION, isMenuVisible } from '../utils/menuAccess';

/**
 * "Equipe & Acessos" — tela do ADMIN DO TENANT para montar o acesso de cada
 * sub-usuário (construtor flexível).
 *
 * Por que uma tela própria: a governança RBAC (`/rbac`) é gate de plataforma —
 * exige senha master e papel elevado, e `tenant_admin` não passa por
 * `isElevatedAdmin()`. Portanto esta view NÃO entra em RESTRICTED_VIEWS.
 *
 * O menu do sub-usuário reage a estas capacidades via `menuAccess.ts`. A
 * segurança de verdade continua no servidor (`requireTenantPermission`); aqui é
 * só a interface deixando de oferecer o que o usuário não pode fazer.
 */

interface EquipeAcessosProps {
  userSession?: UserSession | null;
  onShowNotification?: (title: string, message: string, type?: 'success' | 'warning' | 'info') => void;
}

interface TenantPermissionsResponse {
  success: boolean;
  groups: Array<{ id: TenantPermissionDefinition['group']; name: string }>;
  permissions: TenantPermissionDefinition[];
}

interface UsersResponse {
  success: boolean;
  count: number;
  users: RbacUser[];
}

type ModalState =
  | { mode: 'create' }
  | { mode: 'edit'; user: RbacUser }
  | null;

/** Itens do menu que o construtor consegue esconder (para a prévia ao vivo). */
const PREVIEW_ITEM_IDS = Object.keys(MENU_TENANT_PERMISSION);

export const EquipeAcessos: React.FC<EquipeAcessosProps> = ({ userSession, onShowNotification }) => {
  const [catalog, setCatalog] = useState<TenantPermissionDefinition[]>([]);
  const [groups, setGroups] = useState<TenantPermissionsResponse['groups']>([]);
  const [users, setUsers] = useState<RbacUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [modal, setModal] = useState<ModalState>(null);
  const [draft, setDraft] = useState<TenantPermissionKey[]>([]);

  // Campos do formulário de criação
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState<RbacRoleCode>('tenant_user');
  const [formDepartment, setFormDepartment] = useState('Operacional');

  const notify = (
    title: string,
    message: string,
    type: 'success' | 'warning' | 'info' = 'success',
  ) => onShowNotification?.(title, message, type);

  const loadData = async () => {
    try {
      setLoading(true);
      const [catalogRes, usersRes] = await Promise.all([
        apiJson<TenantPermissionsResponse>('/api/rbac/tenant-permissions'),
        apiJson<UsersResponse>('/api/rbac/users'),
      ]);
      if (catalogRes.success) {
        setCatalog(catalogRes.permissions);
        setGroups(catalogRes.groups);
      }
      if (usersRes.success) {
        // O servidor já devolve apenas usuários do próprio tenant para escopos
        // de tenant (rbacRoutes.ts `/users`), e esta tela é exclusiva do admin
        // do tenant — por isso não há filtro adicional aqui.
        setUsers(usersRes.users);
      }
    } catch (err: any) {
      notify('Falha ao carregar equipe', err?.message || 'Não foi possível consultar os acessos.', 'warning');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Recarrega ao trocar de usuário (login/logout), não a cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userSession?.id]);

  const openCreate = () => {
    setFormName('');
    setFormEmail('');
    setFormRole('tenant_user');
    setFormDepartment('Operacional');
    setDraft([]);
    setModal({ mode: 'create' });
  };

  const openEdit = (user: RbacUser) => {
    setDraft([...(user.tenantPermissions || [])]);
    setModal({ mode: 'edit', user });
  };

  const closeModal = () => {
    setModal(null);
    setDraft([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modal) return;

    setBusy(true);
    try {
      if (modal.mode === 'create') {
        if (!formName.trim() || !formEmail.trim()) return;
        await apiJson('/api/rbac/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          // Sem `tenantId`: o servidor força o tenant do chamador. Enviar outro
          // valor esbarraria na fronteira de isolamento multi-tenant.
          body: JSON.stringify({
            name: formName.trim(),
            email: formEmail.trim(),
            roleCode: formRole,
            department: formDepartment.trim() || 'Operacional',
            tenantPermissions: draft,
          }),
        });
        notify('Usuário cadastrado', `${formName.trim()} agora tem ${draft.length} capacidade(s) liberada(s).`);
      } else {
        await apiJson(`/api/rbac/users/${modal.user.id}/role`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          // `roleCode` vai junto para o endpoint não perder o papel do usuário.
          body: JSON.stringify({ roleCode: modal.user.roleCode, tenantPermissions: draft }),
        });
        notify('Acessos atualizados', `${modal.user.name} agora tem ${draft.length} capacidade(s) liberada(s).`);
      }
      closeModal();
      await loadData();
    } catch (err: any) {
      // O servidor responde 403 (isolamento), 402 (cota do plano) e 400 com
      // mensagens específicas — repassar é mais útil que um texto genérico.
      notify('Não foi possível salvar', err?.message || 'Erro inesperado ao gravar os acessos.', 'warning');
    } finally {
      setBusy(false);
    }
  };

  /** Sessão hipotética com o rascunho, só para prévia do menu. */
  const previewSession = useMemo<UserSession | null>(() => {
    if (!userSession) return null;
    return {
      ...userSession,
      roleCode: modal?.mode === 'edit' ? modal.user.roleCode : formRole,
      isSaasScope: false,
      tenantPermissions: draft,
    };
  }, [userSession, modal, formRole, draft]);

  const previewItems = useMemo(() => {
    if (!previewSession) return { visible: [] as string[], hidden: [] as string[] };
    const visible: string[] = [];
    const hidden: string[] = [];
    for (const id of PREVIEW_ITEM_IDS) {
      const label = MENU_ITEM_LABELS[id] || id;
      (isMenuVisible(id, previewSession) ? visible : hidden).push(label);
    }
    return { visible, hidden };
  }, [previewSession]);

  const countCapabilities = (user: RbacUser): string =>
    user.roleCode === 'tenant_admin' ? 'Todas' : `${user.tenantPermissions?.length || 0} de ${catalog.length}`;

  if (userSession && userSession.roleCode !== 'tenant_admin') {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h2 className="text-sm font-bold text-white">Área restrita ao administrador da empresa</h2>
            <p className="text-xs text-slate-400 mt-1">
              Somente o admin do tenant pode definir os acessos da equipe.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Cabeçalho */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-500/20 border border-indigo-500/40 rounded-xl text-indigo-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">Equipe &amp; Acessos</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Defina o que cada pessoa da sua equipe pode fazer. O menu dela se ajusta automaticamente.
            </p>
          </div>
        </div>

        <button
          onClick={openCreate}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition-colors flex items-center gap-2 shrink-0"
        >
          <UserPlus className="w-4 h-4" /> Novo usuário
        </button>
      </div>

      {/* Lista da equipe */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-8 flex items-center justify-center gap-2 text-xs text-slate-400">
            <RefreshCw className="w-4 h-4 animate-spin" /> Carregando equipe...
          </div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            Nenhum usuário cadastrado nesta empresa ainda.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Usuário</th>
                  <th className="py-3 px-4">Papel</th>
                  <th className="py-3 px-4">Capacidades</th>
                  <th className="py-3 px-4">Último acesso</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {users.map((user) => {
                  const isAdmin = user.roleCode === 'tenant_admin';
                  return (
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
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 block w-max">
                          {user.roleName}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {isAdmin ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 w-max">
                            <ShieldCheck className="w-3 h-3" /> Acesso total
                          </span>
                        ) : (
                          <span className="text-slate-300 font-mono">{countCapabilities(user)}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">
                        <span className="block">{user.lastLoginAt?.slice(0, 10) || 'Nunca'}</span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => openEdit(user)}
                          disabled={isAdmin}
                          title={
                            isAdmin
                              ? 'O admin do tenant possui todas as capacidades por definição.'
                              : 'Editar as capacidades deste usuário'
                          }
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 rounded-lg text-xs font-medium transition-colors inline-flex items-center gap-1.5"
                        >
                          <Pencil className="w-3.5 h-3.5" /> Editar acessos
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Nota sobre o admin do tenant */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <p className="text-[11px] text-slate-400 leading-relaxed">
          O admin da empresa sempre tem acesso a tudo — a matriz vale para os demais usuários. A
          verificação final acontece no servidor: mesmo que alguém alcance uma tela, a ação sem
          capacidade é recusada com <span className="font-mono text-slate-300">403</span>.
        </p>
      </div>

      {/* Modal de criação/edição */}
      {modal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-indigo-400" />
                {modal.mode === 'create' ? 'Novo usuário' : `Acessos de ${modal.user.name}`}
              </h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {modal.mode === 'create' ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-300 block font-semibold mb-1">Nome completo</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Amanda Nogueira"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-slate-300 block font-semibold mb-1">E-mail</label>
                      <input
                        type="email"
                        required
                        placeholder="Ex: amanda@empresa.com.br"
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-slate-300 block font-semibold mb-1">Papel</label>
                      <select
                        value={formRole}
                        onChange={(e) => setFormRole(e.target.value as RbacRoleCode)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                      >
                        <option value="tenant_user">Usuário operacional</option>
                        <option value="tenant_readonly">Somente leitura</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-slate-300 block font-semibold mb-1">Departamento / função</label>
                      <input
                        type="text"
                        placeholder="Ex: Balcão"
                        value={formDepartment}
                        onChange={(e) => setFormDepartment(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                  <span className="text-slate-300 block">
                    <span className="font-semibold text-white">{modal.user.name}</span> — {modal.user.email}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Papel: {modal.user.roleName}. Esta tela altera apenas as capacidades.
                  </span>
                </div>
              )}

              <div className="pt-3 border-t border-slate-800">
                <h4 className="text-xs font-bold text-white mb-3">O que esta pessoa pode fazer</h4>
                <TenantPermissionMatrix
                  catalog={catalog}
                  groups={groups}
                  selected={draft}
                  onChange={setDraft}
                  disabled={busy}
                />
              </div>

              {/* Prévia do menu resultante */}
              <div className="pt-3 border-t border-slate-800">
                <h4 className="text-xs font-bold text-white mb-2">Menu que esta pessoa vai ver</h4>
                <div className="flex flex-wrap gap-1.5">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Início
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Consulta de Peças
                  </span>
                  {previewItems.visible.map((label) => (
                    <span
                      key={label}
                      className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    >
                      {label}
                    </span>
                  ))}
                  {previewItems.hidden.map((label) => (
                    <span
                      key={label}
                      className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-800 text-slate-500 border border-slate-700/60 line-through"
                    >
                      {label}
                    </span>
                  ))}
                </div>
                {previewItems.hidden.length > 0 && (
                  <p className="text-[10px] text-slate-500 mt-2 flex items-center gap-1.5">
                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                    Itens riscados ficam ocultos para este usuário.
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 flex items-center gap-2"
                >
                  {busy ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  {modal.mode === 'create' ? 'Criar usuário' : 'Salvar acessos'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
