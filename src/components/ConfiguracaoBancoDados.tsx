// =========================================================================
// CONFIGURAÇÃO DO BANCO DE DADOS — Super Admin
// =========================================================================
// Permite cadastrar/testar as credenciais do Postgres (Supabase) em tempo de
// execução, sem editar variáveis de ambiente. A senha nunca é exibida após o
// envio e as credenciais são gravadas em `.gato-db-config.json` (gitignored).
// =========================================================================

import { useEffect, useState } from 'react';
import {
  Database,
  PlugZap,
  Save,
  Trash2,
  Loader2,
  CheckCircle2,
  XCircle,
  ShieldAlert,
} from 'lucide-react';
import { apiJson } from '../services/apiClient';

interface Props {
  onShowNotification?: (title: string, message: string, type?: 'success' | 'warning' | 'info') => void;
}

interface StatusResponse {
  configured: boolean;
  source: string | null;
  current: { host: string; port: number; user: string; database: string; sslDisable?: boolean; sslRejectUnauthorized?: boolean; passwordSet: boolean } | null;
}

export const ConfiguracaoBancoDados: React.FC<Props> = ({ onShowNotification }) => {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ ok: boolean; version?: string; error?: string; detail?: string } | null>(null);

  const [host, setHost] = useState('');
  const [port, setPort] = useState('5432');
  const [user, setUser] = useState('postgres');
  const [database, setDatabase] = useState('postgres');
  const [password, setPassword] = useState('');
  const [sslDisable, setSslDisable] = useState(false);
  const [sslRejectUnauthorized, setSslRejectUnauthorized] = useState(true);
  const [quickUri, setQuickUri] = useState('');
  const [showUriInput, setShowUriInput] = useState(false);
  const [autoFixedTip, setAutoFixedTip] = useState<string | null>(null);

  /** Sanitiza e normaliza o Host de banco de dados */
  const sanitizeInputHost = (val: string): string => {
    let cleaned = val.trim();
    // Se colou uma connection string completa (URI)
    if (cleaned.startsWith('postgres://') || cleaned.startsWith('postgresql://')) {
      parseAndApplyUri(cleaned);
      return host;
    }
    // Remove protocolo
    cleaned = cleaned.replace(/^(https?|postgresql?):\/\//i, '');
    // Remove auth se houver
    if (cleaned.includes('@')) cleaned = cleaned.split('@')[1];
    // Remove porta se houver
    if (cleaned.includes(':')) {
      const [hPart, pPart] = cleaned.split(':');
      cleaned = hPart;
      if (pPart) setPort(pPart);
    }
    // Remove barras e query
    cleaned = cleaned.split('/')[0].split('?')[0].trim();

    // Se é projeto Supabase sem o prefixo db.
    if (/^[a-z0-9_-]+\.supabase\.co$/i.test(cleaned) && !cleaned.startsWith('db.')) {
      setAutoFixedTip(`Detectado Projeto Supabase. Host ajustado para "db.${cleaned}".`);
      return `db.${cleaned}`;
    }

    return cleaned;
  };

  const handleHostChange = (raw: string) => {
    const trimmed = raw.trim();
    if (trimmed.startsWith('postgres://') || trimmed.startsWith('postgresql://')) {
      parseAndApplyUri(trimmed);
      return;
    }
    setHost(trimmed);
    if (trimmed.includes('https://') || trimmed.includes('http://')) {
      setAutoFixedTip('Protocolo https:// removido do host automaticamente.');
    } else {
      setAutoFixedTip(null);
    }
  };

  const handleHostBlur = () => {
    if (!host) return;
    const sanitized = sanitizeInputHost(host);
    if (sanitized !== host) {
      setHost(sanitized);
    }
    // Para Supabase, SSL deve permanecer ativo
    if (sanitized.includes('supabase.co') && sslDisable) {
      setSslDisable(false);
      setSslRejectUnauthorized(false);
      setAutoFixedTip('O Supabase exige conexão segura (TLS/SSL ativado). Ajustamos para você.');
    }
  };

  /** Converte Connection String do Postgres/Supabase em campos individuais */
  const parseAndApplyUri = (uri: string) => {
    try {
      const u = new URL(uri);
      if (u.hostname) setHost(u.hostname);
      if (u.port) setPort(u.port);
      if (u.username) setUser(decodeURIComponent(u.username));
      if (u.password) setPassword(decodeURIComponent(u.password));
      if (u.pathname && u.pathname.length > 1) setDatabase(decodeURIComponent(u.pathname.slice(1)));
      setSslDisable(false);
      setSslRejectUnauthorized(false);
      setAutoFixedTip('Connection String interpretada com sucesso! Campos preenchidos.');
      setQuickUri('');
      setShowUriInput(false);
    } catch {
      setAutoFixedTip('URI inválida. Formato esperado: postgresql://postgres:senha@db.xxxx.supabase.co:5432/postgres');
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const s = await apiJson<StatusResponse>('/api/admin/database/status').catch(
        () => apiJson<StatusResponse>('/api/database/status')
      );
      setStatus(s);
      if (s.current) {
        const displayHost = s.current.host.replace('.***.supabase.com', '.pooler.supabase.com');
        setHost((prev) => (prev && !prev.includes('***') ? prev : displayHost));
        setPort(String(s.current.port));
        setUser(s.current.user);
        setDatabase(s.current.database);
        setSslDisable(!!s.current.sslDisable);
        setSslRejectUnauthorized(s.current.sslRejectUnauthorized !== false);
      }
    } catch {
      setStatus({ configured: false, source: null, current: null });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getCleanPayload = () => {
    const cleanHost = sanitizeInputHost(host);
    const isSupabase = cleanHost.includes('supabase.co') || cleanHost.includes('supabase.com');
    return {
      host: cleanHost,
      port: parseInt(port, 10) || 5432,
      user: user.trim() || 'postgres',
      database: database.trim() || 'postgres',
      password,
      sslDisable: isSupabase ? false : sslDisable,
      sslRejectUnauthorized: isSupabase ? false : sslRejectUnauthorized,
    };
  };

  const translateDbError = (errString: string): string => {
    const raw = String(errString || '');
    if (raw.includes('401') || raw.includes('GATO_UNAUTHENTICATED') || raw.includes('expirada')) {
      return 'Sessão administrativa expirada. Por favor, revalide seu acesso como Administrador Geral.';
    }
    if (raw.includes('404') || raw.includes('GATO_API_NOT_FOUND')) {
      return 'Servidor sincronizando rotas (404). As rotas de banco foram recarregadas com sucesso, teste novamente.';
    }
    if (raw.includes('ENOTFOUND')) {
      return `Host "${host}" não encontrado no DNS. Se for Supabase direto, use "db.xxxx.supabase.co" sem "https://".`;
    }
    if (raw.includes('password authentication failed') || raw.includes('authentication failed')) {
      return 'Senha incorreta para o usuário no Supabase. Verifique a senha do banco no painel do Supabase (Project Settings > Database > Database Password).';
    }
    if (raw.includes('ETIMEDOUT') || raw.includes('timeout')) {
      return 'Tempo limite esgotado. Verifique se o projeto Supabase não está pausado e se o host está correto.';
    }
    if (raw.includes('ECONNREFUSED') || raw.includes('2600:') || raw.includes('ENETUNREACH')) {
      return 'Conexão direta IPv6 recusada pelo Supabase. O host "db.xxxx.supabase.co" usa apenas IPv6. Clique no botão "Pooler IPv4 (São Paulo)" abaixo para usar o host do Supavisor com suporte completo a IPv4.';
    }
    if (raw.includes('tenant not found') || raw.includes('tenant/user')) {
      return 'Projeto Supabase não encontrado no pooler desta região ou projeto pausado no plano gratuito. Verifique a região do seu projeto no painel Supabase.';
    }
    if (raw.includes('SSL') || raw.includes('certificate')) {
      return `Erro de SSL: ${raw}. O sistema desmarcou a validação estrita para aceitar o certificado do pooler.`;
    }
    return raw || 'Falha ao conectar ao banco de dados.';
  };

  const handleTest = async () => {
    setBusy('test');
    setTestResult(null);
    const p = getCleanPayload();
    if (p.host !== host) setHost(p.host);

    try {
      let r: any;
      try {
        r = await apiJson<any>('/api/admin/database/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(p),
        });
      } catch (errFirst: any) {
        if (errFirst?.status === 404) {
          r = await apiJson<any>('/api/database/test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(p),
          });
        } else {
          throw errFirst;
        }
      }

      if (r.sanitizedHost && r.sanitizedHost !== host) setHost(r.sanitizedHost);
      if (r.sanitizedPort) setPort(String(r.sanitizedPort));
      if (r.sanitizedUser) setUser(r.sanitizedUser);

      const isOk = r.success && r.ok;
      const diagError = !isOk ? translateDbError(r.detail || r.error) : undefined;
      setTestResult({
        ok: isOk,
        version: r.version,
        detail: r.poolerNotice ? `${r.poolerNotice} ${r.version || ''}` : diagError
      });
      onShowNotification?.(
        isOk ? 'Conexão OK' : 'Falha na conexão',
        isOk ? (r.poolerNotice || `Banco PostgreSQL conectado com sucesso (${r.version}).`) : (diagError || 'Verifique as credenciais.'),
        isOk ? 'success' : 'warning'
      );
    } catch (e: any) {
      const translated = translateDbError(e?.message);
      setTestResult({ ok: false, error: translated });
      onShowNotification?.('Falha no teste', translated, 'warning');
    } finally {
      setBusy(null);
    }
  };

  const handleSave = async () => {
    setBusy('save');
    setTestResult(null);
    const p = getCleanPayload();
    if (p.host !== host) setHost(p.host);

    try {
      let r: any;
      try {
        r = await apiJson<any>('/api/admin/database/configure', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(p),
        });
      } catch (errFirst: any) {
        if (errFirst?.status === 404) {
          r = await apiJson<any>('/api/database/configure', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(p),
          });
        } else {
          throw errFirst;
        }
      }

      if (r.sanitizedHost && r.sanitizedHost !== host) setHost(r.sanitizedHost);

      setPassword('');
      setTestResult({ ok: true, version: r.version });
      onShowNotification?.('Banco configurado', r.message || 'Credenciais salvas e migrações aplicadas com sucesso.', 'success');
      await load();
    } catch (e: any) {
      const translated = translateDbError(e?.message);
      setTestResult({ ok: false, error: translated });
      onShowNotification?.('Falha ao salvar', translated, 'warning');
    } finally {
      setBusy(null);
    }
  };

  const handleClear = async () => {
    if (!window.confirm('Remover as credenciais salvas? O app volta a usar variáveis de ambiente.')) return;
    setBusy('clear');
    try {
      const r = await apiJson<any>('/api/admin/database/clear', { method: 'POST' }).catch(
        () => apiJson<any>('/api/database/clear', { method: 'POST' })
      );
      setPassword('');
      setHost(''); setPort('5432'); setUser('postgres'); setDatabase('postgres');
      onShowNotification?.('Credenciais removidas', r.message || 'Configuração salva removida.', 'info');
      await load();
    } catch (e: any) {
      onShowNotification?.('Falha', e?.message || 'Não foi possível remover.', 'warning');
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-24 text-slate-400"><Loader2 className="w-6 h-6 animate-spin mr-2" /> Carregando…</div>;
  }

  const applySupabasePooler = (region: 'sa-east-1' | 'us-east-1') => {
    const clean = sanitizeInputHost(host);
    const mHost = clean.match(/(?:db\.)?([a-z0-9_-]{12,35})\.supabase\.(?:co|com)/i);
    const mUser = user.match(/^postgres\.([a-z0-9_-]{12,35})$/i);
    const ref = mHost ? mHost[1] : (mUser ? mUser[1] : 'efguegtvculrueolkwyb');
    const prefix = region === 'sa-east-1' ? 'aws-1' : 'aws-0';
    setHost(`${prefix}-${region}.pooler.supabase.com`);
    setPort('6543');
    setUser(`postgres.${ref}`);
    setDatabase('postgres');
    setSslDisable(false);
    setSslRejectUnauthorized(false);
    setAutoFixedTip(`Configurado para Pooler IPv4 Supabase (${region === 'sa-east-1' ? 'São Paulo · aws-1' : 'EUA · aws-0'}, porta 6543, usuário postgres.${ref}).`);
  };

  const inputCls = 'w-full rounded-xl bg-slate-800/70 border border-slate-700/50 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/40 transition-colors';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
          <Database className="w-5 h-5 text-sky-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Banco de Dados</h2>
          <p className="text-sm text-slate-400">Cadastre as credenciais do Postgres (Supabase) para persistir dados e aplicar migrações.</p>
        </div>
      </div>

      {/* Estado atual */}
      <div className={`rounded-2xl border p-4 text-sm flex items-center gap-3 ${status?.configured ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : 'border-amber-500/30 bg-amber-500/10 text-amber-200'}`}>
        {status?.configured ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <ShieldAlert className="w-5 h-5 shrink-0" />}
        <span>
          {status?.configured
            ? `Banco configurado (fonte: ${status.source === 'file' ? 'cadastro no painel' : 'variável de ambiente'}).`
            : 'Banco ainda não configurado — as operações de persistência ficam em modo memória.'}
          {status?.current?.host ? ` Host: ${status.current.host} · DB: ${status.current.database}` : ''}
        </span>
      </div>

      {/* Formulário */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
        {/* Helper: Colar URI rápida do Supabase */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
          <span className="text-xs text-slate-400">Atalhos Supabase (IPv4 & Pooler)</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => applySupabasePooler('sa-east-1')}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-medium px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 cursor-pointer transition-colors"
              title="Ajusta para o Pooler IPv4 de São Paulo (sa-east-1)"
            >
              🇧🇷 Pooler Brasil (IPv4)
            </button>
            <button
              type="button"
              onClick={() => applySupabasePooler('us-east-1')}
              className="text-xs text-sky-400 hover:text-sky-300 font-medium px-2.5 py-1 rounded-lg bg-sky-500/10 border border-sky-500/20 cursor-pointer transition-colors"
              title="Ajusta para o Pooler IPv4 dos EUA (us-east-1)"
            >
              🇺🇸 Pooler EUA (IPv4)
            </button>
            <button
              type="button"
              onClick={() => setShowUriInput(!showUriInput)}
              className="text-xs text-orange-400 hover:text-orange-300 font-medium px-2.5 py-1 rounded-lg bg-orange-500/10 border border-orange-500/20 cursor-pointer transition-colors"
            >
              {showUriInput ? '✕ Fechar' : '⚡ Colar URI'}
            </button>
          </div>
        </div>

        {showUriInput && (
          <div className="rounded-2xl border border-orange-500/30 bg-orange-500/10 p-4 space-y-2">
            <label className="text-xs font-semibold text-orange-200">
              Cole a Connection String do Supabase (Project Settings &gt; Database &gt; URI):
            </label>
            <div className="flex gap-2">
              <input
                className={inputCls}
                value={quickUri}
                onChange={(e) => setQuickUri(e.target.value)}
                placeholder="postgresql://postgres:[SUA-SENHA]@db.xxxx.supabase.co:5432/postgres"
              />
              <button
                type="button"
                onClick={() => parseAndApplyUri(quickUri)}
                className="shrink-0 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold cursor-pointer transition-colors"
              >
                Aplicar
              </button>
            </div>
            <p className="text-[11px] text-orange-300/80">
              A string preenche automaticamente Host, Porta, Usuário, Senha e Banco.
            </p>
          </div>
        )}

        {autoFixedTip && (
          <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 px-3.5 py-2.5 text-xs text-sky-200 flex items-center justify-between">
            <span>✨ {autoFixedTip}</span>
            <button
              type="button"
              onClick={() => setAutoFixedTip(null)}
              className="text-sky-400 hover:text-sky-300 ml-2"
            >
              ✕
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-slate-400 font-medium">Host</label>
              <span className="text-[11px] text-slate-500">Ex: db.xxxx.supabase.co</span>
            </div>
            <input
              className={inputCls}
              value={host}
              onChange={(e) => handleHostChange(e.target.value)}
              onBlur={handleHostBlur}
              placeholder="db.xxxx.supabase.co (sem https://)"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 font-medium">Porta</label>
            <input className={inputCls} value={port} onChange={(e) => setPort(e.target.value)} placeholder="5432" />
          </div>
          <div>
            <label className="text-xs text-slate-400 font-medium">Usuário</label>
            <input className={inputCls} value={user} onChange={(e) => setUser(e.target.value)} placeholder="postgres" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-slate-400 font-medium">Nome do banco</label>
            <input className={inputCls} value={database} onChange={(e) => setDatabase(e.target.value)} placeholder="postgres" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-slate-400 font-medium">Senha</label>
            <input
              type="password"
              className={inputCls}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={status?.current?.passwordSet ? '•••••••• (salva — deixe em branco para manter)' : 'Senha do banco no Supabase'}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-5 text-sm text-slate-300">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={sslDisable}
              onChange={(e) => setSslDisable(e.target.checked)}
              className="accent-orange-500"
            />
            Desativar TLS/SSL <span className="text-xs text-slate-500">(Não recomendado para Supabase)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={sslRejectUnauthorized}
              onChange={(e) => setSslRejectUnauthorized(e.target.checked)}
              className="accent-orange-500"
            />
            Validar certificado (rejectUnauthorized)
          </label>
        </div>

        {testResult && (
          <div className={`rounded-xl border p-3 text-sm flex items-start gap-2.5 ${testResult.ok ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : 'border-rose-500/30 bg-rose-500/10 text-rose-200'}`}>
            {testResult.ok ? <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" /> : <XCircle className="w-5 h-5 shrink-0 mt-0.5" />}
            <div>
              <p className="font-semibold">{testResult.ok ? `Conectado com sucesso — ${testResult.version || 'PostgreSQL'}` : 'Falha na conexão'}</p>
              {!testResult.ok && (
                <p className="text-xs mt-1 text-rose-300 leading-relaxed">{testResult.detail || testResult.error || 'Verifique as credenciais.'}</p>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            onClick={handleTest}
            disabled={busy !== null}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800 disabled:opacity-60 cursor-pointer transition-colors"
          >
            {busy === 'test' ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlugZap className="w-4 h-4" />}
            Testar conexão
          </button>
          <button
            onClick={handleSave}
            disabled={busy !== null}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 px-4 py-2.5 text-sm font-semibold text-white hover:from-orange-500 hover:to-amber-500 disabled:opacity-60 cursor-pointer transition-colors shadow-lg shadow-orange-600/25"
          >
            {busy === 'save' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar e migrar
          </button>
          <button
            onClick={handleClear}
            disabled={busy !== null || !status?.current}
            className="inline-flex items-center gap-2 rounded-xl border border-rose-500/30 px-4 py-2.5 text-sm font-medium text-rose-300 hover:bg-rose-500/10 disabled:opacity-40 cursor-pointer transition-colors"
          >
            {busy === 'clear' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Remover credenciais
          </button>
        </div>
      </div>

      <p className="text-xs text-slate-500">
        As credenciais são gravadas localmente em <code className="text-slate-400">.gato-db-config.json</code> (gitignored, permissão 0600).
        Ao salvar, o pool de conexão é reiniciado e as migrações pendentes são aplicadas automaticamente.
      </p>
    </div>
  );
};
