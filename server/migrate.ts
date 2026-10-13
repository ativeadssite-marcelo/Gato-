// =========================================================================
// RUNNER DE MIGRAÇÕES VERSIONADAS — GATO SaaS
// =========================================================================
// Aplica, em ordem, os arquivos .sql de `db/migrations` ainda não registrados
// na tabela de controle "SchemaMigration". Cada arquivo roda dentro de uma
// transação e é registrado ao final. Em produção, o startup verifica o resumo
// e aborta antes de abrir a porta se alguma migração falhar.
// =========================================================================

import fs from "node:fs";
import path from "node:path";
import { getDbPool, isDatabaseConfigured } from "./db";

// Resolve relativo ao diretório de execução (cwd). Funciona tanto em dev
// (`tsx server.ts` a partir da raiz) quanto no bundle de produção (WORKDIR /app).
const MIGRATIONS_DIR = path.resolve(process.cwd(), "db", "migrations");

export interface MigrationResult {
  name: string;
  applied: boolean;
  skipped: boolean;
  error?: string;
}

export function assertProductionMigrationsReady(
  isProduction: boolean,
  databaseConfigured: boolean,
  results: MigrationResult[],
): void {
  if (!isProduction) return;
  if (!databaseConfigured) {
    throw new Error("[GATO Startup] Banco de dados obrigatório em produção.");
  }
  if (results.length === 0) {
    throw new Error("[GATO Startup] Nenhuma migração foi encontrada; inicialização cancelada.");
  }

  const failed = results.filter((result) => result.error).map((result) => result.name);
  if (failed.length > 0) {
    throw new Error(`[GATO Startup] Migrações falharam: ${failed.join(", ")}.`);
  }
}

function ensureControlTable(): Promise<void> {
  const db = getDbPool();
  return db.query(`
    CREATE TABLE IF NOT EXISTS "SchemaMigration" (
      name       TEXT PRIMARY KEY,
      "appliedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `).then(() => undefined);
}

function listMigrationFiles(): string[] {
  if (!fs.existsSync(MIGRATIONS_DIR)) return [];
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort(); // ordem lexicográfica = ordem de versão (0001, 0002, ...)
}

async function alreadyApplied(name: string): Promise<boolean> {
  const db = getDbPool();
  const res = await db.query(
    'SELECT 1 FROM "SchemaMigration" WHERE name = $1 LIMIT 1;',
    [name],
  );
  return res.rows.length > 0;
}

async function applyMigration(name: string): Promise<void> {
  const filePath = path.join(MIGRATIONS_DIR, name);
  const sql = fs.readFileSync(filePath, "utf8");
  const db = getDbPool();
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query(
      'INSERT INTO "SchemaMigration" (name) VALUES ($1) ON CONFLICT (name) DO NOTHING;',
      [name],
    );
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Aplica as migrações pendentes. Retorna o resumo por arquivo.
 * Sem banco configurado, retorna lista vazia; o startup permite isso somente
 * fora de produção.
 */
export async function runMigrations(): Promise<MigrationResult[]> {
  if (!isDatabaseConfigured()) {
    console.warn(
      "[GATO Migrate] Banco não configurado — migrações adiadas (dados em memória).",
    );
    return [];
  }

  const files = listMigrationFiles();
  const results: MigrationResult[] = [];

  try {
    await ensureControlTable();
  } catch (err: any) {
    console.error("[GATO Migrate] Falha ao criar tabela de controle:", err?.message || err);
    return files.map((name) => ({ name, applied: false, skipped: false, error: "control table" }));
  }

  for (const name of files) {
    try {
      if (await alreadyApplied(name)) {
        results.push({ name, applied: false, skipped: true });
        continue;
      }
      await applyMigration(name);
      results.push({ name, applied: true, skipped: false });
      console.log(`[GATO Migrate] Aplicada: ${name}`);
    } catch (err: any) {
      const safe = String(err?.message || err).replace(/:[^:@]+@/, ":****@").slice(0, 200);
      results.push({ name, applied: false, skipped: false, error: safe });
      console.error(`[GATO Migrate] Falha em ${name}:`, safe);
    }
  }

  return results;
}
