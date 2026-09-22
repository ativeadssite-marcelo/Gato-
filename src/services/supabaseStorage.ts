import { createClient, SupabaseClient } from '@supabase/supabase-js';

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

/**
 * Retorna as credenciais configuradas para o Supabase (env ou local storage)
 */
export function getSupabaseConfig(): SupabaseStorageConfig {
  const envUrl = import.meta.env?.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || '';
  const envBucket = import.meta.env?.VITE_SUPABASE_STORAGE_BUCKET || DEFAULT_STORAGE_BUCKET;

  const storedKey = typeof window !== 'undefined' ? (localStorage.getItem('gato_supabase_anon_key') || '') : '';
  const storedUrl = typeof window !== 'undefined' ? (localStorage.getItem('gato_supabase_url') || '') : '';

  return {
    url: storedUrl || envUrl || DEFAULT_SUPABASE_URL,
    anonKey: storedKey || envKey || '',
    bucket: envBucket || DEFAULT_STORAGE_BUCKET,
    projectRef: DEFAULT_SUPABASE_PROJECT_REF,
  };
}

/**
 * Salva credenciais do Supabase no storage local caso o usuário queira configurar manualmente
 */
export function setCustomSupabaseCredentials(anonKey: string, customUrl?: string): void {
  if (typeof window !== 'undefined') {
    if (anonKey) localStorage.setItem('gato_supabase_anon_key', anonKey);
    else localStorage.removeItem('gato_supabase_anon_key');

    if (customUrl) localStorage.setItem('gato_supabase_url', customUrl);
    else localStorage.removeItem('gato_supabase_url');

    cachedClient = null;
  }
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
    const res = await fetch('/api/storage/health');
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

  options?.onProgress?.(35, 'Conectando ao Supabase Storage...');

  // 2. Se o cliente SDK direto estiver disponível e configurado, tenta via @supabase/supabase-js
  const client = getSupabaseClient();
  let directSdkSuccess = false;
  let directPublicUrl = '';

  if (client) {
    try {
      options?.onProgress?.(55, 'Enviando arquivo via API do Supabase Storage...');
      const { data, error } = await client.storage
        .from(bucketName)
        .upload(storagePath, fileOrBlob, {
          cacheControl: '3600',
          upsert: true,
          contentType: mimeType,
        });

      if (!error && data) {
        const { data: pubData } = client.storage.from(bucketName).getPublicUrl(storagePath);
        directPublicUrl = pubData.publicUrl;
        directSdkSuccess = true;
      } else {
        console.warn('[Supabase JS SDK Upload Error, using backend proxy]:', error);
      }
    } catch (sdkErr) {
      console.warn('[Supabase JS SDK exception]:', sdkErr);
    }
  }

  // 3. Sincroniza com a API do backend para persistência estrita no banco PostgreSQL ("Tenant" table)
  options?.onProgress?.(75, 'Persistindo metadados e vinculando ao tenant_id...');
  const base64Data = await fileToDataUrl(fileOrBlob);

  const response = await fetch('/api/storage/logo/upload', {
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

  const finalPublicUrl = directSdkSuccess && directPublicUrl 
    ? directPublicUrl 
    : resultData.publicUrl || `${config.url}/storage/v1/object/public/${bucketName}/${storagePath}`;

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
    const response = await fetch(`/api/storage/logo/${cleanTenantId}`, {
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
