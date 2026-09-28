// =========================================================================
// ESPELHO DE IDENTIDADE — tenants e usuários de acesso
// =========================================================================
// Só as escritas. A hidratação (leitura) mora no identityStore, que precisa
// importar o auth para trazer as credenciais de login.
//
// POR QUE SEPARADO: o auth.ts é um dos escritores — ele cria o primeiro admin
// no cadastro de empresa e atualiza papel/tenant. Se as funções de espelho
// morassem no identityStore, o auth teria de importá-lo e o identityStore teria
// de importar o auth (para hidratar credenciais): ciclo de import. Aqui a
// dependência é de mão única — este módulo não conhece o auth.
// =========================================================================

import { mirror } from "./dbMirror";
import type { RbacUser, TenantAccount } from "../src/types/rbac";

export function mirrorTenantUpsert(t: TenantAccount): void {
  mirror(
    `INSERT INTO "Tenant" (id, name, "tradeName", cnpj, "contactEmail", "contactPhone", city, uf,
        "planId", "planName", status, "mfaRequired", "sessionTimeoutMinutes", "ipAllowlist",
        "softBlockEnabled", "createdAt", "updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,NOW())
     ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, "tradeName" = EXCLUDED."tradeName",
       cnpj = EXCLUDED.cnpj, "contactEmail" = EXCLUDED."contactEmail",
       "contactPhone" = EXCLUDED."contactPhone", city = EXCLUDED.city, uf = EXCLUDED.uf,
       "planId" = EXCLUDED."planId", "planName" = EXCLUDED."planName", status = EXCLUDED.status,
       "mfaRequired" = EXCLUDED."mfaRequired",
       "sessionTimeoutMinutes" = EXCLUDED."sessionTimeoutMinutes",
       "ipAllowlist" = EXCLUDED."ipAllowlist", "softBlockEnabled" = EXCLUDED."softBlockEnabled",
       "updatedAt" = NOW();`,
    [
      t.id,
      t.name,
      t.tradeName ?? "",
      t.cnpj ?? "",
      t.contactEmail ?? "",
      t.contactPhone ?? null,
      t.city ?? null,
      t.uf ?? null,
      t.planId ?? null,
      t.planName ?? null,
      t.status ?? "trial",
      Boolean(t.mfaRequired),
      t.sessionTimeoutMinutes ?? 480,
      JSON.stringify(t.ipAllowlist ?? []),
      Boolean(t.softBlockEnabled),
      t.createdAt ?? new Date().toISOString(),
    ],
  );
}

export function mirrorRbacUserUpsert(u: RbacUser): void {
  mirror(
    `INSERT INTO "RbacUser" (id, "tenantId", "tenantName", name, email, "roleCode", "roleName",
        department, active, "avatarInitials", "mfaEnabled", "mfaEnforced", "ipAllowlist",
        "sessionTimeoutMinutes", "lastLoginAt", "lastLoginIp", "createdAt", "customOverrides",
        "tenantPermissions")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
     ON CONFLICT (id) DO UPDATE SET "tenantId" = EXCLUDED."tenantId",
       "tenantName" = EXCLUDED."tenantName", name = EXCLUDED.name, email = EXCLUDED.email,
       "roleCode" = EXCLUDED."roleCode", "roleName" = EXCLUDED."roleName",
       department = EXCLUDED.department, active = EXCLUDED.active,
       "avatarInitials" = EXCLUDED."avatarInitials", "mfaEnabled" = EXCLUDED."mfaEnabled",
       "mfaEnforced" = EXCLUDED."mfaEnforced", "ipAllowlist" = EXCLUDED."ipAllowlist",
       "sessionTimeoutMinutes" = EXCLUDED."sessionTimeoutMinutes",
       "lastLoginAt" = EXCLUDED."lastLoginAt", "lastLoginIp" = EXCLUDED."lastLoginIp",
       "customOverrides" = EXCLUDED."customOverrides",
       "tenantPermissions" = EXCLUDED."tenantPermissions";`,
    [
      u.id,
      u.tenantId,
      u.tenantName ?? "",
      u.name,
      u.email,
      u.roleCode,
      u.roleName ?? "",
      u.department ?? null,
      Boolean(u.active),
      u.avatarInitials ?? null,
      Boolean(u.mfaEnabled),
      Boolean(u.mfaEnforced),
      u.ipAllowlist ? JSON.stringify(u.ipAllowlist) : null,
      u.sessionTimeoutMinutes ?? null,
      // A coluna é TEXT de propósito (o domínio guarda "Nunca" como valor).
      u.lastLoginAt ?? null,
      u.lastLoginIp ?? null,
      u.createdAt ?? new Date().toISOString(),
      u.customOverrides ? JSON.stringify(u.customOverrides) : null,
      u.tenantPermissions ? JSON.stringify(u.tenantPermissions) : null,
    ],
  );
}
