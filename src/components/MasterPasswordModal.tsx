import React, { useState, useEffect, useRef } from 'react';
import { ShieldAlert, Lock, X, KeyRound } from 'lucide-react';

interface MasterPasswordModalProps {
  open: boolean;
  viewLabel: string;
  onConfirm: (password: string) => boolean | Promise<boolean>;
  onClose: () => void;
}

export const MasterPasswordModal: React.FC<MasterPasswordModalProps> = ({
  open,
  viewLabel,
  onConfirm,
  onClose,
}) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setPassword('');
      setError('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isChecking) return;
    setIsChecking(true);
    setError('');
    try {
      const ok = await onConfirm(password);
      if (!ok) {
        setError('Senha master incorreta. Acesso negado e registrado.');
        setPassword('');
        return;
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Senha master incorreta. Acesso negado e registrado.');
      setPassword('');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-950 to-slate-900 px-6 py-5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white leading-tight">Acesso Restrito</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Elevação de privilégio • Superadmin</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed">
            A área <strong className="text-slate-900">“{viewLabel}”</strong> é protegida. Informe a{' '}
            <strong className="text-slate-900">senha master do superadmin</strong> para desbloquear.
            O acesso é registrado na trilha de auditoria e expira automaticamente em 30 minutos.
          </p>

          <div>
            <label htmlFor="master-password-input" className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1.5">
              Senha Master
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                ref={inputRef}
                id="master-password-input"
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                placeholder="••••••••••••"
                autoComplete="off"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition"
              />
            </div>
            {error && (
              <p className="mt-2 text-xs font-semibold text-red-600 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" /> {error}
              </p>
            )}
          </div>

          <div className="flex gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-sm font-bold hover:bg-slate-100 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              disabled={isChecking}
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white text-sm font-bold shadow-lg shadow-amber-600/25 hover:from-amber-500 hover:to-orange-500 transition disabled:opacity-60 disabled:cursor-wait cursor-pointer"
            >
              {isChecking ? 'Verificando...' : 'Desbloquear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
