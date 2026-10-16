// =========================================================================
// TIPOS DE CONECTORES SAAS, CONFIGURAÇÃO FISCAL E CONTRATOS LGPD
// =========================================================================

export interface SaasPlatformConnector {
  id: string;
  name: string;
  category: 'saas_billing' | 'sefaz_infra' | 'platform_catalog' | 'saas_webhook';
  description: string;
  provider: string;
  status: 'connected' | 'healthy' | 'standby' | 'disabled';
  environment: 'production' | 'sandbox';
  endpoint: string;
  lastPing: string;
  activeContractsUsing: number;
  isIsolatedFromTenants: boolean;
  details: Record<string, any>;
}

export interface ContractFiscalConfig {
  tenantId: string;
  regimeTributario: 'simples_nacional' | 'lucro_presumido' | 'lucro_real' | 'mei';
  ufSede: string;
  inscricaoEstadual: string;
  cnaePrincipal: string;
  aliquotaIcmsPadrao: number;
  aliquotaPisPadrao: number;
  aliquotaCofinsPadrao: number;
  pisCofinsMonofasicoAutopecas: boolean;
  incentivoRegional: string;
  limiteNotasMensal: number;
  modulosAutorizados: {
    nfe: boolean;
    nfce: boolean;
    nfse: boolean;
    mdfe: boolean;
  };
  ambienteSefaz: 'homologacao' | 'producao';
  serieNfeAutorizada: string;
  statusHomologacao: 'homologado' | 'pendente_revisao' | 'em_auditoria';
  ultimaAuditoria: string;
  auditorResponsavel: string;
  observacoesSuperAdmin: string;
  updatedAt: string;
}

export interface ContractLgpdRecord {
  contractNumber: string;
  tenantId: string;
  tenantName: string;
  tradeName: string;
  cnpj: string;
  city: string;
  uf: string;
  contactEmail: string;
  planId: string;
  planName: string;
  monthlyValue: number;
  effectiveDate: string;
  status: 'active' | 'draft' | 'pending_signature';
  signed: boolean;
  signedAt: string | null;
  signedBy: string | null;
  signerDocument: string | null;
  signerIp: string | null;
  integrityHash: string;
  lgpdVersion: string;
  controller: string;
  operator: string;
  dpoContact: string;
  fiscalConfig: ContractFiscalConfig;
  clausesSummary: string[];
}
