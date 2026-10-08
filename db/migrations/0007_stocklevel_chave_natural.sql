-- =========================================================================
-- 0007 — Chave natural do saldo de estoque (Product × Warehouse)
-- =========================================================================
-- POR QUE ESTA MIGRATION EXISTE: a rota `POST /api/db/sync-catalog` grava o
-- saldo com
--
--   INSERT INTO "StockLevel" (...) VALUES (...)
--   ON CONFLICT ("productId", "warehouseId") DO UPDATE SET quantity = ...
--
-- mas a 0005 criou apenas índices SIMPLES nessas colunas — nunca a restrição
-- única. Sem ela o Postgres responde:
--
--   there is no unique or exclusion constraint matching the ON CONFLICT
--   specification
--
-- e a rota devolve 500. Na prática: sincronizar o catálogo (o botão das
-- Configurações e a entrada de nota por XML) FALHA sempre que precisa
-- ATUALIZAR o saldo de um produto já cadastrado. Produto novo entra (o INSERT
-- simples funciona); produto existente, não.
--
-- A duplicata é consolidada antes de criar a chave: rodadas antigas da rota
-- podiam inserir linhas repetidas para o mesmo par (o próprio código registra
-- isso no comentário da rota — "antes cada sincronização criava uma nova linha
-- e inflava o estoque exibido"). Fica a linha mais recente de cada par, que é
-- a que a rota tentou gravar por último.
-- =========================================================================

DELETE FROM "StockLevel" a
 USING "StockLevel" b
 WHERE a."productId" = b."productId"
   AND a."warehouseId" = b."warehouseId"
   AND (
     a."updatedAt" < b."updatedAt"
     OR (a."updatedAt" = b."updatedAt" AND a.ctid < b.ctid)
   );

CREATE UNIQUE INDEX IF NOT EXISTS "uq_stocklevel_product_warehouse"
  ON "StockLevel" ("productId", "warehouseId");
