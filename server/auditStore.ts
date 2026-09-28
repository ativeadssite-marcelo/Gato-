// =========================================================================
// TRILHA DE AUDITORIA — STORE (memória + espelho Postgres)
// =========================================================================
// Único ponto de escrita da trilha. Antes havia nove `unshift` diretos
// espalhados por auth.ts, authRoutes.ts e rbacRoutes.ts, cada um repetindo o
// próprio corte de tamanho — e nenhum deles persistia nada, então a trilha
// evaporava no restart.
//
// POR QUE MÓDULO SEPARADO (e não dentro do identityStore): o auth.ts precisa
// registrar auditoria, e depende só do rbacEngine. Se este código morasse no
// identityStore — que importa o auth para hidratar credenciais — o import
// viraria ciclo. Aqui a dependência é de mão única: rbacEngine + dbMirror.
//
// O banco guarda o histórico completo; a memória mantém o teto para não crescer
// sem limite. Retenção/expurgo do histórico no banco é decisão futura.
// =========================================================================

import { getDbPool, isDatabaseConfigured } from "./db";
import { mirror } from "./dbMirror";
import { AUDIT_LOGS_DATA } from "./rbacEngine";
import type { AuditLogRecord } from "../src/types/rbac";

const AUDIT_MEMORY_CAP = 5000;
const AUDIT_MEMORY_RETAIN = 4000;
/** Quanto histórico o boot traz de volta para a memória. */
const AUDIT_HYDRATE_LIMIT = 5000;

let hydrated = false;

/**
 * Registra o evento: aplica em memória (mais recente primeiro), respeita o teto
 * e espelha. Nenhum caminho novo precisa lembrar de espelhar — basta chamar isto.
 */
export function appendAuditLog(record: AuditLogRecord): void {
  AUDIT_LOGS_DATA.unshift(record);
  if (AUDIT_LOGS_DATA.length > AUDIT_MEMORY_CAP) AUDIT_LOGS_DATA.length = AUDIT_MEMORY_RETAIN;

  mirror(
    `INSERT INTO "AuditLog" (id, "tenantId", "userId", "userName", "userRole", "ipAddress",
        "userAgent", action, resource, "entityId", "timestamp", justification, "beforeState",
        "afterState", status, anomalous)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
     ON CONFLICT (id) DO NOTHING;`,
    [
      record.id,
      record.tenantId ?? "system",
      record.userId ?? "",
      record.userName ?? "",
      record.userRole ?? "",
      record.ipAddress ?? "",
      record.userAgent ?? null,
      record.action,
      String(record.resource ?? ""),
      record.entityId ?? "",
      record.timestamp ?? new Date().toISOString(),
      record.justification ?? null,
      record.beforeState ? JSON.stringify(record.beforeState) : null,
      record.afterState ? JSON.stringify(record.afterState) : null,
      record.status ?? "success",
      Boolean(record.anomalous),
    ],
  );
}

function jsonOrUndefined(value: unknown): any {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return undefined;
    }
  }
  return value;
}

function rowToAuditLog(r: Record<string, unknown>): AuditLogRecord {
  return {
    id: String(r.id),
    tenantId: String(r.tenantId ?? "system"),
    userId: String(r.userId ?? ""),
    userName: String(r.userName ?? ""),
    userRole: r.userRole as AuditLogRecord["userRole"],
    ipAddress: String(r.ipAddress ?? ""),
    userAgent: (r.userAgent as string) ?? undefined,
    action: String(r.action ?? ""),
    resource: String(r.resource ?? ""),
    entityId: String(r.entityId ?? ""),
    timestamp: r.timestamp ? new Date(r.timestamp as string).toISOString() : new Date().toISOString(),
    justification: (r.justification as string) ?? undefined,
    beforeState: jsonOrUndefined(r.beforeState),
    afterState: jsonOrUndefined(r.afterState),
    status: (r.status as AuditLogRecord["status"]) || "success",
    anomalous: r.anomalous === undefined ? undefined : Boolean(r.anomalous),
  };
}

/**
 * Traz o histórico do banco para a memória. Nunca lança: falha de hidratação
 * deixa a aplicação com a trilha que ela já tinha.
 */
export async function hydrateAuditStore(): Promise<void> {
  if (hydrated || !isDatabaseConfigured()) return;
  hydrated = true;

  try {
    const logs = await getDbPool().query(
      `SELECT * FROM "AuditLog" ORDER BY "timestamp" DESC LIMIT $1;`,
      [AUDIT_HYDRATE_LIMIT],
    );
    const knownIds = new Set(AUDIT_LOGS_DATA.map((l) => l.id));
    const fromDb = logs.rows.map(rowToAuditLog).filter((l) => !knownIds.has(l.id));
    if (!fromDb.length) return;

    AUDIT_LOGS_DATA.push(...fromDb);
    AUDIT_LOGS_DATA.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
    if (AUDIT_LOGS_DATA.length > AUDIT_MEMORY_CAP) AUDIT_LOGS_DATA.length = AUDIT_MEMORY_CAP;
  } catch (err: any) {
    console.warn(
      "[GATO Auditoria] Hidratação do Postgres falhou (seguindo em memória):",
      err?.message || err,
    );
  }
}
