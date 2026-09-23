import { test } from "node:test";
import assert from "node:assert";
import {
  computeProRata,
  isAccessGranted,
  mapAsaasEventToStatus,
} from "./subscriptions";

test("computeProRata calcula diferença proporcional (upgrade)", () => {
  // Pro (389.90) - Starter (189.90) = 200.00; 15/30 dias => R$ 100,00
  assert.equal(computeProRata(189.9, 389.9, 15, 30), 100.0);
});

test("computeProRata retorna 0 em downgrade", () => {
  assert.equal(computeProRata(389.9, 189.9, 15, 30), 0);
});

test("mapAsaasEventToStatus mapeia pagamento confirmado para active", () => {
  assert.equal(mapAsaasEventToStatus("PAYMENT_CONFIRMED"), "active");
  assert.equal(mapAsaasEventToStatus("PAYMENT_RECEIVED"), "active");
});

test("mapAsaasEventToStatus mapeia atraso para past_due", () => {
  assert.equal(mapAsaasEventToStatus("PAYMENT_OVERDUE"), "past_due");
});

test("mapAsaasEventToStatus mapeia cancelamento", () => {
  assert.equal(mapAsaasEventToStatus("SUBSCRIPTION_INACTIVE"), "canceled");
});

test("isAccessGranted permite trial/active/past_due e bloqueia o resto", () => {
  assert.equal(isAccessGranted("trial"), true);
  assert.equal(isAccessGranted("active"), true);
  assert.equal(isAccessGranted("past_due"), true);
  assert.equal(isAccessGranted("suspended"), false);
  assert.equal(isAccessGranted("canceled"), false);
  assert.equal(isAccessGranted("expired"), false);
});
