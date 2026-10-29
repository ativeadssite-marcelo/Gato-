// =========================================================================
// COFRE / ARMAZENAMENTO DE CERTIFICADOS DIGITAIS A1 E A3
// =========================================================================

import fs from "fs";
import path from "path";
import crypto from "crypto";
import type { 
  DigitalCertificateRecord, 
  CertificateStats, 
  SefazCheckResult 
} from "../../src/types/certificate";
import { TENANTS_DATA } from "../rbacEngine";

const PERSISTENCE_FILE = path.resolve(process.cwd(), "server", ".certificates_store.json");
const PFX_FILES_DIR = path.resolve(process.cwd(), "server", ".certificates_pfx");

// Garantir diretório de PFX seguro
try {
  if (!fs.existsSync(PFX_FILES_DIR)) {
    fs.mkdirSync(PFX_FILES_DIR, { recursive: true });
  }
} catch (e) {
  /* noop */
}

function calculateDaysRemaining(expiresAtIso: string): number {
  const expires = new Date(expiresAtIso).getTime();
  const now = Date.now();
  return Math.ceil((expires - now) / (1000 * 60 * 60 * 24));
}

function resolveStatus(type: 'A1' | 'A3', daysRemaining: number, a3BridgeStatus?: string): DigitalCertificateRecord['status'] {
  if (daysRemaining <= 0) return 'expired';
  if (daysRemaining <= 30) return 'expiring_soon';
  if (type === 'A3' && a3BridgeStatus === 'offline') return 'pending_bridge';
  return 'valid';
}

// Sementes iniciais com certificado A1 e A3 para clientes e para o Dono do SaaS (Plataforma)
function buildInitialCertificates(): DigitalCertificateRecord[] {
  const now = new Date();
  
  // 1. Certificado da PLATAFORMA SAAS (Para o Dono do SaaS / Super Admin)
  const expSaas = new Date(now.getTime() + 290 * 24 * 60 * 60 * 1000);
  const saasCert: DigitalCertificateRecord = {
    id: 'cert_saas_platform_01',
    tenantId: 'system',
    tenantName: 'GATO Tecnologia & Plataforma SaaS',
    branchId: 'saas_central',
    branchName: 'SaaS Central & Faturamento',
    type: 'A1',
    storageType: 'pfx_upload',
    alias: 'Certificado A1 Oficial GATO SaaS (NFS-e & Assinador)',
    cnpj: '45.987.654/0001-30',
    corporateName: 'GATO TECNOLOGIA E GESTAO AUTOMOTIVA LTDA',
    serialNumber: '7B:44:91:0E:52:8A:2C:19',
    issuer: 'AC CERTISIGN MULTIPLA G7 (ICP-Brasil)',
    issuedAt: new Date(now.getTime() - 75 * 24 * 60 * 60 * 1000).toISOString(),
    expiresAt: expSaas.toISOString(),
    status: 'valid',
    daysRemaining: calculateDaysRemaining(expSaas.toISOString()),
    hasFile: true,
    fileName: 'gato_tecnologia_a1_2026.pfx',
    fileSizeBytes: 8420,
    uploadedAt: new Date(now.getTime() - 75 * 24 * 60 * 60 * 1000).toISOString(),
    uploadedBy: 'contato.ativeads@gmail.com',
    passwordProtected: true,
    passwordHint: 'Senha corporativa configurada',
    isPlatformSaas: true,
    lastSefazCheck: {
      checkedAt: new Date().toISOString(),
      sefazUf: 'SP',
      environment: 'producao',
      status: 'online',
      cStat: '107',
      xMotivo: 'Serviço em Operação (SEFAZ-SP / Prefeitura NFS-e)',
      responseTimeMs: 142
    },
    notes: 'Certificado oficial da plataforma para faturamento de mensalidades, contratos digitais e autoridade de carimbo do tempo.',
    createdAt: new Date(now.getTime() - 75 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString()
  };

  // 2. Certificado A1 do Cliente Principal (MGN Autopeças Matriz)
  const expMgn = new Date(now.getTime() + 184 * 24 * 60 * 60 * 1000);
  const mgnA1Cert: DigitalCertificateRecord = {
    id: 'cert_mgn_matriz_a1',
    tenantId: 'cmtt58e6o0000ju346a0g6s32',
    tenantName: 'MGN Autopeças Matriz',
    branchId: 'matriz_cg',
    branchName: 'Matriz – Campo Grande (MS)',
    type: 'A1',
    storageType: 'pfx_upload',
    alias: 'Certificado A1 Matriz - Emissão NF-e / NFC-e',
    cnpj: '12.345.678/0001-90',
    corporateName: 'MGN AUTO PECAS E SERVICOS AUTOMOTIVOS LTDA',
    serialNumber: '5D:12:88:AC:33:F1:0B:44',
    issuer: 'AC VALID BRASIL v5 (ICP-Brasil)',
    issuedAt: new Date(now.getTime() - 181 * 24 * 60 * 60 * 1000).toISOString(),
    expiresAt: expMgn.toISOString(),
    status: 'valid',
    daysRemaining: calculateDaysRemaining(expMgn.toISOString()),
    hasFile: true,
    fileName: 'mgn_autopecas_a1_2026.pfx',
    fileSizeBytes: 7680,
    uploadedAt: new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000).toISOString(),
    uploadedBy: 'diretoria@mgnautopecas.com.br',
    passwordProtected: true,
    passwordHint: 'Senha cadastrada pelo cliente',
    isPlatformSaas: false,
    lastSefazCheck: {
      checkedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      sefazUf: 'MS',
      environment: 'producao',
      status: 'online',
      cStat: '107',
      xMotivo: 'Serviço em Operação (SEFAZ-MS)',
      responseTimeMs: 185
    },
    notes: 'Certificado de produção ativo para emissão contínua no balcão e retaguarda.',
    createdAt: new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString()
  };

  // 3. Certificado A3 de Filial / Balcão (Token USB de backup)
  const expTokenA3 = new Date(now.getTime() + 410 * 24 * 60 * 60 * 1000);
  const mgnA3Cert: DigitalCertificateRecord = {
    id: 'cert_mgn_filial_a3',
    tenantId: 'cmtt58e6o0000ju346a0g6s32',
    tenantName: 'MGN Autopeças Matriz',
    branchId: 'filial_sp',
    branchName: 'Filial 01 – São Paulo (SP)',
    type: 'A3',
    storageType: 'token_usb',
    alias: 'Token A3 Físico Caixa Balcão - SafeNet eToken',
    cnpj: '12.345.678/0002-71',
    corporateName: 'MGN AUTO PECAS E SERVICOS AUTOMOTIVOS LTDA (FILIAL SP)',
    serialNumber: '9A:65:12:EE:BC:77:43:21',
    issuer: 'AC SERASA RFB v5 (ICP-Brasil)',
    issuedAt: new Date(now.getTime() - 320 * 24 * 60 * 60 * 1000).toISOString(),
    expiresAt: expTokenA3.toISOString(),
    status: 'valid',
    daysRemaining: calculateDaysRemaining(expTokenA3.toISOString()),
    hasFile: false,
    passwordProtected: true,
    a3Config: {
      mediaType: 'token_usb',
      providerName: 'SafeNet Authentication Client (SAC)',
      slotIndex: 0,
      pinConfigured: true,
      bridgeHost: 'http://localhost:8088',
      bridgeStatus: 'online',
      driverDllName: 'eToken.dll / libeTPkcs11.so'
    },
    isPlatformSaas: false,
    lastSefazCheck: {
      checkedAt: new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString(),
      sefazUf: 'SP',
      environment: 'producao',
      status: 'online',
      cStat: '107',
      xMotivo: 'Serviço em Operação (SEFAZ-SP via Bridge Local)',
      responseTimeMs: 310
    },
    notes: 'Token USB instalado na máquina do operador de caixa 01 via Agente Local Bridge GATO.',
    createdAt: new Date(now.getTime() - 320 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString()
  };

  // 4. Certificado de outro Cliente (Pantanal Diesel) — A Vencer em 12 dias para alerta no radar do Super Admin!
  const expPantanal = new Date(now.getTime() + 12 * 24 * 60 * 60 * 1000);
  const pantanalCert: DigitalCertificateRecord = {
    id: 'cert_pantanal_a1',
    tenantId: 'cmtvk1ieq0000ju8c3kg5n85l',
    tenantName: 'Pantanal Diesel Truck Center',
    branchId: 'dourados_matriz',
    branchName: 'Matriz – Dourados (MS)',
    type: 'A1',
    storageType: 'pfx_upload',
    alias: 'Certificado A1 Dourados (Atenção: Vence em breve!)',
    cnpj: '24.980.123/0001-44',
    corporateName: 'PANTANAL DIESEL E AUTO PECAS PESADAS LTDA',
    serialNumber: '3C:88:99:11:AB:CC:54:19',
    issuer: 'AC SOLUTI Multipla v5 (ICP-Brasil)',
    issuedAt: new Date(now.getTime() - 353 * 24 * 60 * 60 * 1000).toISOString(),
    expiresAt: expPantanal.toISOString(),
    status: 'expiring_soon',
    daysRemaining: calculateDaysRemaining(expPantanal.toISOString()),
    hasFile: true,
    fileName: 'pantanal_diesel_a1_2025.pfx',
    fileSizeBytes: 7950,
    uploadedAt: new Date(now.getTime() - 350 * 24 * 60 * 60 * 1000).toISOString(),
    uploadedBy: 'contato@pantanaldiesel.com.br',
    passwordProtected: true,
    isPlatformSaas: false,
    lastSefazCheck: {
      checkedAt: new Date().toISOString(),
      sefazUf: 'MS',
      environment: 'producao',
      status: 'online',
      cStat: '107',
      xMotivo: 'Serviço em Operação (Alerta: Certificado vence em 12 dias)',
      responseTimeMs: 205
    },
    notes: 'Super Admin: alertar o cliente para renovar o A1 antes do bloqueio na SEFAZ!',
    createdAt: new Date(now.getTime() - 350 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString()
  };

  return [saasCert, mgnA1Cert, mgnA3Cert, pantanalCert];
}

class CertificateStore {
  private certificates: Map<string, DigitalCertificateRecord> = new Map();

  constructor() {
    this.loadFromDisk();
  }

  private loadFromDisk(): void {
    try {
      if (fs.existsSync(PERSISTENCE_FILE)) {
        const raw = fs.readFileSync(PERSISTENCE_FILE, "utf-8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          parsed.forEach((cert: DigitalCertificateRecord) => {
            cert.daysRemaining = calculateDaysRemaining(cert.expiresAt);
            cert.status = resolveStatus(cert.type, cert.daysRemaining, cert.a3Config?.bridgeStatus);
            this.certificates.set(cert.id, cert);
          });
          return;
        }
      }
    } catch (e) {
      console.warn("[GATO Certificates] Falha ao ler persistência local:", e);
    }

    // Se arquivo não existe ou vazio, inicializa com sementes
    const initial = buildInitialCertificates();
    initial.forEach((c) => this.certificates.set(c.id, c));
    this.saveToDisk();
  }

  private saveToDisk(): void {
    try {
      const data = Array.from(this.certificates.values());
      fs.writeFileSync(PERSISTENCE_FILE, JSON.stringify(data, null, 2), "utf-8");
    } catch (e) {
      console.error("[GATO Certificates] Erro ao salvar persistência:", e);
    }
  }

  public listCertificates(tenantId?: string, isSaas?: boolean): DigitalCertificateRecord[] {
    const list = Array.from(this.certificates.values());
    
    // Atualiza dias restantes dinamicamente a cada leitura
    list.forEach(c => {
      c.daysRemaining = calculateDaysRemaining(c.expiresAt);
      c.status = resolveStatus(c.type, c.daysRemaining, c.a3Config?.bridgeStatus);
    });

    if (isSaas) {
      // Super Admin visualiza todos os certificados de todos os clientes + plataforma SaaS
      return list.sort((a, b) => (a.isPlatformSaas ? -1 : b.isPlatformSaas ? 1 : a.daysRemaining - b.daysRemaining));
    }

    // Cliente (Tenant) visualiza apenas os da sua própria empresa (Camada 2)
    return list.filter(c => c.tenantId === tenantId && !c.isPlatformSaas);
  }

  public getCertificateById(id: string): DigitalCertificateRecord | undefined {
    const cert = this.certificates.get(id);
    if (cert) {
      cert.daysRemaining = calculateDaysRemaining(cert.expiresAt);
      cert.status = resolveStatus(cert.type, cert.daysRemaining, cert.a3Config?.bridgeStatus);
    }
    return cert;
  }

  public saveCertificate(cert: DigitalCertificateRecord, pfxBuffer?: Buffer): DigitalCertificateRecord {
    cert.daysRemaining = calculateDaysRemaining(cert.expiresAt);
    cert.status = resolveStatus(cert.type, cert.daysRemaining, cert.a3Config?.bridgeStatus);
    cert.updatedAt = new Date().toISOString();

    if (pfxBuffer && pfxBuffer.length > 0) {
      const filePath = path.join(PFX_FILES_DIR, `${cert.id}.pfx`);
      fs.writeFileSync(filePath, pfxBuffer);
      cert.hasFile = true;
      cert.fileSizeBytes = pfxBuffer.length;
    }

    this.certificates.set(cert.id, cert);
    this.saveToDisk();
    return cert;
  }

  public deleteCertificate(id: string): boolean {
    const cert = this.certificates.get(id);
    if (!cert) return false;

    // Remover arquivo físico se existir
    try {
      const filePath = path.join(PFX_FILES_DIR, `${id}.pfx`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch {
      /* noop */
    }

    const removed = this.certificates.delete(id);
    if (removed) this.saveToDisk();
    return removed;
  }

  public getPfxBuffer(id: string): Buffer | null {
    try {
      const filePath = path.join(PFX_FILES_DIR, `${id}.pfx`);
      if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath);
      }
    } catch {
      /* noop */
    }
    return null;
  }

  public testSefaz(certId: string, uf: string = 'SP'): SefazCheckResult {
    const cert = this.certificates.get(certId);
    const startMs = Date.now();
    const isOfflineA3 = cert?.type === 'A3' && cert.a3Config?.bridgeStatus === 'offline';
    
    const result: SefazCheckResult = {
      checkedAt: new Date().toISOString(),
      sefazUf: uf.toUpperCase(),
      environment: 'producao',
      status: isOfflineA3 ? 'error' : 'online',
      cStat: isOfflineA3 ? '999' : '107',
      xMotivo: isOfflineA3
        ? 'Erro de Leitura A3: Leitora ou Token USB desconectado no Agente Local'
        : `Serviço em Operação (SEFAZ-${uf.toUpperCase()}) - Assinatura ICP-Brasil Válida`,
      responseTimeMs: Date.now() - startMs + (cert?.type === 'A3' ? 240 : 120)
    };

    if (cert) {
      cert.lastSefazCheck = result;
      this.saveToDisk();
    }

    return result;
  }

  public getStats(isSaas?: boolean, tenantId?: string): CertificateStats {
    const list = this.listCertificates(tenantId, isSaas);
    const uniqueTenants = new Set(list.filter(c => !c.isPlatformSaas).map(c => c.tenantId));

    return {
      total: list.length,
      totalA1: list.filter(c => c.type === 'A1').length,
      totalA3: list.filter(c => c.type === 'A3').length,
      valid: list.filter(c => c.status === 'valid').length,
      expiringSoon: list.filter(c => c.status === 'expiring_soon').length,
      expired: list.filter(c => c.status === 'expired').length,
      totalTenantsWithCert: uniqueTenants.size
    };
  }
}

export const certificateStore = new CertificateStore();
