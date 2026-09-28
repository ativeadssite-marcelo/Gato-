-- =========================================================================
-- 0000 — Núcleo: Tenant e User (GATO SaaS)
-- =========================================================================
-- POR QUE ESTE ARQUIVO VEM ANTES DO 0001: sobre a tabela "Tenant" repousam 6
-- foreign keys declaradas em 0001 e 0002 (assinatura, fatura, cliente de gateway,
-- cota de uso, credencial de integração, ativação de máquina) — mas a tabela
-- nunca era criada por nenhuma migração. Como o runner aplica os arquivos em
-- ordem lexicográfica (server/migrate.ts), a 0001 falhava com
-- `relation "Tenant" does not exist` na primeira execução real. O sufixo 0000
-- ordena antes sem renomear histórico e sem tocar no runner.
--
-- "User" entra junto porque é a expectativa já existente do código: o
-- `emailExistsInDatabase` (server/db.ts) consulta "User" e "Tenant", e o
-- validateDb.ts lista "User" entre as tabelas principais a conferir.
--
-- Convenções da casa: identificadores PascalCase entre aspas, ids TEXT gerados
-- pela aplicação, timestamps TIMESTAMPTZ, constraints nomeadas.
-- =========================================================================

-- -------------------------------------------------------------------------
-- Contratante. Colunas alinhadas ao que o insertTenantAccount (db.ts) já grava
-- e ao tipo TenantAccount de src/types/rbac.ts.
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Tenant" (
  id                      TEXT PRIMARY KEY,
  name                    TEXT NOT NULL,
  "tradeName"             TEXT NOT NULL DEFAULT '',
  cnpj                    TEXT NOT NULL DEFAULT '',
  "stateRegistration"     TEXT,
  segment                 TEXT,
  "contactEmail"          TEXT NOT NULL DEFAULT '',
  "contactPhone"          TEXT,
  city                    TEXT,
  uf                      TEXT,
  "planId"                TEXT,
  "planName"              TEXT,
  status                  TEXT NOT NULL DEFAULT 'trial', -- 'active' | 'suspended' | 'trial' | 'blocked'
  -- "mfaRequired" e "sessionTimeoutMinutes" existem no tipo TenantAccount mas
  -- ainda são gravados com valor fixo pela aplicação (MFA real é pendência).
  "mfaRequired"           BOOLEAN NOT NULL DEFAULT false,
  "sessionTimeoutMinutes" INTEGER NOT NULL DEFAULT 480,
  "ipAllowlist"           JSONB NOT NULL DEFAULT '[]'::jsonb,
  "softBlockEnabled"      BOOLEAN NOT NULL DEFAULT true,
  "createdAt"             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_tenant_status" ON "Tenant" (status);

-- -------------------------------------------------------------------------
-- Usuário contratante. Tabela distinta de "RbacUser" de propósito: aqui é o
-- vínculo mínimo (quem é e de quem é) que as consultas de existência e de
-- integridade conferem; o perfil de acesso vive em "RbacUser".
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "User" (
  id          TEXT PRIMARY KEY,
  "tenantId"  TEXT NOT NULL,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "fk_user_tenant" FOREIGN KEY ("tenantId") REFERENCES "Tenant"(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_user_email" ON "User" (LOWER(email));
CREATE INDEX IF NOT EXISTS "idx_user_tenantId" ON "User" ("tenantId");
