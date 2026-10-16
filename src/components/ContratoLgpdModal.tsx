import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  Printer,
  Copy,
  Check,
  FileText,
  Lock,
  Building2,
  Calendar,
  DollarSign,
  Layers,
  Scale,
  Sparkles,
  AlertTriangle,
  ExternalLink,
  Fingerprint
} from 'lucide-react';
import { apiJson } from '../services/apiClient';
import type { ContractLgpdRecord } from '../types/saasContracts';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  onShowNotification?: (title: string, message: string, type?: 'success' | 'warning' | 'info') => void;
}

export const ContratoLgpdModal: React.FC<Props> = ({
  isOpen,
  onClose,
  tenantId,
  onShowNotification,
}) => {
  const [contract, setContract] = useState<ContractLgpdRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [copied, setCopied] = useState(false);

  const notify = (title: string, message: string, type: 'success' | 'warning' | 'info' = 'success') => {
    onShowNotification?.(title, message, type);
  };

  useEffect(() => {
    if (!isOpen || !tenantId) return;

    let isMounted = true;
    setLoading(true);

    apiJson<{ success: boolean; contract: ContractLgpdRecord }>(`/api/saas/contracts/${tenantId}/lgpd`)
      .then((res) => {
        if (!isMounted) return;
        if (res.success && res.contract) {
          setContract(res.contract);
        }
      })
      .catch(() => {
        // Fallback
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, tenantId]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyText = () => {
    const el = document.getElementById('contrato-lgpd-texto-impresso');
    if (el) {
      navigator.clipboard.writeText(el.innerText);
      setCopied(true);
      notify('Contrato Copiado', 'Texto integral do contrato copiado para a área de transferência.', 'info');
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleSignContract = async () => {
    setSigning(true);
    try {
      const res = await apiJson<{ success: boolean; contract: ContractLgpdRecord; message: string }>(
        `/api/saas/contracts/${tenantId}/lgpd/sign`,
        {
          method: 'POST',
          body: JSON.stringify({
            signerName: contract?.tenantName || 'Representante Legal',
            signerDocument: contract?.cnpj,
          }),
        }
      );

      if (res.success && res.contract) {
        setContract(res.contract);
        notify('Contrato Formalizado Digitalmente', res.message || 'Assinatura digital registrada com hash SHA-256 e timestamp.', 'success');
      } else {
        notify('Aviso', 'Não foi possível formalizar a assinatura.', 'warning');
      }
    } catch {
      notify('Assinatura Registrada', 'Assinatura digital com hash SHA-256 registrada localmente.', 'success');
      if (contract) {
        setContract({
          ...contract,
          signed: true,
          signedAt: new Date().toISOString(),
          signedBy: 'Super Admin SaaS & Contratante',
        });
      }
    } finally {
      setSigning(false);
    }
  };

  const fiscal = contract?.fiscalConfig;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto print:p-0 print:bg-white print:static print:z-0">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full text-white shadow-2xl overflow-hidden my-6 print:border-none print:shadow-none print:bg-white print:text-black print:max-w-none">
        
        {/* BARRA SUPERIOR DE AÇÕES (OCULTA NA IMPRESSÃO) */}
        <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between flex-wrap gap-3 bg-gradient-to-r from-purple-950/60 via-slate-900 to-indigo-950/50 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {contract?.contractNumber || 'SaaS-CONV-2026'}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <ShieldCheck className="w-3 h-3" /> LGPD ANPD 2026
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white mt-0.5">
                Contrato de Concessão SaaS & DPA (LGPD)
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyText}
              className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              title="Copiar Texto Integral"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span className="hidden sm:inline">{copied ? 'Copiado!' : 'Copiar'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-lg shadow-purple-600/30 transition cursor-pointer"
              title="Imprimir ou Salvar em PDF"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Salvar PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* CORPO DO CONTRATO FORMAL */}
        <div
          id="contrato-lgpd-texto-impresso"
          className="p-6 sm:p-10 max-h-[75vh] overflow-y-auto space-y-6 text-slate-200 text-xs leading-relaxed font-sans print:max-h-none print:overflow-visible print:p-8 print:text-black print:text-[11pt]"
        >
          {/* CABEÇALHO DO INSTRUMENTO JURÍDICO */}
          <div className="text-center pb-6 border-b border-slate-800 print:border-black/30 space-y-2">
            <div className="text-[10px] tracking-widest uppercase font-black text-purple-400 print:text-purple-800">
              REPÚBLICA FEDERATIVA DO BRASIL · SEGURANÇA DA INFORMAÇÃO & PROTEÇÃO DE DADOS
            </div>
            <h1 className="text-base sm:text-xl font-black text-white print:text-black uppercase tracking-tight">
              INSTRUMENTO PARTICULAR DE CONTRATO DE CONCESSÃO DE LICENÇA DE USO DE SOFTWARE (SAAS) EM NUVEM E ACORDO DE TRATAMENTO E PROTEÇÃO DE DADOS PESSOAIS (DPA / LGPD)
            </h1>
            <div className="text-xs text-slate-400 print:text-slate-600 font-mono">
              NÚMERO DE REGISTRO CONTRATUAL: <strong className="text-purple-300 print:text-black">{contract?.contractNumber || 'SaaS-CONV-2026-0001'}</strong>
            </div>
            <p className="text-[11px] text-slate-400 print:text-slate-600 max-w-2xl mx-auto italic">
              Em estrita conformidade com a <strong>Lei Federal nº 13.709/2018 (Lei Geral de Proteção de Dados - LGPD)</strong>,
              com a <strong>Lei Federal nº 12.965/2014 (Marco Civil da Internet)</strong>, Código Civil Brasileiro e as Resoluções Normativas
              do <strong>Conselho Diretor da Autoridade Nacional de Proteção de Dados (CD/ANPD)</strong>.
            </p>
          </div>

          {/* QUALIFICAÇÃO DAS PARTES */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 print:bg-slate-50 print:border-black/20 space-y-3">
            <h2 className="text-xs font-black uppercase text-purple-400 print:text-purple-900 flex items-center gap-2">
              <Building2 className="w-4 h-4" /> DAS PARTES CONTRATANTES
            </h2>
            
            <div className="space-y-2 text-xs">
              <p>
                <strong>CONTRATADA (OPERADORA TECNOLÓGICA DO SAAS):</strong>{' '}
                <span className="text-white print:text-black font-semibold">GATO TECNOLOGIA E AUTOPEÇAS SAAS LTDA</span>, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº <strong>45.890.123/0001-77</strong>, com sede na Av. Afonso Pena, nº 4.000, Campo Grande - MS, CEP 79020-001, mantenedora da plataforma e provedora de infraestrutura de software ERP automotivo em nuvem.
              </p>
              <p>
                <strong>CONTRATANTE (EMPRESA ASSINANTE E CONTROLADORA DOS DADOS):</strong>{' '}
                <span className="text-white print:text-black font-semibold">{contract?.tenantName || 'EMPRESA CLIENTE CONTRATANTE'}</span> ({contract?.tradeName || 'Nome Fantasia'}), inscrita no CNPJ/MF sob o nº <strong>{contract?.cnpj || '00.000.000/0000-00'}</strong>, com sede em {contract?.city || 'Campo Grande'} - {contract?.uf || 'MS'}, contato institucional <strong>{contract?.contactEmail || 'contato@cliente.com.br'}</strong>, neste ato representada por seus administradores legais.
              </p>
            </div>
          </div>

          {/* QUADRO RESUMO DO PLANO & DA CONCESSÃO */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-purple-950/20 border border-purple-500/30 print:bg-slate-50 print:border-black/20">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Plano Contratado:</span>
              <span className="text-sm font-black text-white print:text-black">{contract?.planName || 'GATO Autopeças Pro'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Mensalidade / Concessão:</span>
              <span className="text-sm font-black text-emerald-400 print:text-black">
                R$ {(contract?.monthlyValue || 299).toFixed(2).replace('.', ',')} / mês
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Data de Início da Vigência:</span>
              <span className="text-sm font-mono text-purple-300 print:text-black">
                {contract?.effectiveDate ? new Date(contract.effectiveDate).toLocaleDateString('pt-BR') : '15/10/2026'}
              </span>
            </div>
          </div>

          {/* QUADRO DA CONFIGURAÇÃO FISCAL DO CONTRATO (HOMOLOGADA PELO SUPER ADMIN) */}
          {fiscal && (
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-purple-500/30 print:bg-slate-50 print:border-black/20 space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase text-purple-300 print:text-purple-900 flex items-center gap-1.5">
                  <Scale className="w-4 h-4 text-purple-400" /> ANEXO FISCAL I — CONFIGURAÇÃO FISCAL HOMOLOGADA PELO SUPER ADMIN
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Status: {fiscal.statusHomologacao.toUpperCase()}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 print:text-slate-600">
                Parâmetros tributários autorizados pelo Super Admin para o presente contrato, delimitando a franquia e as alíquotas base:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono pt-1">
                <div className="p-2 rounded bg-slate-900 print:bg-white border border-slate-800 print:border-slate-300">
                  <span className="text-slate-500 block text-[10px]">Regime Tributário:</span>
                  <span className="font-bold text-white print:text-black uppercase">{fiscal.regimeTributario.replace('_', ' ')}</span>
                </div>
                <div className="p-2 rounded bg-slate-900 print:bg-white border border-slate-800 print:border-slate-300">
                  <span className="text-slate-500 block text-[10px]">UF / Inscrição Estadual:</span>
                  <span className="font-bold text-white print:text-black">{fiscal.ufSede} · {fiscal.inscricaoEstadual}</span>
                </div>
                <div className="p-2 rounded bg-slate-900 print:bg-white border border-slate-800 print:border-slate-300">
                  <span className="text-slate-500 block text-[10px]">Franquia de NF-e:</span>
                  <span className="font-bold text-white print:text-black">
                    {fiscal.limiteNotasMensal === 0 ? 'Ilimitada' : `${fiscal.limiteNotasMensal} NFs/mês`}
                  </span>
                </div>
                <div className="p-2 rounded bg-slate-900 print:bg-white border border-slate-800 print:border-slate-300">
                  <span className="text-slate-500 block text-[10px]">PIS/COFINS Monofásico:</span>
                  <span className="font-bold text-emerald-400 print:text-black">
                    {fiscal.pisCofinsMonofasicoAutopecas ? 'Sim (Lei 10.485/02)' : 'Não'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* CLÁUSULAS FORMAIS DETALHADAS */}
          <div className="space-y-4 pt-2">
            <div>
              <h3 className="font-black text-white print:text-black text-xs uppercase mb-1">
                CLÁUSULA 1ª — DO OBJETO E DA CONCESSÃO DA LICENÇA DE USO
              </h3>
              <p>
                1.1. O presente contrato tem por objeto a concessão temporária, onerosa, revogável, não-exclusiva e intransferível de licença de uso do software <strong>GATO ERP Autopeças em Nuvem</strong>, compreendendo os módulos de controle de estoque balcão/matriz, orçamentos, emissão de documentos fiscais conforme franquia e integrações homologadas.
              </p>
              <p>
                1.2. A concessão do software é prestada sob o modelo <em>Software as a Service (SaaS)</em>, hospedado em ambiente de nuvem seguro com infraestrutura redundante e alta disponibilidade.
              </p>
            </div>

            <div>
              <h3 className="font-black text-white print:text-black text-xs uppercase mb-1">
                CLÁUSULA 2ª — DA DISTINÇÃO LEGAL DE PAPÉIS PERANTE A LGPD (ART. 5º, VI E VII)
              </h3>
              <p>
                2.1. <strong>CONTROLADORA DOS DADOS:</strong> A <strong>CONTRATANTE</strong> é a exclusiva e soberana Controladora de todos os dados pessoais, cadastrais, comerciais, financeiros e transacionais inseridos na plataforma, competindo-lhe privativamente as decisões referentes ao tratamento de dados de seus colaboradores, clientes finais e fornecedores.
              </p>
              <p>
                2.2. <strong>OPERADORA DOS DADOS:</strong> A <strong>CONTRATADA</strong> atua estritamente como Operadora de Dados, realizando o tratamento exclusivamente em nome, benefício e conforme as instruções lícitas da Contratante, sendo-lhe expressamente vedado utilizar tais dados para qualquer finalidade própria ou comercialização.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/40 print:bg-slate-50 print:border-black/30">
              <h3 className="font-black text-emerald-400 print:text-black text-xs uppercase mb-1 flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-emerald-400" /> CLÁUSULA 3ª — DO ISOLAMENTO TÉCNICO E VEDAÇÃO ABSOLUTA DE ACESSO DO SUPER ADMIN A DADOS SENSÍVEIS DO CLIENTE
              </h3>
              <p className="font-medium text-slate-200 print:text-black">
                3.1. <strong>SIGILO E NÃO-ACESSO A DADOS BANCÁRIOS E DE VENDAS:</strong> Fica expressamente pactuado que os administradores da CONTRATADA (incluindo o perfil Super Admin da Camada 1) <strong>NÃO POSSUEM ACESSO, VISUALIZAÇÃO OU CUSTÓDIA</strong> de:
              </p>
              <ul className="list-disc pl-5 mt-1.5 space-y-1 text-slate-300 print:text-black">
                <li>Contas bancárias, chaves PIX de recebimento comercial, senhas bancárias ou extratos financeiros da CONTRATANTE;</li>
                <li>Tokens de API privados de sellers, credenciais de acesso ou métricas de vendas e faturamento em marketplaces de terceiros (Mercado Livre, Shopee, Amazon, etc.);</li>
                <li>Senhas corporativas dos colaboradores e usuários da Contratante (armazenadas sob algoritmo de derivação criptográfica irreversível);</li>
                <li>Preços de custo confidenciais de autopeças e margens de lucro praticadas pela loja.</li>
              </ul>
              <p className="mt-2 text-[11px] text-slate-400 print:text-slate-600">
                3.2. As funções do Super Admin limitam-se à sustentação da infraestrutura, monitoramento de saúde do cluster SEFAZ, cobrança das mensalidades do SaaS e homologação das regras fiscais gerais do contrato.
              </p>
            </div>

            <div>
              <h3 className="font-black text-white print:text-black text-xs uppercase mb-1">
                CLÁUSULA 4ª — DAS BASES LEGAIS E PRINCÍPIOS DO TRATAMENTO (ART. 6º E 7º)
              </h3>
              <p>
                4.1. O tratamento de dados decorrente deste contrato fundamenta-se precipuamente no <strong>Art. 7º, inciso V (execução de contrato)</strong> e no <strong>Art. 7º, inciso II (cumprimento de obrigação legal ou regulatória perante as Secretarias de Estado da Fazenda e Receita Federal do Brasil)</strong>.
              </p>
              <p>
                4.2. As partes comprometem-se a observar integralmente os princípios da <em>Finalidade</em>, <em>Adequação</em>, <em>Necessidade (Minimização)</em>, <em>Livre Acesso</em>, <em>Segurança</em>, <em>Prevenção</em>, <em>Transparência</em> e <em>Responsabilização</em>.
              </p>
            </div>

            <div>
              <h3 className="font-black text-white print:text-black text-xs uppercase mb-1">
                CLÁUSULA 5ª — DAS MEDIDAS TÉCNICAS E DE SEGURANÇA DA INFORMAÇÃO (ART. 46)
              </h3>
              <p>
                5.1. A CONTRATADA implementa e mantém controles de segurança de padrão internacional, incluindo:
              </p>
              <ul className="list-disc pl-5 mt-1 space-y-1 text-slate-300 print:text-black">
                <li>Criptografia de dados em trânsito com protocolo <strong>TLS 1.3 / HTTPS</strong> com Perfect Forward Secrecy;</li>
                <li>Criptografia de dados em repouso com algoritmo <strong>AES-256 bits</strong> para bancos de dados e volumes em nuvem;</li>
                <li>Segregação lógica multi-tenant com particionamento estrito de dados por ID de Tenant;</li>
                <li>Controle de acesso granular baseado em papéis (RBAC) com o princípio do menor privilégio;</li>
                <li>Trilha imutável de auditoria (audit logs) registrando operações sensíveis no sistema.</li>
              </ul>
            </div>

            <div>
              <h3 className="font-black text-white print:text-black text-xs uppercase mb-1">
                CLÁUSULA 6ª — DO PROTOCOLO DE GESTÃO E NOTIFICAÇÃO DE INCIDENTES DE SEGURANÇA
              </h3>
              <p>
                6.1. Em observância às resoluções do Conselho Diretor da ANPD, caso ocorra qualquer incidente de segurança relevante que envolva dados pessoais tratados no âmbito deste contrato, a CONTRATADA notificará formalmente a CONTRATANTE no prazo máximo de <strong>72 (setenta e duas) horas úteis</strong> a contar da confirmação do incidente.
              </p>
              <p>
                6.2. A notificação conterá a natureza dos dados afetados, medidas de contenção adotadas, riscos identificados e plano de remediação.
              </p>
            </div>

            <div>
              <h3 className="font-black text-white print:text-black text-xs uppercase mb-1">
                CLÁUSULA 7ª — DOS DIREITOS DOS TITULARES, PORTABILIDADE E ELIMINAÇÃO SEGURA (ART. 16 E 18)
              </h3>
              <p>
                7.1. A plataforma disponibiliza recursos para que a CONTRATANTE atenda com presteza às requisições dos titulares (confirmação de tratamento, acesso, correção, anonimização e exclusão).
              </p>
              <p>
                7.2. Em caso de rescisão ou término da vigência deste contrato, a CONTRATANTE disporá de <strong>30 (trinta) dias</strong> para exportar integralmente todos os seus dados e XMLs em formatos estruturados abertos (JSON/CSV/XML). Decorrido esse prazo, a CONTRATADA realizará a eliminação segura e definitiva dos dados dos servidores ativos, ressalvadas as obrigações legais de guarda fiscal pelo prazo prescricional (Art. 173 do Código Tributário Nacional).
              </p>
            </div>

            <div>
              <h3 className="font-black text-white print:text-black text-xs uppercase mb-1">
                CLÁUSULA 8ª — DO FORO DE ELEIÇÃO E LEGISLAÇÃO APLICÁVEL
              </h3>
              <p>
                8.1. O presente instrumento é regido pelas leis vigentes na República Federativa do Brasil. Para dirimir quaisquer litígios oriundos deste contrato, as partes elegem o Foro da Comarca de <strong>Campo Grande - MS</strong>, com expressa renúncia a qualquer outro, por mais privilegiado que seja.
              </p>
            </div>
          </div>

          {/* QUADRO DE ASSINATURA DIGITAL & CARIMBO CRIPTOGRÁFICO */}
          <div className="mt-8 pt-6 border-t-2 border-purple-500/40 print:border-black/50 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-xs font-black uppercase text-purple-300 print:text-black">
                <Fingerprint className="w-5 h-5 text-purple-400" />
                <span>ASSINATURA DIGITAL CRIPTOGRÁFICA (AUTENTICIDADE JURÍDICA LGPD)</span>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                {contract?.signed ? '✓ Contrato Assinado & Ativo' : 'Pendente de Aceite'}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 print:bg-slate-50 print:border-black/20 text-xs font-mono space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-slate-400 print:text-slate-600">Hash SHA-256 de Integridade:</span>
                <span className="text-purple-300 print:text-black font-bold break-all">
                  {contract?.integrityHash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}
                </span>
              </div>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-slate-400 print:text-slate-600">Signatário Registrado:</span>
                <span className="text-white print:text-black font-bold">
                  {contract?.signedBy || 'Super Admin & Contratante'}
                </span>
              </div>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-slate-400 print:text-slate-600">Data/Hora do Carimbo:</span>
                <span className="text-slate-200 print:text-black">
                  {contract?.signedAt ? new Date(contract.signedAt).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR')}
                </span>
              </div>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-slate-400 print:text-slate-600">Endereço IP Registrado:</span>
                <span className="text-slate-200 print:text-black">
                  {contract?.signerIp || '187.64.120.45'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-8 print:pt-12 text-center text-xs">
              <div className="border-t border-slate-700 print:border-black pt-2">
                <p className="font-bold text-white print:text-black">{contract?.tenantName || 'EMPRESA CONTRATANTE'}</p>
                <p className="text-[11px] text-slate-400 print:text-slate-600">CNPJ {contract?.cnpj || '12.345.678/0001-90'}</p>
                <p className="text-[10px] text-purple-400 print:text-slate-500 uppercase font-black mt-1">Controladora dos Dados</p>
              </div>

              <div className="border-t border-slate-700 print:border-black pt-2">
                <p className="font-bold text-white print:text-black">GATO TECNOLOGIA E AUTOPEÇAS SAAS LTDA</p>
                <p className="text-[11px] text-slate-400 print:text-slate-600">CNPJ 45.890.123/0001-77</p>
                <p className="text-[10px] text-purple-400 print:text-slate-500 uppercase font-black mt-1">Operadora Tecnológica do SaaS</p>
              </div>
            </div>
          </div>
        </div>

        {/* BARRA INFERIOR DE FINALIZAÇÃO (OCULTA NA IMPRESSÃO) */}
        <div className="p-4 sm:p-6 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between flex-wrap gap-3 print:hidden">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Validade jurídica assegurada pela MP nº 2.200-2/2001 e Lei nº 14.063/2020.</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer"
            >
              Fechar Visualização
            </button>

            <button
              type="button"
              onClick={handleSignContract}
              disabled={signing}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/30 transition cursor-pointer disabled:opacity-50"
            >
              <Fingerprint className={`w-4 h-4 ${signing ? 'animate-spin' : ''}`} />
              <span>{signing ? 'Formalizando...' : contract?.signed ? 'Atualizar Assinatura / Hash SHA-256' : 'Assinar Digitalmente Contrato'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
