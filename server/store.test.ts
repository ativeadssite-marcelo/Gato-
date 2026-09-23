import { test } from "node:test";
import assert from "node:assert";
import {
  hasProcessedWebhookEvent,
  recordWebhookEvent,
  createInvoice,
  listInvoices,
  markInvoicePaid,
} from "./store";

test("webhook event é idempotente (mesmo eventId processado uma vez)", async () => {
  const eventId = "evt_idempotencia_1";
  const first = await recordWebhookEvent("asaas", "PAYMENT_RECEIVED", eventId, { value: 100 });
  assert.equal(first.alreadyProcessed, false);

  const second = await recordWebhookEvent("asaas", "PAYMENT_RECEIVED", eventId, { value: 100 });
  assert.equal(second.alreadyProcessed, true);
  assert.equal(await hasProcessedWebhookEvent("asaas", eventId), true);
});

test("fatura: cria, lista por tenant e marca como paga", async () => {
  const invoice = await createInvoice({
    tenantId: "tenant_teste_fatura",
    amount: 189.9,
    dueDate: "2026-10-10",
  });
  assert.equal(invoice.status, "open");

  const tenantInvoices = await listInvoices("tenant_teste_fatura");
  assert.ok(tenantInvoices.some((i) => i.id === invoice.id));

  const paid = await markInvoicePaid(invoice.id, { paymentMethod: "pix" });
  assert.equal(paid!.status, "paid");
  assert.ok(paid!.paidAt);
  assert.equal(paid!.paymentMethod, "pix");
});
