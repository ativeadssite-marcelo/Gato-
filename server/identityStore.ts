// =========================================================================
// IDENTIDADE — STORE (hidratação a partir do Postgres)
// =========================================================================
// Mesma filosofia de server/store.ts e server/credentials.ts: os arrays em
// memória são a fonte de verdade imediata, o Postgres é espelho best-effort e a
// hidratação acontece uma única vez, mesclando o que veio do banco sem
// substituir o que já existe.
//
// POR QUE MESCLAR E NUNCA SUBSTITUIR: os tenants e usuários de demonstração são
// semeados no código e não existem no banco. Uma hidratação que trocasse os
// arrays apagaria a demonstração inteira.
//
// Este módulo existe para o rbacEngine.ts continuar sem NENHUM import de banco:
// ele é dono dos arrays, este módulo é dono da persistência deles.
//
// RESTRIÇÃO DE ORDEM (não mover): a hidratação é chamada de dentro do
// `startServer()` (server.ts), depois de `runMigrations()`. Chamá-la no
// carregamento de um módulo a faria rodar antes do `dotenv.config()` — por
// hoisting de import — e ainda por cima ANTES do seed de demonstração, que
// então sobrescreveria com `senha123456` toda credencial recém-hidratada.
// =========================================================================

import { getDbPool, isDatabaseConfigured } from "./db";
import { RBAC_USERS_DATA, TENANTS_DATA } from "./rbacEngine";
import { listCredentialRecords, loadCredentialRecord } from "./auth";
import type { RbacUser, TenantAccount } from "../src/types/rbac";

let hydrated = false;

type Row = Record<string, unknown>;

// -------------------------------------------------------------------------
// Hidratação (as escritas ficam em server/identityMirror.ts)
// -------------------------------------------------------------------------

function jsonOrUndefined(value: unknown): any {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return undefined;
    }
  }
  return value;
}

function rowToTenant(r: Row): TenantAccount {
  return {
    id: String(r.id),
    name: String(r.name ?? ""),
    tradeName: String(r.tradeName ?? ""),
    cnpj: String(r.cnpj ?? ""),
    planId: String(r.planId ?? ""),
    planName: String(r.planName ?? ""),
    status: (r.status as TenantAccount["status"]) || "trial",
    contactEmail: String(r.contactEmail ?? ""),
    contactPhone: String(r.contactPhone ?? ""),
    city: String(r.city ?? ""),
    uf: String(r.uf ?? ""),
    createdAt: r.createdAt ? new Date(r.createdAt as string).toISOString() : new Date().toISOString(),
    mfaRequired: Boolean(r.mfaRequired),
    sessionTimeoutMinutes: Number(r.sessionTimeoutMinutes ?? 480),
    ipAllowlist: Array.isArray(r.ipAllowlist) ? (r.ipAllowlist as string[]) : [],
    softBlockEnabled: r.softBlockEnabled === undefined ? true : Boolean(r.softBlockEnabled),
  };
}

function rowToRbacUser(r: Row): RbacUser {
  return {
    id: String(r.id),
    tenantId: String(r.tenantId ?? ""),
    tenantName: String(r.tenantName ?? ""),
    name: String(r.name ?? ""),
    email: String(r.email ?? ""),
    roleCode: r.roleCode as RbacUser["roleCode"],
    roleName: String(r.roleName ?? ""),
    department: (r.department as string) ?? undefined,
    active: Boolean(r.active),
    avatarInitials: String(r.avatarInitials ?? ""),
    mfaEnabled: Boolean(r.mfaEnabled),
    mfaEnforced: Boolean(r.mfaEnforced),
    ipAllowlist: Array.isArray(r.ipAllowlist) ? (r.ipAllowlist as string[]) : undefined,
    sessionTimeoutMinutes: r.sessionTimeoutMinutes === null ? undefined : Number(r.sessionTimeoutMinutes),
    lastLoginAt: String(r.lastLoginAt ?? "Nunca"),
    lastLoginIp: String(r.lastLoginIp ?? "N/A"),
    createdAt: r.createdAt ? new Date(r.createdAt as string).toISOString() : new Date().toISOString(),
    customOverrides: jsonOrUndefined(r.customOverrides),
    tenantPermissions: jsonOrUndefined(r.tenantPermissions),
  };
}

/**
 * Traz do banco o que ainda não está em memória. Nunca lança: uma falha de
 * hidratação deixa a aplicação rodando com o que ela já tem (a semeadura).
 */
export async function hydrateIdentityStore(): Promise<void> {
  if (hydrated || !isDatabaseConfigured()) return;
  hydrated = true;

  try {
    const db = getDbPool();

    const tenants = await db.query('SELECT * FROM "Tenant";');
    for (const r of tenants.rows) {
      const t = rowToTenant(r);
      if (!TENANTS_DATA.some((x) => x.id === t.id)) TENANTS_DATA.push(t);
    }

    const users = await db.query('SELECT * FROM "RbacUser";');
    for (const r of users.rows) {
      const u = rowToRbacUser(r);
      // Mescla por id, mas respeita o que já existe: a semeadura tem precedência
      // sobre o banco para as contas de demonstração.
      if (!RBAC_USERS_DATA.some((x) => x.id === u.id)) RBAC_USERS_DATA.push(u);
    }

    // Credenciais por último entre as identidades: dependem dos usuários acima.
    const knownEmails = new Set(listCredentialRecords().map((c) => c.email));
    const creds = await db.query('SELECT * FROM "UserCredential";');
    for (const r of creds.rows) {
      const email = String(r.email ?? "").trim().toLowerCase();
      if (!email || knownEmails.has(email)) continue;
      // Só hidrata credencial de usuário vivo: a varredura de órfãos já removeu
      // o resto em memória, e trazê-la de volta daria acesso a conta descartada.
      if (!RBAC_USERS_DATA.some((u) => u.id === String(r.userId) && u.active)) continue;
      loadCredentialRecord({
        userId: String(r.userId),
        email,
        salt: String(r.salt ?? ""),
        hash: String(r.hash ?? ""),
      });
    }

  } catch (err: any) {
    console.warn(
      "[GATO Identidade] Hidratação do Postgres falhou (seguindo em memória):",
      err?.message || err,
    );
  }
}
