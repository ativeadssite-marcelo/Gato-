import { test } from "node:test";
import assert from "node:assert";
import { renderTemplate, EMAIL_TEMPLATES } from "./templates";

test("todos os templates estão registrados", () => {
  const codes = EMAIL_TEMPLATES.map((t) => t.code);
  for (const c of ["trial_welcome", "trial_ending", "invoice_reminder", "invoice_overdue", "payment_confirmed"]) {
    assert.ok(codes.includes(c), `template ${c} deve existir`);
  }
});

test("renderTemplate interpola variáveis {{chave}}", () => {
  const r = renderTemplate("invoice_reminder", {
    tenantName: "MGN Autopeças",
    planName: "GATO Pro",
    amount: "389,90",
    dueDate: "2026-10-01",
    daysText: "3 dias",
  });
  assert.ok(r, "deve renderizar");
  assert.match(r!.subject, /389,90/);
  assert.match(r!.text, /MGN Autopeças/);
  assert.match(r!.text, /2026-10-01/);
  assert.ok(!r!.text.includes("{{"), "não deve sobrar placeholder não interpolado");
});

test("renderTemplate retorna null para template inexistente", () => {
  assert.equal(renderTemplate("nao_existe", { tenantName: "x", planName: "p", amount: "0", dueDate: "d" }), null);
});
