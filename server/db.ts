import fs from "node:fs";
import pg from "pg";
import { loadSavedDbConfig } from "./dbConfigStore";

const { Pool } = pg;

let pool: pg.Pool | null = null;

export interface DbConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  sslDisable?: boolean;
  sslRejectUnauthorized?: boolean;
  /**
   * Caminho do PEM da CA que assina o certificado do servidor. O pooler do
   * Supabase usa uma CA PRÓPRIA (raiz auto-assinada "Supabase Root 2021 CA"),
   * que não está no repositório de CAs do Node — sem ela, a validação estrita
   * falha com SELF_SIGNED_CERT_IN_CHAIN. O arquivo (`prod-ca-2021.crt`) é
   * publicado pelo próprio Supabase no painel, em Database → SSL Configuration.
   */
  sslCaPath?: string;
  source?: "env" | "file";
}

/**
 * Lê o PEM da CA. Devolve undefined (com aviso) se o caminho não existir, para
 * o erro seguinte ser o de validação do TLS — que explica o problema — em vez
 * de um ENOENT confuso.
 */
function readCaPem(caPath?: string): string | undefined {
  if (!caPath) return undefined;
  try {
    const pem = fs.readFileSync(caPath, "utf8");
    return pem.includes("BEGIN CERTIFICATE") ? pem : undefined;
  } catch (err: any) {
    console.warn(`[Supabase PG] CA não encontrada em "${caPath}":`, err?.message || err);
    return undefined;
  }
}

/**
 * Credenciais de banco vêm das configurações salvas (tela Super Admin) ou de
 * variáveis de ambiente. Nenhum segredo é embutido no código-fonte.
 */
export function getDbConfig(): DbConfig | null {
  const saved = loadSavedDbConfig();
  // A CA vem do ambiente mesmo quando as demais credenciais vieram da tela: a
  // config salva tem precedência, mas nasceu antes de existir campo de CA. Sem
  // esta linha, quem cadastrou o banco pela tela ficaria sem o CA e o TLS
  // continuaria falhando sem explicação.
  const envCaPath = process.env.SUPABASE_DB_SSL_CA;

  if (saved?.host && saved?.password) {
    return {
      host: saved.host,
      port: saved.port || 5432,
      user: saved.user || "postgres",
      password: saved.password,
      database: saved.database || "postgres",
      sslDisable: saved.sslDisable,
      sslRejectUnauthorized: saved.sslRejectUnauthorized,
      sslCaPath: saved.sslCaPath || envCaPath,
      source: "file",
    };
  }

  const host = process.env.SUPABASE_DB_HOST;
  const password = process.env.SUPABASE_DB_PASSWORD;
  if (!host || !password) return null;
  return {
    host,
    port: parseInt(process.env.SUPABASE_DB_PORT || "5432", 10),
    user: process.env.SUPABASE_DB_USER || "postgres",
    password,
    database: process.env.SUPABASE_DB_NAME || "postgres",
    sslDisable: process.env.SUPABASE_DB_SSL === "disable",
    sslRejectUnauthorized: process.env.SUPABASE_DB_SSL_REJECT_UNAUTHORIZED !== "false",
    sslCaPath: envCaPath,
    source: "env",
  };
}

export function isDatabaseConfigured(): boolean {
  return getDbConfig() !== null;
}

export const DB_NOT_CONFIGURED_MESSAGE =
  "Banco de dados não configurado. Cadastre as credenciais na tela 'Banco de Dados' (Super Admin) " +
  "ou defina SUPABASE_DB_HOST e SUPABASE_DB_PASSWORD como variáveis de ambiente.";

function buildPool(config: DbConfig): pg.Pool {
  const ca = readCaPem(config.sslCaPath);
  if (ca) console.log(`[Supabase PG] CA do servidor carregada de "${config.sslCaPath}".`);
  const newPool = new Pool({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    // TLS habilitado com validação de certificado por padrão (evita MITM).
    // Quando há CA configurada, ela é apresentada como âncora de confiança e a
    // validação SEGUE LIGADA — a leitura correta é "confiar nesta CA", nunca
    // "parar de verificar o certificado".
    ssl: config.sslDisable
      ? undefined
      : { rejectUnauthorized: config.sslRejectUnauthorized !== false, ...(ca ? { ca } : {}) },
    connectionTimeoutMillis: 8000,
    max: 10,
  });
  newPool.on("error", (err) => {
    console.error("[Supabase PG] Pool background error:", err);
  });
  return newPool;
}

export function getDbPool(): pg.Pool {
  if (!pool) {
    const config = getDbConfig();
    if (!config) throw new Error(DB_NOT_CONFIGURED_MESSAGE);
    pool = buildPool(config);
  }
  return pool;
}

/** Descarta o pool em cache (chame após cadastrar novas credenciais). */
export function resetDbPool(): void {
  if (pool) {
    pool.end().catch(() => {});
    pool = null;
  }
}

export interface DbConnectionTest {
  ok: boolean;
  version?: string;
  latencyMs: number;
  error?: string;
}

/** Testa uma configuração de banco sem persistir e sem afetar o pool ativo. */
export async function testDbConnection(config: DbConfig): Promise<DbConnectionTest> {
  const start = Date.now();
  const testPool = buildPool(config);
  try {
    const res = await testPool.query("SELECT version() as v;");
    const versionMatch = String(res.rows[0]?.v || "").match(/PostgreSQL\s+([\d.]+)/i);
    return {
      ok: true,
      version: versionMatch ? `PostgreSQL ${versionMatch[1]}` : "PostgreSQL",
      latencyMs: Date.now() - start,
    };
  } catch (err: any) {
    const safe = String(err?.message || err).replace(/:[^:@]+@/, ":****@").slice(0, 200);
    return { ok: false, latencyMs: Date.now() - start, error: safe };
  } finally {
    await testPool.end().catch(() => {});
  }
}

export interface DbStatusResult {
  connected: boolean;
  projectRef: string;
  host: string;
  database: string;
  version: string;
  currentTime: string;
  latencyMs: number;
  tables: string[];
  counts: Record<string, number>;
  error?: string;
}

export async function checkDatabaseConnection(): Promise<DbStatusResult> {
  const start = Date.now();
  const projectRef = process.env.SUPABASE_PROJECT_REF || "tfyocjdozttclxgipexu";
  const host = process.env.SUPABASE_DB_HOST || "db.tfyocjdozttclxgipexu.supabase.co";
  const database = process.env.SUPABASE_DB_NAME || "postgres";

  try {
    const db = getDbPool();
    const result = await db.query(
      "SELECT NOW() as current_time, current_database() as db_name, version() as pg_version;"
    );
    const latencyMs = Date.now() - start;

    const tablesRes = await db.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
    );
    const tables = tablesRes.rows.map((r: { table_name: string }) => r.table_name);

    const counts: Record<string, number> = {};

    // Count in all relevant schema tables
    const tablesToCount = [
      "Product",
      "Customer",
      "Warehouse",
      "StockLevel",
      "Supplier",
      "Tenant",
      "User",
      "Budget",
      "BudgetItem",
      "Sale",
      "SaleItem",
      "Category",
      "Purchase",
      "StockMovement"
    ];

    for (const tbl of tablesToCount) {
      if (tables.includes(tbl)) {
        try {
          const cRes = await db.query(`SELECT count(*)::int as count FROM "${tbl}";`);
          counts[tbl] = cRes.rows[0]?.count ?? 0;
        } catch {
          // ignore specific table count error
        }
      }
    }

    // Sanitize version to avoid leaking kernel, architecture and compiler details
    const rawVersion = result.rows[0]?.pg_version || "PostgreSQL 17.6";
    const versionMatch = rawVersion.match(/PostgreSQL\s+([\d.]+)/i);
    const cleanVersion = versionMatch ? `PostgreSQL ${versionMatch[1]} (Supabase)` : "PostgreSQL (Supabase Managed)";

    // Mask host and project reference to prevent reconnaissance
    const maskedHost = host.replace(/^([^.]+)\.([^.]+)\.(.+)$/, "$1.***.$3");

    return {
      connected: true,
      projectRef,
      host: maskedHost,
      database: "postgres",
      version: cleanVersion,
      currentTime: result.rows[0]?.current_time || new Date().toISOString(),
      latencyMs,
      tables,
      counts,
    };
  } catch (error: any) {
    // Prevent credential leaks in connection error messages
    const safeError = (error?.message || "")
      .replace(/:[^:@]+@/, ":****@") // Redact any embedded password in URLs
      .replace(/password\s*=\s*['"]?[^'"\s]+['"]?/gi, "password=****");

    return {
      connected: false,
      projectRef,
      host: "db.***.supabase.co",
      database: "postgres",
      version: "Unknown",
      currentTime: new Date().toISOString(),
      latencyMs: Date.now() - start,
      tables: [],
      counts: {},
      error: safeError || "Falha segura na conexão com o banco de dados",
    };
  }
}

// =========================================================================
// CADASTRO DE TENANTS (persistência best-effort)
// =========================================================================

export interface TenantAccountInput {
  id: string;
  name: string;
  tradeName: string;
  cnpj: string;
  stateRegistration?: string;
  segment?: string;
  contactName?: string;
  contactEmail: string;
  contactPhone?: string;
  city?: string;
  uf?: string;
  branchId?: string;
}

export interface TenantAccountResult {
  persisted: boolean;
  error?: string;
}

/** Verifica se já existe usuário/tenant com o e-mail informado no banco. */
export async function emailExistsInDatabase(email: string): Promise<boolean> {
  if (!isDatabaseConfigured()) return false;
  const normalized = (email || "").trim().toLowerCase();
  if (!normalized) return false;
  try {
    const db = getDbPool();
    const result = await db.query(
      `SELECT 1 FROM "User" WHERE LOWER(email) = $1
       UNION ALL
       SELECT 1 FROM "Tenant" WHERE LOWER("contactEmail") = $1
       LIMIT 1;`,
      [normalized]
    );
    return result.rows.length > 0;
  } catch (error: any) {
    // Fail-closed na checagem de duplicidade: em erro assume "existe" para não
    // permitir sobrescrever/sombrear um cadastro real de terceiro.
    console.error("[Supabase PG] Falha ao verificar e-mail existente:", error?.message || error);
    return true;
  }
}

/**
 * Persiste o novo tenant contratante no PostgreSQL.
 * Retorna `persisted: false` sem lançar exceção: o cadastro continua válido em
 * memória e a pendência fica registrada para reprocessamento.
 */
export async function insertTenantAccount(input: TenantAccountInput): Promise<TenantAccountResult> {
  if (!isDatabaseConfigured()) {
    return { persisted: false, error: DB_NOT_CONFIGURED_MESSAGE };
  }
  try {
    const db = getDbPool();
    const now = new Date().toISOString();
    const branchId = input.branchId || `branch_${input.id.slice(-10)}`;

    await db.query("BEGIN");
    await db.query(
      `INSERT INTO "Tenant" (id, name, "tradeName", cnpj, "stateRegistration", segment, "contactEmail", "contactPhone", city, uf, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11)
       ON CONFLICT (id) DO NOTHING;`,
      [
        input.id,
        input.name,
        input.tradeName,
        input.cnpj,
        input.stateRegistration || "ISENTO",
        input.segment || "Autopeças Leves & Acessórios",
        (input.contactEmail || "").trim().toLowerCase(),
        input.contactPhone || "",
        input.city || "",
        (input.uf || "").toUpperCase(),
        now,
      ]
    );
    await db.query("COMMIT");

    return { persisted: true };
  } catch (error: any) {
    await getDbPool().query("ROLLBACK").catch(() => {});
    const safeError = String(error?.message || error)
      .replace(/:[^:@]+@/, ":****@")
      .slice(0, 200);
    console.error("[Supabase PG] Falha ao persistir tenant:", safeError);
    return { persisted: false, error: `Não foi possível persistir no banco: ${safeError}` };
  }
}
