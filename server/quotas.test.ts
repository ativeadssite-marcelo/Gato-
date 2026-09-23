import { test } from "node:test";
import assert from "node:assert";
import { checkQuota } from "./quotas";

const STARTER_TENANT = "cmtvk1ieq0000ju8c3kg5n85l"; // Pantanal Diesel — Starter (maxCustomers 300)

test("checkQuota permite quando há folga de cota", async () => {
  const r = await checkQuota(STARTER_TENANT, "customers", 1);
  assert.equal(r.allowed, true);
  assert.equal(r.resource, "customers");
  assert.equal(r.limit, 300);
});

test("checkQuota emite warning_90 ao atingir 90% do limite", async () => {
  const r = await checkQuota(STARTER_TENANT, "customers", 270);
  assert.equal(r.allowed, true);
  assert.equal(r.status, "warning_90");
});

test("checkQuota bloqueia (soft_blocked) ao exceder o limite", async () => {
  const r = await checkQuota(STARTER_TENANT, "customers", 301);
  assert.equal(r.allowed, false);
  assert.ok(r.status === "soft_blocked" || r.status === "hard_blocked");
  assert.ok(r.reason, "deve informar o motivo do bloqueio");
});
