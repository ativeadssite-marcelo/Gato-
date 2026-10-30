import { test } from "node:test";
import assert from "node:assert";
import express from "express";
import { certificateStore, encryptPfxBuffer, decryptPfxBuffer } from "./certificateStore.ts";
import { certificateRouter } from "./certificateRoutes.ts";
import { issueSessionToken } from "../auth.ts";
import { RBAC_USERS_DATA } from "../rbacEngine.ts";
import type { DigitalCertificateRecord } from "../../src/types/certificate.ts";

test("certificateStore inicializa e lista certificados da plataforma e dos clientes", () => {
  const all = certificateStore.listCertificates(undefined, true);
  assert.ok(all.length >= 2, "Deveria ter pelo menos 2 certificados no cofre");

  // Certificado da plataforma SaaS ("para mim também")
  const saasCert = all.find(c => c.isPlatformSaas);
  assert.ok(saasCert, "Deveria existir um certificado oficial da plataforma SaaS");
  assert.equal(saasCert?.tenantId, "system");
  assert.equal(saasCert?.type, "A1");

  // Certificado do cliente (Camada 2)
  const clientCert = all.find(c => !c.isPlatformSaas);
  assert.ok(clientCert, "Deveria existir certificado de cliente");
  assert.ok(clientCert?.tenantId !== "system");
});

test("cliente só visualiza certificados da sua própria empresa (isolamento LGPD)", () => {
  const tenantId = "cmtt58e6o0000ju346a0g6s32";
  const clientCerts = certificateStore.listCertificates(tenantId, false);
  
  assert.ok(clientCerts.every(c => c.tenantId === tenantId), "Todos devem pertencer estritamente ao tenant");
  assert.ok(clientCerts.every(c => !c.isPlatformSaas), "Nenhum certificado da plataforma deve vazar para o cliente");
});

test("certificateStore salva novo certificado A1 e A3 com cálculo de dias e status", () => {
  const now = new Date();
  const future = new Date(now.getTime() + 100 * 24 * 60 * 60 * 1000).toISOString();

  const testCert: DigitalCertificateRecord = {
    id: `cert_test_${Date.now()}`,
    tenantId: "cmtt58e6o0000ju346a0g6s32",
    tenantName: "MGN Autopeças Matriz",
    type: "A1",
    storageType: "pfx_upload",
    alias: "Certificado de Teste Unitário A1",
    cnpj: "12.345.678/0001-90",
    corporateName: "MGN TESTE LTDA",
    serialNumber: "FF:AA:11:22:33:44",
    issuer: "AC TESTE v1",
    issuedAt: now.toISOString(),
    expiresAt: future,
    status: "valid",
    daysRemaining: 100,
    hasFile: false,
    passwordProtected: true,
    isPlatformSaas: false,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  };

  const saved = certificateStore.saveCertificate(testCert);
  assert.equal(saved.id, testCert.id);
  assert.equal(saved.status, "valid");
  assert.ok(saved.daysRemaining >= 99);

  // Teste SEFAZ
  const sefazResult = certificateStore.testSefaz(saved.id, "SP");
  assert.equal(sefazResult.status, "online");
  assert.equal(sefazResult.cStat, "107");

  // Remoção
  const deleted = certificateStore.deleteCertificate(saved.id);
  assert.equal(deleted, true);
  const found = certificateStore.getCertificateById(saved.id);
  assert.equal(found, undefined);
});

test("arquivo PFX é criptografado com AES-256-GCM no disco e decriptado na leitura", () => {
  const rawPfx = Buffer.from("CONTEUDO_SECRETO_CHAVE_PRIVADA_ICP_BRASIL_PFX");
  const encrypted = encryptPfxBuffer(rawPfx);
  assert.ok(!encrypted.includes(rawPfx), "O buffer criptografado não pode conter o texto plano");
  assert.deepEqual(decryptPfxBuffer(encrypted), rawPfx);
});

test("rotas de certificados bloqueiam acesso entre tenants (a3-ping/DELETE) e escrita por operador comum", async () => {
  const app = express();
  app.use(express.json());
  app.use("/api/certificates", certificateRouter);
  const server = app.listen(0);
  const port = (server.address() as { port: number }).port;
  const baseUrl = `http://127.0.0.1:${port}/api/certificates`;

  try {
    // 1. Operador comum (tenant_user) não pode cadastrar nem excluir certificado (403)
    const tenantUser = RBAC_USERS_DATA.find((u) => u.roleCode === "tenant_user")!;
    const userSession = issueSessionToken(tenantUser);

    const postRes = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userSession.token}`,
      },
      body: JSON.stringify({ type: "A1", alias: "Tentativa Operador", cnpj: "12.345.678/0001-90" }),
    });
    assert.equal(postRes.status, 403);

    // 2. Admin do tenant MGN não pode dar a3-ping nem DELETE em certificado do Pantanal Diesel (403)
    const mgnAdmin = RBAC_USERS_DATA.find(
      (u) => u.roleCode === "tenant_admin" && u.tenantId === "cmtt58e6o0000ju346a0g6s32",
    )!;
    const mgnSession = issueSessionToken(mgnAdmin);

    const pingOtherRes = await fetch(`${baseUrl}/cert_pantanal_a1/a3-ping`, {
      method: "POST",
      headers: { Authorization: `Bearer ${mgnSession.token}` },
    });
    assert.equal(pingOtherRes.status, 403);

    const deleteOtherRes = await fetch(`${baseUrl}/cert_pantanal_a1`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${mgnSession.token}` },
    });
    assert.equal(deleteOtherRes.status, 403);
  } finally {
    server.close();
  }
});
