-- =========================================================================
-- 0005 — PDV (Caixa) e operacional: 12 tabelas que o código já usava
-- =========================================================================
-- POR QUE ESTA MIGRAÇÃO EXISTE: o código espelhava e consultava 12 tabelas que
-- nenhuma migração criava — o espelho falhava em silêncio (dbMirror engole o
-- erro e só emite um console.warn) e o PDV "salvava" sem persistir nada.
-- Descoberto confrontando as tabelas referenciadas no código com as criadas
-- pelas migrações 0000–0004.
--
--   PDV ......... CashRegister, CashMovement, Receipt, BoletoIssuance
--   Operacional . Category, Warehouse, Product, StockLevel,
--                 Customer, Supplier, Budget, BudgetItem
--
-- DUAS DECISÕES DE DESENHO, ambas deliberadas:
--
-- 1. SEM foreign key em `tenantId`. O isolamento aqui é por coluna + índice
--    (toda query filtra por tenantId), não por FK. Motivo: os tenants do seed
--    vivem em memória (TENANTS_DATA) e NÃO são gravados em "Tenant" — a tabela
--    está vazia mesmo com o SaaS em uso. Uma FK para "Tenant" faria toda
--    escrita de caixa/produto falhar em silêncio para os tenants demo, o que é
--    pior do que não ter a constraint. Quando o seed passar a espelhar os
--    tenants (mirrorTenantUpsert no boot), a FK pode ser adicionada.
--
-- 2. As FKs de domínio (produto→categoria, estoque→produto, etc.) SÃO
--    declaradas: essas linhas nascem na mesma transação da linha pai, então a
--    referência é válida por construção. São exatamente as relações que o
--    validateDb.ts confere (linhas 194-199).
--
-- Convenções da casa (ver 0000): PascalCase entre aspas, ids TEXT gerados pela
-- aplicação, TIMESTAMPTZ, constraints nomeadas, índices `idx_<tabela>_<coluna>`.
-- =========================================================================

-- =========================================================================
-- PARTE 1 — PDV / CAIXA
-- =========================================================================

-- -------------------------------------------------------------------------
-- Turno de caixa. Colunas alinhadas ao INSERT de openCashRegister/closeCash
-- (server/caixa.ts) — os valores monetários saem de `money()` (2 casas).
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "CashRegister" (
  id                TEXT PRIMARY KEY,
  "tenantId"        TEXT NOT NULL,
  "userId"          TEXT NOT NULL DEFAULT '',
  "userName"        TEXT NOT NULL DEFAULT '',
  status            TEXT NOT NULL DEFAULT 'open',   -- 'open' | 'closing' | 'closed'
  "openingAmount"   NUMERIC(14,2) NOT NULL DEFAULT 0,
  "expectedAmount"  NUMERIC(14,2) NOT NULL DEFAULT 0,
  "actualAmount"    NUMERIC(14,2) NOT NULL DEFAULT 0,
  difference        NUMERIC(14,2) NOT NULL DEFAULT 0,
  "openedAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "closedAt"        TIMESTAMPTZ,
  "closedByUserId"  TEXT,
  "closedByUserName" TEXT,
  notes             TEXT,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- O "caixa aberto do tenant" é a consulta mais quente do módulo (toda
-- movimentação procura um). Índice parcial resolve sem varrer o histórico.
CREATE INDEX IF NOT EXISTS "idx_cashregister_tenantId" ON "CashRegister" ("tenantId");
CREATE INDEX IF NOT EXISTS "idx_cashregister_tenant_status" ON "CashRegister" ("tenantId", status);
CREATE INDEX IF NOT EXISTS "idx_cashregister_open"
  ON "CashRegister" ("tenantId") WHERE status = 'open';

-- -------------------------------------------------------------------------
-- Movimentação do turno (abertura, venda, sangria, suprimento, devolução,
-- fechamento). `cashRegisterId` é o vínculo com o turno; `referenceId` aponta
-- para a origem (venda, boleto, orçamento) e é opcional.
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "CashMovement" (
  id               TEXT PRIMARY KEY,
  "tenantId"       TEXT NOT NULL,
  "cashRegisterId" TEXT NOT NULL,
  type             TEXT NOT NULL,   -- opening | sale_cash | sale_card | sale_pix | sale_boleto
                                    -- | sale_vale | refund_cash | refund_card | withdrawal
                                    -- | deposit | closing | adjustment
  "paymentMethod"  TEXT NOT NULL,   -- dinheiro | cartao_credito | ... | outros
  amount           NUMERIC(14,2) NOT NULL DEFAULT 0,
  description      TEXT NOT NULL DEFAULT '',
  "referenceId"    TEXT,
  "referenceType"  TEXT,            -- sale | budget | boleto | refund | withdrawal | deposit | adjustment
  "customerId"     TEXT,
  "customerName"   TEXT,
  "userId"         TEXT NOT NULL DEFAULT '',
  "userName"       TEXT NOT NULL DEFAULT '',
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_cashmovement_tenantId" ON "CashMovement" ("tenantId");
CREATE INDEX IF NOT EXISTS "idx_cashmovement_register" ON "CashMovement" ("cashRegisterId");
CREATE INDEX IF NOT EXISTS "idx_cashmovement_created" ON "CashMovement" ("cashRegisterId", "createdAt" DESC);

-- -------------------------------------------------------------------------
-- Recibo / nota fiscal / nota de crédito emitidos no balcão.
--
-- `items` é JSONB e NÃO estava no espelho antigo: os itens da venda (o detalhe
-- fiscal — NCM, CFOP, alíquotas) eram perdidos na persistência. A coluna entra
-- aqui e o espelho em server/caixa.ts passa a gravá-la.
-- `paymentDetails` e `fiscalData` já eram gravados como JSON.stringify.
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Receipt" (
  id                TEXT PRIMARY KEY,
  "tenantId"        TEXT NOT NULL,
  "cashRegisterId"  TEXT,
  "movementId"      TEXT,
  number            TEXT NOT NULL DEFAULT '',
  type              TEXT NOT NULL DEFAULT 'receipt',  -- receipt | invoice | credit_note
  status            TEXT NOT NULL DEFAULT 'issued',   -- issued | cancelled
  "customerId"      TEXT,
  "customerName"    TEXT,
  "customerDocument" TEXT,
  items             JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal          NUMERIC(14,2) NOT NULL DEFAULT 0,
  discount          NUMERIC(14,2) NOT NULL DEFAULT 0,
  total             NUMERIC(14,2) NOT NULL DEFAULT 0,
  "paymentMethod"   TEXT NOT NULL DEFAULT 'outros',
  "paymentDetails"  JSONB,
  "fiscalData"      JSONB,
  "issuedAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "cancelledAt"     TIMESTAMPTZ,
  "cancelledBy"     TEXT,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_receipt_tenantId" ON "Receipt" ("tenantId");
CREATE INDEX IF NOT EXISTS "idx_receipt_register" ON "Receipt" ("cashRegisterId");
-- Índice (não UNIQUE) de propósito: o número é sequencial por tenant e gerado
-- em memória; uma constraint única transformaria uma corrida num erro de
-- espelho silencioso. Fica como índice de consulta.
CREATE INDEX IF NOT EXISTS "idx_receipt_number" ON "Receipt" ("tenantId", number);
-- Recibos pendentes de autorização fiscal (getCaixaSummary conta esses).
CREATE INDEX IF NOT EXISTS "idx_receipt_fiscal_pending"
  ON "Receipt" ("tenantId") WHERE (("fiscalData" ->> 'status') = 'pending');

-- -------------------------------------------------------------------------
-- Boleto emitido no caixa. `dueDate` é DATE (YYYY-MM-DD, como o tipo
-- BoletoIssuance define) e o cálculo de atraso compara com CURRENT_DATE.
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "BoletoIssuance" (
  id                TEXT PRIMARY KEY,
  "tenantId"        TEXT NOT NULL,
  "cashRegisterId"  TEXT,
  "customerId"      TEXT NOT NULL DEFAULT '',
  "customerName"    TEXT NOT NULL DEFAULT '',
  "customerDocument" TEXT NOT NULL DEFAULT '',
  "customerEmail"   TEXT,
  "customerPhone"   TEXT,
  amount            NUMERIC(14,2) NOT NULL DEFAULT 0,
  "dueDate"         DATE,
  description       TEXT NOT NULL DEFAULT '',
  "ourNumber"       TEXT NOT NULL DEFAULT '',
  barcode           TEXT NOT NULL DEFAULT '',
  "qrCode"          TEXT,
  status            TEXT NOT NULL DEFAULT 'issued',  -- draft | issued | paid | overdue | cancelled
  gateway           TEXT NOT NULL DEFAULT 'manual',  -- asaas | manual
  "gatewayId"       TEXT,
  "paymentLink"     TEXT,
  "paidAt"          TIMESTAMPTZ,
  "paidAmount"      NUMERIC(14,2),
  "paymentMethod"   TEXT,
  "issuedAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_boleto_tenantId" ON "BoletoIssuance" ("tenantId");
-- Boletos em aberto (getOpenBoletos): filtra por status e ordena por vencimento.
CREATE INDEX IF NOT EXISTS "idx_boleto_open" ON "BoletoIssuance" ("tenantId", "dueDate")
  WHERE status IN ('issued', 'overdue');

-- =========================================================================
-- PARTE 2 — OPERACIONAL (catálogo, estoque, clientes, orçamento)
-- =========================================================================

-- -------------------------------------------------------------------------
-- Categoria de produto. `tenantId` é NULLABLE de propósito: a base de
-- categorias pode ser global (compartilhada) ou do contratante. Hoje o código
-- só lê (server.ts:357) e faz LEFT JOIN por id no catálogo.
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Category" (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  "tenantId"   TEXT,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_category_tenantId" ON "Category" ("tenantId");
CREATE INDEX IF NOT EXISTS "idx_category_name" ON "Category" (LOWER(name));

-- -------------------------------------------------------------------------
-- Depósito / centro de distribuição. NÃO há rota de cadastro no código — as
-- linhas vêm de fora (painel do banco). Sem um depósito, o cadastro de produto
-- com estoque inicial responde 409 (server.ts:370-376).
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Warehouse" (
  id           TEXT PRIMARY KEY,
  code         TEXT NOT NULL DEFAULT '',
  name         TEXT NOT NULL DEFAULT '',
  address      TEXT,
  "tenantId"   TEXT NOT NULL,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_warehouse_tenantId" ON "Warehouse" ("tenantId", code);

-- -------------------------------------------------------------------------
-- Produto. `stock` e `reserved` NÃO são colunas: o catálogo os calcula por
-- SUM sobre StockLevel (server.ts:274-275). Duplicar aqui criaria divergência.
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Product" (
  id            TEXT PRIMARY KEY,
  sku           TEXT NOT NULL DEFAULT '',
  name          TEXT NOT NULL DEFAULT '',
  barcode       TEXT,
  description   TEXT,
  brand         TEXT,
  "costPrice"   NUMERIC(14,2) NOT NULL DEFAULT 0,
  "salePrice"   NUMERIC(14,2) NOT NULL DEFAULT 0,
  "minStock"    INTEGER NOT NULL DEFAULT 0,
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  "tenantId"    TEXT NOT NULL,
  "categoryId"  TEXT REFERENCES "Category"(id) ON DELETE SET NULL,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_product_tenantId" ON "Product" ("tenantId");
-- O cadastro trata SKU como único por empresa (validateDb.ts:279). Parcial
-- porque o código aceita SKU vazio (`sku` tem DEFAULT '') — um UNIQUE cheio
-- impediria o segundo produto sem SKU da mesma empresa.
CREATE UNIQUE INDEX IF NOT EXISTS "idx_product_tenant_sku_unique"
  ON "Product" ("tenantId", sku) WHERE sku <> '';

-- -------------------------------------------------------------------------
-- Saldo de estoque por produto x depósito. Tabela de movimentos agregada: a
-- quantidade é o saldo corrente (o código soma por produto no catálogo).
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "StockLevel" (
  id            TEXT PRIMARY KEY,
  "productId"   TEXT NOT NULL REFERENCES "Product"(id) ON DELETE CASCADE,
  "warehouseId" TEXT NOT NULL REFERENCES "Warehouse"(id) ON DELETE CASCADE,
  quantity      INTEGER NOT NULL DEFAULT 0,
  reserved      INTEGER NOT NULL DEFAULT 0,
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_stocklevel_product" ON "StockLevel" ("productId");
CREATE INDEX IF NOT EXISTS "idx_stocklevel_warehouse" ON "StockLevel" ("warehouseId");

-- -------------------------------------------------------------------------
-- Cliente do contratante. `type` e `personType` seguem o vocabulário do
-- cadastro (pessoa física/jurídica); mantidos TEXT como no resto do schema.
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Customer" (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL DEFAULT '',
  document      TEXT NOT NULL DEFAULT '',
  phone         TEXT,
  email         TEXT,
  ie            TEXT,
  type          TEXT,
  address       TEXT,
  city          TEXT,
  state         TEXT,
  "personType"  TEXT,
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  "tenantId"    TEXT NOT NULL,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_customer_tenantId" ON "Customer" ("tenantId");
-- Mesmo raciocínio do SKU: documento único por empresa, mas o código grava ''
-- quando o cliente não tem documento, então a unicidade é parcial.
CREATE UNIQUE INDEX IF NOT EXISTS "idx_customer_tenant_doc_unique"
  ON "Customer" ("tenantId", document) WHERE document <> '';
CREATE INDEX IF NOT EXISTS "idx_customer_name" ON "Customer" ("tenantId", LOWER(name));

-- -------------------------------------------------------------------------
-- Fornecedor. `address` é texto livre (o cadastro grava string, não JSON).
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Supplier" (
  id           TEXT PRIMARY KEY,
  "tenantId"   TEXT NOT NULL,
  name         TEXT NOT NULL DEFAULT '',
  cnpj         TEXT,
  contact      TEXT,
  phone        TEXT,
  email        TEXT,
  address      TEXT,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_supplier_tenantId" ON "Supplier" ("tenantId");

-- -------------------------------------------------------------------------
-- Orçamento e seus itens. `status` é validado na rota (PENDING/APPROVED...).
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Budget" (
  id            TEXT PRIMARY KEY,
  number        TEXT NOT NULL DEFAULT '',
  "customerId"  TEXT REFERENCES "Customer"(id) ON DELETE SET NULL,
  total         NUMERIC(14,2) NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'PENDING',
  "tenantId"    TEXT NOT NULL,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_budget_tenantId" ON "Budget" ("tenantId");
CREATE INDEX IF NOT EXISTS "idx_budget_customer" ON "Budget" ("customerId");

CREATE TABLE IF NOT EXISTS "BudgetItem" (
  id            TEXT PRIMARY KEY,
  "budgetId"    TEXT NOT NULL REFERENCES "Budget"(id) ON DELETE CASCADE,
  "productId"   TEXT REFERENCES "Product"(id) ON DELETE SET NULL,
  quantity      NUMERIC(14,3) NOT NULL DEFAULT 0,
  "unitPrice"   NUMERIC(14,2) NOT NULL DEFAULT 0,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_budgetitem_budget" ON "BudgetItem" ("budgetId");
CREATE INDEX IF NOT EXISTS "idx_budgetitem_product" ON "BudgetItem" ("productId");
