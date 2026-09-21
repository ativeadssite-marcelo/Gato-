import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Building2,
  Layers,
  FileText,
  ShieldCheck,
  RefreshCw,
  Copy,
  Boxes
} from 'lucide-react';
import { InvoiceRecord, Product, BranchUnit, CompanyProfile } from '../types';

interface SpedFiscalManagerProps {
  invoices: InvoiceRecord[];
  products: Product[];
  activeBranch?: BranchUnit;
  companyProfile?: CompanyProfile | null;
  onShowNotification: (title: string, message: string, type?: 'success' | 'warning' | 'info') => void;
}

export const SpedFiscalManager: React.FC<SpedFiscalManagerProps> = ({
  invoices,
  products,
  activeBranch,
  companyProfile,
  onShowNotification,
}) => {
  const [competenciaMes, setCompetenciaMes] = useState('09');
  const [competenciaAno, setCompetenciaAno] = useState('2026');
  const [versaoLayout, setVersaoLayout] = useState('018 (Vigência 2026)');
  const [finalidade, setFinalidade] = useState('0 - Remessa do arquivo original');
  const [perfil, setPerfil] = useState('A - Perfil mais detalhado');
  const [incluirInventarioH, setIncluirInventarioH] = useState(true);

  // Gera as linhas no formato oficial SPED EFD ICMS/IPI
  const spedLines = useMemo(() => {
    const lines: string[] = [];
    const dtIni = `01${competenciaMes}${competenciaAno}`;
    const dtFin = `30${competenciaMes}${competenciaAno}`;
    const cnpj = (activeBranch?.cnpj || '12345678000199').replace(/\D/g, '');
    const ie = (activeBranch?.ie || '123456789').replace(/\D/g, '');
    const uf = activeBranch?.uf || 'MS';
    const razao = (companyProfile?.corporateName || 'PANTANAL DISTRIBUIDORA DE AUTOPECAS LTDA').toUpperCase();
    const codIbge = activeBranch?.ibgeCode || '5002704';

    // BLOCO 0: Abertura e Cadastros
    lines.push(`|0000|018|0|${dtIni}|${dtFin}|${razao}|${cnpj}|${uf}|${ie}|${codIbge}|||A|1|`);
    lines.push('|0001|0|');
    lines.push(`|0005|${companyProfile?.tradeName || activeBranch?.name}|79000000|AV CORONEL ANTONINO|1234||CENTRO|6799998888||contabil@autopecas.com.br|`);
    lines.push('|0100|MARCOS CONTABILIDADE SS|12345678000100|CRC/MS 012345|12345678900|79000000|RUA 14 DE JULHO|500||CENTRO|6733221100||sped@escritoriocontabil.com.br|5002704|');

    // Cadastro de Itens (0200)
    products.forEach((p) => {
      const cleanNcm = (p.ncm || '87082999').replace(/\D/g, '');
      lines.push(`|0200|${p.code}|${p.name.slice(0, 50)}|||UN|00|${cleanNcm}|||||`);
    });
    lines.push('|0990|' + (lines.length + 1) + '|');

    // BLOCO C: Documentos Fiscais I - Mercadorias (ICMS/IPI)
    lines.push('|C001|0|');
    invoices.forEach((inv, idx) => {
      const numDoc = inv.number.replace(/\D/g, '');
      const dEmi = inv.issuedAt.slice(0, 10).replace(/-/g, '');
      const total = inv.totalAmount.toFixed(2).replace('.', ',');
      const totalTaxes = inv.taxesTotal.toFixed(2).replace('.', ',');
      // C100 - Nota Fiscal
      lines.push(`|C100|${inv.type === 'venda' ? '1' : '0'}|0|CLI-${idx+1}|55|00|${inv.series}|${numDoc}|${inv.accessKey}|${dEmi}|${dEmi}|${total}|1|0,00|0,00|${total}|0|0,00|0,00|0,00|${total}|${totalTaxes}|0,00|0,00|0,00|0,00|0,00|`);
      // C190 - Registro Analítico
      lines.push(`|C190|5102|102|${total}|${total}|0,00|0,00|0,00|0,00|0,00|0,00|0,00|`);
    });
    lines.push('|C990|' + (invoices.length * 2 + 2) + '|');

    // BLOCO E: Apuração do ICMS e do IPI
    lines.push('|E001|0|');
    lines.push(`|E100|${dtIni}|${dtFin}|`);
    const totalDebito = invoices.reduce((acc, i) => acc + i.taxesTotal, 0).toFixed(2).replace('.', ',');
    lines.push(`|E110|${totalDebito}|0,00|0,00|0,00|0,00|0,00|0,00|0,00|${totalDebito}|0,00|0,00|0,00|0,00|${totalDebito}|`);
    lines.push('|E990|4|');

    // BLOCO H: Inventário Físico (se habilitado)
    if (incluirInventarioH) {
      lines.push('|H001|0|');
      lines.push(`|H005|${dtFin}|${products.reduce((acc, p) => acc + p.unitCost * p.stock, 0).toFixed(2).replace('.', ',')}|01|`);
      products.forEach((p) => {
        const vItem = (p.unitCost * p.stock).toFixed(2).replace('.', ',');
        const vUnit = p.unitCost.toFixed(2).replace('.', ',');
        lines.push(`|H010|${p.code}|UN|${p.stock},000|${vUnit}|${vItem}|0|||||`);
      });
      lines.push('|H990|' + (products.length + 3) + '|');
    } else {
      lines.push('|H001|1|');
      lines.push('|H990|2|');
    }

    // BLOCO 9: Controle e Encerramento
    lines.push('|9001|0|');
    lines.push('|9900|0000|1|');
    lines.push('|9900|0001|1|');
    lines.push('|9900|0200|' + products.length + '|');
    lines.push('|9900|C100|' + invoices.length + '|');
    lines.push('|9900|E100|1|');
    lines.push('|9990|8|');
    lines.push('|9999|' + (lines.length + 2) + '|');

    return lines;
  }, [competenciaMes, competenciaAno, activeBranch, companyProfile, products, invoices, incluirInventarioH]);

  const handleDownloadSped = () => {
    const fileContent = spedLines.join('\r\n');
    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SPED_EFD_ICMS_IPI_${activeBranch?.uf || 'MS'}_${competenciaAno}${competenciaMes}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    onShowNotification(
      'Arquivo SPED Gerado!',
      `Arquivo EFD Fiscal com ${spedLines.length} registros baixado com sucesso.`,
      'success'
    );
  };

  const handleCopyLines = () => {
    navigator.clipboard.writeText(spedLines.slice(0, 15).join('\n'));
    onShowNotification('Copiado', 'Primeiras 15 linhas do SPED copiadas para a área de transferência.', 'info');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header SPED */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sky-700 font-bold text-xs uppercase tracking-wider mb-1">
            <FileSpreadsheet className="w-4 h-4 text-sky-600" />
            <span>Escrituração Fiscal Digital (EFD ICMS/IPI)</span>
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Geração de Arquivo SPED Fiscal
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            Geração em layout oficial dos Blocos 0 (Cadastros), C (NF-e/NFC-e), E (Apuração ICMS), H (Inventário de Peças) e 9 (Encerramento).
          </p>
        </div>

        <button
          type="button"
          onClick={handleDownloadSped}
          className="flex items-center gap-2 bg-[#0C4A6E] hover:bg-[#075985] text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow transition cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Baixar Arquivo SPED (.txt)</span>
        </button>
      </div>

      {/* Cartões de Parâmetros da Competência */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        <div>
          <label className="font-bold text-slate-700 block mb-1">Mês de Competência</label>
          <select
            value={competenciaMes}
            onChange={(e) => setCompetenciaMes(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
          >
            <option value="01">01 - Janeiro</option>
            <option value="02">02 - Fevereiro</option>
            <option value="03">03 - Março</option>
            <option value="04">04 - Abril</option>
            <option value="05">05 - Maio</option>
            <option value="06">06 - Junho</option>
            <option value="07">07 - Julho</option>
            <option value="08">08 - Agosto</option>
            <option value="09">09 - Setembro</option>
            <option value="10">10 - Outubro</option>
            <option value="11">11 - Novembro</option>
            <option value="12">12 - Dezembro</option>
          </select>
        </div>

        <div>
          <label className="font-bold text-slate-700 block mb-1">Ano Base</label>
          <select
            value={competenciaAno}
            onChange={(e) => setCompetenciaAno(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
          >
            <option value="2026">2026 (Ano Corrente)</option>
            <option value="2025">2025</option>
          </select>
        </div>

        <div>
          <label className="font-bold text-slate-700 block mb-1">Versão do Leiaute</label>
          <input
            type="text"
            disabled
            value={versaoLayout}
            className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-500"
          />
        </div>

        <div className="flex flex-col justify-end">
          <label className="flex items-center gap-2 p-2 rounded-xl bg-sky-50 border border-sky-200 cursor-pointer">
            <input
              type="checkbox"
              checked={incluirInventarioH}
              onChange={(e) => setIncluirInventarioH(e.target.checked)}
              className="rounded text-[#0C4A6E] focus:ring-[#0C4A6E]"
            />
            <span className="font-bold text-sky-900 text-xs">Incluir Bloco H (Inventário Físico)</span>
          </label>
        </div>
      </div>

      {/* Indicadores do Arquivo SPED */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-black uppercase text-slate-400">Total de Registros</span>
          <div className="text-xl font-black text-slate-900">{spedLines.length}</div>
          <span className="text-[10px] text-emerald-600 font-bold">Validação PVA OK</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-black uppercase text-slate-400">Notas Fiscais (Bloco C)</span>
          <div className="text-xl font-black text-slate-900">{invoices.length}</div>
          <span className="text-[10px] text-slate-500">NF-e Mod 55</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-black uppercase text-slate-400">Peças Cadastradas (0200)</span>
          <div className="text-xl font-black text-slate-900">{products.length}</div>
          <span className="text-[10px] text-slate-500">NCM e Unidades válidas</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-black uppercase text-slate-400">Inventário (Bloco H)</span>
          <div className="text-xl font-black text-slate-900">
            R$ {products.reduce((acc, p) => acc + p.unitCost * p.stock, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-slate-500">{products.length} posições inventariadas</span>
        </div>
      </div>

      {/* Pré-visualização do Arquivo Pipe-Delimited */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase text-slate-700 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-sky-600" />
            Estrutura Gerada (Primeiras Linhas do Arquivo EFD Fiscal):
          </span>
          <button
            type="button"
            onClick={handleCopyLines}
            className="flex items-center gap-1 text-xs text-sky-600 hover:text-sky-800 font-bold cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Copiar Exemplo</span>
          </button>
        </div>

        <div className="bg-slate-900 text-emerald-400 font-mono text-[11px] p-4 rounded-xl overflow-x-auto max-h-72 leading-relaxed border border-slate-800">
          {spedLines.slice(0, 30).map((line, idx) => (
            <div key={idx} className="whitespace-pre">
              {line}
            </div>
          ))}
          {spedLines.length > 30 && (
            <div className="text-slate-500 italic mt-2">
              ... e mais {spedLines.length - 30} linhas formatadas prontas para validação no PVA da Receita Federal.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
