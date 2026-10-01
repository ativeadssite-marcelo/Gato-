# Handoff — Próximo Agente GATO SaaS

> **Para o agente que vai assumir este repositório:** leia este arquivo ANTES de
> qualquer tarefa, junto com `AGENTS.md`, `docs/arquitetura-saas.mmd`,
> `docs/checklist-saas.md` e `docs/roadmap-pdv.md`. Ele resume **persona do SaaS,
> funcionalidades completas e pontos de atenção**. Atualize-o quando o estado do
> projeto mudar (é fonte de verdade viva, não um relatório morto).
>
> Estado desta handoff: **01/10/2026** — branch `feat/billing-saas`.

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

### Onde o produto está (01/10/2026)

- Fase **A do PDV** entregue: tela **Caixa** no menu (abertura com checklist, movimentações
  incl. **vales/voucher**, **troco**, fechamento com bater-caixa, **relatório imprimível**) —
  ver `docs/roadmap-pdv.md`. `npm run lint` **verde** (erros pré-existentes de tipo em
  `caixaRoutes.ts` corrigidos no caminho).
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
| `/api/caixa` | `caixaRoutes.ts` + `caixa.ts` | PDV: summary/open/close/movements/receipts/boletos — **auditado, multi-tenant** |
| `/api/admin/database` | `adminDatabaseRoutes.ts` | Credenciais de DB em runtime (Super Admin) |
| `/api/credentials`, `/api/license`, `/api/v1` | `credentialsRoutes.ts`, `licenseRoutes.ts`, `v1Routes.ts` | API keys, licença de máquina, API versionada |
| Rotas inline em `server.ts` | — | `/api/db/*`, `/api/connectors/*`, `/api/gemini/assist`, `/api/vehicles`, `/api/marketplaces/*`, quotas |
| Transversais | `quotas.ts`, `rateLimit.ts`, `auditStore.ts`, `identityStore.ts`, `store.ts`, `migrate.ts`, `notifications/cron.ts` | Uso/quota (402), rate limit (`standardApiLimiter` 250/min por IP), auditoria, seeds em memória + mirror Postgres, migrations, cron de billing/trial |

### Infra & documentos de referência

- `db/migrations/*.sql` + `npm run migrate` · `npm run validate-db` · Docker · CI (`.github/workflows/ci.yml`).
- Docs: `arquitetura-saas.mmd`, `camadas-acesso.md`, `checklist-saas.md` (87 itens — workflow do AGENTS.md), `relatorio-gaps.md` (P0/P1/P2), `roadmap-pdv.md` (fases A/B/C do PDV), este `handoff-proximo-agente.md`.
- Auditoria de segurança: `PROJETO_SEGURANCA_AUDIT.md` + `SECURITY_AUDIT_STATUS.md` (raiz).

### Comandos & ambiente

```bash
npm run dev        # srv Express+Vite em http://localhost:3000 (LOGS em ./dev.log)
npm run lint       # tsc --noEmit — DEVE ficar verde antes de qualquer entrega
npm test           # tsx --test server/**/*.test.ts
npm run build      # vite build + bundle do server
npm run migrate    # migrations   |  npm run validate-db
```

- `.env` obrigatório (validado fail-fast por `server/env.ts` com Zod): `GATO_SESSION_SECRET` (≥48 chars),
  `GATO_MASTER_PASSWORD` (≥8), `SUPABASE_DB_*`. Sem DB configurado o servidor roda **em memória**
  (dados somem no restart). Chaves opcionais: `GEMINI_API_KEY`, `ASAAS_API_KEY`, `SENDGRID_API_KEY`.
- Login demo: `GATO_ALLOW_DEMO_LOGIN=true` + senha em `GATO_DEMO_PASSWORD` (fallback `senha123456`);
  ex.: `admin@mgnautopecas.com.br` (tenant_admin) · `vendedor@mgnautopecas.com.br` (tenant_user).
- Front autentica via `apiJson`/`apiFetch` de `src/services/apiClient.ts` (injeta Bearer; 401 → evento de logout).

---

## 3. Pontos de atenção (LEIA — evita retrabalho e incidentes)

### 🔒 Segurança (área sensível, mudanças exigem confirmação)
1. **Nunca** exponha segredos no bundle front: variáveis `VITE_*` vão ao navegador.
   Senha master e chaves vivem **só no servidor** (`server/env.ts`, `accessControl.ts`).
2. Token de sessão é HMAC-SHA256 — não troque por JWT ingênuo sem revisão; `GATO_SESSION_SECRET` ≥48 chars.
3. Toda rota de negócio passa por `requireAuth` → `requirePermission`/`requireTenantPermission` → `resolveDataScope`. **Não crie rota sem esses 3** e sempre com `tenantId` no filtro (testes de isolamento: `GET /api/rbac/test-isolation`).
4. Webhook Asaas: valide assinatura/token **e** idempotência (`recordWebhookEvent`); `ASAAS_WEBHOOK_TOKEN` vazio = endpoint fechado.
5. Auditoria é obrigatória em ação sensível (`recordAudit`, PII mascarada). Achados em `PROJETO_SEGURANCA_AUDIT.md` — ex.: faltava audit em operações de `server/caixa.ts` (parcialmente coberto pelo trabalho da Fase A, **verificar**).
6. Rate limit só por IP (250/min) — **não há por tenant** (gap P0 conhecido).

### 🏗️ Multi-tenancy & dados
7. Modelo em memória (`Map` + `mirror()` para Postgres): sem `SUPABASE_DB_PASSWORD`, **tudo é volátil** — não teste persistência sem DB.
8. Seeds/demo (`identityStore`, `store`, `rbacEngine`) são hidratados no boot; nunca substitua os arrays, **mescle** (comentário no topo de `identityStore.ts` explica).
9. Capacidades finas (`tenantPermissions`) só restringem o menu quando **configuradas** — `undefined` mantém o gate por recurso RBAC (não "quebre" isso, quebra papéis legados).
10. Escopo de dados: SaaS-wide usa `own_tenant_only`/`full` + `audit_required` para dados de tenant (`company_data`, `customers_employees`).

### 🐛 Conhecidos / armadilhas
11. **Itens de menu sem view**: `relatorios` e `ordem-servico` existem no `Sidebar` mas **não têm render em `App.tsx`** nesta branch → tela em branco ao clicar. Ou se implementa a view, ou remove/alias o item (hoje `relatorios` deveria mapear para `financeiro`).
12. **NFC-e é stub** (`EmissaoNfe.tsx` → "feature em desenvolvimento") — Fase C do roadmap; não prometa emissão real sem integração fiscal homologada.
13. `.kilo/worktrees/*` são worktrees de outras branches — **ignore** em buscas/análises (duplicam resultados).
14. `vite.config.ts` tem HMR/watch desabilitáveis via `DISABLE_HMR` — não altere (regra do ambiente AI Studio).
15. O dev server **não observa** `server.ts` (tsx sem `--watch`): mudança em `server/**` exige **reiniciar** o processo (matar PID da porta 3000 e `npm run dev`). Front tem HMR automático.
16. `npm run lint` era bloqueado por erros pré-existentes de tipo em `caixaRoutes.ts` — **corrigidos em 01/10/2026**; se voltar a falhar, é regressão sua ou de novo código.
17. Checklist/estado do agente: workflow do `AGENTS.md` pede marcar `checklist-saas.md` e gerar `relatorio-gaps.md` — faça **antes** de propor código e **nunca altere código sem confirmar o plano**.
18. Worktree suja esperada: `server/caixa.ts`, `server/caixaRoutes.ts`, `src/App.tsx`, `src/components/Sidebar.tsx`, `src/utils/menuAccess.ts`, `src/types/caixa.ts` modificadas + `CaixaView.tsx` e `docs/roadmap-pdv.md` novos (Fase A) — commitar junto quando o time aprovar.

### ✅ Definição de pronto (DoD) mínimo
- `npm run lint` verde · `npm test` verde · feature com teste quando houver lógica de servidor ·
  `tenant_id` + auditoria onde aplicável · menu/RBAC consistente (`menuAccess.ts`) ·
  este handoff atualizado · confirmação do usuário para mudanças fora do escopo pedido.

---

## 4. Estado atual e próximos passos (ordem sugerida)

1. **Fase B — PDV venda**: carrinho no `BalcaoCotacao` com leitor de código de barras (HID),
   totalização, troco no fechamento e **vínculo automático venda → `POST /api/caixa/movements`**.
2. Testes de servidor para `server/caixa.ts` (abrir → movimentar → fechar → diferença) — exige DB ou mock do store.
3. **Fase C — NFC-e**: emissão/cancelamento/reimpressão (homologação SEFAZ).
4. Corrigir itens de menu órfãos (#11) — quick win de UX.
5. Avançar `docs/relatorio-gaps.md` (P0s de observabilidade: logs JSON, métricas, alertas).

> **Regra de ouro deste projeto:** primeiro o plano, depois o código; tenant, auditoria
> e teste em toda mudança de servidor; cobrança sempre pelo gateway; português em tudo.


