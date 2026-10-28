import { test } from "node:test";
import assert from "node:assert";
import { computeTrialDaysRemaining, cleanCnpj, formatCnpj } from "../src/utils/trialService";
import { authRouter } from "./authRoutes";
import { INTERNAL_MESSAGES_DATA, TENANTS_DATA } from "./rbacEngine";

function makeMockRes() {
  const res: any = {
    statusCode: 200,
    headers: {},
    body: undefined,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: any) {
      this.body = data;
      return this;
    },
    setHeader(k: string, v: string) {
      this.headers[k] = v;
    },
  };
  return res;
}

test("computeTrialDaysRemaining calcula 15 dias para registro recém-criado", () => {
  const now = new Date().toISOString();
  const result = computeTrialDaysRemaining(now, 15);
  assert.equal(result.isExpired, false);
  assert.equal(result.daysRemaining, 15);
  assert.equal(result.daysPassed, 0);
});

test("computeTrialDaysRemaining expira após 15 dias corridos", () => {
  const past = new Date(Date.now() - 16 * 24 * 60 * 60 * 1000).toISOString();
  const result = computeTrialDaysRemaining(past, 15);
  assert.equal(result.isExpired, true);
  assert.equal(result.daysRemaining, 0);
  assert.ok(result.daysPassed >= 16);
});

test("cleanCnpj e formatCnpj formatam corretamente dígitos e máscara", () => {
  const raw = "12345678000190";
  const formatted = formatCnpj(raw);
  assert.equal(formatted, "12.345.678/0001-90");
  assert.equal(cleanCnpj(formatted), "12345678000190");
});

test("authRouter support-request grava mensagem na fila do superadmin com protocolo", async () => {
  const initialCount = INTERNAL_MESSAGES_DATA.length;
  const mockReq: any = {
    method: "POST",
    url: "/support-request",
    body: {
      companyName: "Auto Peças Teste 15 Dias",
      contactName: "Roberto Vendedor",
      email: "roberto@teste15dias.com.br",
      phone: "(67) 99999-1234",
      cnpj: "12.345.678/0001-90",
      requestType: "teste_15_dias",
      message: "Gostaria de testar por 15 dias.",
    },
    headers: {},
    socket: { remoteAddress: "127.0.0.1" },
  };
  const mockRes = makeMockRes();

  // Encontra o handler da rota
  const route = (authRouter.stack as any[]).find(
    (layer) => layer.route && layer.route.path === "/support-request" && layer.route.methods.post
  );
  assert.ok(route, "Rota POST /support-request deve estar registrada no authRouter");

  await route.route.stack[0].handle(mockReq, mockRes);

  assert.equal(mockRes.statusCode, 200);
  assert.equal(mockRes.body.success, true);
  assert.ok(mockRes.body.protocol.startsWith("SOL-"));
  assert.ok(INTERNAL_MESSAGES_DATA.length > initialCount);

  const newestMsg = INTERNAL_MESSAGES_DATA[0];
  assert.equal(newestMsg.tenantId, "system");
  assert.ok(newestMsg.title.includes("Solicitação de Teste 15 Dias"));
});
