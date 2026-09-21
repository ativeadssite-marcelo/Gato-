import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Sparkles } from 'lucide-react';
import { GatoBrand } from './GatoBrand';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error?.message || 'Erro inesperado de execução' };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary capturou erro:', error, errorInfo);
  }

  private handleResetAndOpen = () => {
    try {
      // Clear potentially corrupt storage keys while preserving safe defaults
      localStorage.removeItem('gato_user_session');
      localStorage.removeItem('gato_service_orders');
    } catch (e) {
      console.warn('Erro ao limpar storage:', e);
    }
    this.setState({ hasError: false, errorMessage: '' });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white font-['Plus_Jakarta_Sans'] flex flex-col items-center justify-center p-4 selection:bg-[#0284C7]">
          <div className="w-full max-w-lg bg-slate-900 border border-sky-500/30 rounded-3xl p-8 shadow-2xl text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-center">
              <GatoBrand size="lg" showSubtitle={true} />
            </div>

            <div className="w-16 h-16 mx-auto bg-amber-500/20 border border-amber-500/40 rounded-2xl flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white font-['Outfit']">
                Reiniciar e Abrir o Sistema
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Identificamos uma inconsistência temporária na sessão. Clique no botão abaixo para restaurar o sistema e abrir o painel principal de gestão de estoque e balcão imediatamente.
              </p>
              {this.state.errorMessage && (
                <div className="p-3 bg-slate-950/80 rounded-xl border border-rose-500/30 text-[11px] font-mono text-rose-300 text-left max-h-24 overflow-y-auto">
                  {this.state.errorMessage}
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                type="button"
                id="btn-recover-open-app"
                onClick={this.handleResetAndOpen}
                className="w-full flex items-center justify-center gap-2 bg-[#0284C7] hover:bg-[#0284C7]/90 text-white font-extrabold text-sm py-3.5 px-6 rounded-2xl shadow-lg transition active:scale-95 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4 text-white" />
                <span>Restaurar & Abrir GATO Agora</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
