// =========================================================================
// CLI DE MIGRAÇÕES — aplica as migrations pendentes e sai com código 0/1.
// Uso: npm run migrate   (útil em CI/deploy antes de subir o app)
// =========================================================================
// Este é um PONTO DE ENTRADA, como o server.ts, então carrega o .env por conta
// própria: sem isto a CLI leria um ambiente sem SUPABASE_DB_*, concluiria que não
// há banco configurado e "passaria" sem aplicar nada — no-op silencioso, o pior
// resultado possível para um passo de deploy.
// =========================================================================

import dotenv from "dotenv";
import { runMigrations } from "./migrate";
import { DB_NOT_CONFIGURED_MESSAGE, isDatabaseConfigured } from "./db";

dotenv.config();

if (!isDatabaseConfigured()) {
  // Falha ALTA: em CI/deploy, migração que não roda tem que aparecer.
  console.error("[GATO Migrate] " + DB_NOT_CONFIGURED_MESSAGE);
  process.exit(2);
}

runMigrations()
  .then((results) => {
    console.log("[GATO Migrate] Resultado:", JSON.stringify(results, null, 2));
    const failed = results.some((r) => r.error);
    if (results.length === 0) {
      console.log("[GATO Migrate] Nada pendente — schema já está atualizado.");
    }
    process.exit(failed ? 1 : 0);
  })
  .catch((err) => {
    console.error("[GATO Migrate] Erro fatal:", err?.message || err);
    process.exit(1);
  });
