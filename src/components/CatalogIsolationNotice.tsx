import React from 'react';
import {
  Lock,
  ShieldCheck,
  Building2,
  ArrowRight,
  Database,
  Layers,
  FileText,
  AlertTriangle
} from 'lucide-react';

interface CatalogIsolationNoticeProps {
  viewName?: string;
  onNavigate: (view: string) => void;
}

export const CatalogIsolationNotice: React.FC<CatalogIsolationNoticeProps> = ({
  viewName = 'Catálogo de Produtos',
  onNavigate,
}) => {
  return (
    <div className="max-w-4xl mx-auto my-12 p-8 rounded-3xl bg-slate-900 border border-slate-800 text-white shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
      
      <div className="relative z-10 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <Lock className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Camada 1 — Super Admin
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <ShieldCheck className="w-3.5 h-3.5" /> Isolamento LGPD Ativo
              </span>
            </div>
            <h2 className="text-xl font-black text-white mt-1">
              Catálogo de Produtos & Dados Operacionais Restritos à Camada 2
            </h2>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-purple-950/30 border border-purple-500/30 text-xs text-purple-200 leading-relaxed space-y-2">
          <p className="font-extrabold text-purple-100 text-sm">
            Política de Sigilo e Segregação Multi-Tenant por Contrato:
          </p>
          <p>
            O catálogo de produtos, estoques físicos, custos de aquisição, preços de venda, dados de clientes e pedidos pertencem exclusivamente à 
            <strong> Empresa Contratante (Camada 2 - Controladora dos Dados)</strong>.
          </p>
          <p>
            Em conformidade com a <strong>Lei Geral de Proteção de Dados (Lei 13.709/2018)</strong> e o 
            <strong> Contrato de Concessão de Licença SaaS</strong>, cada contrato assinado gera dados 100% separados e isolados,
            sendo terminantemente vedada a visualização ou intervenção do Super Admin sobre o catálogo privado dos clientes.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-[10px] text-slate-500 uppercase font-black mb-1">Particionamento</div>
            <div className="font-bold text-white flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-sky-400" />
              <span>Multi-Tenant por Contrato</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Cada empresa contratante possui catálogo isolado por Tenant ID.</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-[10px] text-slate-500 uppercase font-black mb-1">Acesso do Super Admin</div>
            <div className="font-bold text-rose-400 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              <span>Zero Acesso ao Catálogo</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Sem visualização de SKUs, estoque, fornecedores ou preços.</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-[10px] text-slate-500 uppercase font-black mb-1">Escopo do Super Admin</div>
            <div className="font-bold text-purple-300 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              <span>Infra & Contratos SaaS</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Gestão de assinaturas, MRR, infra SEFAZ e homologação fiscal.</p>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800 flex items-center justify-between flex-wrap gap-3">
          <span className="text-xs text-slate-400">
            Tentativa de acesso à rota <strong>{viewName}</strong> interceptada com sucesso.
          </span>

          <button
            type="button"
            onClick={() => onNavigate('saas-dashboard')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs shadow-lg shadow-purple-600/30 transition cursor-pointer"
          >
            <span>Voltar ao Painel Central do SaaS</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
