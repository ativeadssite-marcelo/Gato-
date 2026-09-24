// =========================================================================
// VALIDAÇÃO DO BANCO — schema das migrações x schema real + integridade dos dados
// =========================================================================
// Responde duas perguntas de uma vez:
//   1. O que as migrações (db/migrations) esperam existe de fato no Supabase?
//   2. Os dados estão corretos — em especial, cada linha está no tenant certo?
//
// A checagem de dados é DINÂMICA de propósito: o schema de negócio (Tenant,
// Product, Customer, Budget, ...) foi criado fora destas migrações, então uma
// lista fixa envelheceria sem avisar. Descobrindo as tabelas em
// `information_schema`, o validador também acha problema que eu não previ.
//
// Uso:  npm run validate-db
// Sai com código 1 se houver qualquer FALHA (dá para usar em CI).
// =========================================================================

import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { getDbPool, isDatabaseConfigured, DB_NOT_CONFIGURED_MESSAGE } from "./db";

// Ponto de entrada: carrega o .env como o server.ts faz.
dotenv.config();

const levelIcon = { ok: "[ok]  ", warn: "[aviso]", fail: "[FALHA]" } as const;
type Level = keyof typeof levelIcon;

interface Finding {
  level: Level;
  check: string;
  detail: string;
  samples?: string[];
}

const findings: Finding[] = [];
const report = (level: Level, check: string, detail: string, samples?: string[]) =>
  findings.push({ level, check, detail, samples });

/** Identificador entre aspas — nomes vêm do information_schema, não do usuário. */
const q = (ident: string) => `"${ident.replace(/"/g, '""')}"`;
const safeIdent = (n: string) => /^[A-Za-z_][A-Za-z0-9_$]{0,62}$/.test(n);

/** Lê as tabelas e colunas que as migrações em disco esperam. */
function expectedFromMigrations(): Map<string, string[]> {
  const dir = path.resolve(process.cwd(), "db", "migrations");
  const expected = new Map<string, string[]>();
  if (!fs.existsSync(dir)) return expected;

  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    const sql = fs.readFileSync(path.join(dir, file), "utf8");
    const tableRe = /CREATE TABLE IF NOT EXISTS "([A-Za-z_][A-Za-z0-9_]*)"\s*\(([\s\S]*?)\n\);/g;

    let match: RegExpExecArray | null;
    while ((match = tableRe.exec(sql)) !== null) {
      const [, table, body] = match;
      const columns: string[] = [];
      for (const rawLine of body.split("\n")) {
        const line = rawLine.trim();
        if (!line || line.startsWith("--") || line.startsWith("CONSTRAINT")) continue;
        // Coluna: começa com identificador seguido de tipo (com ou sem aspas).
        const col = line.match(/^"?([A-Za-z_][A-Za-z0-9_]*)"?\s+[A-Za-z]/);
        if (col) columns.push(col[1]);
      }
      expected.set(table, columns);
    }
  }
  return expected;
}

interface TableInfo {
  name: string;
  columns: Set<string>;
}

async function loadSchema(): Promise<Map<string, TableInfo>> {
  const db = getDbPool();
  const tables = new Map<string, TableInfo>();

  const res = await db.query(
    `SELECT table_name, column_name
     FROM information_schema.columns
     WHERE table_schema = 'public'
     ORDER BY table_name, ordinal_position;`,
  );
  for (const row of res.rows as Array<{ table_name: string; column_name: string }>) {
    const name = row.table_name;
    if (!tables.has(name)) tables.set(name, { name, columns: new Set() });
    tables.get(name)!.columns.add(row.column_name);
  }
  return tables;
}

async function main(): Promise<void> {
  if (!isDatabaseConfigured()) {
    console.error(DB_NOT_CONFIGURED_MESSAGE);
    console.error("\nSem credencial não há o que validar. Cadastre na tela 'Banco de Dados' (Super Admin)");
    console.error("ou defina SUPABASE_DB_HOST e SUPABASE_DB_PASSWORD. O segredo não precisa passar por mim.");
    process.exit(2);
  }

  const db = getDbPool();
  const version = await db.query("SELECT version() AS v, current_database() AS db;");
  console.log(`\nBanco: ${version.rows[0].db}`);
  console.log(`${String(version.rows[0].v).split(",")[0]}\n`);

  const schema = await loadSchema();
  console.log(`Tabelas no schema public: ${schema.size}\n`);

  // -----------------------------------------------------------------------
  // 1. Migrações x schema real
  // -----------------------------------------------------------------------
  console.log("=== 1. MIGRAÇÕES x SCHEMA REAL ===");
  const expected = expectedFromMigrations();

  for (const [table, columns] of expected) {
    const actual = schema.get(table);
    if (!actual) {
      report("fail", `tabela ${table}`, "esperada pelas migrações e AUSENTE no banco");
      continue;
    }
    const missing = columns.filter((c) => !actual.columns.has(c));
    if (missing.length > 0) {
      report("fail", `colunas ${table}`, `faltando: ${missing.join(", ")}`);
    } else {
      report("ok", `tabela ${table}`, `${columns.length} colunas conferem`);
    }
  }
  const appliedRes = await db
    .query('SELECT name FROM "SchemaMigration" ORDER BY name;')
    .catch(() => ({ rows: [] as any[] }));
  const applied = (appliedRes.rows as Array<{ name: string }>).map((r) => r.name);
  if (applied.length > 0) {
    report("ok", "controle de migrações", `aplicadas: ${applied.join(", ")}`);
  } else {
    report("warn", "controle de migrações", 'tabela "SchemaMigration" vazia ou ausente — as migrações não foram registradas');
  }

  const migracaoNomes = fs
    .readdirSync(path.resolve(process.cwd(), "db", "migrations"))
    .filter((f) => f.endsWith(".sql"));
  const naoAplicadas = migracaoNomes.filter((f) => !applied.includes(f));
  if (naoAplicadas.length > 0) {
    report("warn", "migrações pendentes", naoAplicadas.join(", "), [
      "Rode: npm run migrate",
    ]);
  }

  // -----------------------------------------------------------------------
  // 2. Toda tabela com tenantId: preenchido e apontando para Tenant existente
  // -----------------------------------------------------------------------
  console.log("=== 2. ISOLAMENTO: tenantId preenchido e válido ===");
  const tenantScoped = [...schema.values()].filter((t) => t.columns.has("tenantId"));

  if (tenantScoped.length === 0) {
    report("warn", "tabelas com tenantId", "nenhuma encontrada — schema inesperado para multi-tenant");
  }

  for (const table of tenantScoped) {
    if (!safeIdent(table.name)) continue;
    try {
      const nulos = await db.query(
        `SELECT count(*)::int AS n FROM ${q(table.name)} WHERE "tenantId" IS NULL;`,
      );
      if (nulos.rows[0].n > 0) {
        const amostra = await db.query(
          `SELECT id FROM ${q(table.name)} WHERE "tenantId" IS NULL LIMIT 3;`,
        );
        report("fail", `${table.name}: tenantId nulo`, `${nulos.rows[0].n} linha(s) sem tenant`, amostra.rows.map((r) => String(r.id)));
      }

      const orfas = await db.query(
        `SELECT count(*)::int AS n FROM ${q(table.name)} x
         LEFT JOIN "Tenant" t ON t.id = x."tenantId"
         WHERE x."tenantId" IS NOT NULL AND t.id IS NULL;`,
      );
      if (orfas.rows[0].n > 0) {
        const amostra = await db.query(
          `SELECT x.id, x."tenantId" FROM ${q(table.name)} x
           LEFT JOIN "Tenant" t ON t.id = x."tenantId"
           WHERE x."tenantId" IS NOT NULL AND t.id IS NULL LIMIT 3;`,
        );
        report("fail", `${table.name}: tenant inexistente`, `${orfas.rows[0].n} linha(s) apontando para tenant que não existe`, amostra.rows.map((r) => `${r.id} → ${r.tenantId}`));
      }
    } catch (err: any) {
      report("warn", `${table.name}`, `não foi possível checar tenant: ${err?.message || err}`);
    }
  }

  // -----------------------------------------------------------------------
  // 3. Integridade referencial dos relacionamentos de negócio
  // -----------------------------------------------------------------------
  console.log("=== 3. INTEGRIDADE REFERENCIAL ===");
  const fks: Array<[string, string, string]> = [
    ["StockLevel", "productId", "Product"],
    ["StockLevel", "warehouseId", "Warehouse"],
    ["BudgetItem", "budgetId", "Budget"],
    ["Budget", "customerId", "Customer"],
    ["Product", "categoryId", "Category"],
    ["Warehouse", "tenantId", "Tenant"],
  ];

  for (const [child, col, parent] of fks) {
    const childTable = schema.get(child);
    const parentTable = schema.get(parent);
    if (!childTable || !parentTable) {
      report("warn", `${child}.${col} → ${parent}`, "tabela ausente; checagem pulada");
      continue;
    }
    if (!childTable.columns.has(col)) {
      report("warn", `${child}.${col} → ${parent}`, `coluna ${col} ausente`);
      continue;
    }
    try {
      const res = await db.query(
        `SELECT count(*)::int AS n FROM ${q(child)} c
         LEFT JOIN ${q(parent)} p ON p.id = c.${q(col)}
         WHERE c.${q(col)} IS NOT NULL AND p.id IS NULL;`,
      );
      if (res.rows[0].n > 0) {
        report("fail", `${child}.${col} → ${parent}`, `${res.rows[0].n} referência(s) órfã(s)`);
      } else {
        report("ok", `${child}.${col} → ${parent}`, "sem órfãos");
      }
    } catch (err: any) {
      report("warn", `${child}.${col} → ${parent}`, `checagem falhou: ${err?.message || err}`);
    }
  }

  // -----------------------------------------------------------------------
  // 4. VAZAMENTO ENTRE TENANTS — a checagem mais importante deste validador
  // -----------------------------------------------------------------------
  console.log("=== 4. VAZAMENTO ENTRE TENANTS (relacionamentos cruzados) ===");
  const cruzadas: Array<[string, string, string, string]> = [
    // child.col  →  via.col  →  via tabela; compara child.tenantId com o do pai
    ["StockLevel", "productId", "Product", "produto"],
    ["StockLevel", "warehouseId", "Warehouse", "depósito"],
    ["Budget", "customerId", "Customer", "cliente"],
    ["BudgetItem", "budgetId", "Budget", "orçamento"],
    ["Product", "categoryId", "Category", "categoria"],
  ];

  for (const [child, col, parent, rotulo] of cruzadas) {
    const childTable = schema.get(child);
    const parentTable = schema.get(parent);
    if (!childTable?.columns.has(col) || !childTable.columns.has("tenantId")) continue;
    if (!parentTable?.columns.has("tenantId")) continue;

    try {
      const res = await db.query(
        `SELECT count(*)::int AS n FROM ${q(child)} c
         JOIN ${q(parent)} p ON p.id = c.${q(col)}
         WHERE c."tenantId" IS DISTINCT FROM p."tenantId";`,
      );
      if (res.rows[0].n > 0) {
        const amostra = await db.query(
          `SELECT c.id, c."tenantId" AS tenant_filho, p."tenantId" AS tenant_pai
           FROM ${q(child)} c JOIN ${q(parent)} p ON p.id = c.${q(col)}
           WHERE c."tenantId" IS DISTINCT FROM p."tenantId" LIMIT 3;`,
        );
        report(
          "fail",
          `${child}.${col} de outro tenant`,
          `${res.rows[0].n} linha(s) apontam para ${rotulo} de empresa diferente`,
          amostra.rows.map((r) => `${r.id}: filho=${r.tenant_filho} pai=${r.tenant_pai}`),
        );
      } else {
        report("ok", `${child}.${col} dentro do tenant`, "nenhuma referência cruzada");
      }
    } catch (err: any) {
      report("warn", `${child}.${col} cruzado`, `checagem falhou: ${err?.message || err}`);
    }
  }

  // -----------------------------------------------------------------------
  // 5. Unicidade que o CÓDIGO assume (mesmo sem constraint no banco)
  // -----------------------------------------------------------------------
  console.log("=== 5. UNICIDADE ASSUMIDA PELO CÓDIGO ===");
  const uniques: Array<[string, string, string]> = [
    ["Product", "sku", "o cadastro trata SKU como único por empresa"],
    ["Customer", "document", "o cadastro trata documento como único por empresa"],
  ];
  for (const [table, col, motivo] of uniques) {
    const t = schema.get(table);
    if (!t?.columns.has(col) || !t.columns.has("tenantId")) continue;
    try {
      const res = await db.query(
        `SELECT count(*)::int AS n FROM (
           SELECT "tenantId", ${q(col)} FROM ${q(table)}
           WHERE ${q(col)} IS NOT NULL AND ${q(col)} <> ''
           GROUP BY "tenantId", ${q(col)} HAVING count(*) > 1
         ) d;`,
      );
      if (res.rows[0].n > 0) {
        const amostra = await db.query(
          `SELECT "tenantId", ${q(col)} AS valor, count(*)::int AS n FROM ${q(table)}
           WHERE ${q(col)} IS NOT NULL AND ${q(col)} <> ''
           GROUP BY "tenantId", ${q(col)} HAVING count(*) > 1 LIMIT 3;`,
        );
        report("warn", `${table}.${col} duplicado`, `${res.rows[0].n} grupo(s) duplicado(s) — ${motivo}`, amostra.rows.map((r) => `${r.valor} (x${r.n}) no tenant ${String(r.tenantId).slice(0, 12)}…`));
      } else {
        report("ok", `${table}.${col} único por empresa`, "sem duplicidade");
      }
    } catch (err: any) {
      report("warn", `${table}.${col}`, `checagem falhou: ${err?.message || err}`);
    }
  }

  // -----------------------------------------------------------------------
  // 6. Distribuição das linhas por empresa (leitura humana)
  // -----------------------------------------------------------------------
  console.log("=== 6. DISTRIBUIÇÃO POR EMPRESA ===");
  const principais = ["Product", "Customer", "Budget", "StockLevel", "Warehouse", "User"].filter(
    (t) => schema.has(t) && schema.get(t)!.columns.has("tenantId"),
  );
  for (const table of principais) {
    try {
      const res = await db.query(
        `SELECT x."tenantId", COALESCE(t.name, '(tenant inexistente)') AS empresa, count(*)::int AS n
         FROM ${q(table)} x LEFT JOIN "Tenant" t ON t.id = x."tenantId"
         GROUP BY x."tenantId", t.name ORDER BY n DESC LIMIT 8;`,
      );
      const linhas = (res.rows as any[]).map((r) => `${String(r.empresa).slice(0, 28).padEnd(28)} ${String(r.n).padStart(7)}`);
      report("ok", `linhas de ${table} por empresa`, `${linhas.length} empresa(s)`, linhas);
    } catch (err: any) {
      report("warn", `${table}`, `não foi possível agregar: ${err?.message || err}`);
    }
  }

  // -----------------------------------------------------------------------
  // 7. Tabelas sem tenantId que não são claramente globais (revisão manual)
  // -----------------------------------------------------------------------
  console.log("=== 7. TABELAS SEM tenantId ===");
  const globaisEsperadas = new Set([
    "Tenant", "SaaSPlan", "SchemaMigration", "WebhookEvent", "GatewayCustomer",
  ]);
  const semTenant = [...schema.values()].filter((t) => !t.columns.has("tenantId")).map((t) => t.name);
  const revisar = semTenant.filter((n) => !globaisEsperadas.has(n));
  if (revisar.length > 0) {
    report("warn", "tabelas sem tenantId para revisar", revisar.join(", "), [
      "Se alguma for operacional, o isolamento depende de join — vale confirmar.",
    ]);
  } else {
    report("ok", "tabelas sem tenantId", "todas as exceções são globais por natureza");
  }

  // -----------------------------------------------------------------------
  // Relatório
  // -----------------------------------------------------------------------
  console.log("\n================ RELATÓRIO ================\n");
  for (const level of ["fail", "warn", "ok"] as Level[]) {
    const grupo = findings.filter((f) => f.level === level);
    if (grupo.length === 0) continue;
    console.log(`--- ${levelIcon[level]} (${grupo.length}) ---`);
    for (const f of grupo) {
      console.log(`${levelIcon[f.level]} ${f.check}: ${f.detail}`);
      for (const s of f.samples || []) console.log(`         · ${s}`);
    }
    console.log("");
  }

  const falhas = findings.filter((f) => f.level === "fail").length;
  const avisos = findings.filter((f) => f.level === "warn").length;
  console.log(`Resumo: ${falhas} falha(s), ${avisos} aviso(s), ${findings.filter((f) => f.level === "ok").length} ok.`);
  console.log(falhas === 0 ? "\nSchema e dados consistentes.\n" : "\nHá inconsistências a corrigir.\n");
  process.exit(falhas === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("Falha ao validar o banco:", err?.message || err);
  process.exit(2);
});
