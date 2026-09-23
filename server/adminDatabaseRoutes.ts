// =========================================================================
// ROTAS DE CONFIGURAÇÃO DO BANCO — Super Admin
// =========================================================================
// Permite cadastrar/testar as credenciais do Postgres em tempo de execução,
// sem editar variáveis de ambiente. Restrito ao escopo SaaS com permissão de
// segurança (super_admin). A senha nunca é retornada nem logada.
// =========================================================================

import { Router, Request, Response } from "express";
import {
  requireAuth,
  requirePermission,
  requireSaasScope,
} from "./auth";
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

adminDatabaseRouter.use(requireAuth, requireSaasScope, requirePermission("security_compliance", { write: true }));

/** Estado atual das credenciais (mascarado). */
adminDatabaseRouter.get("/status", (_req: Request, res: Response) => {
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
adminDatabaseRouter.post("/test", async (req: Request, res: Response) => {
  const input = req.body || {};
  const host = String(input.host || "").trim();
  const password = String(input.password || "");
  if (!host || !password) {
    return res.status(400).json({ success: false, error: "Host e senha são obrigatórios." });
  }
  const result = await testDbConnection({
    host,
    port: parseInt(input.port || "5432", 10) || 5432,
    user: String(input.user || "postgres").trim() || "postgres",
    password,
    database: String(input.database || "postgres").trim() || "postgres",
    sslDisable: input.sslDisable === true,
    sslRejectUnauthorized: input.sslRejectUnauthorized !== false,
  });
  res.json({ success: result.ok, ...result });
});

/** Testa, salva e aplica (reset do pool + migrations). */
adminDatabaseRouter.post("/configure", async (req: Request, res: Response) => {
  const input = req.body || {};
  const host = String(input.host || "").trim();
  const password = String(input.password || "");
  if (!host || !password) {
    return res.status(400).json({ success: false, error: "Host e senha são obrigatórios." });
  }

  const config = {
    host,
    port: parseInt(input.port || "5432", 10) || 5432,
    user: String(input.user || "postgres").trim() || "postgres",
    password,
    database: String(input.database || "postgres").trim() || "postgres",
    sslDisable: input.sslDisable === true,
    sslRejectUnauthorized: input.sslRejectUnauthorized !== false,
  };

  const test = await testDbConnection(config);
  if (!test.ok) {
    return res.status(502).json({
      success: false,
      error: "Conexão recusada. Verifique as credenciais e tente novamente.",
      detail: test.error,
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
  });
});

/** Remove as credenciais salvas (volta a usar variáveis de ambiente). */
adminDatabaseRouter.post("/clear", (_req: Request, res: Response) => {
  clearSavedDbConfig();
  resetDbPool();
  res.json({ success: true, message: "Credenciais salvas removidas." });
});
