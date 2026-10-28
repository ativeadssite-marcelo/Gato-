// =========================================================================
// SERVIÇO DE TESTE DE 15 DIAS POR CNPJ & SUPORTE AO SUPERADMIN
// =========================================================================
// Gerencia a consulta, ativação e login de testes de 15 dias por CNPJ,
// além do envio de mensagens/leads de suporte diretamente para o Superadmin.
// Funciona tanto com a API do servidor quanto em fallback local (Netlify/Offline).
// =========================================================================

import { BranchUnit, CompanyProfile, UserSession } from '../types';
import { apiJson, setSessionToken, markSessionVerified } from '../services/apiClient';
import { buildUserSession, DEFAULT_CLEAN_BRANCH } from './sessionService';

export interface TrialCnpjRecord {
  cnpj: string;
  tradeName: string;
  corporateName?: string;
  adminName: string;
  email: string;
  phone?: string;
  city?: string;
  uf?: string;
  createdAt: string; // ISO String
  totalDays: number; // 15 dias
}

export interface TrialStatusResponse {
  exists: boolean;
  isExpired: boolean;
  daysRemaining: number;
  daysPassed: number;
  totalDays: number;
  record?: TrialCnpjRecord;
}

export interface SupportRequestPayload {
  cnpj?: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  requestType: 'teste_15_dias' | 'suporte_login' | 'liberacao_cnpj' | 'extensao_teste';
  message?: string;
}

export interface SupportRequestResult {
  success: boolean;
  message: string;
  protocol: string;
  timestamp: string;
}

// Remove pontuação de CNPJ
export function cleanCnpj(value: string): string {
  return (value || '').replace(/\D/g, '').slice(0, 14);
}

// Formata CNPJ: 00.000.000/0000-00
export function formatCnpj(value: string): string {
  const digits = cleanCnpj(value);
  if (!digits) return '';
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}

// Formata Telefone / WhatsApp: (00) 00000-0000
export function formatPhone(value: string): string {
  const digits = (value || '').replace(/\D/g, '').slice(0, 11);
  if (!digits) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

// Calcula dias restantes de um período de 15 dias
export function computeTrialDaysRemaining(createdAtIso: string, totalDays = 15): { daysPassed: number; daysRemaining: number; isExpired: boolean } {
  const createdDate = new Date(createdAtIso).getTime();
  const now = Date.now();
  const diffMs = Math.max(0, now - createdDate);
  const daysPassed = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const daysRemaining = Math.max(0, totalDays - daysPassed);
  const isExpired = daysRemaining <= 0;
  return { daysPassed, daysRemaining, isExpired };
}

// Obter registros locais de testes salvos
export function getLocalTrialRecords(): TrialCnpjRecord[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem('gato_registered_trial_cnpjs');
    if (raw) return JSON.parse(raw);
  } catch {
    /* noop */
  }
  return [];
}

// Salvar registros locais de testes
export function saveLocalTrialRecord(record: TrialCnpjRecord): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const records = getLocalTrialRecords();
    const clean = cleanCnpj(record.cnpj);
    const filtered = records.filter(r => cleanCnpj(r.cnpj) !== clean);
    filtered.unshift(record);
    localStorage.setItem('gato_registered_trial_cnpjs', JSON.stringify(filtered));
  } catch {
    /* noop */
  }
}

// =========================================================================
// 1. CONSULTAR STATUS DO TESTE DE 15 DIAS POR CNPJ
// =========================================================================
export async function checkTrialStatusByCnpj(cnpjInput: string): Promise<TrialStatusResponse> {
  const digits = cleanCnpj(cnpjInput);
  if (digits.length !== 14) {
    throw new Error('Informe um CNPJ válido com 14 dígitos.');
  }

  // Tentar consultar API do backend
  try {
    const response = await apiJson<TrialStatusResponse>(`/api/auth/trial-status?cnpj=${digits}`);
    if (response && typeof response.exists === 'boolean') {
      return response;
    }
  } catch {
    // Fallback: verificar store local
  }

  const localRecords = getLocalTrialRecords();
  const found = localRecords.find(r => cleanCnpj(r.cnpj) === digits);

  if (found) {
    const { daysPassed, daysRemaining, isExpired } = computeTrialDaysRemaining(found.createdAt, 15);
    return {
      exists: true,
      isExpired,
      daysRemaining,
      daysPassed,
      totalDays: 15,
      record: found,
    };
  }

  return {
    exists: false,
    isExpired: false,
    daysRemaining: 15,
    daysPassed: 0,
    totalDays: 15,
  };
}

// =========================================================================
// 2. ATIVAR TESTE DE 15 DIAS PARA UM NOVO CNPJ
// =========================================================================
export async function activateTrial15Days(data: {
  cnpj: string;
  tradeName: string;
  corporateName?: string;
  adminName: string;
  email: string;
  phone?: string;
  uf?: string;
  city?: string;
  branches?: BranchUnit[];
}): Promise<{ session: UserSession; companyProfile: CompanyProfile; daysRemaining: number }> {
  const digits = cleanCnpj(data.cnpj);
  if (digits.length !== 14) {
    throw new Error('CNPJ inválido: informe os 14 dígitos.');
  }
  if (!data.tradeName.trim()) {
    throw new Error('Informe o Nome Fantasia da sua empresa.');
  }
  if (!data.adminName.trim() || !data.email.trim()) {
    throw new Error('Informe o nome do responsável e o e-mail corporativo.');
  }

  const formattedCnpj = formatCnpj(digits);
  const nowIso = new Date().toISOString();
  const totalDays = 15;

  const trialRecord: TrialCnpjRecord = {
    cnpj: formattedCnpj,
    tradeName: data.tradeName.trim(),
    corporateName: data.corporateName?.trim() || `${data.tradeName.trim()} Peças LTDA`,
    adminName: data.adminName.trim(),
    email: data.email.trim().toLowerCase(),
    phone: data.phone?.trim(),
    city: data.city?.trim() || 'Campo Grande',
    uf: (data.uf || 'MS').toUpperCase().slice(0, 2),
    createdAt: nowIso,
    totalDays,
  };

  // Salvar registro local
  saveLocalTrialRecord(trialRecord);

  // Criar empresa do teste
  const companyProfile: CompanyProfile = {
    id: `empresa-trial-${digits}`,
    tradeName: trialRecord.tradeName,
    corporateName: trialRecord.corporateName || trialRecord.tradeName,
    cnpj: formattedCnpj,
    segment: 'Autopeças & Balcão',
    phone: trialRecord.phone || '(67) 3345-0000',
    email: trialRecord.email,
    city: trialRecord.city || 'Campo Grande',
    uf: trialRecord.uf || 'MS',
    taxRegime: 'simples_nacional',
    isTrial: true,
    trialDaysRemaining: totalDays,
    planName: 'GATO SaaS — Teste Grátis (15 Dias)',
    createdAt: nowIso,
  };

  // Matriz fiscal para a filial do teste
  const branchUnit: BranchUnit = {
    id: `matriz-trial-${digits}`,
    name: `${trialRecord.tradeName} — Matriz (${trialRecord.uf})`,
    cnpj: formattedCnpj,
    ie: 'ISENTO',
    isMatriz: true,
    uf: trialRecord.uf || 'MS',
    city: trialRecord.city || 'Campo Grande',
    address: `Sede Operacional — ${trialRecord.tradeName}`,
    sefazCode: trialRecord.uf === 'SP' ? '35' : trialRecord.uf === 'MS' ? '50' : '42',
    icmsInterno: 18,
    cdCode: `CD-${trialRecord.uf}`,
    cdName: `CD Central ${trialRecord.uf}`,
    description: `Matriz do Teste de 15 Dias da ${trialRecord.tradeName}`,
    status: 'ativa',
  };

  // Criar sessão do usuário
  const userSession: UserSession = {
    id: `usr_trial_${digits}`,
    name: trialRecord.adminName,
    email: trialRecord.email,
    role: 'administrador',
    roleLabel: 'Admin da Empresa (Teste 15 Dias)',
    roleCode: 'tenant_admin',
    isSaasScope: false,
    branchId: branchUnit.id,
    branchName: branchUnit.name,
    branchUf: branchUnit.uf,
    cdName: branchUnit.cdName,
    cdCode: branchUnit.cdCode,
    avatarInitials: trialRecord.adminName.slice(0, 2).toUpperCase(),
    loginTime: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    permissions: {
      '*': 'manage',
    },
  };

  // Tentar registrar no backend (se disponível)
  try {
    await apiJson('/api/auth/trial-activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(trialRecord),
    });
  } catch {
    /* noop backend failure, fallback persists locally */
  }

  // Notificar Superadmin localmente (fila de mensagens para visualização no painel)
  sendSupportRequest({
    cnpj: formattedCnpj,
    companyName: trialRecord.tradeName,
    contactName: trialRecord.adminName,
    email: trialRecord.email,
    phone: trialRecord.phone || '',
    requestType: 'teste_15_dias',
    message: `Nova empresa ativou o período de avaliação de 15 dias diretamente no login. Cidade/UF: ${trialRecord.city}/${trialRecord.uf}.`,
  }).catch(() => {/* noop */});

  // Salvar no localStorage
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem('gato_company_profile', JSON.stringify(companyProfile));
      localStorage.setItem('gato_user_session', JSON.stringify(userSession));
      localStorage.setItem('gato_active_store', branchUnit.id);
      const existingBranches = localStorage.getItem('gato_branches');
      let bList: BranchUnit[] = existingBranches ? JSON.parse(existingBranches) : [];
      bList = [branchUnit, ...bList.filter(b => b.id !== branchUnit.id)];
      localStorage.setItem('gato_branches', JSON.stringify(bList));
      const clientToken = `trial_token_${digits}_${Date.now()}`;
      setSessionToken(clientToken);
      markSessionVerified();
    } catch (err) {
      console.warn('LocalStorage error:', err);
    }
  }

  return { session: userSession, companyProfile, daysRemaining: totalDays };
}

// =========================================================================
// 3. ENTRAR NO SISTEMA COM CNPJ JÁ CADASTRADO PARA TESTE
// =========================================================================
export async function loginWithTrialCnpj(
  cnpjInput: string,
  branches: BranchUnit[] = []
): Promise<{ session: UserSession; companyProfile: CompanyProfile; daysRemaining: number }> {
  const digits = cleanCnpj(cnpjInput);
  if (digits.length !== 14) {
    throw new Error('Informe um CNPJ válido com 14 dígitos.');
  }

  const status = await checkTrialStatusByCnpj(digits);
  if (!status.exists || !status.record) {
    throw new Error('Este CNPJ ainda não possui um teste de 15 dias cadastrado.');
  }

  if (status.isExpired) {
    throw new Error(`O período de teste de 15 dias para este CNPJ expirou há ${status.daysPassed - 15} dia(s). Solicite a liberação ou fale com o Superadmin.`);
  }

  const record = status.record;
  const companyProfile: CompanyProfile = {
    id: `empresa-trial-${digits}`,
    tradeName: record.tradeName,
    corporateName: record.corporateName || record.tradeName,
    cnpj: record.cnpj,
    segment: 'Autopeças & Balcão',
    phone: record.phone || '(67) 3345-0000',
    email: record.email,
    city: record.city || 'Campo Grande',
    uf: record.uf || 'MS',
    taxRegime: 'simples_nacional',
    isTrial: true,
    trialDaysRemaining: status.daysRemaining,
    planName: 'GATO SaaS — Teste Grátis (15 Dias)',
    createdAt: record.createdAt,
  };

  const branchUnit: BranchUnit = {
    id: `matriz-trial-${digits}`,
    name: `${record.tradeName} — Matriz (${record.uf || 'MS'})`,
    cnpj: record.cnpj,
    ie: 'ISENTO',
    isMatriz: true,
    uf: record.uf || 'MS',
    city: record.city || 'Campo Grande',
    address: `Sede Operacional — ${record.tradeName}`,
    sefazCode: record.uf === 'SP' ? '35' : '50',
    icmsInterno: 18,
    cdCode: `CD-${record.uf || 'MS'}`,
    cdName: `CD Central ${record.uf || 'MS'}`,
    description: `Matriz do Teste de 15 Dias da ${record.tradeName}`,
    status: 'ativa',
  };

  const userSession: UserSession = {
    id: `usr_trial_${digits}`,
    name: record.adminName,
    email: record.email,
    role: 'administrador',
    roleLabel: 'Admin da Empresa (Teste 15 Dias)',
    roleCode: 'tenant_admin',
    isSaasScope: false,
    branchId: branchUnit.id,
    branchName: branchUnit.name,
    branchUf: branchUnit.uf,
    cdName: branchUnit.cdName,
    cdCode: branchUnit.cdCode,
    avatarInitials: record.adminName.slice(0, 2).toUpperCase(),
    loginTime: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    permissions: {
      '*': 'manage',
    },
  };

  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem('gato_company_profile', JSON.stringify(companyProfile));
      localStorage.setItem('gato_user_session', JSON.stringify(userSession));
      localStorage.setItem('gato_active_store', branchUnit.id);
      const clientToken = `trial_token_${digits}_${Date.now()}`;
      setSessionToken(clientToken);
      markSessionVerified();
    } catch {
      /* noop */
    }
  }

  return { session: userSession, companyProfile, daysRemaining: status.daysRemaining };
}

// =========================================================================
// 4. ENVIAR SOLICITAÇÃO DE TESTE / SUPORTE PARA O SUPERADMIN
// =========================================================================
export async function sendSupportRequest(payload: SupportRequestPayload): Promise<SupportRequestResult> {
  const protocol = `GATO-${Date.now().toString().slice(-6)}`;
  const timestamp = new Date().toISOString();

  const formattedPayload = {
    ...payload,
    cnpj: payload.cnpj ? formatCnpj(payload.cnpj) : undefined,
    protocol,
    timestamp,
  };

  // Salvar no histórico local de leads do Superadmin
  if (typeof localStorage !== 'undefined') {
    try {
      const existing = localStorage.getItem('gato_superadmin_leads');
      const list = existing ? JSON.parse(existing) : [];
      list.unshift(formattedPayload);
      localStorage.setItem('gato_superadmin_leads', JSON.stringify(list));

      // Também grava em mensagens internas para exibição no painel de administração
      const existingMsgs = localStorage.getItem('gato_internal_messages');
      const msgs = existingMsgs ? JSON.parse(existingMsgs) : [];
      const typeLabel = 
        payload.requestType === 'teste_15_dias' ? 'Solicitação de Teste 15 Dias' :
        payload.requestType === 'suporte_login' ? 'Suporte Técnico de Login' :
        payload.requestType === 'liberacao_cnpj' ? 'Liberação de CNPJ Bloqueado' : 'Extensão de Teste';

      msgs.unshift({
        id: `msg_lead_${Date.now()}`,
        tenantId: 'system',
        senderId: 'login_lead_visitor',
        senderName: `${payload.contactName} (${payload.companyName})`,
        senderRole: 'Lead / Contato de Login',
        title: `[${typeLabel}] ${payload.companyName} (${payload.cnpj || 'Sem CNPJ'})`,
        content: `Protocolo: ${protocol}\nNome: ${payload.contactName}\nEmpresa: ${payload.companyName}\nCNPJ: ${payload.cnpj || 'Não informado'}\nE-mail: ${payload.email}\nWhatsApp: ${payload.phone}\nMensagem: ${payload.message || 'Sem observações adicionais.'}`,
        channels: ['in_app', 'email'],
        priority: 'high',
        createdAt: timestamp,
        readBy: [],
        optOutUsers: [],
      });
      localStorage.setItem('gato_internal_messages', JSON.stringify(msgs));
    } catch (err) {
      console.warn('LocalStorage error saving lead:', err);
    }
  }

  // Tentar enviar via API backend
  try {
    const res = await apiJson<SupportRequestResult>('/api/auth/support-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formattedPayload),
    });
    return res;
  } catch {
    // Retorno de sucesso garantido com o registro local
    return {
      success: true,
      message: 'Solicitação enviada com sucesso! O Superadmin da plataforma entrará em contato.',
      protocol,
      timestamp,
    };
  }
}
