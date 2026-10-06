# Auditoria — GATO SaaS (02/10/2026)

> Achados da auditoria de segurança e bugs feita em 02/10/2026, **com o estado de
> cada item atualizado no fim do dia**. Complementa `PROJETO_SEGURANCA_AUDIT.md`
> (auditoria anterior) e `docs/relatorio-gaps.md` (gaps por fase).
>
> Método: leitura integral de `server.ts` + todo o `server/`, auditoria dirigida do
> núcleo de auth/RBAC, e **verificação empírica** no dev server local (logins,
> requisições sem token, consultas ao Postgres). Vários achados abaixo só
> apareceram porque foram testados contra o banco real — em memória passavam.

---

## ✅ Resolvidos em 02/10/2026

| # | Achado | Onde estava | Como ficou |
|---|--------|-------------|------------|
| P0-1 | **Login demo dava Super Admin em produção.** `flag === "true" \|\| (flag !== "false" && !IS_PRODUCTION)` — o primeiro termo vencia a checagem de ambiente, e o deploy leva o mesmo `.env`. Semeava todas as contas com `senha123456`. | `server/auth.ts` | `demoSeedDecision()`: produção **recusa e derruba o boot**. Verificado: login de super_admin com a senha padrão → `GATO_INVALID_CREDENTIALS`. 3 testes. |
| P0-2 | **Zero auditoria no PDV.** `appendAuditLog` era importado e nunca chamado em `server/caixa.ts`. | `server/caixa.ts` | Toda operação sensível audita, com `warning`/anômalo para diferença de fechamento, ajuste manual e baixa divergente. |
| P0-3 | **Caixa não hidratava.** `let hydrated = false` declarado e nunca usado: o turno sumia no restart e o operador não conseguia fechar o caixa. | `server/caixa.ts` | `hydrate()` no padrão dos outros stores. Verificado: abrir → movimentar → reiniciar → o turno permanece. |
| — | **Movimentos de abertura e fechamento nunca eram espelhados** (só o turno era) → extrato e resumo perdiam o fundo de caixa após restart. | `server/caixa.ts` | Espelho adicionado aos dois. Achado pela verificação contra o banco real. |
| — | **Itens do recibo não eram persistidos** (detalhe fiscal: NCM/CFOP/alíquotas) e `receipt.movementId` ficava sempre `null`. | `server/caixa.ts` | Coluna `items JSONB` na migration 0005 + espelho; vínculo preenchido. |
| — | **12 tabelas usadas pelo código e ausentes nas migrations** — o `mirror()` gravava em tabela inexistente e falhava em silêncio. | `db/migrations/` | Migration **0005** cria as 12 (`CashRegister`, `CashMovement`, `Receipt`, `BoletoIssuance`, `Product`, `Category`, `Customer`, `Supplier`, `Warehouse`, `StockLevel`, `Budget`, `BudgetItem`). |
| — | **`Tenant.logoUrl` não existia em migration nenhuma** — era criada por `ALTER TABLE` dentro do handler de upload, então o `GET` da logo estourava 500 até o primeiro upload. | `server.ts` + migrations | Migration **0006**. Verificado: 500 → 404. |
| — | **`GET /api/storage/logo/:tenantId` exigia `catalog_reference`** — única das três rotas de logo a fazê-lo; a imagem da empresa estava amarrada ao catálogo de veículos. | `server.ts` | Alinhada ao upload e ao delete (`company_data`/`layout_ui`). |
| — | **Credencial do banco era sombreada pelo seed demo** em dev (o dono não entrava com a própria senha; em produção funcionava). | `server/identityStore.ts` | A credencial do banco prevalece. Verificado: senha demo rejeitada para a conta com credencial no banco; contas demo sem credencial seguem com `senha123456`. |

---

## 🔴 Abertos — P0 (bloqueadores de produção)

### P0-4 — Venda em cartão/PIX contabilizada como dinheiro
`server/caixa.ts` (`issueReceipt`): o movimento da venda é gravado **sempre** como
`sale_cash` (`input.type === "credit_note" ? "refund_card" : "sale_cash"`), ignorando
o `paymentMethod`. Efeito: venda em cartão/PIX entra no "esperado em dinheiro" do
bater-caixa e o fechamento acusa **falta fantasma**. Também afeta `getCaixaSummary`,
`closeCashRegister` e o relatório impresso, que somam por tipo de movimento.

> **Nota de desenho (decisão pendente):** o `expected` soma hoje dinheiro + cartão +
> PIX + boleto (só vale/voucher fica de fora). Se cartão não deve compor o esperado
> da gaveta, a correção é maior que trocar o tipo do movimento — envolve a fórmula
> em três lugares (servidor, `CaixaView` e o relatório). Alinhar com o dono antes.

### P0-5 — Replay de webhook reativa assinatura inadimplente
`server/billing/webhook.ts`: no caminho `alreadyProcessed`, chama
`applyGatewayPaymentEvent({ paid: false })` em vez de **retornar sem efeito**. Como
`mapAsaasEventToStatus("PAYMENT_RECEIVED")` → `"active"`, o reenvio de um evento
antigo (o Asaas reentrega com backoff por dias) **reativa** assinatura `past_due`/
`expired`. No mesmo arquivo, o `eventId` de fallback é
`` `${event}:${tenantId}:${event}` `` — o evento aparece duas vezes na chave, o que
colapsa todos os eventos do mesmo tipo/tenant num único id e faz renovações serem
ignoradas.

### P0-6 — Autoativação de plano pago
`server/billing/subscriptions.ts` (`convertTrialToPaid`) grava `status: "active"` +
30 dias quando o gateway **não** está configurado, e `POST /api/billing/subscribe`
(`billing/routes.ts`) fica liberado para qualquer tenant em trial. Um tenant em trial
vira "active" sem pagar, quantas vezes quiser.

---

## 🟠 Abertos — P1 (importante)

| # | Achado | Local |
|---|--------|-------|
| 1 | **Webhooks/conectores aceitam qualquer sessão válida**, sem permissão e sem tenant (`requireIngestAuth` delega para `requireAuth`). Um `tenant_readonly` forja evento de pedido/pagamento. Hoje são simuladores; viram fraude quando persistirem. Validação HMAC com o `rawBody` já preservado nunca é usada. | `server/auth.ts:1304-1329`, `server.ts:1846/1901/1967` |
| 2 | **Matriz tributária é estado global** (`activeFederalTaxSettings`/`activeStateTaxRules` em variável de módulo): qualquer tenant com `fiscal_config` write altera ICMS/MVA de **todos**. | `server.ts:2065-2094` |
| 3 | **Frota sem `tenant_id`**: `FleetVehicle` não tem o campo e nenhuma rota filtra. Qualquer autenticado lê/edita/exclui veículos de todos, sem auditoria. *(Verificado: `GET /api/vehicles` devolvia 20 veículos.)* **Atenção:** o super_admin perdeu `catalog_reference` hoje — quem enxerga isso agora são os papéis de tenant. | `server.ts:1049-1058` |
| 4 | **LGPD vaza PII cross-tenant**: `/api/rbac/lgpd/requests` devolve `LGPD_REQUESTS_DATA` inteiro, sem filtro de tenant. *(Verificado: `tenant_admin` do MGN recebeu solicitações de 2 tenants, com `subjectName` sem máscara.)* O `subjectDocument` é mascarado, o nome não. | `server/rbacRoutes.ts:890-895` |
| 5 | **Elevação por senha master é cosmética**: devolve `expiresInMinutes: 30` mas nada é gravado no servidor; nenhum middleware valida. O "desbloqueio" vive só no `sessionStorage` do navegador. | `server/authRoutes.ts:415-420`, `src/utils/accessControl.ts:36-63` |
| 6 | **Auto-escalada via role-overrides**: grava `ROLE_OVERRIDES[code] = permissions` **sem sanitizar** (existe `sanitizeCustomOverrides`, não usado aqui). `saas_cs` tem `manage_accounts: 'full'` e se concede `company_data: 'full'`, atravessando tenants. | `server/rbacRoutes.ts:1002-1018` |
| 7 | **MFA obrigatório declarado e nunca aplicado**: `requiresMfa: true` para toda a equipe SaaS, mas o login emite token só com senha. `ipAllowlist` idem. | `server/rbacEngine.ts:86`, `server/authRoutes.ts:124` |
| 8 | **Broadcast de mensagem para todos os tenants**: `tenantId: tenantId \|\| "all"` — omitir o campo faz a mensagem chegar à caixa de entrada de todos. | `server/rbacRoutes.ts:823` |
| 9 | **Sem CSP/helmet**; token acessível por JS. Revogação de sessão é volátil (restart ressuscita token) e **trocar a senha não derruba a sessão do atacante** (não há `tokenVersion`). | `server.ts:59-73`, `server/auth.ts:242-259` |
| 10 | **Cota TOCTOU** (`checkQuota` → escreve → `incrementUsage`, não atômico) + `rawBody` de 15 MB copiado em **todo** POST. | `server.ts:77-83`, `server/quotas.ts:44-89` |

---

## 🟡 Abertos — P2 (desejável)

- `POST /api/caixa/movements` aceita `amount` negativo/infinito e `type`/`paymentMethod`
  fora do enum; `PUT /boletos/:id/paid` não valida `paidAmount`; `markBoletoPaid` não gera
  movimento de caixa; `cancelReceipt` não estorna o valor. (`caixaRoutes.ts`, `caixa.ts`)
- **RLS ausente nas migrations** + `VITE_SUPABASE_ANON_KEY` (hoje vazio): se alguém preencher
  a chave, o PostgREST expõe `UserCredential`/`AuditLog` de todos os tenants. Decidir: ligar
  RLS ou nunca popular a anon key.
- Enumeração de e-mail por timing (scrypt só roda quando o e-mail existe) + `scryptSync`
  bloqueante; no cadastro, o 409 de e-mail duplicado sai **antes** do rate limit.
- Mascaramento de PII heurístico: `contactEmail`/`customerEmail` escapam, `justification`
  vai cru, e a sanitização só é aplicada para `saas_suporte`.
- Rate limit só por IP, sem chave por conta; `GATO_TRUST_PROXY` é lido por `getClientIp` mas
  **`app.set('trust proxy')` nunca é chamado**.
- Catch-all devolve **HTML 200** para `/api/*` inexistente (verificado) — mascara erro de integração.
- Upload de logo aceita `Content-Type` arbitrário sem magic bytes; `/api/gemini/assist` sem
  teto de prompt; SSRF administrativo em `/api/admin/database/test` (host arbitrário).
- `window.open` sem `noopener`; `Math.random()` em ids de auditoria; itens de menu órfãos
  `relatorios`/`ordem-servico` (tela branca); `isMenuVisible(item, undefined)` é fail-open.
- `UsuarioCredential`/`RbacUser` desnormalizado: `tenantName` inconsistente no seed.

---

## Verificações negativas (o que está sólido — não regredir)

- **SQL: 100% parametrizado, zero injeção** em `server.ts` (40+ chamadas, todas `$1..$n`).
- Token de sessão HMAC-SHA256 com `timingSafeEqual`, `jti`, expiração, sem fallback inseguro;
  `requireAuth` é fail-closed e relê o usuário vivo do store.
- Senhas com **scrypt + salt aleatório por usuário**; API keys com sha256 de 192 bits aleatórios.
- `resolveDataScope` força o tenant da sessão para papéis de tenant; `x-target-tenant-id` é
  ignorado para eles (testes de isolamento em `/api/rbac/test-isolation`).
- Sem XXE (o parser de XML é por regex), sem path traversal no upload, sem segredo no bundle.
- Relatório impresso do caixa escapa tudo com `esc()`; sem `dangerouslySetInnerHTML` no front.
- `adminDatabaseRoutes` bem gateado (SaaS + `security_compliance` write), senha sempre mascarada.

### Dois falsos positivos que a verificação derrubou (registro para não repetir)

- `/api/db/tables`, `/api/quotas` etc. devolvendo **200 sem token** não é vazamento: é o
  fallback do SPA servindo `index.html`.
- `/api/rbac/users` para `tenant_admin` **filtra corretamente** por tenant. Os dois nomes de
  empresa diferentes na resposta eram `tenantName` desnormalizado inconsistente no seed, não
  vazamento.
