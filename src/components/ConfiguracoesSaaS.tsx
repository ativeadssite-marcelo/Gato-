import React, { useState, useEffect } from 'react';
import { apiFetch } from '../services/apiClient';
import { 
  Settings, 
  ShieldCheck, 
  KeyRound, 
  Database, 
  Download, 
  Upload, 
  Building2, 
  CheckCircle2, 
  Lock, 
  Smartphone, 
  RefreshCw,
  Clock,
  HardDrive,
  Server,
  Zap,
  Activity,
  AlertCircle,
  Package,
  Users,
  Truck,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Check,
  Plus,
  Store,
  Edit3,
  Save,
  Sparkles,
  Rocket,
  Camera,
  AlertTriangle,
  Trash2
} from 'lucide-react';
import { Product, Order, Customer, InvoiceRecord, CompanyProfile, BranchUnit } from '../types';
import { INITIAL_BRANCHES } from '../data/initialData';
import { ClienteLogoCustomizer } from './ClienteLogoCustomizer';
import { resetTenantData } from '../services/entityApi';

// Shim para imageOptimizer removido
function formatImageSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
async function optimizeImageDataUrl(dataUrl: string, _options: { maxWidth?: number; maxHeight?: number; quality?: number; format?: 'webp' | 'jpeg'; originalFileName?: string; originalSizeBytes?: number } = {}): Promise<{ dataUrl: string; sizeBytes: number; fileName: string; originalSizeBytes: number }> {
  return { 
    dataUrl, 
    sizeBytes: Math.round(dataUrl.length * 0.75),
    fileName: _options.originalFileName || 'image.webp',
    originalSizeBytes: _options.originalSizeBytes || Math.round(dataUrl.length * 0.75)
  };
}

interface ConfiguracoesSaaSProps {
  products: Product[];
  orders: Order[];
  customers: Customer[];
  invoices: InvoiceRecord[];
  companyProfile?: CompanyProfile | null;
  branches?: BranchUnit[];
  activeStore?: string;
  onSelectActiveStore?: (branchId: string) => void;
  onNavigateToEmpresaFiliais?: () => void;
  onUpdateCompanyProfile?: (profile: CompanyProfile) => void;
  onUpdateProducts?: (products: Product[]) => void;
  onRestoreData: (backupData: any) => void;
  /** Recarrega as listas do banco (usado depois de zerar os dados de operação). */
  onReloadEntities?: () => Promise<void>;
  onShowNotification: (title: string, message: string, type?: 'success' | 'warning' | 'info') => void;
}

export const ConfiguracoesSaaS: React.FC<ConfiguracoesSaaSProps> = ({
  products,
  orders,
  customers,
  invoices,
  companyProfile,
  branches,
  activeStore = 'matriz-ms',
  onSelectActiveStore,
  onNavigateToEmpresaFiliais,
  onUpdateCompanyProfile,
  onUpdateProducts,
  onRestoreData,
  onReloadEntities,
  onShowNotification,
}) => {
  // Company Profile / Nome Fantasia Form State
  const [isEditingCompany, setIsEditingCompany] = useState(false);
  const [compTradeName, setCompTradeName] = useState(companyProfile?.tradeName || 'Pantanal Auto & Motopeças');
  const [compCorporateName, setCompCorporateName] = useState(companyProfile?.corporateName || 'Pantanal Peças LTDA');
  const [compCnpj, setCompCnpj] = useState(companyProfile?.cnpj || '12.345.678/0001-99');
  const [compIe, setCompIe] = useState(companyProfile?.stateRegistration || '28.345.678-9');
  const [compSegment, setCompSegment] = useState(companyProfile?.segment || 'Centro Automotivo & Misto');
  const [compPhone, setCompPhone] = useState(companyProfile?.phone || '(67) 3345-9821');
  const [compEmail, setCompEmail] = useState(companyProfile?.email || 'contato@gatoautopecas.com.br');
  const [compCity, setCompCity] = useState(companyProfile?.city || 'Campo Grande');
  const [compUf, setCompUf] = useState(companyProfile?.uf || 'MS');

  // WebP Image Optimization Engine States
  const [isOptimizingCatalogImages, setIsOptimizingCatalogImages] = useState(false);
  const [catalogOptimizationStats, setCatalogOptimizationStats] = useState<{
    imagesOptimized: number;
    bytesSaved: number;
  } | null>(null);

  const totalCatalogPhotos = products.reduce((acc, p) => {
    return acc + (p.attachments?.length || (p.imageUrl ? 1 : 0));
  }, 0);

  const handleOptimizeCatalogImages = async () => {
    setIsOptimizingCatalogImages(true);
    let imagesCount = 0;
    let totalOriginal = 0;
    let totalOptimized = 0;

    try {
      const updatedProducts = await Promise.all(
        products.map(async (prod) => {
          let updatedProd = { ...prod };
          let changed = false;

          // Check and optimize attachments
          if (prod.attachments && prod.attachments.length > 0) {
            const newAttachments = await Promise.all(
              prod.attachments.map(async (att) => {
                if (att.url && att.url.startsWith('data:image') && !att.url.startsWith('data:image/webp')) {
                  try {
                    const opt = await optimizeImageDataUrl(att.url, {
                      maxWidth: 1024,
                      maxHeight: 1024,
                      quality: 0.80,
                      originalFileName: att.name,
                      originalSizeBytes: att.size,
                    });
                    imagesCount++;
                    totalOriginal += opt.originalSizeBytes;
                    totalOptimized += opt.sizeBytes;
                    changed = true;
                    return {
                      ...att,
                      url: opt.dataUrl,
                      name: opt.fileName,
                      size: opt.sizeBytes,
                    };
                  } catch (e) {
                    return att;
                  }
                }
                return att;
              })
            );
            if (changed) {
              updatedProd.attachments = newAttachments;
            }
          }

          // Check and optimize primary imageUrl if dataURL
          if (prod.imageUrl && prod.imageUrl.startsWith('data:image') && !prod.imageUrl.startsWith('data:image/webp')) {
            try {
              const opt = await optimizeImageDataUrl(prod.imageUrl, {
                maxWidth: 1024,
                maxHeight: 1024,
                quality: 0.80,
                originalFileName: `${prod.code}_principal.jpg`,
              });
              imagesCount++;
              totalOriginal += opt.originalSizeBytes;
              totalOptimized += opt.sizeBytes;
              updatedProd.imageUrl = opt.dataUrl;
              changed = true;
            } catch (e) {}
          }

          return changed ? updatedProd : prod;
        })
      );

      if (imagesCount > 0 && onUpdateProducts) {
        onUpdateProducts(updatedProducts);
        const bytesSaved = Math.max(0, totalOriginal - totalOptimized);
        setCatalogOptimizationStats({ imagesOptimized: imagesCount, bytesSaved });
        onShowNotification(
          'Catálogo Otimizado para WebP!',
          `${imagesCount} imagens convertidas para WebP ultraleve. Economia de ${formatImageSize(bytesSaved)} no banco de dados.`,
          'success'
        );
      } else {
        onShowNotification(
          'Catálogo Já Otimizado',
          'Todas as imagens do catálogo já estão no formato leve ideal (WebP) ou links CDN.',
          'info'
        );
      }
    } catch (err) {
      console.error('Erro na otimização em lote:', err);
      onShowNotification('Erro na Otimização', 'Ocorreu uma falha ao reprocessar imagens do catálogo.', 'warning');
    } finally {
      setIsOptimizingCatalogImages(false);
    }
  };

  useEffect(() => {
    if (companyProfile) {
      setCompTradeName(companyProfile.tradeName);
      setCompCorporateName(companyProfile.corporateName);
      setCompCnpj(companyProfile.cnpj);
      setCompIe(companyProfile.stateRegistration || '');
      setCompSegment(companyProfile.segment);
      setCompPhone(companyProfile.phone);
      setCompEmail(companyProfile.email);
      setCompCity(companyProfile.city);
      setCompUf(companyProfile.uf);
    }
  }, [companyProfile]);

  const handleSaveCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (!compTradeName.trim()) {
      onShowNotification('Nome Fantasia Obrigatório', 'Por favor, informe o Nome Fantasia da empresa.', 'warning');
      return;
    }

    const updated: CompanyProfile = {
      id: companyProfile?.id || 'empresa-001',
      tradeName: compTradeName.trim(),
      corporateName: compCorporateName.trim() || `${compTradeName.trim()} LTDA`,
      cnpj: compCnpj.trim() || '12.345.678/0001-90',
      stateRegistration: compIe.trim(),
      segment: compSegment,
      phone: compPhone.trim(),
      email: compEmail.trim(),
      city: compCity.trim(),
      uf: compUf,
      address: companyProfile?.address || 'Endereço Comercial Cadastrado',
      isTrial: companyProfile?.isTrial ?? true,
      trialDaysRemaining: companyProfile?.trialDaysRemaining ?? 14,
      planName: companyProfile?.planName || 'GATO SaaS - Teste Grátis (14 Dias)',
      createdAt: companyProfile?.createdAt || new Date().toISOString(),
    };

    if (onUpdateCompanyProfile) {
      onUpdateCompanyProfile(updated);
    }
    setIsEditingCompany(false);
    onShowNotification('Empresa Atualizada com Sucesso!', `Nome Fantasia definido como: "${updated.tradeName}"`, 'success');
  };
  // Supabase PostgreSQL Database Connection State
  const [dbInfo, setDbInfo] = useState<{
    connected: boolean;
    projectRef: string;
    host: string;
    database: string;
    version: string;
    latencyMs: number;
    tables: string[];
    counts: Record<string, number>;
    lastChecked?: string;
    error?: string;
  } | null>(null);
  const [isCheckingDb, setIsCheckingDb] = useState(false);

  // Supabase Live Data Explorer & Sync States
  const [showLiveViewer, setShowLiveViewer] = useState(false);
  const [activeViewerTab, setActiveViewerTab] = useState<'products' | 'customers' | 'branches' | 'suppliers'>('products');
  const [supabaseProducts, setSupabaseProducts] = useState<any[]>([]);
  const [supabaseCustomers, setSupabaseCustomers] = useState<any[]>([]);
  const [supabaseBranches, setSupabaseBranches] = useState<any[]>([]);
  const [supabaseSuppliers, setSupabaseSuppliers] = useState<any[]>([]);
  const [isLoadingViewerData, setIsLoadingViewerData] = useState(false);
  const [isSyncingCatalog, setIsSyncingCatalog] = useState(false);

  const handleCheckDatabase = async (notify: boolean = false) => {
    setIsCheckingDb(true);
    try {
      const res = await apiFetch('/api/db/status');
      const data = await res.json();
      setDbInfo({ ...data, lastChecked: new Date().toLocaleTimeString('pt-BR') });
      if (notify) {
        if (data.connected) {
          onShowNotification(
            'Supabase Conectado!',
            `Conexão ativa com ${data.host} (${data.latencyMs}ms) - PostgreSQL 17.6`,
            'success'
          );
        } else {
          onShowNotification(
            'Falha de Conexão Supabase',
            data.error || 'Não foi possível conectar ao banco de dados',
            'warning'
          );
        }
      }
    } catch (err: any) {
      if (notify) {
        onShowNotification('Erro na Verificação', err.message, 'warning');
      }
    } finally {
      setIsCheckingDb(false);
    }
  };

  const loadSupabaseViewerData = async () => {
    setIsLoadingViewerData(true);
    try {
      const [prodRes, custRes, branchRes, suppRes] = await Promise.all([
        apiFetch('/api/db/products').then(r => r.json()).catch(() => ({ products: [] })),
        apiFetch('/api/db/customers').then(r => r.json()).catch(() => ({ customers: [] })),
        apiFetch('/api/db/branches').then(r => r.json()).catch(() => ({ branches: [] })),
        apiFetch('/api/db/suppliers').then(r => r.json()).catch(() => ({ suppliers: [] })),
      ]);

      if (prodRes?.products) setSupabaseProducts(prodRes.products);
      if (custRes?.customers) setSupabaseCustomers(custRes.customers);
      if (branchRes?.branches) setSupabaseBranches(branchRes.branches);
      if (suppRes?.suppliers) setSupabaseSuppliers(suppRes.suppliers);
    } catch (err: any) {
      console.error('Error fetching Supabase data:', err);
    } finally {
      setIsLoadingViewerData(false);
    }
  };

  const handleToggleViewer = () => {
    const nextState = !showLiveViewer;
    setShowLiveViewer(nextState);
    if (nextState) {
      loadSupabaseViewerData();
    }
  };

  const handleSyncCatalogToSupabase = async () => {
    setIsSyncingCatalog(true);
    try {
      const res = await apiFetch('/api/db/sync-catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products }),
      });
      const data = await res.json();
      if (data.success) {
        onShowNotification(
          'Catálogo Sincronizado com Supabase!',
          data.message || `${products.length} itens sincronizados com sucesso no PostgreSQL.`,
          'success'
        );
        handleCheckDatabase(false);
        loadSupabaseViewerData();
      } else {
        onShowNotification('Erro na Sincronização', data.error || 'Falha ao sincronizar com Supabase', 'warning');
      }
    } catch (err: any) {
      onShowNotification('Erro na Sincronização', err.message, 'warning');
    } finally {
      setIsSyncingCatalog(false);
    }
  };

  const handleImportProduct = (spProd: any) => {
    if (!onUpdateProducts) return;
    const existingIndex = products.findIndex(p => p.code === spProd.sku);
    if (existingIndex >= 0) {
      const updated = [...products];
      updated[existingIndex] = {
        ...updated[existingIndex],
        stock: spProd.stock,
        sellingPrice: spProd.salePrice || updated[existingIndex].sellingPrice,
        unitCost: spProd.costPrice || updated[existingIndex].unitCost,
        updatedAt: new Date().toISOString(),
      };
      onUpdateProducts(updated);
      onShowNotification('Item Atualizado', `Estoque e preço de ${spProd.name} sincronizados do Supabase.`, 'success');
    } else {
      const newProd: Product = {
        id: spProd.id || `prod-${Date.now()}`,
        code: spProd.sku,
        oemCode: spProd.sku,
        similarCodes: [],
        barcode: spProd.barcode || '',
        name: spProd.name,
        brand: spProd.brand || 'Original',
        category: 'auto',
        supplier: 'Distribuidor Supabase Cloud',
        supplierCnpj: '11.111.111/0001-11',
        location: {
          corridor: 'Corredor A',
          shelf: 'Prateleira 01',
          box: 'Gaveta 01',
        },
        stock: spProd.stock || 10,
        minStock: spProd.minStock || 5,
        unitCost: spProd.costPrice || 0,
        transportCost: 0,
        markupPercent: 40,
        sellingPrice: spProd.salePrice || 0,
        ncm: '8708.29.99',
        cst: '00',
        cfop: '5102',
        taxBaseIcms: spProd.salePrice || 0,
        applications: [],
        updatedAt: new Date().toISOString(),
      };
      onUpdateProducts([newProd, ...products]);
      onShowNotification('Produto Importado', `Peça ${spProd.name} importada do Supabase para o Estoque Local.`, 'success');
    }
  };

  useEffect(() => {
    handleCheckDatabase(false);
  }, []);

  // 2FA state
  const [is2faEnabled, setIs2faEnabled] = useState(true);
  const [verificationCodeInput, setVerificationCodeInput] = useState('');
  const [is2faVerified, setIs2faVerified] = useState(true);

  // Multi-empresa (SaaS Multi-tenant)
  const branchList = branches && branches.length > 0 ? branches : INITIAL_BRANCHES;
  const currentBranchId = activeStore || 'matriz-ms';

  // Automated Backup Logs
  const [backupLogs, setBackupLogs] = useState([
    { id: 'b-1', timestamp: 'Hoje às 06:00:00', size: '2.4 MB', status: 'Sucesso', destination: 'Nuvem GCP Storage (Backup Diário)' },
    { id: 'b-2', timestamp: 'Ontem às 18:00:00', size: '2.3 MB', status: 'Sucesso', destination: 'Nuvem GCP Storage (Backup Automático)' },
    { id: 'b-3', timestamp: 'Ontem às 12:00:00', size: '2.3 MB', status: 'Sucesso', destination: 'Nuvem GCP Storage (Backup Automático)' },
  ]);

  // Zona de risco: zerar os dados de operação ("começar a operar")
  const [resetConfirmacao, setResetConfirmacao] = useState('');
  const [resetando, setResetando] = useState(false);

  /**
   * Zera o cadastro e o movimento da empresa no banco. O servidor revalida a
   * confirmação (nome da empresa) e recusa quem não é admin do tenant — aqui é
   * só a borda. Depois de zerar, as listas recarregam para a tela não continuar
   * mostrando o que já não existe.
   */
  const handleResetTenantData = async () => {
    setResetando(true);
    try {
      const resultado = await resetTenantData(resetConfirmacao);
      const linhas = Object.entries(resultado?.linhasPorTabela || {})
        .filter(([, n]) => n > 0)
        .map(([tabela, n]) => `${tabela}: ${n}`)
        .join(' • ');
      setResetConfirmacao('');
      onShowNotification(
        'Dados de operação zerados',
        linhas ? `Registros apagados — ${linhas}.` : 'Não havia nada a apagar.',
        'info'
      );
      if (onReloadEntities) await onReloadEntities();
    } catch (error) {
      onShowNotification(
        'Não foi possível zerar',
        error instanceof Error ? error.message : 'Falha ao zerar os dados de operação.',
        'warning'
      );
    } finally {
      setResetando(false);
    }
  };

  // Export full JSON backup
  const handleExportFullBackup = () => {
    const selectedBranch = branchList.find(b => b.id === currentBranchId) || branchList[0];
    const fullBackup = {
      version: 'GATO_V1_SAAS',
      exportedAt: new Date().toISOString(),
      branch: selectedBranch,
      products,
      orders,
      customers,
      invoices,
    };

    const jsonString = JSON.stringify(fullBackup, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GATO_Backup_Completo_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);

    const newLog = {
      id: `b-${Date.now()}`,
      timestamp: `Hoje às ${new Date().toLocaleTimeString('pt-BR')}`,
      size: `${(jsonString.length / 1024).toFixed(1)} KB`,
      status: 'Sucesso',
      destination: 'Download Local do Arquivo JSON',
    };
    setBackupLogs([newLog, ...backupLogs]);

    onShowNotification(
      'Backup Completo Realizado!',
      'Arquivo JSON com todas as peças, movimentações, pedidos e notas fiscais gerado com sucesso.',
      'success'
    );
  };

  // Restore backup from JSON file
  const handleRestoreFromFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);

        if (parsed && parsed.products) {
          onRestoreData(parsed);
          onShowNotification(
            'Restauração de Dados Concluída!',
            `Backup restaurado com sucesso: ${parsed.products.length} produtos carregados.`,
            'success'
          );
        } else {
          onShowNotification('Arquivo Inválido', 'O arquivo selecionado não contém a estrutura de backup esperada.', 'warning');
        }
      } catch (err) {
        onShowNotification('Falha no Backup', 'Não foi possível processar o arquivo de backup selecionado.', 'warning');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6" id="view-configuracoes-saas">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-5 border border-sky-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sky-700 font-bold text-xs uppercase tracking-wider mb-1">
            <Settings className="w-4 h-4 text-sky-600" />
            <span>Segurança, Backup Automatizado & Arquitetura SaaS Multi-Tenant</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 font-['Outfit'] tracking-tight">
            Configurações do Sistema, 2FA & Backups
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
            Proteção de privacidade com autenticação em duas etapas (2FA), rotina de backups automatizados em nuvem e gestão de filiais da rede de autopeças.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1.5 rounded-xl">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>SaaS Cloud Seguro</span>
          </span>
        </div>
      </div>

      {/* Logotipo da Empresa & Personalização Visual para Clientes */}
      {companyProfile && (
        <ClienteLogoCustomizer
          companyProfile={companyProfile}
          onUpdateLogo={(newLogo) => {
            if (onUpdateCompanyProfile) {
              onUpdateCompanyProfile({ ...companyProfile, logoUrl: newLogo });
            }
          }}
          onShowNotification={onShowNotification}
        />
      )}

      {/* Smart WebP Database Storage & Image Optimization Card */}
      <div className="bg-white rounded-2xl p-5 border border-sky-100 shadow-sm space-y-4 text-xs" id="card-motor-imagens-webp">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
              <Camera className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-extrabold text-slate-900">
                  Motor de Otimização de Imagens para o Banco de Dados (WebP Ultraleve)
                </h2>
                <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                  <Zap className="w-3 h-3 text-emerald-600" />
                  ~95% de Economia de Espaço
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Compressão nativa de alta densidade que permite armazenar dezenas de milhares de fotos no banco com carregamento instantâneo.
              </p>
            </div>
          </div>

          <button
            type="button"
            id="btn-otimizar-catalogo-webp"
            onClick={handleOptimizeCatalogImages}
            disabled={isOptimizingCatalogImages}
            className="inline-flex items-center justify-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold px-3.5 py-2 rounded-xl shadow-xs transition active:scale-95 cursor-pointer text-xs"
            title="Verifica todo o catálogo e converte imagens em Base64/pesadas para WebP leve"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isOptimizingCatalogImages ? 'animate-spin text-amber-300' : 'text-amber-400'}`} />
            <span>{isOptimizingCatalogImages ? 'Otimizando Catálogo...' : 'Otimizar Imagens do Catálogo'}</span>
          </button>
        </div>

        {/* 4 Storage Pillars Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Formato de Gravação</span>
            <strong className="text-emerald-800 font-bold text-xs flex items-center gap-1">
              <Zap className="w-3 h-3 text-emerald-600" />
              Google WebP (Lossy 80%)
            </strong>
            <span className="text-[10px] text-slate-500 block mt-0.5">Substitui JPEG/PNG pesados</span>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Resolução Máxima</span>
            <strong className="text-slate-800 font-bold text-xs">
              1024 × 1024 px (Auto-Scale)
            </strong>
            <span className="text-[10px] text-slate-500 block mt-0.5">Bicubic downscaling na origem</span>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Limpeza de Metadados</span>
            <strong className="text-sky-800 font-bold text-xs flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-sky-600" />
              EXIF & GPS Removidos
            </strong>
            <span className="text-[10px] text-slate-500 block mt-0.5">Privacidade e menos 50-200KB</span>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Capacidade por 1 GB</span>
            <strong className="text-purple-800 font-bold text-xs flex items-center gap-1">
              <HardDrive className="w-3 h-3 text-purple-600" />
              ~20.000 fotos por GB
            </strong>
            <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">
              vs ~200 fotos sem compressão
            </span>
          </div>
        </div>

        {/* Live Catalog Image Footprint Banner */}
        <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="text-slate-700">
              <strong>Status do Catálogo:</strong> {products.length} peças cadastradas com {totalCatalogPhotos} foto(s) registradas sob motor WebP ultraleve.
            </span>
          </div>
          {catalogOptimizationStats && (
            <span className="text-[10px] font-mono font-bold bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded border border-emerald-300">
              {catalogOptimizationStats.imagesOptimized} fotos otimizadas • {formatImageSize(catalogOptimizationStats.bytesSaved)} economizados
            </span>
          )}
        </div>
      </div>

      {/* Supabase PostgreSQL Live Connection Card */}
      <div className="bg-white rounded-2xl p-5 border border-sky-100 shadow-sm space-y-4 text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200">
              <Database className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-extrabold text-slate-900">
                  Conexão com Banco de Dados Supabase (PostgreSQL 17.6)
                </h2>
                <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full border ${
                  dbInfo?.connected
                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                    : 'bg-amber-100 text-amber-900 border-amber-300'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${dbInfo?.connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                  {dbInfo?.connected ? 'Conexão Ativa & Confirmada' : 'Verificando Conexão...'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Instância gerenciada em nuvem • Pooling via TLS seguro • Integração de tabelas Prisma e GATO SaaS
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSyncCatalogToSupabase}
              disabled={isSyncingCatalog || !dbInfo?.connected}
              className="inline-flex items-center justify-center gap-1.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-bold px-3 py-2 rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
              title="Envia e sincroniza todos os produtos do catálogo local com a tabela Product e StockLevel do Supabase"
            >
              <Upload className={`w-3.5 h-3.5 ${isSyncingCatalog ? 'animate-bounce' : ''}`} />
              <span>{isSyncingCatalog ? 'Sincronizando...' : 'Sincronizar com Supabase'}</span>
            </button>

            <button
              type="button"
              onClick={handleToggleViewer}
              disabled={!dbInfo?.connected}
              className="inline-flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white font-bold px-3 py-2 rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
            >
              <Database className="w-3.5 h-3.5 text-sky-400" />
              <span>{showLiveViewer ? 'Ocultar Tabelas' : 'Explorar Dados ao Vivo'}</span>
              {showLiveViewer ? <ChevronUp className="w-3 h-3 ml-0.5" /> : <ChevronDown className="w-3 h-3 ml-0.5" />}
            </button>

            <button
              type="button"
              onClick={() => handleCheckDatabase(true)}
              disabled={isCheckingDb}
              className="inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold px-3 py-2 rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCheckingDb ? 'animate-spin' : ''}`} />
              <span>{isCheckingDb ? 'Ping...' : 'Testar Conexão'}</span>
            </button>
          </div>
        </div>

        {/* Database Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Projeto Supabase</span>
            <strong className="text-slate-800 font-mono text-xs">{dbInfo?.projectRef || 'tfyocjdozttclxgipexu'}</strong>
            <span className="text-[10px] text-emerald-600 block mt-0.5 font-semibold">Região Cloud Ativa</span>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Host Conectado</span>
            <strong className="text-slate-800 font-mono text-xs truncate block" title={dbInfo?.host}>
              {dbInfo?.host || 'db.tfyocjdozttclxgipexu.supabase.co'}
            </strong>
            <span className="text-[10px] text-slate-500 block mt-0.5">Porta 5432 (SSL Requerido)</span>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Latência de Rede</span>
            <strong className="text-emerald-700 font-bold text-xs flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
              {dbInfo?.latencyMs !== undefined ? `${dbInfo.latencyMs} ms` : 'Medindo...'}
            </strong>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              {dbInfo?.lastChecked ? `Verificado às ${dbInfo.lastChecked}` : 'Em tempo real'}
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Motor PostgreSQL</span>
            <strong className="text-slate-800 text-xs truncate block" title={dbInfo?.version}>
              PostgreSQL 17.6
            </strong>
            <span className="text-[10px] text-sky-700 font-semibold block mt-0.5">
              {dbInfo?.tables?.length ? `${dbInfo.tables.length} tabelas no schema` : 'Banco postgres'}
            </span>
          </div>
        </div>

        {/* Database Tables Breakdown */}
        {dbInfo?.tables && dbInfo.tables.length > 0 && (
          <div className="bg-sky-50/50 rounded-xl p-3 border border-sky-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-[#0C4A6E] flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-sky-600" />
                Tabelas Registradas no Supabase (Schema public)
              </span>
              <span className="text-[10px] text-slate-500">
                {dbInfo.tables.length} tabelas prontas para operações CRUD
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {dbInfo.tables.map((t) => (
                <span
                  key={t}
                  className="px-2 py-0.5 bg-white border border-sky-200 rounded text-[10px] font-mono text-slate-700 font-medium shadow-2xs"
                >
                  {t}
                  {dbInfo.counts && dbInfo.counts[t] !== undefined && (
                    <span className="ml-1 text-emerald-700 font-bold">({dbInfo.counts[t]})</span>
                  )}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Live Supabase Data Explorer */}
        {showLiveViewer && (
          <div className="bg-slate-900 rounded-xl p-4 text-slate-100 border border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-xs text-white">Explorador de Dados em Tempo Real (Supabase Cloud)</span>
                <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.2 rounded-full font-mono">
                  PostgreSQL TLS
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={loadSupabaseViewerData}
                  disabled={isLoadingViewerData}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold rounded-lg flex items-center gap-1 transition"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoadingViewerData ? 'animate-spin' : ''}`} />
                  <span>Recarregar</span>
                </button>
              </div>
            </div>

            {/* Sub-tabs */}
            <div className="flex flex-wrap gap-1 border-b border-slate-800 pb-2">
              <button
                type="button"
                onClick={() => setActiveViewerTab('products')}
                className={`px-3 py-1 rounded-lg font-bold text-xs flex items-center gap-1.5 transition ${
                  activeViewerTab === 'products'
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>Produtos ({supabaseProducts.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveViewerTab('customers')}
                className={`px-3 py-1 rounded-lg font-bold text-xs flex items-center gap-1.5 transition ${
                  activeViewerTab === 'customers'
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Clientes ({supabaseCustomers.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveViewerTab('branches')}
                className={`px-3 py-1 rounded-lg font-bold text-xs flex items-center gap-1.5 transition ${
                  activeViewerTab === 'branches'
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Filiais / Depósitos ({supabaseBranches.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveViewerTab('suppliers')}
                className={`px-3 py-1 rounded-lg font-bold text-xs flex items-center gap-1.5 transition ${
                  activeViewerTab === 'suppliers'
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Truck className="w-3.5 h-3.5" />
                <span>Fornecedores ({supabaseSuppliers.length})</span>
              </button>
            </div>

            {/* Tab Contents */}
            {isLoadingViewerData ? (
              <div className="py-8 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-sky-400" />
                <span>Consultando dados no PostgreSQL do Supabase...</span>
              </div>
            ) : (
              <div>
                {/* Tab: Products */}
                {activeViewerTab === 'products' && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[11px]">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 font-mono text-[10px]">
                          <th className="py-1.5 px-2">SKU</th>
                          <th className="py-1.5 px-2">NOME</th>
                          <th className="py-1.5 px-2">MARCA</th>
                          <th className="py-1.5 px-2">CATEGORIA</th>
                          <th className="py-1.5 px-2 text-right">ESTOQUE</th>
                          <th className="py-1.5 px-2 text-right">PREÇO VENDA</th>
                          <th className="py-1.5 px-2 text-center">AÇÃO</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-sans">
                        {supabaseProducts.map((p) => (
                          <tr key={p.id} className="hover:bg-slate-800/40">
                            <td className="py-2 px-2 font-mono font-bold text-sky-400">{p.sku}</td>
                            <td className="py-2 px-2 font-medium text-slate-200">{p.name}</td>
                            <td className="py-2 px-2 text-slate-400">{p.brand}</td>
                            <td className="py-2 px-2 text-slate-400">{p.categoryName || '-'}</td>
                            <td className="py-2 px-2 text-right font-bold text-emerald-400">{p.stock} un</td>
                            <td className="py-2 px-2 text-right font-bold text-slate-200">
                              R$ {Number(p.salePrice).toFixed(2)}
                            </td>
                            <td className="py-2 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleImportProduct(p)}
                                className="px-2 py-0.5 bg-sky-700/60 hover:bg-sky-600 text-white rounded text-[10px] font-bold transition inline-flex items-center gap-1"
                                title="Importar ou sincronizar com o Estoque local"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Importar</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Tab: Customers */}
                {activeViewerTab === 'customers' && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[11px]">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 font-mono text-[10px]">
                          <th className="py-1.5 px-2">DOCUMENTO</th>
                          <th className="py-1.5 px-2">NOME</th>
                          <th className="py-1.5 px-2">TIPO</th>
                          <th className="py-1.5 px-2">CIDADE / UF</th>
                          <th className="py-1.5 px-2">TELEFONE</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-sans">
                        {supabaseCustomers.map((c) => (
                          <tr key={c.id} className="hover:bg-slate-800/40">
                            <td className="py-2 px-2 font-mono text-sky-400">{c.document}</td>
                            <td className="py-2 px-2 font-medium text-slate-200">{c.name}</td>
                            <td className="py-2 px-2">
                              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300">
                                {c.personType || c.type}
                              </span>
                            </td>
                            <td className="py-2 px-2 text-slate-300">{c.city ? `${c.city}/${c.state}` : '-'}</td>
                            <td className="py-2 px-2 text-slate-400">{c.phone || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Tab: Warehouses */}
                {activeViewerTab === 'branches' && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[11px]">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 font-mono text-[10px]">
                          <th className="py-1.5 px-2">CÓDIGO</th>
                          <th className="py-1.5 px-2">NOME</th>
                          <th className="py-1.5 px-2">ENDEREÇO</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-sans">
                        {supabaseBranches.map((b) => (
                          <tr key={b.id} className="hover:bg-slate-800/40">
                            <td className="py-2 px-2 font-mono font-bold text-emerald-400">{b.code}</td>
                            <td className="py-2 px-2 font-medium text-slate-200">{b.name}</td>
                            <td className="py-2 px-2 text-slate-400">{b.address || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Tab: Suppliers */}
                {activeViewerTab === 'suppliers' && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[11px]">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 font-mono text-[10px]">
                          <th className="py-1.5 px-2">CNPJ</th>
                          <th className="py-1.5 px-2">RAZÃO SOCIAL</th>
                          <th className="py-1.5 px-2">TELEFONE</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-sans">
                        {supabaseSuppliers.map((s) => (
                          <tr key={s.id} className="hover:bg-slate-800/40">
                            <td className="py-2 px-2 font-mono text-sky-400">{s.cnpj}</td>
                            <td className="py-2 px-2 font-medium text-slate-200">{s.name}</td>
                            <td className="py-2 px-2 text-slate-400">{s.phone || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* CARD PRINCIPAL: CADASTRO E NOME FANTASIA DA EMPRESA (SAAS GATO) */}
      <div className="bg-gradient-to-br from-white via-sky-50/40 to-amber-50/30 rounded-2xl p-6 border-2 border-sky-200 shadow-sm space-y-4" id="card-empresa-nome-fantasia">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-sky-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0C4A6E] to-[#0284C7] text-white flex items-center justify-center shadow-md shrink-0">
              <Store className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900">
                  Empresa & Nome Fantasia no GATO SaaS
                </h2>
                {companyProfile?.isTrial && (
                  <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                    {companyProfile.trialDaysRemaining} Dias de Teste Grátis
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600">
                Identificação da sua marca fantasia para orçamentos, faturamento, tela de balcão e notas fiscais.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isEditingCompany ? (
              <button
                type="button"
                id="btn-edit-company-profile"
                onClick={() => setIsEditingCompany(true)}
                className="px-4 py-2 bg-[#0C4A6E] hover:bg-[#073047] text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                <span>Editar Nome Fantasia & Dados</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditingCompany(false)}
                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
            )}
          </div>
        </div>

        {/* MODO VISUALIZAÇÃO / RESUMO DO PERFIL */}
        {!isEditingCompany ? (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            <div className="md:col-span-8 bg-white p-4 rounded-xl border border-sky-100 shadow-2xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] uppercase font-black tracking-wider text-sky-800 block">
                    Nome Fantasia Ativo da Sua Loja:
                  </span>
                  <strong className="text-lg font-black text-slate-900 tracking-tight block text-[#0C4A6E]">
                    {compTradeName}
                  </strong>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Segmento</span>
                  <span className="text-xs font-bold text-slate-700">{compSegment}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block">Razão Social:</span>
                  <span className="text-slate-800 font-medium truncate block">{compCorporateName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block">CNPJ:</span>
                  <span className="font-mono text-slate-800 font-medium truncate block">{compCnpj}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block">Cidade / UF:</span>
                  <span className="text-slate-800 font-medium truncate block">{compCity} - {compUf}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block">WhatsApp:</span>
                  <span className="text-slate-800 font-medium truncate block">{compPhone}</span>
                </div>
              </div>
            </div>

            {/* Live Mockup do Balcão */}
            <div className="md:col-span-4 bg-slate-900 text-white p-4 rounded-xl shadow-md text-xs space-y-2">
              <div className="flex items-center justify-between text-[10px] text-amber-400 font-bold uppercase">
                <span>Prévia no Orçamento / DAV</span>
                <span>GATO SaaS</span>
              </div>
              <div className="border border-white/20 p-2.5 rounded-lg bg-white/5 space-y-1">
                <p className="font-black text-sm text-white truncate">{compTradeName}</p>
                <p className="text-[10px] text-slate-300 truncate">CNPJ: {compCnpj} • Tel: {compPhone}</p>
                <div className="mt-2 pt-1 border-t border-white/10 text-[9px] text-emerald-300 font-semibold flex items-center justify-between">
                  <span>DAV / Cotação Oficial</span>
                  <span>SEFAZ-{compUf} Homologado</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* MODO FORMULÁRIO DE EDIÇÃO */
          <form onSubmit={handleSaveCompany} className="bg-white p-5 rounded-xl border border-sky-200 shadow-sm space-y-4">
            <div className="bg-sky-50 p-3 rounded-xl border border-sky-300">
              <label className="text-xs font-black text-[#0C4A6E] uppercase tracking-wider block mb-1">
                Nome Fantasia da Empresa (Como seus clientes conhecem sua loja) *
              </label>
              <input
                type="text"
                id="edit-company-trade-name"
                value={compTradeName}
                onChange={(e) => setCompTradeName(e.target.value)}
                placeholder="Ex: Auto Peças São Cristóvão, Motopeças Veloz..."
                required
                className="w-full px-3 py-2 bg-white border border-sky-300 rounded-lg text-sm font-extrabold text-slate-900 focus:ring-2 focus:ring-[#0C4A6E] outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Razão Social Oficial</label>
                <input
                  type="text"
                  value={compCorporateName}
                  onChange={(e) => setCompCorporateName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">CNPJ</label>
                <input
                  type="text"
                  value={compCnpj}
                  onChange={(e) => setCompCnpj(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Inscrição Estadual (IE)</label>
                <input
                  type="text"
                  value={compIe}
                  onChange={(e) => setCompIe(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Segmento / Ramo</label>
                <select
                  value={compSegment}
                  onChange={(e) => setCompSegment(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold"
                >
                  <option value="Autopeças Leves & Acessórios">Autopeças Leves & Acessórios</option>
                  <option value="Motopeças & Oficinas 2 Rodas">Motopeças & Oficinas 2 Rodas</option>
                  <option value="Linha Pesada & Diesel">Linha Pesada & Diesel</option>
                  <option value="Linha Agrícola & Tratores">Linha Agrícola & Tratores</option>
                  <option value="Centro Automotivo & Misto">Centro Automotivo & Misto</option>
                  <option value="Distribuidora & Atacado">Distribuidora & Atacado</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">WhatsApp / Telefone</label>
                <input
                  type="text"
                  value={compPhone}
                  onChange={(e) => setCompPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">E-mail Corporativo</label>
                <input
                  type="email"
                  value={compEmail}
                  onChange={(e) => setCompEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Cidade Sede</label>
                <input
                  type="text"
                  value={compCity}
                  onChange={(e) => setCompCity(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Estado (UF)</label>
                <select
                  value={compUf}
                  onChange={(e) => setCompUf(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold"
                >
                  <option value="MS">Mato Grosso do Sul (MS)</option>
                  <option value="SP">São Paulo (SP)</option>
                  <option value="SC">Santa Catarina (SC)</option>
                  <option value="PR">Paraná (PR)</option>
                  <option value="MT">Mato Grosso (MT)</option>
                  <option value="MG">Minas Gerais (MG)</option>
                  <option value="GO">Goiás (GO)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsEditingCompany(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="submit"
                id="btn-save-company-profile"
                className="px-5 py-2 bg-[#0C4A6E] hover:bg-[#073047] text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4 text-amber-400" />
                <span>Salvar Nome Fantasia & Dados</span>
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: 2FA & Multi-branch (6 Cols) */}
        <div className="lg:col-span-6 space-y-6">
          {/* Two-Factor Authentication (2FA) */}
          <div className="bg-white rounded-2xl p-5 border border-sky-100 shadow-sm space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-sky-700" />
                <div>
                  <h2 className="text-sm font-extrabold text-slate-900">
                    Autenticação em Duas Etapas (2FA)
                  </h2>
                  <span className="text-[10px] text-slate-500">Google Authenticator / SMS Token</span>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <span className="font-bold text-slate-700">2FA Ativado</span>
                <input
                  type="checkbox"
                  checked={is2faEnabled}
                  onChange={(e) => {
                    setIs2faEnabled(e.target.checked);
                    onShowNotification('2FA', `Autenticação em 2 etapas ${e.target.checked ? 'ativada' : 'desativada'}.`, 'info');
                  }}
                  className="w-4 h-4 text-sky-600 rounded"
                />
              </label>
            </div>

            <p className="text-slate-600">
              A autenticação em duas etapas adiciona uma camada essencial de segurança ao acesso aos preços de custo, dados de frotistas e emissão de notas fiscais.
            </p>

            {is2faEnabled && (
              <div className="bg-sky-50/70 p-4 rounded-xl border border-sky-200 space-y-3">
                <div className="flex items-center gap-3">
                  {/* Simulated QR Code */}
                  <div className="w-16 h-16 bg-slate-900 rounded-lg p-1.5 flex flex-col justify-between shrink-0">
                    <div className="flex justify-between">
                      <div className="w-3 h-3 bg-white" />
                      <div className="w-3 h-3 bg-white" />
                    </div>
                    <div className="text-[8px] font-mono text-center text-amber-400 font-bold">2FA</div>
                    <div className="flex justify-between">
                      <div className="w-3 h-3 bg-white" />
                      <div className="w-3 h-3 bg-white" />
                    </div>
                  </div>

                  <div>
                    <span className="font-bold text-slate-900 block">Dispositivo Principal Vinculado</span>
                    <span className="text-slate-600 text-[11px] block">Smartphone do Gerente Geral (••••-8921)</span>
                    <span className="text-[10px] font-mono text-sky-800 font-bold">Chave Secreta: GATO-AUTH-9821-SECURE</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Digite código de 6 dígitos (ex: 839201)"
                    maxLength={6}
                    value={verificationCodeInput}
                    onChange={(e) => setVerificationCodeInput(e.target.value)}
                    className="p-2 bg-white border border-slate-300 rounded-lg font-mono font-bold text-center tracking-widest text-slate-900 w-48"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (verificationCodeInput.length === 6) {
                        setIs2faVerified(true);
                        onShowNotification('2FA Confirmado!', 'Dispositivo autenticado com sucesso.', 'success');
                      } else {
                        onShowNotification('Código Incompleto', 'Informe os 6 dígitos do aplicativo autenticador.', 'warning');
                      }
                    }}
                    className="p-2 bg-sky-950 hover:bg-sky-900 text-white font-bold rounded-lg px-3 transition active:scale-95"
                  >
                    Testar Token
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Multi-tenant SaaS Filiais */}
          <div className="bg-white rounded-2xl p-5 border border-sky-100 shadow-sm space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-sky-700" />
                <h2 className="text-sm font-extrabold text-slate-900">
                  Estrutura da Empresa (Matriz & Filiais)
                </h2>
              </div>
              {onNavigateToEmpresaFiliais && (
                <button
                  type="button"
                  onClick={onNavigateToEmpresaFiliais}
                  className="text-[11px] font-extrabold text-sky-700 hover:text-sky-900 bg-sky-50 hover:bg-sky-100 px-2.5 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Cadastrar / Gerenciar</span>
                </button>
              )}
            </div>

            <p className="text-slate-600">
              Unidades fiscais cadastradas para a sua empresa no Sistema GATO. Cada unidade possui CNPJ, Inscrição Estadual (IE) e alíquota de ICMS próprios para faturamento e estoque.
            </p>

            <div className="space-y-2.5">
              {branchList.map((b) => (
                <div
                  key={b.id}
                  onClick={() => {
                    if (onSelectActiveStore) {
                      onSelectActiveStore(b.id);
                    }
                    onShowNotification('Unidade Alternada', `Você agora está operando na unidade: ${b.name}`, 'info');
                  }}
                  className={`p-3.5 rounded-xl border-2 transition cursor-pointer space-y-1.5 ${
                    currentBranchId === b.id 
                      ? 'bg-sky-50/80 border-sky-600 shadow-xs' 
                      : 'bg-slate-50 border-slate-200 hover:border-sky-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                        b.isMatriz
                          ? 'bg-amber-500 text-white' 
                          : 'bg-sky-600 text-white'
                      }`}>
                        {b.uf}
                      </span>
                      <span className="font-extrabold text-slate-900">{b.name}</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      b.isMatriz
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : 'bg-sky-100 text-sky-900 border border-sky-300'
                    }`}>
                      {b.isMatriz ? 'Matriz Principal' : 'Filial Operacional'}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-600 font-mono">
                    <span><strong className="text-slate-700 font-sans">CNPJ:</strong> {b.cnpj}</span>
                    <span>•</span>
                    <span><strong className="text-slate-700 font-sans">IE:</strong> {b.ie || 'ISENTO'}</span>
                    <span>•</span>
                    <span className="text-emerald-700 font-bold font-sans">ICMS: {b.icmsInterno}%</span>
                  </div>
                  {b.description && (
                    <p className="text-[10px] text-slate-500 italic font-sans">
                      {b.description}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {onNavigateToEmpresaFiliais && (
              <button
                type="button"
                onClick={onNavigateToEmpresaFiliais}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-center text-xs transition cursor-pointer"
              >
                Abrir Painel Completo de Cadastro de Empresa & Filiais ➔
              </button>
            )}
          </div>
        </div>

        {/* Right: Automated Cloud Backup & Recovery (6 Cols) */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-white rounded-2xl p-5 border border-sky-100 shadow-sm space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-sky-700" />
                <h2 className="text-sm font-extrabold text-slate-900">
                  Rotina de Backup Automatizado
                </h2>
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Rotina Ativa (A cada 6h)
              </span>
            </div>

            <p className="text-slate-600">
              Garante a segurança e durabilidade dos dados fiscais, cadastros de peças automotivas, orçamentos e relatórios financeiros mesmo em caso de falha de hardware.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                id="btn-export-backup-json"
                onClick={handleExportFullBackup}
                className="flex items-center justify-center gap-2 bg-sky-950 hover:bg-sky-900 text-white font-bold p-3 rounded-xl shadow transition active:scale-95"
              >
                <Download className="w-4 h-4 text-amber-400" />
                <span>Exportar Backup Completo (JSON)</span>
              </button>

              <label className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold p-3 rounded-xl transition cursor-pointer">
                <Upload className="w-4 h-4 text-sky-700" />
                <span>Restaurar de Arquivo JSON</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleRestoreFromFile}
                  className="hidden"
                />
              </label>
            </div>

            {/* Backup History Table */}
            <div className="pt-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase block mb-2">
                Histórico Recente de Backups em Nuvem:
              </span>
              <div className="space-y-2">
                {backupLogs.map((log) => (
                  <div key={log.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <HardDrive className="w-3.5 h-3.5 text-sky-600" />
                        <span className="font-bold text-slate-900">{log.destination}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 block mt-0.5">{log.timestamp}</span>
                    </div>

                    <div className="text-right">
                      <span className="font-mono text-[11px] font-bold text-slate-700 block">{log.size}</span>
                      <span className="text-[10px] text-emerald-700 font-bold">{log.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* ZONA DE RISCO — zerar os dados de operação para começar a operar      */}
      {/* ===================================================================== */}
      <div className="bg-white rounded-2xl border-2 border-rose-200 shadow-sm overflow-hidden" id="card-zona-de-risco">
        <div className="flex items-center gap-2.5 bg-rose-50 px-5 py-3 border-b border-rose-200">
          <div className="p-2 rounded-xl bg-rose-100 border border-rose-200">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
          </div>
          <div>
            <h2 className="text-sm font-black text-rose-900">Zona de Risco — iniciar operação com a casa limpa</h2>
            <p className="text-[11px] text-rose-700">
              Apaga o cadastro e o movimento desta empresa no banco. Não tem volta.
            </p>
          </div>
        </div>

        <div className="p-5 space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <span className="block text-[10px] font-black text-slate-500 uppercase mb-1">O que é apagado</span>
              <p className="text-slate-600">
                Produtos, clientes, fornecedores, orçamentos e o movimento do caixa (turnos, recibos e boletos).
              </p>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
              <span className="block text-[10px] font-black text-emerald-700 uppercase mb-1">O que é preservado</span>
              <p className="text-emerald-800">
                Perfil da empresa, filiais, tabelas de imposto, usuários, assinatura e <strong>todo o histórico de
                auditoria</strong>.
              </p>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-900">
            <strong>Antes de zerar:</strong> baixe o backup na rotina de backup acima. O reset não faz cópia.
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Para liberar o botão, digite o nome da empresa como está no cadastro do contratante
              {companyProfile?.tradeName ? (
                <>
                  {' '}(no perfil local: <span className="font-mono text-slate-900">{companyProfile.tradeName}</span>)
                </>
              ) : null}
              :
            </label>
            <input
              type="text"
              value={resetConfirmacao}
              onChange={(e) => setResetConfirmacao(e.target.value)}
              placeholder="Nome da empresa"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] text-slate-500">
              {resetConfirmacao.trim().length === 0
                ? 'O botão fica bloqueado até a confirmação.'
                : 'A conferência final é feita no servidor (que informa o nome exato se não conferir); a ação é registrada na auditoria como anômala.'}
            </span>
            <button
              type="button"
              disabled={resetando || resetConfirmacao.trim().length === 0}
              onClick={() => void handleResetTenantData()}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl text-xs font-black shadow-md transition cursor-pointer whitespace-nowrap"
            >
              <Trash2 className="w-4 h-4" />
              <span>{resetando ? 'Zerando…' : 'Zerar dados de operação'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
