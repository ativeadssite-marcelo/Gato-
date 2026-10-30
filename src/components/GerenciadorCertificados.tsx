// =========================================================================
// GERENCIADOR DE CERTIFICADOS DIGITAIS A1 E A3 (PASTAS CRIPTOGRAFADAS)
// =========================================================================

import React, { useState, useEffect, useMemo } from 'react';
import {
  FolderLock,
  KeyRound,
  ShieldCheck,
  FileKey,
  HardDrive,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  Search,
  Plus,
  Trash2,
  ExternalLink,
  Lock,
  Unlock,
  Radio,
  Server,
  Building2,
  Shield,
  FileCheck2,
  Check,
  X,
  HelpCircle,
  Download,
  Terminal,
  Activity,
  Layers,
  Sparkles,
  ChevronRight,
  FolderOpen,
  ArrowRight
} from 'lucide-react';
import { apiJson } from '../services/apiClient';
import type { 
  DigitalCertificateRecord, 
  CertificateType, 
  CertificateStats, 
  SefazCheckResult 
} from '../types/certificate';
import type { UserSession } from '../types';

interface EncryptedVaultFolder {
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

interface Props {
  userSession: UserSession | null;
  onShowNotification?: (title: string, message: string, type?: 'success' | 'warning' | 'info') => void;
}

const LOCAL_CERT_FOLDERS_KEY = 'gato_certificates_folders_v1';

function computeStatsFromFolders(folders: EncryptedVaultFolder[]): CertificateStats {
  const certs = folders.flatMap((f) => f.certificates || []);
  const clientTenants = new Set(certs.filter((c) => !c.isPlatformSaas).map((c) => c.tenantId));
  return {
    total: certs.length,
    totalA1: certs.filter((c) => c.type === 'A1').length,
    totalA3: certs.filter((c) => c.type === 'A3').length,
    valid: certs.filter((c) => c.status === 'valid').length,
    expiringSoon: certs.filter((c) => c.status === 'expiring_soon').length,
    expired: certs.filter((c) => c.status === 'expired').length,
    totalTenantsWithCert: clientTenants.size,
  };
}

function loadLocalFolders(isSaas: boolean): EncryptedVaultFolder[] {
  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(LOCAL_CERT_FOLDERS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as EncryptedVaultFolder[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          return isSaas ? parsed : parsed.filter((f) => f.ownerType === 'client_tenant');
        }
      }
    } catch {
      /* noop */
    }
  }
  const now = new Date();
  const expSaas = new Date(now.getTime() + 290 * 24 * 60 * 60 * 1000).toISOString();
  const expClient = new Date(now.getTime() + 185 * 24 * 60 * 60 * 1000).toISOString();
  const defaults: EncryptedVaultFolder[] = [
    {
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
      lastActivity: now.toISOString(),
      totalA1: 1,
      totalA3: 0,
      hasExpiringSoon: false,
      hasExpired: false,
      isCurrentUserFolder: true,
      certificates: [
        {
          id: 'cert_saas_platform_01',
          tenantId: 'system',
          tenantName: 'GATO Tecnologia & Plataforma SaaS',
          branchName: 'SaaS Central & Faturamento',
          type: 'A1',
          storageType: 'pfx_upload',
          alias: 'Certificado A1 Oficial GATO SaaS (NFS-e & Assinador)',
          cnpj: '45.987.654/0001-30',
          corporateName: 'GATO TECNOLOGIA E GESTAO AUTOMOTIVA LTDA',
          serialNumber: '7B:44:91:0E:52:8A:2C:19',
          issuer: 'AC CERTISIGN MULTIPLA G7 (ICP-Brasil)',
          issuedAt: now.toISOString(),
          expiresAt: expSaas,
          status: 'valid',
          daysRemaining: 290,
          hasFile: true,
          fileName: 'gato_tecnologia_a1_2026.pfx',
          fileSizeBytes: 8420,
          uploadedAt: now.toISOString(),
          uploadedBy: 'contato.ativeads@gmail.com',
          passwordProtected: true,
          passwordHint: 'Senha corporativa configurada',
          isPlatformSaas: true,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        },
      ],
    },
    {
      id: 'folder_tenant_cmtt58e6o0000ju346a0g6s32',
      tenantId: 'cmtt58e6o0000ju346a0g6s32',
      name: 'Cofre Criptografado — MGN Autopeças Matriz',
      tradeName: 'MGN Autopeças Matriz',
      cnpj: '12.345.678/0001-90',
      city: 'São Paulo',
      uf: 'SP',
      ownerType: 'client_tenant',
      ownerLabel: 'Cliente Contratante (Camada 2)',
      encryptionAlgorithm: 'AES-256-GCM com Segregação por Tenant (LGPD)',
      vaultStatus: 'ready',
      lastActivity: now.toISOString(),
      totalA1: 1,
      totalA3: 0,
      hasExpiringSoon: false,
      hasExpired: false,
      isCurrentUserFolder: !isSaas,
      certificates: [
        {
          id: 'cert_mgn_matriz_a1',
          tenantId: 'cmtt58e6o0000ju346a0g6s32',
          tenantName: 'MGN Autopeças Matriz',
          branchName: 'Matriz – São Paulo (SP)',
          type: 'A1',
          storageType: 'pfx_upload',
          alias: 'Certificado A1 Matriz SP (Emissão NF-e / NFC-e)',
          cnpj: '12.345.678/0001-90',
          corporateName: 'MGN COMERCIO DE AUTO PECAS E DISTRIBUIDORA LTDA',
          serialNumber: '4A:19:F8:33:E1:72:00:B4',
          issuer: 'AC SERASA RFB v5 (ICP-Brasil)',
          issuedAt: now.toISOString(),
          expiresAt: expClient,
          status: 'valid',
          daysRemaining: 185,
          hasFile: true,
          fileName: 'mgn_autopecas_a1_2026.pfx',
          fileSizeBytes: 9120,
          uploadedAt: now.toISOString(),
          uploadedBy: 'carlos@mgnautopecas.com.br',
          passwordProtected: true,
          passwordHint: 'Inicial M + ano fundação',
          isPlatformSaas: false,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        },
      ],
    },
  ];
  return isSaas ? defaults : defaults.filter((f) => f.ownerType === 'client_tenant');
}

function saveLocalFolders(folders: EncryptedVaultFolder[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_CERT_FOLDERS_KEY, JSON.stringify(folders));
  } catch {
    /* noop */
  }
}

export const GerenciadorCertificados: React.FC<Props> = ({ userSession, onShowNotification }) => {
  const [folders, setFolders] = useState<EncryptedVaultFolder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>('');
  const [stats, setStats] = useState<CertificateStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'A1' | 'A3'>('ALL');
  
  // Modais
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isA3GuideOpen, setIsA3GuideOpen] = useState(false);
  const [testingCertId, setTestingCertId] = useState<string | null>(null);
  const [testingA3Id, setTestingA3Id] = useState<string | null>(null);
  const [certToDelete, setCertToDelete] = useState<DigitalCertificateRecord | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    targetTenantId: string;
    isPlatformSaas: boolean;
    type: CertificateType;
    alias: string;
    cnpj: string;
    corporateName: string;
    branchName: string;
    expiresAt: string;
    passwordHint: string;
    passwordCert: string;
    a3MediaType: 'token_usb' | 'smart_card' | 'cloud';
    a3ProviderName: string;
    a3BridgeHost: string;
    fileName: string;
    pfxBase64: string;
    notes: string;
  }>({
    targetTenantId: '',
    isPlatformSaas: false,
    type: 'A1',
    alias: '',
    cnpj: '',
    corporateName: '',
    branchName: 'Matriz Principal',
    expiresAt: '',
    passwordHint: '',
    passwordCert: '',
    a3MediaType: 'token_usb',
    a3ProviderName: 'SafeNet Authentication Client (SAC)',
    a3BridgeHost: 'http://localhost:8088',
    fileName: '',
    pfxBase64: '',
    notes: '',
  });

  const isSaas = !!userSession?.isSaasScope;

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await apiJson<{
        success: boolean;
        folders: EncryptedVaultFolder[];
        stats: CertificateStats;
      }>('/api/certificates/folders');

      setFolders(res.folders || []);
      setStats(res.stats || null);
      if (res.folders && res.folders.length > 0) {
        saveLocalFolders(res.folders);
        if (!selectedFolderId || !res.folders.some(f => f.id === selectedFolderId)) {
          setSelectedFolderId(res.folders[0].id);
        }
      }
    } catch {
      const fallback = loadLocalFolders(isSaas);
      setFolders(fallback);
      setStats(computeStatsFromFolders(fallback));
      if (fallback.length > 0 && (!selectedFolderId || !fallback.some(f => f.id === selectedFolderId))) {
        setSelectedFolderId(fallback[0].id);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const activeFolder = useMemo(() => {
    return folders.find(f => f.id === selectedFolderId) || folders[0] || null;
  }, [folders, selectedFolderId]);

  const displayedCertificates = useMemo(() => {
    if (!activeFolder) return [];
    let list = activeFolder.certificates || [];
    
    if (filterType !== 'ALL') {
      list = list.filter(c => c.type === filterType);
    }

    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      list = list.filter(c => 
        c.alias.toLowerCase().includes(q) ||
        c.cnpj.includes(q) ||
        c.corporateName.toLowerCase().includes(q) ||
        (c.fileName && c.fileName.toLowerCase().includes(q))
      );
    }

    return list;
  }, [activeFolder, filterType, searchFilter]);

  // Executar teste SEFAZ
  const handleTestSefaz = async (cert: DigitalCertificateRecord) => {
    setTestingCertId(cert.id);
    try {
      const uf = activeFolder?.uf || 'SP';
      const res = await apiJson<{
        success: boolean;
        sefazResult: SefazCheckResult;
        message: string;
      }>(`/api/certificates/${cert.id}/test-sefaz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uf }),
      });

      onShowNotification?.('Teste SEFAZ Concluído', res.message, res.sefazResult.status === 'online' ? 'success' : 'warning');
      void loadData();
    } catch (e: any) {
      onShowNotification?.('Falha no Teste SEFAZ', e?.message || 'Erro ao conectar à SEFAZ.', 'warning');
    } finally {
      setTestingCertId(null);
    }
  };

  // Executar ping no Token A3
  const handleTestA3 = async (cert: DigitalCertificateRecord) => {
    setTestingA3Id(cert.id);
    try {
      const res = await apiJson<{
        success: boolean;
        bridgeStatus: string;
        message: string;
      }>(`/api/certificates/${cert.id}/a3-ping`, {
        method: 'POST',
      });

      onShowNotification?.('Agente Bridge A3', res.message, res.bridgeStatus === 'online' ? 'success' : 'warning');
      void loadData();
    } catch (e: any) {
      onShowNotification?.('Falha na comunicação A3', e?.message || 'Agente local não respondeu.', 'warning');
    } finally {
      setTestingA3Id(null);
    }
  };

  // Exclusão de Certificado
  const handleDeleteConfirm = async () => {
    if (!certToDelete) return;
    try {
      const res = await apiJson<{ success: boolean; message: string }>(`/api/certificates/${certToDelete.id}`, {
        method: 'DELETE',
      });
      onShowNotification?.('Cofre Atualizado', res.message, 'info');
      setCertToDelete(null);
      void loadData();
    } catch (e: any) {
      onShowNotification?.('Erro ao remover', e?.message || 'Não foi possível excluir o certificado.', 'warning');
    }
  };

  // Leitura de arquivo .pfx para base64
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pfx') && !file.name.toLowerCase().endsWith('.p12')) {
      onShowNotification?.('Formato Inválido', 'Selecione um arquivo de certificado digital .PFX ou .P12.', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setFormData(prev => ({
        ...prev,
        fileName: file.name,
        pfxBase64: base64,
        alias: prev.alias || file.name.replace(/\.[^/.]+$/, '').toUpperCase(),
      }));
      onShowNotification?.('Arquivo Carregado', `Certificado ${file.name} pronto para criptografia e armazenamento.`, 'success');
    };
    reader.readAsDataURL(file);
  };

  // Envio do formulário
  const handleSaveCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.alias.trim() || !formData.cnpj.trim()) {
      onShowNotification?.('Campos Obrigatórios', 'Informe o Apelido e o CNPJ do Certificado.', 'warning');
      return;
    }

    try {
      const payload = {
        targetTenantId: formData.isPlatformSaas ? 'system' : (formData.targetTenantId || activeFolder?.tenantId),
        isPlatformSaas: formData.isPlatformSaas,
        type: formData.type,
        alias: formData.alias,
        cnpj: formData.cnpj,
        corporateName: formData.corporateName || (formData.isPlatformSaas ? 'GATO Tecnologia SaaS' : activeFolder?.name),
        branchName: formData.branchName,
        expiresAt: formData.expiresAt,
        passwordHint: formData.passwordHint,
        fileName: formData.fileName,
        pfxBase64: formData.pfxBase64,
        a3Config: formData.type === 'A3' ? {
          mediaType: formData.a3MediaType,
          providerName: formData.a3ProviderName,
          bridgeHost: formData.a3BridgeHost,
          slotIndex: 0,
        } : undefined,
        notes: formData.notes,
      };

      const res = await apiJson<{ success: boolean; message: string }>('/api/certificates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      onShowNotification?.('Certificado Salvo', res.message, 'success');
      setIsAddModalOpen(false);
      // Reset form
      setFormData({
        targetTenantId: '',
        isPlatformSaas: false,
        type: 'A1',
        alias: '',
        cnpj: '',
        corporateName: '',
        branchName: 'Matriz Principal',
        expiresAt: '',
        passwordHint: '',
        passwordCert: '',
        a3MediaType: 'token_usb',
        a3ProviderName: 'SafeNet Authentication Client (SAC)',
        a3BridgeHost: 'http://localhost:8088',
        fileName: '',
        pfxBase64: '',
        notes: '',
      });
      void loadData();
    } catch (err: any) {
      onShowNotification?.('Falha ao salvar', err?.message || 'Não foi possível cadastrar o certificado.', 'warning');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* HEADER PRINCIPAL */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 p-6 md:p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-black uppercase tracking-wider">
              <FolderLock className="w-3.5 h-3.5" />
              <span>Cofre Criptografado de Certificados Digitais</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <span>Pastas de Certificados A1 & A3</span>
              <span className="text-xs px-2.5 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                AES-256-GCM
              </span>
            </h1>
            <p className="text-slate-300 text-xs md:text-sm leading-relaxed">
              Armazenamento seguro, blindado e segregado por contrato de arquivos <strong>A1 (.pfx/.p12)</strong> e conexão com <strong>Tokens Físicos A3 (USB / Cartão / Nuvem)</strong> para emissão de NF-e, NFC-e e MDF-e junto à SEFAZ.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsA3GuideOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 font-bold text-xs transition cursor-pointer"
            >
              <HardDrive className="w-4 h-4 text-amber-400" />
              <span>Como Usar Token A3</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setFormData(prev => ({
                  ...prev,
                  isPlatformSaas: activeFolder?.ownerType === 'platform_saas',
                  targetTenantId: activeFolder?.tenantId || '',
                  cnpj: activeFolder?.cnpj || '',
                  corporateName: activeFolder?.tradeName || activeFolder?.name || '',
                }));
                setIsAddModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-lg shadow-indigo-600/30 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Certificado</span>
            </button>
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-700 border border-slate-700 text-slate-300 transition cursor-pointer disabled:opacity-50"
              title="Recarregar Cofre"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* STATS BAR */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-6 border-t border-indigo-500/20 text-xs">
            <div className="bg-slate-950/40 p-3 rounded-2xl border border-indigo-500/20">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Total de Certificados</span>
              <span className="text-xl font-black text-white">{stats.total}</span>
            </div>
            <div className="bg-slate-950/40 p-3 rounded-2xl border border-indigo-500/20">
              <span className="text-[10px] text-indigo-300 font-bold uppercase block">Arquivos A1 (.pfx)</span>
              <span className="text-xl font-black text-indigo-400">{stats.totalA1}</span>
            </div>
            <div className="bg-slate-950/40 p-3 rounded-2xl border border-indigo-500/20">
              <span className="text-[10px] text-amber-300 font-bold uppercase block">Tokens A3 (USB)</span>
              <span className="text-xl font-black text-amber-400">{stats.totalA3}</span>
            </div>
            <div className="bg-slate-950/40 p-3 rounded-2xl border border-emerald-500/20">
              <span className="text-[10px] text-emerald-400 font-bold uppercase block">Válidos & Ativos</span>
              <span className="text-xl font-black text-emerald-400">{stats.valid}</span>
            </div>
            <div className="bg-slate-950/40 p-3 rounded-2xl border border-amber-500/20">
              <span className="text-[10px] text-amber-400 font-bold uppercase block">Vencendo &lt; 30 dias</span>
              <span className="text-xl font-black text-amber-400">{stats.expiringSoon}</span>
            </div>
            <div className="bg-slate-950/40 p-3 rounded-2xl border border-rose-500/20">
              <span className="text-[10px] text-rose-400 font-bold uppercase block">Expirados</span>
              <span className="text-xl font-black text-rose-400">{stats.expired}</span>
            </div>
          </div>
        )}
      </div>

      {/* EXPLORER LAYOUT: PASTAS À ESQUERDA, CERTIFICADOS À DIREITA */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* COLUNA ESQUERDA: LISTA DE PASTAS CRIPTOGRAFADAS */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-indigo-600" />
                <span>Pastas Criptografadas</span>
              </h2>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                {folders.length} {folders.length === 1 ? 'pasta' : 'pastas'}
              </span>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              {isSaas 
                ? 'Selecione abaixo a Pasta da Plataforma (SaaS) ou a pasta de cada cliente para gerenciar os certificados vinculados:'
                : 'Sua empresa possui um cofre criptografado exclusivo com isolamento de dados LGPD:'}
            </p>

            <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1">
              {folders.map(folder => {
                const isSelected = folder.id === selectedFolderId;
                const isSaasVault = folder.ownerType === 'platform_saas';

                return (
                  <div
                    key={folder.id}
                    onClick={() => setSelectedFolderId(folder.id)}
                    className={`p-3.5 rounded-2xl border transition cursor-pointer text-left relative overflow-hidden group ${
                      isSelected
                        ? isSaasVault
                          ? 'bg-purple-950/90 border-purple-500 text-white shadow-md'
                          : 'bg-indigo-950/90 border-indigo-500 text-white shadow-md'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2.5 rounded-xl shrink-0 ${
                        isSelected 
                          ? isSaasVault ? 'bg-purple-600 text-white' : 'bg-indigo-600 text-white'
                          : isSaasVault ? 'bg-purple-100 text-purple-700' : 'bg-slate-200 text-slate-700'
                      }`}>
                        <FolderLock className="w-5 h-5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                            isSaasVault
                              ? 'bg-purple-500/30 text-purple-300 border border-purple-500/40'
                              : isSelected
                                ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-500/40'
                                : 'bg-slate-200 text-slate-700'
                          }`}>
                            {isSaasVault ? 'Meu Cofre • Dono SaaS' : 'Cliente Contratante'}
                          </span>

                          <div className="flex items-center gap-1">
                            {folder.hasExpiringSoon && (
                              <span className="w-2 h-2 rounded-full bg-amber-400" title="Possui certificado a vencer" />
                            )}
                            {folder.hasExpired && (
                              <span className="w-2 h-2 rounded-full bg-rose-500" title="Possui certificado expirado" />
                            )}
                          </div>
                        </div>

                        <h3 className={`text-xs font-black truncate ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                          {folder.tradeName || folder.name}
                        </h3>

                        <p className={`text-[11px] truncate mt-0.5 ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                          CNPJ: {folder.cnpj} {folder.uf ? `• ${folder.uf}` : ''}
                        </p>

                        <div className="flex items-center gap-3 mt-2 text-[10px]">
                          <span className={isSelected ? 'text-indigo-200' : 'text-slate-600'}>
                            <strong>{folder.certificates.length}</strong> {folder.certificates.length === 1 ? 'cert' : 'certs'}
                          </span>
                          <span className="opacity-40">•</span>
                          <span className={isSelected ? 'text-indigo-200' : 'text-slate-500'}>
                            A1: {folder.totalA1} | A3: {folder.totalA3}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* BANNER DE SEGURANÇA E BLINDAGEM */}
          <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 text-white text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-emerald-400">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Conformidade ICP-Brasil & LGPD</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              As chaves privadas dos arquivos A1 são encriptadas em repouso com algoritmo AES-256 e protegidas por envelope de segurança. Os tokens A3 nunca trafegam chaves privadas na rede.
            </p>
          </div>
        </div>

        {/* COLUNA DIREITA: CONTEÚDO DA PASTA SELECIONADA */}
        <div className="lg:col-span-8 space-y-4">
          {activeFolder ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-6">
              
              {/* CABEÇALHO DA PASTA ATIVA */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                <div className="flex items-start gap-3">
                  <div className={`p-3 rounded-2xl shrink-0 ${
                    activeFolder.ownerType === 'platform_saas'
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                      : 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  }`}>
                    <FolderLock className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                        activeFolder.ownerType === 'platform_saas'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-indigo-100 text-indigo-800'
                      }`}>
                        {activeFolder.ownerLabel}
                      </span>
                      <span className="text-xs text-slate-500 font-mono">
                        CNPJ: {activeFolder.cnpj}
                      </span>
                    </div>
                    <h2 className="text-lg md:text-xl font-black text-slate-900 mt-1">
                      {activeFolder.tradeName || activeFolder.name}
                    </h2>
                    <p className="text-xs text-slate-500">
                      Criptografia: <span className="font-semibold text-slate-700">{activeFolder.encryptionAlgorithm}</span>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({
                      ...prev,
                      isPlatformSaas: activeFolder.ownerType === 'platform_saas',
                      targetTenantId: activeFolder.tenantId,
                      cnpj: activeFolder.cnpj,
                      corporateName: activeFolder.tradeName || activeFolder.name,
                    }));
                    setIsAddModalOpen(true);
                  }}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition cursor-pointer shrink-0 shadow-xs"
                >
                  <Plus className="w-4 h-4 text-emerald-400" />
                  <span>Novo Certificado Nesta Pasta</span>
                </button>
              </div>

              {/* BARRA DE FILTROS E BUSCA INTERNA */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={e => setSearchFilter(e.target.value)}
                    placeholder="Filtrar nesta pasta..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-full sm:w-auto justify-center">
                  <button
                    type="button"
                    onClick={() => setFilterType('ALL')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      filterType === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Todos ({activeFolder.certificates.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterType('A1')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                      filterType === 'A1' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-indigo-700'
                    }`}
                  >
                    <FileKey className="w-3.5 h-3.5" />
                    <span>A1 ({activeFolder.totalA1})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterType('A3')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                      filterType === 'A3' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600 hover:text-amber-700'
                    }`}
                  >
                    <HardDrive className="w-3.5 h-3.5" />
                    <span>A3 ({activeFolder.totalA3})</span>
                  </button>
                </div>
              </div>

              {/* LISTA DE CERTIFICADOS (CARDS EXPANSÍVEIS) */}
              {displayedCertificates.length === 0 ? (
                <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-3xl space-y-3">
                  <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
                    <FileKey className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-700">Nenhum certificado cadastrado nesta pasta</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Faça o upload de um certificado A1 (.pfx) ou configure um Token USB A3 para emissão de notas fiscais.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        isPlatformSaas: activeFolder.ownerType === 'platform_saas',
                        targetTenantId: activeFolder.tenantId,
                        cnpj: activeFolder.cnpj,
                        corporateName: activeFolder.tradeName || activeFolder.name,
                      }));
                      setIsAddModalOpen(true);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Adicionar Primeiro Certificado</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {displayedCertificates.map(cert => {
                    const isA1 = cert.type === 'A1';
                    const isExpiringSoon = cert.status === 'expiring_soon';
                    const isExpired = cert.status === 'expired';
                    const isA3Offline = cert.type === 'A3' && cert.a3Config?.bridgeStatus === 'offline';

                    return (
                      <div
                        key={cert.id}
                        className={`p-5 rounded-3xl border transition-all ${
                          isExpired
                            ? 'bg-rose-50/60 border-rose-200'
                            : isExpiringSoon
                              ? 'bg-amber-50/60 border-amber-200'
                              : 'bg-slate-50/80 hover:bg-slate-50 border-slate-200 shadow-2xs'
                        }`}
                      >
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                          
                          {/* INFO ESQUERDA */}
                          <div className="flex items-start gap-3.5 min-w-0 flex-1">
                            <div className={`p-3 rounded-2xl shrink-0 ${
                              isA1 
                                ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                                : 'bg-amber-100 text-amber-700 border border-amber-200'
                            }`}>
                              {isA1 ? <FileKey className="w-6 h-6" /> : <HardDrive className="w-6 h-6" />}
                            </div>

                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                                  isA1 ? 'bg-indigo-600 text-white' : 'bg-amber-600 text-white'
                                }`}>
                                  Certificado {cert.type}
                                </span>

                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                                  isExpired
                                    ? 'bg-rose-100 text-rose-800'
                                    : isExpiringSoon
                                      ? 'bg-amber-100 text-amber-900'
                                      : isA3Offline
                                        ? 'bg-orange-100 text-orange-900'
                                        : 'bg-emerald-100 text-emerald-800'
                                }`}>
                                  {isExpired ? (
                                    <>
                                      <AlertTriangle className="w-3 h-3 text-rose-600" />
                                      <span>Expirado</span>
                                    </>
                                  ) : isExpiringSoon ? (
                                    <>
                                      <Clock className="w-3 h-3 text-amber-600" />
                                      <span>Vence em {cert.daysRemaining} dias</span>
                                    </>
                                  ) : isA3Offline ? (
                                    <>
                                      <Radio className="w-3 h-3 text-orange-600 animate-pulse" />
                                      <span>Token A3 Desconectado</span>
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                      <span>Válido ({cert.daysRemaining} dias)</span>
                                    </>
                                  )}
                                </span>

                                {cert.isPlatformSaas && (
                                  <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-purple-100 text-purple-900 rounded-md">
                                    Plataforma SaaS
                                  </span>
                                )}
                              </div>

                              <h3 className="text-sm font-black text-slate-900 truncate">
                                {cert.alias}
                              </h3>

                              <p className="text-xs text-slate-600 truncate">
                                {cert.corporateName} • CNPJ: <span className="font-mono font-bold text-slate-800">{cert.cnpj}</span>
                              </p>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 pt-2 text-[11px] text-slate-500">
                                <div>
                                  Emissor: <strong className="text-slate-700">{cert.issuer}</strong>
                                </div>
                                <div>
                                  Validade: <strong className="text-slate-700">{new Date(cert.expiresAt).toLocaleDateString('pt-BR')}</strong>
                                </div>
                                <div>
                                  Série: <span className="font-mono text-slate-600">{cert.serialNumber}</span>
                                </div>
                                <div>
                                  {isA1 ? (
                                    <span>Arquivo: <strong className="text-indigo-600">{cert.fileName || 'certificado.pfx'}</strong> ({cert.fileSizeBytes ? `${Math.round(cert.fileSizeBytes / 1024)} KB` : 'Criptografado'})</span>
                                  ) : (
                                    <span>Dispositivo: <strong className="text-amber-700">{cert.a3Config?.providerName || 'Token USB'}</strong></span>
                                  )}
                                </div>
                              </div>

                              {/* SEFAZ STATUS BADGE */}
                              {cert.lastSefazCheck && (
                                <div className="mt-3 p-2.5 rounded-xl bg-white border border-slate-200/80 flex items-center justify-between gap-2 text-xs">
                                  <div className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${cert.lastSefazCheck.status === 'online' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                    <span className="text-[11px] text-slate-700">
                                      <strong>SEFAZ-{cert.lastSefazCheck.sefazUf}:</strong> {cert.lastSefazCheck.xMotivo}
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    {cert.lastSefazCheck.responseTimeMs}ms
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* AÇÕES DIREITA */}
                          <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200">
                            <button
                              type="button"
                              onClick={() => handleTestSefaz(cert)}
                              disabled={testingCertId === cert.id}
                              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                              title="Testar status do serviço na SEFAZ"
                            >
                              <Activity className={`w-3.5 h-3.5 text-emerald-400 ${testingCertId === cert.id ? 'animate-spin' : ''}`} />
                              <span>{testingCertId === cert.id ? 'Testando SEFAZ...' : 'Testar SEFAZ'}</span>
                            </button>

                            {!isA1 && (
                              <button
                                type="button"
                                onClick={() => handleTestA3(cert)}
                                disabled={testingA3Id === cert.id}
                                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                                title="Verificar conexão com o Token USB via Bridge"
                              >
                                <Radio className={`w-3.5 h-3.5 ${testingA3Id === cert.id ? 'animate-spin' : ''}`} />
                                <span>{testingA3Id === cert.id ? 'Detectando...' : 'Verificar Token A3'}</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => setCertToDelete(cert)}
                              className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition cursor-pointer"
                              title="Remover certificado do cofre"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-500">
              Selecione uma pasta à esquerda para visualizar os certificados digitais.
            </div>
          )}
        </div>
      </div>

      {/* MODAL: ADICIONAR CERTIFICADO DIGITAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 md:p-8 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-2xl">
                  <FileKey className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Novo Certificado Digital</h3>
                  <p className="text-xs text-slate-500">Armazenamento em cofre criptografado AES-256</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCertificate} className="space-y-4 pt-4 text-xs">
              
              {/* TIPO: A1 OU A3 */}
              <div>
                <label className="font-bold text-slate-700 block mb-1.5">Tipo de Certificado:</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, type: 'A1' }))}
                    className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                      formData.type === 'A1'
                        ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-500/20 text-indigo-950'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-black text-sm">Certificado A1</span>
                      <FileKey className="w-4 h-4 text-indigo-600" />
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Arquivo .PFX ou .P12 instalado no servidor na nuvem (emissão rápida e contínua).
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, type: 'A3' }))}
                    className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                      formData.type === 'A3'
                        ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-500/20 text-amber-950'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-black text-sm">Certificado A3</span>
                      <HardDrive className="w-4 h-4 text-amber-600" />
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Dispositivo físico (Token USB / Smart Card / Nuvem BirdID/SafeWeb).
                    </p>
                  </button>
                </div>
              </div>

              {/* SE SUPER ADMIN: DESTINO DA PASTA (PLATAFORMA OU CLIENTE) */}
              {isSaas && (
                <div className="p-3 bg-purple-50 rounded-2xl border border-purple-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-purple-900">Destino do Certificado:</span>
                    <label className="flex items-center gap-1.5 text-purple-950 cursor-pointer font-bold">
                      <input
                        type="checkbox"
                        checked={formData.isPlatformSaas}
                        onChange={e => setFormData(prev => ({ ...prev, isPlatformSaas: e.target.checked }))}
                        className="rounded text-purple-600"
                      />
                      <span>Cofre da Plataforma SaaS (Dono)</span>
                    </label>
                  </div>
                  {!formData.isPlatformSaas && (
                    <select
                      value={formData.targetTenantId}
                      onChange={e => {
                        const t = folders.find(f => f.tenantId === e.target.value);
                        setFormData(prev => ({
                          ...prev,
                          targetTenantId: e.target.value,
                          cnpj: t?.cnpj || prev.cnpj,
                          corporateName: t?.tradeName || t?.name || prev.corporateName,
                        }));
                      }}
                      className="w-full p-2 bg-white border border-purple-200 rounded-xl font-medium"
                    >
                      <option value="">Selecione o Cliente / Empresa Contratante</option>
                      {folders.filter(f => f.ownerType === 'client_tenant').map(f => (
                        <option key={f.tenantId} value={f.tenantId}>
                          {f.tradeName || f.name} (CNPJ: {f.cnpj})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* CAMPOS GERAIS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Apelido do Certificado *</label>
                  <input
                    type="text"
                    required
                    value={formData.alias}
                    onChange={e => setFormData(prev => ({ ...prev, alias: e.target.value }))}
                    placeholder="Ex: Matriz SP - Emissão 2026"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">CNPJ do Titular *</label>
                  <input
                    type="text"
                    required
                    value={formData.cnpj}
                    onChange={e => setFormData(prev => ({ ...prev, cnpj: e.target.value }))}
                    placeholder="00.000.000/0000-00"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              {/* CAMPOS EXCLUSIVOS DO A1 */}
              {formData.type === 'A1' ? (
                <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 space-y-3">
                  <div className="font-bold text-indigo-900 flex items-center gap-1.5">
                    <Upload className="w-4 h-4 text-indigo-600" />
                    <span>Upload do Arquivo PFX / P12:</span>
                  </div>

                  <div className="border-2 border-dashed border-indigo-200 hover:border-indigo-400 rounded-2xl p-4 text-center bg-white transition cursor-pointer relative">
                    <input
                      type="file"
                      accept=".pfx,.p12"
                      onChange={handleFileUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <FileKey className="w-6 h-6 text-indigo-500 mx-auto mb-1" />
                    <span className="font-bold text-slate-800 block text-xs">
                      {formData.fileName ? formData.fileName : 'Clique para selecionar o arquivo .PFX ou .P12'}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      O arquivo será criptografado e salvo com segurança no cofre
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Senha do Arquivo PFX *</label>
                      <input
                        type="password"
                        value={formData.passwordCert}
                        onChange={e => setFormData(prev => ({ ...prev, passwordCert: e.target.value }))}
                        placeholder="••••••••"
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Dica de Lembrete da Senha</label>
                      <input
                        type="text"
                        value={formData.passwordHint}
                        onChange={e => setFormData(prev => ({ ...prev, passwordHint: e.target.value }))}
                        placeholder="Ex: Padrão contabilidade"
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* CAMPOS EXCLUSIVOS DO A3 */
                <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-100 space-y-3">
                  <div className="font-bold text-amber-900 flex items-center gap-1.5">
                    <HardDrive className="w-4 h-4 text-amber-600" />
                    <span>Configuração do Dispositivo A3:</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Tipo de Mídia A3</label>
                      <select
                        value={formData.a3MediaType}
                        onChange={e => setFormData(prev => ({ ...prev, a3MediaType: e.target.value as any }))}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl"
                      >
                        <option value="token_usb">Token USB Físico</option>
                        <option value="smart_card">Cartão Inteligente (Smart Card)</option>
                        <option value="cloud">Nuvem (BirdID / SafeWeb / NeoID)</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Provedor / Fabricante</label>
                      <input
                        type="text"
                        value={formData.a3ProviderName}
                        onChange={e => setFormData(prev => ({ ...prev, a3ProviderName: e.target.value }))}
                        placeholder="Ex: SafeNet eToken, Serasa SAC"
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Host do Agente Local Bridge</label>
                    <input
                      type="text"
                      value={formData.a3BridgeHost}
                      onChange={e => setFormData(prev => ({ ...prev, a3BridgeHost: e.target.value }))}
                      placeholder="http://localhost:8088"
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-mono"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Endereço do agente local instalado na máquina do balcão para ler o token USB via navegador.
                    </span>
                  </div>
                </div>
              )}

              {/* DATA DE VALIDADE */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Data de Expiração (Opcional - extraída do certificado)</label>
                <input
                  type="date"
                  value={formData.expiresAt}
                  onChange={e => setFormData(prev => ({ ...prev, expiresAt: e.target.value }))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              {/* BOTÕES DO MODAL */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold shadow-md shadow-indigo-600/20 transition cursor-pointer"
                >
                  Salvar no Cofre
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: GUIA TOKEN A3 */}
      {isA3GuideOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-black text-slate-900">Como Funciona o Certificado A3 no GATO SaaS</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsA3GuideOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <p>
                Os certificados A3 residem fisicamente em um <strong>Token USB</strong> ou <strong>Cartão Smart Card</strong>, impossibilitando a exportação da chave privada para a nuvem por exigência da ICP-Brasil.
              </p>
              
              <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-amber-950 space-y-2">
                <span className="font-extrabold text-xs block">Para assinar notas fiscais com A3 via navegador:</span>
                <ol className="list-decimal pl-4 space-y-1.5 text-[11px]">
                  <li>Conecte o Token USB ou leitora na máquina onde está emitindo a NF-e.</li>
                  <li>Instale os drivers da certificadora (ex: SafeNet Authentication Client ou Serasa SAC).</li>
                  <li>Inicie o <strong>Agente Local Bridge GATO</strong> (porta padrão <code className="font-mono bg-white px-1 rounded">http://localhost:8088</code>).</li>
                  <li>Ao clicar em <em>Emitir NF-e</em>, o GATO SaaS envia o XML para o agente local assinar diretamente no chip do token e transmiti-lo à SEFAZ.</li>
                </ol>
              </div>

              <p className="text-[11px] text-slate-500">
                <strong>Dica Pro:</strong> Para evitar que a emissão pare se alguém esquecer o token desconectado, recomendamos o certificado <strong>A1</strong> instalado no cofre da nuvem.
              </p>
            </div>

            <div className="pt-2 text-right">
              <button
                type="button"
                onClick={() => setIsA3GuideOpen(false)}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAÇÃO DE EXCLUSÃO */}
      {certToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="p-3 bg-rose-100 text-rose-700 rounded-2xl w-fit">
              <Trash2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-black text-slate-900">Remover Certificado Digital?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Deseja realmente excluir <strong>{certToDelete.alias}</strong> ({certToDelete.type})? As notas fiscais não poderão ser assinadas sem um certificado válido configurado.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCertToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs shadow-md shadow-rose-600/20 transition cursor-pointer"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
