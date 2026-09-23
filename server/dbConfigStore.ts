// =========================================================================
// ARMAZENAMENTO DAS CREDENCIAIS DO BANCO — GATO SaaS
// =========================================================================
// Permite cadastrar as credenciais do Postgres em tempo de execução (pela tela
// do Super Admin), sem precisar editar variáveis de ambiente. Os dados são
// gravados em `.gato-db-config.json` (gitignored) com permissão 0600.
// Prioridade de leitura: config salva > variáveis de ambiente.
// =========================================================================

import fs from "node:fs";
import path from "node:path";

const CONFIG_FILE = path.resolve(process.cwd(), ".gato-db-config.json");

export interface DbCredentials {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  /** SUPABASE_DB_SSL=disable → true desativa TLS. */
  sslDisable?: boolean;
  /** SUPABASE_DB_SSL_REJECT_UNAUTHORIZED=false → true aceita cert autoassinado. */
  sslRejectUnauthorized?: boolean;
}

/** Lê as credenciais salvas (se existirem). Nunca lança. */
export function loadSavedDbConfig(): DbCredentials | null {
  try {
    if (!fs.existsSync(CONFIG_FILE)) return null;
    const raw = fs.readFileSync(CONFIG_FILE, "utf8");
    const parsed = JSON.parse(raw) as DbCredentials;
    if (!parsed || typeof parsed.host !== "string" || typeof parsed.password !== "string") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** Grava as credenciais no disco com permissão restrita (0600). */
export function saveDbConfig(config: DbCredentials): void {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), { mode: 0o600 });
}

/** Remove as credenciais salvas (volta a usar apenas variáveis de ambiente). */
export function clearSavedDbConfig(): void {
  try {
    if (fs.existsSync(CONFIG_FILE)) fs.unlinkSync(CONFIG_FILE);
  } catch {
    /* noop */
  }
}

/** Versão mascarada para expor em API/logs (nunca revela a senha). */
export function maskDbConfig(c: DbCredentials): Omit<DbCredentials, "password"> & { passwordSet: boolean } {
  const host = c.host.replace(/^([^.]+)\.([^.]+)\.(.+)$/, "$1.***.$3");
  return {
    host,
    port: c.port,
    user: c.user,
    database: c.database,
    sslDisable: c.sslDisable,
    sslRejectUnauthorized: c.sslRejectUnauthorized,
    passwordSet: !!c.password,
  };
}
