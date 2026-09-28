-- =========================================================================
-- 0004 — Trilha de auditoria (GATO SaaS)
-- =========================================================================
-- O requisito do dono do SaaS é conferir as ações do próprio time. Uma trilha
-- que vive só na memória não serve para isso: ela evapora no restart, que é
-- exatamente quando alguém vai querer olhar o que aconteceu antes.
--
-- O espelho é append-only na prática: a aplicação só insere (nunca atualiza nem
-- remove) e mantém em memória o teto de 5000 registros. Retenção/expurgo do
-- histórico no banco é decisão futura — por isso não há índice por data além do
-- de consulta.
-- =========================================================================

CREATE TABLE IF NOT EXISTS "AuditLog" (
  id              TEXT PRIMARY KEY,
  "tenantId"      TEXT NOT NULL DEFAULT 'system',
  "userId"        TEXT NOT NULL DEFAULT '',
  "userName"      TEXT NOT NULL DEFAULT '',
  "userRole"      TEXT NOT NULL DEFAULT '',
  "ipAddress"     TEXT NOT NULL DEFAULT '',
  "userAgent"     TEXT,
  action          TEXT NOT NULL,
  resource        TEXT NOT NULL DEFAULT '',
  "entityId"      TEXT NOT NULL DEFAULT '',
  "timestamp"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  justification   TEXT,
  "beforeState"   JSONB,
  "afterState"    JSONB,
  status          TEXT NOT NULL DEFAULT 'success', -- 'success' | 'warning' | 'blocked'
  anomalous       BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_auditlog_tenantId" ON "AuditLog" ("tenantId");
CREATE INDEX IF NOT EXISTS "idx_auditlog_userId" ON "AuditLog" ("userId");
CREATE INDEX IF NOT EXISTS "idx_auditlog_action" ON "AuditLog" (action);
CREATE INDEX IF NOT EXISTS "idx_auditlog_timestamp" ON "AuditLog" ("timestamp" DESC);
