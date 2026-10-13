import { test } from "node:test";
import assert from "node:assert";
import {
  applyGatewayPaymentEvent,
  computeProRata,
  convertTrialToPaid,
  ensureTrialSubscription,
  evaluateSubscriptionAccess,
  isAccessGranted,
  mapAsaasEventToStatus,
} from "./subscriptions";
import { getSubscriptionByTenant } from "../store";

test("convertTrialToPaid não ativa nem converte sem gateway configurado", async () => {
  const tenantId = "t_billing_sem_gateway";
  const previousApiKey = process.env.ASAAS_API_KEY;
  delete process.env.ASAAS_API_KEY;

  try {
    const trial = await ensureTrialSubscription(tenantId);
    await assert.rejects(
      () =>
        convertTrialToPaid({
          tenantId,
          tenantName: "Empresa de Teste",
          contactEmail: "billing-test@example.com",
        }),
      /sem o gateway Asaas configurado/,
    );
    assert.equal((await getSubscriptionByTenant(tenantId))?.status, "trial");
    assert.equal(trial.status, "trial");
  } finally {
    if (previousApiKey === undefined) delete process.env.ASAAS_API_KEY;
    else process.env.ASAAS_API_KEY = previousApiKey;
  }
});

test("convertTrialToPaid mantém trial até a confirmação e usa o link real do Asaas", async () => {
  const tenantId = "t_billing_pagamento_pendente";
  const previousApiKey = process.env.ASAAS_API_KEY;
  const previousEnv = process.env.ASAAS_ENV;
  const previousFetch = globalThis.fetch;
  process.env.ASAAS_API_KEY = "test-api-key-for-billing";
  process.env.ASAAS_ENV = "sandbox";
  await ensureTrialSubscription(tenantId);

  globalThis.fetch = async (input) => {
    const url = String(input);
    const body = url.endsWith("/customers")
      ? { id: "cus_billing_test" }
      : url.endsWith("/subscriptions")
        ? { id: "sub_billing_test", invoiceId: "pay_billing_test" }
        : { invoiceUrl: "https://sandbox.asaas.com/i/test-payment" };
    return new Response(JSON.stringify(body), { status: 200 });
  };

  try {
    const result = await convertTrialToPaid({
      tenantId,
      tenantName: "Empresa de Teste",
      contactEmail: "billing-test@example.com",
    });
    assert.equal(result.subscription.status, "trial");
    assert.equal(result.paymentLink, "https://sandbox.asaas.com/i/test-payment");
    assert.equal(result.pendingExternalSetup, false);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousApiKey === undefined) delete process.env.ASAAS_API_KEY;
    else process.env.ASAAS_API_KEY = previousApiKey;
    if (previousEnv === undefined) delete process.env.ASAAS_ENV;
    else process.env.ASAAS_ENV = previousEnv;
  }
});
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
  assert.equal(mapAsaasEventToStatus("SUBSCRIPTION_ACTIVE"), null);
  assert.equal(mapAsaasEventToStatus("SUBSCRIPTION_UPDATE"), null);
});

test("mapAsaasEventToStatus mapeia atraso para past_due", () => {
  assert.equal(mapAsaasEventToStatus("PAYMENT_OVERDUE"), "past_due");
});

test("mapAsaasEventToStatus mapeia cancelamento", () => {
  assert.equal(mapAsaasEventToStatus("SUBSCRIPTION_INACTIVE"), "canceled");
});

test("evento de assinatura sem pagamento não ativa nem altera status do trial", async () => {
  const tenantId = "t_billing_evento_sem_pagamento";
  await ensureTrialSubscription(tenantId);
  const subscription = await applyGatewayPaymentEvent({
    tenantId,
    event: "SUBSCRIPTION_ACTIVE",
    paid: false,
  });
  assert.equal(subscription?.status, "trial");
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
