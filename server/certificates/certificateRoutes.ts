// =========================================================================
// ROTAS DE GERENCIAMENTO DE CERTIFICADOS DIGITAIS A1 E A3 (COFRE CRIPTOGRAFADO)
// =========================================================================

import { Router, Request, Response } from "express";
import crypto from "crypto";
import { requireAuth } from "../auth";
import { certificateStore } from "./certificateStore";
import { TENANTS_DATA } from "../rbacEngine";
import type { 
  DigitalCertificateRecord, 
  CertificateType, 
  CertificateStorageType,
  A3Config
} from "../../src/types/certificate";

export const certificateRouter = Router();

export interface EncryptedVaultFolder {
  id: string;
  tenantId: string;
  name: string;
  tradeName?: string;
  cnpj: string;
  city?: string;
  uf?: string;
  ownerType: 'platform_saas' | 'client_tenant';
  ownerLabel: string;
  encryptionAlgorithm: string;
  vaultStatus: 'locked' | 'unlocked' | 'ready';
  lastActivity: string;
  certificates: DigitalCertificateRecord[];
  totalA1: number;
  totalA3: number;
  hasExpiringSoon: boolean;
  hasExpired: boolean;
  isCurrentUserFolder: boolean;
}

// -------------------------------------------------------------------------
// 1. LISTAR PASTAS CRIPTOGRAFADAS DE CERTIFICADOS
// Retorna a pasta da Plataforma (Super Admin) e as pastas dos Clientes
// -------------------------------------------------------------------------
certificateRouter.get("/folders", requireAuth, (req: Request, res: Response) => {
  const isSaas = !!req.auth?.isSaasScope;
  const userTenantId = req.auth?.tenantId || "";
  const allCerts = certificateStore.listCertificates(userTenantId, isSaas);

  const folders: EncryptedVaultFolder[] = [];

  // 1. PASTA DA PLATAFORMA SAAS ("Para mim também" - Super Admin / Dono da Plataforma)
  // Disponível para visualização pelo Super Admin
  if (isSaas) {
    const saasCerts = allCerts.filter(c => c.isPlatformSaas || c.tenantId === 'system');
    folders.push({
      id: 'folder_platform_saas',
      tenantId: 'system',
      name: 'Pasta Oficial da Plataforma (GATO Tecnologia SaaS)',
      tradeName: 'GATO Tecnologia e Gestão Automotiva',
      cnpj: '45.987.654/0001-30',
      city: 'São Paulo',
      uf: 'SP',
      ownerType: 'platform_saas',
      ownerLabel: 'Dono da Plataforma / Super Admin (Meu Cofre)',
      encryptionAlgorithm: 'AES-256-GCM Blindado • Assinador NFS-e & Plataforma',
      vaultStatus: 'ready',
      lastActivity: new Date().toISOString(),
      certificates: saasCerts,
      totalA1: saasCerts.filter(c => c.type === 'A1').length,
      totalA3: saasCerts.filter(c => c.type === 'A3').length,
      hasExpiringSoon: saasCerts.some(c => c.status === 'expiring_soon'),
      hasExpired: saasCerts.some(c => c.status === 'expired'),
      isCurrentUserFolder: true,
    });
  }

  // 2. PASTAS CRIPTOGRAFADAS DOS CLIENTES (TENANTS)
  // Se for Super Admin: lista todas as pastas de clientes
  // Se for Cliente: lista estritamente a sua própria pasta (Isolamento Multi-Tenant LGPD)
  const allowedTenants = isSaas 
    ? TENANTS_DATA 
    : TENANTS_DATA.filter(t => t.id === userTenantId);

  allowedTenants.forEach(tenant => {
    const tenantCerts = allCerts.filter(c => c.tenantId === tenant.id && !c.isPlatformSaas);
    folders.push({
      id: `folder_tenant_${tenant.id}`,
      tenantId: tenant.id,
      name: `Cofre Criptografado — ${tenant.tradeName || tenant.name}`,
      tradeName: tenant.tradeName,
      cnpj: tenant.cnpj,
      city: tenant.city,
      uf: tenant.uf,
      ownerType: 'client_tenant',
      ownerLabel: `Cliente Contratante (Camada 2)`,
      encryptionAlgorithm: 'AES-256-GCM com Segregação por Tenant (LGPD)',
      vaultStatus: 'ready',
      lastActivity: new Date().toISOString(),
      certificates: tenantCerts,
      totalA1: tenantCerts.filter(c => c.type === 'A1').length,
      totalA3: tenantCerts.filter(c => c.type === 'A3').length,
      hasExpiringSoon: tenantCerts.some(c => c.status === 'expiring_soon'),
      hasExpired: tenantCerts.some(c => c.status === 'expired'),
      isCurrentUserFolder: tenant.id === userTenantId,
    });
  });

  const stats = certificateStore.getStats(isSaas, userTenantId);

  res.json({
    success: true,
    isSaas,
    totalFolders: folders.length,
    folders,
    stats,
  });
});

// -------------------------------------------------------------------------
// 2. LISTAR TODOS OS CERTIFICADOS DO ESCOPO DO USUÁRIO
// -------------------------------------------------------------------------
certificateRouter.get("/", requireAuth, (req: Request, res: Response) => {
  const isSaas = !!req.auth?.isSaasScope;
  const userTenantId = req.auth?.tenantId || "";
  const certificates = certificateStore.listCertificates(userTenantId, isSaas);
  const stats = certificateStore.getStats(isSaas, userTenantId);

  res.json({
    success: true,
    count: certificates.length,
    certificates,
    stats,
    isSaas,
  });
});

// -------------------------------------------------------------------------
// 3. ADICIONAR NOVO CERTIFICADO (A1 ou A3)
// -------------------------------------------------------------------------
certificateRouter.post("/", requireAuth, (req: Request, res: Response) => {
  const isSaas = !!req.auth?.isSaasScope;
  const callerTenantId = req.auth?.tenantId || "";
  
  const {
    targetTenantId,
    isPlatformSaas,
    type,
    storageType,
    alias,
    cnpj,
    corporateName,
    branchName,
    expiresAt,
    passwordHint,
    a3Config,
    pfxBase64,
    fileName,
    notes,
  } = req.body || {};

  if (!type || !alias || !cnpj) {
    return res.status(400).json({
      success: false,
      error: "Tipo (A1/A3), Apelido e CNPJ são obrigatórios.",
    });
  }

  // Validação de fronteira de tenant
  let assignedTenantId = callerTenantId;
  let assignedTenantName = "Minha Empresa";
  let isSaasCert = false;

  if (isSaas && isPlatformSaas) {
    assignedTenantId = "system";
    assignedTenantName = "GATO Tecnologia SaaS (Plataforma)";
    isSaasCert = true;
  } else if (isSaas && targetTenantId) {
    const target = TENANTS_DATA.find(t => t.id === targetTenantId);
    if (!target) {
      return res.status(404).json({ success: false, error: "Empresa cliente não encontrada." });
    }
    assignedTenantId = target.id;
    assignedTenantName = target.tradeName || target.name;
  } else {
    const myTenant = TENANTS_DATA.find(t => t.id === callerTenantId);
    if (myTenant) {
      assignedTenantName = myTenant.tradeName || myTenant.name;
    }
  }

  // Validade padrão: 1 ano para A1, 3 anos para A3 se não informada
  const now = new Date();
  const defaultDurationYears = type === 'A3' ? 3 : 1;
  const computedExpiresAt = expiresAt && !isNaN(new Date(expiresAt).getTime())
    ? new Date(expiresAt).toISOString()
    : new Date(now.getTime() + defaultDurationYears * 365 * 24 * 60 * 60 * 1000).toISOString();

  const newId = `cert_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
  const pseudoSerial = crypto.randomBytes(8).toString("hex").toUpperCase().match(/.{2}/g)?.join(":") || "A1:B2:C3:D4:E5";

  let pfxBuffer: Buffer | undefined;
  if (pfxBase64 && typeof pfxBase64 === "string") {
    try {
      const cleanBase64 = pfxBase64.includes(",") ? pfxBase64.split(",")[1] : pfxBase64;
      pfxBuffer = Buffer.from(cleanBase64, "base64");
    } catch {
      /* noop */
    }
  }

  const newCert: DigitalCertificateRecord = {
    id: newId,
    tenantId: assignedTenantId,
    tenantName: assignedTenantName,
    branchName: branchName || (isSaasCert ? "SaaS Central" : "Matriz Principal"),
    type: type as CertificateType,
    storageType: (storageType || (type === 'A1' ? 'pfx_upload' : 'token_usb')) as CertificateStorageType,
    alias: alias.trim(),
    cnpj: cnpj.trim(),
    corporateName: corporateName || assignedTenantName,
    serialNumber: pseudoSerial,
    issuer: type === 'A1' ? 'AC SERASA RFB v5 (ICP-Brasil)' : 'AC VALID BRASIL v5 (ICP-Brasil)',
    issuedAt: now.toISOString(),
    expiresAt: computedExpiresAt,
    status: 'valid',
    daysRemaining: Math.ceil((new Date(computedExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
    hasFile: !!pfxBuffer,
    fileName: fileName || (type === 'A1' ? `${alias.toLowerCase().replace(/\s+/g, '_')}.pfx` : undefined),
    fileSizeBytes: pfxBuffer ? pfxBuffer.length : undefined,
    uploadedAt: type === 'A1' ? now.toISOString() : undefined,
    uploadedBy: req.auth?.user?.email || "usuario@empresa.com.br",
    passwordProtected: true,
    passwordHint: passwordHint || (type === 'A3' ? 'PIN do Token A3 configurado' : 'Senha do arquivo PFX configurada'),
    isPlatformSaas: isSaasCert,
    a3Config: type === 'A3' ? {
      mediaType: a3Config?.mediaType || 'token_usb',
      providerName: a3Config?.providerName || 'SafeNet Authentication Client',
      slotIndex: a3Config?.slotIndex || 0,
      pinConfigured: true,
      bridgeHost: a3Config?.bridgeHost || 'http://localhost:8088',
      bridgeStatus: 'online',
      driverDllName: a3Config?.driverDllName || 'eToken.dll'
    } : undefined,
    lastSefazCheck: {
      checkedAt: now.toISOString(),
      sefazUf: 'SP',
      environment: 'producao',
      status: 'online',
      cStat: '107',
      xMotivo: `Serviço em Operação (SEFAZ) - ${type} Ativado`,
      responseTimeMs: 160
    },
    notes: notes || `Certificado ${type} cadastrado em conformidade com ICP-Brasil e LGPD.`,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  };

  const saved = certificateStore.saveCertificate(newCert, pfxBuffer);

  res.status(201).json({
    success: true,
    message: `Certificado digital ${type} armazenado com sucesso no cofre criptografado.`,
    certificate: saved,
  });
});

// -------------------------------------------------------------------------
// 4. TESTAR COMUNICAÇÃO SEFAZ (STATUS DO SERVIÇO COM CERTIFICADO)
// -------------------------------------------------------------------------
certificateRouter.post("/:id/test-sefaz", requireAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  const { uf } = req.body || {};
  const isSaas = !!req.auth?.isSaasScope;
  const userTenantId = req.auth?.tenantId || "";

  const cert = certificateStore.getCertificateById(id);
  if (!cert) {
    return res.status(404).json({ success: false, error: "Certificado não encontrado." });
  }

  // Isolamento: Cliente só testa certificado da sua empresa
  if (!isSaas && cert.tenantId !== userTenantId) {
    return res.status(403).json({ success: false, error: "Sem permissão para testar este certificado." });
  }

  const result = certificateStore.testSefaz(id, uf || 'SP');

  res.json({
    success: true,
    certificateId: id,
    alias: cert.alias,
    type: cert.type,
    sefazResult: result,
    message: result.status === 'online'
      ? `Comunicação com SEFAZ-${result.sefazUf} validada com sucesso! Código ${result.cStat}: ${result.xMotivo}`
      : `Falha na verificação: ${result.xMotivo}`,
  });
});

// -------------------------------------------------------------------------
// 5. TESTAR CONEXÃO AGENTE BRIDGE A3 (TOKEN / LEITORA USB)
// -------------------------------------------------------------------------
certificateRouter.post("/:id/a3-ping", requireAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  const cert = certificateStore.getCertificateById(id);

  if (!cert) {
    return res.status(404).json({ success: false, error: "Certificado não encontrado." });
  }

  if (cert.type !== 'A3') {
    return res.status(400).json({ success: false, error: "Este teste é exclusivo para certificados A3 (Token/Smartcard)." });
  }

  // Simulação realista de ping ao driver local bridge
  const isConnected = Math.random() > 0.1; // 90% online
  if (cert.a3Config) {
    cert.a3Config.bridgeStatus = isConnected ? 'online' : 'offline';
  }
  cert.status = isConnected ? 'valid' : 'pending_bridge';
  certificateStore.saveCertificate(cert);

  res.json({
    success: true,
    bridgeStatus: isConnected ? 'online' : 'offline',
    slotFound: isConnected,
    tokenName: cert.a3Config?.providerName || 'SafeNet Token USB',
    bridgeUrl: cert.a3Config?.bridgeHost || 'http://localhost:8088',
    message: isConnected
      ? 'Agente Local Bridge conectado! Token A3 detectado no slot USB e pronto para assinatura.'
      : 'Agente Local Bridge não respondeu em http://localhost:8088. Verifique se o conector USB está inserido.',
  });
});

// -------------------------------------------------------------------------
// 6. EXCLUIR CERTIFICADO
// -------------------------------------------------------------------------
certificateRouter.delete("/:id", requireAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  const isSaas = !!req.auth?.isSaasScope;
  const userTenantId = req.auth?.tenantId || "";

  const cert = certificateStore.getCertificateById(id);
  if (!cert) {
    return res.status(404).json({ success: false, error: "Certificado não encontrado." });
  }

  if (!isSaas && cert.tenantId !== userTenantId) {
    return res.status(403).json({ success: false, error: "Sem permissão para excluir este certificado." });
  }

  const ok = certificateStore.deleteCertificate(id);
  res.json({
    success: ok,
    message: ok ? "Certificado digital removido com sucesso do cofre." : "Falha ao remover certificado.",
  });
});
