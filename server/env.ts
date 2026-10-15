"use strict";

import { z } from "zod";

// =========================================================================
// AMBIENTE GATO — VALIDAÇÃO COM SCHEMA ZOD E FALHA RÁPIDA
// =========================================================================
// Centraliza a validação dos segredos e flags no startup do servidor usando
// schemas Zod. Em produção, variáveis obrigatórias ausentes ou com valores
// fracos fazem o servidor falhar imediatamente (fail-closed).
// =========================================================================

function parseBoolean(v: string | undefined, fallback: boolean): boolean {
  if (v === undefined || v === "") return fallback;
  return v === "true" || v === "1" || v === "yes";
}

function parseIntStrict(v: string | undefined, fallback: number, min: number = 1): number {
  if (v === undefined || v === "") return fallback;
  const n = parseInt(v, 10);
  if (Number.isNaN(n) || n < min) return fallback;
  return n;
}

const IS_PRODUCTION = process.env.NODE_ENV === "production";

const envSchema = z.object({
  GATO_SESSION_SECRET: z
    .string()
    .min(32, "GATO_SESSION_SECRET deve ter no mínimo 32 caracteres")
    .refine((v) => !v.includes("YOUR_"), "GATO_SESSION_SECRET não deve conter 'YOUR_'")
    .refine((v) => v.length >= 48, "GATO_SESSION_SECRET recomendado 48+ caracteres aleatórios")
    .optional(),

  GATO_MASTER_PASSWORD: z.string().min(8, "GATO_MASTER_PASSWORD deve ter no mínimo 8 caracteres").optional(),

  GATO_INGEST_API_KEY: z
    .string()
    .optional()
    .refine((v) => !v || v.length >= 16, "GATO_INGEST_API_KEY mínimo 16 caracteres quando fornecido"),

  SUPABASE_DB_PASSWORD: z.string().optional(),

  SUPABASE_DB_HOST: z.string().optional(),

  SUPABASE_DB_PORT: z.coerce.number().default(5432),

  SUPABASE_DB_USER: z.string().default("postgres"),

  SUPABASE_DB_NAME: z.string().default("postgres"),

  SUPABASE_DB_SSL: z.enum(["true", "false"]).default("true"),

  SUPABASE_DB_SSL_CA: z.string().optional(),

  GEMINI_API_KEY: z.string().optional(),

  ASAAS_API_KEY: z.string().optional(),

  GATO_DEFAULT_TENANT_ID: z.string().optional(),

  GATO_SESSION_TTL_MINUTES: z
    .coerce.number()
    .int()
    .min(1)
    .default(480),

  GATO_IMPERSONATION_TTL_MINUTES: z
    .coerce.number()
    .int()
    .min(1)
    .default(60),

  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

function getEnv(): z.infer<typeof envSchema> {
  const raw = {
    GATO_SESSION_SECRET: process.env.GATO_SESSION_SECRET,
    GATO_MASTER_PASSWORD: process.env.GATO_MASTER_PASSWORD,
    GATO_INGEST_API_KEY: process.env.GATO_INGEST_API_KEY,
    SUPABASE_DB_PASSWORD: process.env.SUPABASE_DB_PASSWORD,
    SUPABASE_DB_HOST: process.env.SUPABASE_DB_HOST,
    SUPABASE_DB_PORT: process.env.SUPABASE_DB_PORT,
    SUPABASE_DB_USER: process.env.SUPABASE_DB_USER,
    SUPABASE_DB_NAME: process.env.SUPABASE_DB_NAME,
    SUPABASE_DB_SSL_CA: process.env.SUPABASE_DB_SSL_CA,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    ASAAS_API_KEY: process.env.ASAAS_API_KEY,
    GATO_DEFAULT_TENANT_ID: process.env.GATO_DEFAULT_TENANT_ID,
    GATO_SESSION_TTL_MINUTES: process.env.GATO_SESSION_TTL_MINUTES,
    GATO_IMPERSONATION_TTL_MINUTES: process.env.GATO_IMPERSONATION_TTL_MINUTES,
    NODE_ENV: process.env.NODE_ENV,
  };

  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ");
    throw new Error(
      `[GATO ENV] Falha na validação de ambiente Zod:\n  - ${issues}\n` +
      `Solução: verifique as variáveis no arquivo .env e reinicie o servidor.`,
    );
  }

  if (IS_PRODUCTION) {
    if (!parsed.data.GATO_SESSION_SECRET) {
      throw new Error("[GATO ENV] GATO_SESSION_SECRET é obrigatório em produção.");
    }
    if (!parsed.data.GATO_MASTER_PASSWORD) {
      throw new Error("[GATO ENV] GATO_MASTER_PASSWORD é obrigatório em produção.");
    }
    if (!parsed.data.SUPABASE_DB_PASSWORD) {
      throw new Error("[GATO ENV] SUPABASE_DB_PASSWORD é obrigatório em produção.");
    }
  }

  return parsed.data;
}

export function validateEnv(): { ok: true } | never {
  const env = getEnv();

  // Verifica chaves optionais frágeis (não bloqueiam startup)
  const weak: string[] = [];
  if (!env.GEMINI_API_KEY) {
    weak.push("GEMINI_API_KEY (assistência de peças desativada)");
  }
  if (!env.ASAAS_API_KEY) {
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

  // Log de confirmação (sem vazar segredos)
  console.log(
    `[GATO ENV] Validação concluída (ambiente=${process.env.NODE_ENV || "development"}). ` +
    `DefaultTenant=${process.env.GATO_DEFAULT_TENANT_ID || "padrão"}`
  );

  return { ok: true };
}