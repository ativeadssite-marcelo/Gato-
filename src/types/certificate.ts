// =========================================================================
// MODELO DE DADOS DE CERTIFICADOS DIGITAIS A1 E A3 (NF-e, NFC-e, MDF-e, SEFAZ)
// =========================================================================

export type CertificateType = 'A1' | 'A3';

export type CertificateStorageType = 
  | 'pfx_upload' 
  | 'p12_upload' 
  | 'token_usb' 
  | 'smart_card' 
  | 'cloud_birdid' 
  | 'cloud_safeweb';

export type CertificateStatus = 'valid' | 'expiring_soon' | 'expired' | 'pending_bridge';

export interface A3Config {
  mediaType: 'token_usb' | 'smart_card' | 'cloud';
  providerName: string; // Ex: SafeNet, Aladdin eToken, Gemalto, BirdID, SafeWeb
  slotIndex: number;
  pinConfigured: boolean;
  bridgeHost: string; // Ex: "http://localhost:8088"
  bridgeStatus: 'online' | 'offline' | 'checking';
  cloudClientId?: string;
  driverDllName?: string;
}

export interface SefazCheckResult {
  checkedAt: string;
  sefazUf: string;
  environment: 'producao' | 'homologacao';
  status: 'online' | 'error' | 'untested';
  cStat?: string;
  xMotivo?: string;
  responseTimeMs?: number;
}

export interface DigitalCertificateRecord {
  id: string;
  tenantId: string;
  tenantName: string;
  branchId?: string;
  branchName?: string;
  type: CertificateType; // 'A1' | 'A3'
  storageType: CertificateStorageType;
  alias: string; // Ex: "Certificado Matriz SP 2026", "Token A3 Balcão Joinville"
  cnpj: string;
  corporateName: string;
  serialNumber: string;
  issuer: string; // Ex: "AC CERTISIGN MULTIPLA G7", "AC SERASA RFB v5", "AC SOLUTI Multipla v5"
  issuedAt: string; // ISO
  expiresAt: string; // ISO
  status: CertificateStatus;
  daysRemaining: number;
  
  // A1 Details
  hasFile: boolean;
  fileName?: string;
  fileSizeBytes?: number;
  uploadedAt?: string;
  uploadedBy?: string;
  passwordProtected: boolean;
  passwordHint?: string;

  // A3 Details
  a3Config?: A3Config;

  // SEFAZ Integration & Status
  lastSefazCheck?: SefazCheckResult;

  // Flags
  isPlatformSaas?: boolean; // Certificado próprio do Super Admin / Dono da Plataforma SaaS
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CertificateStats {
  total: number;
  totalA1: number;
  totalA3: number;
  valid: number;
  expiringSoon: number; // <= 30 dias
  expired: number;
  totalTenantsWithCert: number;
}
