// =========================================================================
// CREDENCIAIS DE INTEGRAÇÃO DO TENANT — STORE (memória + espelho Postgres)
// =========================================================================
// Mesma filosofia do server/store.ts: os Maps em memória são a fonte de verdade
// imediata; o Postgres é espelho best-effort que nunca derruba a requisição, e as
// tabelas são hidratadas na primeira leitura.
//
// SEGURANÇA: o segredo em claro só existe no instante da geração. O que fica
// guardado é sha256(segredo) + um prefixo exibível. A verificação é feita por
// busca no prefixo (não é segredo) seguida de comparação em tempo constante do
// hash — nunca comparando a string do segredo.
// =========================================================================

import crypto from "node:crypto";
import { getDbPool, isDatabaseConfigured } from "./db";
import type {
  CredentialKind,
  MachineActivation,
  TenantCredential,
} from "../src/types/credentials";
import type { TenantPermissionKey } from "../src/types/rbac";

const id = (prefix: string) => `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
const now = () => new Date().toISOString();

/**
 * Formato do segredo por tipo. O corpo é 24 bytes aleatórios (192 bits) em
 * base64url — por isso sha256 basta, sem scrypt: não há dicionário a resistir
 * como numa senha humana, e o hash permite busca direta no índice.
 */
const KIND_SPEC: Record<CredentialKind, { secretPrefix: string; defaultLabel: string }> = {
  api_key: { secretPrefix: "gato_live_", defaultLabel: "Chave de API" },
  machine_license: { secretPrefix: "gato_lic_", defaultLabel: "Licença de máquina" },
};

/** Quantos caracteres do corpo entram no prefixo exibível (e no índice de busca). */
const INDEX_CHARS = 12;

// -------------------------------------------------------------------------
// Estado em memória
// -------------------------------------------------------------------------
const credentials = new Map<string, TenantCredential>();
const activations = new Map<string, MachineActivation>();
/** Índice prefixo -> credentialId, para a busca O(1) na autenticação. */
const byIndex = new Map<string, string>();

let hydrated = false;

type Row = Record<string, unknown>;

function mirror(sql: string, params: unknown[] = []): void {
  if (!isDatabaseConfigured()) return;
  getDbPool()
    .query(sql, params)
    .catch((err) =>
      console.warn("[GATO Credenciais] Espelho Postgres indisponível:", err?.message || err),
    );
}

function rowToCredential(r: Row): TenantCredential {
  return {
    id: String(r.id),
    tenantId: String(r.tenantId),
    kind: (r.kind as CredentialKind) || "api_key",
    label: String(r.label ?? ""),
    keyPrefix: String(r.keyPrefix ?? ""),
    keyLast4: String(r.keyLast4 ?? ""),
    keyHash: String(r.keyHash ?? ""),
    capabilities: Array.isArray(r.capabilities)
      ? (r.capabilities as TenantPermissionKey[])
      : typeof r.capabilities === "string"
        ? (JSON.parse(r.capabilities) as TenantPermissionKey[])
        : [],
    active: Boolean(r.active),
    createdAt: String(r.createdAt ?? now()),
    createdBy: { id: String(r.createdById ?? ""), name: String(r.createdByName ?? "") },
    lastUsedAt: (r.lastUsedAt as string) ?? undefined,
    rotatedAt: (r.rotatedAt as string) ?? undefined,
    revokedAt: (r.revokedAt as string) ?? undefined,
  };
}

function rowToActivation(r: Row): MachineActivation {
  return {
    id: String(r.id),
    tenantId: String(r.tenantId),
    credentialId: String(r.credentialId),
    machineId: String(r.machineId ?? ""),
    machineLabel: (r.machineLabel as string) ?? undefined,
    activatedAt: String(r.activatedAt ?? now()),
    deactivatedAt: (r.deactivatedAt as string) ?? undefined,
    active: Boolean(r.active),
  };
}

async function hydrate(): Promise<void> {
  if (hydrated || !isDatabaseConfigured()) return;
  hydrated = true;
  try {
    const db = getDbPool();
    const [cred, act] = await Promise.all([
      db.query('SELECT * FROM "TenantCredential";'),
      db.query('SELECT * FROM "MachineActivation" WHERE "active" = true;'),
    ]);
    for (const r of cred.rows) {
      const c = rowToCredential(r);
      if (!credentials.has(c.id)) {
        credentials.set(c.id, c);
        byIndex.set(indexKeyOf(c.keyPrefix, c.kind), c.id);
      }
    }
    for (const r of act.rows) {
      const a = rowToActivation(r);
      if (!activations.has(a.id)) activations.set(a.id, a);
    }
  } catch (err: any) {
    console.warn(
      "[GATO Credenciais] Hidratação do Postgres falhou (seguindo em memória):",
      err?.message || err,
    );
  }
}

// -------------------------------------------------------------------------
// Geração e verificação do segredo
// -------------------------------------------------------------------------

function indexKeyOf(prefix: string, kind: CredentialKind): string {
  return `${kind}:${prefix}`;
}

/**
 * Descobre a chave de índice a partir do segredo apresentado. Devolve null se o
 * formato não corresponde a nenhum tipo conhecido — nesse caso nem vale consultar.
 */
function indexKeyForSecret(secret: string): string | null {
  for (const [kind, spec] of Object.entries(KIND_SPEC) as [CredentialKind, typeof KIND_SPEC.api_key][]) {
    if (secret.startsWith(spec.secretPrefix)) {
      return indexKeyOf(secret.slice(0, spec.secretPrefix.length + INDEX_CHARS), kind);
    }
  }
  return null;
}

function hashSecret(secret: string): string {
  return crypto.createHash("sha256").update(secret, "utf8").digest("hex");
}

/** Comparação em tempo constante de dois hashes sha256 (sempre 64 caracteres). */
function hashesMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function generateSecret(kind: CredentialKind): string {
  const spec = KIND_SPEC[kind];
  return `${spec.secretPrefix}${crypto.randomBytes(24).toString("base64url")}`;
}

export function defaultLabelFor(kind: CredentialKind): string {
  return KIND_SPEC[kind].defaultLabel;
}

// -------------------------------------------------------------------------
// Leitura
// -------------------------------------------------------------------------

export async function getCredential(
  tenantId: string,
  kind: CredentialKind,
): Promise<TenantCredential | undefined> {
  await hydrate();
  for (const c of credentials.values()) {
    if (c.tenantId === tenantId && c.kind === kind) return c;
  }
  return undefined;
}

export async function listCredentials(tenantId: string): Promise<TenantCredential[]> {
  await hydrate();
  return [...credentials.values()].filter((c) => c.tenantId === tenantId);
}

/**
 * Resolve a credencial a partir do segredo apresentado. Devolve a credencial
 * mesmo se estiver revogada, para que o chamador distinga "chave inexistente" de
 * "chave revogada" na auditoria.
 */
export async function findCredentialBySecret(
  secret: string,
): Promise<TenantCredential | undefined> {
  await hydrate();
  const trimmed = secret.trim();
  const indexKey = indexKeyForSecret(trimmed);
  if (!indexKey) return undefined;

  const credentialId = byIndex.get(indexKey);
  if (credentialId) {
    const candidate = credentials.get(credentialId);
    if (candidate && hashesMatch(hashSecret(trimmed), candidate.keyHash)) return candidate;
  }

  // Fallback: a credencial pode ter sido hidratada do banco antes do índice, ou o
  // índice pode estar defasado. Varredura com comparação em tempo constante.
  const providedHash = hashSecret(trimmed);
  for (const c of credentials.values()) {
    if (c.keyPrefix === trimmed.slice(0, c.keyPrefix.length) && hashesMatch(providedHash, c.keyHash)) {
      return c;
    }
  }
  return undefined;
}

// -------------------------------------------------------------------------
// Criação / rotação / revogação
// -------------------------------------------------------------------------

export interface CreateCredentialInput {
  tenantId: string;
  kind: CredentialKind;
  label?: string;
  capabilities?: TenantPermissionKey[];
  actor: { id: string; name: string };
}

/**
 * Cria a credencial do tipo pedido ou **rotaciona** a existente.
 *
 * Rotacionar substitui a anterior no mesmo registro: o segredo antigo morre na
 * hora, porque o hash guardado passa a ser o do novo. O `id` e o `createdAt` são
 * preservados (com `rotatedAt` marcando a troca) para a trilha de auditoria não
 * parecer que a credencial é nova a cada rotação.
 */
export async function createOrRotateCredential(
  input: CreateCredentialInput,
): Promise<{ credential: TenantCredential; secret: string }> {
  await hydrate();

  const secret = generateSecret(input.kind);
  const keyPrefix = secret.slice(0, KIND_SPEC[input.kind].secretPrefix.length + INDEX_CHARS);
  const existing = await getCredential(input.tenantId, input.kind);

  const credential: TenantCredential = existing
    ? {
        ...existing,
        label: input.label?.trim() || existing.label,
        keyPrefix,
        keyLast4: secret.slice(-4),
        keyHash: hashSecret(secret),
        capabilities: input.capabilities ?? existing.capabilities,
        active: true,
        revokedAt: undefined,
        rotatedAt: now(),
      }
    : {
        id: id("cred"),
        tenantId: input.tenantId,
        kind: input.kind,
        label: input.label?.trim() || defaultLabelFor(input.kind),
        keyPrefix,
        keyLast4: secret.slice(-4),
        keyHash: hashSecret(secret),
        capabilities: input.capabilities ?? [],
        active: true,
        createdAt: now(),
        createdBy: { ...input.actor },
      };

  // Ao rotacionar, o índice antigo apontaria para esta credencial com o hash
  // antigo — inofensivo (a comparação de hash rejeita), mas é lixo que confunde.
  if (existing) byIndex.delete(indexKeyOf(existing.keyPrefix, existing.kind));

  credentials.set(credential.id, credential);
  byIndex.set(indexKeyOf(keyPrefix, credential.kind), credential.id);

  mirror(
    `INSERT INTO "TenantCredential" (id, "tenantId", kind, label, "keyPrefix", "keyLast4", "keyHash", capabilities, active, "createdAt", "createdById", "createdByName", "lastUsedAt", "rotatedAt", "revokedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
     ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, "keyPrefix" = EXCLUDED."keyPrefix",
       "keyLast4" = EXCLUDED."keyLast4", "keyHash" = EXCLUDED."keyHash",
       capabilities = EXCLUDED.capabilities, active = EXCLUDED.active,
       "lastUsedAt" = EXCLUDED."lastUsedAt", "rotatedAt" = EXCLUDED."rotatedAt",
       "revokedAt" = EXCLUDED."revokedAt";`,
    [
      credential.id,
      credential.tenantId,
      credential.kind,
      credential.label,
      credential.keyPrefix,
      credential.keyLast4,
      credential.keyHash,
      JSON.stringify(credential.capabilities),
      credential.active,
      credential.createdAt,
      credential.createdBy.id,
      credential.createdBy.name,
      credential.lastUsedAt ?? null,
      credential.rotatedAt ?? null,
      credential.revokedAt ?? null,
    ],
  );

  return { credential, secret };
}

/**
 * Revoga a credencial do tipo pedido. Revogar a licença também desativa a máquina
 * vinculada — senão o aplicativo continuaria "ativado" com uma licença morta.
 */
export async function revokeCredential(
  tenantId: string,
  kind: CredentialKind,
): Promise<TenantCredential | undefined> {
  const credential = await getCredential(tenantId, kind);
  if (!credential) return undefined;

  credential.active = false;
  credential.revokedAt = now();
  credentials.set(credential.id, credential);
  byIndex.delete(indexKeyOf(credential.keyPrefix, credential.kind));

  if (kind === "machine_license") await deactivateActivationFor(credential.id);

  mirror(
    `UPDATE "TenantCredential" SET active = false, "revokedAt" = $2 WHERE id = $1;`,
    [credential.id, credential.revokedAt],
  );

  return credential;
}

/** Marca o último uso. Só espelha a cada mudança de minuto, para não escrever por requisição. */
export async function touchLastUsed(credentialId: string): Promise<void> {
  const credential = credentials.get(credentialId);
  if (!credential) return;

  const stamp = now();
  const previous = credential.lastUsedAt;
  credential.lastUsedAt = stamp;

  if (previous && stamp.slice(0, 16) === previous.slice(0, 16)) return;
  mirror(`UPDATE "TenantCredential" SET "lastUsedAt" = $2 WHERE id = $1;`, [credentialId, stamp]);
}

// -------------------------------------------------------------------------
// Ativação de máquina (1 ativa por licença)
// -------------------------------------------------------------------------

export async function getActiveActivation(
  credentialId: string,
): Promise<MachineActivation | undefined> {
  await hydrate();
  for (const a of activations.values()) {
    if (a.credentialId === credentialId && a.active) return a;
  }
  return undefined;
}

/**
 * Discriminante string (e não booleano) de propósito: o tsconfig deste projeto
 * não tem `strict`, e o estreitamento por booleano literal não pega aqui.
 */
export type ActivateOutcome =
  | { outcome: "activated"; activation: MachineActivation }
  | { outcome: "revoked" }
  | { outcome: "already_bound"; current: MachineActivation };

/**
 * Vincula a licença a uma máquina. Se já houver outra máquina ativa, recusa — a
 * menos que seja a MESMA máquina, caso em que devolve a ativação corrente
 * (reativação idempotente, para o app poder subir novamente sem intervenção).
 */
export async function activateMachine(
  credential: TenantCredential,
  machineId: string,
  machineLabel?: string,
): Promise<ActivateOutcome> {
  if (!credential.active) return { outcome: "revoked" };

  const current = await getActiveActivation(credential.id);
  if (current) {
    if (current.machineId === machineId) return { outcome: "activated", activation: current };
    return { outcome: "already_bound", current };
  }

  const activation: MachineActivation = {
    id: id("act"),
    tenantId: credential.tenantId,
    credentialId: credential.id,
    machineId,
    machineLabel: machineLabel?.trim() || undefined,
    activatedAt: now(),
    active: true,
  };
  activations.set(activation.id, activation);

  mirror(
    `INSERT INTO "MachineActivation" (id, "tenantId", "credentialId", "machineId", "machineLabel", "activatedAt", active)
     VALUES ($1,$2,$3,$4,$5,$6,true) ON CONFLICT (id) DO NOTHING;`,
    [
      activation.id,
      activation.tenantId,
      activation.credentialId,
      activation.machineId,
      activation.machineLabel ?? null,
      activation.activatedAt,
    ],
  );

  return { outcome: "activated", activation };
}

/** Desvincula a máquina. Exige o `machineId` correto, salvo quando for o admin. */
export async function deactivateMachine(
  credential: TenantCredential,
  machineId?: string,
): Promise<{ ok: boolean; reason?: "not_active" | "machine_mismatch" }> {
  const current = await getActiveActivation(credential.id);
  if (!current) return { ok: false, reason: "not_active" };
  if (machineId && current.machineId !== machineId) return { ok: false, reason: "machine_mismatch" };

  await deactivateActivationFor(credential.id);
  return { ok: true };
}

async function deactivateActivationFor(credentialId: string): Promise<void> {
  for (const a of activations.values()) {
    if (a.credentialId === credentialId && a.active) {
      a.active = false;
      a.deactivatedAt = now();
      activations.set(a.id, a);
      mirror(`UPDATE "MachineActivation" SET active = false, "deactivatedAt" = $2 WHERE id = $1;`, [
        a.id,
        a.deactivatedAt,
      ]);
    }
  }
}
