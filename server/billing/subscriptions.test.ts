import { test } from "node:test";
import assert from "node:assert";
import {
  computeProRata,
  evaluateSubscriptionAccess,
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

test("evaluateSubscriptionAccess libera escrita para status com acesso concedido", () => {
  for (const status of ["trial", "active", "past_due"] as const) {
    assert.equal(evaluateSubscriptionAccess(status, "POST").kind, "allowed");
    assert.equal(evaluateSubscriptionAccess(status, "GET").kind, "allowed");
  }
});

test("evaluateSubscriptionAccess: expired vira somente leitura (402 em escrita)", () => {
  const read = evaluateSubscriptionAccess("expired", "GET");
  assert.equal(read.kind, "allowed");

  const write = evaluateSubscriptionAccess("expired", "POST");
  assert.equal(write.kind, "blocked");
  if (write.kind === "blocked") {
    assert.equal(write.status, 402);
    assert.equal(write.code, "SUBSCRIPTION_EXPIRED");
    assert.equal(write.suggestion, "upgrade");
  }
});

test("evaluateSubscriptionAccess: suspended bloqueia tudo com 403", () => {
  for (const method of ["GET", "POST", "PUT", "DELETE"]) {
    const decision = evaluateSubscriptionAccess("suspended", method);
    assert.equal(decision.kind, "blocked");
    if (decision.kind === "blocked") {
      assert.equal(decision.status, 403);
      assert.equal(decision.code, "SUBSCRIPTION_SUSPENDED");
      assert.equal(decision.suggestion, "reactivate");
    }
  }
});

test("evaluateSubscriptionAccess: canceled bloqueia tudo com 403", () => {
  const decision = evaluateSubscriptionAccess("canceled", "PATCH");
  assert.equal(decision.kind, "blocked");
  if (decision.kind === "blocked") {
    assert.equal(decision.status, 403);
    assert.equal(decision.code, "SUBSCRIPTION_CANCELED");
    assert.equal(decision.suggestion, "reactivate");
  }
});
