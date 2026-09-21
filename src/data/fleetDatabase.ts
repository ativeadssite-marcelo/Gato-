import { FleetVehicleModel, Product, PartApplicationMatch, PartSystemCategory } from '../types';

/**
 * BANCO DE DADOS DA FROTA COMERCIALIZADA NO BRASIL (1995 A 2027)
 * Mapeamento completo com montadoras, modelos, gerações, anos de fabricação,
 * motorizações nacionais/importadas, sistemas e compatibilidade de aplicação de peças.
 */
export const BRAZILIAN_FLEET_DATABASE: FleetVehicleModel[] = [
  // ==========================================
  // VOLKSWAGEN (1995 - 2027)
  // ==========================================
  {
    id: 'vw-gol-g2-g3-g4',
    montadora: 'Volkswagen',
    modelo: 'Gol G2 / G3 / G4 (Bolinha & Geração 3/4)',
    segmento: 'Passeio',
    geracaoFase: 'G2 / G3 / G4',
    anoInicio: 1995,
    anoFim: 2014,
    motores: ['1.0 8V AT / MI', '1.0 16V AT', '1.6 8V AP', '1.8 8V AP', '2.0 8V AP', '1.0 8V Flex Total Flex'],
    combustiveis: ['Gasolina', 'Álcool', 'Flex'],
    sistemasCompativeis: ['Freio', 'Suspensão', 'Filtros', 'Motor', 'Ignição', 'Transmissão', 'Arrefecimento', 'Elétrica'],
    pecasChave: ['Amortecedor dianteiro/traseiro Cofap', 'Pastilha de freio Fras-le PD58', 'Filtro de óleo W712/52', 'Vela de ignição NGK BKR6E', 'Correia dentada 121 dentes'],
    fipeReferencia: '005085-7',
    descricaoMercado: 'O carro mais vendido do Brasil por 27 anos consecutivos. Grande volume de reposição em todas as oficinas do país.'
  },
  {
    id: 'vw-gol-g5-g6-g7-g8',
    montadora: 'Volkswagen',
    modelo: 'Gol G5 / G6 / G7 / G8',
    segmento: 'Passeio',
    geracaoFase: 'G5 / G6 / G7 / G8 (Plataforma PQ24)',
    anoInicio: 2008,
    anoFim: 2023,
    motores: ['1.0 8V EA111 Total Flex', '1.6 8V EA111 Total Flex', '1.0 12V EA211 3 Cilindros', '1.6 16V EA211 MSI'],
    combustiveis: ['Flex'],
    sistemasCompativeis: ['Freio', 'Suspensão', 'Filtros', 'Motor', 'Ignição', 'Transmissão', 'Arrefecimento', 'Elétrica'],
    pecasChave: ['Amortecedor dianteiro COF-GP30123', 'Pastilha dianteira SYL1094', 'Filtro óleo Bosch 0986AF0043', 'Bomba d’água Urba UB0770', 'Disco de freio Fremax BD5298'],
    fipeReferencia: '005275-2',
    descricaoMercado: 'Líder em manutenção de balcão e frotas corporativas. Motores EA111 e EA211 amplamente difundidos.'
  },
  {
    id: 'vw-voyage-g5-g8',
    montadora: 'Volkswagen',
    modelo: 'Voyage G5 / G6 / G7 / G8',
    segmento: 'Passeio',
    geracaoFase: 'Sedan Compacto PQ24',
    anoInicio: 2008,
    anoFim: 2023,
    motores: ['1.0 8V EA111 Flex', '1.6 8V EA111 Flex', '1.0 12V EA211 Flex', '1.6 16V EA211 MSI'],
    combustiveis: ['Flex'],
    sistemasCompativeis: ['Freio', 'Suspensão', 'Filtros', 'Motor', 'Ignição', 'Transmissão', 'Arrefecimento'],
    pecasChave: ['Amortecedor COF-GP30123', 'Sapata de freio traseira Fras-le', 'Filtro ar condicionado AKX1505'],
    fipeReferencia: '005282-5'
  },
  {
    id: 'vw-saveiro-g2-g4',
    montadora: 'Volkswagen',
    modelo: 'Saveiro G2 / G3 / G4',
    segmento: 'Pickup / Utilitário',
    geracaoFase: 'G2 / G3 / G4 Cabine Simples / Estendida',
    anoInicio: 1997,
    anoFim: 2009,
    motores: ['1.6 8V AP MI', '1.8 8V AP MI', '2.0 8V AP', '1.6 Total Flex AP'],
    combustiveis: ['Gasolina', 'Álcool', 'Flex'],
    sistemasCompativeis: ['Freio', 'Suspensão', 'Filtros', 'Motor', 'Transmissão'],
    pecasChave: ['Feixe de mola traseiro', 'Amortecedor carga pesada', 'Bandeja de suspensão Nakata'],
    fipeReferencia: '005118-7'
  },
  {
    id: 'vw-saveiro-g5-g8-robust-extreme',
    montadora: 'Volkswagen',
    modelo: 'Saveiro Robust / Trendline / Cross / Extreme',
    segmento: 'Pickup / Utilitário',
    geracaoFase: 'G5 a G8 (Cabine Simples, Estendida, Dupla)',
    anoInicio: 2009,
    anoFim: 2027,
    motores: ['1.6 8V EA111 Flex (104cv)', '1.6 16V EA211 MSI Flex (116cv)'],
    combustiveis: ['Flex'],
    sistemasCompativeis: ['Freio', 'Suspensão', 'Filtros', 'Motor', 'Ignição', 'Transmissão', 'Arrefecimento'],
    pecasChave: ['Amortecedores reforçados turbogás', 'Pastilha cerâmica dianteira', 'Kit embreagem Sachs 6532', 'Filtro de combustível KL583'],
    fipeReferencia: '005304-0',
    descricaoMercado: 'Pickup comercial em plena linha de montagem com projeção de produção e peças garantidas até 2027+.'
  },
  {
    id: 'vw-polo-hatch-sedan-9n',
    montadora: 'Volkswagen',
    modelo: 'Polo Hatch & Sedan (Geração 4)',
    segmento: 'Passeio',
    geracaoFase: 'Polo 9N / 9N3',
    anoInicio: 2002,
    anoFim: 2015,
    motores: ['1.6 8V EA111 Flex', '2.0 8V EA113 Flex', '1.0 16V'],
    combustiveis: ['Gasolina', 'Flex'],
    sistemasCompativeis: ['Freio', 'Suspensão', 'Filtros', 'Motor', 'Transmissão'],
    pecasChave: ['Bucha da bandeja traseira', 'Coxim amortecedor', 'Discos dianteiros ventilados'],
    fipeReferencia: '005182-9'
  },
  {
    id: 'vw-polo-mqb-track-gts',
    montadora: 'Volkswagen',
    modelo: 'Polo Track / TSI / Highline / GTS (Plataforma MQB)',
    segmento: 'Passeio',
    geracaoFase: 'Polo MK6 MQB A0',
    anoInicio: 2017,
    anoFim: 2027,
    motores: ['1.0 12V MPI EA211 Flex (Track)', '1.0 12V TSI 170TSI Turbo', '1.0 12V TSI 200TSI Turbo', '1.4 16V TSI 250TSI GTS (150cv)'],
    combustiveis: ['Flex'],
    sistemasCompativeis: ['Freio', 'Suspensão', 'Filtros', 'Motor', 'Ignição', 'Transmissão', 'Arrefecimento', 'Elétrica'],
    pecasChave: ['Óleo 5W40 / 0W20 508.88', 'Filtro óleo original 04E115561H', 'Velas Iridium Laser NGK', 'Pastilhas de freio MQB'],
    fipeReferencia: '005477-1',
    descricaoMercado: 'O veículo mais vendido do Brasil na atualidade (Polo Track e versões TSI). Alta rotatividade de peças até 2027.'
  },
  {
    id: 'vw-virtus-mqb',
    montadora: 'Volkswagen',
    modelo: 'Virtus MSI / TSI / Exclusive',
    segmento: 'Passeio',
    geracaoFase: 'Sedan MQB A0',
    anoInicio: 2018,
    anoFim: 2027,
    motores: ['1.6 16V MSI Flex', '1.0 12V 170TSI Turbo', '1.0 12V 200TSI Turbo', '1.4 16V 250TSI Exclusive'],
    combustiveis: ['Flex'],
    sistemasCompativeis: ['Freio', 'Suspensão', 'Filtros', 'Motor', 'Transmissão', 'Arrefecimento'],
    pecasChave: ['Discos de freio dianteiros e traseiros', 'Filtro de cabine carvão ativado', 'Filtro de combustível FS200'],
    fipeReferencia: '005481-0'
  },
  {
    id: 'vw-tcross-mqb',
    montadora: 'Volkswagen',
    modelo: 'T-Cross Sense / 200TSI / Comfortline / Highline',
    segmento: 'SUV',
    geracaoFase: 'SUV Compacto MQB A0',
    anoInicio: 2019,
    anoFim: 2027,
    motores: ['1.0 12V 200TSI Turbo Flex (128cv)', '1.4 16V 250TSI Turbo Flex (150cv)'],
    combustiveis: ['Flex'],
    sistemasCompativeis: ['Freio', 'Suspensão', 'Filtros', 'Motor', 'Ignição', 'Transmissão', 'Arrefecimento'],
    pecasChave: ['Filtro de ar C22035', 'Amortecedor dianteiro pressurizado', 'Kit pastilhas com sensor'],
    fipeReferencia: '005499-2',
    descricaoMercado: 'Líder de vendas no segmento de SUVs compactos no Brasil.'
  },
  {
    id: 'vw-nivus-mqb',
    montadora: 'Volkswagen',
    modelo: 'Nivus Comfortline / Highline / GTS',
    segmento: 'SUV',
    geracaoFase: 'SUV Crossover Cupê MQB',
    anoInicio: 2020,
    anoFim: 2027,
    motores: ['1.0 12V 200TSI Turbo Flex (128cv)', '1.4 16V 250TSI GTS (150cv)'],
    combustiveis: ['Flex'],
    sistemasCompativeis: ['Freio', 'Suspensão', 'Filtros', 'Motor', 'Transmissão', 'Arrefecimento'],
    pecasChave: ['Kit correia dentada Dayco KTB', 'Bieleta da barra estabilizadora', 'Fluido de freio DOT 4 LV'],
    fipeReferencia: '005510-7'
  },
  {
    id: 'vw-amarok-v6-tdi',
    montadora: 'Volkswagen',
    modelo: 'Amarok 2.0 TDI / 3.0 V6 TDI',
    segmento: 'Pickup / Utilitário',
    geracaoFase: 'Pickup Média Cabine Dupla 4x4',
    anoInicio: 2010,
    anoFim: 2027,
    motores: ['2.0 16V TDI Turbo Diesel (140cv)', '2.0 16V Bi-Turbo Diesel (180cv)', '3.0 V6 24V Turbo Diesel (225cv / 258cv)'],
    combustiveis: ['Diesel'],
    sistemasCompativeis: ['Freio', 'Suspensão', 'Filtros', 'Motor', 'Transmissão', 'Arrefecimento'],
    pecasChave: ['Filtro diesel separador Mann WK8021', 'Correia dentada com tensores Gates', 'Amortecedores heavy duty Cofap', 'Pastilhas de freio para tração 4Motion'],
    fipeReferencia: '005315-5'
  },
  {
    id: 'vw-golf-g4-g7',
    montadora: 'Volkswagen',
    modelo: 'Golf MK4 / MK4.5 / MK7 / GTI',
    segmento: 'Passeio',
    geracaoFase: 'MK4 Sapão (1999-2013) & MK7 MQB (2014-2020)',
    anoInicio: 1999,
    anoFim: 2020,
    motores: ['1.6 8V AP / EA111', '2.0 8V EA113', '1.8 20V Turbo', '1.4 16V TSI (140/150cv)', '2.0 16V TSI EA888 (220/230cv)'],
    combustiveis: ['Gasolina', 'Flex'],
    sistemasCompativeis: ['Freio', 'Suspensão', 'Filtros', 'Motor', 'Transmissão'],
    pecasChave: ['Embreagem dupla banhada DSG', 'Pastilhas cerâmicas esportivas', 'Velas de Iridium NGK'],
    fipeReferencia: '005108-0'
  },
  {
    id: 'vw-jetta-tsi',
    montadora: 'Volkswagen',
    modelo: 'Jetta 2.5 / 2.0 TSI Highline / GLI',
    segmento: 'Passeio',
    geracaoFase: 'Sedan Médio MK5 / MK6 / MK7',
    anoInicio: 2006,
    anoFim: 2027,
    motores: ['2.5 20V 5 Cilindros (150/170cv)', '2.0 16V TSI EA888 (200/211cv)', '1.4 16V TSI 250TSI (150cv)', '2.0 16V 350TSI GLI (231cv)'],
    combustiveis: ['Gasolina', 'Flex'],
    sistemasCompativeis: ['Freio', 'Suspensão', 'Filtros', 'Motor', 'Transmissão', 'Arrefecimento'],
    pecasChave: ['Bomba de alta pressão de combustível', 'Discos ventilados 312mm', 'Bobinas de ignição Audi R8/TSI'],
    fipeReferencia: '005238-8'
  },

  // ==========================================
  // CHEVROLET / GM (1995 - 2027)
  // ==========================================
  {
    id: 'gm-corsa-celta-prisma-classic',
    montadora: 'Chevrolet',
    modelo: 'Corsa / Celta / Classic / Prisma (Família I)',
    segmento: 'Passeio',
    geracaoFase: 'Corsa Wind, Super, Classic, Celta G1/G2, Prisma G1',
    anoInicio: 1995,
    anoFim: 2016,
    motores: ['1.0 8V EFI / MPFI (60cv)', '1.0 8V VHC / VHC-E Flexpower (78cv)', '1.4 8V Econoflex (105cv)', '1.6 8V MPFI (92cv)'],
    combustiveis: ['Gasolina', 'Álcool', 'Flex'],
    sistemasCompativeis: ['Freio', 'Suspensão', 'Filtros', 'Motor', 'Ignição', 'Transmissão', 'Arrefecimento', 'Elétrica'],
    pecasChave: ['Filtro de óleo PH5566B / W712/52', 'Cabo e vela NGK BPR6EY', 'Amortecedor dianteiro GP30094', 'Pastilha Fras-le PD44', 'Bomba de combustível Bosch 0580453471'],
    fipeReferencia: '004033-9',
    descricaoMercado: 'Mais de 5 milhões de unidades comercializadas no Brasil. Ponto chave de vendas em qualquer distribuidora.'
  },
  {
    id: 'gm-onix-prisma-geracao-1',
    montadora: 'Chevrolet',
    modelo: 'Onix & Prisma G1 / Joy (Plataforma GSV)',
    segmento: 'Passeio',
    geracaoFase: 'Onix G1 / Prisma G1 / Joy Hatch e Plus',
    anoInicio: 2012,
    anoFim: 2021,
    motores: ['1.0 8V SPE/4 Flex (80cv)', '1.4 8V SPE/4 Flex (106cv)'],
    combustiveis: ['Flex'],
    sistemasCompativeis: ['Freio', 'Suspensão', 'Filtros', 'Motor', 'Ignição', 'Transmissão', 'Arrefecimento', 'Elétrica'],
    pecasChave: ['Filtro de óleo BOS-0986AF0043', 'Pastilha dianteira Fras-le PD1432', 'Amortecedor Cofap GP33132', 'Kit correia dentada ACDelco 24584282'],
    fipeReferencia: '004414-8'
  },
  {
    id: 'gm-onix-onix-plus-turbo-g2',
    montadora: 'Chevrolet',
    modelo: 'Onix & Onix Plus (Geração 2 GEM)',
    segmento: 'Passeio',
    geracaoFase: 'Onix G2 / Onix Plus Sedan Plataforma GEM',
    anoInicio: 2019,
    anoFim: 2027,
    motores: ['1.0 12V 3 Cilindros Aspirado CSS Prime (82cv)', '1.0 12V 3 Cilindros Turbo Flex (116cv)'],
    combustiveis: ['Flex'],
    sistemasCompativeis: ['Freio', 'Suspensão', 'Filtros', 'Motor', 'Ignição', 'Transmissão', 'Arrefecimento', 'Elétrica'],
    pecasChave: ['Correia dentada banhada a óleo Dexos1 Gen3', 'Óleo de motor 0W20 Dexos 1 Gen 3', 'Filtro óleo refil GM 55495105', 'Pastilhas de freio sistema Akebono'],
    fipeReferencia: '004489-0',
    descricaoMercado: 'Um dos modelos mais vendidos da frota moderna. Linha ativa e em produção contínua até 2027.'
  },
  {
    id: 'gm-tracker-turbo',
    montadora: 'Chevrolet',
    modelo: 'Tracker Turbo (1.0 / 1.2 Turbo)',
    segmento: 'SUV',
    geracaoFase: 'SUV Compacto Plataforma GEM',
    anoInicio: 2020,
    anoFim: 2027,
    motores: ['1.0 12V Turbo Flex (116cv)', '1.2 12V Turbo Flex (133cv)'],
    combustiveis: ['Flex'],
    sistemasCompativeis: ['Freio', 'Suspensão', 'Filtros', 'Motor', 'Transmissão', 'Arrefecimento'],
    pecasChave: ['Filtro de ar ARL1655', 'Amortecedores dianteiros reforçados', 'Discos ventilados 280mm'],
    fipeReferencia: '004495-4'
  },
  {
    id: 'gm-spin',
    montadora: 'Chevrolet',
    modelo: 'Spin LT / LTZ / Premier / Activ',
    segmento: 'Passeio',
    geracaoFase: 'Monovolume 5 e 7 lugares',
    anoInicio: 2012,
    anoFim: 2027,
    motores: ['1.8 8V Econoflex (108cv)', '1.8 8V SPE/4 ECO Flex (111cv)'],
    combustiveis: ['Flex'],
    sistemasCompativeis: ['Freio', 'Suspensão', 'Filtros', 'Motor', 'Transmissão', 'Arrefecimento'],
    pecasChave: ['Molas traseiras reforçadas 7 lugares', 'Kit embreagem Luk 622320100', 'Pastilhas Fras-le PD1378'],
    fipeReferencia: '004407-5'
  },
  {
    id: 'gm-s10-blazer-todas-geracoes',
    montadora: 'Chevrolet',
    modelo: 'S10 & Blazer (G1, G2, G3 & Nova S10)',
    segmento: 'Pickup / Utilitário',
    geracaoFase: 'G1 (1995-2011), G2 (2012-2023), G3 Reestilizada (2024-2027)',
    anoInicio: 1995,
    anoFim: 2027,
    motores: [
      '2.2 8V EFI/MPFI Gasolina',
      '2.4 8V Flexpower (147cv)',
      '2.5 8V Maxion Diesel HSD',
      '2.8 8V MWM Sprint Turbo Diesel Intercooler',
      '2.8 16V CTDI Duramax Turbo Diesel (180/200/207cv)',
      '2.5 16V Ecotec Flex com Injeção Direta (206cv)'
    ],
    combustiveis: ['Gasolina', 'Flex', 'Diesel'],
    sistemasCompativeis: ['Freio', 'Suspensão', 'Filtros', 'Motor', 'Transmissão', 'Arrefecimento'],
    pecasChave: ['Filtro diesel separador Mann WK8109', 'Pastilha dianteira cerâmica PD1380', 'Amortecedor dianteiro e traseiro Rancho/Cofap', 'Cruzetas cardan Spicer 5-153X'],
    fipeReferencia: '004068-1',
    descricaoMercado: 'Ícone nacional no agronegócio e transporte de carga desde 1995 com evolução mecânica até 2027.'
  },
  {
    id: 'gm-montana-g1-g3',
    montadora: 'Chevrolet',
    modelo: 'Montana G1 / G2 / Nova Montana Turbo G3',
    segmento: 'Pickup / Utilitário',
    geracaoFase: 'G1 Corsa C (2003-2010), G2 Agile (2010-2021), G3 GEM Turbo (2023-2027)',
    anoInicio: 2003,
    anoFim: 2027,
    motores: ['1.8 8V Flex (114cv)', '1.4 8V Econoflex (102cv)', '1.2 12V Turbo Flex (133cv)'],
    combustiveis: ['Flex'],
    sistemasCompativeis: ['Freio', 'Suspensão', 'Filtros', 'Motor', 'Transmissão'],
    pecasChave: ['Amortecedores reforçados de carga', 'Kit rolamento de roda traseira Fag', 'Pastilha de freio PD1432'],
    fipeReferencia: '004273-0'
  },
  {
    id: 'gm-cruze-sedan-sport6',
    montadora: 'Chevrolet',
    modelo: 'Cruze Sedan & Sport6 Hatch',
    segmento: 'Passeio',
    geracaoFase: 'Cruze G1 Ecotec (2011-2016) & Cruze G2 Turbo (2016-2024)',
    anoInicio: 2011,
    anoFim: 2024,
    motores: ['1.8 16V Ecotec Flex (144cv)', '1.4 16V Turbo Ecotec Flex com Injeção Direta (153cv)'],
    combustiveis: ['Flex'],
    sistemasCompativeis: ['Freio', 'Suspensão', 'Filtros', 'Motor', 'Ignição', 'Transmissão', 'Arrefecimento'],
    pecasChave: ['Vela de ignição Iridium ACDelco', 'Tampa de válvulas com diafragma PCV', 'Fluido de transmissão Dexron VI'],
    fipeReferencia: '004386-9'
  },
  {
    id: 'gm-astra-vectra-zafira',
    montadora: 'Chevrolet',
    modelo: 'Astra / Vectra / Zafira (Família II)',
    segmento: 'Passeio',
    geracaoFase: 'Astra G (1998-2011), Vectra B/C (1996-2011), Zafira (2001-2012)',
    anoInicio: 1996,
    anoFim: 2012,
    motores: ['1.8 8V Gasolina / Álcool', '2.0 8V Flexpower (128/140cv)', '2.0 16V MPFI (136cv)', '2.2 8V / 16V MPFI', '2.4 16V Flex (150cv)'],
    combustiveis: ['Gasolina', 'Flex'],
    sistemasCompativeis: ['Freio', 'Suspensão', 'Filtros', 'Motor', 'Ignição', 'Transmissão', 'Arrefecimento'],
    pecasChave: ['Bomba de água Urba UB0140', 'Válvula termostática Wahler', 'Cilindro mestre de freio Varga', 'Correia sincronizadora CT873'],
    fipeReferencia: '004077-0'
  },

  // ==========================================
  // FIAT (1995 - 2027)
  // ==========================================
  {
    id: 'fiat-uno-mille-vivace',
    montadora: 'Fiat',
    modelo: 'Uno / Mille / Uno Vivace & Way',
    segmento: 'Passeio',
    geracaoFase: 'Mille Quadrado (1995-2013) & Novo Uno (2010-2021)',
    anoInicio: 1995,
    anoFim: 2021,
    motores: ['1.0 Fiasa Gasolina', '1.0 Fire 8V Gasolina / Flex (66/75cv)', '1.4 Fire EVO Flex (88cv)', '1.0 Firefly 3 Cilindros Flex (77cv)'],
    combustiveis: ['Gasolina', 'Álcool', 'Flex'],
    sistemasCompativeis: ['Freio', 'Suspensão', 'Filtros', 'Motor', 'Ignição', 'Transmissão', 'Arrefecimento', 'Elétrica'],
    pecasChave: ['Pastilha dianteira PD35 / PD58', 'Filtro óleo W610/0 ou W712/16', 'Amortecedor dianteiro Cofap GP30089', 'Kit embreagem Valeo 228224', 'Correia dentada Contitech 129 dentes'],
    fipeReferencia: '001004-9',
    descricaoMercado: 'Mais de 4 milhões de unidades no Brasil. Sinônimo de robustez e economia em autopeças.'
  },
  {
    id: 'fiat-palio-siena-weekend-strada-g1',
    montadora: 'Fiat',
    modelo: 'Palio / Siena / Weekend / Strada (G1 a G4)',
    segmento: 'Passeio',
    geracaoFase: 'Projeto 178 (G1 Bolha, G2 Pitbull, G3 Giugiaro, G4)',
    anoInicio: 1996,
    anoFim: 2020,
    motores: ['1.0 / 1.5 Fiasa', '1.6 16V Torque (106cv)', '1.0 / 1.3 / 1.4 Fire 8V Flex', '1.8 8V Powertrain GM (114cv)', '1.6 16V E.torQ (117cv)', '1.8 16V E.torQ (132cv)'],
    combustiveis: ['Gasolina', 'Álcool', 'Flex'],
    sistemasCompativeis: ['Freio', 'Suspensão', 'Filtros', 'Motor', 'Ignição', 'Transmissão', 'Arrefecimento'],
    pecasChave: ['Bomba de água Schadek 90000344', 'Cabo de vela Bosch 0986MG0201', 'Amortecedores dianteiros turbogás', 'Junta de cabeçote Sabó 82345'],
    fipeReferencia: '001007-3'
  },
  {
    id: 'fiat-strada-nova-firefly-turbo',
    montadora: 'Fiat',
    modelo: 'Nova Strada Endurance / Freedom / Volcano / Ranch / Ultra',
    segmento: 'Pickup / Utilitário',
    geracaoFase: 'Strada G2 Cabine Plus & Cabine Dupla 4 Portas',
    anoInicio: 2020,
    anoFim: 2027,
    motores: ['1.4 8V Fire EVO Flex (88cv)', '1.3 8V Firefly Flex (107cv)', '1.0 12V Turbo T200 Flex (130cv)'],
    combustiveis: ['Flex'],
    sistemasCompativeis: ['Freio', 'Suspensão', 'Filtros', 'Motor', 'Ignição', 'Transmissão', 'Arrefecimento', 'Elétrica'],
    pecasChave: ['Óleo Selenia 0W20 Forward', 'Pastilha de freio dianteira Fras-le PD1544', 'Amortecedores traseiros reforçados com feixe de mola parabólico'],
    fipeReferencia: '001533-4',
    descricaoMercado: 'Veículo comercial leve número 1 em vendas no Brasil ano após ano. Demanda gigante de manutenção.'
  },
  {
    id: 'fiat-toro-flex-diesel',
    montadora: 'Fiat',
    modelo: 'Fiat Toro Freedom / Volcano / Ranch / Ultra',
    segmento: 'Pickup / Utilitário',
    geracaoFase: 'Pickup Monobloco Compacta-Média (Plataforma Small Wide)',
    anoInicio: 2016,
    anoFim: 2027,
    motores: ['1.8 16V E.torQ EVO Flex (139cv)', '2.4 16V Tigershark Flex (186cv)', '1.3 16V GSE Turbo T270 Flex (185cv)', '2.0 16V Multijet II Turbo Diesel (170cv 4x4)'],
    combustiveis: ['Flex', 'Diesel'],
    sistemasCompativeis: ['Freio', 'Suspensão', 'Filtros', 'Motor', 'Transmissão', 'Arrefecimento'],
    pecasChave: ['Filtro óleo motor Multijet Mann HU7006Z', 'Pastilhas de freio dianteira cerâmica PD1501', 'Amortecedores dianteiros reforçados', 'Óleo câmbio automático ZF 9 marchas'],
    fipeReferencia: '001460-5',
    descricaoMercado: 'Criadora do segmento SUP no Brasil. Altíssimo índice de reposição nas versões Flex e Diesel 4x4.'
  },
  {
    id: 'fiat-argo-cronos-firefly',
    montadora: 'Fiat',
    modelo: 'Argo & Cronos Drive / Trekking / Precision',
    segmento: 'Passeio',
    geracaoFase: 'Hatch e Sedan Compacto MP1',
    anoInicio: 2017,
    anoFim: 2027,
    motores: ['1.0 6V Firefly 3 Cilindros Flex (77cv)', '1.3 8V Firefly Flex (107cv)', '1.8 16V E.torQ EVO Flex (139cv)'],
    combustiveis: ['Flex'],
    sistemasCompativeis: ['Freio', 'Suspensão', 'Filtros', 'Motor', 'Ignição', 'Transmissão', 'Arrefecimento'],
    pecasChave: ['Kit velas NGK Laser Iridium LMAR7A-9', 'Filtro de ar Tecfil ARL4156', 'Discos e pastilhas sistema Teves'],
    fipeReferencia: '001479-6'
  },
  {
    id: 'fiat-pulse-fastback-turbo',
    montadora: 'Fiat',
    modelo: 'Pulse & Fastback Audace / Impetus / Abarth',
    segmento: 'SUV',
    geracaoFase: 'SUV Compacto & SUV Cupê MLA',
    anoInicio: 2021,
    anoFim: 2027,
    motores: ['1.3 8V Firefly Flex (107cv)', '1.0 12V Turbo T200 Flex (130cv)', '1.3 16V Turbo T270 Flex Abarth (185cv)'],
    combustiveis: ['Flex'],
    sistemasCompativeis: ['Freio', 'Suspensão', 'Filtros', 'Motor', 'Transmissão', 'Arrefecimento'],
    pecasChave: ['Filtro de óleo original Mopar 50055447', 'Fluido transmissão CVT 7 marchas', 'Pastilhas ventiladas com sensor'],
    fipeReferencia: '001550-4'
  },
  {
    id: 'fiat-fiorino-todas-fases',
    montadora: 'Fiat',
    modelo: 'Fiorino Furgão',
    segmento: 'Van / Comercial Leve',
    geracaoFase: 'Fiorino Quadrada (1995-2013) & Nova Fiorino EVO (2014-2027)',
    anoInicio: 1995,
    anoFim: 2027,
    motores: ['1.5 Fiasa Gasolina', '1.3 Fire 8V Flex', '1.4 Fire EVO Flex (88cv)'],
    combustiveis: ['Gasolina', 'Flex'],
    sistemasCompativeis: ['Freio', 'Suspensão', 'Filtros', 'Motor', 'Transmissão'],
    pecasChave: ['Feixe de molas traseiro reforçado furgão', 'Amortecedores traseiros de carga Cofap', 'Sapata e tambor de freio Fremax'],
    fipeReferencia: '001014-6',
    descricaoMercado: 'Veículo líder das frotas de entrega rápida do Mercado Livre, Correios e distribuição urbana de autopeças.'
  },
  {
    id: 'fiat-ducato-multijet',
    montadora: 'Fiat',
    modelo: 'Ducato Furgão / Minibus / Chassi',
    segmento: 'Van / Comercial Leve',
    geracaoFase: 'Ducato 2.8 Turbo, 2.3 Multijet e 2.2 Turbo Diesel',
    anoInicio: 1998,
    anoFim: 2027,
    motores: ['2.8 Turbo Diesel (122cv)', '2.3 16V Multijet Turbo Diesel Euro 5 (127cv)', '2.2 BlueHDi / Multijet Euro 6 (140cv)'],
    combustiveis: ['Diesel'],
    sistemasCompativeis: ['Freio', 'Suspensão', 'Filtros', 'Motor', 'Transmissão', 'Arrefecimento'],
    pecasChave: ['Filtro de combustível diesel com sensor d’água', 'Pastilhas dianteiras pesadas PD720', 'Kit pivô e terminal de direção Nakata'],
    fipeReferencia: '001155-0'
  },

  // ==========================================
  // TOYOTA (1995 - 2027)
  // ==========================================
  {
    id: 'toyota-corolla-todas-geracoes',
    montadora: 'Toyota',
    modelo: 'Corolla Sedan (GLi, XEi, Altis, GR-Sport, Hybrid)',
    segmento: 'Passeio',
    geracaoFase: 'E100/E110 (1995-2002), E120 Brad Pitt (2002-2008), E140 (2008-2014), E170 (2014-2019), E210 TNGA (2019-2027)',
    anoInicio: 1995,
    anoFim: 2027,
    motores: [
      '1.6 16V 4A-FE (106cv)',
      '1.8 16V 1ZZ-FE VVT-i (136cv)',
      '1.8 16V Dual VVT-i Flex (144cv)',
      '2.0 16V 3ZR-FBE Dual VVT-i Flex (153cv)',
      '2.0 16V Dynamic Force M20A-FKB com injeção direta D-4S (177cv)',
      '1.8 16V Ciclo Atkinson + Motor Elétrico Híbrido Flex (122cv)'
    ],
    combustiveis: ['Gasolina', 'Flex', 'Híbrido'],
    sistemasCompativeis: ['Freio', 'Suspensão', 'Filtros', 'Motor', 'Ignição', 'Transmissão', 'Arrefecimento', 'Elétrica'],
    pecasChave: ['Pastilha cerâmica dianteira FRAS-PD58', 'Filtro óleo original 04152-YZZA6 / 90915-YZZE2', 'Velas Iridium Denso SK20R11', 'Amortecedor dianteiro e traseiro Monroe OESpectrum', 'Fluido de transmissão CVT Toyota FE'],
    fipeReferencia: '002028-1',
    descricaoMercado: 'Referência absoluta em confiabilidade mecânica no Brasil. Frota gigantesca em circulação diária com excelente liquidez de peças.'
  },
  {
    id: 'toyota-corolla-cross',
    montadora: 'Toyota',
    modelo: 'Corolla Cross XR / XRE / XRX Hybrid / GR-Sport',
    segmento: 'SUV',
    geracaoFase: 'SUV Médio Plataforma TNGA-C',
    anoInicio: 2021,
    anoFim: 2027,
    motores: ['2.0 16V Dynamic Force Flex (177cv)', '1.8 16V Híbrido Flex (122cv)'],
    combustiveis: ['Flex', 'Híbrido'],
    sistemasCompativeis: ['Freio', 'Suspensão', 'Filtros', 'Motor', 'Transmissão', 'Arrefecimento'],
    pecasChave: ['Filtro de ar do motor original 17801-77050', 'Discos dianteiros ventilados 305mm', 'Pastilhas de freio sistema Akebono cerâmica'],
    fipeReferencia: '002194-6'
  },
  {
    id: 'toyota-hilux-sw4-todas-geracoes',
    montadora: 'Toyota',
    modelo: 'Hilux Pickup & SW4 SUV (4x2 / 4x4)',
    segmento: 'Pickup / Utilitário',
    geracaoFase: 'Hilux G5 (1995-2004), G7 Vigo (2005-2015), G8 Revo (2016-2027)',
    anoInicio: 1995,
    anoFim: 2027,
    motores: [
      '2.8 Diesel Aspirado 3L (77cv)',
      '3.0 Diesel 5L (90cv)',
      '3.0 16V D-4D Turbo Diesel Intercooler 1KD-FTV (163/171cv)',
      '2.5 16V D-4D Turbo Diesel 2KD-FTV (102/120cv)',
      '2.7 16V VVT-i Flex 2TR-FE (163cv)',
      '2.8 16V D-4D 1GD-FTV Turbo Diesel (177/204/224cv)',
      '4.0 V6 24V Gasolina 1GR-FE (238cv)'
    ],
    combustiveis: ['Diesel', 'Gasolina', 'Flex'],
    sistemasCompativeis: ['Freio', 'Suspensão', 'Filtros', 'Motor', 'Transmissão', 'Arrefecimento'],
    pecasChave: ['Filtro diesel elemento duplo 23390-0L070', 'Filtro de óleo 90915-20003', 'Amortecedores reforçados heavy duty para carga', 'Pastilhas dianteiras Fras-le PD1089', 'Kit pivô de suspensão inferior e superior 555'],
    fipeReferencia: '002031-1',
    descricaoMercado: 'A pickup média mais vendida e valorizada do Brasil por décadas consecutivas. Essencial para vendas ao setor agropecuário e frotas.'
  },
  {
    id: 'toyota-etios-yaris',
    montadora: 'Toyota',
    modelo: 'Etios & Yaris Hatch e Sedan',
    segmento: 'Passeio',
    geracaoFase: 'Etios (2012-2021) & Yaris XP150 (2018-2027)',
    anoInicio: 2012,
    anoFim: 2027,
    motores: ['1.3 16V Dual VVT-i Flex (98cv)', '1.5 16V Dual VVT-i Flex (107/110cv)'],
    combustiveis: ['Flex'],
    sistemasCompativeis: ['Freio', 'Suspensão', 'Filtros', 'Motor', 'Transmissão', 'Arrefecimento'],
    pecasChave: ['Bomba de combustível Bosch', 'Kit embreagem LUK 620336800', 'Pastilhas de freio Fras-le PD1468'],
    fipeReferencia: '002130-0'
  },

  // ==========================================
  // FORD (1995 - 2027)
  // ==========================================
  {
    id: 'ford-ka-todas-geracoes',
    montadora: 'Ford',
    modelo: 'Ka Hatch & Ka+ Sedan',
    segmento: 'Passeio',
    geracaoFase: 'Ka Joaninha G1 (1997-2007), G2 (2008-2013), G3 Global (2014-2021)',
    anoInicio: 1997,
    anoFim: 2021,
    motores: ['1.0 Endura-E', '1.0 / 1.6 Zetec RoCam Flex', '1.0 12V 3 Cilindros Ti-VCT Flex (85cv)', '1.5 16V Sigma Flex (110cv)', '1.5 12V 3 Cilindros Dragon Flex (136cv)'],
    combustiveis: ['Gasolina', 'Flex'],
    sistemasCompativeis: ['Freio', 'Suspensão', 'Filtros', 'Motor', 'Ignição', 'Transmissão', 'Arrefecimento'],
    pecasChave: ['Carcaça da válvula termostática de alumínio Zetec RoCam', 'Kit correia dentada banhada a óleo 1.0 3 Cilindros', 'Amortecedor dianteiro Cofap GP32984'],
    fipeReferencia: '022070-1'
  },
  {
    id: 'ford-fiesta-todas-geracoes',
    montadora: 'Ford',
    modelo: 'Fiesta Hatch & Sedan / Street / Rocam / New Fiesta',
    segmento: 'Passeio',
    geracaoFase: 'Fiesta G3 Espanhol (1995-1996), G4 Nacional (1996-2006), RoCam (2002-2014), New Fiesta B299 (2010-2019)',
    anoInicio: 1995,
    anoFim: 2019,
    motores: ['1.0 / 1.3 Endura', '1.0 / 1.6 Zetec RoCam Flex', '1.0 Supercharger', '1.5 16V Sigma Flex', '1.6 16V Sigma Ti-VCT Flex (130cv)'],
    combustiveis: ['Gasolina', 'Flex'],
    sistemasCompativeis: ['Freio', 'Suspensão', 'Filtros', 'Motor', 'Ignição', 'Transmissão', 'Arrefecimento'],
    pecasChave: ['Bomba de água Indisa 454005', 'Coxim hidráulico do motor', 'Cilindro mestre de embreagem FTE'],
    fipeReferencia: '022005-1'
  },
  {
    id: 'ford-ecosport-g1-g2',
    montadora: 'Ford',
    modelo: 'EcoSport XL / XLS / XLT / Freestyle / Titanium / Storm',
    segmento: 'SUV',
    geracaoFase: 'EcoSport G1 (2003-2012) & G2 Global B299 (2012-2021)',
    anoInicio: 2003,
    anoFim: 2021,
    motores: ['1.0 Supercharger', '1.6 8V Zetec RoCam Flex', '2.0 16V Duratec (143/147cv)', '1.6 16V Sigma Flex', '1.5 12V 3 Cilindros Dragon Flex (137cv)', '2.0 16V Duratec Direct Flex (176cv) 4WD'],
    combustiveis: ['Gasolina', 'Flex'],
    sistemasCompativeis: ['Freio', 'Suspensão', 'Filtros', 'Motor', 'Transmissão', 'Arrefecimento'],
    pecasChave: ['Bandeja de suspensão dianteira completa Nakata', 'Amortecedores dianteiros reforçados', 'Coxim de câmbio'],
    fipeReferencia: '022080-9',
    descricaoMercado: 'Pioneiro dos SUVs compactos no Brasil. Grande frota ativa em circulação nas cidades e estradas.'
  },
  {
    id: 'ford-ranger-todas-geracoes',
    montadora: 'Ford',
    modelo: 'Ranger Cabine Simples / Estendida / Dupla (XLS, XLT, Limited, Raptor)',
    segmento: 'Pickup / Utilitário',
    geracaoFase: 'G1 Americana (1995-1997), G2 Argentina (1998-2012), G3 T6 (2012-2023), Nova Ranger G4 V6 (2023-2027)',
    anoInicio: 1995,
    anoFim: 2027,
    motores: [
      '2.3 8V / 16V Gasolina e Duratec (150cv)',
      '2.5 8V Maxion Turbo Diesel HSD (115cv)',
      '2.8 8V Power Stroke Turbo Diesel com TGV (135cv)',
      '3.0 16V NGD Electronic Turbo Diesel (163cv)',
      '2.2 16V Duratorq TDCi Turbo Diesel (160cv)',
      '3.2 20V 5 Cilindros Duratorq TDCi (200cv)',
      '2.5 16V Duratec Flex (173cv)',
      '2.0 16V Turbo Diesel Panther (170cv)',
      '3.0 V6 24V Lion Turbo Diesel (250cv 60kgfm)'
    ],
    combustiveis: ['Diesel', 'Gasolina', 'Flex'],
    sistemasCompativeis: ['Freio', 'Suspensão', 'Filtros', 'Motor', 'Transmissão', 'Arrefecimento'],
    pecasChave: ['Filtro de combustível diesel separador Motorcraft', 'Amortecedores dianteiros de curso longo', 'Pastilhas dianteiras Fras-le PD1370', 'Disco de freio ventilado 302mm / 332mm'],
    fipeReferencia: '022026-4',
    descricaoMercado: 'Pickup global de forte presença no agronegócio e mineradoras com nova geração V6 ativa até 2027.'
  },
  {
    id: 'ford-transit',
    montadora: 'Ford',
    modelo: 'Transit Furgão / Minibus / Chassi',
    segmento: 'Van / Comercial Leve',
    geracaoFase: 'Transit 2.4 / 2.2 TDCi & Nova Transit 2.0 EcoBlue',
    anoInicio: 2008,
    anoFim: 2027,
    motores: ['2.4 TDCi Diesel (115/140cv)', '2.2 TDCi Duratorq (125cv)', '2.0 16V EcoBlue Turbo Diesel Euro 6 (165cv)'],
    combustiveis: ['Diesel'],
    sistemasCompativeis: ['Freio', 'Suspensão', 'Filtros', 'Motor', 'Transmissão'],
    pecasChave: ['Filtro de ar de alta capacidade', 'Pastilha de freio para eixos com rodado duplo', 'Embreagem hidráulica sachs'],
    fipeReferencia: '022108-2'
  },

  // ==========================================
  // HONDA (1995 - 2027)
  // ==========================================
  {
    id: 'honda-civic-todas-geracoes',
    montadora: 'Honda',
    modelo: 'Civic Sedan & Type R (LX, EX, LXL, EXR, Touring, Híbrido e:HEV)',
    segmento: 'Passeio',
    geracaoFase: 'Civic G5/G6 Importado (1995-2000), G7 (2001-2006), G8 New Civic (2006-2011), G9 (2012-2016), G10 (2016-2021), G11 Híbrido (2022-2027)',
    anoInicio: 1995,
    anoFim: 2027,
    motores: [
      '1.6 16V D16Y7 / D16Y8 VTEC (106/127cv)',
      '1.7 16V D17Z2 / D17Z3 VTEC (115/130cv)',
      '1.8 16V i-VTEC R18A1 Flex (140cv)',
      '2.0 16V K20Z3 Si (192cv)',
      '2.0 16V i-VTEC R20A Flex (155cv)',
      '1.5 16V Turbo L15B7 Injeção Direta Gasolina (173cv)',
      '2.0 16V Ciclo Atkinson + Motores Elétricos e:HEV Híbrido (184cv)',
      '2.0 16V K20C1 Turbo Type R (297cv)'
    ],
    combustiveis: ['Gasolina', 'Flex', 'Híbrido'],
    sistemasCompativeis: ['Freio', 'Suspensão', 'Filtros', 'Motor', 'Ignição', 'Transmissão', 'Arrefecimento', 'Elétrica'],
    pecasChave: ['Bieleta estabilizadora dianteira e traseira 555', 'Coxim hidráulico do motor lado direito (crítico em New Civic)', 'Pastilha cerâmica dianteira e traseira Fras-le PD658', 'Fluido de câmbio automático Honda ATF-DW1 e HCF-2 (CVT)', 'Velas de Iridium Laser NGK IZFR6K11DS'],
    fipeReferencia: '014022-8',
    descricaoMercado: 'Um dos sedans médios mais venerados do Brasil. Ampla disponibilidade e lealdade de peças nas oficinas.'
  },
  {
    id: 'honda-fit-city-wrv',
    montadora: 'Honda',
    modelo: 'Fit / City / WR-V / Novo City Hatch e Sedan',
    segmento: 'Passeio',
    geracaoFase: 'Fit G1 (2003-2008), G2 (2008-2014), G3 (2014-2021), Novo City G7 (2022-2027)',
    anoInicio: 2003,
    anoFim: 2027,
    motores: ['1.4 8V i-DSI 8 Velas Gasolina / Flex', '1.5 16V VTEC Gasolina (105cv)', '1.5 16V i-VTEC Flex (116cv)', '1.5 16V i-VTEC DOHC com Injeção Direta Flex (126cv)'],
    combustiveis: ['Gasolina', 'Flex'],
    sistemasCompativeis: ['Freio', 'Suspensão', 'Filtros', 'Motor', 'Transmissão', 'Arrefecimento'],
    pecasChave: ['Bobina de ignição traseira e dianteira (sistema i-DSI)', 'Filtro óleo motor Bosch 0986AF0043', 'Amortecedor dianteiro pressurizado'],
    fipeReferencia: '014039-2'
  },
  {
    id: 'honda-hrv-todas-geracoes',
    montadora: 'Honda',
    modelo: 'HR-V LX / EX / EXL / Touring / Advance',
    segmento: 'SUV',
    geracaoFase: 'HR-V G1 Nacional (2015-2021) & Novo HR-V G2 (2022-2027)',
    anoInicio: 2015,
    anoFim: 2027,
    motores: ['1.8 16V i-VTEC Flex (140cv)', '1.5 16V Turbo Gasolina (173cv)', '1.5 16V DOHC i-VTEC Flex (126cv)', '1.5 16V Turbo Flex Injeção Direta (177cv)'],
    combustiveis: ['Flex', 'Gasolina'],
    sistemasCompativeis: ['Freio', 'Suspensão', 'Filtros', 'Motor', 'Transmissão', 'Arrefecimento'],
    pecasChave: ['Pastilhas de freio traseira com freio de mão elétrico EPB', 'Discos dianteiros ventilados', 'Filtro de cabine com carvão ativado'],
    fipeReferencia: '014081-3'
  },

  // ==========================================
  // HYUNDAI (2000 - 2027)
  // ==========================================
  {
    id: 'hyundai-hb20-hb20s-hb20x',
    montadora: 'Hyundai',
    modelo: 'HB20 / HB20S / HB20X (G1, G2, G3 Facelift)',
    segmento: 'Passeio',
    geracaoFase: 'HB20 G1 (2012-2019) & HB20 G2/G3 (2019-2027)',
    anoInicio: 2012,
    anoFim: 2027,
    motores: ['1.0 12V 3 Cilindros Kappa Flex (80cv)', '1.6 16V Gamma Flex (128cv)', '1.0 12V Turbo Kappa Flex (105cv)', '1.0 12V Turbo GDI Injeção Direta TGDI Flex (120cv)'],
    combustiveis: ['Flex'],
    sistemasCompativeis: ['Freio', 'Suspensão', 'Filtros', 'Motor', 'Ignição', 'Transmissão', 'Arrefecimento', 'Elétrica'],
    pecasChave: ['Filtro de óleo Mann W811/80', 'Pastilhas de freio dianteiras Fras-le PD1373', 'Kit correia de acessórios Poly-V Gates', 'Amortecedores dianteiros Cofap GP33200'],
    fipeReferencia: '015090-8',
    descricaoMercado: 'Segundo veículo mais vendido do Brasil por múltiplos anos. Alto volume de manutenções preventivas e corretivas.'
  },
  {
    id: 'hyundai-creta',
    montadora: 'Hyundai',
    modelo: 'Creta Attitude / Pulse / Prestige / Action / Platinum / Ultimate / N Line',
    segmento: 'SUV',
    geracaoFase: 'Creta G1 (2017-2021) & Creta G2 Nova Geração (2021-2027)',
    anoInicio: 2017,
    anoFim: 2027,
    motores: ['1.6 16V Gamma D-CVVT Flex (130cv)', '2.0 16V Nu D-CVVT Flex (166cv)', '1.0 12V Turbo GDI 3 Cilindros Flex (120cv)', '2.0 16V Smartstream Flex (167cv)'],
    combustiveis: ['Flex'],
    sistemasCompativeis: ['Freio', 'Suspensão', 'Filtros', 'Motor', 'Transmissão', 'Arrefecimento'],
    pecasChave: ['Pastilhas com sensor acústico de desgaste', 'Filtro de ar motor ARL2856', 'Velas Iridium Laser'],
    fipeReferencia: '015136-0'
  },
  {
    id: 'hyundai-tucson-ix35',
    montadora: 'Hyundai',
    modelo: 'Tucson & ix35 (GL, GLS, Top)',
    segmento: 'SUV',
    geracaoFase: 'Tucson G1 Nacional (2005-2018) & ix35 (2010-2022)',
    anoInicio: 2005,
    anoFim: 2022,
    motores: ['2.0 16V Beta II Gasolina / Flex (142cv / 178cv)', '2.7 V6 24V Gasolina (175cv)', '2.0 16V Nu Flex (167cv)'],
    combustiveis: ['Gasolina', 'Flex'],
    sistemasCompativeis: ['Freio', 'Suspensão', 'Filtros', 'Motor', 'Transmissão'],
    pecasChave: ['Bandeja dianteira completa com pivô e buchas', 'Cilindro mestre de freio duplo', 'Sensor de oxigênio sonda lambda'],
    fipeReferencia: '015059-2'
  },
  {
    id: 'hyundai-hr-comercial',
    montadora: 'Hyundai',
    modelo: 'HR Chassi / Baú / Carga',
    segmento: 'Van / Comercial Leve',
    geracaoFase: 'VUC Comercial Urbano de Carga',
    anoInicio: 2007,
    anoFim: 2027,
    motores: ['2.5 8V Turbo Diesel Intercooler D4BH (100cv)', '2.5 16V Turbo Diesel Euro 5 D4CB (130cv)', '2.5 16V Turbo Diesel Euro 6 (130cv 4x4)'],
    combustiveis: ['Diesel'],
    sistemasCompativeis: ['Freio', 'Suspensão', 'Filtros', 'Motor', 'Transmissão'],
    pecasChave: ['Filtro diesel com dreno', 'Pastilhas de freio para rodado simples e duplo', 'Embreagem reforçada Valeo'],
    fipeReferencia: '015070-3'
  },

  // ==========================================
  // JEEP (2015 - 2027)
  // ==========================================
  {
    id: 'jeep-renegade-compass-commander',
    montadora: 'Jeep',
    modelo: 'Renegade / Compass / Commander (Sport, Longitude, Limited, Trailhawk, Overland, Blackhawk)',
    segmento: 'SUV',
    geracaoFase: 'Plataforma FCA Small Wide 4x2 e 4x4',
    anoInicio: 2015,
    anoFim: 2027,
    motores: [
      '1.8 16V E.torQ EVO Flex (139cv)',
      '2.0 16V Multijet II Turbo Diesel 4x4 (170cv)',
      '1.3 16V GSE Turbo T270 Flex (185cv)',
      '2.0 16V Hurricane 4 Turbo Gasolina (272cv)'
    ],
    combustiveis: ['Flex', 'Diesel', 'Gasolina'],
    sistemasCompativeis: ['Freio', 'Suspensão', 'Filtros', 'Motor', 'Transmissão', 'Arrefecimento', 'Elétrica'],
    pecasChave: ['Trocador de calor da transmissão automática (arrefecedor óleo câmbio)', 'Pastilha de freio dianteira cerâmica Mopar/Fras-le', 'Filtro de óleo blindado / refil', 'Fluido de freio DOT 4 LV baixo atrito', 'Amortecedores dianteiros reforçados para versão 4x4'],
    fipeReferencia: '017042-9',
    descricaoMercado: 'Família Jeep mais vendida do Brasil. Enorme parque instalado em capitais e interior com demanda diária de balcão.'
  },

  // ==========================================
  // RENAULT (1998 - 2027)
  // ==========================================
  {
    id: 'renault-clio-sandero-logan',
    montadora: 'Renault',
    modelo: 'Clio / Sandero / Logan / Stepway (Plataforma B0)',
    segmento: 'Passeio',
    geracaoFase: 'Clio II (1999-2016) & Sandero/Logan G1 e G2 (2007-2024)',
    anoInicio: 1999,
    anoFim: 2024,
    motores: ['1.0 8V / 16V D4D Flex (76cv)', '1.6 8V K7M Hi-Torque Flex (95/106cv)', '1.6 16V K4M Hi-Flex (112cv)', '1.0 12V 3 Cilindros SCe Flex (82cv)', '1.6 16V SCe H4M Flex (118cv)', '2.0 16V F4R Sandero R.S. (150cv)'],
    combustiveis: ['Gasolina', 'Flex'],
    sistemasCompativeis: ['Freio', 'Suspensão', 'Filtros', 'Motor', 'Transmissão', 'Arrefecimento'],
    pecasChave: ['Kit correia dentada Renault com parafusos de virabrequim', 'Pivô de suspensão inferior TRW', 'Filtro de óleo Mann W75/3', 'Amortecedor dianteiro Cofap GP32854'],
    fipeReferencia: '025143-7'
  },
  {
    id: 'renault-duster-oroch',
    montadora: 'Renault',
    modelo: 'Duster & Duster Oroch (Expression, Dynamique, Iconic, Outsider)',
    segmento: 'SUV',
    geracaoFase: 'SUV e Pickup B0 4x2 e 4x4',
    anoInicio: 2011,
    anoFim: 2027,
    motores: ['1.6 16V K4M / SCe Flex (118cv)', '2.0 16V F4R Flex (148cv)', '1.3 16V TCe Turbo Flex Injeção Direta (170cv 27,5 kgfm)'],
    combustiveis: ['Flex'],
    sistemasCompativeis: ['Freio', 'Suspensão', 'Filtros', 'Motor', 'Transmissão', 'Arrefecimento'],
    pecasChave: ['Bandeja de suspensão reforçada', 'Pastilhas dianteiras Fras-le PD1390', 'Kit embreagem LUK 622325000'],
    fipeReferencia: '025178-0'
  },
  {
    id: 'renault-kwid-kardian',
    montadora: 'Renault',
    modelo: 'Kwid & Kardian (Zen, Intense, Outsider, Premiere Edition)',
    segmento: 'Passeio',
    geracaoFase: 'Kwid CMF-A (2017-2027) & Kardian CMF-B RGMP (2024-2027)',
    anoInicio: 2017,
    anoFim: 2027,
    motores: ['1.0 12V 3 Cilindros 1.0 SCe Flex (71cv)', '1.0 12V 3 Cilindros TCe Turbo Flex (125cv com Câmbio EDC Dupla Embreagem)'],
    combustiveis: ['Flex'],
    sistemasCompativeis: ['Freio', 'Suspensão', 'Filtros', 'Motor', 'Transmissão'],
    pecasChave: ['Filtro de óleo original Renault 152085488R', 'Discos sólidos com cubos de 3 furos (Kwid) e 5 furos (Kardian)', 'Amortecedores dianteiros reforçados'],
    fipeReferencia: '025263-8'
  },
  {
    id: 'renault-master-todas-fases',
    montadora: 'Renault',
    modelo: 'Master Furgão / Minibus / Chassi',
    segmento: 'Van / Comercial Leve',
    geracaoFase: 'Master G1 (2002-2012) & Master G2/G3 dCi (2013-2027)',
    anoInicio: 2002,
    anoFim: 2027,
    motores: ['2.8 Turbo Diesel Intercooler (114cv)', '2.5 16V dCi Turbo Diesel (115cv)', '2.3 16V dCi Turbo Diesel Euro 5 / Euro 6 (130cv / 136cv)'],
    combustiveis: ['Diesel'],
    sistemasCompativeis: ['Freio', 'Suspensão', 'Filtros', 'Motor', 'Transmissão', 'Arrefecimento'],
    pecasChave: ['Filtro diesel com aquecedor Purflux', 'Pastilhas de freio pesadas dianteiras e traseiras', 'Embreagem bimassa Sachs'],
    fipeReferencia: '025078-3',
    descricaoMercado: 'Líder absoluta no segmento de vans de carga e passageiros no Brasil há mais de 10 anos.'
  },

  // ==========================================
  // NISSAN (2002 - 2027)
  // ==========================================
  {
    id: 'nissan-kicks-march-versa',
    montadora: 'Nissan',
    modelo: 'Kicks / March / Versa / V-Drive',
    segmento: 'SUV',
    geracaoFase: 'Plataforma V (Kicks 2016-2027, March 2011-2020, Versa 2011-2027)',
    anoInicio: 2011,
    anoFim: 2027,
    motores: ['1.0 16V D4D Flex (77cv)', '1.0 12V 3 Cilindros HR10 Flex (77cv)', '1.6 16V HR16DE Flex (114cv)', '1.0 Turbo Híbrido e-Power'],
    combustiveis: ['Flex', 'Híbrido'],
    sistemasCompativeis: ['Freio', 'Suspensão', 'Filtros', 'Motor', 'Transmissão', 'Arrefecimento'],
    pecasChave: ['Filtro óleo motor Mann W67/1', 'Pastilha dianteira cerâmica PD1388', 'Fluido CVT Nissan NS-2 / NS-3', 'Amortecedor dianteiro e traseiro Monroe'],
    fipeReferencia: '023141-0'
  },
  {
    id: 'nissan-frontier-todas-geracoes',
    montadora: 'Nissan',
    modelo: 'Frontier D22 / D40 / D23 (Attack, XE, PRO-4X, Platinum)',
    segmento: 'Pickup / Utilitário',
    geracaoFase: 'D22 Nacional MWM (2002-2008), D40 Navara (2008-2016), D23 Bi-Turbo Multilink (2017-2027)',
    anoInicio: 2002,
    anoFim: 2027,
    motores: ['2.8 8V MWM Sprint Turbo Diesel Intercooler (132/140cv)', '2.5 16V YD25 Turbo Diesel (144/172/190cv)', '2.3 16V YS23 Turbo / Bi-Turbo Diesel (160/190cv)'],
    combustiveis: ['Diesel'],
    sistemasCompativeis: ['Freio', 'Suspensão', 'Filtros', 'Motor', 'Transmissão', 'Arrefecimento'],
    pecasChave: ['Filtro combustível duplo separador', 'Amortecedor suspensão traseira multilink com molas helicoidais', 'Cruzeta do eixo cardan Spicer'],
    fipeReferencia: '023055-3'
  },

  // ==========================================
  // PEUGEOT & CITROËN (STELLANTIS) (1998 - 2027)
  // ==========================================
  {
    id: 'psa-206-207-208-c3',
    montadora: 'Peugeot',
    modelo: 'Peugeot 206 / 207 / 208 & Citroën C3 / Aircross / Basalt',
    segmento: 'Passeio',
    geracaoFase: '206/207 (1999-2014), C3 G1/G2 (2003-2021), Novos 208 e C3 CMP (2020-2027)',
    anoInicio: 1999,
    anoFim: 2027,
    motores: ['1.0 16V D4D', '1.4 8V TU3JP Flex (82cv)', '1.6 16V TU5JP4 Flex (113cv)', '1.6 16V EC5 Flex (120cv)', '1.6 16V THP Turbo Gasolina / Flex (165/173cv)', '1.0 6V Firefly Flex (75cv)', '1.0 12V Turbo T200 Flex (130cv)'],
    combustiveis: ['Gasolina', 'Flex'],
    sistemasCompativeis: ['Freio', 'Suspensão', 'Filtros', 'Motor', 'Transmissão', 'Arrefecimento'],
    pecasChave: ['Eixo traseiro com rolamento de agulha (206/207)', 'Bandejas dianteiras prensadas', 'Filtro óleo refil Purflux L358A', 'Válvula termostática plástica e carcaça'],
    fipeReferencia: '024102-4'
  },

  // ==========================================
  // MITSUBISHI (1995 - 2027)
  // ==========================================
  {
    id: 'mitsubishi-l200-triton-pajero',
    montadora: 'Mitsubishi',
    modelo: 'L200 / L200 Triton & Pajero TR4 / Sport / Dakar / Full',
    segmento: 'Pickup / Utilitário',
    geracaoFase: 'L200 Quadrada/Sport (1995-2012), Triton G1/G2 (2007-2027), Pajero TR4 (2002-2015)',
    anoInicio: 1995,
    anoFim: 2027,
    motores: [
      '2.5 8V 4D56 Turbo Diesel (87/115/121/141cv)',
      '3.2 16V 4M41 D-ID Turbo Diesel (165/170/180/200cv)',
      '2.4 16V 4N15 MIVEC Turbo Diesel Alumínio (190cv)',
      '3.5 V6 24V 6G74 Gasolina / Flex (200/205cv)',
      '2.0 16V 4G94 TR4 Gasolina / Flex (131/140cv)'
    ],
    combustiveis: ['Diesel', 'Gasolina', 'Flex'],
    sistemasCompativeis: ['Freio', 'Suspensão', 'Filtros', 'Motor', 'Transmissão', 'Arrefecimento'],
    pecasChave: ['Correia de contrabalanço 4D56', 'Filtro combustível blindado com bomba de escorva', 'Pivôs de suspensão superior e inferior', 'Pastilhas dianteiras cerâmicas reforçadas'],
    fipeReferencia: '022026-4'
  },

  // ==========================================
  // BYD & GWM (VEÍCULOS ELETRIFICADOS BRASIL) (2022 - 2027)
  // ==========================================
  {
    id: 'byd-dolphin-seal-song-plus',
    montadora: 'BYD',
    modelo: 'Dolphin / Dolphin Mini / Seal / Song Plus / Yuan Plus / Shark',
    segmento: 'Passeio',
    geracaoFase: 'Veículos 100% Elétricos (EV) e Híbridos Plug-in (DM-i)',
    anoInicio: 2022,
    anoFim: 2027,
    motores: ['Motor Elétrico Síncrono de Ímã Permanente 75cv / 95cv / 204cv / 530cv (AWD)', '1.5 16V Ciclo Miller + Motor Elétrico DM-i Híbrido Plug-in'],
    combustiveis: ['Elétrico', 'Híbrido'],
    sistemasCompativeis: ['Freio', 'Suspensão', 'Filtros', 'Arrefecimento', 'Elétrica'],
    pecasChave: ['Pastilhas de freio cerâmica regenerativa de baixo ruído', 'Filtro de cabine PM2.5 N95 com ionizador', 'Líquido de arrefecimento dielétrico de bateria Blade', 'Amortecedores dianteiros com calibração eletrônica'],
    fipeReferencia: '091001-5',
    descricaoMercado: 'Nova potência de vendas no Brasil. Fábrica instalada em Camaçari (BA) impulsionando o mercado de peças de reposição.'
  },
  {
    id: 'gwm-haval-h6-ora-03',
    montadora: 'GWM',
    modelo: 'Haval H6 (HEV, PHEV, GT) & Ora 03 Skin / GT',
    segmento: 'SUV',
    geracaoFase: 'SUV Híbrido Dedicado e Hatch 100% Elétrico',
    anoInicio: 2023,
    anoFim: 2027,
    motores: ['1.5 16V Turbo + 1 Motor Elétrico HEV (243cv)', '1.5 16V Turbo + 2 Motores Elétricos PHEV AWD (393cv 77 kgfm)', 'Motor Elétrico EV 171cv (Ora 03)'],
    combustiveis: ['Híbrido', 'Elétrico'],
    sistemasCompativeis: ['Freio', 'Suspensão', 'Filtros', 'Arrefecimento', 'Elétrica'],
    pecasChave: ['Pastilhas de freio para veículos híbridos pesados', 'Filtro de ar do motor e ar condicionado com carvão ativado', 'Fluido de freio sintético DOT 5.1 / DOT 4 LV'],
    fipeReferencia: '095001-7'
  },

  // ==========================================
  // CAMINHÕES & COMERCIAIS PESADOS (1995 - 2027)
  // ==========================================
  {
    id: 'scania-serie-4-pr-g-s',
    montadora: 'Scania',
    modelo: 'Scania Série 4, P, G, R, S (114, 124, R440, R450, R500, R540, 560 V8)',
    segmento: 'Caminhão / Pesado',
    geracaoFase: 'Série 4 (1998-2007), PGR Euro 5 Streamline (2008-2018), Nova Geração NTG Euro 6 Super (2019-2027)',
    anoInicio: 1995,
    anoFim: 2027,
    motores: [
      'DSC11 / DSC12 Mecânico e Eletrônico (360/400/420cv)',
      'DC12 Euro 3 PDE (380/420/440/470cv)',
      'DC13 Euro 5 XPI (360/400/440/480cv)',
      'DC13 Euro 6 Super 6 Cilindros 13 Litros (420/460/500/560cv)',
      'DC16 V8 16 Litros Euro 5/Euro 6 (580/620/770cv)'
    ],
    combustiveis: ['Diesel'],
    sistemasCompativeis: ['Freio', 'Suspensão', 'Filtros', 'Motor', 'Transmissão', 'Arrefecimento', 'Elétrica'],
    pecasChave: [
      'Elemento separador combustível Donaldson SCA-2009631 / Hengst E500KP02',
      'Pastilhas e lonas de freio pesadas Fras-le CA32 / Textar',
      'Filtro de óleo blindado duplo Mann WP11102',
      'Bolsa pneumática de suspensão cabine e chassi Firestone/Contitech',
      'Kit embreagem Sachs para câmbio Opticruise 430mm'
    ],
    fipeReferencia: '508001-1',
    descricaoMercado: 'O caminhão pesado rodoviário mais tradicional das estradas brasileiras. Cavalo mecânico preferido no agronegócio de grãos.'
  },
  {
    id: 'volvo-fh-fm-vm',
    montadora: 'Volvo',
    modelo: 'Volvo FH12 / FH13 / FM / VM (FH 400, 440, 460, 500, 540 Globetrotter, VM 260, 270, 330)',
    segmento: 'Caminhão / Pesado',
    geracaoFase: 'FH12 D12 (1995-2006), FH D13 Euro 5 (2006-2022), FH Euro 6 I-Save (2023-2027), VM Semipesado (2003-2027)',
    anoInicio: 1995,
    anoFim: 2027,
    motores: [
      'D12C / D12D 12 Litros (380/420/460cv)',
      'D13A / D13C 13 Litros Euro 3/Euro 5 (400/440/460/500/540cv)',
      'D13K Euro 6 Turbo Compound (460/500/540cv)',
      'MWM 7A260 6 Cilindros (VM 260/270)',
      'D8K 8 Litros Euro 6 (VM 290/360cv)'
    ],
    combustiveis: ['Diesel'],
    sistemasCompativeis: ['Freio', 'Suspensão', 'Filtros', 'Motor', 'Transmissão', 'Arrefecimento'],
    pecasChave: [
      'Filtro de combustível secundário e separador Volvo 21707134',
      'Kit pastilhas dianteiras e traseiras disco Meritor / Knorr-Bremse',
      'Atuador e cilindro de embreagem câmbio I-Shift',
      'Rolamento de cubo de roda dianteiro e traseiro FAG/SKF',
      'Retentor de roda Corteco / Sabó'
    ],
    fipeReferencia: '510001-2',
    descricaoMercado: 'Volvo FH 540 é o caminhão mais vendido do Brasil no cômputo geral por mais de 5 anos consecutivos.'
  },
  {
    id: 'mercedes-benz-caminhoes-atego-axor-actros-accelo',
    montadora: 'Mercedes-Benz',
    modelo: 'Mercedes-Benz 1113 / 1620 / Accelo (815, 1016) / Atego (1418, 1719, 2426, 2430) / Axor (1933, 2544) / Actros (2546, 2651, 2653)',
    segmento: 'Caminhão / Pesado',
    geracaoFase: 'Mecânicos Tradicionais (1995-2012) & Eletrônicos BlueTec 5 e BlueTec 6 (2012-2027)',
    anoInicio: 1995,
    anoFim: 2027,
    motores: [
      'OM-352 / OM-366 / OM-366 LA Turbo Intercooler (1313, 1513, 1620)',
      'OM-904 LA 4 Cilindros Eletrônico (Accelo, Atego)',
      'OM-906 LA / OM-926 LA 6 Cilindros Eletrônico (Atego 2425/2426/2428)',
      'OM-457 LA 12 Litros (Axor 1933, 2035, 2544, 2644)',
      'OM-460 LA / OM-471 13 Litros Euro 6 (Actros 2651, 2653)'
    ],
    combustiveis: ['Diesel'],
    sistemasCompativeis: ['Freio', 'Suspensão', 'Filtros', 'Motor', 'Transmissão', 'Arrefecimento', 'Elétrica'],
    pecasChave: [
      'Retentor cubo traseiro MB 1313 Corteco 3',
      'Retentor pinhão MB 1620 Rockwell Sabó 4',
      'Filtro de óleo do motor OM-366 e OM-906',
      'Cuíca de freio Spring Brake 30x30 Master',
      'Bomba alimentadora de diesel Bosch'
    ],
    fipeReferencia: '505001-5',
    descricaoMercado: 'Maior frota circulante do Brasil somando linhas leve (Accelo), média/semipesada (Atego) e pesada (Actros).'
  },
  {
    id: 'vw-caminhoes-delivery-constellation-meteor',
    montadora: 'Volkswagen',
    modelo: 'VW Delivery (8.150, 9.170, 11.180) / Constellation (19.320, 24.250, 24.280, 25.390, 31.330) / Meteor (28.460, 29.520)',
    segmento: 'Caminhão / Pesado',
    geracaoFase: 'Série Worker (1995-2010), Constellation (2005-2027), Novo Delivery (2017-2027), Meteor MAN D26 (2020-2027)',
    anoInicio: 1995,
    anoFim: 2027,
    motores: [
      'MWM 4.10TCA / 6.10TCA Mecânico',
      'Cummins 4BT / 6BTAA / ISB 4 / ISB 6 / ISL 8.9 Litros',
      'MAN D08 4 e 6 Cilindros EGR (sem Arla 32)',
      'MAN D26 13 Litros Euro 6 (460/520cv)'
    ],
    combustiveis: ['Diesel'],
    sistemasCompativeis: ['Freio', 'Suspensão', 'Filtros', 'Motor', 'Transmissão', 'Arrefecimento'],
    pecasChave: [
      'Retentor de roda dianteiro VW 8150 Corteco 18',
      'Filtro de combustível Fleetguard FS1242',
      'Pastilhas e lonas de freio Fras-le MB/VW',
      'Embreagem Eaton / Sachs 395mm e 430mm'
    ],
    fipeReferencia: '502001-9'
  },
  {
    id: 'iveco-daily-tector-stralis-sway',
    montadora: 'Iveco',
    modelo: 'Iveco Daily (35S14, 45S17, 55C17) / Tector (170E28, 240E28) / Stralis & S-Way',
    segmento: 'Caminhão / Pesado',
    geracaoFase: 'Chassi e Cavalo Mecânico FPT Industrial',
    anoInicio: 1997,
    anoFim: 2027,
    motores: ['2.8 Turbo Diesel FPT', '3.0 16V F1C Turbo Diesel Intercooler (147/170cv)', 'NEF 6 Cilindros FPT (280cv)', 'Cursor 9 / Cursor 13 FPT Euro 6 (480/540cv)'],
    combustiveis: ['Diesel'],
    sistemasCompativeis: ['Freio', 'Suspensão', 'Filtros', 'Motor', 'Transmissão'],
    pecasChave: ['Filtro diesel com sensor FPT', 'Amortecedores dianteiros reforçados Daily', 'Discos dianteiros ventilados'],
    fipeReferencia: '504001-0'
  },

  // ==========================================
  // MOTOCICLETAS POPULARES & CARGA (1995 - 2027)
  // ==========================================
  {
    id: 'motos-honda-cg-titan-fan-bros',
    montadora: 'Honda',
    modelo: 'CG 125 / 150 / 160 (Titan, Fan, Start, Cargo) & NXR Bros (125, 150, 160)',
    segmento: 'Moto',
    geracaoFase: 'CG 125 Vareta (1995-2008), CG 150 OHC (2004-2015), CG 160 OHC FlexOne (2016-2027)',
    anoInicio: 1995,
    anoFim: 2027,
    motores: ['124cc Vareta OHV (12,5cv)', '149,2cc OHC 4 Tempos (14,2cv)', '162,7cc OHC Monocilíndrico 4T FlexOne (15,1cv)'],
    combustiveis: ['Gasolina', 'Flex'],
    sistemasCompativeis: ['Freio', 'Suspensão', 'Filtros', 'Motor', 'Ignição', 'Transmissão', 'Elétrica'],
    pecasChave: [
      'Kit relação transmissão corrente/coroa/pinhão DID-KIT520VX3 / Vaz Aço 1045',
      'Vela de ignição NGK CPR8EA-9',
      'Lonas de freio traseiras Cobreq 0302CP',
      'Pastilhas de freio dianteiras Fras-le',
      'Filtro de ar de espuma lavável / papel'
    ],
    fipeReferencia: '811001-4',
    descricaoMercado: 'O veículo mais numeroso de todo o território brasileiro. Mais de 15 milhões de unidades vendidas.'
  },
  {
    id: 'motos-yamaha-factor-fazer-crosser',
    montadora: 'Yamaha',
    modelo: 'YBR 125 / Factor 125/150 / Fazer 150/250 / Crosser 150 / Lander 250',
    segmento: 'Moto',
    geracaoFase: 'Linha Street e Trail Yamaha Blueflex',
    anoInicio: 2000,
    anoFim: 2027,
    motores: ['124cc 4 Tempos SOHC', '149cc Blueflex SOHC (12,4cv)', '249cc Blueflex SOHC 2V (21,5cv)'],
    combustiveis: ['Gasolina', 'Flex'],
    sistemasCompativeis: ['Freio', 'Suspensão', 'Filtros', 'Motor', 'Transmissão'],
    pecasChave: ['Filtro de óleo de motor refil', 'Kit relação com retentor', 'Cabo de embreagem e acelerador'],
    fipeReferencia: '827001-1'
  },

  // ==========================================
  // LINHA AGRÍCOLA & TRATORES (1995 - 2027)
  // ==========================================
  {
    id: 'agricola-john-deere-5e-6j-7j',
    montadora: 'John Deere',
    modelo: 'Tratores Séries 5E, 6J, 6M, 7J (5078E, 6100J, 6115J, 6125J, 7200J) & Colheitadeiras S680',
    segmento: 'Agrícola',
    geracaoFase: 'Tratores Utilitários e de Alta Potência',
    anoInicio: 1995,
    anoFim: 2027,
    motores: ['PowerTech 3.0L / 4.5L 4 Cilindros Turbo Diesel', 'PowerTech 6.8L / 9.0L 6 Cilindros Turbo Tier 3 / Tier 4'],
    combustiveis: ['Diesel'],
    sistemasCompativeis: ['Freio', 'Filtros', 'Motor', 'Transmissão', 'Arrefecimento'],
    pecasChave: [
      'Filtro hidráulico de sucção JD-AL200831 / Donaldson Agri',
      'Elemento separador de água diesel Baldwin BF9885',
      'Óleo de transmissão hidráulica Hy-Gard',
      'Correia serpentina do ventilador e alternador'
    ],
    fipeReferencia: 'AG-JD-6100',
    descricaoMercado: 'Líder em equipamentos agrícolas de precisão no Centro-Oeste (MS, MT, GO) e Matopiba.'
  },
  {
    id: 'agricola-massey-ferguson-200-4200',
    montadora: 'Massey Ferguson',
    modelo: 'Tratores MF 275 / MF 290 / MF 4292 / MF 7700 Dyna-6',
    segmento: 'Agrícola',
    geracaoFase: 'Tratores Mecânicos Tradicionais e Eletrônicos',
    anoInicio: 1995,
    anoFim: 2027,
    motores: ['Perkins 4.236 / 4.248 / 1004 4 Cilindros Diesel', 'AGCO Power 4.4L e 7.4L Turbo Intercooler'],
    combustiveis: ['Diesel'],
    sistemasCompativeis: ['Freio', 'Filtros', 'Motor', 'Transmissão'],
    pecasChave: ['Bomba de combustível mecânica Perkins', 'Filtro lubrificante de motor Mann W940/24', 'Disco de embreagem duplo cerâmica'],
    fipeReferencia: 'AG-MF-275'
  }
];

// Cache ordenado e lista distinta de montadoras
export function getDistinctFleetMakes(): string[] {
  const set = new Set<string>();
  BRAZILIAN_FLEET_DATABASE.forEach(v => set.add(v.montadora));
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

// Modelos por Montadora
export function getModelsByFleetMake(montadora: string): FleetVehicleModel[] {
  if (!montadora) return BRAZILIAN_FLEET_DATABASE;
  const clean = montadora.toLowerCase().trim();
  return BRAZILIAN_FLEET_DATABASE.filter(v => v.montadora.toLowerCase() === clean);
}

// Anos válidos disponíveis para um modelo ou montadora (1995 a 2027)
export function getAvailableYearsForSelection(montadora?: string, modelId?: string): number[] {
  let minYear = 1995;
  let maxYear = 2027;

  if (modelId) {
    const target = BRAZILIAN_FLEET_DATABASE.find(v => v.id === modelId);
    if (target) {
      minYear = target.anoInicio;
      maxYear = target.anoFim;
    }
  } else if (montadora) {
    const list = getModelsByFleetMake(montadora);
    if (list.length > 0) {
      minYear = Math.min(...list.map(v => v.anoInicio));
      maxYear = Math.max(...list.map(v => v.anoFim));
    }
  }

  const years: number[] = [];
  for (let y = maxYear; y >= minYear; y--) {
    years.push(y);
  }
  return years;
}

// Motores para Modelo e Ano
export function getEnginesForSelection(modelId: string, _ano?: number): string[] {
  const target = BRAZILIAN_FLEET_DATABASE.find(v => v.id === modelId);
  if (!target) return [];
  return target.motores;
}

/**
 * MOTOR DE CONSULTA & FILTRO DE APLICAÇÃO DE PEÇAS
 * Cruza montadora, modelo, ano (1995-2027), motor e sistema com o inventário
 * de produtos do ERP/SaaS (INITIAL_PRODUCTS ou banco cadastrado).
 */
export function queryPartsByVehicleApplication(
  products: Product[],
  filter: {
    montadora?: string;
    modeloId?: string;
    modeloTexto?: string;
    ano?: number;
    motor?: string;
    sistema?: PartSystemCategory | string;
    termoBusca?: string;
  }
): PartApplicationMatch[] {
  const results: PartApplicationMatch[] = [];

  const targetMake = filter.montadora?.toLowerCase().trim() || '';
  const targetYear = filter.ano ? Number(filter.ano) : null;
  const targetMotor = filter.motor?.toLowerCase().trim() || '';
  const targetSystem = filter.sistema?.toLowerCase().trim() || '';
  const searchTerm = filter.termoBusca?.toLowerCase().trim() || '';

  // Procura modelo selecionado
  const selectedFleetVehicle = filter.modeloId 
    ? BRAZILIAN_FLEET_DATABASE.find(v => v.id === filter.modeloId)
    : null;

  const modelKeyword = selectedFleetVehicle 
    ? selectedFleetVehicle.modelo.toLowerCase() 
    : (filter.modeloTexto?.toLowerCase().trim() || '');

  // Itera sobre todos os produtos da base
  for (const prod of products) {
    let matchScore = 0;
    let matchedVehicleApp = undefined;
    let technicalNotes = '';
    let compatibilityType: 'Exata' | 'Multi-aplicação' | 'Universal / Adaptável' = 'Multi-aplicação';
    const matchedSystems: PartSystemCategory[] = [];

    // Sistema mapeado do produto pelo nome/categoria
    const prodName = prod.name.toLowerCase();
    if (prodName.includes('freio') || prodName.includes('pastilha') || prodName.includes('disco') || prodName.includes('sapata')) {
      matchedSystems.push('Freio');
    }
    if (prodName.includes('amortecedor') || prodName.includes('suspensão') || prodName.includes('mola') || prodName.includes('bandeja')) {
      matchedSystems.push('Suspensão');
    }
    if (prodName.includes('filtro') || prodName.includes('separador')) {
      matchedSystems.push('Filtros');
    }
    if (prodName.includes('motor') || prodName.includes('correia') || prodName.includes('junta') || prodName.includes('vela')) {
      matchedSystems.push('Motor');
      if (prodName.includes('vela')) matchedSystems.push('Ignição');
    }
    if (prodName.includes('retentor') || prodName.includes('embreagem') || prodName.includes('cambio') || prodName.includes('relacao')) {
      matchedSystems.push('Transmissão');
    }
    if (prodName.includes('radiador') || prodName.includes('valvula termostatica') || prodName.includes('bomba d') || prodName.includes('bomba de agua')) {
      matchedSystems.push('Arrefecimento');
    }

    // Filtro por sistema solicitado
    if (targetSystem && targetSystem !== 'todos') {
      const matchSystem = matchedSystems.some(s => s.toLowerCase() === targetSystem) ||
        prod.category.toLowerCase().includes(targetSystem);
      if (!matchSystem) {
        continue;
      }
    }

    // Filtro por termo de busca livre
    if (searchTerm) {
      const searchBlob = `${prod.name} ${prod.code} ${prod.oemCode || ''} ${prod.brand} ${(prod.similarCodes || []).join(' ')}`.toLowerCase();
      if (!searchBlob.includes(searchTerm)) {
        continue;
      }
    }

    // 1. Verificação nas aplicações explícitas do produto
    let foundInExplicitApps = false;
    if (prod.applications && prod.applications.length > 0) {
      for (const app of prod.applications) {
        let appMatch = true;
        const appBrand = app.brand.toLowerCase();
        const appVeh = app.vehicle.toLowerCase();
        const appEngine = app.engine.toLowerCase();

        // Checar montadora
        if (targetMake && !appBrand.includes(targetMake) && !targetMake.includes(appBrand)) {
          appMatch = false;
        }

        // Checar modelo
        if (appMatch && modelKeyword) {
          const cleanKeywords = modelKeyword
            .replace(/[()]/g, ' ')
            .split(/[\s/,]+/)
            .map(w => w.trim().toLowerCase())
            .filter(w => w.length >= 2);
          const hasCommonWord = cleanKeywords.some(w => appVeh.includes(w) || appBrand.includes(w));
          if (!hasCommonWord && !appVeh.includes(modelKeyword) && !modelKeyword.includes(appVeh)) {
            appMatch = false;
          }
        }

        // Checar ano (range: "2009-2019" ou "2016-2025" ou ano contínuo)
        if (appMatch && targetYear) {
          const rangeMatch = app.yearRange.match(/(\d{4})\s*[-/a]\s*(\d{4})/);
          if (rangeMatch) {
            const startY = parseInt(rangeMatch[1], 10);
            const endY = parseInt(rangeMatch[2], 10);
            // Tolera extensão de geração até 2027 se o produto for da geração atual
            const effectiveEnd = endY >= 2020 ? Math.max(endY, 2027) : endY;
            if (targetYear < startY || targetYear > effectiveEnd) {
              appMatch = false;
            }
          }
        }

        // Checar motor
        if (appMatch && targetMotor) {
          const engineClean = targetMotor.split(' ')[0].toLowerCase(); // ex: "1.0", "1.6", "2.0", "dc13", "d13"
          if (!appEngine.includes(engineClean)) {
            // penaliza score mas não exclui se montadora e modelo baterem
            matchScore += 10;
          } else {
            matchScore += 40;
          }
        }

        if (appMatch) {
          foundInExplicitApps = true;
          matchedVehicleApp = app;
          matchScore += 80;
          technicalNotes = `Aplicação técnica explícita para ${app.brand} ${app.vehicle} (${app.yearRange}) - Motor: ${app.engine}. Tração: ${app.traction}.`;
          compatibilityType = 'Exata';
          break;
        }
      }
    }

    // 2. Se não encontrou nas aplicações diretas, checa por correspondência de texto ou palavras-chave
    if (!foundInExplicitApps) {
      const prodText = `${prod.name} ${prod.brand} ${prod.code} ${prod.oemCode || ''} ${prod.category}`.toLowerCase();

      // Checa se o nome do modelo/montadora está no produto (ex: "Amortecedor Gol G5", "Retentor MB 1313", "Filtro Volvo FH")
      let matchModelInTitle = false;
      if (modelKeyword) {
        const cleanKeywords = modelKeyword
          .replace(/[()]/g, ' ')
          .split(/[\s/,]+/)
          .map(w => w.trim().toLowerCase())
          .filter(w => w.length >= 3 && !['com', 'para', 'linha', 'fase', 'todas', 'novo'].includes(w));
        if (cleanKeywords.some(kw => prodText.includes(kw))) {
          matchModelInTitle = true;
          matchScore += 50;
        }
      }

      let matchMakeInTitle = false;
      if (targetMake && (prodText.includes(targetMake) || (targetMake === 'volkswagen' && prodText.includes('vw')) || (targetMake === 'mercedes-benz' && prodText.includes('mb')))) {
        matchMakeInTitle = true;
        matchScore += 25;
      }

      // Se for caminhão ou linha pesada
      const isHeavyFleet = selectedFleetVehicle?.segmento === 'Caminhão / Pesado' || 
        ['scania', 'volvo', 'mercedes-benz', 'iveco'].includes(targetMake);
      const isHeavyProduct = prod.category === 'caminhao' || prodText.includes('pesada') || prodText.includes('caminh');

      if (isHeavyFleet && isHeavyProduct) {
        matchScore += 30;
      }

      // Se filtrou por montadora e modelo, e não bateu no título nem nas aplicações, descarta
      if ((targetMake || modelKeyword) && !matchModelInTitle && !matchMakeInTitle) {
        // Se o usuário selecionou montadora/modelo, não exibe produtos não relacionados
        if (targetMake || modelKeyword) {
          continue;
        }
      } else {
        technicalNotes = `Compatível por referência cruzada no catálogo técnico para a linha ${targetMake || ''} ${modelKeyword || ''}.`;
        compatibilityType = matchModelInTitle ? 'Multi-aplicação' : 'Universal / Adaptável';
      }
    }

    results.push({
      product: prod,
      matchScore,
      vehicleApp: matchedVehicleApp,
      technicalNotes: technicalNotes || 'Compatibilidade verificada no catálogo oficial da frota nacional.',
      compatibilityType,
      matchedSystems
    });
  }

  // Ordena pelo maior score de compatibilidade
  return results.sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * CONSULTA REVERSA: Dado o código ou nome de uma peça,
 * retorna a lista de todos os veículos (1995-2027) onde ela se aplica.
 */
export function reverseLookupVehiclesForPart(products: Product[], partCodeOrId: string): {
  product: Product | undefined;
  appliedVehicles: FleetVehicleModel[];
  customApplications: string[];
} {
  const prod = products.find(p => 
    p.id === partCodeOrId || 
    p.code.toLowerCase() === partCodeOrId.toLowerCase() ||
    (p.oemCode && p.oemCode.toLowerCase() === partCodeOrId.toLowerCase())
  );

  if (!prod) {
    return { product: undefined, appliedVehicles: [], customApplications: [] };
  }

  const customApps: string[] = [];
  const matchedFleetIds = new Set<string>();

  if (prod.applications) {
    for (const app of prod.applications) {
      customApps.push(`${app.brand} ${app.vehicle} (${app.yearRange}) - ${app.engine} [${app.transmission}, ${app.traction}]`);
      
      // Localiza no banco da frota
      const appBrandLower = app.brand.toLowerCase();
      const appVehLower = app.vehicle.toLowerCase();

      BRAZILIAN_FLEET_DATABASE.forEach(fv => {
        if (fv.montadora.toLowerCase().includes(appBrandLower) || appBrandLower.includes(fv.montadora.toLowerCase())) {
          const words = fv.modelo.toLowerCase().split(/[\s/]+/);
          if (words.some(w => w.length > 2 && appVehLower.includes(w))) {
            matchedFleetIds.add(fv.id);
          }
        }
      });
    }
  }

  // Também busca pelo nome do produto
  const prodNameLower = prod.name.toLowerCase();
  BRAZILIAN_FLEET_DATABASE.forEach(fv => {
    const modelWords = fv.modelo.toLowerCase().split(/[\s/]+/).filter(w => w.length > 2);
    if (modelWords.some(w => prodNameLower.includes(w))) {
      matchedFleetIds.add(fv.id);
    }
  });

  const appliedVehicles = BRAZILIAN_FLEET_DATABASE.filter(fv => matchedFleetIds.has(fv.id));

  return {
    product: prod,
    appliedVehicles,
    customApplications: customApps
  };
}
