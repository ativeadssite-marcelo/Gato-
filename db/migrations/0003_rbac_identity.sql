-- =========================================================================
-- 0003 — Identidade de acesso: RbacUser e UserCredential (GATO SaaS)
-- =========================================================================
-- Até aqui o domínio de identidade vivia só em memória: criar um usuário pela
-- tela não deixava rastro nenhum e ele desaparecia no restart. Estas duas
-- tabelas são o par inseparável que faz o cadastro sobreviver:
--
--   "RbacUser"       — quem é, de qual tenant, com qual papel e capacidades.
--   "UserCredential" — o segredo de login (salt + scrypt), chaveado pelo e-mail
--                      normalizado, exatamente como o Map em memória.
--
-- POR QUE NA MESMA MIGRAÇÃO: usuário sem credencial é lockout permanente — a
-- conta reaparece após o restart e não autentica mais. Credencial órfã, ao
-- contrário, é inofensiva (a varredura de órfãos remove). Manter as duas juntas
-- impede que divirjam.
--
-- SEGURANÇA: a senha em claro não tem coluna. O que fica é o hash scrypt de 64
-- bytes e o salt aleatório de 16 bytes — o mesmo esquema de server/auth.ts.
-- =========================================================================

-- -------------------------------------------------------------------------
-- Perfil de acesso: a equipe SaaS (super_admin, saas_*) e os usuários dos
-- contratantes convivem aqui, como no array em memória.
--
-- SEM foreign key em "tenantId", de propósito: a equipe da plataforma vive sob
-- o tenantId sintético 'system', que não é linha de "Tenant". Uma FK aqui
-- recusaria todo o time do SaaS.
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "RbacUser" (
  id                  TEXT PRIMARY KEY,
  "tenantId"          TEXT NOT NULL,
  "tenantName"        TEXT NOT NULL DEFAULT '',
  name                TEXT NOT NULL,
  email               TEXT NOT NULL,
  "roleCode"          TEXT NOT NULL,
  "roleName"          TEXT NOT NULL DEFAULT '',
  department          TEXT,
  active              BOOLEAN NOT NULL DEFAULT TRUE,
  "avatarInitials"    TEXT,
  "mfaEnabled"        BOOLEAN NOT NULL DEFAULT FALSE,
  "mfaEnforced"       BOOLEAN NOT NULL DEFAULT FALSE,
  "ipAllowlist"       JSONB,
  "sessionTimeoutMinutes" INTEGER,
  -- TEXT e não TIMESTAMPTZ: o domínio guarda a string ISO (ou "Nunca") e o
  -- espelho não deve reinterpretar o valor.
  "lastLoginAt"       TEXT,
  "lastLoginIp"       TEXT,
  "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "customOverrides"   JSONB,
  "tenantPermissions" JSONB
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_rbacuser_email" ON "RbacUser" (LOWER(email));
CREATE INDEX IF NOT EXISTS "idx_rbacuser_tenantId" ON "RbacUser" ("tenantId");
CREATE INDEX IF NOT EXISTS "idx_rbacuser_roleCode" ON "RbacUser" ("roleCode");

-- -------------------------------------------------------------------------
-- Segredo de login. A chave primária é o e-mail normalizado — mesma chave do
-- Map em memória, para a hidratação ser uma cópia direta.
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "UserCredential" (
  email       TEXT PRIMARY KEY, -- sempre LOWER(TRIM(email))
  "userId"    TEXT NOT NULL,
  salt        TEXT NOT NULL,
  hash        TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "fk_usercredential_user" FOREIGN KEY ("userId") REFERENCES "RbacUser"(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_usercredential_userId" ON "UserCredential" ("userId");
