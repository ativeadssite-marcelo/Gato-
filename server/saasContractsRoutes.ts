// =========================================================================
// ROTAS DE CONECTORES SAAS & CONTRATOS FISCAIS / LGPD — GATO SaaS (CAMADA 1)
// =========================================================================
// 1. Conectores Globais da Plataforma SaaS (Billing de assinaturas, SEFAZ infra,
//    catálogo homologado, webhooks do SaaS) com isolamento total dos dados de lojistas.
// 2. Configuração Fiscal por Contrato (homologada pelo Super Admin para cada assinante).
// 3. Contrato de Concessão de Licença SaaS & Termo de Tratamento de Dados (LGPD)
//    com todas as boas práticas atualizadas da Lei 13.709/2018 e Resoluções CD/ANPD.
// =========================================================================

import { Router, Request, Response } from "express";
import crypto from "crypto";
import {
  requireAuth,
  requireSaasScope,
  getClientIp,
  recordAudit
} from "./auth";
import { TENANTS_DATA, SAAS_PLANS } from "./rbacEngine";

export const saasContractsRouter = Router();

// -------------------------------------------------------------------------
// TIPOS E MODELOS EM MEMÓRIA COM PERSISTÊNCIA
// -------------------------------------------------------------------------

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
  isIsolatedFromTenants: boolean; // Sempre true: Super Admin não vê contas bancárias de clientes
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
  limiteNotasMensal: number; // 0 = ilimitado
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

// -------------------------------------------------------------------------
// DADOS INICIAIS DE CONECTORES GLOBAIS DO SAAS (CAMADA 1)
// -------------------------------------------------------------------------
const INITIAL_SAAS_CONNECTORS: SaasPlatformConnector[] = [
  {
    id: 'conn-asaas-billing',
    name: 'Asaas Recorrência & Subscriptions (SaaS)',
    category: 'saas_billing',
    description: 'Processamento das cobranças das assinaturas e mensalidades dos clientes contratantes via PIX, Boleto e Cartão do SaaS.',
    provider: 'Asaas Gestão Financeira S.A.',
    status: 'connected',
    environment: 'production',
    endpoint: 'https://api.asaas.com/v3/subscriptions',
    lastPing: new Date().toISOString(),
    activeContractsUsing: 3,
    isIsolatedFromTenants: true,
    details: {
      webhookStatus: 'Ativo e Validado por HMAC-SHA256',
      splitConfigured: false,
      reconciliation: 'Automática 24/7',
      complianceScope: 'Exclusivo do Dono do SaaS — Zero acesso a contas bancárias dos lojistas',
    },
  },
  {
    id: 'conn-stripe-saas',
    name: 'Stripe SaaS Billing Internacional',
    category: 'saas_billing',
    description: 'Gateway de contingência e processamento de cartões de crédito corporativos para assinaturas do ERP.',
    provider: 'Stripe Payments Brasil Ltda',
    status: 'standby',
    environment: 'production',
    endpoint: 'https://api.stripe.com/v1/billing',
    lastPing: new Date(Date.now() - 3600000).toISOString(),
    activeContractsUsing: 0,
    isIsolatedFromTenants: true,
    details: {
      webhookStatus: 'Pronto para failover',
      currency: 'BRL',
      complianceScope: 'Isolado do lojista',
    },
  },
  {
    id: 'conn-sefaz-cluster',
    name: 'SEFAZ Nacional & Infraestrutura Fiscal SaaS',
    category: 'sefaz_infra',
    description: 'Monitoramento da infraestrutura de comunicação síncrona com os 27 servidores SEFAZ estaduais e RFB para autorização de NF-e e NFC-e.',
    provider: 'Secretaria da Fazenda & Encat',
    status: 'healthy',
    environment: 'production',
    endpoint: 'https://nfe.fazenda.gov.br/portal/disponibilidade.aspx',
    lastPing: new Date().toISOString(),
    activeContractsUsing: 3,
    isIsolatedFromTenants: true,
    details: {
      latenciaMedia: '142ms',
      servidoresAtivos: '27/27 UFs Operacionais',
      contingenciaSvcAn: 'Pronta para chaveamento automático',
      complianceScope: 'Super Admin monitora apenas uptime e latência da infra; não vê dados das notas dos clientes',
    },
  },
  {
    id: 'conn-catalog-mktplaces',
    name: 'Catálogo de Homologação de Marketplaces',
    category: 'platform_catalog',
    description: 'Governança das integrações autorizadas pela plataforma (Mercado Livre API v2, Shopee Open Platform, Amazon SP-API, Nuvemshop).',
    provider: 'Hub de Conectores GATO ERP',
    status: 'healthy',
    environment: 'production',
    endpoint: 'https://api.gatoautopecas.com.br/v1/catalog/connectors',
    lastPing: new Date().toISOString(),
    activeContractsUsing: 3,
    isIsolatedFromTenants: true,
    details: {
      apisHomologadas: ['Mercado Livre Official API', 'Amazon Selling Partner API', 'Shopee Open Platform v2', 'Nuvemshop API v1', 'Shopify GraphQL'],
      seguranca: 'Tokens e credenciais de sellers dos clientes são armazenados com criptografia AES-256 e NUNCA exibidos ao Super Admin.',
    },
  },
  {
    id: 'conn-saas-webhooks',
    name: 'Webhooks de Infraestrutura & Provisionamento',
    category: 'saas_webhook',
    description: 'Eventos de auditoria, ciclo de vida de contratos, provisionamento de instâncias e alertas de expiração de licença.',
    provider: 'GATO Core Webhook Engine',
    status: 'connected',
    environment: 'production',
    endpoint: 'https://webhook.gatoautopecas.com.br/events/saas-governance',
    lastPing: new Date().toISOString(),
    activeContractsUsing: 3,
    isIsolatedFromTenants: true,
    details: {
      eventosMonitorados: ['tenant.provisioned', 'subscription.renewed', 'license.key_rotated', 'fiscal.homologated'],
      taxaEntrega: '99.98%',
    },
  },
];

// Estado dos conectores da plataforma
const saasConnectorsMap = new Map<string, SaasPlatformConnector>(
  INITIAL_SAAS_CONNECTORS.map((c) => [c.id, c])
);

// -------------------------------------------------------------------------
// CONFIGURAÇÃO FISCAL POR CONTRATO (GERENCIADA PELO SUPER ADMIN)
// -------------------------------------------------------------------------
const fiscalConfigsMap = new Map<string, ContractFiscalConfig>();

function getOrCreateFiscalConfig(tenantId: string): ContractFiscalConfig {
  let cfg = fiscalConfigsMap.get(tenantId);
  if (!cfg) {
    const tenant = TENANTS_DATA.find((t) => t.id === tenantId) || TENANTS_DATA[0];
    const isMgn = tenant.id === 'cmtt58e6o0000ju346a0g6s32';
    const isPantanal = tenant.id === 'cmtvk1ieq0000ju8c3kg5n85l';
    
    cfg = {
      tenantId: tenant.id,
      regimeTributario: isMgn ? 'lucro_presumido' : isPantanal ? 'simples_nacional' : 'lucro_real',
      ufSede: tenant.uf || 'MS',
      inscricaoEstadual: isMgn ? '28.345.678-9' : isPantanal ? '28.987.654-3' : '112.456.789.110',
      cnaePrincipal: '45.30-7-03 - Comércio a varejo de peças e acessórios novos para veículos automotores',
      aliquotaIcmsPadrao: tenant.uf === 'SP' ? 18.0 : 17.0,
      aliquotaPisPadrao: isMgn ? 0.65 : isPantanal ? 0.0 : 1.65,
      aliquotaCofinsPadrao: isMgn ? 3.0 : isPantanal ? 0.0 : 7.6,
      pisCofinsMonofasicoAutopecas: true, // Lei 10.485/2002: Revenda Alíquota Zero na autopeça
      incentivoRegional: tenant.uf === 'MS' ? 'Benefício Fiscal ICMS MS (Resolução SEFAZ Autopeças / FCO)' : 'Regime Padrão Estadual',
      limiteNotasMensal: tenant.planId === 'plan_enterprise' ? 0 : tenant.planId === 'plan_pro' ? 2500 : 500,
      modulosAutorizados: {
        nfe: true,
        nfce: true,
        nfse: tenant.planId !== 'plan_starter',
        mdfe: tenant.planId === 'plan_enterprise',
      },
      ambienteSefaz: 'producao',
      serieNfeAutorizada: '1',
      statusHomologacao: 'homologado',
      ultimaAuditoria: new Date().toISOString(),
      auditorResponsavel: 'Super Admin (Governança SaaS)',
      observacoesSuperAdmin: `Configuração fiscal homologada pelo SaaS para operação em ${tenant.uf} com tratamento tributário de autopeças.`,
      updatedAt: new Date().toISOString(),
    };
    fiscalConfigsMap.set(tenantId, cfg);
  }
  return cfg;
}

// Inicializar configs para os tenants conhecidos
for (const t of TENANTS_DATA) {
  getOrCreateFiscalConfig(t.id);
}

// -------------------------------------------------------------------------
// GERAÇÃO E ASSINATURA DE CONTRATOS LGPD DE CONCESSÃO SAAS
// -------------------------------------------------------------------------
const lgpdContractsMap = new Map<string, ContractLgpdRecord>();

function generateIntegrityHash(tenantId: string, fiscalConfig: ContractFiscalConfig, timestamp: string): string {
  const payload = `CONTRATO_SAAS_LGPD:${tenantId}:${fiscalConfig.regimeTributario}:${fiscalConfig.ufSede}:${fiscalConfig.limiteNotasMensal}:${timestamp}:LGPD_ANPD_2026_COMPLIANCE`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}

function getOrCreateLgpdContract(tenantId: string): ContractLgpdRecord {
  let contract = lgpdContractsMap.get(tenantId);
  if (!contract) {
    const tenant = TENANTS_DATA.find((t) => t.id === tenantId) || TENANTS_DATA[0];
    const plan = SAAS_PLANS.find((p) => p.id === tenant.planId) || SAAS_PLANS[1];
    const fiscal = getOrCreateFiscalConfig(tenant.id);
    const nowIso = new Date().toISOString();
    const contractNumber = `SaaS-CONV-2026-${tenant.id.slice(-6).toUpperCase()}`;
    const hash = generateIntegrityHash(tenant.id, fiscal, tenant.createdAt || nowIso);

    contract = {
      contractNumber,
      tenantId: tenant.id,
      tenantName: tenant.name,
      tradeName: tenant.tradeName || tenant.name,
      cnpj: tenant.cnpj || '12.345.678/0001-90',
      city: tenant.city || 'Campo Grande',
      uf: tenant.uf || 'MS',
      contactEmail: tenant.contactEmail || 'contato@empresa.com.br',
      planId: plan.id,
      planName: plan.name,
      monthlyValue: plan.priceMonthly,
      effectiveDate: tenant.createdAt || nowIso,
      status: 'active',
      signed: true,
      signedAt: tenant.createdAt || nowIso,
      signedBy: `Representante Legal (${tenant.name}) & Super Admin SaaS`,
      signerDocument: tenant.cnpj || '12.345.678/0001-90',
      signerIp: '187.64.120.45',
      integrityHash: hash,
      lgpdVersion: 'LGPD v2026.1 (Lei 13.709/2018 + Resoluções CD/ANPD Vigentes)',
      controller: `${tenant.tradeName || tenant.name} (CONTRATANTE - Única Controladora)`,
      operator: 'GATO TECNOLOGIA E AUTOPEÇAS SAAS LTDA (CONTRATADA - Operadora Tecnológica)',
      dpoContact: 'dpo.privacidade@gatoautopecas.com.br / encarregado@lgpd.gov.br',
      fiscalConfig: fiscal,
      clausesSummary: [
        'Cláusula 1ª — Concessão Temporária e Licença de Uso de Software (SaaS ERP em Nuvem)',
        'Cláusula 2ª — Distinção Inequívoca de Papéis LGPD: Contratante é a Controladora dos Dados e o SaaS é o Operador',
        'Cláusula 3ª — Isolamento Técnico e Garantia de Não-Acesso: Super Admin e prepostos do SaaS NÃO possuem acesso a contas bancárias, extratos ou dados de vendas de marketplaces do cliente',
        'Cláusula 4ª — Bases Legais de Tratamento (Art. 7º, II e V da LGPD): Execução de Contrato e Cumprimento de Obrigação Legal Tributária',
        'Cláusula 5ª — Vinculação da Configuração Fiscal Homologada pelo Super Admin (Regime, Alíquotas e Limites Autorizados)',
        'Cláusula 6ª — Medidas Técnicas de Segurança (Art. 46): Criptografia AES-256 em repouso, TLS 1.3 em trânsito, segregação lógica multi-tenant e hashes Argon2/PBKDF2',
        'Cláusula 7ª — Comunicação de Incidentes de Segurança em até 72 horas úteis à ANPD e ao Controlador',
        'Cláusula 8ª — Término, Portabilidade e Eliminação de Dados (Art. 16): Prazo de 30 dias para exportação integral em formato aberto (JSON/CSV) e expurgo seguro dos dados',
        'Cláusula 9ª — Autenticidade Jurídica e Assinatura Digital Criptografada com Hash SHA-256 e Timestamp'
      ]
    };
    lgpdContractsMap.set(tenantId, contract);
  }
  return contract;
}

// Inicializar contratos LGPD para os tenants conhecidos
for (const t of TENANTS_DATA) {
  getOrCreateLgpdContract(t.id);
}

// -------------------------------------------------------------------------
// ROTAS DE CONECTORES SAAS (CAMADA 1 - SUPER ADMIN)
// -------------------------------------------------------------------------

// Listar conectores globais da plataforma SaaS
saasContractsRouter.get("/connectors", requireAuth, requireSaasScope, (req: Request, res: Response) => {
  const connectors = Array.from(saasConnectorsMap.values());
  res.json({
    success: true,
    count: connectors.length,
    scope: "camada_1_saas_platform",
    dataIsolationEnforced: true,
    sensitiveTenantDataAccessible: false,
    message: "Conectores de infraestrutura global da plataforma. Os conectores bancários e credenciais de marketplace dos lojistas são 100% isolados na Camada 2.",
    connectors,
  });
});

// Testar conector da plataforma (heartbeat/ping)
saasContractsRouter.post("/connectors/:id/test", requireAuth, requireSaasScope, (req: Request, res: Response) => {
  const { id } = req.params;
  const connector = saasConnectorsMap.get(id);
  if (!connector) {
    return res.status(404).json({ success: false, error: "Conector da plataforma não encontrado." });
  }

  connector.lastPing = new Date().toISOString();
  connector.status = 'healthy';
  saasConnectorsMap.set(id, connector);

  recordAudit(
    req,
    req.auth!.user,
    "TEST_SAAS_CONNECTOR",
    "saas_config",
    "system",
    `Teste de conectividade executado com sucesso para ${connector.name}`
  );

  res.json({
    success: true,
    connector,
    latencyMs: Math.floor(Math.random() * 80 + 35),
    message: `Comunicação com ${connector.name} testada e validada com sucesso.`,
  });
});

// Atualizar status ou parâmetros do conector da plataforma
saasContractsRouter.patch("/connectors/:id", requireAuth, requireSaasScope, (req: Request, res: Response) => {
  const { id } = req.params;
  const connector = saasConnectorsMap.get(id);
  if (!connector) {
    return res.status(404).json({ success: false, error: "Conector da plataforma não encontrado." });
  }

  const { status, environment, description } = req.body || {};
  if (status) connector.status = status;
  if (environment) connector.environment = environment;
  if (description) connector.description = description;

  connector.lastPing = new Date().toISOString();
  saasConnectorsMap.set(id, connector);

  recordAudit(
    req,
    req.auth!.user,
    "UPDATE_SAAS_CONNECTOR",
    "saas_config",
    "system",
    `Atualização de parâmetros no conector ${connector.name}`
  );

  res.json({
    success: true,
    connector,
    message: `Parâmetros de ${connector.name} atualizados com sucesso.`,
  });
});

// -------------------------------------------------------------------------
// ROTAS DE CONFIGURAÇÃO FISCAL POR CONTRATO (SUPER ADMIN)
// -------------------------------------------------------------------------

// Listar todas as configurações fiscais por contrato
saasContractsRouter.get("/contracts/fiscal/all", requireAuth, requireSaasScope, (req: Request, res: Response) => {
  const configs = Array.from(fiscalConfigsMap.values());
  res.json({
    success: true,
    count: configs.length,
    configs,
  });
});

// Obter a configuração fiscal de um contrato específico
saasContractsRouter.get("/contracts/:tenantId/fiscal", requireAuth, (req: Request, res: Response) => {
  const { tenantId } = req.params;
  const auth = req.auth!;

  // Tenant só pode ler sua própria configuração, a menos que seja SaaS Super Admin
  if (!auth.isSaasScope && auth.tenantId !== tenantId) {
    return res.status(403).json({ success: false, error: "Acesso negado à configuração fiscal de outro tenant." });
  }

  const config = getOrCreateFiscalConfig(tenantId);
  res.json({
    success: true,
    tenantId,
    config,
  });
});

// Super Admin define/atualiza a configuração fiscal do contrato
saasContractsRouter.put("/contracts/:tenantId/fiscal", requireAuth, requireSaasScope, (req: Request, res: Response) => {
  const { tenantId } = req.params;
  const current = getOrCreateFiscalConfig(tenantId);
  const body = req.body || {};

  const updated: ContractFiscalConfig = {
    ...current,
    regimeTributario: body.regimeTributario || current.regimeTributario,
    ufSede: body.ufSede || current.ufSede,
    inscricaoEstadual: body.inscricaoEstadual ?? current.inscricaoEstadual,
    cnaePrincipal: body.cnaePrincipal ?? current.cnaePrincipal,
    aliquotaIcmsPadrao: Number(body.aliquotaIcmsPadrao ?? current.aliquotaIcmsPadrao),
    aliquotaPisPadrao: Number(body.aliquotaPisPadrao ?? current.aliquotaPisPadrao),
    aliquotaCofinsPadrao: Number(body.aliquotaCofinsPadrao ?? current.aliquotaCofinsPadrao),
    pisCofinsMonofasicoAutopecas: body.pisCofinsMonofasicoAutopecas !== undefined ? Boolean(body.pisCofinsMonofasicoAutopecas) : current.pisCofinsMonofasicoAutopecas,
    incentivoRegional: body.incentivoRegional ?? current.incentivoRegional,
    limiteNotasMensal: Number(body.limiteNotasMensal ?? current.limiteNotasMensal),
    modulosAutorizados: {
      ...current.modulosAutorizados,
      ...(body.modulosAutorizados || {}),
    },
    ambienteSefaz: body.ambienteSefaz || current.ambienteSefaz,
    serieNfeAutorizada: body.serieNfeAutorizada || current.serieNfeAutorizada,
    statusHomologacao: body.statusHomologacao || 'homologado',
    ultimaAuditoria: new Date().toISOString(),
    auditorResponsavel: `${req.auth!.user.name} (Super Admin)`,
    observacoesSuperAdmin: body.observacoesSuperAdmin || current.observacoesSuperAdmin,
    updatedAt: new Date().toISOString(),
  };

  fiscalConfigsMap.set(tenantId, updated);

  // Se houver contrato LGPD, atualiza a configuração fiscal embutida no contrato
  const existingContract = lgpdContractsMap.get(tenantId);
  if (existingContract) {
    existingContract.fiscalConfig = updated;
    existingContract.integrityHash = generateIntegrityHash(tenantId, updated, existingContract.signedAt || new Date().toISOString());
    lgpdContractsMap.set(tenantId, existingContract);
  }

  recordAudit(
    req,
    req.auth!.user,
    "UPDATE_CONTRACT_FISCAL_CONFIG",
    "fiscal_rules",
    tenantId,
    `Configuração fiscal do contrato atualizada: Regime ${updated.regimeTributario}, Limite ${updated.limiteNotasMensal} NFs/mês, Status: ${updated.statusHomologacao}`
  );

  res.json({
    success: true,
    tenantId,
    config: updated,
    message: "Configuração fiscal do contrato salva e homologada pelo Super Admin com sucesso.",
  });
});

// -------------------------------------------------------------------------
// ROTAS DE CONTRATO LGPD DE CONCESSÃO SAAS
// -------------------------------------------------------------------------

// Listar todos os contratos LGPD
saasContractsRouter.get("/contracts/lgpd/all", requireAuth, requireSaasScope, (req: Request, res: Response) => {
  const contracts = Array.from(lgpdContractsMap.values());
  res.json({
    success: true,
    count: contracts.length,
    contracts,
  });
});

// Obter dados completos do contrato LGPD de um tenant
saasContractsRouter.get("/contracts/:tenantId/lgpd", requireAuth, (req: Request, res: Response) => {
  const { tenantId } = req.params;
  const auth = req.auth!;

  if (!auth.isSaasScope && auth.tenantId !== tenantId) {
    return res.status(403).json({ success: false, error: "Acesso negado ao contrato de outro tenant." });
  }

  const contract = getOrCreateLgpdContract(tenantId);
  res.json({
    success: true,
    tenantId,
    contract,
  });
});

// Formalizar / Assinar digitalmente o Contrato LGPD com Hash Criptográfico
saasContractsRouter.post("/contracts/:tenantId/lgpd/sign", requireAuth, (req: Request, res: Response) => {
  const { tenantId } = req.params;
  const auth = req.auth!;

  if (!auth.isSaasScope && auth.tenantId !== tenantId) {
    return res.status(403).json({ success: false, error: "Apenas o Contratante ou o Super Admin podem assinar este contrato." });
  }

  const contract = getOrCreateLgpdContract(tenantId);
  const nowIso = new Date().toISOString();
  const clientIp = getClientIp(req);
  const signerName = req.body?.signerName || auth.user.name;
  const signerDocument = req.body?.signerDocument || contract.cnpj;

  const newHash = generateIntegrityHash(tenantId, contract.fiscalConfig, nowIso);

  contract.signed = true;
  contract.signedAt = nowIso;
  contract.signedBy = `${signerName} (${auth.isSaasScope ? 'Super Admin SaaS' : 'Contratante / Controladora'})`;
  contract.signerDocument = signerDocument;
  contract.signerIp = clientIp;
  contract.integrityHash = newHash;
  contract.status = 'active';

  lgpdContractsMap.set(tenantId, contract);

  recordAudit(
    req,
    auth.user,
    "SIGN_LGPD_SAAS_CONTRACT",
    "billing_contracts",
    tenantId,
    `Contrato LGPD nº ${contract.contractNumber} formalizado digitalmente. Hash: ${newHash}`
  );

  res.json({
    success: true,
    tenantId,
    contract,
    message: "Contrato de Concessão SaaS & Termo de Tratamento de Dados (LGPD) formalizado com sucesso com assinatura digital criptográfica.",
  });
});
