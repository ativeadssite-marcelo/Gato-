// =========================================================================
// MODELO DE DADOS DE CAIXA — GATO SaaS
// =========================================================================
// Caixa (PDV): abertura, fechamento, recebimentos, emissão de boleto,
// nota fiscal/cupom, dados fiscais de boletos em aberto.
// Multi-tenant: todos os registros carregam tenant_id.
// =========================================================================

export type CashRegisterStatus = 'closed' | 'open' | 'closing';

export type CashMovementType = 
  | 'opening'           // abertura de caixa (valor inicial)
  | 'sale_cash'         // venda em dinheiro
  | 'sale_card'         // venda cartão débito/crédito
  | 'sale_pix'          // venda PIX
  | 'sale_boleto'       // venda boleto (à vista)
  | 'sale_vale'         // venda paga com vale/voucher (alimentação, refeição, presente)
  | 'refund_cash'       // devolução dinheiro
  | 'refund_card'       // devolução cartão
  | 'withdrawal'        // sangria/retirada
  | 'deposit'           // suprimento
  | 'closing'           // fechamento de caixa (valor final)
  | 'adjustment';       // ajuste manual

export type PaymentMethodCaixa = 
  | 'dinheiro' 
  | 'cartao_credito' 
  | 'cartao_debito' 
  | 'pix' 
  | 'boleto' 
  | 'cheque' 
  | 'vale_alimentacao'
  | 'vale_refeicao'
  | 'voucher'
  | 'outros';

export interface CashRegister {
  id: string;
  tenantId: string;
  userId: string;              // usuário que abriu o caixa
  userName: string;
  status: CashRegisterStatus;
  openingAmount: number;       // valor inicial (fundo de caixa)
  expectedAmount: number;      // valor esperado no fechamento (calculado)
  actualAmount: number;        // valor real contado no fechamento
  difference: number;          // diferença (actual - expected)
  openedAt: string;            // ISO timestamp
  closedAt: string | null;     // ISO timestamp
  closedByUserId: string | null;
  closedByUserName: string | null;
  notes: string | null;        // observações do fechamento
  createdAt: string;
  updatedAt: string;
}

export interface CashMovement {
  id: string;
  tenantId: string;
  cashRegisterId: string;
  type: CashMovementType;
  paymentMethod: PaymentMethodCaixa;
  amount: number;
  description: string;
  referenceId: string | null;     // ID da venda, orçamento, boleto, etc.
  referenceType: 'sale' | 'budget' | 'boleto' | 'refund' | 'withdrawal' | 'deposit' | 'adjustment' | null;
  customerId: string | null;
  customerName: string | null;
  userId: string;
  userName: string;
  createdAt: string;
}

export interface Receipt {
  id: string;
  tenantId: string;
  cashRegisterId: string | null;
  movementId: string | null;
  number: string;               // número sequencial do recibo
  type: 'receipt' | 'invoice' | 'credit_note';
  status: 'issued' | 'cancelled';
  customerId: string | null;
  customerName: string | null;
  customerDocument: string | null;
  items: ReceiptItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: PaymentMethodCaixa;
  paymentDetails: PaymentDetails | null;
  fiscalData: FiscalData | null;     // dados para NF-e/NFC-e
  issuedAt: string;
  cancelledAt: string | null;
  cancelledBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReceiptItem {
  id: string;
  productId: string | null;
  sku: string | null;
  name: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
  ncm: string | null;           // NCM do produto
  cest: string | null;          // CEST do produto
  cfop: string | null;          // CFOP da operação
  taxIcms: number;              // % ICMS
  taxIpi: number;               // % IPI
  taxPis: number;               // % PIS
  taxCofins: number;            // % COFINS
}

export interface PaymentDetails {
  cardBrand?: string;           // visa, mastercard, elo, etc.
  cardLast4?: string;
  cardAuthCode?: string;
  pixTxId?: string;
  pixQrCode?: string;
  boletoNumber?: string;
  boletoDueDate?: string;
  boletoBarcode?: string;
  checkNumber?: string;
  checkBank?: string;
}

export interface FiscalData {
  model: '55' | '65';           // 55=NF-e, 65=NFC-e
  series: string;
  number: string;
  accessKey: string | null;     // chave de acesso (44 dígitos)
  protocol: string | null;      // protocolo de autorização
  status: 'pending' | 'authorized' | 'denied' | 'cancelled';
  xmlPath: string | null;
  pdfPath: string | null;
  qrCodeUrl: string | null;
  issuedAt: string | null;
  authorizedAt: string | null;
  environment: 'production' | 'homologation';
}

export interface BoletoIssuance {
  id: string;
  tenantId: string;
  cashRegisterId: string | null;
  customerId: string;
  customerName: string;
  customerDocument: string;
  customerEmail: string | null;
  customerPhone: string | null;
  amount: number;
  dueDate: string;              // YYYY-MM-DD
  description: string;
  ourNumber: string;            // nosso número
  barcode: string;              // código de barras (linha digitável)
  qrCode: string | null;        // PIX QR Code (se suportado)
  status: 'draft' | 'issued' | 'paid' | 'overdue' | 'cancelled';
  gateway: 'asaas' | 'manual';
  gatewayId: string | null;     // ID no gateway
  paymentLink: string | null;
  paidAt: string | null;
  paidAmount: number | null;
  paymentMethod: PaymentMethodCaixa | null;
  issuedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface OpenBoletoData {
  id: string;
  tenantId: string;
  customerId: string;
  customerName: string;
  customerDocument: string;
  amount: number;
  dueDate: string;
  daysOverdue: number;
  status: 'open' | 'overdue';
  ourNumber: string;
  barcode: string;
  paymentLink: string | null;
}

export interface CaixaSummary {
  cashRegister: CashRegister | null;
  todayMovements: CashMovement[];
  totals: {
    opening: number;
    salesCash: number;
    salesCard: number;
    salesPix: number;
    salesBoleto: number;
    salesVale: number;
    refunds: number;
    withdrawals: number;
    deposits: number;
    expected: number;
    actual: number;
    difference: number;
  };
  openBoletos: OpenBoletoData[];
  pendingFiscal: number;        // recibos pendentes de autorização fiscal
}

export interface OpenCaixaInput {
  openingAmount: number;
  notes?: string;
}

export interface CloseCaixaInput {
  actualAmount: number;
  notes?: string;
}

export interface RecordMovementInput {
  type: CashMovementType;
  paymentMethod: PaymentMethodCaixa;
  amount: number;
  description: string;
  referenceId?: string | null;
  referenceType?: CashMovement['referenceType'];
  customerId?: string | null;
  customerName?: string | null;
}

export interface IssueReceiptInput {
  // Opcional: emissor de recibo fora de um turno de caixa é permitido
  // (issueReceipt valida/ignora quando ausente — ver server/caixa.ts).
  cashRegisterId?: string | null;
  type: 'receipt' | 'invoice' | 'credit_note';
  customerId?: string | null;
  customerName?: string | null;
  customerDocument?: string | null;
  items: Omit<ReceiptItem, 'id'>[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: PaymentMethodCaixa;
  paymentDetails?: PaymentDetails | null;
  fiscalData?: Partial<FiscalData> | null;
}

export interface IssueBoletoInput {
  cashRegisterId?: string | null;
  customerId: string;
  customerName: string;
  customerDocument: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  amount: number;
  dueDate: string;              // YYYY-MM-DD
  description: string;
  gateway?: 'asaas' | 'manual';
}