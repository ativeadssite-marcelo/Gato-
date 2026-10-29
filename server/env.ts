// =========================================================================
// AMBIENTE GATO — VALIDAÇÃO DE VARIÁVEIS E FALHA RÁPIDA (SEM DEPENDÊNCIAS)
// =========================================================================
// Centraliza a validação dos segredos e flags no startup do servidor.
// Em produção, variáveis obrigatórias ausentes ou com valores fracos fazem
// o servidor falhar imediatamente (fail-closed).
// =========================================================================

const IS_PRODUCTION = process.env.NODE_ENV === "production";

export function validateEnv(): { ok: true } | never {
  const issues: string[] = [];

  const sessionSecret = process.env.GATO_SESSION_SECRET;
  if (sessionSecret) {
    if (sessionSecret.length < 48 || sessionSecret.includes("YOUR_")) {
      issues.push("GATO_SESSION_SECRET: deve ter 48+ caracteres aleatórios e não conter 'YOUR_'");
    }
  } else if (IS_PRODUCTION) {
    throw new Error("[GATO ENV] GATO_SESSION_SECRET é obrigatório em produção.");
  }

  const masterPassword = process.env.GATO_MASTER_PASSWORD;
  if (masterPassword && masterPassword.length < 8) {
    issues.push("GATO_MASTER_PASSWORD: deve ter no mínimo 8 caracteres");
  } else if (IS_PRODUCTION && !masterPassword) {
    throw new Error("[GATO ENV] GATO_MASTER_PASSWORD é obrigatório em produção.");
  }

  const ingestKey = process.env.GATO_INGEST_API_KEY;
  if (ingestKey && ingestKey.length < 16) {
    issues.push("GATO_INGEST_API_KEY: mínimo 16 caracteres quando fornecido");
  }

  if (IS_PRODUCTION && !process.env.SUPABASE_DB_PASSWORD) {
    throw new Error("[GATO ENV] SUPABASE_DB_PASSWORD é obrigatório em produção.");
  }

  for (const key of ["GATO_SESSION_TTL_MINUTES", "GATO_IMPERSONATION_TTL_MINUTES"] as const) {
    const raw = process.env[key];
    if (raw !== undefined && raw !== "") {
      const n = Number(raw);
      if (!Number.isInteger(n) || n < 1) {
        issues.push(`${key}: deve ser um inteiro >= 1`);
      }
    }
  }

  if (issues.length > 0) {
    throw new Error(
      `[GATO ENV] Falha na validação de ambiente:\n  - ${issues.join("; ")}\n` +
        `Solução: verifique as variáveis no arquivo .env e reinicie o servidor.`,
    );
  }

  const weak: string[] = [];
  if (!process.env.GEMINI_API_KEY) {
    weak.push("GEMINI_API_KEY (assistência de peças desativada)");
  }
  if (!process.env.ASAAS_API_KEY) {
    weak.push("ASAAS_API_KEY (billing/sinistro em modo manual)");
  }
  if (!process.env.SUPABASE_ANON_KEY && !process.env.VITE_SUPABASE_ANON_KEY) {
    weak.push("SUPABASE_ANON_KEY / VITE_SUPABASE_ANON_KEY (storage e realtime podem falhar)");
  }

  if (IS_PRODUCTION && weak.length > 0) {
    console.warn("[GATO ENV] Aviso em produção — valores recomendados para fortalecer:", weak);
  } else if (!IS_PRODUCTION && weak.length > 0) {
    console.warn("[GATO ENV] Avisos (dev não bloqueia):", weak);
  }

  console.log(
    `[GATO ENV] Validação concluída (ambiente=${process.env.NODE_ENV || "development"}). ` +
      `DefaultTenant=${process.env.GATO_DEFAULT_TENANT_ID || "padrão"}`,
  );

  return { ok: true };
}