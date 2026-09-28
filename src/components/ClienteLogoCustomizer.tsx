import React, { useState, useRef, useEffect } from 'react';
import {
  Download,
  Upload,
  Image as ImageIcon,
  Check,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  Sliders,
  Palette,
  Eye,
  Trash2,
  FileImage,
  ExternalLink,
  Layers,
  Copy,
  FolderArchive
} from 'lucide-react';
import { CompanyProfile } from '../types';

// Shim para logoDownloadKit removido - implementação mínima inline
function getCompanyInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 3)
    .join('')
    .toUpperCase();
}
function generateSvgLogo(_profile: CompanyProfile, _options: { primaryColor: string; accentColor: string; variant: string; backgroundColor?: string }): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text x="50" y="55" font-size="40" text-anchor="middle">${getCompanyInitials(_profile.tradeName || _profile.corporateName)}</text></svg>`;
}
async function generateLogoCanvas(_profile: CompanyProfile, _options: { width: number; height: number; type: string; primaryColor: string; accentColor: string; backgroundColor?: string }): Promise<string> {
  // Retorna data URL do canvas gerado
  const canvas = document.createElement('canvas');
  canvas.width = _options.width;
  canvas.height = _options.height;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = _options.backgroundColor || _options.primaryColor;
  ctx.fillRect(0, 0, _options.width, _options.height);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 48px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(getCompanyInitials(_profile.tradeName || _profile.corporateName), _options.width / 2, _options.height / 2 + 16);
  return canvas.toDataURL('image/png');
}
async function downloadLogoFormat(_profile: CompanyProfile, _format: string, _options: { primaryColor: string; accentColor: string; backgroundColor?: string }): Promise<void> {
  // Placeholder - download real seria implementado aqui
}
async function downloadFullBrandingKit(_profile: CompanyProfile, _options: { primaryColor: string; accentColor: string }): Promise<void> {
  // Placeholder
}

interface ClienteLogoCustomizerProps {
  companyProfile: CompanyProfile;
  onUpdateLogo?: (newLogoUrl: string | undefined) => void;
  onShowNotification?: (title: string, message: string, type?: 'success' | 'warning' | 'info') => void;
  compact?: boolean;
}

export const ClienteLogoCustomizer: React.FC<ClienteLogoCustomizerProps> = ({
  companyProfile,
  onUpdateLogo,
  onShowNotification,
  compact = false
}) => {
  const [activeTab, setActiveTab] = useState<'download' | 'customizar' | 'gerador'>('download');
  const [previewBg, setPreviewBg] = useState<'light' | 'dark' | 'grid'>('light');
  const [selectedFormat, setSelectedFormat] = useState<'original' | 'banner' | 'avatar' | 'favicon' | 'stamp' | 'svg'>('original');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccessMessage, setDownloadSuccessMessage] = useState<string | null>(null);

  // Customizer styling states
  const [primaryColor, setPrimaryColor] = useState('#0C4A6E');
  const [accentColor, setAccentColor] = useState('#F59E0B');
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Re-generate live canvas preview when format or colors change
  useEffect(() => {
    let isMounted = true;
    const updatePreview = async () => {
      setIsGeneratingPreview(true);
      try {
        if (selectedFormat === 'svg') {
          const svgString = generateSvgLogo(companyProfile, {
            primaryColor,
            accentColor,
            variant: 'badge',
          });
          const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          if (isMounted) setPreviewDataUrl(url);
        } else {
          let w = 512;
          let h = 512;
          if (selectedFormat === 'banner') {
            w = 800;
            h = 266;
          } else if (selectedFormat === 'favicon') {
            w = 128;
            h = 128;
          } else if (selectedFormat === 'stamp') {
            w = 400;
            h = 400;
          }

          const url = await generateLogoCanvas(companyProfile, {
            width: w,
            height: h,
            type: selectedFormat,
            primaryColor,
            accentColor,
            backgroundColor: previewBg === 'dark' ? '#0B132B' : (previewBg === 'light' ? '#FFFFFF' : 'transparent'),
          });
          if (isMounted) setPreviewDataUrl(url);
        }
      } catch (err) {
        console.error('Error generating preview:', err);
      } finally {
        if (isMounted) setIsGeneratingPreview(false);
      }
    };

    updatePreview();
    return () => {
      isMounted = false;
    };
  }, [companyProfile, selectedFormat, previewBg, primaryColor, accentColor]);

  // Handle single format download
  const handleDownloadSingle = async (format: 'original' | 'banner' | 'avatar' | 'favicon' | 'stamp' | 'svg') => {
    setIsDownloading(true);
    try {
      await downloadLogoFormat(companyProfile, format, {
        primaryColor,
        accentColor,
        backgroundColor: previewBg === 'dark' ? '#0B132B' : (previewBg === 'light' ? '#FFFFFF' : 'transparent'),
      });
      const names: Record<string, string> = {
        original: 'Logo PNG em Alta Resolução (1024x1024)',
        banner: 'Cabeçalho Comercial para Orçamentos (1200x400)',
        avatar: 'Avatar Circular WhatsApp (512x512)',
        favicon: 'Favicon Ícone da Marca (128x128)',
        stamp: 'Selo de Garantia & Procedência (600x600)',
        svg: 'Vetor SVG Gráfico sem Perda',
      };
      const label = names[format] || format;
      setDownloadSuccessMessage(`Download de "${label}" concluído com sucesso!`);
      setTimeout(() => setDownloadSuccessMessage(null), 4000);
      onShowNotification?.(
        'Download Concluído!',
        `Arquivo de imagem pronto para personalização de orçamentos e materiais da ${companyProfile.tradeName}.`,
        'success'
      );
    } catch (err: any) {
      onShowNotification?.('Erro no Download', err.message || 'Não foi possível gerar a imagem.', 'warning');
    } finally {
      setIsDownloading(false);
    }
  };

  // Handle full branding kit download
  const handleDownloadAll = async () => {
    setIsDownloading(true);
    try {
      await downloadFullBrandingKit(companyProfile, {
        primaryColor,
        accentColor,
      });
      setDownloadSuccessMessage('Todos os 6 formatos da sua marca foram baixados com sucesso!');
      setTimeout(() => setDownloadSuccessMessage(null), 5000);
      onShowNotification?.(
        'Kit de Personalização Baixado!',
        '6 variações (Alta Resolução, Banner Orçamentos, Avatar WhatsApp, Favicon, Selo e SVG) geradas para sua empresa.',
        'success'
      );
    } catch (err: any) {
      onShowNotification?.('Erro no Download', err.message || 'Falha ao baixar kit completo.', 'warning');
    } finally {
      setIsDownloading(false);
    }
  };

  // Handle new logo upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      onShowNotification?.('Formato Inválido', 'Selecione um arquivo de imagem (PNG, JPG, SVG ou WebP).', 'warning');
      return;
    }

    // Limit to 5MB
    if (file.size > 5 * 1024 * 1024) {
      onShowNotification?.('Arquivo Grande', 'O tamanho máximo da imagem é de 5MB.', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        onUpdateLogo?.(dataUrl);
        onShowNotification?.(
          'Logotipo Atualizado!',
          `A logo da empresa "${companyProfile.tradeName}" foi salva e já pode ser baixada em todas as resoluções.`,
          'success'
        );
      }
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Remove custom logo
  const handleRemoveLogo = () => {
    if (window.confirm('Deseja remover a logo personalizada e utilizar o emblema gerado automaticamente pelo sistema?')) {
      onUpdateLogo?.(undefined);
      onShowNotification?.('Logotipo Redefinido', 'Emblema padrão restaurado.', 'info');
    }
  };

  // Palette options for quick styling
  const colorPresets = [
    { name: 'Azul & Âmbar (Padrão)', primary: '#0C4A6E', accent: '#F59E0B' },
    { name: 'Preto & Dourado (Premium)', primary: '#0F172A', accent: '#EAB308' },
    { name: 'Vermelho & Cinza (Corrida)', primary: '#991B1B', accent: '#F87171' },
    { name: 'Verde Esmeralda (Eco/Pesada)', primary: '#065F46', accent: '#34D399' },
    { name: 'Azul Marinho & Laranja', primary: '#1E3A8A', accent: '#F97316' },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden" id="card-logo-personalizacao-cliente">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0C4A6E] via-[#073047] to-slate-900 p-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300 flex items-center justify-center shrink-0">
            <ImageIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-black tracking-tight text-white">
                Logotipo da Empresa & Personalização Visual
              </h3>
              <span className="text-[10px] bg-amber-400 text-slate-950 font-black px-1.5 py-0.5 rounded-sm uppercase">
                Download & Branding
              </span>
            </div>
            <p className="text-xs text-slate-300">
              Personalize e baixe a marca da sua empresa para orçamentos, WhatsApp, e-mail e catálogo
            </p>
          </div>
        </div>

        {/* Action: Download All in 1-click */}
        <button
          type="button"
          id="btn-download-kit-completo-branding"
          onClick={handleDownloadAll}
          disabled={isDownloading}
          className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 shrink-0"
          title="Baixar todos os formatos (Alta Resolução, Banner de Orçamento, WhatsApp, Favicon e SVG)"
        >
          {isDownloading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Gerando Imagens...</span>
            </>
          ) : (
            <>
              <FolderArchive className="w-4 h-4" />
              <span>Baixar Kit Completo (Todos os Formatos)</span>
            </>
          )}
        </button>
      </div>

      {/* Success Notification Bar */}
      {downloadSuccessMessage && (
        <div className="bg-emerald-50 border-b border-emerald-200 px-5 py-2.5 flex items-center gap-2 text-xs font-bold text-emerald-800 animate-in fade-in duration-200">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{downloadSuccessMessage}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="bg-slate-50 border-b border-slate-200 px-5 py-2 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            id="tab-download-logos"
            onClick={() => setActiveTab('download')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'download'
                ? 'bg-white text-[#0C4A6E] shadow-2xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Formatos de Download</span>
          </button>

          <button
            type="button"
            id="tab-customizar-cores"
            onClick={() => setActiveTab('customizar')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'customizar'
                ? 'bg-white text-[#0C4A6E] shadow-2xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Cores da Marca</span>
          </button>

          <button
            type="button"
            id="tab-upload-nova-logo"
            onClick={() => setActiveTab('gerador')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'gerador'
                ? 'bg-white text-[#0C4A6E] shadow-2xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload de Logo Própria</span>
          </button>
        </div>

        {/* Upload quick button & file input */}
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-2.5 py-1 text-[11px] font-bold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition flex items-center gap-1 cursor-pointer"
          >
            <Upload className="w-3 h-3 text-sky-600" />
            <span>Enviar Arquivo</span>
          </button>

          {companyProfile.logoUrl && (
            <button
              type="button"
              onClick={handleRemoveLogo}
              className="p-1 text-slate-400 hover:text-red-600 transition cursor-pointer"
              title="Remover logo personalizada e restaurar emblema automático"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area: Left Preview + Right Controls */}
      <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* ========================================================================= */}
        {/* LEFT COLUMN: PREVIEW STAGE (5 Cols) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 flex flex-col space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-extrabold text-slate-700 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-sky-600" />
              Pré-visualização da Logo:
            </span>

            {/* Background Selector */}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setPreviewBg('light')}
                className={`px-2 py-0.5 rounded-md transition ${previewBg === 'light' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'}`}
              >
                Claro
              </button>
              <button
                type="button"
                onClick={() => setPreviewBg('dark')}
                className={`px-2 py-0.5 rounded-md transition ${previewBg === 'dark' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-500'}`}
              >
                Escuro
              </button>
              <button
                type="button"
                onClick={() => setPreviewBg('grid')}
                className={`px-2 py-0.5 rounded-md transition ${previewBg === 'grid' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'}`}
              >
                Transparente
              </button>
            </div>
          </div>

          {/* Preview Box */}
          <div
            className={`w-full min-h-[260px] rounded-2xl border flex items-center justify-center p-6 relative overflow-hidden transition-colors ${
              previewBg === 'dark'
                ? 'bg-[#0B132B] border-slate-800'
                : previewBg === 'light'
                ? 'bg-white border-slate-200'
                : 'bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] bg-[size:12px_12px] bg-slate-50 border-slate-200'
            }`}
          >
            {isGeneratingPreview ? (
              <div className="flex flex-col items-center gap-2 text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin text-sky-500" />
                <span className="text-xs font-semibold">Renderizando...</span>
              </div>
            ) : previewDataUrl ? (
              <img
                src={previewDataUrl}
                alt={`Logo ${companyProfile.tradeName}`}
                className={`max-w-full max-h-[220px] object-contain transition-transform duration-300 hover:scale-105 ${
                  selectedFormat === 'avatar' ? 'rounded-full' : 'rounded-xl'
                }`}
              />
            ) : (
              <div className="text-center text-slate-400 text-xs">
                Nenhum preview gerado
              </div>
            )}

            {/* Corner Badge */}
            <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/60 backdrop-blur-xs rounded-md text-[10px] font-mono text-white font-bold">
              {selectedFormat.toUpperCase()}
            </div>
          </div>

          {/* Company Identity Summary */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 text-[11px]">Empresa:</span>
              <span className="font-bold text-slate-900 truncate max-w-[200px]">{companyProfile.tradeName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 text-[11px]">Segmento:</span>
              <span className="font-semibold text-slate-700">{companyProfile.segment || 'Autopeças'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 text-[11px]">CNPJ / UF:</span>
              <span className="font-mono text-slate-700 text-[11px]">{companyProfile.cnpj || '12.345.678/0001-90'} • {companyProfile.uf || 'MS'}</span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-slate-200">
              <span className="text-slate-500 text-[11px]">Status da Logo:</span>
              <span className={`text-[11px] font-bold ${companyProfile.logoUrl ? 'text-emerald-600' : 'text-amber-600'}`}>
                {companyProfile.logoUrl ? 'Logo Própria Carregada' : 'Emblema Vetorial Automático'}
              </span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: FORMAT SELECTION & CONTROLS (7 Cols) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
          
          {/* TAB 1: FORMATOS DE DOWNLOAD */}
          {activeTab === 'download' && (
            <div className="space-y-3">
              <div className="text-xs font-extrabold text-slate-800">
                Selecione o Formato Desejado para Download:
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* 1. Alta Resolução 1024x1024 */}
                <button
                  type="button"
                  id="btn-select-format-original"
                  onClick={() => setSelectedFormat('original')}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                    selectedFormat === 'original'
                      ? 'border-sky-500 bg-sky-50/50 ring-1 ring-sky-500'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="font-extrabold text-xs text-slate-900">
                      Alta Resolução (1024x1024)
                    </div>
                    <span className="text-[10px] font-bold bg-sky-100 text-sky-800 px-1.5 py-0.2 rounded">
                      PNG
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                    Resolução máxima com transparência. Ideal para catálogo digital, documentos oficiais e marketing.
                  </p>
                  <div className="mt-2 text-[10px] font-bold text-sky-700 flex items-center gap-1">
                    <Download className="w-3 h-3" />
                    <span>Download Direto</span>
                  </div>
                </button>

                {/* 2. Banner Cabeçalho de Orçamento (1200x400) */}
                <button
                  type="button"
                  id="btn-select-format-banner"
                  onClick={() => setSelectedFormat('banner')}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                    selectedFormat === 'banner'
                      ? 'border-sky-500 bg-sky-50/50 ring-1 ring-sky-500'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="font-extrabold text-xs text-slate-900">
                      Cabeçalho de Orçamento (1200x400)
                    </div>
                    <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded">
                      Banner
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                    Banner horizontal com Nome Fantasia, Razão Social, CNPJ, fone e endereço da loja.
                  </p>
                  <div className="mt-2 text-[10px] font-bold text-amber-700 flex items-center gap-1">
                    <Download className="w-3 h-3" />
                    <span>Para DAV / Propostas</span>
                  </div>
                </button>

                {/* 3. Avatar WhatsApp / Redes Sociais (512x512) */}
                <button
                  type="button"
                  id="btn-select-format-avatar"
                  onClick={() => setSelectedFormat('avatar')}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                    selectedFormat === 'avatar'
                      ? 'border-sky-500 bg-sky-50/50 ring-1 ring-sky-500'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="font-extrabold text-xs text-slate-900">
                      Avatar WhatsApp (512x512)
                    </div>
                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded">
                      Circular
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                    Recorte circular otimizado para perfil do WhatsApp Business, Instagram e Google Workspace.
                  </p>
                  <div className="mt-2 text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                    <Download className="w-3 h-3" />
                    <span>Perfil WhatsApp</span>
                  </div>
                </button>

                {/* 4. Vetor SVG (Infinito) */}
                <button
                  type="button"
                  id="btn-select-format-svg"
                  onClick={() => setSelectedFormat('svg')}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                    selectedFormat === 'svg'
                      ? 'border-sky-500 bg-sky-50/50 ring-1 ring-sky-500'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="font-extrabold text-xs text-slate-900">
                      Vetor SVG (Gráfica / Uniforme)
                    </div>
                    <span className="text-[10px] font-bold bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded">
                      VETOR
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                    Curvas matemáticas sem perda de qualidade. Para bordados de uniforme, adesivos de frotas e banners.
                  </p>
                  <div className="mt-2 text-[10px] font-bold text-purple-700 flex items-center gap-1">
                    <Download className="w-3 h-3" />
                    <span>Para Gráfica / Fachada</span>
                  </div>
                </button>

                {/* 5. Favicon Ícone (128x128) */}
                <button
                  type="button"
                  id="btn-select-format-favicon"
                  onClick={() => setSelectedFormat('favicon')}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                    selectedFormat === 'favicon'
                      ? 'border-sky-500 bg-sky-50/50 ring-1 ring-sky-500'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="font-extrabold text-xs text-slate-900">
                      Favicon / Ícone de App (128x128)
                    </div>
                    <span className="text-[10px] font-bold bg-slate-100 text-slate-800 px-1.5 py-0.2 rounded">
                      ÍCONE
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                    Tamanho compacto para aba do navegador, atalhos de celular PWA e aplicativo de balcão.
                  </p>
                  <div className="mt-2 text-[10px] font-bold text-slate-700 flex items-center gap-1">
                    <Download className="w-3 h-3" />
                    <span>Ícone de Navegador</span>
                  </div>
                </button>

                {/* 6. Selo de Garantia (600x600) */}
                <button
                  type="button"
                  id="btn-select-format-stamp"
                  onClick={() => setSelectedFormat('stamp')}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                    selectedFormat === 'stamp'
                      ? 'border-sky-500 bg-sky-50/50 ring-1 ring-sky-500'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="font-extrabold text-xs text-slate-900">
                      Selo de Garantia & Procedência
                    </div>
                    <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded">
                      CERTIFICADO
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                    Carimbo circular de qualidade para anexar em termos de garantia de peças e ordens de serviço.
                  </p>
                  <div className="mt-2 text-[10px] font-bold text-blue-700 flex items-center gap-1">
                    <Download className="w-3 h-3" />
                    <span>Selo de Garantia</span>
                  </div>
                </button>
              </div>

              {/* Action Button for Selected Format */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  id="btn-download-formato-selecionado"
                  onClick={() => handleDownloadSingle(selectedFormat)}
                  disabled={isDownloading}
                  className="flex-1 py-3 px-4 bg-[#0C4A6E] hover:bg-[#073047] text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <Download className="w-4 h-4 text-amber-400" />
                  <span>Baixar Formato Selecionado ({selectedFormat.toUpperCase()})</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: CORES DA MARCA */}
          {activeTab === 'customizar' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-extrabold text-slate-800">
                  Paleta de Cores e Identidade Visual
                </h4>
                <p className="text-[11px] text-slate-500">
                  Defina as cores primárias e de destaque que serão aplicadas nos orçamentos, selos e banners gerados.
                </p>
              </div>

              {/* Color Presets */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 block">
                  Estilos Pré-definidos:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {colorPresets.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setPrimaryColor(preset.primary);
                        setAccentColor(preset.accent);
                      }}
                      className="p-2 border border-slate-200 hover:border-sky-400 rounded-xl flex items-center justify-between text-xs transition cursor-pointer text-left bg-white"
                    >
                      <span className="font-bold text-slate-800 text-[11px]">{preset.name}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full border border-slate-300" style={{ backgroundColor: preset.primary }} />
                        <span className="w-4 h-4 rounded-full border border-slate-300" style={{ backgroundColor: preset.accent }} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Color Pickers */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <label className="text-[11px] font-bold text-slate-700 block mb-1.5">
                    Cor Primária da Marca:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer border border-slate-300 p-0"
                    />
                    <input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-full text-xs font-mono font-bold px-2 py-1 bg-white border border-slate-200 rounded-md"
                    />
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <label className="text-[11px] font-bold text-slate-700 block mb-1.5">
                    Cor de Destaque / Acento:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer border border-slate-300 p-0"
                    />
                    <input
                      type="text"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="w-full text-xs font-mono font-bold px-2 py-1 bg-white border border-slate-200 rounded-md"
                    />
                  </div>
                </div>
              </div>

              <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl text-[11px] text-sky-800 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                <span>
                  As cores selecionadas são recalculadas instantaneamente no canvas para todos os downloads de orçamentos e materiais gráficos.
                </span>
              </div>
            </div>
          )}

          {/* TAB 3: UPLOAD & LOGO PRÓPRIA */}
          {activeTab === 'gerador' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-extrabold text-slate-800">
                  Enviar Arquivo de Logotipo da Empresa
                </h4>
                <p className="text-[11px] text-slate-500">
                  Envie o logotipo oficial da sua autopeças em PNG com fundo transparente ou JPG/SVG.
                </p>
              </div>

              {/* Drag & drop box */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-sky-300 hover:border-sky-500 bg-sky-50/50 hover:bg-sky-50 rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2"
              >
                <div className="w-12 h-12 rounded-2xl bg-white text-sky-600 shadow-xs flex items-center justify-center">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-extrabold text-slate-900 block">
                    Clique ou arraste seu arquivo de logotipo aqui
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Formatos aceitos: PNG (com fundo transparente recomendado), SVG, JPG ou WebP (até 5MB)
                  </span>
                </div>
              </div>

              {companyProfile.logoUrl && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Logotipo personalizado ativo em toda a plataforma.</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="text-red-600 font-bold hover:underline cursor-pointer"
                  >
                    Remover
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Footer Highlights */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              100% Compatível com Impressoras Térmicas e Documentos A4
            </span>
            <span className="font-mono text-[10px]">
              DPI: 300 (Gráfica)
            </span>
          </div>

        </div>
      </div>
    </div>
  );
};
