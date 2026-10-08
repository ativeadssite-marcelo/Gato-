// =========================================================================
// PONTE FRONT ↔ BANCO — entidades do tenant pelas rotas /api/db/*
// =========================================================================
// O app nasceu com os dados de demonstração em `src/data/initialData.ts` e,
// até aqui, só duas telas falavam com o banco (o CRUD de fornecedores e o
// painel de visualização das Configurações). Este módulo é o caminho de volta:
// lê as entidades reais do tenant e traduz os nomes de campo da API
// (`sku`, `salePrice`, `costPrice`, `state`) para os do front (`code`,
// `sellingPrice`, `unitCost`, `uf`).
//
// Três decisões que valem a pena entender antes de mexer:
//
// 1. **O tenant não vai no request.** O servidor deriva o tenant da sessão
//    (`resolveDataScope`) — mandar um header de tenant seria aceitar do cliente
//    um dado que o servidor já sabe, e é justamente o que o isolamento proíbe.
//
// 2. **Campo que não existe no banco não é inventado.** O que a tela precisa e
//    a API não devolve sai com valor neutro (`''`/`0`/`[]`) e um comentário
//    explicando — menos dois casos, que são DERIVADOS de dado real: o markup
//    (aritmética de custo e venda) e a validade do DAV (a mesma convenção de
//    15 dias que o balcão usa ao criar). Assim a tela não mostra ficção.
//
// 3. **Falha de uma entidade não derruba as outras.** `loadTenantEntities`
//    usa `allSettled` e devolve o que veio; quem chama decide o que fazer com
//    cada erro (o App mantém o seed só quando o banco não está configurado).
// =========================================================================

import type { Customer, Product, Quote, QuoteItem, Supplier } from '../types';
import { ApiError, apiJson } from './apiClient';

type ApiRow = Record<string, unknown>;

/** Resposta padrão das rotas de listagem do banco. */
interface ListResponse<T> {
  success: boolean;
  count?: number;
  error?: string;
  products?: T[];
  customers?: T[];
  suppliers?: T[];
  quotes?: T[];
}

/** `true` quando o erro é "o servidor está sem banco configurado" (503). */
export function isDatabaseNotConfiguredError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 503;
}

/**
 * `true` quando o papel do usuário não alcança o recurso (403) ou a sessão caiu
 * (401). Não é falha a reportar: a equipe da plataforma e os papéis sem o
 * recurso simplesmente não têm dado de tenant para mostrar — quem cuida do 401
 * é o `apiClient`, que já dispara o evento de logout.
 */
export function isAccessDeniedError(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 401 || error.status === 403);
}

// -------------------------------------------------------------------------
// Conversões de campo (o driver devolve NUMERIC como string e nulos à vontade)
// -------------------------------------------------------------------------

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function toText(value: unknown): string {
  return value === null || value === undefined ? '' : String(value);
}

function toTextOrUndefined(value: unknown): string | undefined {
  const text = toText(value);
  return text === '' ? undefined : text;
}

// -------------------------------------------------------------------------
// PRODUTO — API (`Product` + `StockLevel` + `Category`) → front (`Product`)
// -------------------------------------------------------------------------

/**
 * `stockCentral` recebe o mesmo saldo de `stock`: hoje o estoque mora num
 * depósito só (a API soma `StockLevel`), e a movimentação do EstoqueManager
 * valida a saída contra o saldo central. Deixar `stockCentral` indefinido
 * faria a tela tratar todo produto vindo do banco como estoque zero no CD.
 */
export function mapProductRow(row: ApiRow): Product {
  const unitCost = toNumber(row.costPrice);
  const sellingPrice = toNumber(row.salePrice);
  const stock = toNumber(row.stock);
  return {
    id: toText(row.id),
    code: toText(row.sku),
    oemCode: '', // não persistido (sem coluna): fica vazio até a API aceitar
    similarCodes: [],
    barcode: toText(row.barcode),
    name: toText(row.name),
    brand: toText(row.brand),
    // `Category.name` é texto livre; o front tipa a categoria como
    // VehicleCategory. Sem correspondência confiável, assume 'auto'.
    category: 'auto',
    supplier: '', // não persistido
    location: { corridor: '', shelf: '', box: '' },
    stock,
    stockCentral: stock,
    active: row.active !== false,
    minStock: toNumber(row.minStock),
    unitCost,
    transportCost: 0,
    // DERIVADO: markup sobre o custo, como a tela calcula. Custo zero → 0.
    markupPercent: unitCost > 0 ? Math.round(((sellingPrice - unitCost) / unitCost) * 1000) / 10 : 0,
    sellingPrice,
    ncm: '', cst: '', cfop: '', taxBaseIcms: 0, // fiscais não persistidos
    applications: [],
    updatedAt: toText(row.updatedAt),
  };
}

// -------------------------------------------------------------------------
// CLIENTE — API (`Customer`) → front (`Customer`)
// -------------------------------------------------------------------------

/**
 * O `type` do front é o SEGMENTO comercial (consumidor/fiel/mecânica/frotista)
 * e não existe no banco; o `personType` de lá é PF/PJ. Por isso o padrão
 * 'consumidor' com desconto zero — quem quiser o segmento marca na tela.
 */
export function mapCustomerRow(row: ApiRow): Customer {
  return {
    id: toText(row.id),
    name: toText(row.name),
    type: 'consumidor',
    document: toText(row.document),
    ie: toTextOrUndefined(row.ie),
    phone: toText(row.phone),
    email: toText(row.email),
    address: toTextOrUndefined(row.address),
    city: toText(row.city),
    uf: toText(row.state),
    discountRate: 0,
    createdAt: toTextOrUndefined(row.createdAt),
  };
}

// -------------------------------------------------------------------------
// FORNECEDOR — API (`Supplier`) → front (`Supplier`)
// -------------------------------------------------------------------------

export function mapSupplierRow(row: ApiRow): Supplier {
  return {
    id: toText(row.id),
    name: toText(row.name),
    cnpj: toText(row.cnpj),
    contact: toTextOrUndefined(row.contact),
    phone: toText(row.phone),
    email: toTextOrUndefined(row.email),
    address: toTextOrUndefined(row.address),
    state: toTextOrUndefined(row.state),
    createdAt: toTextOrUndefined(row.createdAt),
  };
}

// -------------------------------------------------------------------------
// ORÇAMENTO — API (`Budget` + `BudgetItem`) → front (`Quote`)
// -------------------------------------------------------------------------

const QUOTE_STATUS_FROM_API: Record<string, Quote['status']> = {
  PENDING: 'Pendente',
  APPROVED: 'Aprovado',
  REJECTED: 'Recusado',
  CONVERTED: 'Convertido',
};

function mapQuoteStatus(value: unknown): Quote['status'] {
  const raw = toText(value);
  if (QUOTE_STATUS_FROM_API[raw]) return QUOTE_STATUS_FROM_API[raw];
  // A rota de escrita grava o status que o front mandar; se já veio em pt-BR,
  // passa direto. Valor desconhecido cai em 'Pendente' (o default do banco).
  if (raw === 'Pendente' || raw === 'Aprovado' || raw === 'Recusado' || raw === 'Convertido') {
    return raw;
  }
  return 'Pendente';
}

/** Validade do DAV: o balcão cria com 15 dias (`BalcaoCotacao.buildDavQuote`). */
function validUntilFrom(createdAt: string): string {
  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) return '';
  return new Date(created.getTime() + 15 * 86400000).toISOString().slice(0, 10);
}

export function mapQuoteItemRow(row: ApiRow): QuoteItem {
  const quantity = toNumber(row.quantity);
  const unitPrice = toNumber(row.unitPrice);
  return {
    productId: toText(row.productId),
    productName: toText(row.productName),
    productCode: toText(row.productCode),
    brand: toText(row.brand),
    quantity,
    costPrice: 0, // não persistido no item do DAV
    basePrice: unitPrice,
    discountPercent: 0,
    finalUnitPrice: unitPrice,
    total: Math.round(quantity * unitPrice * 100) / 100,
    locationStr: '',
  };
}

export function mapQuoteRow(row: ApiRow): Quote {
  const items = Array.isArray(row.items) ? (row.items as ApiRow[]).map(mapQuoteItemRow) : [];
  const createdAt = toText(row.createdAt);
  return {
    id: toText(row.id),
    quoteNumber: toText(row.number),
    customerId: toText(row.customerId),
    customerName: toText(row.customerName),
    customerDocument: toText(row.customerDocument),
    customerType: 'consumidor', // segmento comercial não vive no banco (ver mapCustomerRow)
    customerUf: toText(row.customerUf),
    customerCity: toTextOrUndefined(row.customerCity),
    customerPhone: toTextOrUndefined(row.customerPhone),
    customerEmail: toTextOrUndefined(row.customerEmail),
    items,
    subtotalAmount: Math.round(items.reduce((acc, item) => acc + item.total, 0) * 100) / 100,
    discountAmount: 0, // não persistido
    totalAmount: toNumber(row.total),
    taxAmount: 0, // não persistido
    status: mapQuoteStatus(row.status),
    validUntil: validUntilFrom(createdAt),
    createdAt,
  };
}

// -------------------------------------------------------------------------
// CARREGADORES
// -------------------------------------------------------------------------

export async function fetchProducts(): Promise<Product[]> {
  const data = await apiJson<ListResponse<ApiRow>>('/api/db/products');
  return (data.products ?? []).map(mapProductRow);
}

export async function fetchCustomers(): Promise<Customer[]> {
  const data = await apiJson<ListResponse<ApiRow>>('/api/db/customers');
  return (data.customers ?? []).map(mapCustomerRow);
}

export async function fetchSuppliers(): Promise<Supplier[]> {
  const data = await apiJson<ListResponse<ApiRow>>('/api/db/suppliers');
  return (data.suppliers ?? []).map(mapSupplierRow);
}

export async function fetchQuotes(): Promise<Quote[]> {
  const data = await apiJson<ListResponse<ApiRow>>('/api/db/quotes');
  return (data.quotes ?? []).map(mapQuoteRow);
}

// -------------------------------------------------------------------------
// ESCRITA — cadastro de produto e de cliente
// -------------------------------------------------------------------------
// O payload é montado aqui (e não na tela) para o teste travar a tradução dos
// nomes: `code`→`sku`, `unitCost`→`costPrice`, `sellingPrice`→`salePrice`,
// `uf`→`state`. Quem chama recebe o id gravado e recarrega a lista.

/** Payload do `POST /api/db/products`. */
export function buildProductPayload(product: Product): Record<string, unknown> {
  const estoqueInicial = Math.max(0, Math.floor(product.stockCentral ?? product.stock ?? 0));
  return {
    sku: product.code,
    name: product.name,
    brand: product.brand || undefined,
    barcode: product.barcode || undefined,
    costPrice: product.unitCost,
    salePrice: product.sellingPrice,
    minStock: product.minStock,
    initialStock: estoqueInicial,
  };
}

/**
 * Payload do `POST /api/db/customers`. O `personType` (PF/PJ) não existe no
 * cadastro do front — é inferido do documento: 14 dígitos é CNPJ, o resto é CPF.
 */
export function buildCustomerPayload(customer: Customer): Record<string, unknown> {
  const digitos = String(customer.document || '').replace(/\D/g, '');
  return {
    name: customer.name,
    document: customer.document,
    phone: customer.phone || undefined,
    email: customer.email || undefined,
    ie: customer.ie || undefined,
    city: customer.city || undefined,
    state: customer.uf || undefined,
    personType: digitos.length > 11 ? 'PJ' : 'PF',
  };
}

/** Resposta das rotas de cadastro: o id gravado. */
interface CreateResponse {
  success: boolean;
  id?: string;
  error?: string;
}

async function postJson<T>(url: string, payload: unknown): Promise<T> {
  return apiJson<T>(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

/** Cadastra o produto no banco e devolve o id gravado. */
export async function createProduct(product: Product): Promise<string> {
  const data = await postJson<CreateResponse>('/api/db/products', buildProductPayload(product));
  if (!data?.id) {
    throw new ApiError('O servidor não devolveu o id do produto cadastrado.', 500);
  }
  return data.id;
}

/** Cadastra o cliente no banco e devolve o id gravado. */
export async function createCustomer(customer: Customer): Promise<string> {
  const data = await postJson<CreateResponse>('/api/db/customers', buildCustomerPayload(customer));
  if (!data?.id) {
    throw new ApiError('O servidor não devolveu o id do cliente cadastrado.', 500);
  }
  return data.id;
}

/**
 * Liga/desliga o produto no catálogo. Inativar é o "excluir" do sistema: a
 * linha continua no banco (venda, nota e orçamento apontam para ela), mas o
 * produto sai do catálogo e do balcão.
 */
export async function setProductActive(productId: string, active: boolean): Promise<void> {
  await apiJson(`/api/db/products/${encodeURIComponent(productId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ active }),
  });
}

/**
 * Payload do `POST /api/db/quotes`.
 *
 * O `customerId` só vai quando ele existe na lista que veio do banco: id de
 * cliente do seed/demonstração não existe lá, e mandá-lo faz a rota responder
 * 400 na hora (ela não cai para a busca por nome quando o id foi informado).
 * Sem id confiável, vai o nome — é assim que o servidor acha o cliente do
 * próprio tenant.
 */
export function buildQuotePayload(quote: Quote, customers: Customer[]): Record<string, unknown> {
  const clienteDoBanco = customers.some((cliente) => cliente.id === quote.customerId);
  const items = (quote.items || []).map((item) => ({
    productId: item.productId || null,
    quantity: item.quantity,
    unitPrice: item.finalUnitPrice,
  }));
  return {
    number: quote.quoteNumber,
    customerId: clienteDoBanco ? quote.customerId : undefined,
    customerName: clienteDoBanco ? undefined : quote.customerName,
    total: quote.totalAmount,
    status: quote.status,
    items,
  };
}

/** Grava o orçamento no banco e devolve o id do orçamento criado. */
export async function createQuote(quote: Quote, customers: Customer[]): Promise<string> {
  const data = await postJson<{ success: boolean; budgetId?: string; message?: string }>(
    '/api/db/quotes',
    buildQuotePayload(quote, customers)
  );
  if (!data?.budgetId) {
    throw new ApiError('O servidor não devolveu o id do orçamento salvo.', 500);
  }
  return data.budgetId;
}

/** Entidade que falhou ao carregar, com o erro original para quem chamou decidir. */
export interface EntityLoadFailure {
  entity: 'products' | 'customers' | 'suppliers' | 'quotes';
  error: unknown;
}

export interface EntityLoadResult {
  products?: Product[];
  customers?: Customer[];
  suppliers?: Supplier[];
  quotes?: Quote[];
  failures: EntityLoadFailure[];
}

/**
 * Carrega as quatro listas em paralelo. Devolve só o que veio — a ausência de
 * uma chave significa que aquela entidade falhou (e está em `failures`).
 */
export async function loadTenantEntities(): Promise<EntityLoadResult> {
  const [products, customers, suppliers, quotes] = await Promise.allSettled([
    fetchProducts(),
    fetchCustomers(),
    fetchSuppliers(),
    fetchQuotes(),
  ]);

  const result: EntityLoadResult = { failures: [] };
  if (products.status === 'fulfilled') result.products = products.value;
  else result.failures.push({ entity: 'products', error: products.reason });

  if (customers.status === 'fulfilled') result.customers = customers.value;
  else result.failures.push({ entity: 'customers', error: customers.reason });

  if (suppliers.status === 'fulfilled') result.suppliers = suppliers.value;
  else result.failures.push({ entity: 'suppliers', error: suppliers.reason });

  if (quotes.status === 'fulfilled') result.quotes = quotes.value;
  else result.failures.push({ entity: 'quotes', error: quotes.reason });

  return result;
}
