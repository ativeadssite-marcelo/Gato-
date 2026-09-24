// =========================================================================
// CREDENCIAIS DE INTEGRAÇÃO DO TENANT — GATO SaaS
// =========================================================================
// Cada contratante tem 1 chave de API (integração máquina-a-máquina) e 1 licença
// de máquina (aplicativo de desktop). Ambas revogáveis e rotacionáveis.
//
// O SEGREDO EM CLARO NUNCA É PERSISTIDO. Guardamos apenas o hash sha256 e um
// prefixo exibível para o cliente identificar qual chave é. O claro aparece uma
// única vez, na resposta da criação/rotação, e não é recuperável depois.
// =========================================================================

import type { TenantPermissionKey } from './rbac';

export type CredentialKind = 'api_key' | 'machine_license';

export interface TenantCredential {
  id: string;
  tenantId: string;
  kind: CredentialKind;
  /** Nome dado por quem gerou, para distinguir o uso (ex: "Integração ERP"). */
  label: string;
  /** Trecho inicial exibível: identifica a chave sem revelá-la. */
  keyPrefix: string;
  /** Últimos 4 caracteres, para conferência visual. */
  keyLast4: string;
  /** sha256 do segredo completo. O segredo não é recuperável a partir daqui. */
  keyHash: string;
  /** Capacidades operacionais que a chave pode exercer (só faz sentido em api_key). */
  capabilities: TenantPermissionKey[];
  active: boolean;
  createdAt: string;
  createdBy: { id: string; name: string };
  lastUsedAt?: string;
  rotatedAt?: string;
  revokedAt?: string;
}

/** Vínculo de uma licença a uma máquina. No máximo 1 ativo por licença. */
export interface MachineActivation {
  id: string;
  tenantId: string;
  credentialId: string;
  /** Identificador enviado pelo aplicativo cliente. Ver a ressalva de spoofing. */
  machineId: string;
  machineLabel?: string;
  activatedAt: string;
  deactivatedAt?: string;
  active: boolean;
}

/** Forma segura para a UI: o hash não sai do servidor. */
export type CredentialView = Omit<TenantCredential, 'keyHash'> & {
  activation?: Pick<MachineActivation, 'machineId' | 'machineLabel' | 'activatedAt'>;
  /** Uso da cota diária de API desta credencial, quando for api_key. */
  apiUsage?: { used: number; limit: number };
};

/** Identidade resolvida a partir da chave de API, para as rotas de /api/v1. */
export interface ApiAuthContext {
  credentialId: string;
  tenantId: string;
  label: string;
  capabilities: TenantPermissionKey[];
}
