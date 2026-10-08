# Handoff — Próximo Agente GATO SaaS

> **Para o agente que vai assumir este repositório:** leia este arquivo ANTES de
> qualquer tarefa, junto com `AGENTS.md`, `docs/arquitetura-saas.mmd`,
> `docs/checklist-saas.md` e `docs/roadmap-pdv.md`. Ele resume **persona do SaaS,
> funcionalidades completas e pontos de atenção**. Atualize-o quando o estado do
> projeto mudar (é fonte de verdade viva, não um relatório morto).
>
> Estado desta handoff: **08/10/2026** — branch `feat/billing-saas`, tudo commitado e no `origin`.
> Entregue em 06/10: orçamento imprimível/copiável em Vendas e o modo base limpa
> (`VITE_USE_SEED=false`, commitado em 08/10) para testar o sistema como empresa nova.
> **Frente em andamento desde 08/10: ligar o front na API** — antes de planejar qualquer coisa,
> leia §3.19; é o bloqueio do teste real. Leia §4 para a ordem dos trabalhos.

---

## 1. Persona do SaaS — GATO SaaS

### O produto

**GATO SaaS** é um sistema de gestão **multi-tenant** para o varejo de autopeças,
com forte operação de **PDV/balcão**. Idioma de tudo: **pt-BR** (UI, docs, comentários,
mensagens de erro). O domínio é fiscal brasileiro: **NF-e (mod. 55), NFC-e (mod. 65),
CFOP/NCM/CEST, SPED, MDF-e**, PIX, boleto Asaas, CNPJ, filiais por UF.

- **Stack**: React 19 + Vite 6 + Tailwind 4 (front) · Express 4 + TypeScript + Zod (back) ·
  PostgreSQL/Supabase (persistência) · tsx como runtime dev · monorepo simples (`src/` + `server/`).
- **Modelo de negócio**: SaaS por assinatura — trial 14 dias → planos (`SAAS_PLANS`) →
  cobrança recorrente via **gateway Asaas** (cartão/PIX/boleto), webhooks assinados,
  quotas (`checkQuota` → 402), status trial/active/past_due/expired/suspended/canceled
  com **enforcement no middleware** (expirado = leitura; cancelado = bloqueio total).
- **Princípios inegociáveis** (estão em `AGENTS.md`):
  1. **Todo dado novo nasce com `tenant_id`** e é filtrado por `resolveDataScope`;
  2. **Toda ação sensível gera log de auditoria** (`recordAudit` / `appendAuditLog`);
  3. **Toda feature nova tem teste** (`tsx --test server/**/*.test.ts`);
  4. **Cobrança sempre via gateway** — nunca cartão no próprio backend.

### Personas de uso (camadas de acesso — ver `docs/camadas-acesso.md`)

| # | Camada | Papel RBAC | Quem é | O que vê |
|---|--------|-----------|--------|----------|
| 1 | Super Admin | `super_admin` | Dono do SaaS | Tudo; elevação por **senha master** (30 min, auditada); impersonação somente leitura |
| 2 | Equipe SaaS | `saas_financeiro/fiscal/suporte/config/cs` | Colaboradores internos | Segregação por função; **sem** `company_data`/`customers_employees` (dados do cliente) |
| 3 | Admin do Tenant | `tenant_admin` | Dono da empresa cliente | Gestão própria: equipe, clientes, estoque, faturas, assinatura |
| 4 | Usuário do Tenant | `tenant_user` | Operador de balcão/vendas/estoque | Operação do dia a dia; permissões finas configuráveis (construtor flexível de capacidades) |
| 5 | Somente Leitura | `tenant_readonly` | Auditor/suporte externo | Leitura sem escrita |

- Papel legado de persona: `caixa` (operador de caixa & faturamento) → mapeado para `tenant_user` em runtime.
- Capacidades finas do tenant (grupo `caixa`): `invoice_issuance`, `payment_machines`; grupo `vendas`: `sales`, `customer_register`, `invoicing`.
- **Visibilidade do menu = RBAC** (`src/utils/menuAccess.ts`: `MENU_RESOURCE`, `MENU_TENANT_PERMISSION`) — recurso com nível `none` **some do menu**; capacidades só valem se o admin já configurou o usuário.

### Onde o produto está (trabalho de 02/10/2026, reverificado em 05/10)

**DoD — reverificado em 05/10/2026 sobre a mesma árvore (nada mudou nos três dias):**
`npm run lint` ✅ · `npm test` **63/63** ✅ · `npm run build` ✅ (front ~2 MB +
`dist/server.cjs` 457 KB) · banco conectado, migrations 0000–0006 aplicadas.
Confirmados em 02/10: `npm run validate-db` → **0 falhas, 42 OK** e
`scripts/criar-super-admin.mjs` com o hash conferindo com o `auth.ts`.

> ⚠️ **O dev server NÃO está no ar** (caiu com o fim da sessão anterior). Para retomar:
> `npm run dev` — e lembre que ele não observa `server/**`, então mudança no back exige
> reiniciar (§3.15).

**O dia em ordem de importância** (o que ainda está aberto vai em §4):

- Fase **A do PDV** entregue: tela **Caixa** no menu (abertura com checklist, movimentações
  incl. **vales/voucher**, **troco**, fechamento com bater-caixa, **relatório imprimível**) —
  ver `docs/roadmap-pdv.md`. `npm run lint` **verde** (erros pré-existentes de tipo em
  `caixaRoutes.ts` corrigidos no caminho).
- **Fase A do PDV commitada** (`d632b2a`) + docs (`9be5864`), sincronizado com `origin`
  **naquele momento**. A partir daí a árvore ficou suja — ver §3.18. (O bundle do front
  passa de 500 kB e o Rollup avisa; é esperado, não é erro.)
- **Persistência do PDV ligada (02/10/2026, tarde)**: o Supabase está conectado
  (pooler `aws-0-sa-east-1` + `SUPABASE_DB_SSL_CA` apontando para o `prod-ca-2021.crt`;
  a conexão **direta** é IPv6-only e não serve nesta rede). Nova migration
  **`0005_pdv_operacional.sql`** cria as **12 tabelas** que o código já usava e nenhuma
  migração criava — `CashRegister`, `CashMovement`, `Receipt`, `BoletoIssuance`,
  `Product`, `Category`, `Customer`, `Supplier`, `Warehouse`, `StockLevel`, `Budget`,
  `BudgetItem`. Antes disso o `mirror()` do caixa gravava em tabela inexistente e falhava
  em silêncio. `server/caixa.ts` ganhou **hidratação** (o turno sumia no restart) e
  **trilha de auditoria** em toda operação sensível. Testes: **60/60** (`server/caixa.test.ts`).
  Verificado no banco real: abrir → movimentar → reiniciar → o turno permanece.
- **Bugs de persistência que só apareceram na verificação contra o banco real** (em
  memória passavam): os movimentos de **abertura** e **fechamento** nunca eram espelhados
  (só o turno era) — o extrato do turno e o `getCaixaSummary` perdiam o fundo de caixa
  depois de um restart (o fechamento não, pois usa `register.openingAmount`); os **itens
  do recibo** (detalhe fiscal: NCM/CFOP/alíquotas) não eram gravados; e
  `receipt.movementId` ficava sempre `null`. Recibo emitido **fora de um turno** deixou de
  gerar movimento órfão (que violaria o `NOT NULL` de `"CashMovement"."cashRegisterId"`).
- **P0-1 resolvido (02/10/2026)**: o seed de demonstração não passa mais por cima do
  ambiente. Antes, `flag === "true" || (flag !== "false" && !IS_PRODUCTION)` fazia o
  primeiro termo vencer — e como o deploy leva o mesmo `.env` (docker-compose usa
  `env_file: .env`), subir com `GATO_ALLOW_DEMO_LOGIN=true` semeava **todas** as contas,
  inclusive o `super_admin`, com `senha123456`. Agora produção **recusa e derruba o boot**
  (`demoSeedDecision` em `server/auth.ts`); em dev o comportamento é o de sempre.
  Verificado: login de super_admin com a senha padrão → `GATO_INVALID_CREDENTIALS` em
  produção e ainda funcional em dev. Testes: **63/63**.
- **RBAC do super_admin + logo (02/10/2026, fim do dia)**: `super_admin` perdeu o
  `catalog_reference` (era `read_only`) — "Consulta de Peças" saiu do menu dele e
  `/api/vehicles` + `/api/fleet-database` deixaram de responder (403 verificado).
  No caminho apareceu um acoplamento: `GET /api/storage/logo/:tenantId` era a **única**
  das três rotas de logo a exigir `catalog_reference` (upload e delete já usavam
  `company_data`/`layout_ui`) — a logo da empresa estava amarrada ao catálogo de veículos.
  Alinhada às irmãs. E a coluna `Tenant.logoUrl` **não existia em migration nenhuma**:
  era criada por `ALTER TABLE` dentro do handler de upload, então o GET estourava 500
  (`column "logoUrl" does not exist`) até o primeiro upload — corrigido na migration
  **`0006_tenant_logo.sql`**.
- **Credencial do banco vence o seed demo**: a hidratação de `UserCredential` pulava
  e-mail que já estava em memória, e como o seed demo roda antes (no import do `auth.ts`),
  a senha `senha123456` vencia a senha real gravada no banco — o dono da plataforma não
  conseguia entrar com a própria senha em dev (em produção funcionava, porque lá não há
  seed). Agora a credencial do banco prevalece; contas demo sem credencial no banco seguem
  com `senha123456`. **Atenção**: isso vale para a CREDENCIAL — o *nome* e os campos do
  usuário ainda vêm do array do `rbacEngine` (a mesclagem de usuários mantém a definição
  do código por id), então um nome gravado no banco para uma conta semeada é ignorado.
- **Imprimir / copiar orçamento (06/10/2026)**: o módulo **Vendas** só tinha "Cupom Fiscal" e
  "Faturar & Emitir NF-e". Ao atacar o pedido do dono, apareceram três defeitos de base:
  (a) **não existia impressão de documento no projeto** — nenhum `@media print`, então os 4
  `window.print()` imprimiam o **app inteiro com o overlay do modal por cima**; (b) o
  `CupomFiscalModal` **violava a ordem de hooks do React** (`return null` antes dos `useState`,
  hoje corrigido em `CupomFiscalModal.tsx:70`), o que estourava em runtime e o `tsc` não pega; (c) o texto do
  cupom tinha linhas de **56 colunas** e a térmica 80mm imprime **48** — a última coluna saía
  cortada. Entregue: `src/utils/printDocument.ts` (padrão de janela própria do `CaixaView`),
  `src/utils/clipboard.ts` (com fallback `execCommand`, porque `navigator.clipboard` não existe
  em HTTP de rede interna), layout de 48 colunas com item em duas linhas (a descrição não é mais
  truncada em 22 caracteres) e valores no padrão brasileiro, resumo curto para copiar, e os
  pontos de entrada nos 4 lugares (barra do DAV, drawer do carrinho, modal DOCUMENTO — que
  mostrava `DAV-2026-00489` fixo — e o histórico de Orçamentos). **Fora do escopo, por decisão
  do dono**: data de validade com 1 dia a menos, CNPJ fictício no documento (`DEFAULT_COMPANY_RECEIPT_INFO`)
  e o desconto que não fecha a conta (`discountAmount` nunca é subtraído de `totalAmount`).
  Testes: **75/75** (`server/orcamento/orcamento.test.ts`, 12 novos).
- Próximas: **Fase B** (venda PDV com código de barras/carrinho) e **Fase C** (NFC-e real — hoje é stub).

---

## 2. Mapa de funcionalidades

### Frontend (`src/`) — views renderizadas em `src/App.tsx` por `currentView`

| View (id) | Componente | Menu? |
|---|---|---|
| `dashboard` | `DashboardOverview` | ✅ Início |
| `consulta-pecas` | `ConsultaPecasView` (+ `consulta-aplicacao` → `ConsultaAplicacaoPecas`) | ✅ Consulta de Peças |
| `estoque` | `EstoqueManager` | ✅ Estoque |
| `cotacao` | `BalcaoCotacao` (venda balcão: formas de pagamento, desconto, → NF-e) | ✅ Vendas |
| `caixa` | `CaixaView` (**Fase A do PDV**) | ✅ Caixa |
| `orcamentos` / `clientes` / `leads-marketing` | `ClientesOrcamentos` (abas) | ✅ |
| `fornecedores` | `FornecedoresManager` | ✅ |
| `conectores` | `ConnectorsManager` (e-commerce, banking, multicanal) | ✅ |
| `xml-import` | `XmlNfeImport` (entrada de NF-e) | ✅ secundário |
| `configuracoes` | `ConfiguracoesSaaS` (+ `empresa-filiais` → `EmpresaFiliaisManager`) | ✅ |
| `assinatura` | `AssinaturaFaturas` | ✅ |
| `chaves` | `ChavesIntegracoes` | ✅ |
| `admin` | `AdminImpostosFiscal` | ✅ (restrita + senha master) |
| `rbac` | `AdminRbacMultiTenant` | ✅ (restrita + senha master) |
| `equipe-acessos` | `EquipeAcessos` | ✅ (só tenant_admin) |
| `financeiro-saas` / `banco-dados` / `camadas-acesso` | `DashboardFinanceiroSaaS` / `ConfiguracaoBancoDados` / `CamadasAcesso` | ✅ (restritas + master) |
| `nfe-venda` | `EmissaoNfe` (NF-e venda/compra; **NFC-e = stub**) | alias de Vendas |
| `financeiro` | `FinanceiroCompleto` | ⚠️ só via alias |
| `frota`, `catalogo-web`, `suporte-chat` | `GestaoFrotaVeiculos`, `CatalogoDigitalWeb`, `SuporteChatIA` | ❌ sem item (acesso por botões internos) |

### Backend (`server/` + `server.ts`)

| Rota | Arquivo | Notas |
|---|---|---|
| `/api/auth` | `authRoutes.ts` + `auth.ts` | Login (token HMAC-SHA256, header/cookie), sessão, personas, senha master **verificada no servidor**, seed de 14 contas demo (`GATO_ALLOW_DEMO_LOGIN`) |
| `/api/rbac` | `rbacRoutes.ts` + `rbacEngine.ts` | Papéis, overrides, tenant-permissions, impersonação, testes de isolamento, planos, mensagens, LGPD |
| `/api/billing` | `billing/routes.ts` + `billing/asaas.ts` | Assinaturas, faturas, webhooks Asaas (idempotentes), subscribe trial→pago |
| `/api/caixa` | `caixaRoutes.ts` + `caixa.ts` | PDV: summary/open/close/movements/receipts/boletos — **auditado, multi-tenant, persistente** (hidrata do Postgres desde 02/10/2026; 12 testes em `server/caixa.test.ts`) |
| `/api/admin/database` | `adminDatabaseRoutes.ts` | Credenciais de DB em runtime (Super Admin) |
| `/api/credentials`, `/api/license`, `/api/v1` | `credentialsRoutes.ts`, `licenseRoutes.ts`, `v1Routes.ts` | API keys, licença de máquina, API versionada |
| Rotas inline em `server.ts` | — | `/api/db/*`, `/api/connectors/*`, `/api/gemini/assist`, `/api/vehicles`, `/api/marketplaces/*`, quotas |
| Transversais | `quotas.ts`, `rateLimit.ts`, `auditStore.ts`, `identityStore.ts`, `store.ts`, `migrate.ts`, `notifications/cron.ts` | Uso/quota (402), rate limit (`standardApiLimiter` 250/min por IP), auditoria, seeds em memória + mirror Postgres, migrations, cron de billing/trial |

### Infra & documentos de referência

- `db/migrations/*.sql` (**0000–0006**, todas aplicadas) + `npm run migrate` · `npm run validate-db` · Docker · CI (`.github/workflows/ci.yml`) · `scripts/criar-super-admin.mjs` (gera o SQL do primeiro super_admin de produção).
- Docs: `arquitetura-saas.mmd`, `camadas-acesso.md`, `checklist-saas.md` (87 itens — workflow do AGENTS.md), `relatorio-gaps.md` (P0/P1/P2), `roadmap-pdv.md` (fases A/B/C do PDV), **`auditoria-2026-10-02.md`** (achados de segurança + estado de cada um), este `handoff-proximo-agente.md`.
- Auditoria de segurança anterior: `PROJETO_SEGURANCA_AUDIT.md` + `SECURITY_AUDIT_STATUS.md` (raiz).
- `.env.production` (raiz, **fora do git**): modelo comentado do ambiente de produção — é o que falta preencher para o deploy.

### Comandos & ambiente

```bash
npm run dev        # srv Express+Vite em http://localhost:3000 (LOGS em ./dev.log)
npm run lint       # tsc --noEmit — DEVE ficar verde antes de qualquer entrega
npm test           # tsx --test server/**/*.test.ts
npm run build      # vite build + bundle do server (→ dist/)
npm run preview    # serve dist/ em http://localhost:4173 (prévia de produção: SÓ estáticos, sem API)
npm run migrate    # migrations   |  npm run validate-db
```

- `.env` obrigatório (validado fail-fast por `server/env.ts` com Zod): `GATO_SESSION_SECRET` (≥48 chars),
  `GATO_MASTER_PASSWORD` (≥8), `SUPABASE_DB_*`. Sem DB configurado o servidor roda **em memória**
  (dados somem no restart). Chaves opcionais: `GEMINI_API_KEY`, `ASAAS_API_KEY`, `SENDGRID_API_KEY`.
- Login demo: `GATO_ALLOW_DEMO_LOGIN=true` + senha em `GATO_DEMO_PASSWORD` (fallback `senha123456`);
  ex.: `admin@mgnautopecas.com.br` (tenant_admin) · `vendedor@mgnautopecas.com.br` (tenant_user).
  **Vale só em desenvolvimento**: em `NODE_ENV=production` o seed não roda e, com a flag
  em `true`, o servidor **se recusa a subir** (por desenho). No deploy use
  `GATO_ALLOW_DEMO_LOGIN=false` + contas reais em `GATO_USERS_JSON`.
- **Primeiro super_admin em produção** (não há seed demo — ovo e galinha): duas vias.
  (a) `GATO_USERS_JSON` com a senha em texto puro no ambiente; (b) **recomendada** —
  `node scripts/criar-super-admin.mjs <email> "<nome>"`, que **pede a senha às escuras**
  (nunca por argumento: fica no histórico do shell e no `ps`) e imprime o SQL para colar
  no SQL Editor do Supabase (grava `RbacUser` com `tenantId='system'` + `UserCredential`
  com o hash scrypt, idempotente para trocar a senha depois). Para o e-mail já semeado
  (`contato.ativeads@gmail.com` → `usr_super_admin`) basta a linha da credencial: o
  usuário já vem do array do `rbacEngine` em qualquer ambiente.
  **Por que (b):** com `GATO_USERS_JSON`, `seedEnvUsers()` roda a cada boot e
  `addCredential()` sempre sobrescreve a credencial em memória, enquanto
  `hydrateIdentityStore()` pula e-mail já conhecido — a senha do env vence em todo
  restart e **reverte silenciosamente** a troca de senha feita pela tela.
- **Deploy**: `.env.production` na raiz é o modelo comentado (fora do git). Atenção ao
  `SUPABASE_DB_SSL_CA`: o caminho é da máquina local e **não existe no container** —
  copie o `.crt` para a imagem ou monte como volume.
- Front autentica via `apiJson`/`apiFetch` de `src/services/apiClient.ts` (injeta Bearer; 401 → evento de logout).

---

## 3. Pontos de atenção (LEIA — evita retrabalho e incidentes)

### 🔒 Segurança (área sensível, mudanças exigem confirmação)
1. **Nunca** exponha segredos no bundle front: variáveis `VITE_*` vão ao navegador.
   Senha master e chaves vivem **só no servidor** (`server/env.ts`, `accessControl.ts`).
2. Token de sessão é HMAC-SHA256 — não troque por JWT ingênuo sem revisão; `GATO_SESSION_SECRET` ≥48 chars.
3. Toda rota de negócio passa por `requireAuth` → `requirePermission`/`requireTenantPermission` → `resolveDataScope`. **Não crie rota sem esses 3** e sempre com `tenantId` no filtro (testes de isolamento: `GET /api/rbac/test-isolation`).
4. Webhook Asaas: valide assinatura/token **e** idempotência (`recordWebhookEvent`); `ASAAS_WEBHOOK_TOKEN` vazio = endpoint fechado.
5. Auditoria é obrigatória em ação sensível (`recordAudit`, PII mascarada). Achados em `PROJETO_SEGURANCA_AUDIT.md`. **O gap do `server/caixa.ts` foi fechado em 02/10/2026**: o `appendAuditLog` era importado e nunca chamado — hoje toda operação do PDV audita, com destaque (`warning`/anômalo) para diferença de fechamento, ajuste manual e baixa de boleto divergente. Seguem abertos os P0-4/P0-5/P0-6 — ver §4.
6. Rate limit só por IP (250/min) — **não há por tenant** (gap P0 conhecido).

### 🏗️ Multi-tenancy & dados
7. Modelo em memória (`Map` + `mirror()` para Postgres). **Desde 02/10/2026 o `.env` tem banco configurado**, então o espelho grava de verdade — mas a memória continua sendo a fonte de verdade imediata. Duas armadilhas: (a) `npm test` **não** carrega o `.env` (só `server.ts`, `migrate-cli` e `validateDb` chamam `dotenv.config()`), então a suíte roda sem banco e é hermética — "passou no teste" não significa "persistiu"; (b) `hydrate()` roda **uma vez por processo** (`if (hydrated) return`), então dado criado no banco por fora (SQL Editor) só aparece **depois de reiniciar** o servidor.
8. Seeds/demo (`identityStore`, `store`, `rbacEngine`) são hidratados no boot; nunca substitua os arrays, **mescle** (comentário no topo de `identityStore.ts` explica).
9. Capacidades finas (`tenantPermissions`) só restringem o menu quando **configuradas** — `undefined` mantém o gate por recurso RBAC (não "quebre" isso, quebra papéis legados).
10. Escopo de dados: SaaS-wide usa `own_tenant_only`/`full` + `audit_required` para dados de tenant (`company_data`, `customers_employees`).

### 🐛 Conhecidos / armadilhas
11. ~~**Itens de menu sem view**~~ — **resolvido em 02/10/2026** (commitado em 06/10): `App.tsx`
    passou a renderizar `ordem-servico` → `OrdemServicoManager` e `relatorios` → `FinanceiroCompleto`
    (junto de `financeiro`). Não reintroduza itens de menu sem view.
12. **NFC-e é stub** (`EmissaoNfe.tsx` → "feature em desenvolvimento") — Fase C do roadmap; não prometa emissão real sem integração fiscal homologada.
13. `.kilo/worktrees/*` são worktrees de outras branches — **ignore** em buscas/análises (duplicam resultados).
14. `vite.config.ts` tem HMR/watch desabilitáveis via `DISABLE_HMR` — não altere (regra do ambiente AI Studio).
15. O dev server **não observa** `server.ts` (tsx sem `--watch`): mudança em `server/**` exige **reiniciar** o processo (matar PID da porta 3000 e `npm run dev`). Front tem HMR automático.
16. `npm run lint` era bloqueado por erros pré-existentes de tipo em `caixaRoutes.ts` — **corrigidos em 01/10/2026**; se voltar a falhar, é regressão sua ou de novo código.
17. Checklist/estado do agente: workflow do `AGENTS.md` pede marcar `checklist-saas.md` e gerar `relatorio-gaps.md` — faça **antes** de propor código e **nunca altere código sem confirmar o plano**.
18. ~~**Worktree SUJA**~~ — **resolvido em 06/10/2026**: tudo commitado e enviado ao `origin`
    em três commits (`b2a99e9` trabalho de 02/10, `3fad6f7` orçamento, `4742f62` docs). Só
    `.olli/` segue fora do git, por decisão registrada — **não commitar**.
19. 🚨 **O app NÃO lê as entidades do banco — este é o bloqueio do teste real.** O
    `src/App.tsx` inicializa `products`, `customers`, `quotes`, `orders`, `invoices`, financeiro,
    etc. **direto das constantes de `src/data/initialData.ts`**, e a única chamada de rede dele é
    `/api/billing/subscription`. A ponte com o Postgres existe em três lugares apenas: o painel
    de visualização em `ConfiguracoesSaaS.tsx`, o CRUD de `FornecedoresManager.tsx` e o
    `POST /api/db/sync-catalog` — que empurra o seed **para dentro** do banco, no sentido
    contrário. Consequência prática: apagar os seeds deixa o sistema em branco, sem caminho para
    carregar dado real. **Ligar o front na API é o trabalho que falta para existir teste real e
    para a produção.**
20. **O banco está praticamente vazio** (conferido em 06/10/2026, contagem tabela a tabela):
    de 26 tabelas, só três têm linhas — `AuditLog` 59, `RbacUser` 1 (`usr_super_admin`),
    `UserCredential` 1. Todas as tabelas de negócio (`Product`, `Customer`, `Receipt`,
    `CashRegister`, `Invoice`, `Tenant`, ...) têm **0 linhas**. Não existe dado de demonstração
    no banco: o que parece fake na tela vem do código. O `npm run validate-db` acusa 2 falhas
    que são **falsos positivos**: `AuditLog` e `RbacUser` apontam para o tenant `system`, que é a
    própria plataforma SaaS e não tem linha em `Tenant` por desenho.
21. **Modo base limpa** (`VITE_USE_SEED=false`, commitado em 06/10): faz o app iniciar sem os
    seeds de movimento e sem ler o localStorage dessas entidades, para ver o sistema como empresa
    nova. Não apaga nada e é reversível. Configuração (perfil, filiais, tabelas fiscais) continua
    carregando. Detalhes e roteiro de teste no item 1 de §4.

### ✅ Definição de pronto (DoD) mínimo
- `npm run lint` verde · `npm test` verde · feature com teste quando houver lógica de servidor ·
  `tenant_id` + auditoria onde aplicável · menu/RBAC consistente (`menuAccess.ts`) ·
  este handoff atualizado · confirmação do usuário para mudanças fora do escopo pedido.

---

## 4. Estado atual e próximos passos (ordem sugerida)

> **Os achados da auditoria de 02/10/2026 estão em [`docs/auditoria-2026-10-02.md`](auditoria-2026-10-02.md)**
> — com o que já foi resolvido, os P0/P1/P2 abertos e os dois falsos positivos que a
> verificação derrubou. É o documento de trabalho para segurança.

0. ~~**Commitar o trabalho de 02/10**~~ — feito em 06/10 (três commits, enviados ao `origin`).
1. **Ligar o front na API — é o que falta para o teste real existir** (§3.19). Sem isso, o
   sistema não sai do dado de demonstração: não há como cadastrar um produto real e vê-lo
   voltar do banco. Escopo sugerido, em ordem:
   - `GET /api/db/quotes` (hoje não existe) e o `App.tsx` passar a carregar `products`,
     `customers`, `quotes` e `suppliers` da API, mantendo o seed só como fallback de dev;
   - telas que hoje só leem props do `App.tsx` (Estoque, Vendas, Orçamentos) passarem a
     escrever via API em vez de só mexer no estado/localStorage;
   - decidir o que fazer com as entidades que não têm tabela nenhuma (`Order`, `Invoice`,
     `FinancialPayable`, `BankTransaction`, `ServiceOrder`) — ou ganham migration, ou saem
     do escopo do primeiro teste.
   **Modo base limpa (`VITE_USE_SEED=false`) é a ferramenta para conduzir esse trabalho:**
   ligue a flag e cada tela vazia mostra exatamente o que ainda falta ligar. Roteiro:
   parar o `npm run dev`, pôr a variável no `.env`, subir de novo, percorrer Estoque →
   Clientes → Vendas → Caixa e anotar o que não tem caminho de cadastro.
2. **Fechar os 3 P0 que restam** (todos com caminho de exploração definido em
   `auditoria-2026-10-02.md`; os P0-1/P0-2/P0-3 já foram):
   - **P0-4 — cartão/PIX contado como dinheiro** no caixa (`issueReceipt` grava sempre
     `sale_cash`). É o mais visível: o fechamento acusa falta que não existe.
     ⚠️ Antes de codar, alinhar com o dono **o que** deve compor o "esperado em dinheiro"
     — a fórmula aparece em três lugares (servidor, `CaixaView`, relatório).
   - **P0-5 — replay de webhook** reativa assinatura inadimplente (`billing/webhook.ts`).
   - **P0-6 — autoativação de plano pago** sem gateway (`billing/subscriptions.ts`).
3. **Preparar o deploy de teste**: `.env.production` (raiz, fora do git) está comentado e
   esperando `GATO_SESSION_SECRET` (48+ aleatórios), `GATO_MASTER_PASSWORD`,
   `SUPABASE_DB_PASSWORD` e `ASAAS_*`. **Não esqueça o `SUPABASE_DB_SSL_CA`**: o caminho é
   da máquina local e **não existe no container** — copie o `prod-ca-2021.crt` para a imagem
   ou monte como volume. Decidir também `ASAAS_ENV` (sandbox no teste) e `GATO_TRUST_PROXY`
   (depende de haver proxy na frente).
4. **Fase B — PDV venda**: carrinho no `BalcaoCotacao` com leitor de código de barras (HID),
   totalização, troco no fechamento e **vínculo automático venda → `POST /api/caixa/movements`**.
5. **Fase C — NFC-e**: emissão/cancelamento/reimpressão (homologação SEFAZ).
6. ~~Corrigir itens de menu órfãos (§3.11)~~ — feito; ver §3.11.
7. Avançar `docs/relatorio-gaps.md` (P0s de observabilidade: logs JSON, métricas, alertas).

> **Regra de ouro deste projeto:** primeiro o plano, depois o código; tenant, auditoria
> e teste em toda mudança de servidor; cobrança sempre pelo gateway; português em tudo.


