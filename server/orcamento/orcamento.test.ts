// =========================================================================
// TESTES DO ORÇAMENTO — texto térmico 80mm, resumo curto e documento de impressão
// =========================================================================
// Ficam em `server/orcamento/` (e não na raiz de `server/`) porque o script é
// `tsx --test server/**/*.test.ts`: no Windows o padrão chega literal ao Node,
// mas em shell POSIX sem `globstar` o `sh` expande `**` como `*` e um teste de
// raiz só casaria em um dos dois cenários.
//
// Funções puras, sem DOM: `quoteMarketingSync.ts` importa apenas tipos de
// `../types` e usa `window`/`document` só dentro de corpos de função, nunca na
// avaliação do módulo.
// =========================================================================

import { test } from "node:test";
import assert from "node:assert";
import type { Product, Quote, QuoteItem } from "../../src/types";
import {
  CUPOM_WIDTH,
  buildOrcamentoResumo,
  buildOrcamentoTabelaHtml,
  buildOrcamentoThermalHtml,
  generateCupomFiscalText,
  type CompanyReceiptInfo,
} from "../../src/utils/quoteMarketingSync";

const EMPRESA_LONGA: CompanyReceiptInfo = {
  name: "GATO COMERCIO E DISTRIBUICAO DE AUTOPECAS E PECAS PARA VEICULOS PESADOS LTDA",
  fantasyName: "GATO AUTOPECAS & DISTRIBUIDORA - FILIAL CAMPO GRANDE MATRIZ",
  cnpj: "12.345.678/0001-90",
  ie: "28.901.234-5",
  address: "Avenida Afonso Pena, 4500, Bairro Amambai, Proximo ao Parque das Nacoes",
  city: "Campo Grande",
  uf: "MS",
  phone: "(67) 3345-9821",
  whatsapp: "(67) 99988-7766",
};

function item(overrides: Partial<QuoteItem> = {}): QuoteItem {
  return {
    productId: "p-1",
    productName: "RETENTOR CUBO TRASEIRO 1113",
    productCode: "RET-1113",
    brand: "Sabó",
    quantity: 4,
    costPrice: 42,
    basePrice: 85,
    discountPercent: 0,
    finalUnitPrice: 85,
    total: 340,
    locationStr: "Corredor A - Prateleira 3",
    ...overrides,
  };
}

function quote(overrides: Partial<Quote> = {}): Quote {
  return {
    id: "quot-1",
    quoteNumber: "DAV-2026-00489",
    customerId: "cust-1",
    customerName: "MARQUES TRANSPORTES LTDA",
    customerDocument: "08.492.119/0001-72",
    customerType: "frotista",
    customerUf: "MS",
    customerPhone: "(67) 3384-9000",
    customerWhatsapp: "(67) 99988-7766",
    customerEmail: "frotas@marquestransportes.com.br",
    vehicleModel: "Scania R450",
    vehiclePlate: "QRS-1A23",
    sellerName: "Carlos",
    paymentCondition: "Boleto Faturado",
    items: [item()],
    subtotalAmount: 660,
    discountAmount: 132,
    totalAmount: 660,
    taxAmount: 112.2,
    status: "Pendente",
    validUntil: "2026-10-21",
    createdAt: "2026-10-06T14:20:00.000Z",
    ...overrides,
  };
}

// =========================================================================
// LARGURA — o teste que impede o documento de sair cortado na impressora
// =========================================================================

test("generateCupomFiscalText: nenhuma linha passa de 48 colunas", () => {
  const fixtures: Array<{ nome: string; quote: Quote; company?: CompanyReceiptInfo }> = [
    { nome: "orçamento comum", quote: quote() },
    {
      nome: "empresa com nome e endereço longos",
      quote: quote(),
      company: EMPRESA_LONGA,
    },
    {
      nome: "cliente, veículo e descrição longos",
      quote: quote({
        customerName: "TRANSPORTADORA PANTANAL LOGISTICA E COMERCIO DE PECAS LTDA ME",
        customerDocument: "08.492.119/0001-72",
        vehicleModel: "MERCEDES-BENZ 1113/1313 CACAMBA",
        vehiclePlate: "QRS-1A23",
        sellerName: "WANDERLEIA APARECIDA DO NASCIMENTO",
        paymentCondition: "Cartão de Crédito em 6x sem juros + entrada em dinheiro",
        items: [
          item({
            productName: "KIT COMPLETO DE EMBREAGEM COM PLATO E DISCO PARA CAMINHAO",
            productCode: "EMB-2201-XL",
            quantity: 12,
            finalUnitPrice: 1234.56,
            total: 14814.72,
          }),
          item({ productName: "ÓLEO LUBRIFICANTE 15W40", productCode: "OLEO-15W40", quantity: 20 }),
        ],
      }),
    },
  ];

  for (const { nome, quote: q, company } of fixtures) {
    const texto = generateCupomFiscalText(q, company);
    const linhas = texto.split("\n");

    linhas.forEach((linha, i) => {
      assert.ok(
        linha.length <= CUPOM_WIDTH,
        `[${nome}] linha ${i + 1} tem ${linha.length} colunas (máx. ${CUPOM_WIDTH}): "${linha}"`,
      );
    });
  }
});

test("generateCupomFiscalText: descrição longa é quebrada, não truncada", () => {
  const nomeLongo = "KIT COMPLETO DE EMBREAGEM COM PLATO E DISCO PARA CAMINHAO";
  const texto = generateCupomFiscalText(quote({ items: [item({ productName: nomeLongo })] }));

  // Todas as palavras do nome precisam aparecer — o layout antigo cortava em 22 caracteres.
  for (const palavra of nomeLongo.split(" ")) {
    assert.ok(texto.includes(palavra), `palavra "${palavra}" sumiu do cupom`);
  }
});

test("generateCupomFiscalText: valores saem no padrão brasileiro, com vírgula", () => {
  const texto = generateCupomFiscalText(
    quote({
      items: [item({ quantity: 2, finalUnitPrice: 1234.56, total: 2469.12 })],
      subtotalAmount: 2469.12,
      discountAmount: 0,
      totalAmount: 2469.12,
    }),
  );

  assert.ok(texto.includes("R$ 1.234,56"), "valor unitário fora do padrão brasileiro");
  assert.ok(texto.includes("R$ 2.469,12"), "total do item fora do padrão brasileiro");
  assert.ok(texto.includes("R$ 2.469,12"), "total do orçamento fora do padrão brasileiro");
  assert.ok(!texto.includes("1234.56"), "sobrou ponto decimal no documento");
});

test("generateCupomFiscalText: linhas de continuação ficam indentadas", () => {
  const texto = generateCupomFiscalText(quote());
  const linhas = texto.split("\n");

  // Nenhuma linha pode começar colada na margem quando é continuação de uma lista
  // com marcador — o texto tem de ficar alinhado sob o item anterior.
  const continuacoes = linhas.filter((l) => /^(estoque|cupom|99988)/.test(l));
  assert.deepStrictEqual(continuacoes, [], `continuação sem recuo: ${continuacoes.join(" | ")}`);
});

test("generateCupomFiscalText: carrinho sem itens não quebra", () => {
  const texto = generateCupomFiscalText(quote({ items: [] }));
  assert.ok(texto.includes("VALOR TOTAL A PAGAR"));
  assert.ok(texto.includes("NÃO POSSUI VALOR FISCAL"));
});

// =========================================================================
// RESUMO CURTO — o que o botão "Copiar Orçamento" coloca na área de transferência
// =========================================================================

test("buildOrcamentoResumo: cinco linhas com número, cliente, itens, total e validade", () => {
  const resumo = buildOrcamentoResumo(quote({ items: [item(), item({ productId: "p-2" })] }));
  const linhas = resumo.split("\n");

  assert.strictEqual(linhas.length, 5);
  assert.strictEqual(linhas[0], "ORÇAMENTO Nº: DAV-2026-00489");
  assert.strictEqual(linhas[1], "Cliente: MARQUES TRANSPORTES LTDA");
  assert.strictEqual(linhas[2], "Itens: 2");
  assert.strictEqual(linhas[3], "Total: R$ 660,00");
  assert.match(linhas[4], /^Validade: \d{2}\/\d{2}\/\d{4}$/);
});

test("buildOrcamentoResumo: total usa vírgula decimal (padrão brasileiro)", () => {
  const resumo = buildOrcamentoResumo(quote({ totalAmount: 14814.72 }));
  assert.ok(resumo.includes("Total: R$ 14.814,72"), resumo);
});

test("buildOrcamentoResumo: sobrevive a items vazio, items ausente e total inválido", () => {
  const semItens = buildOrcamentoResumo(quote({ items: [] }));
  assert.ok(semItens.includes("Itens: 0"));

  const itensAusentes = buildOrcamentoResumo({
    ...quote(),
    items: undefined as unknown as QuoteItem[],
  });
  assert.ok(itensAusentes.includes("Itens: 0"));

  const totalInvalido = buildOrcamentoResumo(quote({ totalAmount: Number.NaN }));
  assert.ok(totalInvalido.includes("Total: R$ 0,00"), totalInvalido);

  const semValidade = buildOrcamentoResumo(quote({ validUntil: "" }));
  assert.ok(semValidade.includes("Validade: 15 dias"), semValidade);
});

// =========================================================================
// DOCUMENTO DE IMPRESSÃO — a janela que substitui o window.print() quebrado
// =========================================================================

test("buildOrcamentoThermalHtml: traz charset, @page de 80mm e o número do orçamento", () => {
  const html = buildOrcamentoThermalHtml(quote());

  assert.ok(html.includes('<meta charset="utf-8" />'), "sem charset os acentos saem corrompidos");
  assert.ok(html.includes("@page { size: 80mm auto; margin: 0; }"));
  assert.ok(html.includes('font-size: 9px'), "48 colunas só cabem em 80mm a 9px");
  assert.ok(html.includes("DAV-2026-00489"));
  assert.ok(html.includes("NÃO POSSUI VALOR FISCAL"));
});

test("buildOrcamentoThermalHtml: escapa HTML do conteúdo do orçamento", () => {
  const html = buildOrcamentoThermalHtml(
    quote({ customerName: '<script>alert("xss")</script> & Cia' }),
  );

  assert.ok(!html.includes("<script>alert"), "nome de cliente virou marcação executável");
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(html.includes("&amp; Cia"));
});

test("buildOrcamentoThermalHtml: corpo tem exatamente um <pre> com o texto do cupom", () => {
  const html = buildOrcamentoThermalHtml(quote());
  const ocorrencias = html.match(/<pre>/g) || [];
  assert.strictEqual(ocorrencias.length, 1);
  assert.ok(html.includes("</pre></body>"));
});

test("buildOrcamentoThermalHtml: usa a empresa informada, não o cabeçalho padrão", () => {
  const html = buildOrcamentoThermalHtml(quote(), EMPRESA_LONGA);
  assert.ok(html.includes("GATO COMERCIO E DISTRIBUICAO"));
  assert.ok(!html.includes("GATO COMÉRCIO E DISTRIBUIÇÃO DE AUTOPEÇAS LTDA"));
});

// =========================================================================
// TABELA A4 (paisagem) — o "pedido" de 9 colunas
// =========================================================================

function produto(overrides: Partial<Product> = {}): Product {
  return {
    id: "p-1",
    code: "RET-1113",
    oemCode: "",
    similarCodes: ["SAB-1113", "MAH-2201"],
    barcode: "",
    name: "RETENTOR CUBO TRASEIRO 1113",
    brand: "Sabó",
    category: "auto",
    supplier: "",
    location: { corridor: "", shelf: "", box: "" },
    stock: 10,
    minStock: 2,
    unitCost: 42,
    transportCost: 0,
    markupPercent: 0,
    sellingPrice: 85,
    ncm: "",
    cst: "",
    cfop: "",
    taxBaseIcms: 0,
    applications: [],
    updatedAt: "2026-10-08T00:00:00.000Z",
    ...overrides,
  };
}

test("buildOrcamentoTabelaHtml: traz as nove colunas do documento e o rodapé de totais", () => {
  const html = buildOrcamentoTabelaHtml(quote());

  for (const coluna of [
    "Item",
    "Código",
    "Fabricante",
    "Descrição do Item",
    "Quantidade",
    "Equivalência",
    "Preço do Item",
    "ICMS do Item",
    "Preço Total",
  ]) {
    assert.ok(html.includes(`>${coluna}</th>`), `faltou a coluna ${coluna}`);
  }

  assert.ok(html.includes("Valor do ICMS"));
  assert.ok(html.includes("Outras Despesas"));
  assert.ok(html.includes("Valor Total:"));
  assert.ok(html.includes("Observação:"));
});

test("buildOrcamentoTabelaHtml: imprime em A4 paisagem e avisa que não tem valor fiscal", () => {
  const html = buildOrcamentoTabelaHtml(quote());
  assert.ok(html.includes("size: A4 landscape"));
  assert.ok(html.toLowerCase().includes("sem valor fiscal"));
});

test("buildOrcamentoTabelaHtml: numera os itens em três dígitos", () => {
  const html = buildOrcamentoTabelaHtml(
    quote({ items: [item(), item({ productId: "p-2", productCode: "BOM-952504" })] }),
  );
  assert.ok(html.includes(">001</td>"));
  assert.ok(html.includes(">002</td>"));
});

test("buildOrcamentoTabelaHtml: equivalência vem do similarCodes do produto casado pelo productId", () => {
  const html = buildOrcamentoTabelaHtml(quote(), EMPRESA_LONGA, [produto()]);
  assert.ok(html.includes("SAB-1113, MAH-2201"));
});

test("buildOrcamentoTabelaHtml: item sem produto cadastrado não quebra e deixa a equivalência vazia", () => {
  const html = buildOrcamentoTabelaHtml(quote(), EMPRESA_LONGA, []);
  assert.ok(html.includes('class="equivalencia mono"></td>'));
  assert.ok(html.includes("RETENTOR CUBO TRASEIRO 1113"));
});

test("buildOrcamentoTabelaHtml: ICMS do item sai da alíquota que o orçamento carrega", () => {
  // 4 x 85,00 = 340,00 de item e 57,80 de imposto → alíquota de 17%.
  const html = buildOrcamentoTabelaHtml(
    quote({
      items: [item({ quantity: 4, finalUnitPrice: 85, total: 340 })],
      subtotalAmount: 340,
      totalAmount: 340,
      taxAmount: 57.8,
    }),
  );
  // Uma vez na coluna do item, outra no rodapé.
  const ocorrencias = html.match(/R\$ 57,80/g) || [];
  assert.strictEqual(ocorrencias.length, 2);
});

test("buildOrcamentoTabelaHtml: orçamento sem informação fiscal imprime ICMS zerado", () => {
  const html = buildOrcamentoTabelaHtml(
    quote({ items: [item({ total: 340 })], taxAmount: 0 }),
  );
  assert.ok(html.includes('R$ 0,00'));
  assert.ok(!html.includes("R$ 57,80"));
});

test("buildOrcamentoTabelaHtml: escapa nome de cliente e descrição do item", () => {
  const html = buildOrcamentoTabelaHtml(
    quote({
      customerName: '<script>alert("xss")</script> & Cia',
      items: [item({ productName: '<img src=x onerror=alert(1)>PARAFUSO' })],
    }),
  );
  assert.ok(!html.includes("<script>alert"));
  assert.ok(!html.includes("<img src=x"));
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(html.includes("&amp; Cia"));
});

test("buildOrcamentoTabelaHtml: orçamento sem itens sai com aviso, não com tabela vazia", () => {
  const html = buildOrcamentoTabelaHtml(quote({ items: [], totalAmount: 0, taxAmount: 0 }));
  assert.ok(html.includes("Nenhum item informado."));
});

test("buildOrcamentoTabelaHtml: usa a empresa informada, não o cabeçalho padrão", () => {
  const html = buildOrcamentoTabelaHtml(quote(), EMPRESA_LONGA);
  assert.ok(html.includes("GATO COMERCIO E DISTRIBUICAO"));
  assert.ok(!html.includes("GATO COMÉRCIO E DISTRIBUIÇÃO DE AUTOPEÇAS LTDA"));
});

test("buildOrcamentoTabelaHtml: a condição de pagamento aparece no documento", () => {
  const html = buildOrcamentoTabelaHtml(quote({ paymentCondition: "2.20 - PIX" }));
  assert.ok(html.includes("2.20 - PIX"));
});
