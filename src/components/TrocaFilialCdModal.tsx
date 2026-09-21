import React, { useState } from 'react';
import { 
  Building2, 
  MapPin, 
  CheckCircle2, 
  Store, 
  X, 
  ArrowRight, 
  Layers, 
  ShieldCheck, 
  Percent 
} from 'lucide-react';
import { BranchUnit, UserSession } from '../types';
import { INITIAL_BRANCHES } from '../data/initialData';

interface TrocaFilialCdModalProps {
  currentBranchId: string;
  userSession: UserSession | null;
  branches?: BranchUnit[];
  onSelectBranch: (branchId: string) => void;
  onClose: () => void;
}

export const TrocaFilialCdModal: React.FC<TrocaFilialCdModalProps> = ({
  currentBranchId,
  userSession,
  branches,
  onSelectBranch,
  onClose,
}) => {
  const [tempSelectedBranchId, setTempSelectedBranchId] = useState<string>(currentBranchId);
  const [filterStateUf, setFilterStateUf] = useState<string>('todos');

  const availableBranches = branches && branches.length > 0 ? branches : INITIAL_BRANCHES;
  const selectedBranch = availableBranches.find(b => b.id === tempSelectedBranchId) || availableBranches[0];

  const filteredBranches = filterStateUf === 'todos' 
    ? availableBranches 
    : availableBranches.filter(b => b.uf === filterStateUf);

  const handleConfirm = () => {
    onSelectBranch(tempSelectedBranchId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-60 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div 
        className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#0C4A6E] px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl text-sky-300">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white">
                Definir Filial & Estado do CD para Venda
              </h3>
              <p className="text-[11px] text-sky-200">
                Operador: <strong className="text-white">{userSession?.name || 'Vendedor'}</strong> • Alterne o galpão de expedição e emissão fiscal
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          
          {/* Filter by UF */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
              Filtrar por Estado (UF):
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setFilterStateUf('todos')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  filterStateUf === 'todos'
                    ? 'bg-[#0C4A6E] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Todos ({INITIAL_BRANCHES.length})
              </button>
              {['MS', 'SP', 'SC', 'MT', 'PR'].map((uf) => (
                <button
                  key={uf}
                  type="button"
                  onClick={() => setFilterStateUf(uf)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    filterStateUf === uf
                      ? 'bg-[#0284C7] text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  CD {uf}
                </button>
              ))}
            </div>
          </div>

          {/* CD List Cards */}
          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {filteredBranches.map((branch) => {
              const isSelected = tempSelectedBranchId === branch.id;
              const isCurrent = currentBranchId === branch.id;

              return (
                <div
                  key={branch.id}
                  onClick={() => setTempSelectedBranchId(branch.id)}
                  className={`p-3.5 rounded-2xl border-2 transition cursor-pointer flex items-start justify-between gap-3 ${
                    isSelected
                      ? 'bg-sky-50 border-[#0284C7] ring-2 ring-sky-200 shadow-sm'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`p-2.5 rounded-xl shrink-0 ${
                      isSelected ? 'bg-[#0C4A6E] text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      <Store className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-black text-xs text-[#0C4A6E] bg-sky-100 px-1.5 py-0.5 rounded">
                          {branch.cdCode}
                        </span>
                        <span className="text-xs font-extrabold text-slate-900">
                          {branch.cdName}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] font-black bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">
                            Atual em Uso
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-bold text-slate-700 mt-0.5">
                        {branch.name}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono mt-1 flex-wrap">
                        <span>CNPJ: {branch.cnpj}</span>
                        <span>•</span>
                        <span>SEFAZ-{branch.uf} (Cód {branch.sefazCode})</span>
                      </div>
                      <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{branch.address}</span>
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0 flex flex-col items-end gap-1">
                    <span className={`px-2 py-0.5 rounded text-xs font-black uppercase ${
                      isSelected ? 'bg-[#0284C7] text-white' : 'bg-slate-800 text-white'
                    }`}>
                      UF: {branch.uf}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      ICMS {branch.icmsInterno}%
                    </span>
                    {isSelected && (
                      <span className="text-[11px] font-bold text-[#0284C7] flex items-center gap-1 mt-1">
                        <CheckCircle2 className="w-4 h-4" />
                        Selecionado
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Active Preview Panel */}
          <div className="bg-slate-900 text-white p-3.5 rounded-2xl text-xs space-y-1 border border-slate-700">
            <div className="flex items-center justify-between text-[11px] text-sky-400 font-bold uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                Resumo Fiscal do CD Escolhido:
              </span>
              <span className="text-white font-mono bg-sky-800/70 px-2 py-0.5 rounded">
                Origem: {selectedBranch.uf}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-800 text-[11px]">
              <div>
                <span className="text-slate-400 block text-[10px]">Filial:</span>
                <span className="font-bold text-white truncate block">{selectedBranch.name}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Alíquota Interna:</span>
                <span className="font-bold text-emerald-400">{selectedBranch.icmsInterno}% ICMS</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Emissor Fiscal:</span>
                <span className="font-bold text-white">SEFAZ-{selectedBranch.uf}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Footer actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-5 py-2 rounded-xl bg-[#0C4A6E] hover:bg-[#0C4A6E]/90 text-white font-extrabold text-xs shadow-md transition flex items-center gap-2 cursor-pointer"
          >
            <span>Confirmar CD {selectedBranch.uf} para Venda</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};
