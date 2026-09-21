import React, { useState } from 'react';
import { 
  Building2, 
  Store, 
  Plus, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  ShieldCheck, 
  FileText, 
  MapPin, 
  Phone, 
  Mail, 
  Briefcase, 
  Save, 
  RotateCcw,
  Check,
  AlertTriangle,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';
import { CompanyProfile, BranchUnit } from '../types';

interface EmpresaFiliaisManagerProps {
  companyProfile: CompanyProfile;
  branches: BranchUnit[];
  activeStore: string;
  onUpdateCompanyProfile: (newProfile: CompanyProfile) => void;
  onUpdateBranches: (newBranches: BranchUnit[]) => void;
  onSelectActiveStore: (branchId: string) => void;
  onShowNotification: (title: string, message: string, type?: 'success' | 'warning' | 'info') => void;
}

export const EmpresaFiliaisManager: React.FC<EmpresaFiliaisManagerProps> = ({
  companyProfile,
  branches,
  activeStore,
  onUpdateCompanyProfile,
  onUpdateBranches,
  onSelectActiveStore,
  onShowNotification,
}) => {
  // Local state for editing Company Profile
  const [profileForm, setProfileForm] = useState<CompanyProfile>({ ...companyProfile });
  const [isSavedCompany, setIsSavedCompany] = useState(false);

  // Local state for Branch Modal (Create or Edit)
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  const [branchForm, setBranchForm] = useState<Partial<BranchUnit>>({
    name: '',
    cdCode: '',
    cdName: '',
    uf: 'MS',
    city: '',
    cnpj: '',
    ie: '',
    address: '',
    sefazCode: '50',
    isMatriz: false,
    icmsInterno: 17,
    status: 'ativa',
    description: '',
  });

  // Brazilian UF to SEFAZ Code mapping helper
  const UF_SEFAZ_MAP: Record<string, { code: string; icms: number }> = {
    AC: { code: '12', icms: 17 },
    AL: { code: '27', icms: 19 },
    AM: { code: '13', icms: 20 },
    AP: { code: '16', icms: 18 },
    BA: { code: '29', icms: 19 },
    CE: { code: '23', icms: 20 },
    DF: { code: '53', icms: 18 },
    ES: { code: '32', icms: 17 },
    GO: { code: '52', icms: 17 },
    MA: { code: '21', icms: 20 },
    MG: { code: '31', icms: 18 },
    MS: { code: '50', icms: 17 },
    MT: { code: '51', icms: 17 },
    PA: { code: '15', icms: 19 },
    PB: { code: '25', icms: 18 },
    PE: { code: '26', icms: 18 },
    PI: { code: '22', icms: 21 },
    PR: { code: '41', icms: 19 },
    RJ: { code: '33', icms: 20 },
    RN: { code: '24', icms: 18 },
    RO: { code: '11', icms: 17.5 },
    RR: { code: '14', icms: 17 },
    RS: { code: '43', icms: 17 },
    SC: { code: '42', icms: 17 },
    SE: { code: '28', icms: 19 },
    SP: { code: '35', icms: 18 },
    TO: { code: '17', icms: 18 },
  };

  const handleSaveCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileForm.tradeName.trim() || !profileForm.corporateName.trim()) {
      onShowNotification('Campos Obrigatórios', 'Preencha o Nome Fantasia e a Razão Social da Empresa.', 'warning');
      return;
    }

    onUpdateCompanyProfile(profileForm);
    setIsSavedCompany(true);
    setTimeout(() => setIsSavedCompany(false), 2500);
    onShowNotification('Empresa Atualizada', 'Os dados da empresa foram salvos e atualizados em todo o Sistema GATO.', 'success');
  };

  const handleOpenAddBranch = () => {
    setEditingBranchId(null);
    const nextCdIndex = branches.length + 1;
    const nextCd = `CD-0${nextCdIndex}`;
    setBranchForm({
      name: `Filial ${String(branches.length).padStart(2, '0')} - `,
      cdCode: nextCd,
      cdName: `CD Logística ${nextCd}`,
      uf: 'SP',
      city: '',
      cnpj: profileForm.cnpj ? profileForm.cnpj.replace(/\/0001-/, `/000${branches.length + 1}-`) : '',
      ie: '',
      address: '',
      sefazCode: '35',
      isMatriz: false,
      icmsInterno: 18,
      status: 'ativa',
      description: 'Filial de distribuição e atendimento regional integrada ao Sistema GATO.',
    });
    setIsBranchModalOpen(true);
  };

  const handleOpenEditBranch = (branch: BranchUnit) => {
    setEditingBranchId(branch.id);
    setBranchForm({ ...branch });
    setIsBranchModalOpen(true);
  };

  const handleUfChangeInBranch = (uf: string) => {
    const config = UF_SEFAZ_MAP[uf] || { code: '35', icms: 18 };
    setBranchForm(prev => ({
      ...prev,
      uf,
      sefazCode: config.code,
      icmsInterno: config.icms,
    }));
  };

  const handleSaveBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchForm.name?.trim() || !branchForm.city?.trim() || !branchForm.cnpj?.trim()) {
      onShowNotification('Dados Incompletos', 'Informe o Nome da Unidade, Cidade e CNPJ da filial.', 'warning');
      return;
    }

    if (editingBranchId) {
      // Update existing branch
      const updated = branches.map(b => {
        if (b.id === editingBranchId) {
          return {
            ...b,
            ...branchForm,
          } as BranchUnit;
        }
        return b;
      });
      onUpdateBranches(updated);
      onShowNotification('Unidade Atualizada', `A unidade "${branchForm.name}" foi atualizada com sucesso.`, 'success');
    } else {
      // Create new branch
      const newBranchId = `branch-${Date.now()}`;
      const newBranch: BranchUnit = {
        id: newBranchId,
        name: branchForm.name || 'Nova Filial',
        cdCode: branchForm.cdCode || `CD-0${branches.length + 1}`,
        cdName: branchForm.cdName || `CD Regional ${branchForm.uf || 'BR'}`,
        uf: branchForm.uf || 'SP',
        city: branchForm.city || '',
        cnpj: branchForm.cnpj || '',
        ie: branchForm.ie || '',
        address: branchForm.address || '',
        sefazCode: branchForm.sefazCode || '35',
        isMatriz: !!branchForm.isMatriz,
        icmsInterno: branchForm.icmsInterno || 18,
        status: branchForm.status || 'ativa',
        description: branchForm.description || '',
      };
      onUpdateBranches([...branches, newBranch]);
      onShowNotification('Filial Cadastrada', `A filial "${newBranch.name}" foi adicionada com sucesso.`, 'success');
    }

    setIsBranchModalOpen(false);
  };

  const handleDeleteBranch = (branchId: string, branchName: string) => {
    const branch = branches.find(b => b.id === branchId);
    if (branch?.isMatriz) {
      onShowNotification('Operação Não Permitida', 'A Matriz principal da empresa não pode ser excluída.', 'warning');
      return;
    }

    if (branchId === activeStore) {
      onShowNotification('Filial em Uso', 'Selecione outra filial como ativa antes de excluir esta unidade.', 'warning');
      return;
    }

    const filtered = branches.filter(b => b.id !== branchId);
    onUpdateBranches(filtered);
    onShowNotification('Filial Removida', `A unidade "${branchName}" foi excluída.`, 'info');
  };

  const currentActiveBranch = branches.find(b => b.id === activeStore) || branches[0];

  return (
    <div className="space-y-6 pb-12" id="view-empresa-filiais">
      {/* Top Banner: Informational Clarification */}
      <div className="bg-gradient-to-r from-[#0C4A6E] via-[#0369A1] to-[#0284C7] rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-amber-400 text-slate-950 font-black text-[10px] rounded-full uppercase tracking-wider">
                Sistema GATO • Multi-Empresa & Multi-Filial
              </span>
              <span className="text-sky-200 text-xs font-semibold">
                Gestão da Empresa Vendedora
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">
              Cadastro da Empresa: Matriz & Filiais
            </h1>
            <p className="text-xs sm:text-sm text-sky-100/90 leading-relaxed">
              O <strong>GATO</strong> é a plataforma tecnológica de software. Aqui você cadastra a sua <strong>empresa proprietária</strong>, sua <strong>Matriz</strong> e todas as suas <strong>Filiais</strong>. Todos os documentos fiscais (NF-e/SEFAZ), ordens de serviço (OS), orçamentos e pedidos de balcão (DAV) serão emitidos sob a identidade da sua empresa e da filial selecionada.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-xs p-4 rounded-xl border border-white/20 text-xs space-y-2 shrink-0 md:w-64">
            <div className="flex items-center justify-between text-amber-300 text-[11px] font-bold uppercase">
              <span>Filial de Operação Atual</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <div>
              <strong className="block text-white text-sm truncate">{currentActiveBranch.name}</strong>
              <p className="text-sky-200 text-[11px]">{currentActiveBranch.city} - {currentActiveBranch.uf} • {currentActiveBranch.cdCode}</p>
              <p className="text-[10px] font-mono text-white/80 mt-1">CNPJ: {currentActiveBranch.cnpj}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: 2 Colunas (Dados da Empresa + Unidades Matriz/Filiais) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* ========================================================================= */}
        {/* COLUNA ESQUERDA: CADASTRO DA EMPRESA VENDEDORA (5 Cols) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-slate-900">
                    Dados Cadastrais da Empresa
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Identidade corporativa usada em toda a plataforma
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveCompany} className="space-y-3.5 text-xs">
              {/* Nome Fantasia */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nome Fantasia Comercial <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={profileForm.tradeName}
                  onChange={e => setProfileForm(prev => ({ ...prev, tradeName: e.target.value }))}
                  placeholder="Ex: Auto Peças Pantanal & Serviços"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                  required
                />
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Nome exibido no topo do balcão, orçamentos e comunicações aos clientes.
                </span>
              </div>

              {/* Razão Social */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Razão Social Oficial (SEFAZ / Receita Federal) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={profileForm.corporateName}
                  onChange={e => setProfileForm(prev => ({ ...prev, corporateName: e.target.value }))}
                  placeholder="Ex: Pantanal Peças & Distribuição LTDA"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                  required
                />
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Utilizada no cabeçalho legal da NF-e, DANFE e contratos.
                </span>
              </div>

              {/* CNPJ Matriz & IE */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    CNPJ da Matriz <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={profileForm.cnpj}
                    onChange={e => setProfileForm(prev => ({ ...prev, cnpj: e.target.value }))}
                    placeholder="00.000.000/0001-00"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Inscrição Estadual (IE)
                  </label>
                  <input
                    type="text"
                    value={profileForm.stateRegistration || ''}
                    onChange={e => setProfileForm(prev => ({ ...prev, stateRegistration: e.target.value }))}
                    placeholder="Ex: 28.345.678-9"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Regime Tributário & Segmento */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Regime Tributário
                  </label>
                  <select
                    value={profileForm.taxRegime || 'simples_nacional'}
                    onChange={e => setProfileForm(prev => ({ ...prev, taxRegime: e.target.value as any }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden cursor-pointer"
                  >
                    <option value="simples_nacional">Simples Nacional</option>
                    <option value="lucro_presumido">Lucro Presumido</option>
                    <option value="lucro_real">Lucro Real</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Ramo / Segmento
                  </label>
                  <select
                    value={profileForm.segment}
                    onChange={e => setProfileForm(prev => ({ ...prev, segment: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden cursor-pointer"
                  >
                    <option value="Centro Automotivo & Misto">Centro Automotivo & Misto</option>
                    <option value="Autopeças Linha Leve">Autopeças Linha Leve</option>
                    <option value="Motopeças & Serviços">Motopeças & Serviços</option>
                    <option value="Linha Pesada / Diesel">Linha Pesada / Diesel</option>
                    <option value="Máquinas & Peças Agrícolas">Máquinas & Peças Agrícolas</option>
                  </select>
                </div>
              </div>

              {/* CNAE Principal */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  CNAE Principal
                </label>
                <input
                  type="text"
                  value={profileForm.cnae || ''}
                  onChange={e => setProfileForm(prev => ({ ...prev, cnae: e.target.value }))}
                  placeholder="Ex: 45.30-7-03 - Comércio a varejo de peças e acessórios para veículos"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                />
              </div>

              {/* Telefone / WhatsApp & E-mail */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Telefone / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={profileForm.phone}
                    onChange={e => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="(00) 00000-0000"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    E-mail Comercial
                  </label>
                  <input
                    type="email"
                    value={profileForm.email}
                    onChange={e => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="contato@empresa.com.br"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Endereço Sede */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">
                    Cidade Sede
                  </label>
                  <input
                    type="text"
                    value={profileForm.city}
                    onChange={e => setProfileForm(prev => ({ ...prev, city: e.target.value }))}
                    placeholder="Cidade"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    UF Sede
                  </label>
                  <input
                    type="text"
                    maxLength={2}
                    value={profileForm.uf}
                    onChange={e => setProfileForm(prev => ({ ...prev, uf: e.target.value.toUpperCase() }))}
                    placeholder="MS"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 uppercase focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden text-center"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Endereço Completo da Matriz
                </label>
                <input
                  type="text"
                  value={profileForm.address || ''}
                  onChange={e => setProfileForm(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Av. Principal, 1000 - Bairro Centro"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                />
              </div>

              <div className="pt-2 flex items-center justify-between">
                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Sincronização em tempo real
                </span>

                <button
                  type="submit"
                  id="btn-salvar-dados-empresa"
                  className="px-4 py-2 bg-[#0C4A6E] hover:bg-[#073047] text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
                >
                  {isSavedCompany ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Dados Salvos!</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 text-amber-400" />
                      <span>Salvar Dados da Empresa</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* COLUNA DIREITA: GESTÃO DE MATRIZ E FILIAIS (7 Cols) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-slate-900">
                    Unidades Operacionais: Matriz & Filiais ({branches.length})
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Cadastre cada filial para emissão fiscal com CNPJ e IE específicos
                  </p>
                </div>
              </div>

              <button
                type="button"
                id="btn-cadastrar-nova-filial"
                onClick={handleOpenAddBranch}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Cadastrar Nova Filial</span>
              </button>
            </div>

            {/* Explicação e Regra Fiscal */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                Cada filial possui seu próprio <strong>CNPJ derivado</strong> (ex: <code className="font-mono bg-white px-1 py-0.2 rounded border">.../0002-XX</code>), <strong>Inscrição Estadual (IE)</strong> no estado de localização e <strong>alíquota interna de ICMS</strong>. Ao selecionar a filial ativa, o Sistema GATO aplica automaticamente as regras tributárias correspondentes nas vendas.
              </p>
            </div>

            {/* Lista das Unidades Cadastradas */}
            <div className="space-y-3 pt-1">
              {branches.map((branch) => {
                const isCurrent = branch.id === activeStore;

                return (
                  <div
                    key={branch.id}
                    className={`p-4 rounded-xl border-2 transition relative ${
                      isCurrent
                        ? 'bg-sky-50/70 border-sky-500 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-sky-300'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                            branch.isMatriz
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-indigo-100 text-indigo-900 border border-indigo-300'
                          }`}>
                            {branch.isMatriz ? '★ Sede Matriz' : 'Filial Operacional'}
                          </span>

                          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 font-mono font-black text-[10px] rounded">
                            {branch.cdCode}
                          </span>

                          <span className="px-1.5 py-0.5 bg-sky-100 text-sky-900 font-bold text-[10px] rounded">
                            {branch.uf}
                          </span>

                          {isCurrent && (
                            <span className="px-2 py-0.5 bg-emerald-500 text-white font-black text-[10px] rounded-full flex items-center gap-1 shadow-2xs">
                              <Check className="w-3 h-3" />
                              FILIAL ATIVA NO SISTEMA
                            </span>
                          )}
                        </div>

                        <h3 className="font-black text-slate-900 text-sm mt-1">
                          {branch.name}
                        </h3>

                        <p className="text-slate-600 text-xs">
                          {branch.address} • {branch.city} ({branch.uf})
                        </p>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-700 font-mono pt-1">
                          <span>
                            <strong>CNPJ:</strong> {branch.cnpj}
                          </span>
                          <span>
                            <strong>IE:</strong> {branch.ie || 'ISENTO'}
                          </span>
                          <span>
                            <strong>SEFAZ-{branch.uf}:</strong> Cód. {branch.sefazCode}
                          </span>
                          <span className="text-emerald-700 font-bold">
                            ICMS Interno: {branch.icmsInterno}%
                          </span>
                        </div>

                        {branch.description && (
                          <p className="text-[11px] text-slate-500 italic mt-1 font-sans">
                            {branch.description}
                          </p>
                        )}
                      </div>

                      {/* Botões de Ação para a Unidade */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-start">
                        {!isCurrent && (
                          <button
                            type="button"
                            onClick={() => {
                              onSelectActiveStore(branch.id);
                              onShowNotification('Filial Alternada', `Você agora está operando na unidade: ${branch.name}`, 'success');
                            }}
                            className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-extrabold rounded-lg transition shadow-2xs cursor-pointer flex items-center gap-1"
                            title="Definir esta unidade como a filial ativa de atendimento e emissão"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Tornar Ativa</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleOpenEditBranch(branch)}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition cursor-pointer"
                          title="Editar dados da filial"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        {!branch.isMatriz && (
                          <button
                            type="button"
                            onClick={() => handleDeleteBranch(branch.id, branch.name)}
                            disabled={isCurrent}
                            className={`p-1.5 rounded-lg transition cursor-pointer ${
                              isCurrent
                                ? 'text-slate-300 cursor-not-allowed bg-slate-50'
                                : 'bg-red-50 hover:bg-red-100 text-red-600'
                            }`}
                            title={isCurrent ? 'Não é possível excluir a filial ativa de trabalho' : 'Excluir filial'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* MODAL: CADASTRAR OU EDITAR FILIAL */}
      {/* ========================================================================= */}
      {isBranchModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900">
                    {editingBranchId ? 'Editar Dados da Unidade' : 'Cadastrar Nova Filial da Empresa'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Unidade de faturamento, estoque e atendimento do Sistema GATO
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBranchModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBranch} className="space-y-3.5 text-xs">
              {/* Tipo: Matriz ou Filial */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 block">Classificação da Unidade:</span>
                  <span className="text-[11px] text-slate-500">Defina se esta unidade é a Sede Matriz ou uma Filial</span>
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 font-bold text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="branchType"
                      checked={!branchForm.isMatriz}
                      onChange={() => setBranchForm(prev => ({ ...prev, isMatriz: false }))}
                    />
                    <span>Filial</span>
                  </label>
                  <label className="flex items-center gap-1.5 font-bold text-slate-700 cursor-pointer ml-2">
                    <input
                      type="radio"
                      name="branchType"
                      checked={!!branchForm.isMatriz}
                      onChange={() => setBranchForm(prev => ({ ...prev, isMatriz: true }))}
                    />
                    <span>Matriz</span>
                  </label>
                </div>
              </div>

              {/* Nome da Filial */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nome de Identificação da Unidade <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={branchForm.name || ''}
                  onChange={e => setBranchForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Filial 01 - São Paulo (SP) ou Filial Campinas"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                  required
                />
              </div>

              {/* Código CD e Nome do CD */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Código Logístico (CD) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={branchForm.cdCode || ''}
                    onChange={e => setBranchForm(prev => ({ ...prev, cdCode: e.target.value }))}
                    placeholder="Ex: CD-02"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Nome do Centro de Distribuição
                  </label>
                  <input
                    type="text"
                    value={branchForm.cdName || ''}
                    onChange={e => setBranchForm(prev => ({ ...prev, cdName: e.target.value }))}
                    placeholder="Ex: CD Sudeste & Hub Logístico"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* UF, Código SEFAZ e ICMS Interno */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    UF do Estado <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={branchForm.uf || 'SP'}
                    onChange={e => handleUfChangeInBranch(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden cursor-pointer"
                  >
                    {Object.keys(UF_SEFAZ_MAP).sort().map(uf => (
                      <option key={uf} value={uf}>{uf}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Cód. SEFAZ UF
                  </label>
                  <input
                    type="text"
                    value={branchForm.sefazCode || ''}
                    onChange={e => setBranchForm(prev => ({ ...prev, sefazCode: e.target.value }))}
                    placeholder="35"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden text-center font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    ICMS Interno (%)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={branchForm.icmsInterno || 18}
                    onChange={e => setBranchForm(prev => ({ ...prev, icmsInterno: parseFloat(e.target.value) || 18 }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden text-center font-bold"
                  />
                </div>
              </div>

              {/* Cidade e Endereço */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Cidade da Filial <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={branchForm.city || ''}
                    onChange={e => setBranchForm(prev => ({ ...prev, city: e.target.value }))}
                    placeholder="Ex: São Paulo"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    CNPJ Próprio da Filial <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={branchForm.cnpj || ''}
                    onChange={e => setBranchForm(prev => ({ ...prev, cnpj: e.target.value }))}
                    placeholder="00.000.000/0002-XX"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Inscrição Estadual (IE)
                  </label>
                  <input
                    type="text"
                    value={branchForm.ie || ''}
                    onChange={e => setBranchForm(prev => ({ ...prev, ie: e.target.value }))}
                    placeholder="Ex: 109.876.543.210"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Status Operacional
                  </label>
                  <select
                    value={branchForm.status || 'ativa'}
                    onChange={e => setBranchForm(prev => ({ ...prev, status: e.target.value as any }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden cursor-pointer"
                  >
                    <option value="ativa">Ativa (Operando com Estoque e Vendas)</option>
                    <option value="expansao_planejada">Expansão Planejada (Em Implantação)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Endereço Completo da Filial
                </label>
                <input
                  type="text"
                  value={branchForm.address || ''}
                  onChange={e => setBranchForm(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Rua / Avenida, Número, Bairro, CEP"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Observações / Escopo Logístico
                </label>
                <textarea
                  rows={2}
                  value={branchForm.description || ''}
                  onChange={e => setBranchForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Ex: Atendimento regional para oficinas e distribuição expressa"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsBranchModalOpen(false)}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  id="btn-confirmar-salvar-filial"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingBranchId ? 'Salvar Alterações' : 'Cadastrar Filial'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
