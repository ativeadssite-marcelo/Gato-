import { test } from "node:test";
import assert from "node:assert";
import { assertProductionMigrationsReady, type MigrationResult } from "./migrate";

const appliedMigration: MigrationResult = {
  name: "0001_initial.sql",
  applied: true,
  skipped: false,
};

test("production rejects startup without a configured database", () => {
  assert.throws(
    () => assertProductionMigrationsReady(true, false, [appliedMigration]),
    /Banco de dados obrigatório em produção/,
  );
});

test("production rejects startup when no migration files were loaded", () => {
  assert.throws(
    () => assertProductionMigrationsReady(true, true, []),
    /Nenhuma migração foi encontrada/,
  );
});

test("production rejects startup if any migration failed", () => {
  assert.throws(
    () =>
      assertProductionMigrationsReady(true, true, [
        appliedMigration,
        { name: "0002_add_tenant.sql", applied: false, skipped: false, error: "query failed" },
      ]),
    /0002_add_tenant\.sql/,
  );
});

test("production accepts completed and already-applied migrations", () => {
  assert.doesNotThrow(() =>
    assertProductionMigrationsReady(true, true, [
      appliedMigration,
      { name: "0002_add_tenant.sql", applied: false, skipped: true },
    ]),
  );
});

test("development keeps the existing best-effort migration behavior", () => {
  assert.doesNotThrow(() => assertProductionMigrationsReady(false, false, []));
  assert.doesNotThrow(() =>
    assertProductionMigrationsReady(false, true, [
      { name: "0001_initial.sql", applied: false, skipped: false, error: "query failed" },
    ]),
  );
});
