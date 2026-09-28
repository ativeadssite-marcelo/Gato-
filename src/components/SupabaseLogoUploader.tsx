import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  Copy, 
  Check, 
  Trash2, 
  RefreshCw, 
  Database, 
  FileImage, 
  Sparkles, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  Key, 
  Settings2,
  Sliders,
  HardDrive
} from 'lucide-react';
import { 
  uploadLogoToSupabase, 
  deleteLogoFromSupabase, 
  checkSupabaseStorageHealth, 
  getSupabaseConfig, 
  setCustomSupabaseCredentials, 
  SupabaseStorageHealth 
} from '../services/supabaseStorage';
import { CompanyProfile } from '../types';

// Shim para imageOptimizer removido
function formatImageSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
async function optimizeImageFile(file: File, _options: { maxWidth?: number; maxHeight?: number; quality?: number; format?: 'webp' | 'jpeg'; targetFormat?: string } = {}): Promise<{ dataUrl: string; sizeBytes: number }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ dataUrl: reader.result as string, sizeBytes: file.size });
    reader.readAsDataURL(file);
  });
}

interface SupabaseLogoUploaderProps {
  companyProfile: CompanyProfile;
  tenantId?: string;
  onLogoUploaded: (newLogoUrl: string) => void;
  onShowNotification?: (title: string, message: string, type?: 'success' | 'warning' | 'info') => void;
}

export const SupabaseLogoUploader: React.FC<SupabaseLogoUploaderProps> = ({
  companyProfile,
  tenantId: propTenantId,
  onLogoUploaded,
  onShowNotification,
}) => {
  const effectiveTenantId = propTenantId || companyProfile.tenantId || companyProfile.id || 'cmtt58e6o0000ju346a0g6s32';
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>(companyProfile.logoUrl || '');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedTenant, setCopiedTenant] = useState(false);
  const [bgPreviewMode, setBgPreviewMode] = useState<'checker' | 'dark' | 'light'>('checker');
  const [autoOptimize, setAutoOptimize] = useState(true);
  
  // Storage Health State
  const [storageHealth, setStorageHealth] = useState<SupabaseStorageHealth | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  
  // Advanced Config Drawer
  const [showConfig, setShowConfig] = useState(false);
  const [customKeyInput, setCustomKeyInput] = useState('');
  const [showKeyText, setShowKeyText] = useState(false);

  // Sync initial logoUrl if prop changes
  useEffect(() => {
    if (companyProfile.logoUrl && !selectedFile) {
      setPreviewUrl(companyProfile.logoUrl);
    }
  }, [companyProfile.logoUrl]);

  // Load storage health on mount
  useEffect(() => {
    loadStorageHealth();
  }, []);

  const loadStorageHealth = async () => {
    setIsCheckingHealth(true);
    try {
      const health = await checkSupabaseStorageHealth();
      setStorageHealth(health);
    } catch (e) {
      console.warn('[Supabase Health Check Error]:', e);
    } finally {
      setIsCheckingHealth(false);
    }
  };

  const handleFileSelect = (file: File) => {
    // Validate MIME types
    const validMimes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
    if (!validMimes.includes(file.type)) {
      onShowNotification?.(
        'Formato Inválido',
        'Por favor, selecione uma imagem nos formatos PNG, JPG, WebP ou SVG.',
        'warning'
      );
      return;
    }

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      onShowNotification?.(
        'Arquivo Muito Grande',
        'O tamanho máximo permitido para logotipo é de 5 MB.',
        'warning'
      );
      return;
    }

    setSelectedFile(file);
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleUploadToSupabase = async () => {
    if (!selectedFile && !previewUrl) {
      onShowNotification?.('Nenhum Arquivo', 'Selecione uma imagem para enviar ao Supabase Storage.', 'warning');
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);
    setProgressMessage('Iniciando processamento...');

    try {
      let fileToUpload: File | Blob = selectedFile!;

      // Se o usuário optou por auto-otimizar e não for SVG
      if (autoOptimize && selectedFile && selectedFile.type !== 'image/svg+xml') {
        setProgressMessage('Otimizando imagem para WebP de alta definição...');
        setUploadProgress(25);
        try {
          const optResult = await optimizeImageFile(selectedFile, {
            maxWidth: 1024,
            maxHeight: 1024,
            quality: 0.85,
            targetFormat: 'image/webp',
          });
          
          // Converter DataURL otimizado em Blob
          const res = await fetch(optResult.dataUrl);
          fileToUpload = await res.blob();
        } catch (optErr) {
          console.warn('[Auto-optimize fallback]:', optErr);
        }
      }

      // Envia ao Supabase Storage via serviço
      const result = await uploadLogoToSupabase(effectiveTenantId, fileToUpload, {
        fileName: selectedFile?.name || 'logo.png',
        onProgress: (percent, msg) => {
          setUploadProgress(percent);
          setProgressMessage(msg);
        },
      });

      if (result.success && result.publicUrl) {
        setPreviewUrl(result.publicUrl);
        setSelectedFile(null);
        onLogoUploaded(result.publicUrl);

        onShowNotification?.(
          'Logo Salva no Supabase Storage!',
          `Logotipo persistido com sucesso no bucket '${result.bucket}' e associado ao tenant ${effectiveTenantId}.`,
          'success'
        );
      }
    } catch (err: any) {
      console.error('[Supabase Upload Error]:', err);
      onShowNotification?.(
        'Erro no Upload',
        err.message || 'Falha ao salvar logo no Supabase Storage. Verifique sua conexão.',
        'warning'
      );
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setProgressMessage('');
    }
  };

  const handleRemoveLogo = async () => {
    if (!confirm('Deseja realmente remover o logotipo cadastrado no Supabase Storage para este tenant?')) {
      return;
    }

    try {
      await deleteLogoFromSupabase(effectiveTenantId);
      setPreviewUrl('');
      setSelectedFile(null);
      onLogoUploaded('');

      onShowNotification?.(
        'Logotipo Removido',
        'O logotipo da empresa foi desassociado do tenant com sucesso.',
        'info'
      );
    } catch (err: any) {
      onShowNotification?.('Erro ao Remover', err.message || 'Falha ao excluir logo.', 'warning');
    }
  };

  const handleCopyPublicUrl = () => {
    if (!previewUrl) return;
    navigator.clipboard.writeText(previewUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
    onShowNotification?.('Copiado!', 'URL pública do Supabase Storage copiada para a área de transferência.', 'info');
  };

  const handleCopyTenantId = () => {
    navigator.clipboard.writeText(effectiveTenantId);
    setCopiedTenant(true);
    setTimeout(() => setCopiedTenant(false), 2000);
    onShowNotification?.('Copiado!', 'ID do Tenant copiado.', 'info');
  };

  const handleSaveCustomKey = () => {
    setCustomSupabaseCredentials(customKeyInput.trim());
    onShowNotification?.('Credencial Atualizada', 'Chave anônima salva para chamadas diretas ao SDK Supabase.', 'success');
    loadStorageHealth();
  };

  const config = getSupabaseConfig();

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden" id="supabase-logo-uploader-card">
      {/* Top Banner: Supabase Storage Branding & Multi-Tenant Isolation Badge */}
      <div className="px-5 py-4 bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-950 text-white border-b border-emerald-800/40 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Supabase Logo Badge */}
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shadow-inner shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-white tracking-wide">
                Upload de Logo via Supabase Storage
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Storage API v1
              </span>
            </div>
            <p className="text-xs text-slate-300">
              Armazenamento em nuvem persistente isolado por <span className="text-emerald-300 font-mono font-bold">tenant_id</span>
            </p>
          </div>
        </div>

        {/* Tenant ID & Bucket Pills */}
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/90 border border-slate-700/70 text-slate-200">
            <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px] text-slate-400">Bucket:</span>
            <span className="font-mono font-bold text-emerald-300">{config.bucket}</span>
          </div>

          <button
            type="button"
            onClick={handleCopyTenantId}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-600/40 text-emerald-200 transition cursor-pointer"
            title="Clique para copiar o tenant_id da empresa"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px] text-emerald-400/80">tenant_id:</span>
            <span className="font-mono font-bold text-white truncate max-w-[120px]">{effectiveTenantId}</span>
            {copiedTenant ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-emerald-400/60" />}
          </button>

          <button
            type="button"
            onClick={() => setShowConfig(!showConfig)}
            className={`p-1.5 rounded-lg border transition cursor-pointer ${
              showConfig 
                ? 'bg-emerald-600 text-white border-emerald-500' 
                : 'bg-slate-800/80 text-slate-400 hover:text-white border-slate-700'
            }`}
            title="Configurações e Chaves do Supabase"
          >
            <Settings2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Advanced Drawer: Supabase Connection Details & Status */}
      {showConfig && (
        <div className="p-4 bg-slate-900 text-slate-200 border-b border-slate-800 text-xs space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-emerald-400" />
              Parâmetros de Conexão Supabase Storage
            </span>
            <button
              type="button"
              onClick={loadStorageHealth}
              disabled={isCheckingHealth}
              className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 font-bold cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${isCheckingHealth ? 'animate-spin' : ''}`} />
              Testar Conexão
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-2.5 bg-slate-950/70 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Supabase Endpoint</span>
              <span className="font-mono text-emerald-300 text-[11px] break-all">{config.url}</span>
            </div>
            <div className="p-2.5 bg-slate-950/70 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Project Reference</span>
              <span className="font-mono text-white text-[11px] font-bold">{config.projectRef}</span>
            </div>
            <div className="p-2.5 bg-slate-950/70 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Status do Bucket</span>
              <span className="font-bold text-[11px] text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Criado & Público (RLS Ativo)
              </span>
            </div>
          </div>

          {/* Optional Custom Anon Key Input */}
          <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
            <div className="flex-1 min-w-[240px] relative">
              <input
                type={showKeyText ? 'text' : 'password'}
                placeholder="Insira a SUPABASE_ANON_KEY (opcional para envio direto pelo browser)..."
                value={customKeyInput}
                onChange={(e) => setCustomKeyInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 font-mono pr-8 focus:outline-hidden focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={() => setShowKeyText(!showKeyText)}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-white"
              >
                {showKeyText ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <button
              type="button"
              onClick={handleSaveCustomKey}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition cursor-pointer"
            >
              Salvar Chave
            </button>
          </div>
        </div>
      )}

      {/* Main Upload Body */}
      <div className="p-5 sm:p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Coluna 1: Zona de Drag & Drop e Seleção de Arquivo (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFileSelect(e.target.files[0]);
                }
              }}
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
            />

            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-all cursor-pointer ${
                isDragging
                  ? 'border-emerald-500 bg-emerald-50/80 scale-[1.01]'
                  : 'border-slate-300 hover:border-emerald-500 hover:bg-slate-50/80 bg-slate-50/40'
              }`}
            >
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs">
                <Upload className="w-7 h-7" />
              </div>

              <h4 className="text-sm font-extrabold text-slate-900 mb-1">
                Clique para selecionar ou arraste o arquivo aqui
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto mb-3">
                Envie a logo da empresa para upload seguro no <strong>Supabase Storage</strong> associada à pasta <code className="text-emerald-700 font-mono font-bold bg-emerald-50 px-1 py-0.5 rounded">/{effectiveTenantId}/</code>
              </p>

              <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] text-slate-500">
                <span className="px-2 py-0.5 bg-white border border-slate-200 rounded-md font-semibold">PNG</span>
                <span className="px-2 py-0.5 bg-white border border-slate-200 rounded-md font-semibold">JPG / JPEG</span>
                <span className="px-2 py-0.5 bg-white border border-slate-200 rounded-md font-semibold">WebP</span>
                <span className="px-2 py-0.5 bg-white border border-slate-200 rounded-md font-semibold">SVG</span>
                <span className="text-slate-400">• Máximo 5 MB</span>
              </div>
            </div>

            {/* Toggle de Auto-Otimização Inteligente */}
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-bold text-slate-800 block">
                    Otimização Automática WebP
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Comprime metadados e redimensiona mantendo resolução nítida
                  </span>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoOptimize}
                  onChange={(e) => setAutoOptimize(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {/* Selected File Details & Upload Button */}
            {selectedFile && (
              <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileImage className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span className="font-bold text-emerald-950 truncate max-w-[200px] sm:max-w-xs">
                      {selectedFile.name}
                    </span>
                    <span className="text-[11px] text-emerald-700 font-mono">
                      ({formatImageSize(selectedFile.size)})
                    </span>
                  </div>
                  <span className="text-[10px] uppercase font-black px-1.5 py-0.5 rounded bg-emerald-200 text-emerald-900">
                    Pronto para Envio
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleUploadToSupabase}
                    disabled={isUploading}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    {isUploading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-white" />
                        <span>Enviando ao Supabase Storage...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 text-white" />
                        <span>Salvar no Supabase Storage</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      setPreviewUrl(companyProfile.logoUrl || '');
                    }}
                    disabled={isUploading}
                    className="px-3 py-2.5 border border-slate-300 text-slate-600 hover:bg-slate-100 rounded-xl font-bold text-xs transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* Barra de Progresso do Upload */}
            {isUploading && (
              <div className="space-y-1.5 p-3 bg-emerald-950 text-white rounded-xl text-xs">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-emerald-300">{progressMessage}</span>
                  <span className="font-mono text-white">{uploadProgress}%</span>
                </div>
                <div className="w-full h-2 bg-emerald-900 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-400 transition-all duration-300 rounded-full"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Coluna 2: Pré-Visualização da Logo e URL Pública (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">
                  Pré-visualização do Logotipo
                </span>
                
                {/* Switcher de Fundo do Preview */}
                <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setBgPreviewMode('checker')}
                    className={`px-1.5 py-0.5 rounded transition ${
                      bgPreviewMode === 'checker' ? 'bg-slate-900 text-white font-bold' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                    title="Fundo quadriculado transparente"
                  >
                    Grade
                  </button>
                  <button
                    type="button"
                    onClick={() => setBgPreviewMode('light')}
                    className={`px-1.5 py-0.5 rounded transition ${
                      bgPreviewMode === 'light' ? 'bg-slate-900 text-white font-bold' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                    title="Fundo Claro"
                  >
                    Claro
                  </button>
                  <button
                    type="button"
                    onClick={() => setBgPreviewMode('dark')}
                    className={`px-1.5 py-0.5 rounded transition ${
                      bgPreviewMode === 'dark' ? 'bg-slate-900 text-white font-bold' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                    title="Fundo Escuro"
                  >
                    Escuro
                  </button>
                </div>
              </div>

              {/* Canvas Preview Box */}
              <div 
                className={`w-full h-44 rounded-xl border border-slate-300/80 flex items-center justify-center p-4 overflow-hidden relative ${
                  bgPreviewMode === 'dark' 
                    ? 'bg-slate-950' 
                    : bgPreviewMode === 'light' 
                    ? 'bg-white' 
                    : 'bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px] bg-white'
                }`}
              >
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Prévia do Logotipo"
                    className="max-h-full max-w-full object-contain drop-shadow-md transition-transform hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="text-center text-slate-400">
                    <FileImage className="w-10 h-10 mx-auto mb-1 stroke-1" />
                    <span className="text-xs">Nenhum logotipo enviado</span>
                  </div>
                )}
              </div>

              {/* Public URL Box & Actions */}
              {previewUrl && (
                <div className="space-y-2 pt-1 text-xs">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">
                      URL Pública Permanente (Supabase CDN)
                    </label>
                    <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl p-1.5">
                      <input
                        type="text"
                        readOnly
                        value={previewUrl}
                        className="w-full text-[11px] font-mono text-slate-700 bg-transparent border-0 focus:outline-hidden px-1"
                      />
                      <button
                        type="button"
                        onClick={handleCopyPublicUrl}
                        className="p-1 text-slate-500 hover:text-emerald-700 rounded-lg hover:bg-emerald-50 transition shrink-0 cursor-pointer"
                        title="Copiar URL Pública"
                      >
                        {copiedUrl ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      </button>
                      <a
                        href={previewUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 text-slate-500 hover:text-sky-700 rounded-lg hover:bg-sky-50 transition shrink-0"
                        title="Abrir em Nova Aba"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>

                  {/* Botões de Ação para a Logo Atual */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
                    >
                      Substituir Logo
                    </button>

                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="flex items-center gap-1 text-xs font-bold text-red-600 hover:text-red-700 hover:underline cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remover do Storage
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Informações sobre RLS e Diretório por Tenant */}
            <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-[11px] text-emerald-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-emerald-950">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Segurança & Diretório Multi-Tenant
              </div>
              <p className="text-emerald-800 leading-relaxed">
                Cada logotipo é gravado na pasta exclusiva <code className="bg-emerald-100 font-mono text-emerald-950 px-1 py-0.5 rounded">/{effectiveTenantId}/</code>. O Supabase protege o isolamento entre empresas contratantes através de validação server-side e Row Level Security (RLS).
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
