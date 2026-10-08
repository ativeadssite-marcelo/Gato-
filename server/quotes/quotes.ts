// =========================================================================
// ORÇAMENTOS / DAV — LEITURA (Budget + BudgetItem)
// =========================================================================
// Por que isto vive fora do `server.ts`: a rota é fina (autentica, resolve o
// escopo, responde) e o que merece teste é o miolo — o filtro de tenant entrar
// SEMPRE na query, os itens virem agrupados por orçamento e o dinheiro sair
// como número. O `pool` entra por parâmetro para o teste rodar sem banco:
// `getDbPool()` só existe com Postgres configurado.
//
// A escrita do orçamento continua em `server.ts` (POST /api/db/quotes); aqui é
// só o caminho de volta, que o front precisa para listar o histórico.
// =========================================================================

/** Só o que estas queries usam do pool — permite um duble no teste. */
export interface QuoteQueryable {
  query(sql: string, params?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
}

export interface QuoteListScope {
  /** Tenant do usuário autenticado; ausente quando o escopo é global. */
  tenantId?: string;
  /** true = sem filtro de tenant (equipe da plataforma, já auditada no escopo). */
  global?: boolean;
}

export interface QuoteQuery {
  sql: string;
  params: unknown[];
}

export interface QuoteItem {
  id: string;
  budgetId: string;
  productId: string | null;
  productName: string | null;
  productCode: string | null;
  brand: string | null;
  quantity: number;
  unitPrice: number;
}

export interface QuoteListItem {
  id: string;
  number: string;
  customerId: string | null;
  customerName: string | null;
  customerDocument: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  customerCity: string | null;
  customerUf: string | null;
  total: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  items: QuoteItem[];
}

/** O histórico de DAVs cresce sem parar; a tela lista os mais recentes. */
const MAX_QUOTES = 500;

/**
 * Cabeçalho dos orçamentos. Função pura de propósito: é ela que o teste trava
 * para garantir que o filtro por tenant nunca "escapa" de uma query.
 */
export function buildQuotesQuery(scope: QuoteListScope): QuoteQuery {
  const params: unknown[] = [];
  let whereClause = "";
  if (scope.global) {
    // Escopo da plataforma: sem filtro (a auditoria da consulta global acontece
    // em `resolveDataScope`, antes de chegar aqui).
  } else if (scope.tenantId) {
    params.push(scope.tenantId);
    whereClause = `WHERE b."tenantId" = $1`;
  } else {
    // Sem tenant e sem escopo global não é "todos": é escopo inválido. Fecha a
    // query (fail-closed) em vez de devolver a base inteira por omissão.
    whereClause = `WHERE FALSE`;
  }

  const sql = `
    SELECT
      b.id,
      b.number,
      b."customerId",
      b.total::float as total,
      b.status,
      b."createdAt",
      b."updatedAt",
      c.name as "customerName",
      c.document as "customerDocument",
      c.phone as "customerPhone",
      c.email as "customerEmail",
      c.city as "customerCity",
      c.state as "customerUf"
    FROM "Budget" b
    LEFT JOIN "Customer" c ON c.id = b."customerId"
    ${whereClause}
    ORDER BY b."createdAt" DESC
    LIMIT ${MAX_QUOTES};
  `;
  return { sql, params };
}

/** Itens de todos os orçamentos carregados numa query só (sem N+1). */
export function buildItemsQuery(budgetIds: string[]): QuoteQuery {
  return {
    sql: `
      SELECT
        bi.id,
        bi."budgetId",
        bi."productId",
        bi.quantity::float as quantity,
        bi."unitPrice"::float as "unitPrice",
        p.name as "productName",
        p.sku as "productCode",
        p.brand
      FROM "BudgetItem" bi
      LEFT JOIN "Product" p ON p.id = bi."productId"
      WHERE bi."budgetId" = ANY($1::text[])
      ORDER BY bi."createdAt" ASC;
    `,
    params: [budgetIds],
  };
}

/** Agrupa os itens pelo orçamento, preservando a ordem de chegada. */
export function groupItemsByBudget(items: QuoteItem[]): Map<string, QuoteItem[]> {
  const grouped = new Map<string, QuoteItem[]>();
  for (const item of items) {
    const bucket = grouped.get(item.budgetId);
    if (bucket) bucket.push(item);
    else grouped.set(item.budgetId, [item]);
  }
  return grouped;
}

/** Números do driver podem chegar como string (NUMERIC); normaliza na borda. */
function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function toTextOrNull(value: unknown): string | null {
  return value === null || value === undefined ? null : String(value);
}

function rowToItem(row: Record<string, unknown>): QuoteItem {
  return {
    id: String(row.id),
    budgetId: String(row.budgetId),
    productId: toTextOrNull(row.productId),
    productName: toTextOrNull(row.productName),
    productCode: toTextOrNull(row.productCode),
    brand: toTextOrNull(row.brand),
    quantity: toNumber(row.quantity),
    unitPrice: toNumber(row.unitPrice),
  };
}

function rowToQuote(row: Record<string, unknown>): Omit<QuoteListItem, "items"> {
  return {
    id: String(row.id),
    number: String(row.number ?? ""),
    customerId: toTextOrNull(row.customerId),
    customerName: toTextOrNull(row.customerName),
    customerDocument: toTextOrNull(row.customerDocument),
    customerPhone: toTextOrNull(row.customerPhone),
    customerEmail: toTextOrNull(row.customerEmail),
    customerCity: toTextOrNull(row.customerCity),
    customerUf: toTextOrNull(row.customerUf),
    total: toNumber(row.total),
    status: String(row.status ?? "PENDING"),
    createdAt: String(row.createdAt ?? ""),
    updatedAt: String(row.updatedAt ?? ""),
  };
}

/** Lista os orçamentos do escopo, com itens — uma query para o cabeçalho e uma para os itens. */
export async function listQuotes(
  pool: QuoteQueryable,
  scope: QuoteListScope,
): Promise<QuoteListItem[]> {
  const head = buildQuotesQuery(scope);
  const headRes = await pool.query(head.sql, head.params);
  const quotes = headRes.rows.map(rowToQuote);
  if (quotes.length === 0) return [];

  const itemsQuery = buildItemsQuery(quotes.map((q) => q.id));
  const itemsRes = await pool.query(itemsQuery.sql, itemsQuery.params);
  const grouped = groupItemsByBudget(itemsRes.rows.map(rowToItem));

  return quotes.map((quote) => ({ ...quote, items: grouped.get(quote.id) ?? [] }));
}
