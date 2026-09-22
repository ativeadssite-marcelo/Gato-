// =========================================================================
// CLIENTE HTTP AUTENTICADO — GATO SaaS
// =========================================================================
// Todas as chamadas às APIs internas passam por aqui para enviar o token de
// sessão assinado pelo servidor. O token é guardado em sessionStorage (vive
// apenas na aba/janela) e nunca em localStorage, reduzindo o impacto de
// scripts de terceiros e de máquinas compartilhadas.
//
// Importante: este arquivo NÃO contém nenhum segredo. A identidade, o papel e
// o tenant são resolvidos exclusivamente no servidor a partir do token.
// =========================================================================

const TOKEN_KEY = 'gato_session_token';
const UNAUTHORIZED_EVENT = 'gato:unauthorized';

let memoryToken: string | null = null;
let unauthorizedNotified = false;

function safeSessionStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.sessionStorage : null;
  } catch {
    return null;
  }
}

/** Define (ou limpa) o token de sessão atual. */
export function setSessionToken(token: string | null): void {
  memoryToken = token && token.trim() ? token.trim() : null;
  unauthorizedNotified = false;
  const storage = safeSessionStorage();
  if (!storage) return;
  try {
    if (memoryToken) storage.setItem(TOKEN_KEY, memoryToken);
    else storage.removeItem(TOKEN_KEY);
  } catch {
    /* storage indisponível: mantém apenas em memória */
  }
}

/** Recupera o token de sessão atual (memória → sessionStorage). */
export function getSessionToken(): string | null {
  if (memoryToken) return memoryToken;
  const storage = safeSessionStorage();
  if (!storage) return null;
  try {
    const stored = storage.getItem(TOKEN_KEY);
    memoryToken = stored && stored.trim() ? stored.trim() : null;
    return memoryToken;
  } catch {
    return null;
  }
}

export function hasSessionToken(): boolean {
  return !!getSessionToken();
}

/** Marcador de que a identidade foi confirmada pelo servidor nesta aba. */
export const VERIFIED_SESSION_KEY = 'gato_session_verified';

export function markSessionVerified(): void {
  const storage = safeSessionStorage();
  try {
    storage?.setItem(VERIFIED_SESSION_KEY, 'true');
  } catch {
    /* noop */
  }
}

export function isSessionVerified(): boolean {
  const storage = safeSessionStorage();
  try {
    return storage?.getItem(VERIFIED_SESSION_KEY) === 'true';
  } catch {
    return false;
  }
}

export function clearSessionToken(): void {
  setSessionToken(null);
  const storage = safeSessionStorage();
  try {
    storage?.removeItem(VERIFIED_SESSION_KEY);
  } catch {
    /* noop */
  }
}

/** Cabeçalhos padrão das chamadas autenticadas. */
export function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = getSessionToken();
  return token ? { Authorization: `Bearer ${token}`, ...extra } : { ...extra };
}

/**
 * Envelope de resposta do backend quando a sessão é inválida.
 */
export class ApiError extends Error {
  status: number;
  code?: string;
  retryAfter?: number;

  constructor(message: string, status: number, code?: string, retryAfter?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.retryAfter = retryAfter;
  }
}

/**
 * fetch autenticado para as APIs internas do GATO.
 * - Injeta o token de sessão;
 * - Encerra a sessão local e avisa a aplicação em respostas 401;
 * - Lança ApiError com a mensagem segura devolvida pelo servidor.
 */
export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers || {});
  const token = getSessionToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(input, {
    ...init,
    headers,
    credentials: 'same-origin',
  });

  if (response.status === 401) {
    clearSessionToken();
    if (!unauthorizedNotified && typeof window !== 'undefined') {
      unauthorizedNotified = true;
      // A aplicação escuta este evento para voltar à tela de login.
      window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT, { detail: { url: input } }));
    }
  }

  return response;
}

/** Igual a apiFetch, mas já devolve o JSON e lança ApiError em falhas. */
export async function apiJson<T = any>(input: string, init: RequestInit = {}): Promise<T> {
  const response = await apiFetch(input, init);
  const isJson = (response.headers.get('content-type') || '').includes('application/json');
  const body = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    const retryAfter = Number(response.headers.get('Retry-After')) || undefined;
    throw new ApiError(
      body?.error || `Falha na requisição (${response.status}).`,
      response.status,
      body?.code,
      retryAfter
    );
  }
  return body as T;
}

/** Registra um observador para o evento de sessão expirada. */
export function onUnauthorized(handler: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const listener = () => handler();
  window.addEventListener(UNAUTHORIZED_EVENT, listener);
  return () => window.removeEventListener(UNAUTHORIZED_EVENT, listener);
}