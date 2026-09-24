-- =========================================================================
-- 0002 — Credenciais de Integração do Tenant (GATO SaaS)
-- =========================================================================
-- Chave de API e licença de máquina por contratante, revogáveis e rotacionáveis.
--
-- Segurança: a coluna "keyHash" guarda sha256 do segredo. O segredo em claro não
-- tem coluna — ele existe apenas na resposta da criação/rotação. "keyPrefix" é
-- exibível e serve de índice de busca na autenticação.
--
-- Nota de granularidade de cota: "TenantUsage".period passa a aceitar também
-- 'YYYY-MM-DD' (bucket diário da cota de API), além do 'YYYY-MM' mensal já usado.
-- A unicidade por ("tenantId", period) do 0001 já cobre os dois casos.
-- =========================================================================

-- -------------------------------------------------------------------------
-- Credencial de integração: no máximo 1 de cada tipo por tenant
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "TenantCredential" (
  id              TEXT PRIMARY KEY,
  "tenantId"      TEXT NOT NULL,
  kind            TEXT NOT NULL, -- 'api_key' | 'machine_license'
  label           TEXT NOT NULL DEFAULT '',
  "keyPrefix"     TEXT NOT NULL,
  "keyLast4"      TEXT NOT NULL,
  "keyHash"       TEXT NOT NULL,
  capabilities    JSONB NOT NULL DEFAULT '[]'::jsonb,
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "createdById"   TEXT NOT NULL DEFAULT '',
  "createdByName" TEXT NOT NULL DEFAULT '',
  "lastUsedAt"    TIMESTAMPTZ,
  "rotatedAt"     TIMESTAMPTZ,
  "revokedAt"     TIMESTAMPTZ,
  CONSTRAINT "fk_credential_tenant" FOREIGN KEY ("tenantId") REFERENCES "Tenant"(id) ON DELETE CASCADE,
  CONSTRAINT "uq_credential_tenant_kind" UNIQUE ("tenantId", kind)
);

CREATE INDEX IF NOT EXISTS "idx_credential_tenantId" ON "TenantCredential" ("tenantId");
CREATE INDEX IF NOT EXISTS "idx_credential_prefix" ON "TenantCredential" ("keyPrefix");

-- -------------------------------------------------------------------------
-- Vínculo de licença a máquina: no máximo 1 ATIVO por credencial
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "MachineActivation" (
  id              TEXT PRIMARY KEY,
  "tenantId"      TEXT NOT NULL,
  "credentialId"  TEXT NOT NULL,
  "machineId"     TEXT NOT NULL,
  "machineLabel"  TEXT,
  "activatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deactivatedAt" TIMESTAMPTZ,
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT "fk_activation_tenant" FOREIGN KEY ("tenantId") REFERENCES "Tenant"(id) ON DELETE CASCADE,
  CONSTRAINT "fk_activation_credential" FOREIGN KEY ("credentialId") REFERENCES "TenantCredential"(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_activation_credentialId" ON "MachineActivation" ("credentialId");

-- A regra "1 licença de máquina = 1 máquina ativa" é garantida aqui, no banco, e
-- não só na aplicação: índice único parcial sobre as ativações ativas.
CREATE UNIQUE INDEX IF NOT EXISTS "uq_activation_active_per_credential"
  ON "MachineActivation" ("credentialId")
  WHERE active;
