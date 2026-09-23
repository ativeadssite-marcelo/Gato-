// =========================================================================
// CLI DE MIGRAÇÕES — aplica as migrations pendentes e sai com código 0/1.
// Uso: npm run migrate   (útil em CI/deploy antes de subir o app)
// =========================================================================

import { runMigrations } from "./migrate";

runMigrations()
  .then((results) => {
    console.log("[GATO Migrate] Resultado:", JSON.stringify(results, null, 2));
    const failed = results.some((r) => r.error);
    process.exit(failed ? 1 : 0);
  })
  .catch((err) => {
    console.error("[GATO Migrate] Erro fatal:", err?.message || err);
    process.exit(1);
  });
