import { test } from "node:test";
import assert from "node:assert";
import { maskDbConfig } from "./dbConfigStore";

test("maskDbConfig nunca expõe a senha e mascara o host", () => {
  const masked = maskDbConfig({
    host: "db.abcdefgh.supabase.co",
    port: 5432,
    user: "postgres",
    password: "segredo_super_secreto",
    database: "postgres",
  });
  assert.equal(masked.passwordSet, true);
  assert.ok(!("password" in masked), "senha não deve estar presente");
  assert.ok(masked.host.includes("***"), "host deve ser mascarado");
  assert.equal(masked.user, "postgres");
  assert.equal(masked.database, "postgres");
});
