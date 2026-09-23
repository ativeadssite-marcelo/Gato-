-- =========================================================================
-- 0001 — Domínio de Cobrança e Assinatura (GATO SaaS)
-- =========================================================================
-- Tabelas do ciclo de vida da assinatura, faturas, uso de cotas, clientes de
-- gateway, idempotência de webhooks e log de e-mail transacional.
--
-- Convenção: os identificadores usam "PascalCase" entre aspas para acompanhar
-- as tabelas de negócio já existentes ("Tenant", "Product", "User", ...).
-- =========================================================================

-- -------------------------------------------------------------------------
-- Planos comerciais (espelha SAAS_PLANS, mas persistente e editável)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "SaaSPlan" (
  id              TEXT PRIMARY KEY,
  code            TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  "priceMonthly"  NUMERIC(10, 2) NOT NULL DEFAULT 0,
  "trialDays"     INTEGER NOT NULL DEFAULT 14,
  "maxCustomers"  INTEGER NOT NULL DEFAULT 0,
  "maxItems"      INTEGER NOT NULL DEFAULT 0,
  "maxUsers"      INTEGER NOT NULL DEFAULT 0,
  "maxEmployees"  INTEGER NOT NULL DEFAULT 0,
  "maxStorageMb"  INTEGER NOT NULL DEFAULT 0,
  features        JSONB NOT NULL DEFAULT '[]'::jsonb,
  active          BOOLEAN NOT NULL DEFAULT true,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------------------
-- Assinatura do tenant (ciclo de vida trial -> active -> past_due -> ...)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "TenantSubscription" (
  id                        TEXT PRIMARY KEY,
  "tenantId"                TEXT NOT NULL,
  "planId"                  TEXT NOT NULL,
  "planName"                TEXT NOT NULL,
  status                    TEXT NOT NULL DEFAULT 'trial',
  "trialEndsAt"             TIMESTAMPTZ,
  "currentPeriodEndsAt"     TIMESTAMPTZ,
  gateway                   TEXT,
  "gatewayCustomerId"       TEXT,
  "gatewaySubscriptionId"   TEXT,
  "cancelAtPeriodEnd"       BOOLEAN NOT NULL DEFAULT false,
  "createdAt"               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "fk_subscription_tenant" FOREIGN KEY ("tenantId") REFERENCES "Tenant"(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_subscription_tenantId" ON "TenantSubscription" ("tenantId");
CREATE INDEX IF NOT EXISTS "idx_subscription_status" ON "TenantSubscription" (status);

-- -------------------------------------------------------------------------
-- Faturas (mensalidades)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Invoice" (
  id                    TEXT PRIMARY KEY,
  "tenantId"            TEXT NOT NULL,
  "subscriptionId"      TEXT,
  amount                NUMERIC(10, 2) NOT NULL DEFAULT 0,
  currency              TEXT NOT NULL DEFAULT 'BRL',
  "dueDate"             DATE NOT NULL,
  status                TEXT NOT NULL DEFAULT 'open',
  "paidAt"              TIMESTAMPTZ,
  "paymentMethod"       TEXT,
  "paymentLink"         TEXT,
  "gatewayInvoiceId"    TEXT,
  "createdAt"           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "fk_invoice_tenant" FOREIGN KEY ("tenantId") REFERENCES "Tenant"(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_invoice_tenantId" ON "Invoice" ("tenantId");
CREATE INDEX IF NOT EXISTS "idx_invoice_dueDate" ON "Invoice" ("dueDate");
CREATE INDEX IF NOT EXISTS "idx_invoice_status" ON "Invoice" (status);

-- -------------------------------------------------------------------------
-- Cliente no gateway de cobrança (1:1 com tenant por gateway)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "GatewayCustomer" (
  id                  TEXT PRIMARY KEY,
  "tenantId"          TEXT NOT NULL,
  gateway             TEXT NOT NULL,
  "gatewayCustomerId" TEXT NOT NULL,
  "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "fk_gatewaycustomer_tenant" FOREIGN KEY ("tenantId") REFERENCES "Tenant"(id) ON DELETE CASCADE,
  CONSTRAINT "uq_gatewaycustomer_tenant_gateway" UNIQUE ("tenantId", gateway)
);

-- -------------------------------------------------------------------------
-- Eventos de webhook recebidos (idempotência: nunca processar duas vezes)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "WebhookEvent" (
  id          TEXT PRIMARY KEY,
  gateway     TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "eventId"   TEXT NOT NULL,
  payload     JSONB,
  processed   BOOLEAN NOT NULL DEFAULT false,
  "receivedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "uq_webhook_event" UNIQUE (gateway, "eventId")
);

-- -------------------------------------------------------------------------
-- Log de e-mail transacional (deduplicação + auditoria de envio)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "EmailLog" (
  id            TEXT PRIMARY KEY,
  "tenantId"    TEXT,
  "to"          TEXT NOT NULL,
  "templateCode" TEXT NOT NULL,
  subject       TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'queued',
  provider      TEXT NOT NULL DEFAULT 'console',
  "dedupeKey"   TEXT NOT NULL,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "sentAt"      TIMESTAMPTZ,
  CONSTRAINT "uq_emaillog_dedupe" UNIQUE ("dedupeKey")
);

CREATE INDEX IF NOT EXISTS "idx_emaillog_tenantId" ON "EmailLog" ("tenantId");

-- -------------------------------------------------------------------------
-- Uso de cotas por tenant e período (fonte de verdade para enforcement)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "TenantUsage" (
  id                  TEXT PRIMARY KEY,
  "tenantId"          TEXT NOT NULL,
  period              TEXT NOT NULL, -- 'YYYY-MM'
  customers           INTEGER NOT NULL DEFAULT 0,
  items               INTEGER NOT NULL DEFAULT 0,
  users               INTEGER NOT NULL DEFAULT 0,
  employees           INTEGER NOT NULL DEFAULT 0,
  "storageMb"         INTEGER NOT NULL DEFAULT 0,
  "apiRequestsToday"  INTEGER NOT NULL DEFAULT 0,
  "updatedAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "fk_usage_tenant" FOREIGN KEY ("tenantId") REFERENCES "Tenant"(id) ON DELETE CASCADE,
  CONSTRAINT "uq_usage_tenant_period" UNIQUE ("tenantId", period)
);

CREATE INDEX IF NOT EXISTS "idx_usage_tenantId" ON "TenantUsage" ("tenantId");
