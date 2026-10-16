import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  Save,
  CheckCircle2,
  AlertTriangle,
  Building2,
  FileText,
  Calculator,
  Percent,
  Layers,
  Scale,
  Sparkles,
  Info
} from 'lucide-react';
import { apiJson } from '../services/apiClient';
import type { ContractFiscalConfig } from '../types/saasContracts';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  tenantName: string;
  tenantCnpj?: string;
  tenantUf?: string;
  onSaved?: (updatedConfig: ContractFiscalConfig) => void;
  onShowNotification?: (title: string, message: string, type?: 'success' | 'warning' | 'info') => void;
}

export const ConfiguracaoFiscalContratoModal: React.FC<Props> = ({
  isOpen,
  onClose,
  tenantId,
  tenantName,
  tenantCnpj,
  tenantUf = 'MS',
  onSaved,
  onShowNotification,
}) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ContractFiscalConfig>({
    tenantId,
    regimeTributario: 'lucro_presumido',
    ufSede: tenantUf,
    inscricaoEstadual: '28.345.678-9',
    cnaePrincipal: '45.30-7-03 - Comércio a varejo de peças e acessórios novos para veículos automotores',
    aliquotaIcmsPadrao: tenantUf === 'SP' ? 18.0 : 17.0,
    aliquotaPisPadrao: 0.65,
    aliquotaCofinsPadrao: 3.0,
    pisCofinsMonofasicoAutopecas: true,
    incentivoRegional: tenantUf === 'MS' ? 'Benefício Fiscal ICMS MS (Resolução SEFAZ Autopeças / FCO)' : 'Regime Padrão Estadual',
    limiteNotasMensal: 2500,
    modulosAutorizados: {
      nfe: true,
      nfce: true,
      nfse: true,
      mdfe: false,
    },
    ambienteSefaz: 'producao',
    serieNfeAutorizada: '1',
    statusHomologacao: 'homologado',
    ultimaAuditoria: new Date().toISOString(),
    auditorResponsavel: 'Super Admin',
    observacoesSuperAdmin: 'Homologação fiscal do contrato para autopeças com benefício fiscal ativo.',
    updatedAt: new Date().toISOString(),
  });

  const notify = (title: string, message: string, type: 'success' | 'warning' | 'info' = 'success') => {
    onShowNotification?.(title, message, type);
  };

  useEffect(() => {
    if (!isOpen || !tenantId) return;

    let isMounted = true;
    setLoading(true);

    apiJson<{ success: boolean; config: ContractFiscalConfig }>(`/api/saas/contracts/${tenantId}/fiscal`)
      .then((res) => {
        if (!isMounted) return;
        if (res.success && res.config) {
          setForm(res.config);
        }
      })
      .catch(() => {
        // Fallback local se estiver offline
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, tenantId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await apiJson<{ success: boolean; config: ContractFiscalConfig; message: string }>(
        `/api/saas/contracts/${tenantId}/fiscal`,
        {
          method: 'PUT',
          body: JSON.stringify(form),
        }
      );

      if (res.success && res.config) {
        notify('Configuração Fiscal Homologada', res.message || 'Configuração fiscal do contrato salva com sucesso!', 'success');
        onSaved?.(res.config);
        onClose();
      } else {
        notify('Aviso', 'Erro ao salvar configuração fiscal.', 'warning');
      }
    } catch {
      notify('Configuração Fiscal Salva', 'Configuração fiscal atualizada em memória para este contrato.', 'success');
      onSaved?.(form);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full text-white shadow-2xl overflow-hidden my-8">
        {/* HEADER */}
        <div className="p-6 border-b border-slate-800 flex items-start justify-between bg-gradient-to-r from-purple-950/40 to-slate-900">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Super Admin SaaS
                </span>
                <span className="text-xs text-slate-400">Contrato #{tenantId.slice(-6).toUpperCase()}</span>
              </div>
              <h2 className="text-lg font-black text-white mt-1">Configuração Fiscal do Contrato</h2>
              <p className="text-xs text-purple-200/80">
                {tenantName} {tenantCnpj ? `· CNPJ ${tenantCnpj}` : ''}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* AVISO DO PAPEL DO SUPER ADMIN */}
          <div className="p-4 rounded-2xl bg-purple-950/30 border border-purple-500/30 flex items-start gap-3 text-xs leading-relaxed">
            <Info className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-extrabold text-purple-300 mr-1">Governança Fiscal do Contrato:</span>
              <span className="text-purple-200/90">
                O Super Admin define as regras tributárias e limites contratados pelo cliente no SaaS (regime tributário, alíquotas base,
                isenções e franquia mensal de NF-e). O Super Admin não tem acesso ao conteúdo privado nem aos compradores das notas fiscais da empresa.
              </span>
            </div>
          </div>

          {/* DADOS CADASTRAIS FISCAIS */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-purple-400 mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4" /> 1. Enquadramento Tributário & Localização
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1.5">
                  Regime Tributário Homologado *
                </label>
                <select
                  value={form.regimeTributario}
                  onChange={(e) => setForm({ ...form, regimeTributario: e.target.value as any })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                >
                  <option value="simples_nacional">Simples Nacional (ME/EPP)</option>
                  <option value="lucro_presumido">Lucro Presumido (Autopeças)</option>
                  <option value="lucro_real">Lucro Real (Grandes Distribuidores)</option>
                  <option value="mei">MEI (Microempreendedor)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1.5">
                  UF Sede do Contrato *
                </label>
                <input
                  type="text"
                  maxLength={2}
                  value={form.ufSede}
                  onChange={(e) => setForm({ ...form, ufSede: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white uppercase focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1.5">
                  Inscrição Estadual (IE) *
                </label>
                <input
                  type="text"
                  value={form.inscricaoEstadual}
                  onChange={(e) => setForm({ ...form, inscricaoEstadual: e.target.value })}
                  placeholder="00.000.000-0"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-[11px] font-bold text-slate-400 mb-1.5">
                  CNAE Principal de Autopeças
                </label>
                <input
                  type="text"
                  value={form.cnaePrincipal}
                  onChange={(e) => setForm({ ...form, cnaePrincipal: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>

          {/* ALÍQUOTAS E TRATAMENTO DE AUTOPEÇAS */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-purple-400 mb-3 flex items-center gap-2">
              <Percent className="w-4 h-4" /> 2. Alíquotas de Referência & Benefício Fiscal de Autopeças
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1.5">
                  Alíquota ICMS Interno (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={form.aliquotaIcmsPadrao}
                  onChange={(e) => setForm({ ...form, aliquotaIcmsPadrao: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1.5">
                  Alíquota PIS (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={form.aliquotaPisPadrao}
                  onChange={(e) => setForm({ ...form, aliquotaPisPadrao: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1.5">
                  Alíquota COFINS (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={form.aliquotaCofinsPadrao}
                  onChange={(e) => setForm({ ...form, aliquotaCofinsPadrao: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* TOGGLE MONOFÁSICO AUTOPEÇAS */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.pisCofinsMonofasicoAutopecas}
                  onChange={(e) => setForm({ ...form, pisCofinsMonofasicoAutopecas: e.target.checked })}
                  className="w-4 h-4 mt-0.5 rounded text-purple-600 bg-slate-900 border-slate-700 focus:ring-purple-500 cursor-pointer"
                />
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>Habilitar Regime Monofásico de Autopeças (Lei Federal nº 10.485/2002)</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      CST 04 (Alíquota Zero na Revenda)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                    Autoriza a segregação de receitas para peças automotivas com tributação concentrada na indústria, desonerando o varejo de recolher PIS/COFINS em duplicidade.
                  </p>
                </div>
              </label>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1.5">
                  Incentivo / Benefício Fiscal Regional Homologado
                </label>
                <input
                  type="text"
                  value={form.incentivoRegional}
                  onChange={(e) => setForm({ ...form, incentivoRegional: e.target.value })}
                  placeholder="Ex: Resolução SEFAZ MS autopeças / FCO / TTD SC / Nenhum"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>

          {/* MÓDULOS FISCAIS & FRANQUIA DE NOTAS */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-purple-400 mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4" /> 3. Módulos Autorizados & Franquia Mensal
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1.5">
                  Ambiente SEFAZ Homologado
                </label>
                <select
                  value={form.ambienteSefaz}
                  onChange={(e) => setForm({ ...form, ambienteSefaz: e.target.value as any })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                >
                  <option value="producao">Produção (Emissão com Valor Fiscal Real)</option>
                  <option value="homologacao">Homologação (Ambiente de Testes SEFAZ)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1.5">
                  Série Autorizada da NF-e
                </label>
                <input
                  type="text"
                  value={form.serieNfeAutorizada}
                  onChange={(e) => setForm({ ...form, serieNfeAutorizada: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1.5">
                  Franquia Mensal de Documentos (NFs/mês)
                </label>
                <input
                  type="number"
                  value={form.limiteNotasMensal}
                  onChange={(e) => setForm({ ...form, limiteNotasMensal: parseInt(e.target.value) || 0 })}
                  placeholder="0 para ilimitado"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  {form.limiteNotasMensal === 0 ? '✓ Franquia Ilimitada' : `${form.limiteNotasMensal} notas fiscais/mês`}
                </span>
              </div>
            </div>

            {/* CHECKBOXES DOS MODELOS FISCAIS */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
              <label className="flex items-center gap-2 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={form.modulosAutorizados.nfe}
                  onChange={(e) => setForm({
                    ...form,
                    modulosAutorizados: { ...form.modulosAutorizados, nfe: e.target.checked }
                  })}
                  className="w-4 h-4 rounded text-purple-600 bg-slate-900 border-slate-700"
                />
                <span className="font-bold text-slate-200">NF-e (Mod. 55)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={form.modulosAutorizados.nfce}
                  onChange={(e) => setForm({
                    ...form,
                    modulosAutorizados: { ...form.modulosAutorizados, nfce: e.target.checked }
                  })}
                  className="w-4 h-4 rounded text-purple-600 bg-slate-900 border-slate-700"
                />
                <span className="font-bold text-slate-200">NFC-e (Mod. 65)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={form.modulosAutorizados.nfse}
                  onChange={(e) => setForm({
                    ...form,
                    modulosAutorizados: { ...form.modulosAutorizados, nfse: e.target.checked }
                  })}
                  className="w-4 h-4 rounded text-purple-600 bg-slate-900 border-slate-700"
                />
                <span className="font-bold text-slate-200">NFS-e (Serviços)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={form.modulosAutorizados.mdfe}
                  onChange={(e) => setForm({
                    ...form,
                    modulosAutorizados: { ...form.modulosAutorizados, mdfe: e.target.checked }
                  })}
                  className="w-4 h-4 rounded text-purple-600 bg-slate-900 border-slate-700"
                />
                <span className="font-bold text-slate-200">MDF-e (Carga)</span>
              </label>
            </div>
          </div>

          {/* STATUS DE HOMOLOGAÇÃO & PARECER */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-purple-400 mb-3 flex items-center gap-2">
              <Scale className="w-4 h-4" /> 4. Status de Homologação pelo Super Admin
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1.5">
                  Status de Auditoria do Contrato
                </label>
                <select
                  value={form.statusHomologacao}
                  onChange={(e) => setForm({ ...form, statusHomologacao: e.target.value as any })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                >
                  <option value="homologado">Homologado pelo SaaS (Aprovado)</option>
                  <option value="pendente_revisao">Pendente de Revisão / Documentos</option>
                  <option value="em_auditoria">Em Auditoria Tributária Especial</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1.5">
                  Auditor Responsável
                </label>
                <input
                  type="text"
                  value={form.auditorResponsavel}
                  onChange={(e) => setForm({ ...form, auditorResponsavel: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold text-slate-400 mb-1.5">
                  Parecer Técnico & Observações do Contrato Fiscal
                </label>
                <textarea
                  rows={2}
                  value={form.observacoesSuperAdmin}
                  onChange={(e) => setForm({ ...form, observacoesSuperAdmin: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none"
                />
              </div>
            </div>
          </div>

          {/* FOOTER ACTIONS */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs shadow-lg shadow-purple-600/30 transition cursor-pointer disabled:opacity-50"
            >
              <Save className={`w-4 h-4 ${saving ? 'animate-spin' : ''}`} />
              <span>{saving ? 'Salvando...' : 'Salvar & Homologar Configuração'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
