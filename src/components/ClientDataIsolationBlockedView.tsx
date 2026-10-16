import React from 'react';
import {
  ShieldAlert,
  Lock,
  Layers,
  Building2,
  FileText,
  ArrowRight,
  Database,
  ExternalLink,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

interface Props {
  currentView: string;
  onNavigate: (view: string) => void;
}

export const ClientDataIsolationBlockedView: React.FC<Props> = ({ currentView, onNavigate }) => {
  const getViewTitle = (view: string) => {
    switch (view) {
      case 'estoque':
        return 'Estoque & Catálogo de Produtos';
      case 'catalogo-web':
        return 'Catálogo Digital Web';
      case 'consulta-pecas':
      case 'consulta-aplicacao':
      case 'caminhao':
      case 'caminhoes':
        return 'Consulta de Peças & Catálogo Técnico';
      case 'cotacao':
      case 'caixa':
        return 'Balcão de Vendas & Caixa PDV';
      case 'nfe-venda':
        return 'Emissão de Notas Fiscais (NF-e) do Cliente';
      case 'fornecedores':
        return 'Fornecedores & Compras Privadas';
      case 'orcamentos':
      case 'clientes':
      case 'leads-marketing':
        return 'Base de Clientes & Orçamentos do Contratante';
      case 'financeiro':
      case 'relatorios':
        return 'Contas a Pagar/Receber & Fluxo Bancário do Cliente';
      default:
        return 'Área Operacional do Cliente Contratante';
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-4">
      {/* CARD PRINCIPAL DE ISOLAMENTO LGPD */}
      <div className="p-8 rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border border-purple-500/30 shadow-2xl relative overflow-hidden">
        {/* Glow de fundo */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          {/* Header Badges */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/40 text-purple-300 text-xs font-black uppercase tracking-wider">
              <ShieldAlert className="w-3.5 h-3.5" />
              Camada 1: Super Admin da Plataforma
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-400/40 text-rose-300 text-xs font-extrabold uppercase tracking-wider">
              <Lock className="w-3.5 h-3.5" />
              Catálogo do Cliente 100% Inacessível ao Super Admin
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-medium">
              LGPD Art. 46 (Lei 13.709/2018)
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-3">
            Acesso Restrito: {getViewTitle(currentView)}
          </h2>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-3xl mb-6">
            Por determinação da <strong className="text-white">LGPD (Lei Geral de Proteção de Dados)</strong> e cláusula expressa do 
            <strong className="text-white"> Contrato de Concessão de Licença SaaS & DPA</strong>, o 
            <strong className="text-purple-300"> Super Admin da Plataforma NÃO possui permissão para visualizar nem manipular</strong> o catálogo de produtos, estoque, custos, preços de venda, dados de clientes ou transações financeiras das Empresas Contratantes.
          </p>

          {/* GRID COM PILARES DE SEGURANÇA */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-3">
                <Database className="w-5 h-5 text-purple-400" />
              </div>
              <h4 className="text-sm font-bold text-white mb-1">Dados Separados por Contrato</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Cada empresa contratante possui partição lógica exclusiva no banco (<code className="text-purple-300">tenant_data_*</code>), garantindo estanqueidade total entre diferentes clientes.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
              <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-3">
                <Lock className="w-5 h-5 text-rose-400" />
              </div>
              <h4 className="text-sm font-bold text-white mb-1">Sigilo Comercial Absoluto</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Catálogo, peças cadastradas, preços, margens de lucro e histórico de vendas são propriedades privadas do cliente (Controlador) e nunca expostos ao operador da infraestrutura.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
              <h4 className="text-sm font-bold text-white mb-1">Gestão Focada no SaaS</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                O Super Admin atua estritamente na governança da plataforma: gestão de contratos, configurações fiscais homologadas, faturamento de assinaturas e estabilidade da infraestrutura.
              </p>
            </div>
          </div>

          {/* AÇÕES DE NAVEGAÇÃO RECOMENDADAS PARA O SUPER ADMIN */}
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => onNavigate('saas-dashboard')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg transition"
            >
              <span>Ir para Painel Central SaaS</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => onNavigate('rbac')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition"
            >
              <Building2 className="w-4 h-4 text-sky-400" />
              <span>Ver Empresas & Contratos</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('conectores')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition"
            >
              <Layers className="w-4 h-4 text-purple-400" />
              <span>Conectores do SaaS (Infra)</span>
            </button>
          </div>
        </div>
      </div>

      {/* PAINEL INFORMATIVO DO MARCO LEGAL LGPD */}
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-slate-300">
            Marco Regulatório: Lei Geral de Proteção de Dados (Lei nº 13.709/2018) & ANPD
          </p>
          <p>
            Conforme os artigos 5º (incisos VI e VII), 39, 42 e 46 da LGPD, a plataforma atua como <em>Operadora</em> de infraestrutura computacional, enquanto a Empresa Contratante é a única <em>Controladora</em> das informações comerciais de seu catálogo e vendas. O acesso indevido pelo provedor de software violaria o dever de confidencialidade e a segurança exigida pela legislação.
          </p>
        </div>
      </div>
    </div>
  );
};
