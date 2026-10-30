// =========================================================================
// API v1 — INTEGRAÇÃO DO TENANT (autenticada por chave de API)
// =========================================================================
// Superfície DELIBERADAMENTE estreita: só produtos, clientes e orçamentos. Uma
// rota nova aqui precisa declarar a capacidade que exige, e o tenant vem SEMPRE de
// `req.apiAuth` — nunca do corpo nem da query string, para que a chave não alcance
// outro contratante nem por engano.
//
// Não usa `req.auth` nem a matriz de papéis: `requireApiKey` resolve a identidade,
// então o alcance da chave é exatamente o que está declarado neste arquivo.
// =========================================================================

import crypto from "node:crypto";
import { Router } from "express";
import { DB_NOT_CONFIGURED_MESSAGE, getDbPool, isDatabaseConfigured } from "./db";
import { apiActorFor, recordAudit, requireApiKey } from "./auth";
import { checkQuota, incrementUsage } from "./quotas";
import type { TenantPermissionKey } from "../src/types/rbac";

export const v1Router = Router();

const newId = (prefix: string) => `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;

/** Teto de linhas por listagem: protege a resposta e o banco de uma chamada só. */
const MAX_PAGE_SIZE = 200;
const pageSizeOf = (raw: unknown): number => {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 50;
  return Math.min(MAX_PAGE_SIZE, Math.floor(n));
};

/** Ator só para a trilha: a chave não tem usuário, mas o log precisa de um nome. */
function apiActor(req: any) {
  const auth = req.apiAuth!;
  return apiActorFor({ id: auth.credentialId, tenantId: auth.tenantId, label: auth.label });
}

/** Guarda comum: banco configurado + tenant resolvido pela chave. */
function requireDb(req: any, res: any): { tenantId: string } | null {
  if (!req.apiAuth) {
    res.status(401).json({ success: false, error: "Chave de API ausente.", code: "API_KEY_REQUIRED" });
    return null;
  }
  if (!isDatabaseConfigured()) {
    res.status(503).json({ success: false, error: DB_NOT_CONFIGURED_MESSAGE, code: "DB_NOT_CONFIGURED" });
    return null;
  }
  return { tenantId: req.apiAuth.tenantId as string };
}

const get = (cap: TenantPermissionKey) => requireApiKey(cap);
/** Escrita exige a mesma capacidade: ler e escrever o mesmo domínio. */
const write = (cap: TenantPermissionKey) => requireApiKey(cap);

function fail(res: any, err: any, label: string) {
  console.error(`[GATO API v1] ${label}:`, err?.message || err);
  return res.status(500).json({ success: false, error: "Falha segura ao processar a requisição." });
}

// -------------------------------------------------------------------------
// Índice (ajuda o integrador a descobrir a superfície)
// -------------------------------------------------------------------------
v1Router.get("/", (_req, res) => {
  res.json({
    success: true,
    api: "GATO SaaS API",
    version: "v1",
    auth: "Envie a chave no cabeçalho x-api-key.",
    resources: {
      products: ["GET /api/v1/products", "POST /api/v1/products", "GET /api/v1/products/:id", "PUT /api/v1/products/:id"],
      customers: ["GET /api/v1/customers", "POST /api/v1/customers", "GET /api/v1/customers/:id", "PUT /api/v1/customers/:id"],
      quotes: ["GET /api/v1/quotes", "POST /api/v1/quotes", "GET /api/v1/quotes/:id"],
    },
    limits: "Cada chamada consome a cota diária do plano. Veja os cabeçalhos X-RateLimit-*.",
  });
});

// -------------------------------------------------------------------------
// PRODUTOS
// -------------------------------------------------------------------------
v1Router.get("/products", get("item_register"), async (req, res) => {
  const guard = requireDb(req, res);
  if (!guard) return;
  try {
    const limit = pageSizeOf(req.query.limit);
    const result = await getDbPool().query(
      `SELECT p.id, p.sku, p.name, p.brand, p."costPrice", p."salePrice", p."minStock", p.active,
              c.name AS category,
              COALESCE(SUM(sl.quantity), 0)::int AS stock
       FROM "Product" p
       LEFT JOIN "StockLevel" sl ON sl."productId" = p.id
       LEFT JOIN "Category" c ON c.id = p."categoryId"
       WHERE p."tenantId" = $1
       GROUP BY p.id, c.name
       ORDER BY p.sku ASC
       LIMIT $2;`,
      [guard.tenantId, limit],
    );
    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (err) {
    fail(res, err, "GET /products");
  }
});

v1Router.get("/products/:id", get("item_register"), async (req, res) => {
  const guard = requireDb(req, res);
  if (!guard) return;
  try {
    const result = await getDbPool().query(
      `SELECT p.id, p.sku, p.name, p.brand, p."costPrice", p."salePrice", p."minStock", p.active,
              c.name AS category
       FROM "Product" p
       LEFT JOIN "Category" c ON c.id = p."categoryId"
       WHERE p."tenantId" = $1 AND (p.id = $2 OR p.sku = $2)
       LIMIT 1;`,
      [guard.tenantId, req.params.id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Produto não encontrado nesta empresa." });
    }
    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    return fail(res, err, "GET /products/:id");
  }
});

v1Router.post("/products", write("item_register"), async (req, res) => {
  const guard = requireDb(req, res);
  if (!guard) return;
  const { sku, name, brand, costPrice, salePrice, minStock, categoryId } = req.body || {};

  if (typeof sku !== "string" || !sku.trim() || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ success: false, error: "Campos obrigatórios: sku e name." });
  }

  const client = await getDbPool().connect();
  try {
    const cleanSku = sku.trim().slice(0, 60);

    const duplicate = await client.query(
      'SELECT id FROM "Product" WHERE sku = $1 AND "tenantId" = $2 LIMIT 1;',
      [cleanSku, guard.tenantId],
    );
    if (duplicate.rows.length > 0) {
      return res.status(409).json({ success: false, error: `Já existe um produto com o SKU ${cleanSku}.` });
    }

    // Mesma cota da tela: a integração não pode virar atalho para furar o plano.
    const quota = await checkQuota(guard.tenantId, "items", 1);
    if (!quota.allowed) {
      return res.status(402).json({
        success: false,
        error: quota.reason,
        code: "QUOTA_EXCEEDED",
        quota: { resource: quota.resource, current: quota.current, limit: quota.limit },
        suggestion: "upgrade",
      });
    }

    const productId = newId("prd");
    await client.query(
      `INSERT INTO "Product" (id, sku, name, brand, "costPrice", "salePrice", "minStock", active, "tenantId", "categoryId", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8, $9, NOW(), NOW());`,
      [
        productId,
        cleanSku,
        name.trim().slice(0, 200),
        typeof brand === "string" ? brand.trim().slice(0, 100) : null,
        Number.isFinite(Number(costPrice)) ? Number(costPrice) : 0,
        Number.isFinite(Number(salePrice)) ? Number(salePrice) : 0,
        Number.isFinite(Number(minStock)) ? Math.max(0, Math.floor(Number(minStock))) : 0,
        guard.tenantId,
        typeof categoryId === "string" && categoryId.trim() ? categoryId.trim() : null,
      ],
    );

    await incrementUsage(guard.tenantId, "items", 1);
    recordAudit(req, apiActor(req), "CREATE_PRODUCT", "company_data", productId, "success", {
      targetTenantId: guard.tenantId,
      details: `Produto ${cleanSku} criado via API v1 (chave ${req.apiAuth!.label}).`,
    });

    return res.status(201).json({ success: true, id: productId, sku: cleanSku });
  } catch (err) {
    return fail(res, err, "POST /products");
  } finally {
    client.release();
  }
});

v1Router.put("/products/:id", write("item_register"), async (req, res) => {
  const guard = requireDb(req, res);
  if (!guard) return;
  const { name, brand, costPrice, salePrice, minStock, active } = req.body || {};
  try {
    const result = await getDbPool().query(
      `UPDATE "Product"
       SET name = COALESCE($3, name),
           brand = COALESCE($4, brand),
           "costPrice" = COALESCE($5, "costPrice"),
           "salePrice" = COALESCE($6, "salePrice"),
           "minStock" = COALESCE($7, "minStock"),
           active = COALESCE($8, active),
           "updatedAt" = NOW()
       WHERE "tenantId" = $1 AND (id = $2 OR sku = $2)
       RETURNING id, sku, name, brand, "costPrice", "salePrice", "minStock", active;`,
      [
        guard.tenantId,
        req.params.id,
        typeof name === "string" && name.trim() ? name.trim().slice(0, 200) : null,
        typeof brand === "string" ? brand.trim().slice(0, 100) : null,
        Number.isFinite(Number(costPrice)) && costPrice !== undefined ? Number(costPrice) : null,
        Number.isFinite(Number(salePrice)) && salePrice !== undefined ? Number(salePrice) : null,
        Number.isFinite(Number(minStock)) && minStock !== undefined ? Math.max(0, Math.floor(Number(minStock))) : null,
        typeof active === "boolean" ? active : null,
      ],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Produto não encontrado nesta empresa." });
    }
    recordAudit(req, apiActor(req), "UPDATE_PRODUCT", "company_data", String(result.rows[0].id), "success", {
      targetTenantId: guard.tenantId,
      details: `Produto ${result.rows[0].sku} alterado via API v1.`,
    });
    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    return fail(res, err, "PUT /products/:id");
  }
});

// -------------------------------------------------------------------------
// CLIENTES
// -------------------------------------------------------------------------
v1Router.get("/customers", get("customer_register"), async (req, res) => {
  const guard = requireDb(req, res);
  if (!guard) return;
  try {
    const limit = pageSizeOf(req.query.limit);
    const result = await getDbPool().query(
      `SELECT id, name, document, phone, email, ie, type, address, city, state, "personType", active, "createdAt"
       FROM "Customer"
       WHERE "tenantId" = $1
       ORDER BY name ASC
       LIMIT $2;`,
      [guard.tenantId, limit],
    );
    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (err) {
    fail(res, err, "GET /customers");
  }
});

v1Router.get("/customers/:id", get("customer_register"), async (req, res) => {
  const guard = requireDb(req, res);
  if (!guard) return;
  try {
    const result = await getDbPool().query(
      `SELECT id, name, document, phone, email, ie, type, address, city, state, "personType", active, "createdAt"
       FROM "Customer" WHERE "tenantId" = $1 AND id = $2 LIMIT 1;`,
      [guard.tenantId, req.params.id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Cliente não encontrado nesta empresa." });
    }
    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    return fail(res, err, "GET /customers/:id");
  }
});

v1Router.post("/customers", write("customer_register"), async (req, res) => {
  const guard = requireDb(req, res);
  if (!guard) return;
  const { name, document, phone, email, ie, type, address, city, state, personType } = req.body || {};

  if (typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ success: false, error: "Campo obrigatório: name." });
  }

  const client = await getDbPool().connect();
  try {
    const cleanDocument = typeof document === "string" ? document.replace(/\D/g, "").slice(0, 20) : "";

    if (cleanDocument) {
      const duplicate = await client.query(
        'SELECT id FROM "Customer" WHERE document = $1 AND "tenantId" = $2 LIMIT 1;',
        [cleanDocument, guard.tenantId],
      );
      if (duplicate.rows.length > 0) {
        return res.status(409).json({ success: false, error: "Já existe um cliente com este documento." });
      }
    }

    const quota = await checkQuota(guard.tenantId, "customers", 1);
    if (!quota.allowed) {
      return res.status(402).json({
        success: false,
        error: quota.reason,
        code: "QUOTA_EXCEEDED",
        quota: { resource: quota.resource, current: quota.current, limit: quota.limit },
        suggestion: "upgrade",
      });
    }

    const customerId = newId("cus");
    await client.query(
      `INSERT INTO "Customer" (id, name, document, phone, email, ie, type, address, city, state, "personType", active, "tenantId", "createdAt", "updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,true,$12,NOW(),NOW());`,
      [
        customerId,
        name.trim().slice(0, 200),
        cleanDocument || null,
        typeof phone === "string" ? phone.trim().slice(0, 30) : null,
        typeof email === "string" ? email.trim().slice(0, 160) : null,
        typeof ie === "string" ? ie.trim().slice(0, 30) : null,
        typeof type === "string" ? type.trim().slice(0, 30) : null,
        typeof address === "string" ? address.trim().slice(0, 200) : null,
        typeof city === "string" ? city.trim().slice(0, 80) : null,
        typeof state === "string" ? state.trim().slice(0, 2).toUpperCase() : null,
        typeof personType === "string" ? personType.trim().slice(0, 2).toUpperCase() : "PF",
        guard.tenantId,
      ],
    );

    await incrementUsage(guard.tenantId, "customers", 1);
    recordAudit(req, apiActor(req), "CREATE_CUSTOMER", "customers_employees", customerId, "success", {
      targetTenantId: guard.tenantId,
      details: `Cliente criado via API v1 (chave ${req.apiAuth!.label}).`,
    });

    return res.status(201).json({ success: true, id: customerId });
  } catch (err) {
    return fail(res, err, "POST /customers");
  } finally {
    client.release();
  }
});

v1Router.put("/customers/:id", write("customer_register"), async (req, res) => {
  const guard = requireDb(req, res);
  if (!guard) return;
  const { name, phone, email, ie, address, city, state, active } = req.body || {};
  try {
    const result = await getDbPool().query(
      `UPDATE "Customer"
       SET name = COALESCE($3, name),
           phone = COALESCE($4, phone),
           email = COALESCE($5, email),
           ie = COALESCE($6, ie),
           address = COALESCE($7, address),
           city = COALESCE($8, city),
           state = COALESCE($9, state),
           active = COALESCE($10, active),
           "updatedAt" = NOW()
       WHERE "tenantId" = $1 AND id = $2
       RETURNING id, name, phone, email, ie, address, city, state, active;`,
      [
        guard.tenantId,
        req.params.id,
        typeof name === "string" && name.trim() ? name.trim().slice(0, 200) : null,
        typeof phone === "string" ? phone.trim().slice(0, 30) : null,
        typeof email === "string" ? email.trim().slice(0, 160) : null,
        typeof ie === "string" ? ie.trim().slice(0, 30) : null,
        typeof address === "string" ? address.trim().slice(0, 200) : null,
        typeof city === "string" ? city.trim().slice(0, 80) : null,
        typeof state === "string" ? state.trim().slice(0, 2).toUpperCase() : null,
        typeof active === "boolean" ? active : null,
      ],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Cliente não encontrado nesta empresa." });
    }
    recordAudit(req, apiActor(req), "UPDATE_CUSTOMER", "customers_employees", String(result.rows[0].id), "success", {
      targetTenantId: guard.tenantId,
      details: `Cliente alterado via API v1.`,
    });
    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    return fail(res, err, "PUT /customers/:id");
  }
});

// -------------------------------------------------------------------------
// ORÇAMENTOS (tabela "Budget" / DAV)
// -------------------------------------------------------------------------
v1Router.get("/quotes", get("sales"), async (req, res) => {
  const guard = requireDb(req, res);
  if (!guard) return;
  try {
    const limit = pageSizeOf(req.query.limit);
    const result = await getDbPool().query(
      `SELECT b.id, b.number, b.status, b.total, b."customerId", c.name AS "customerName", b."createdAt"
       FROM "Budget" b
       LEFT JOIN "Customer" c ON c.id = b."customerId"
       WHERE b."tenantId" = $1
       ORDER BY b."createdAt" DESC
       LIMIT $2;`,
      [guard.tenantId, limit],
    );
    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (err) {
    fail(res, err, "GET /quotes");
  }
});

v1Router.get("/quotes/:id", get("sales"), async (req, res) => {
  const guard = requireDb(req, res);
  if (!guard) return;
  try {
    const budget = await getDbPool().query(
      `SELECT b.id, b.number, b.status, b.total, b."customerId", c.name AS "customerName", b."createdAt"
       FROM "Budget" b
       LEFT JOIN "Customer" c ON c.id = b."customerId"
       WHERE b."tenantId" = $1 AND (b.id = $2 OR b.number = $2)
       LIMIT 1;`,
      [guard.tenantId, req.params.id],
    );
    if (budget.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Orçamento não encontrado nesta empresa." });
    }
    const items = await getDbPool().query(
      `SELECT id, "productId", quantity, "unitPrice" FROM "BudgetItem" WHERE "budgetId" = $1;`,
      [budget.rows[0].id],
    );
    return res.json({ success: true, data: { ...budget.rows[0], items: items.rows } });
  } catch (err) {
    return fail(res, err, "GET /quotes/:id");
  }
});

/** Teto de itens por orçamento — mesmo limite do handler da aplicação. */
const MAX_QUOTE_ITEMS = 200;

v1Router.post("/quotes", write("sales"), async (req, res) => {
  const guard = requireDb(req, res);
  if (!guard) return;
  const { customerId, items, status } = req.body || {};

  if (typeof customerId !== "string" || !customerId.trim()) {
    return res.status(400).json({ success: false, error: "Campo obrigatório: customerId." });
  }
  if (items !== undefined && !Array.isArray(items)) {
    return res.status(400).json({ success: false, error: "items deve ser uma lista." });
  }
  const boundedItems = Array.isArray(items) ? items.slice(0, MAX_QUOTE_ITEMS) : [];

  const client = await getDbPool().connect();
  try {
    // O cliente precisa ser do MESMO tenant: a chave não alcança cadastro alheio.
    const customer = await client.query(
      'SELECT id FROM "Customer" WHERE id = $1 AND "tenantId" = $2 LIMIT 1;',
      [customerId.trim(), guard.tenantId],
    );
    if (customer.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Cliente não encontrado nesta empresa.",
        code: "CUSTOMER_NOT_FOUND",
      });
    }

    const total = boundedItems.reduce((sum: number, it: any) => {
      const qty = Number.isFinite(Number(it?.quantity)) && Number(it.quantity) > 0 ? Number(it.quantity) : 1;
      const price = Number.isFinite(Number(it?.unitPrice)) && Number(it.unitPrice) >= 0 ? Number(it.unitPrice) : 0;
      return sum + qty * price;
    }, 0);

    const budgetId = newId("bdg");
    const number = `API-${Date.now().toString().slice(-8)}`;

    await client.query("BEGIN");
    await client.query(
      `INSERT INTO "Budget" (id, number, "customerId", total, status, "tenantId", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW());`,
      [budgetId, number, customer.rows[0].id, Number(total.toFixed(2)), status || "PENDING", guard.tenantId],
    );

    for (const it of boundedItems) {
      const qty = Number.isFinite(Number(it?.quantity)) && Number(it.quantity) > 0 ? Number(it.quantity) : 1;
      const price = Number.isFinite(Number(it?.unitPrice)) && Number(it.unitPrice) >= 0 ? Number(it.unitPrice) : 0;
      await client.query(
        `INSERT INTO "BudgetItem" (id, "budgetId", "productId", quantity, "unitPrice", "createdAt")
         VALUES ($1, $2, $3, $4, $5, NOW());`,
        [newId("bi"), budgetId, typeof it?.productId === "string" ? it.productId : null, qty, price],
      );
    }
    await client.query("COMMIT");

    recordAudit(req, apiActor(req), "CREATE_QUOTE", "customers_employees", budgetId, "success", {
      targetTenantId: guard.tenantId,
      details: `Orçamento ${number} criado via API v1 com ${boundedItems.length} item(ns).`,
    });

    return res.status(201).json({ success: true, id: budgetId, number, total: Number(total.toFixed(2)) });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    return fail(res, err, "POST /quotes");
  } finally {
    client.release();
  }
});
