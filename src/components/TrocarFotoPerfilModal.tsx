import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Camera, 
  Upload, 
  Trash2, 
  Check, 
  X, 
  Sparkles, 
  User, 
  RefreshCw, 
  ZoomIn, 
  ZoomOut,
  AlertCircle,
  Palette
} from 'lucide-react';
import { UserSession } from '../types';

interface TrocarFotoPerfilModalProps {
  isOpen: boolean;
  onClose: () => void;
  userSession: UserSession | null;
  onSuccess: (newAvatarUrl: string | null) => void;
  onShowNotification?: (title: string, message: string, type?: 'success' | 'warning' | 'info') => void;
}

// Avatares prontos corporativos em alta qualidade (vetores/SVG Data URLs)
const PRESET_AVATARS: Array<{ id: string; name: string; url: string; badge: string }> = [
  {
    id: 'exec-1',
    name: 'Executivo Sênior',
    badge: 'Diretoria',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%230F172A"/><circle cx="50" cy="38" r="20" fill="%23FBBF24"/><path d="M22 88 C25 65 38 60 50 60 C62 60 75 65 78 88 Z" fill="%2338BDF8"/><circle cx="50" cy="36" r="16" fill="%23FEF3C7"/><path d="M38 28 C42 22 58 22 62 28 C64 34 60 36 60 36 C55 33 45 33 40 36 Z" fill="%23475569"/><polygon points="46,60 54,60 52,78 48,78" fill="%23EA580C"/></svg>'
  },
  {
    id: 'exec-2',
    name: 'Gestora Comercial',
    badge: 'Gerência',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%230C4A6E"/><circle cx="50" cy="38" r="20" fill="%23F472B6"/><path d="M20 90 C24 64 36 60 50 60 C64 60 76 64 80 90 Z" fill="%230284C7"/><circle cx="50" cy="36" r="16" fill="%23FCE7F3"/><path d="M33 32 C33 18 67 18 67 32 C67 46 62 48 50 48 C38 48 33 46 33 32 Z" fill="%231E293B"/></svg>'
  },
  {
    id: 'auto-1',
    name: 'Especialista em Autopeças',
    badge: 'Técnico Balcão',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23C2410C"/><circle cx="50" cy="40" r="20" fill="%23FDBA74"/><path d="M22 90 C25 68 38 62 50 62 C62 62 75 68 78 90 Z" fill="%231E293B"/><circle cx="50" cy="38" r="16" fill="%23FED7AA"/><path d="M34 26 C42 18 58 18 66 26 L66 32 L34 32 Z" fill="%23EA580C"/><circle cx="50" cy="24" r="5" fill="%23FFFFFF"/></svg>'
  },
  {
    id: 'auto-2',
    name: 'Consultor de Frotas',
    badge: 'Comercial B2B',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23065F46"/><circle cx="50" cy="38" r="20" fill="%236EE7B7"/><path d="M22 88 C25 65 38 60 50 60 C62 60 75 65 78 88 Z" fill="%23047857"/><circle cx="50" cy="36" r="16" fill="%23D1FAE5"/><path d="M36 26 C44 20 56 20 64 26 C64 30 62 33 50 33 C38 33 36 30 36 26 Z" fill="%23064E3B"/></svg>'
  },
  {
    id: 'tech-1',
    name: 'Admin de Sistemas',
    badge: 'SaaS Master',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%234338CA"/><circle cx="50" cy="38" r="20" fill="%23A5B4FC"/><path d="M20 90 C24 64 36 60 50 60 C64 60 76 64 80 90 Z" fill="%23312E81"/><circle cx="50" cy="36" r="16" fill="%23EEF2FF"/><path d="M35 25 C45 18 55 18 65 25 C65 30 60 32 50 32 C40 32 35 30 35 25 Z" fill="%233730A3"/><circle cx="43" cy="35" r="3" fill="%236366F1"/><circle cx="57" cy="35" r="3" fill="%236366F1"/></svg>'
  },
  {
    id: 'fiscal-1',
    name: 'Analista Fiscal & SEFAZ',
    badge: 'Controladoria',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%231E1B4B"/><circle cx="50" cy="38" r="20" fill="%23FDE047"/><path d="M22 88 C25 65 38 60 50 60 C62 60 75 65 78 88 Z" fill="%234338CA"/><circle cx="50" cy="36" r="16" fill="%23FEF08A"/><rect x="38" y="32" width="24" height="6" rx="3" fill="%231E1B4B"/><polygon points="48,60 52,60 51,76 49,76" fill="%23F59E0B"/></svg>'
  }
];

const COLOR_THEMES = [
  { id: 'navy', label: 'Azul Petróleo', bg: 'bg-gradient-to-br from-[#0C4A6E] to-[#0369A1]', text: 'text-white' },
  { id: 'orange', label: 'Laranja Gato', bg: 'bg-gradient-to-br from-orange-600 to-amber-500', text: 'text-white' },
  { id: 'slate', label: 'Grafite Corporativo', bg: 'bg-gradient-to-br from-slate-900 to-slate-700', text: 'text-white' },
  { id: 'emerald', label: 'Verde Estoque', bg: 'bg-gradient-to-br from-emerald-700 to-teal-500', text: 'text-white' },
  { id: 'purple', label: 'Roxo SaaS', bg: 'bg-gradient-to-br from-purple-800 to-indigo-600', text: 'text-white' },
  { id: 'rose', label: 'Bordô Executivo', bg: 'bg-gradient-to-br from-rose-800 to-pink-600', text: 'text-white' },
];

export const TrocarFotoPerfilModal: React.FC<TrocarFotoPerfilModalProps> = ({
  isOpen,
  onClose,
  userSession,
  onSuccess,
  onShowNotification
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'camera' | 'presets' | 'initials'>('upload');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [selectedColorTheme, setSelectedColorTheme] = useState<string>('navy');

  // Webcam states
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Initialize preview with current user avatar
  useEffect(() => {
    if (isOpen) {
      const email = userSession?.email?.toLowerCase();
      const saved = email ? localStorage.getItem(`gato_user_avatar_${email}`) : null;
      const global = localStorage.getItem('gato_user_profile_avatar');
      setPreviewUrl(userSession?.avatarUrl || saved || global || null);
      setZoomLevel(1);
      setCameraError(null);
    } else {
      stopCameraStream();
    }
  }, [isOpen, userSession]);

  // Clean camera stream on unmount
  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const startCamera = async () => {
    setCameraError(null);
    try {
      stopCameraStream();
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Seu navegador não possui suporte para acesso direto à webcam.');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 640 }, facingMode: 'user' },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err: any) {
      console.warn('Erro ao acessar câmera:', err);
      setCameraError('Permissão para câmera foi negada ou nenhuma webcam foi detectada no dispositivo.');
      setIsCameraActive(false);
    }
  };

  const capturePhotoFromCamera = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    const size = Math.min(video.videoWidth || 400, video.videoHeight || 400);
    canvas.width = 300;
    canvas.height = 300;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Crop center square
    const startX = ((video.videoWidth || 400) - size) / 2;
    const startY = ((video.videoHeight || 400) - size) / 2;

    ctx.drawImage(video, startX, startY, size, size, 0, 0, 300, 300);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setPreviewUrl(dataUrl);
    stopCameraStream();
    setActiveTab('upload');
  };

  // Convert uploaded image file to compressed square data URL
  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      if (onShowNotification) {
        onShowNotification('Formato Inválido', 'Por favor, selecione uma imagem válida (JPG, PNG ou WebP).', 'warning');
      }
      return;
    }

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 320;
        canvas.height = 320;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setIsProcessing(false);
          return;
        }

        // Draw cropped center square
        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;

        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, 320, 320);

        // Convert to compact WebP or JPEG DataURL
        const outputDataUrl = canvas.toDataURL('image/webp', 0.88);
        setPreviewUrl(outputDataUrl);
        setIsProcessing(false);
      };
      img.onerror = () => {
        setIsProcessing(false);
        if (onShowNotification) {
          onShowNotification('Erro na Imagem', 'Não foi possível carregar a imagem selecionada.', 'warning');
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleSave = () => {
    const email = userSession?.email?.toLowerCase();
    const finalAvatar = previewUrl;

    try {
      if (finalAvatar) {
        if (email) {
          localStorage.setItem(`gato_user_avatar_${email}`, finalAvatar);
        }
        localStorage.setItem('gato_user_profile_avatar', finalAvatar);
      } else {
        if (email) {
          localStorage.removeItem(`gato_user_avatar_${email}`);
        }
        localStorage.removeItem('gato_user_profile_avatar');
      }

      // Update current session in localStorage
      const savedSession = localStorage.getItem('gato_user_session');
      if (savedSession) {
        const parsed = JSON.parse(savedSession);
        parsed.avatarUrl = finalAvatar || undefined;
        localStorage.setItem('gato_user_session', JSON.stringify(parsed));
      }

      // Broadcast update event
      window.dispatchEvent(new CustomEvent('gato:avatar_updated', { 
        detail: { avatarUrl: finalAvatar } 
      }));

      onSuccess(finalAvatar);

      if (onShowNotification) {
        onShowNotification(
          'Foto de Perfil Atualizada',
          finalAvatar 
            ? 'Sua nova foto de perfil foi salva e sincronizada com sucesso!' 
            : 'Foto removida. O sistema exibirá suas iniciais corporativas.',
          'success'
        );
      }
      onClose();
    } catch (err) {
      console.error('Erro ao salvar foto:', err);
      if (onShowNotification) {
        onShowNotification('Erro', 'Não foi possível salvar a imagem no armazenamento local.', 'warning');
      }
    }
  };

  const handleRemovePhoto = () => {
    setPreviewUrl(null);
  };

  if (!isOpen) return null;

  const currentInitials = userSession?.avatarInitials || (userSession?.name ? userSession.name.substring(0, 2).toUpperCase() : 'US');
  const activeTheme = COLOR_THEMES.find(t => t.id === selectedColorTheme) || COLOR_THEMES[0];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white max-w-xl w-full rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200 my-auto">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 sm:p-6 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/20 text-orange-400 flex items-center justify-center border border-orange-500/30">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                Trocar Foto do Perfil
                <span className="text-[10px] uppercase font-black bg-orange-600 text-white px-2 py-0.5 rounded-full">
                  LGPD Protegido
                </span>
              </h2>
              <p className="text-xs text-slate-400 truncate max-w-[280px] sm:max-w-md">
                {userSession?.name || 'Usuário'} • {userSession?.email || ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-6">

          {/* Central Live Avatar Preview */}
          <div className="flex flex-col items-center justify-center gap-3 py-2 bg-slate-50/80 rounded-3xl border border-slate-200/80 p-4">
            <div className="relative group">
              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden shadow-lg border-4 border-white ring-4 ring-orange-500/30 flex items-center justify-center bg-slate-200 transition-transform duration-200">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Pré-visualização do Perfil"
                    className="w-full h-full object-cover transition-transform"
                    style={{ transform: `scale(${zoomLevel})` }}
                  />
                ) : (
                  <div className={`w-full h-full ${activeTheme.bg} flex items-center justify-center ${activeTheme.text} font-black text-3xl sm:text-4xl shadow-inner`}>
                    {currentInitials}
                  </div>
                )}
              </div>

              {previewUrl && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-md transition cursor-pointer"
                  title="Remover foto e usar iniciais"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="text-center">
              <p className="text-xs font-bold text-slate-900">
                {previewUrl ? 'Foto personalizada selecionada' : 'Exibindo iniciais corporativas padrão'}
              </p>
              <p className="text-[11px] text-slate-500">
                Esta foto aparecerá no cabeçalho do sistema, cotações, ordens e relatórios.
              </p>
            </div>

            {/* Zoom Slider for custom image */}
            {previewUrl && !previewUrl.startsWith('data:image/svg+xml') && (
              <div className="flex items-center gap-3 w-full max-w-xs pt-1">
                <ZoomOut className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <input
                  type="range"
                  min="0.8"
                  max="1.8"
                  step="0.05"
                  value={zoomLevel}
                  onChange={(e) => setZoomLevel(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
                />
                <ZoomIn className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <button
                  type="button"
                  onClick={() => setZoomLevel(1)}
                  className="text-[10px] font-bold text-slate-500 hover:text-slate-800 px-1 py-0.5"
                  title="Redefinir Zoom"
                >
                  100%
                </button>
              </div>
            )}
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200 gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => {
                stopCameraStream();
                setActiveTab('upload');
              }}
              className={`pb-2.5 px-3 text-xs font-bold transition flex items-center gap-1.5 border-b-2 cursor-pointer ${
                activeTab === 'upload'
                  ? 'border-orange-600 text-orange-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              Upload de Foto
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('camera');
                startCamera();
              }}
              className={`pb-2.5 px-3 text-xs font-bold transition flex items-center gap-1.5 border-b-2 cursor-pointer ${
                activeTab === 'camera'
                  ? 'border-orange-600 text-orange-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              Tirar com Webcam
            </button>
            <button
              type="button"
              onClick={() => {
                stopCameraStream();
                setActiveTab('presets');
              }}
              className={`pb-2.5 px-3 text-xs font-bold transition flex items-center gap-1.5 border-b-2 cursor-pointer ${
                activeTab === 'presets'
                  ? 'border-orange-600 text-orange-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Avatares Prontos
            </button>
            <button
              type="button"
              onClick={() => {
                stopCameraStream();
                setActiveTab('initials');
              }}
              className={`pb-2.5 px-3 text-xs font-bold transition flex items-center gap-1.5 border-b-2 cursor-pointer ${
                activeTab === 'initials'
                  ? 'border-orange-600 text-orange-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              Cores & Iniciais
            </button>
          </div>

          {/* TAB 1: UPLOAD DE ARQUIVO */}
          {activeTab === 'upload' && (
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/webp"
                onChange={handleFileChange}
                className="hidden"
              />

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all ${
                  dragActive 
                    ? 'border-orange-500 bg-orange-50/50' 
                    : 'border-slate-300 hover:border-orange-400 bg-slate-50 hover:bg-orange-50/20'
                }`}
              >
                <div className="w-12 h-12 mx-auto rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-xs sm:text-sm font-bold text-slate-900">
                  {isProcessing ? 'Comprimindo foto...' : 'Clique para selecionar ou arraste uma foto aqui'}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Formatos suportados: JPG, PNG, WebP (máximo 5MB). Otimização e recorte automático 1:1.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: WEBCAM */}
          {activeTab === 'camera' && (
            <div className="space-y-4 text-center">
              {cameraError ? (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs text-left space-y-2">
                  <p className="font-bold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    Câmera Indisponível
                  </p>
                  <p>{cameraError}</p>
                  <button
                    type="button"
                    onClick={startCamera}
                    className="mt-2 px-3 py-1.5 bg-amber-700 text-white rounded-xl font-bold text-[11px] hover:bg-amber-800 transition"
                  >
                    Tentar Novamente
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="relative mx-auto w-56 h-56 sm:w-64 sm:h-64 rounded-3xl overflow-hidden bg-black shadow-inner border-2 border-slate-700 flex items-center justify-center">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover mirror"
                    />
                    <div className="absolute inset-0 pointer-events-none border-2 border-dashed border-white/50 rounded-full m-4"></div>
                  </div>

                  <div className="flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={capturePhotoFromCamera}
                      className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black text-xs flex items-center gap-2 shadow-md transition cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      Capturar Foto Agora
                    </button>
                    <button
                      type="button"
                      onClick={startCamera}
                      className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl transition cursor-pointer"
                      title="Reiniciar Câmera"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: AVATARES PRONTOS */}
          {activeTab === 'presets' && (
            <div className="space-y-3">
              <p className="text-[11px] text-slate-500 font-medium">
                Escolha um perfil visual ilustrado de autopeças e gestão corporativa:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {PRESET_AVATARS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setPreviewUrl(preset.url);
                      setZoomLevel(1);
                    }}
                    className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition cursor-pointer ${
                      previewUrl === preset.url
                        ? 'border-orange-500 bg-orange-50/70 ring-2 ring-orange-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <img
                      src={preset.url}
                      alt={preset.name}
                      className="w-10 h-10 rounded-full shadow-xs object-cover shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-900 truncate">{preset.name}</p>
                      <span className="text-[10px] text-orange-600 font-semibold truncate block">
                        {preset.badge}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: CORES & INICIAIS */}
          {activeTab === 'initials' && (
            <div className="space-y-4">
              <div className="p-3 bg-sky-50 rounded-2xl border border-sky-100 text-xs text-sky-900">
                <p className="font-bold flex items-center gap-1.5">
                  <User className="w-4 h-4 text-sky-600" />
                  Padrão Corporativo por Iniciais
                </p>
                <p className="text-[11px] text-sky-700 mt-0.5">
                  Selecione o gradiente de fundo que acompanhará suas iniciais <strong>{currentInitials}</strong>:
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {COLOR_THEMES.map((theme) => (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => {
                      setSelectedColorTheme(theme.id);
                      setPreviewUrl(null); // Clear photo to show initials
                    }}
                    className={`p-2.5 rounded-2xl border text-left flex items-center gap-2.5 transition cursor-pointer ${
                      selectedColorTheme === theme.id && !previewUrl
                        ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full ${theme.bg} flex items-center justify-center text-white font-black text-xs shrink-0 shadow-xs`}>
                      {currentInitials}
                    </div>
                    <span className="text-xs font-bold text-slate-800 truncate">
                      {theme.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
          <div className="w-full sm:w-auto">
            {previewUrl && (
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="w-full sm:w-auto text-xs font-bold text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-3 py-2 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Remover Foto Atual
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-2xl font-bold text-xs transition cursor-pointer shadow-2xs"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 sm:flex-initial px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black text-xs transition flex items-center justify-center gap-2 shadow-md cursor-pointer"
            >
              <Check className="w-4 h-4" />
              Salvar Foto de Perfil
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
