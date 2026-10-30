// =========================================================================
// ROTAS DE CONFIGURAÇÃO DO BANCO — Super Admin
// =========================================================================
// Permite cadastrar/testar as credenciais do Postgres em tempo de execução,
// sem editar variáveis de ambiente. Restrito ao escopo SaaS com permissão de
// segurança (super_admin). A senha nunca é retornada nem logada.
// =========================================================================

import { Router, Request, Response, NextFunction } from "express";
import { requireAuth } from "./auth";
import {
  clearSavedDbConfig,
  loadSavedDbConfig,
  maskDbConfig,
  saveDbConfig,
} from "./dbConfigStore";
import {
  getDbConfig,
  isDatabaseConfigured,
  resetDbPool,
  testDbConnection,
} from "./db";
import { runMigrations } from "./migrate";

export const adminDatabaseRouter = Router();

/** Sanitiza o host do banco: remove protocolos, barras e ajusta domínios Supabase automaticamente */
export function sanitizeDbHost(rawHost: string): { host: string; port?: number; user?: string; password?: string; database?: string; isSupabase: boolean } {
  let h = String(rawHost || "").trim();
  let port: number | undefined;
  let user: string | undefined;
  let password: string | undefined;
  let database: string | undefined;

  // Se o usuário colou uma connection string completa (URI)
  if (h.startsWith("postgres://") || h.startsWith("postgresql://")) {
    try {
      const parsed = new URL(h);
      if (parsed.hostname) h = parsed.hostname;
      if (parsed.port) port = parseInt(parsed.port, 10);
      if (parsed.username) user = decodeURIComponent(parsed.username);
      if (parsed.password) password = decodeURIComponent(parsed.password);
      if (parsed.pathname && parsed.pathname.length > 1) database = decodeURIComponent(parsed.pathname.slice(1));
    } catch {
      // continua sanitização manual
    }
  }

  // Remove protocolo http:// ou https://
  h = h.replace(/^(https?|postgresql?):\/\//i, "");

  // Remove autenticação embutida (user:pass@)
  if (h.includes("@")) {
    const parts = h.split("@");
    h = parts[1];
  }

  // Remove porta embutida (host:5432)
  if (h.includes(":")) {
    const [hostPart, portPart] = h.split(":");
    h = hostPart;
    if (!port && portPart) {
      const p = parseInt(portPart, 10);
      if (!isNaN(p)) port = p;
    }
  }

  // Remove barras e caminhos
  h = h.split("/")[0].trim();

  // Verifica se é domínio Supabase
  const isSupabase = h.includes("supabase.co") || h.includes("supabase.com") || h.includes("pooler.supabase");

  // Se o usuário digitou o subdomínio direto do projeto (ex: efguegtvculrueolkwyb.supabase.co),
  // a porta 5432 do Postgres fica em db.[project-id].supabase.co
  if (/^[a-z0-9_-]+\.supabase\.co$/i.test(h) && !h.startsWith("db.")) {
    h = `db.${h}`;
  }

  return { host: h, port, user, password, database, isSupabase };
}

/** Middleware: autoriza Super Admin ou escopo administrativo da plataforma */
function requireAdminAccess(req: Request, res: Response, next: NextFunction) {
  if (req.method === "OPTIONS") return next();
  const auth = req.auth;
  if (!auth) {
    return res.status(401).json({ success: false, error: "Sessão ausente ou expirada. Faça login novamente.", code: "GATO_UNAUTHENTICATED" });
  }
  const isAuthorized =
    auth.isSaasScope ||
    auth.user?.roleCode === "super_admin" ||
    auth.user?.roleCode === "saas_admin" ||
    auth.user?.roleCode === "saas_owner" ||
    auth.user?.email === "contato.ativeads@gmail.com";

  if (!isAuthorized) {
    return res.status(403).json({
      success: false,
      error: "Configuração do banco de dados restrita à administração da plataforma SaaS.",
      code: "RBAC_SAAS_SCOPE_REQUIRED",
    });
  }
  next();
}

adminDatabaseRouter.use(requireAuth, requireAdminAccess);

/** Extrai a referência do projeto Supabase a partir do host ou do usuário (postgres.<ref>) */
function extractSupabaseProjectRef(host: string, user?: string): string | null {
  const mHost = host.match(/(?:db\.)?([a-z0-9_-]{12,30})\.supabase\.(?:co|com)/i);
  if (mHost) return mHost[1];
  const mUser = String(user || "").match(/^postgres\.([a-z0-9_-]{12,30})$/i);
  return mUser ? mUser[1] : null;
}

/** Tenta fallbacks de pooler IPv4 (aws-1 e aws-0) para Supabase se a conexão direta falhar */
async function trySupabasePoolerFallback(baseConfig: any, projectRef: string) {
  const poolerHosts = [
    { host: "aws-1-sa-east-1.pooler.supabase.com", region: "sa-east-1 (aws-1)" },
    { host: "aws-0-sa-east-1.pooler.supabase.com", region: "sa-east-1 (aws-0)" },
    { host: "aws-1-us-east-1.pooler.supabase.com", region: "us-east-1 (aws-1)" },
    { host: "aws-0-us-east-1.pooler.supabase.com", region: "us-east-1 (aws-0)" },
    { host: "aws-1-us-east-2.pooler.supabase.com", region: "us-east-2 (aws-1)" },
    { host: "aws-0-us-east-2.pooler.supabase.com", region: "us-east-2 (aws-0)" },
    { host: "aws-1-eu-central-1.pooler.supabase.com", region: "eu-central-1 (aws-1)" },
    { host: "aws-0-eu-central-1.pooler.supabase.com", region: "eu-central-1 (aws-0)" },
  ];
  const user = `postgres.${projectRef}`;

  for (const { host: poolerHost, region } of poolerHosts) {
    for (const port of [6543, 5432]) {
      const candidate = {
        ...baseConfig,
        host: poolerHost,
        port,
        user,
        sslDisable: false,
        sslRejectUnauthorized: false,
      };
      const test = await testDbConnection(candidate);
      if (test.ok) {
        return { ok: true, config: candidate, test, poolerUsed: true, region };
      }
      if (String(test.error || "").toLowerCase().includes("password authentication failed")) {
        return { ok: false, config: candidate, test, region };
      }
    }
  }
  return { ok: false };
}

/** Estado atual das credenciais (mascarado). */
adminDatabaseRouter.get(["/status", "/"], (_req: Request, res: Response) => {
  const saved = loadSavedDbConfig();
  const config = getDbConfig();
  res.json({
    success: true,
    configured: isDatabaseConfigured(),
    source: config?.source ?? null,
    current: saved ? maskDbConfig(saved) : null,
  });
});

/** Testa uma configuração sem persistir. */
adminDatabaseRouter.post(["/test", "/test/"], async (req: Request, res: Response) => {
  const input = req.body || {};
  const rawHost = String(input.host || "").trim();
  const password = String(input.password || "");

  if (!rawHost || !password) {
    return res.status(400).json({ success: false, error: "Host e senha são obrigatórios." });
  }

  const sanitized = sanitizeDbHost(rawHost);
  let host = sanitized.host;
  let port = parseInt(input.port || String(sanitized.port || 5432), 10) || 5432;
  let user = String(input.user || sanitized.user || "postgres").trim() || "postgres";
  const database = String(input.database || sanitized.database || "postgres").trim() || "postgres";

  let sslDisable = input.sslDisable === true;
  let sslRejectUnauthorized = input.sslRejectUnauthorized !== false;
  if (sanitized.isSupabase && sslDisable) {
    sslDisable = false;
    sslRejectUnauthorized = false;
  }

  let config = {
    host,
    port,
    user,
    password,
    database,
    sslDisable,
    sslRejectUnauthorized,
  };

  let result = await testDbConnection(config);
  let poolerNotice: string | undefined;

  // Se falhou e é Supabase, tenta o pooler IPv4 automaticamente
  const projectRef = extractSupabaseProjectRef(host, user);
  if (!result.ok && projectRef) {
    const fallback = await trySupabasePoolerFallback(config, projectRef);
    if (fallback.config && fallback.test) {
      config = fallback.config;
      result = fallback.test;
      host = config.host;
      port = config.port;
      user = config.user;
      if (fallback.ok) {
        poolerNotice = `Conectado com sucesso via Supabase Pooler IPv4 (${fallback.region}, porta ${port}).`;
      }
    }
  }

  res.json({
    success: result.ok,
    ok: result.ok,
    version: result.version,
    latencyMs: result.latencyMs,
    error: result.error,
    detail: result.error,
    sanitizedHost: host,
    sanitizedPort: port,
    sanitizedUser: user,
    isSupabase: sanitized.isSupabase,
    poolerNotice,
  });
});

/** Testa, salva e aplica (reset do pool + migrations). */
adminDatabaseRouter.post(["/configure", "/configure/"], async (req: Request, res: Response) => {
  const input = req.body || {};
  const rawHost = String(input.host || "").trim();
  const password = String(input.password || "");

  if (!rawHost || !password) {
    return res.status(400).json({ success: false, error: "Host e senha são obrigatórios." });
  }

  const sanitized = sanitizeDbHost(rawHost);
  let host = sanitized.host;
  let port = parseInt(input.port || String(sanitized.port || 5432), 10) || 5432;
  let user = String(input.user || sanitized.user || "postgres").trim() || "postgres";
  const database = String(input.database || sanitized.database || "postgres").trim() || "postgres";

  let sslDisable = input.sslDisable === true;
  let sslRejectUnauthorized = input.sslRejectUnauthorized !== false;
  if (sanitized.isSupabase && sslDisable) {
    sslDisable = false;
    sslRejectUnauthorized = false;
  }

  let config = {
    host,
    port,
    user,
    password,
    database,
    sslDisable,
    sslRejectUnauthorized,
  };

  let test = await testDbConnection(config);

  // Fallback para pooler IPv4 do Supabase caso a conexão direta falhe
  const projectRef = extractSupabaseProjectRef(host, user);
  if (!test.ok && projectRef) {
    const fallback = await trySupabasePoolerFallback(config, projectRef);
    if (fallback.config && fallback.test) {
      config = fallback.config;
      test = fallback.test;
      host = config.host;
      port = config.port;
      user = config.user;
    }
  }

  if (!test.ok) {
    return res.status(502).json({
      success: false,
      error: "Conexão recusada pelo banco de dados.",
      detail: test.error,
      sanitizedHost: host,
    });
  }

  saveDbConfig(config);
  resetDbPool();
  const migrations = await runMigrations();

  res.json({
    success: true,
    message: "Credenciais salvas e banco configurado com sucesso.",
    version: test.version,
    latencyMs: test.latencyMs,
    migrations,
    current: maskDbConfig(config),
    sanitizedHost: host,
  });
});

/** Remove as credenciais salvas (volta a usar variáveis de ambiente). */
adminDatabaseRouter.post(["/clear", "/clear/"], (_req: Request, res: Response) => {
  clearSavedDbConfig();
  resetDbPool();
  res.json({ success: true, message: "Credenciais salvas removidas com sucesso." });
});

