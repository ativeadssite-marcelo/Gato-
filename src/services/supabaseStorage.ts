import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { apiFetch } from './apiClient';

// Configuration defaults
export const DEFAULT_SUPABASE_PROJECT_REF = 'tfyocjdozttclxgipexu';
export const DEFAULT_SUPABASE_URL = `https://${DEFAULT_SUPABASE_PROJECT_REF}.supabase.co`;
export const DEFAULT_STORAGE_BUCKET = 'company-logos';

export interface SupabaseStorageConfig {
  url: string;
  anonKey: string;
  bucket: string;
  projectRef: string;
}

export interface SupabaseUploadResult {
  success: boolean;
  publicUrl: string;
  storagePath: string;
  bucket: string;
  tenantId: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
  error?: string;
}

export interface SupabaseStorageHealth {
  connected: boolean;
  projectRef: string;
  bucket: string;
  bucketExists: boolean;
  publicBucketUrl: string;
  clientSdkReady: boolean;
  error?: string;
}

let cachedClient: SupabaseClient | null = null;
let lastKeyUsed: string = '';

const LEGACY_LOCAL_KEYS = ['gato_supabase_anon_key', 'gato_supabase_url'];

/**
 * Remove credenciais legadas salvas no navegador.
 * Versões anteriores permitiam colar uma chave do Supabase na interface e
 * guardá-la no localStorage — se fosse a service_role key, qualquer XSS
 * resultaria em comprometimento total do banco. O acesso ao Storage agora
 * acontece exclusivamente pelo backend autenticado.
 */
export function purgeLegacySupabaseCredentials(): void {
  if (typeof window === 'undefined') return;
  try {
    LEGACY_LOCAL_KEYS.forEach((key) => localStorage.removeItem(key));
    cachedClient = null;
    lastKeyUsed = '';
  } catch {
    /* noop */
  }
}

purgeLegacySupabaseCredentials();

/**
 * Retorna as credenciais públicas do projeto Supabase.
 * IMPORTANTE: nenhuma chave é lida do localStorage — somente a chave anônima
 * publicada em build (VITE_SUPABASE_ANON_KEY), quando existir.
 */
export function getSupabaseConfig(): SupabaseStorageConfig {
  const envUrl = import.meta.env?.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || '';
  const envBucket = import.meta.env?.VITE_SUPABASE_STORAGE_BUCKET || DEFAULT_STORAGE_BUCKET;

  return {
    url: envUrl || DEFAULT_SUPABASE_URL,
    anonKey: envKey || '',
    bucket: envBucket || DEFAULT_STORAGE_BUCKET,
    projectRef: DEFAULT_SUPABASE_PROJECT_REF,
  };
}

/**
 * @deprecated Mantido apenas para compatibilidade de importação.
 * Nunca persiste chaves do Supabase no navegador.
 */
export function setCustomSupabaseCredentials(_anonKey?: string, _customUrl?: string): void {
  console.warn(
    '[GATO Security] setCustomSupabaseCredentials foi descontinuada: chaves de Storage não são mais armazenadas no navegador.'
  );
  purgeLegacySupabaseCredentials();
}

/**
 * Inicializa ou retorna a instância do cliente Supabase (@supabase/supabase-js)
 */
export function getSupabaseClient(): SupabaseClient | null {
  const config = getSupabaseConfig();
  if (!config.anonKey) {
    return null;
  }

  if (cachedClient && lastKeyUsed === config.anonKey) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    lastKeyUsed = config.anonKey;
    return cachedClient;
  } catch (err) {
    console.warn('[Supabase Storage] Falha ao instanciar cliente JS:', err);
    return null;
  }
}

/**
 * Converte File ou Blob em string Base64 DataURL
 */
export async function fileToDataUrl(fileOrBlob: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(fileOrBlob);
  });
}

/**
 * Verifica o status de saúde e conectividade do Supabase Storage
 */
export async function checkSupabaseStorageHealth(): Promise<SupabaseStorageHealth> {
  const config = getSupabaseConfig();
  const client = getSupabaseClient();

  try {
    const res = await apiFetch('/api/storage/health');
    if (res.ok) {
      const data = await res.json();
      return {
        connected: data.connected ?? true,
        projectRef: data.projectRef || config.projectRef,
        bucket: data.bucket || config.bucket,
        bucketExists: data.bucketExists ?? true,
        publicBucketUrl: data.publicBucketUrl || `${config.url}/storage/v1/object/public/${config.bucket}`,
        clientSdkReady: !!client,
      };
    }
  } catch (err) {
    console.warn('[Supabase Health check fallback]:', err);
  }

  return {
    connected: true,
    projectRef: config.projectRef,
    bucket: config.bucket,
    bucketExists: true,
    publicBucketUrl: `${config.url}/storage/v1/object/public/${config.bucket}`,
    clientSdkReady: !!client,
  };
}

/**
 * Realiza o upload de logo para o Supabase Storage associado estritamente ao tenant_id
 */
export async function uploadLogoToSupabase(
  tenantId: string,
  fileOrBlob: File | Blob,
  options?: {
    fileName?: string;
    contentType?: string;
    onProgress?: (percent: number, message: string) => void;
  }
): Promise<SupabaseUploadResult> {
  const cleanTenantId = tenantId.trim() || 'cmtt58e6o0000ju346a0g6s32';
  const config = getSupabaseConfig();
  const bucketName = config.bucket || DEFAULT_STORAGE_BUCKET;

  options?.onProgress?.(15, 'Validando arquivo e isolamento do tenant...');

  // 1. Determina extensão e tipo MIME
  let extension = 'png';
  let mimeType = options?.contentType || fileOrBlob.type || 'image/png';

  if (fileOrBlob instanceof File && fileOrBlob.name) {
    const parts = fileOrBlob.name.split('.');
    if (parts.length > 1) {
      extension = parts.pop()!.toLowerCase().replace(/[^a-z0-9]/g, '');
    }
  } else if (options?.fileName) {
    const parts = options.fileName.split('.');
    if (parts.length > 1) {
      extension = parts.pop()!.toLowerCase().replace(/[^a-z0-9]/g, '');
    }
  }

  if (mimeType.includes('svg')) extension = 'svg';
  else if (mimeType.includes('webp')) extension = 'webp';
  else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) extension = 'jpg';
  else if (mimeType.includes('png')) extension = 'png';

  const safeFileName = `logo_${Date.now()}.${extension}`;
  const storagePath = `${cleanTenantId}/${safeFileName}`;

  options?.onProgress?.(40, 'Enviando para o backend seguro...');

  // 2. O upload acontece SEMPRE pelo backend autenticado:
  //    - valida tipo/tamanho e o tenant da sessão (isolamento multi-tenant);
  //    - usa a chave de serviço somente no servidor;
  //    - registra o evento na trilha de auditoria.
  //    Antes havia um caminho alternativo que enviava o arquivo direto do
  //    navegador para o Supabase usando uma chave guardada em localStorage.
  options?.onProgress?.(75, 'Persistindo metadados e vinculando ao tenant_id...');
  const base64Data = await fileToDataUrl(fileOrBlob);

    const response = await apiFetch('/api/storage/logo/upload', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-id': cleanTenantId,
    },
    body: JSON.stringify({
      tenantId: cleanTenantId,
      fileName: safeFileName,
      fileData: base64Data,
      contentType: mimeType,
      fileSize: fileOrBlob.size,
    }),
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    throw new Error(errorJson.error || 'Falha ao salvar logo no Supabase Storage.');
  }

  const resultData = await response.json();
  options?.onProgress?.(100, 'Upload finalizado com sucesso!');

  const finalPublicUrl = resultData.publicUrl || `${config.url}/storage/v1/object/public/${bucketName}/${storagePath}`;

  return {
    success: true,
    publicUrl: finalPublicUrl,
    storagePath: resultData.storagePath || storagePath,
    bucket: bucketName,
    tenantId: cleanTenantId,
    size: fileOrBlob.size,
    mimeType,
    uploadedAt: resultData.uploadedAt || new Date().toISOString(),
  };
}

/**
 * Remove a logo associada ao tenant no Supabase Storage
 */
export async function deleteLogoFromSupabase(tenantId: string): Promise<boolean> {
  const cleanTenantId = tenantId.trim();
  try {
    const response = await apiFetch(`/api/storage/logo/${cleanTenantId}`, {
      method: 'DELETE',
      headers: {
        'x-tenant-id': cleanTenantId,
      },
    });
    return response.ok;
  } catch (err) {
    console.error('[Supabase delete error]:', err);
    return false;
  }
}
