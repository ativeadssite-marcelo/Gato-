import React, { useState } from 'react';
import {
  Truck,
  FileText,
  Printer,
  CheckCircle2,
  AlertCircle,
  Plus,
  Eye,
  ShieldCheck,
  QrCode,
  MapPin,
  Calendar,
  Weight,
  DollarSign
} from 'lucide-react';
import { MdfeRecord, BranchUnit, CompanyProfile, InvoiceRecord } from '../types';
import { INITIAL_MDFE } from '../data/initialData';

interface MdfeManagerProps {
  invoices: InvoiceRecord[];
  activeBranch?: BranchUnit;
  companyProfile?: CompanyProfile | null;
  mdfeRecords?: MdfeRecord[];
  onUpdateMdfeRecords?: (records: MdfeRecord[]) => void;
  onShowNotification: (title: string, message: string, type?: 'success' | 'warning' | 'info') => void;
}

export const MdfeManager: React.FC<MdfeManagerProps> = ({
  invoices,
  activeBranch,
  companyProfile,
  mdfeRecords,
  onUpdateMdfeRecords,
  onShowNotification,
}) => {
  const [records, setRecords] = useState<MdfeRecord[]>(() => {
    return mdfeRecords && mdfeRecords.length > 0 ? mdfeRecords : INITIAL_MDFE;
  });

  const [selectedMdfe, setSelectedMdfe] = useState<MdfeRecord | null>(records[0] || null);
  const [showDamdfeModal, setShowDamdfeModal] = useState(false);
  const [showNewMdfeModal, setShowNewMdfeModal] = useState(false);

  // Form State para Novo MDF-e
  const [driverName, setDriverName] = useState('Carlos Eduardo Silveira');
  const [driverCpf, setDriverCpf] = useState('321.654.987-00');
  const [vehiclePlate, setVehiclePlate] = useState('RTA4G99');
  const [vehicleUf, setVehicleUf] = useState(activeBranch?.uf || 'MS');
  const [vehicleRntrc, setVehicleRntrc] = useState('98765432');
  const [originUf, setOriginUf] = useState(activeBranch?.uf || 'MS');
  const [destinationUf, setDestinationUf] = useState('SP');
  const [originCity, setOriginCity] = useState(activeBranch?.city || 'Campo Grande');
  const [destinationCity, setDestinationCity] = useState('Presidente Prudente');
  const [totalWeightKg, setTotalWeightKg] = useState(380.0);
  const [totalCargoValue, setTotalCargoValue] = useState(12450.0);

  const handleEmitMdfe = (e: React.FormEvent) => {
    e.preventDefault();
    const newNum = (43 + records.length).toString().padStart(9, '0');
    const newRecord: MdfeRecord = {
      id: `mdfe-${Date.now()}`,
      manifestNumber: newNum,
      series: '1',
      issueDate: new Date().toISOString(),
      status: 'autorizado',
      driverName,
      driverCpf,
      vehiclePlate,
      vehicleUf,
      vehicleRntrc,
      originUf,
      destinationUf,
      originCity,
      destinationCity,
      invoicesKeys: invoices.slice(0, 3).map(i => i.accessKey),
      totalWeightKg,
      totalCargoValue,
      qrCodeUrl: `https://dfe-portal.svrs.rs.gov.br/mdfe/qrCode?chMDFe=5026031234567800019958001${newNum}10000000001`,
      protocolAuth: `15026000${Math.floor(1000000 + Math.random() * 9000000)}`
    };

    const updated = [newRecord, ...records];
    setRecords(updated);
    if (onUpdateMdfeRecords) onUpdateMdfeRecords(updated);
    setSelectedMdfe(newRecord);
    setShowNewMdfeModal(false);
    setShowDamdfeModal(true);
    onShowNotification(
      'MDF-e Autorizado na SEFAZ!',
      `Manifesto Eletrônico de Carga Nº ${newRecord.manifestNumber} emitido com sucesso.`,
      'success'
    );
  };

  const handleEncerrarMdfe = (id: string) => {
    const updated = records.map(r => r.id === id ? { ...r, status: 'encerrado' as const } : r);
    setRecords(updated);
    if (onUpdateMdfeRecords) onUpdateMdfeRecords(updated);
    onShowNotification('MDF-e Encerrado', 'Manifesto encerrado na SEFAZ após a entrega da carga.', 'info');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header MDF-e */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs uppercase tracking-wider mb-1">
            <Truck className="w-4 h-4 text-indigo-600" />
            <span>MDF-e Modelo 58 - Transporte de Carga & Transferência</span>
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Manifesto Eletrônico de Documentos Fiscais (MDF-e)
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            Obrigatório para transporte interestadual ou intermunicipal de peças automotivas, unificando notas fiscais e identificando veículo e condutor.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowNewMdfeModal(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Emitir Novo MDF-e</span>
        </button>
      </div>

      {/* Tabela de MDF-e */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <th className="p-3.5 pl-4">Manifesto Nº</th>
                <th className="p-3.5">Placa / RNTRC</th>
                <th className="p-3.5">Condutor</th>
                <th className="p-3.5">Rota (Origem ➔ Destino)</th>
                <th className="p-3.5 text-right">Peso (KG)</th>
                <th className="p-3.5 text-right">Valor Carga</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-center pr-4">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {records.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50/70 transition">
                  <td className="p-3.5 pl-4 font-mono font-bold text-slate-900">
                    <span className="bg-indigo-50 text-indigo-900 px-2 py-0.5 rounded border border-indigo-200">
                      MDF-e {doc.manifestNumber}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Série {doc.series}</span>
                  </td>

                  <td className="p-3.5 font-mono text-[11px] font-bold text-slate-700">
                    {doc.vehiclePlate} ({doc.vehicleUf})
                    <span className="text-[10px] text-slate-400 block font-normal">RNTRC: {doc.vehicleRntrc}</span>
                  </td>

                  <td className="p-3.5 text-slate-700">
                    <span className="font-semibold text-slate-900 block truncate max-w-xs">{doc.driverName}</span>
                    <span className="text-[10px] text-slate-400 font-mono">CPF: {doc.driverCpf}</span>
                  </td>

                  <td className="p-3.5 font-bold text-slate-800">
                    <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                      {doc.originUf} ({doc.originCity}) ➔ {doc.destinationUf} ({doc.destinationCity})
                    </span>
                  </td>

                  <td className="p-3.5 text-right font-mono font-bold text-slate-700">
                    {doc.totalWeightKg.toLocaleString('pt-BR', { minimumFractionDigits: 1 })} kg
                  </td>

                  <td className="p-3.5 text-right font-mono font-black text-slate-900">
                    R$ {doc.totalCargoValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>

                  <td className="p-3.5 text-center">
                    {doc.status === 'autorizado' ? (
                      <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Autorizado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        Encerrado
                      </span>
                    )}
                  </td>

                  <td className="p-3.5 pr-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedMdfe(doc);
                          setShowDamdfeModal(true);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold transition cursor-pointer"
                        title="Ver DAMDFE"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>DAMDFE</span>
                      </button>

                      {doc.status === 'autorizado' && (
                        <button
                          type="button"
                          onClick={() => handleEncerrarMdfe(doc.id)}
                          className="px-2 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] transition cursor-pointer"
                          title="Encerrar Manifesto após entrega"
                        >
                          Encerrar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL: EMITIR NOVO MDF-e */}
      {/* ======================================================== */}
      {showNewMdfeModal && (
        <div className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-black text-slate-900">Emissão de Manifesto de Carga (MDF-e)</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNewMdfeModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEmitMdfe} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nome do Motorista / Condutor</label>
                  <input
                    type="text"
                    required
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">CPF do Motorista</label>
                  <input
                    type="text"
                    required
                    value={driverCpf}
                    onChange={(e) => setDriverCpf(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Placa do Veículo</label>
                  <input
                    type="text"
                    required
                    value={vehiclePlate}
                    onChange={(e) => setVehiclePlate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl uppercase font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">UF do Veículo</label>
                  <input
                    type="text"
                    maxLength={2}
                    value={vehicleUf}
                    onChange={(e) => setVehicleUf(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl uppercase text-center font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">RNTRC</label>
                  <input
                    type="text"
                    value={vehicleRntrc}
                    onChange={(e) => setVehicleRntrc(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Origem (UF / Cidade)</label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      maxLength={2}
                      value={originUf}
                      onChange={(e) => setOriginUf(e.target.value.toUpperCase())}
                      className="w-14 px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-center font-bold"
                    />
                    <input
                      type="text"
                      value={originCity}
                      onChange={(e) => setOriginCity(e.target.value)}
                      className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Destino (UF / Cidade)</label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      maxLength={2}
                      value={destinationUf}
                      onChange={(e) => setDestinationUf(e.target.value.toUpperCase())}
                      className="w-14 px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-center font-bold"
                    />
                    <input
                      type="text"
                      value={destinationCity}
                      onChange={(e) => setDestinationCity(e.target.value)}
                      className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Peso Total da Carga (KG)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={totalWeightKg}
                    onChange={(e) => setTotalWeightKg(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Valor Total da Carga (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={totalCargoValue}
                    onChange={(e) => setTotalCargoValue(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewMdfeModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow transition"
                >
                  Autorizar MDF-e SEFAZ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: DOCUMENTO AUXILIAR DAMDFE */}
      {/* ======================================================== */}
      {showDamdfeModal && selectedMdfe && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-xs font-bold text-slate-500">Documento Auxiliar do Manifesto Eletrônico (DAMDFE)</span>
              <button
                type="button"
                onClick={() => setShowDamdfeModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>

            {/* Layout Oficial DAMDFE */}
            <div className="border-2 border-slate-800 p-5 rounded-xl space-y-4 font-mono text-xs text-slate-900 bg-white">
              <div className="flex justify-between items-start border-b-2 border-slate-800 pb-3">
                <div>
                  <strong className="block text-sm uppercase">{companyProfile?.corporateName || 'PANTANAL DISTRIBUIDORA DE AUTOPECAS LTDA'}</strong>
                  <p className="text-[11px] text-slate-600">{activeBranch?.name}</p>
                  <p className="text-[10px]">CNPJ: {activeBranch?.cnpj || '12.345.678/0001-99'} • IE: {activeBranch?.ie || '123456789'}</p>
                  <p className="text-[10px]">{activeBranch?.city || 'Campo Grande'} - {activeBranch?.uf || 'MS'}</p>
                </div>
                <div className="text-right border-l-2 border-slate-800 pl-4">
                  <span className="text-sm font-black block">DAMDFE</span>
                  <span className="text-[10px] block">Documento Auxiliar de MDF-e</span>
                  <strong className="text-xs">Nº {selectedMdfe.manifestNumber}</strong>
                  <p className="text-[10px]">Série {selectedMdfe.series}</p>
                </div>
              </div>

              {/* Dados do Transporte */}
              <div className="grid grid-cols-2 gap-4 border-b border-slate-300 pb-3 text-[11px]">
                <div>
                  <span className="text-[10px] text-slate-500 block font-sans uppercase font-bold">Modal Rodoviário / Veículo de Tração</span>
                  <p>Placa: <strong>{selectedMdfe.vehiclePlate}</strong> ({selectedMdfe.vehicleUf})</p>
                  <p>RNTRC: {selectedMdfe.vehicleRntrc}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block font-sans uppercase font-bold">Identificação do Condutor</span>
                  <p>Nome: <strong>{selectedMdfe.driverName}</strong></p>
                  <p>CPF: {selectedMdfe.driverCpf}</p>
                </div>
              </div>

              {/* Rota e Carga */}
              <div className="grid grid-cols-3 gap-3 border-b border-slate-300 pb-3 text-[11px]">
                <div>
                  <span className="text-[10px] text-slate-500 block font-sans uppercase font-bold">Origem</span>
                  <p>{selectedMdfe.originCity} - {selectedMdfe.originUf}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block font-sans uppercase font-bold">Destino</span>
                  <p>{selectedMdfe.destinationCity} - {selectedMdfe.destinationUf}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block font-sans uppercase font-bold">Totais da Carga</span>
                  <p>Peso: <strong>{selectedMdfe.totalWeightKg} KG</strong></p>
                  <p>Valor: <strong>R$ {selectedMdfe.totalCargoValue.toFixed(2)}</strong></p>
                </div>
              </div>

              {/* Chaves NF-e Vinculadas */}
              <div className="space-y-1 text-[10px]">
                <span className="text-slate-500 uppercase font-sans font-bold block">Documentos Fiscais Vinculados (NF-e)</span>
                {selectedMdfe.invoicesKeys.map((k, i) => (
                  <p key={i} className="text-slate-700 break-all">• Chave {i+1}: {k}</p>
                ))}
              </div>

              {/* Protocolo e QR Code */}
              <div className="flex items-center justify-between border-t-2 border-slate-800 pt-3">
                <div>
                  <span className="text-[9px] text-slate-500 block">PROTOCOLO DE AUTORIZAÇÃO DE USO</span>
                  <strong className="text-[11px]">{selectedMdfe.protocolAuth}</strong>
                  <p className="text-[9px] text-slate-600 mt-1">Autorizado pelo Portal Nacional da SEFAZ</p>
                </div>
                <div className="w-16 h-16 border border-slate-300 flex items-center justify-center p-1">
                  <QrCode className="w-14 h-14 text-slate-800" />
                </div>
              </div>
            </div>

            {/* Ações */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setShowDamdfeModal(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={() => {
                  window.print();
                  onShowNotification('Impressão Enviada', 'Imprimindo DAMDFE para trânsito de mercadorias.', 'success');
                }}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow transition cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir DAMDFE</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
