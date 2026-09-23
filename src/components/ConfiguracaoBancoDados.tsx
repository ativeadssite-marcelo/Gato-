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

  const load = async () => {
    setLoading(true);
    try {
      const s = await apiJson<StatusResponse>('/api/admin/database/status');
      setStatus(s);
      if (s.current) {
        setHost(s.current.host);
        setPort(String(s.current.port));
        setUser(s.current.user);
        setDatabase(s.current.database);
        setSslDisable(!!s.current.sslDisable);
        setSslRejectUnauthorized(s.current.sslRejectUnauthorized !== false);
      }
    } catch (e: any) {
      setStatus({ configured: false, source: null, current: null });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const payload = () => ({
    host,
    port: parseInt(port, 10) || 5432,
    user,
    database,
    password,
    sslDisable,
    sslRejectUnauthorized,
  });

  const handleTest = async () => {
    setBusy('test');
    setTestResult(null);
    try {
      const r = await apiJson<any>('/api/admin/database/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload()),
      });
      setTestResult({ ok: r.success, version: r.version, detail: r.detail || r.error });
      onShowNotification?.(r.success ? 'Conexão OK' : 'Falha na conexão', r.success ? `Banco acessível (${r.version}).` : (r.detail || r.error || 'Verifique as credenciais.'), r.success ? 'success' : 'warning');
    } catch (e: any) {
      setTestResult({ ok: false, error: e?.message });
    } finally {
      setBusy(null);
    }
  };

  const handleSave = async () => {
    setBusy('save');
    setTestResult(null);
    try {
      const r = await apiJson<any>('/api/admin/database/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload()),
      });
      setPassword('');
      setTestResult({ ok: true, version: r.version });
      onShowNotification?.('Banco configurado', r.message || 'Credenciais salvas e migrações aplicadas.', 'success');
      await load();
    } catch (e: any) {
      setTestResult({ ok: false, error: e?.message });
      onShowNotification?.('Falha ao salvar', e?.message || 'Não foi possível configurar o banco.', 'warning');
    } finally {
      setBusy(null);
    }
  };

  const handleClear = async () => {
    if (!window.confirm('Remover as credenciais salvas? O app volta a usar variáveis de ambiente.')) return;
    setBusy('clear');
    try {
      const r = await apiJson<any>('/api/admin/database/clear', { method: 'POST' });
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="text-xs text-slate-400 font-medium">Host</label>
            <input className={inputCls} value={host} onChange={(e) => setHost(e.target.value)} placeholder="db.xxxx.supabase.co" />
          </div>
          <div>
            <label className="text-xs text-slate-400 font-medium">Porta</label>
            <input className={inputCls} value={port} onChange={(e) => setPort(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-slate-400 font-medium">Usuário</label>
            <input className={inputCls} value={user} onChange={(e) => setUser(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-slate-400 font-medium">Nome do banco</label>
            <input className={inputCls} value={database} onChange={(e) => setDatabase(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-slate-400 font-medium">Senha</label>
            <input type="password" className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={status?.current?.passwordSet ? '•••••••• (salva — deixe em branco para manter)' : 'Senha do banco'} />
          </div>
        </div>

        <div className="flex flex-wrap gap-5 text-sm text-slate-300">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={sslDisable} onChange={(e) => setSslDisable(e.target.checked)} className="accent-orange-500" />
            Desativar TLS/SSL
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={sslRejectUnauthorized} onChange={(e) => setSslRejectUnauthorized(e.target.checked)} className="accent-orange-500" />
            Validar certificado (rejectUnauthorized)
          </label>
        </div>

        {testResult && (
          <div className={`rounded-xl border p-3 text-sm flex items-center gap-2 ${testResult.ok ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : 'border-rose-500/30 bg-rose-500/10 text-rose-200'}`}>
            {testResult.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
            {testResult.ok ? `Conectado — ${testResult.version || 'PostgreSQL'}` : (testResult.detail || testResult.error || 'Falha na conexão.')}
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
