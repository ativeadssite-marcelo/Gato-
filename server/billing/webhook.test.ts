import { test } from "node:test";
import assert from "node:assert";
import { ensureTrialSubscription } from "./subscriptions";
import { handleAsaasEvent } from "./webhook";
import { getSubscriptionByTenant } from "../store";

test("replay de webhook não altera o status atual da assinatura", async () => {
  const tenantId = "t_webhook_replay";
  await ensureTrialSubscription(tenantId);

  await handleAsaasEvent({
    event: "PAYMENT_OVERDUE",
    eventId: "evt_webhook_initial_overdue",
    tenantId,
    paid: false,
  });
  await handleAsaasEvent({
    event: "PAYMENT_RECEIVED",
    eventId: "evt_webhook_old_payment",
    tenantId,
    paid: true,
  });
  await handleAsaasEvent({
    event: "PAYMENT_OVERDUE",
    eventId: "evt_webhook_latest_overdue",
    tenantId,
    paid: false,
  });

  const replay = await handleAsaasEvent({
    event: "PAYMENT_RECEIVED",
    eventId: "evt_webhook_old_payment",
    tenantId,
    paid: true,
  });

  assert.equal(replay.status, "ignored");
  assert.equal(replay.alreadyProcessed, true);
  assert.equal((await getSubscriptionByTenant(tenantId))?.status, "past_due");
});

test("webhook sem identificador é recusado antes de registrar evento", async () => {
  await assert.rejects(
    () =>
      handleAsaasEvent({
        event: "PAYMENT_RECEIVED",
        eventId: "  ",
        tenantId: "t_webhook_sem_id",
        paid: true,
      }),
    /sem identificador/,
  );
  assert.equal(await getSubscriptionByTenant("t_webhook_sem_id"), null);
});
