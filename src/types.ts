export type VehicleCategory = 'auto' | 'moto' | 'caminhao' | 'agricola' | 'pesada' | 'caminhoes';

/**
 * Registro de Veículo / Frota
 * Mapeamento exato de dados para o sistema de gestão de frota/veículos:
 * - montadora: VARCHAR(100) obrigatório
 * - modelo: VARCHAR(100) obrigatório
 * - veiculo: VARCHAR(20) obrigatório (identificador único: Placa ou Chassi)
 * - ano: INTEGER (1950 até anoAtual + 1)
 * - motor: VARCHAR(50)
 */
export interface VehicleFleetItem {
  id: string;        // Identificador único do registro (UUID ou slug)
  montadora: string; // Fabricante (ex: Fiat, Volkswagen, Toyota)
  modelo: string;    // Nome comercial (ex: Uno, Gol, Corolla)
  veiculo: string;   // Placa ou Chassi (Identificador Único)
  ano: number;       // Ano de fabricação/modelo (ex: 2023, Range 1900-2026)
  motor: string;     // Especificação do motor (ex: 1.0 Flex, 2.0 Turbo Diesel)
  // Atributos adicionais para cotação e balcão
  categoria?: VehicleCategory;
  chassi?: string;
  placa?: string;
  kmAtual?: number;
  proprietario?: string;
  criadoEm?: string;
}

export interface VehicleApiResponse {
  success: boolean;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  data: VehicleFleetItem[];
  availableBrands?: string[];
  error?: string;
}

export type CustomerType = 'consumidor' | 'cliente_fiel' | 'mecanica' | 'frotista';

export interface CustomerDiscountPolicy {
  type: CustomerType;
  label: string;
  defaultDiscountPercent: number;
  description: string;
}

export type SalesChannel = 'balcao' | 'ecommerce' | 'landingpage' | 'mercadolivre' | 'shopee' | 'amazon';

export interface ProductExternalStock {
  meliFull: number;       // Mercado Livre Fulfillment (Estoque Externo Full)
  amazonFba: number;      // Amazon FBA (Estoque Externo)
  shopeeExternal: number; // Shopee Xpress / CD Parceiro
  supplierDrop?: number;  // Fornecedor / Estoque Remoto Homologado
  total: number;          // Total somado em estoques externos
}

export interface VehicleApplication {
  id: string;
  brand: string;         // ex: Volkswagen, Scania, Honda, John Deere
  vehicle: string;       // ex: Gol G5, R450, CG 160 Titan, Trator 6100J
  yearRange: string;     // ex: 2012-2018
  engine: string;        // ex: 1.6 8V EA111, 13 Litros Euro 6, 160cc OHC
  transmission: string;  // ex: Manual 5M, Automatizado I-Shift, CVT
  traction: '4x2' | '4x4' | '6x2' | '6x4' | '8x4' | 'Trilhos/Esteira' | '4x2 / 4x4' | '4x2 / AWD' | '4x2 / 4x4 AWD' | string;
  airConditioning: boolean; // Com ar ou sem ar
}

export interface CompanyProfile {
  id: string;
  tenantId?: string;         // ID do Tenant no Supabase (Isolamento Multi-Tenant)
  tradeName: string;         // Nome Fantasia da Empresa Vendedora (Destaque Principal)
  corporateName: string;     // Razão Social Oficial
  cnpj: string;              // CNPJ formatado da Matriz
  stateRegistration?: string;// Inscrição Estadual (IE)
  legalNature?: 'MEI' | 'EI' | 'SLU' | 'LTDA' | 'SA_FECHADA' | 'SA_ABERTA' | 'SS'; // Tipo Jurídico da Empresa
  companySize?: 'MEI' | 'ME' | 'EPP' | 'MEDIO' | 'GRANDE'; // Porte da Empresa
  taxRegime?: 'simei' | 'simples_nacional' | 'lucro_presumido' | 'lucro_real'; // Regime Tributário
  cnae?: string;             // Classificação Nacional de Atividades Econômicas
  segment: string;           // Ramo: Autopeças Leves, Motopeças, Linha Pesada / Diesel, Agrícola, Centro Automotivo & Misto
  phone: string;             // Telefone / WhatsApp comercial
  email: string;             // E-mail corporativo principal
  city: string;              // Cidade sede
  uf: string;                // UF sede (ex: MS, SP, SC, PR, MT)
  address?: string;          // Logradouro / Bairro
  logoUrl?: string;          // Logotipo da Empresa
  isTrial: boolean;          // Indica se está no período de teste grátis
  trialDaysRemaining: number;// Dias restantes do teste grátis (ex: 14)
  planName: string;          // Nome do plano no Sistema GATO (ex: "GATO SaaS - Teste Grátis 14 Dias", "GATO SaaS Pro")
  createdAt: string;         // Data de cadastro
}

export interface BranchUnit {
  id: string;
  name: string;
  cdCode: string;
  cdName: string;
  uf: string;
  city: string;
  cnpj: string;
  ie: string;
  address: string;
  sefazCode: string;
  ibgeCode?: string;
  isMatriz: boolean;
  icmsInterno: number;
  status: 'ativa' | 'expansao_planejada';
  description?: string;
}

export type UserRole = 'vendedor' | 'gerente' | 'caixa' | 'administrador' | 'admin';

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  roleLabel: string;
  /** Papel RBAC real (super_admin, tenant_admin, ...) — fonte de verdade do servidor. */
  roleCode?: string;
  /** true quando o usuário é da equipe SaaS (escopo plataforma). */
  isSaasScope?: boolean;
  /** Matriz de permissões por recurso (nível de acesso) resolvida no servidor. */
  permissions?: Record<string, string>;
  /**
   * Capacidades operacionais finas atribuídas ao usuário pelo admin do tenant
   * (construtor flexível): vendas, caixa, estoque, gerência, etc.
   *
   * `undefined` = nunca configurado (mantém o acesso padrão do papel);
   * `[]` = configurado deliberadamente sem nenhuma capacidade.
   */
  tenantPermissions?: string[];
  branchId: string;
  branchUf: string;
  branchName: string;
  cdName: string;
  cdCode: string;
  avatarInitials: string;
  avatarUrl?: string;
  loginTime: string;
  /** Exige troca de senha no primeiro acesso */
  mustChangePassword?: boolean;
}

export interface StateTaxConfig {
  uf: string;             // ex: MS, SP, SC, PR, MT, etc.
  name?: string;          // ex: Mato Grosso do Sul, São Paulo, Santa Catarina
  icmsAliquota: number;   // Alíquota interna do estado de destino
  icmsStMva: number;      // Margem de Valor Agregado MVA para autopeças
  difalAliquota: number;  // Difal em relação à origem MS (MS->MS é 0%, MS->SP é 6%, MS->SC é 5%)
  fcpAliquota: number;    // Fundo de Combate à Pobreza
  internalTaxDescription?: string;
}

export interface Product {
  id: string;
  code: string;           // Código do fabricante ou interno
  oemCode: string;        // Código Original Montadora
  similarCodes: string[]; // Códigos similares de outras marcas (ex: Bosch, Mahle, Cofap)
  barcode: string;
  name: string;
  brand: string;          // ex: Cofap, Fras-le, Bosch, Nakata, Donaldson
  category: VehicleCategory;
  supplier: string;
  supplierCnpj?: string;
  location: {
    corridor: string;     // ex: Corredor A
    shelf: string;        // ex: Prateleira 03
    box: string;          // ex: Gaveta 14
  };
  stock: number;
  stockCentral?: number;   // Saldo Físico no CD Central / Loja Matriz
  /**
   * `false` = produto inativado (não é mais comercializado). Sai do catálogo e
   * do balcão, mas continua no histórico de vendas, notas e orçamentos.
   * Ausente conta como ativo — é o que os seeds e o cadastro novo produzem.
   */
  active?: boolean;
  stockExternal?: ProductExternalStock; // Saldos em Estoques Externos (Meli Full, Amazon FBA, etc.)
  minStock: number;
  unitCost: number;       // Custo de compra da NF
  transportCost: number;  // Custo de frete/transporte por unidade
  markupPercent: number;  // Margem de lucro pretendida (ex: 45%)
  sellingPrice: number;   // Preço base calculado
  ncm: string;
  cst: string;
  cfop: string;
  taxBaseIcms: number;    // Base de cálculo ICMS
  taxIpiPercent?: number; // Alíquota IPI configurada (ex: 5%)
  taxPisPercent?: number; // Alíquota PIS (ex: 1.65%)
  taxCofinsPercent?: number; // Alíquota COFINS (ex: 7.6%)
  imageUrl?: string;
  images?: string[]; // Até 3 fotos / anexos de imagem
  attachments?: ProductAttachment[]; // Metadados dos até 3 anexos
  applications: VehicleApplication[];
  notes?: string;
  updatedAt: string;
}

export interface ProductAttachment {
  id: string;
  name: string;
  url: string;
  type?: string;
  size?: number;
  tag?: 'principal' | 'etiqueta' | 'detalhe' | 'aplicacao';
}

export interface MarketplaceSetting {
  channel: SalesChannel;
  name: string;
  enabled: boolean;
  commissionPercent: number; // ex: 16% Mercado Livre, 14% Shopee, 15% Amazon
  fixedFee: number;          // ex: R$ 5.50
  freeShippingCost: number;  // ex: R$ 22.00 se valor > 79
  priceMultiplier: number;   // markup específico do canal (ex: 1.15)
  autoSyncStock: boolean;
  autoSyncPrice: boolean;
  webhookUrl: string;
  apiKeyMasked: string;
  lastSyncAt: string;
}

export type EcommercePlatform = 'landingpage_gato' | 'woocommerce' | 'shopify' | 'nuvemshop' | 'tray' | 'loja_integrada' | 'custom_api';

export interface EcommerceConnectorConfig {
  id: string;
  name: string;
  platform: EcommercePlatform;
  storeUrl: string;
  publicKey: string;
  secretKeyMasked: string;
  webhookEndpoint: string;
  enabled: boolean;
  autoDeductCentralStock: boolean;
  autoSyncCatalog: boolean;
  ordersReceivedCount: number;
  lastOrderAt?: string;
  lastPingAt: string;
  status: 'connected' | 'pending' | 'offline';
}

export type BankGatewayType = 'banco_do_brasil' | 'itau' | 'bradesco' | 'inter' | 'cora' | 'mercadopago' | 'asaas' | 'efi_bank';

export interface BankGatewayConfig {
  id: string;
  gateway: BankGatewayType;
  name: string;
  enabled: boolean;
  pixKey: string;
  pixKeyType: 'cnpj' | 'cpf' | 'email' | 'telefone' | 'aleatoria';
  clientId: string;
  clientSecretMasked: string;
  webhookUrl: string;
  autoReconcile: boolean; // Baixa automática da venda na confirmação do webhook bancário
  feePercent: number;     // Taxa percentual por transação (ex: 0.99%)
  feeFixed: number;       // Taxa fixa em R$ (ex: R$ 0.00 para Pix, R$ 2.10 para boleto)
  status: 'active' | 'testing' | 'inactive';
  lastWebhookAt?: string;
  totalSettledAmount?: number;
}

export interface MultiChannelStockItem {
  productId: string;
  code: string;
  name: string;
  brand: string;
  category: VehicleCategory;
  sellingPrice: number;
  stockCentral: number;       // CD Central / Loja Matriz
  stockMeliFull: number;      // Estoque Externo Mercado Livre Full
  stockAmazonFba: number;     // Estoque Externo Amazon FBA
  stockShopeeExt: number;     // Estoque Externo Shopee Xpress / Parceiro
  stockSupplierDrop: number;  // Estoque Remoto Fornecedor
  stockTotal: number;         // Total Consolidado
  minStock: number;
  lastSyncTimestamp: string;
}

export interface StockTransferOrder {
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  fromLocation: 'central';
  toLocation: 'meli_full' | 'amazon_fba' | 'shopee_external' | 'supplier_drop';
  quantity: number;
  reason: string;
  trackingDocument: string;
  status: 'concluida' | 'em_transito' | 'pendente';
  createdAt: string;
}

export interface ConnectorWebhookEvent {
  id: string;
  source: 'ecommerce' | 'mercadolivre' | 'shopee' | 'amazon' | 'bank_gateway';
  eventType: string;
  summary: string;
  rawPayloadSummary: string;
  status: 'processed' | 'failed' | 'pending';
  stockDeductedFrom?: 'central' | 'meli_full' | 'amazon_fba' | 'shopee_external' | 'none';
  quantityDeducted?: number;
  timestamp: string;
}

export interface XmlItemParsed {
  cProd: string;
  cEAN: string;
  xProd: string;
  NCM: string;
  CFOP: string;
  uCom: string;
  qCom: number;
  vUnCom: number;
  vProd: number;
  vICMS?: number;
  vIPI?: number;
  vPIS?: number;
  vCOFINS?: number;
  vST?: number;
  isRegistered: boolean;
  existingProductId?: string;
}

export interface XmlInvoiceHeader {
  nNF: string;
  serie: string;
  dhEmi: string;
  chaveAcesso: string;
  emitenteNome: string;
  emitenteCNPJ: string;
  emitenteIE: string;
  emitenteUF: string;
  destinatarioNome: string;
  destinatarioCNPJ: string;
  vTotalProd: number;
  vNF: number;
}

export interface QuoteItem {
  productId: string;
  productName: string;
  productCode: string;
  brand: string;
  quantity: number;
  costPrice: number;
  basePrice: number;
  discountPercent: number;
  finalUnitPrice: number;
  total: number;
  locationStr: string;
}

export interface Supplier {
  id: string;
  name: string; // Razão Social
  fantasyName?: string; // Nome Fantasia
  cnpj: string;
  ie?: string; // Inscrição Estadual
  contact?: string; // Vendedor / Representante
  phone: string;
  whatsapp?: string;
  email?: string;
  cep?: string;
  address?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  category?: 'distribuidora' | 'fabricante' | 'importadora' | 'motos' | 'diesel' | 'quimicos' | 'outros';
  paymentTerms?: string; // ex: "28/42/56 dias", "30 dias", "À vista"
  leadTimeDays?: number; // ex: 2 dias
  minOrderValue?: number; // R$ pedido mínimo
  freightType?: 'CIF' | 'FOB';
  rating?: number; // 1 a 5
  status?: 'ativo' | 'inativo' | 'bloqueado';
  brandsSupplied?: string[];
  notes?: string;
  totalPurchases?: number;
  lastPurchaseDate?: string;
  createdAt?: string;
}

export interface CustomerVehicle {
  id: string;
  plate: string;
  model: string;
  brand?: string;
  year?: string;
  engine?: string;
  renavam?: string;
  notes?: string;
}

export interface Customer {
  id: string;
  name: string;
  fantasyName?: string;
  type: CustomerType;
  document: string; // CPF or CNPJ
  ie?: string; // Inscrição Estadual
  rg?: string;
  phone: string;
  whatsapp?: string;
  email: string;
  cep?: string;
  address?: string;
  number?: string;
  neighborhood?: string;
  complement?: string;
  city: string;
  uf: string;
  discountRate: number; // ex: 0% Consumidor, 8% Fiel, 15% Mecanica, 22% Frotista
  creditLimit?: number;
  creditUsed?: number;
  paymentTerm?: string;
  contactPerson?: string;
  notes?: string;
  status?: 'ativo' | 'inativo' | 'bloqueado';
  vehicles?: CustomerVehicle[];
  createdAt?: string;
}

/**
 * `Cancelado` é o "excluir" do orçamento: ele sai da lista do dia a dia, mas a
 * linha continua no banco — proposta cancelada ainda é histórico do cliente.
 */
export type QuoteStatus = 'Pendente' | 'Aprovado' | 'Recusado' | 'Convertido' | 'Cancelado';

export interface Quote {
  id: string;
  quoteNumber: string;
  customerId: string;
  customerName: string;
  customerDocument: string;
  customerType: CustomerType;
  customerUf: string;
  customerCity?: string;
  customerPhone?: string;
  customerWhatsapp?: string;
  customerEmail?: string;
  vehicleModel?: string;
  vehiclePlate?: string;
  sellerName?: string;
  sellerCommissionPercent?: number; // ex: 2.5%
  sellerCommissionAmount?: number;  // R$ calculado
  workshopName?: string;            // Oficina parceira / indicador
  workshopCommissionPercent?: number; // % comissão oficina
  workshopCommissionAmount?: number;  // R$ calculado oficina
  paymentCondition?: string;
  items: QuoteItem[];
  subtotalAmount: number;
  discountAmount: number;
  totalAmount: number;
  taxAmount: number;
  status: QuoteStatus;
  validUntil: string;
  createdAt: string;
  convertedOrderId?: string;
  convertedNfeNumber?: string;
  notes?: string;
  whatsappSentAt?: string;
  marketingOptIn?: boolean;
}

export type MarketingLeadStatus = 'novo_lead' | 'cotado' | 'em_negociacao' | 'convertido' | 'oportunidade_remarketing';

export interface MarketingLead {
  id: string;
  customerId?: string;
  name: string;
  whatsapp: string;
  phone?: string;
  email?: string;
  document?: string;
  city?: string;
  uf?: string;
  vehicleModel?: string;
  vehiclePlate?: string;
  lastQuoteId: string;
  lastQuoteNumber: string;
  lastQuoteAmount: number;
  lastQuotedAt: string;
  quotedCategories: string[];
  quotedItemsSummary?: string;
  status: MarketingLeadStatus;
  optInMarketing: boolean;
  tags: string[];
  notes?: string;
  lastContactedAt?: string;
  whatsappSentCount?: number;
}

export type OrderStatus = 'Pendente' | 'Pago' | 'Em Separação' | 'Enviado' | 'Entregue' | 'Cancelado';

export interface Order {
  id: string;
  orderNumber: string;
  channel: SalesChannel;
  customerName: string;
  customerDocument: string;
  customerType: CustomerType;
  shippingCity?: string;
  branchId?: string;
  total?: number;
  items: Array<{
    code: string;
    name: string;
    productCode?: string;
    productName?: string;
    quantity: number;
    unitPrice: number;
    finalUnitPrice?: number;
    costPrice: number;
    total: number;
    locationStr?: string;
  }>;
  totalAmount: number;
  costAmount: number;
  profitAmount: number;
  marginPercent: number;
  channelFee: number;
  carrier: 'Melhor Envio' | 'Correios SEDEX' | 'Jadlog' | 'Loggi' | 'Retirada Balcão';
  trackingCode?: string;
  trackingStatus: 'Postado' | 'Em Trânsito' | 'Saiu para Entrega' | 'Entregue' | 'Pronto para Retirada';
  status: OrderStatus;
  paymentMethod?: string;
  createdAt: string;
  nfeNumber?: string;
  nfeKey?: string;
  nfeIssued: boolean;
}

export interface InvoiceRecord {
  id: string;
  type: 'compra' | 'venda';
  number: string;
  series: string;
  accessKey: string;
  issuedAt: string;
  partyName: string; // Fornecedor ou Cliente
  partyDocument: string;
  partyAddress?: string;
  totalProducts: number;
  totalTaxes: number;
  taxesTotal?: number;
  totalAmount: number;
  itemsCount: number;
  sefazStatus: 'Autorizada' | 'Cancelada' | 'Em Processamento';
  danfeProtocol: string;
  xmlData?: string;
  channel?: SalesChannel;
  vehicleInfo?: {
    plate?: string;
    model?: string;
    year?: string;
    engine?: string;
    km?: string;
    chassis?: string;
  };
  itemsList?: Array<{
    code: string;
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  quoteNumber?: string;
  paymentMethod?: string;
}

export interface PushNotification {
  id: string;
  title: string;
  message: string;
  type: 'warning' | 'success' | 'info' | 'critical';
  timestamp: string;
  read: boolean;
  linkAction?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: string;
  isAiGenerated?: boolean;
}

export type VehicleFleetSegment = 
  | 'Passeio' 
  | 'SUV' 
  | 'Pickup / Utilitário' 
  | 'Van / Comercial Leve' 
  | 'Caminhão / Pesado' 
  | 'Moto' 
  | 'Agrícola';

export type VehicleFuelType = 
  | 'Flex' 
  | 'Gasolina' 
  | 'Diesel' 
  | 'Híbrido' 
  | 'Elétrico' 
  | 'Etanol' 
  | 'Álcool'
  | 'GNV';

export type PartSystemCategory = 
  | 'Freio' 
  | 'Suspensão' 
  | 'Filtros' 
  | 'Motor' 
  | 'Ignição' 
  | 'Transmissão' 
  | 'Arrefecimento' 
  | 'Elétrica';

export interface FleetVehicleModel {
  id: string;
  montadora: string;
  modelo: string;
  segmento: VehicleFleetSegment;
  geracaoFase: string;
  anoInicio: number; // 1995 a 2027
  anoFim: number;   // 1995 a 2027
  motores: string[];
  combustiveis: VehicleFuelType[];
  sistemasCompativeis: PartSystemCategory[];
  pecasChave?: string[];
  fipeReferencia?: string;
  descricaoMercado?: string;
}

export interface PartApplicationMatch {
  product: Product;
  matchScore: number;
  vehicleApp?: VehicleApplication;
  technicalNotes: string;
  compatibilityType: 'Exata' | 'Multi-aplicação' | 'Universal / Adaptável';
  matchedSystems: PartSystemCategory[];
}

// ==========================================
// ORDEM DE SERVIÇO (OS) - GESTÃO DE OFICINA & CENTRO AUTOMOTIVO
// ==========================================
export type ServiceOrderStatus = 
  | 'Orcamento' 
  | 'Aprovada' 
  | 'Em Execucao' 
  | 'Aguardando Pecas' 
  | 'Finalizada' 
  | 'Faturada' 
  | 'Cancelada';

export interface ServiceOrderItem {
  productId: string;
  productCode: string;
  productName: string;
  brand: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  total: number;
}

export interface ServiceLaborItem {
  id: string;
  description: string;
  mechanicName?: string;
  hours?: number;
  price: number;
}

export interface VehicleChecklist {
  fuelLevel: 'Reserva' | '1/4' | '1/2' | '3/4' | 'Cheio';
  spareTire: boolean;
  jack: boolean;
  wheelWrench: boolean;
  scratchesNotes?: string;
  observations?: string;
}

export interface ServiceOrder {
  id: string; // ex: OS-2026-001
  dateOpened: string;
  dateEstimated?: string;
  dateFinished?: string;
  status: ServiceOrderStatus;
  customerId: string;
  customerName: string;
  customerDocument: string;
  customerPhone: string;
  customerEmail?: string;
  vehiclePlate: string;
  vehicleBrand: string;
  vehicleModel: string;
  vehicleYear: number;
  vehicleColor?: string;
  vehicleKm: number;
  vehicleMotor?: string;
  mechanicAssigned: string;
  mechanicCommissionPercent?: number; // % comissão sobre mão de obra (ex: 40%)
  mechanicCommissionAmount?: number;  // R$ calculado
  sellerAssigned?: string;            // Vendedor balcão / consultor
  sellerCommissionPercent?: number;   // % comissão vendedor sobre peças da OS (ex: 2.5%)
  sellerCommissionAmount?: number;    // R$ calculado
  workshopName?: string;              // Oficina parceira / terceirizada
  workshopPartsCommissionPercent?: number; // % comissão oficina parceira sobre peças aplicadas
  workshopPartsCommissionAmount?: number;  // R$ calculado
  problemReported: string; // Defeito relatado pelo cliente
  technicalDiagnosis?: string; // Diagnóstico do mecânico
  parts: ServiceOrderItem[];
  labor: ServiceLaborItem[];
  partsTotal: number;
  laborTotal: number;
  discount: number;
  totalAmount: number;
  paymentMethod?: string;
  checklist?: VehicleChecklist;
  warrantyDays?: number; // Padrão: 90 dias
  branchId: string;
  convertedInvoiceId?: string;
  notes?: string;
}

// ==========================================
// TERMO / CERTIFICADO DE GARANTIA DE PEÇAS (ESTOQUE & NORMAS BRASILEIRAS - CDC ART. 26/50)
// ==========================================
export type WarrantyLegalBasis = 'cdc_90_dias' | 'fabricante_12_meses' | 'fabricante_6_meses' | 'contratual_estendida';

export interface PartWarrantyCertificate {
  id: string;
  protocolNumber: string; // ex: GAR-2026-0042
  productId: string;
  productCode: string;
  productName: string;
  productBrand: string;
  ncm?: string;
  batchNumber?: string; // Lote de fabricação / número de série rastreável
  imageUrl?: string; // Imagem cadastrada ou foto real da peça
  evidenceImages?: string[]; // Fotos adicionais / etiqueta / estado físico
  invoiceNumber?: string; // NF-e de venda ou compra
  orderId?: string; // Pedido ou OS associada
  customerId?: string;
  customerName: string;
  customerDocument: string;
  customerPhone?: string;
  vehiclePlate?: string;
  vehicleModel?: string;
  vehicleKmAtInstall?: number;
  installerWorkshop?: string; // Oficina instaladora responsável
  issueDate: string; // Data de emissão (ex: 2026-10-16)
  legalWarrantyDays: number; // 90 dias obrigatórios (CDC Art. 26, II)
  contractualWarrantyDays: number; // Garantia contratual adicional (CDC Art. 50, ex: 275 dias = total 365 dias)
  totalWarrantyDays: number; // Prazo total de vigência
  expirationDate: string; // Data limite de cobertura
  status: 'ativa' | 'expirada' | 'acionada' | 'laudo_aprovado' | 'laudo_recusado';
  termsAccepted: boolean;
  notes?: string;
  technicalObservations?: string;
  branchId: string;
  issuedByUserName: string;
  createdAt: string;
}

// ==========================================
// GESTÃO FINANCEIRA (CONTAS A PAGAR / RECEBER)
// ==========================================
export type FinancialStatus = 'pendente' | 'pago' | 'atrasado' | 'cancelado';

export interface FinancialPayable {
  id: string;
  description: string;
  category: 'fornecedor_pecas' | 'aluguel' | 'energia_agua' | 'folha_pagamento' | 'impostos' | 'frete_logistica' | 'outros';
  supplierName: string;
  supplierCnpj?: string;
  documentNumber?: string;
  issueDate: string;
  dueDate: string;
  paidDate?: string;
  amount: number;
  paidAmount?: number;
  status: FinancialStatus;
  paymentMethod: 'boleto' | 'pix' | 'transferencia' | 'cartao_credito' | 'dinheiro';
  barcode?: string;
  branchId: string;
  notes?: string;
}

export interface FinancialReceivable {
  id: string;
  description: string;
  customerName: string;
  customerDocument?: string;
  customerPhone?: string;
  originType: 'balcao' | 'ordem_servico' | 'marketplace' | 'crediario';
  originId?: string; // ex: ped-101 ou os-2026-001
  installment: string; // ex: "1/3", "2/3"
  issueDate: string;
  dueDate: string;
  receivedDate?: string;
  amount: number;
  receivedAmount?: number;
  status: FinancialStatus;
  paymentMethod: 'pix' | 'cartao_credito' | 'cartao_debito' | 'boleto' | 'dinheiro' | 'crediario';
  branchId: string;
  notes?: string;
}

export interface BankTransaction {
  id: string;
  date: string;
  description: string;
  amount: number; // positivo = crédito, negativo = débito
  type: 'CREDIT' | 'DEBIT';
  category?: string;
  reconciled: boolean;
  matchedId?: string; // id do contas a pagar ou receber vinculado
}

// ==========================================
// INVENTÁRIO FÍSICO DE ESTOQUE
// ==========================================
export interface PhysicalInventoryItem {
  productId: string;
  code: string;
  oemCode: string;
  barcode: string;
  name: string;
  brand: string;
  location: string;
  systemStock: number;
  countedStock: number;
  diff: number; // countedStock - systemStock
  costPrice: number;
  status: 'conferido' | 'divergente' | 'pendente';
  lastCountedAt?: string;
}

// ==========================================
// MDF-e E NFC-e FISCAL
// ==========================================
export interface MdfeRecord {
  id: string;
  manifestNumber: string;
  series: string;
  issueDate: string;
  status: 'autorizado' | 'encerrado' | 'cancelado';
  driverName: string;
  driverCpf: string;
  vehiclePlate: string;
  vehicleUf: string;
  vehicleRntrc?: string;
  originUf: string;
  destinationUf: string;
  originCity: string;
  destinationCity: string;
  invoicesKeys: string[];
  totalWeightKg: number;
  totalCargoValue: number;
  qrCodeUrl: string;
  protocolAuth: string;
}

// ==========================================
// CONFIGURAÇÃO TRIBUTÁRIA E FISCAL (ADMIN)
// ==========================================
export interface FederalTaxSettings {
  regime: 'simei' | 'simples_nacional' | 'lucro_presumido' | 'lucro_real';
  legalNature?: 'MEI' | 'EI' | 'SLU' | 'LTDA' | 'SA_FECHADA' | 'SA_ABERTA' | 'SS';
  companySize?: 'MEI' | 'ME' | 'EPP' | 'MEDIO' | 'GRANDE';
  pisCofinsMonofasico: boolean;
  pisAliquotaRevenda: number; // Ex: 0.00% (monofásico revenda)
  cofinsAliquotaRevenda: number; // Ex: 0.00%
  pisAliquotaImportacao: number; // Ex: 2.30% (Lei 10.485/2002)
  cofinsAliquotaImportacao: number; // Ex: 10.80%
  cstPisCofinsSaidaDefault: string; // Ex: "04" (Monofásico - Alíquota Zero na Revenda)
  cstPisCofinsEntradaDefault: string; // Ex: "50" ou "70"
  ipiAliquotaDefault: number; // Ex: 5.0% para peças de freio/suspensão
  iiAliquotaMedia: number; // Ex: 14.0% Tarifa Externa Comum TEC
  taxaSiscomexPorDi: number; // Ex: R$ 185,00
  taxaSiscomexPorAdicao: number; // Ex: R$ 29,50
  afrmmPercent: number; // Ex: 8.0% Marinha Mercante sobre frete marítimo
}

export interface StateTaxRule {
  uf: string;
  ufName: string;
  region: 'Centro-Oeste' | 'Sudeste' | 'Sul' | 'Nordeste' | 'Norte';
  icmsInterno: number; // Alíquota interna de ICMS (ex: MS = 17%, SP = 18%, RJ = 22%)
  fcpPercent: number; // Fundo de Combate à Pobreza (ex: 0% a 2%)
  mvaOriginal: number; // MVA Padrão para Autopeças (ex: 71.78% ou 40%)
  mvaAjustada4: number; // MVA Ajustada quando origem é 4% (Importado)
  mvaAjustada7: number; // MVA Ajustada quando origem é 7%
  mvaAjustada12: number; // MVA Ajustada quando origem é 12%
  temProtocoloComMs: boolean; // Protocolo ICMS com MS/UF Emissora
  difalSemInscricao: boolean; // DIFAL exigido para vendas B2C
  icmsImportacaoDesembaraco: number; // Alíquota com benefício no desembaraço estadual
  regimeIncentivoImportacao: string; // Nome do Programa Estadual (ex: TTD 409 SC, PRODEIC MS, FUNDAP ES)
  beneficioImportacaoDesc: string; // Descrição detalhada do incentivo de importação do estado
}

export interface TaxSimulationRequest {
  ncm: string;
  ufOrigem: string;
  ufDestino: string;
  tipoOperacao: 'revenda_balcao' | 'distribuicao_b2b' | 'importacao_direta' | 'venda_consumidor_final';
  regimeEmpresa: 'simples_nacional' | 'lucro_presumido' | 'lucro_real';
  valorCustoFob: number;
  freteSeguro: number;
  precoVenda: number;
  quantidade: number;
}

export interface TaxSimulationResult {
  ncm: string;
  ufOrigem: string;
  ufDestino: string;
  valorBase: number;
  iiValor: number;
  ipiValor: number;
  pisValor: number;
  cofinsValor: number;
  icmsProprioValor: number;
  icmsStValor: number;
  difalValor: number;
  fcpValor: number;
  afrmmValor: number;
  taxaSiscomexTotal: number;
  custoTotalNacionalizado: number;
  impostosTotaisVenda: number;
  margemLiquidaR: number;
  margemLiquidaPercent: number;
  observacoesFiscais: string[];
}


