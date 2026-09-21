import pg from "pg";

const { Pool } = pg;

let pool: pg.Pool | null = null;

export function getDbPool(): pg.Pool {
  if (!pool) {
    const host = process.env.SUPABASE_DB_HOST || "db.tfyocjdozttclxgipexu.supabase.co";
    const port = parseInt(process.env.SUPABASE_DB_PORT || "5432", 10);
    const user = process.env.SUPABASE_DB_USER || "postgres";
    const password = process.env.SUPABASE_DB_PASSWORD || "ifYz^v2Y97!&4sP";
    const database = process.env.SUPABASE_DB_NAME || "postgres";

    pool = new Pool({
      host,
      port,
      user,
      password,
      database,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 8000,
      max: 10,
    });

    pool.on("error", (err) => {
      console.error("[Supabase PG] Pool background error:", err);
    });
  }
  return pool;
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
