# Checklist SaaS — Padrão de Mercado

> Instrução para o agente: percorra o repositório, marque `[x]` no que já existe,
> deixe `[ ]` no que falta, e ao final gere um relatório de gaps priorizados.
> Considere "padrão de mercado" as práticas descritas em cada item.
>
> Estado marcado em 2026-09-23 (após a implementação das 5 tarefas prioritárias).
> `<!-- parcial: ... -->` indica que existe parte, mas falta o restante.

## FASE 0 — Fundação do Projeto
- [x] Estrutura monorepo ou separação clara (backend / frontend / infra) — `src/` (React) + `server/` (Express) + `server.ts`
- [ ] Variáveis de ambiente via `.env` + validação com schema (zod/joi/pydantic) <!-- parcial: existe `.env.example` + `dotenv`, falta validação com schema (zod) -->
- [x] Dockerfile + docker-compose para dev
- [x] CI/CD (GitHub Actions / GitLab CI) — `.github/workflows/ci.yml`
- [ ] Lint + formatter + pre-commit hooks <!-- parcial: só `tsc --noEmit` como lint; sem eslint/prettier/pre-commit -->
- [ ] Testes automatizados (unit + integration) com cobertura mínima definida <!-- parcial: 14 testes unit (`node:test` via tsx); sem testes de integração nem cobertura mínima -->
- [x] Migrations versionadas (Prisma, Knex, Alembic, Flyway) — `db/migrations/*.sql` + `server/migrate.ts`
- [x] Seeds para ambiente de dev — `src/data/initialData.ts` + `server/rbacEngine.ts` + `server/store.ts` (em memória)

## FASE 1 — Multi-tenancy
- [x] Modelo de dados com `tenant_id` em todas as tabelas de negócio
- [x] Middleware que injeta `tenant_id` no contexto da request — `requireAuth` deriva o tenant do token assinado (nunca de headers)
- [x] Isolamento de queries (row-level security ou filtro obrigatório) — `resolveDataScope` no backend
- [x] Isolamento de arquivos por pasta/prefixo do tenant no storage — rotas de logo usam `:tenantId`
- [x] Índices compostos começando por `tenant_id` <!-- parcial: migration 0001 cria índices por `tenantId` (coluna única) nas tabelas de billing; índices compostos das tabelas de negócio não versionados -->
- [x] Testes de isolamento entre tenants — `runSecurityIsolationTests()` (`/api/rbac/test-isolation`)

## FASE 2 — Autenticação e Autorização
- [x] Autenticação (JWT, sessão ou provedor externo) — token de sessão assinado HMAC-SHA256
- [ ] Refresh token com rotação
- [ ] 2FA para super_admin e tenant_admin <!-- parcial: modelo `mfaEnabled`/`mfaEnforced`/`requiresMfa`; sem fluxo real de verificação 2FA (TOTP) -->
- [x] RBAC com papéis: `super_admin`, `tenant_admin`, `usuario_comum` (+ `saas_*`, `tenant_user`, `tenant_readonly`)
- [x] Middleware de autorização por rota — `requirePermission`/`requireAnyPermission`/`requireSaasScope`
- [x] Log de auditoria em toda ação sensível (quem, o quê, quando, IP) — `recordAudit` com PII mascarada
- [ ] Rate limiting por tenant e por IP <!-- parcial: rate limit por IP em memória (250/min); sem rate limit por tenant -->

## FASE 3 — Planos e Quotas
- [ ] Tabela `planos` com: nome, preço, trial_dias, storage_mb, max_clientes, max_usuarios <!-- parcial: tabela `SaaSPlan` na migration 0001; `SAAS_PLANS` ainda é a fonte em código -->
- [x] Tabela `uso` para métricas por tenant e período — `TenantUsage` + `server/store.ts`
- [x] Serviço de verificação de quota antes de upload/cadastro — `checkQuota` em `server/quotas.ts`
- [x] Bloqueio + sugestão de upgrade ao exceder — resposta `402 QUOTA_EXCEEDED` com `suggestion: upgrade`
- [ ] Job periódico que recalcula uso (evita inconsistência)
- [ ] Tela do Super Admin para CRUD de planos <!-- parcial: `POST /api/rbac/plans/change` existe; lista é estática, sem CRUD completo -->

## FASE 4 — Trial (Teste Grátis)
- [x] Ao cadastrar, criar tenant com `status = trial` e `trial_fim` — `register-company` cria `status: "trial"` (14 dias)
- [ ] E-mail de boas-vindas com data de fim do trial <!-- parcial: template `trial_welcome` existe; não é disparado no cadastro -->
- [x] Cron diário: aviso 3 dias, 1 dia e no dia do fim — `checkTrials()` em `server/notifications/cron.ts`
- [x] Ao expirar sem pagamento: `status = expired` → modo somente leitura <!-- enforcement no middleware: `expired` libera leitura e devolve 402 `SUBSCRIPTION_EXPIRED` em escrita -->
- [ ] Após carência configurável: `status = suspended`
- [x] Rota de conversão trial → pago — `POST /api/billing/subscribe`

## FASE 5 — Gateway de Cobrança
- [x] Escolha do gateway (Stripe, Asaas, Pagar.me, Mercado Pago, Iugu) <!-- parcial: Asaas implementado (`server/billing/asaas.ts`); demais gateways não -->
- [x] Criação de customer no gateway ao converter — `ensureAsaasCustomer`
- [x] Criação de assinatura recorrente — `createAsaasSubscription`
- [x] Suporte a cartão + Pix + boleto (conforme gateway) — `billingType` BOLETO/PIX/CREDIT_CARD
- [x] Salvar `gateway_customer_id` e `gateway_subscription_id` no banco — `TenantSubscription` + `GatewayCustomer`
- [x] Endpoint de webhook com validação de assinatura — `POST /api/billing/webhooks/asaas` (token `asaas-access-token`)
- [x] Idempotência nos webhooks (evitar processar evento duplicado) — `WebhookEvent` + `recordWebhookEvent`
- [x] Log de todos os eventos recebidos — tabela `WebhookEvent`

## FASE 6 — Webhooks e Ciclo de Vida da Assinatura
- [x] `invoice.paid` → fatura paga, assinatura `active`, estende próxima cobrança — `applyGatewayPaymentEvent`
- [x] `invoice.payment_failed` → `past_due` + e-mail de cobrança <!-- parcial: status `past_due`; e-mail de cobrança via cron de vencimento -->
- [x] `subscription.canceled` → `canceled` + bloqueio de acesso <!-- enforcement no middleware: `canceled`/`suspended` devolvem 403 e bloqueiam leitura e escrita -->
- [ ] `subscription.updated` → sincroniza plano <!-- parcial: `SUBSCRIPTION_UPDATE` mapeia para `active`; não sincroniza plano -->
- [ ] Retentativas de cobrança (dunning) configuradas no gateway
- [x] Mapeamento claro de status: trial / active / past_due / suspended / canceled / expired — `SubscriptionStatus` + `mapAsaasEventToStatus`

## FASE 7 — Faturas e Notificações
- [x] Tabela `faturas`: valor, vencimento, status, pago_em, link de pagamento — `Invoice` + `server/store.ts`
- [x] Listagem de faturas no painel do tenant — `AssinaturaFaturas` + `GET /api/billing/invoices`
- [x] Cron diário para verificar vencimentos:
  - [x] 3 dias antes
  - [x] 1 dia antes
  - [x] no dia
  - [x] 1, 3 e 7 dias após
- [ ] E-mail HTML com variáveis (nome da empresa, valor, vencimento, link) <!-- parcial: templates de texto com `{{variaveis}}` + render; sem corpo HTML -->
- [x] Enviar apenas para `tenant_admin` ou e-mail de cobrança configurável — usa `contactEmail` do tenant
- [ ] Fila de envio (Redis/SQS) + retry
- [x] Log de envios (evitar duplicidade) — `EmailLog` + `dedupeKey`
- [ ] Templates editáveis no Super Admin

## FASE 8 — Painel Super Admin
- [x] Lista de todos os tenants com filtros (status, plano, vencimento) <!-- parcial: lista completa; filtros limitados -->
- [x] Detalhe do tenant: uso, faturas, histórico, logs
- [ ] Ações: ativar, suspender, cancelar, alterar plano, dar desconto <!-- parcial: alterar plano (pró-rata), cancelar (billing) e simular persona; ativar/suspender não implementados -->
- [x] Impersonar tenant com log obrigatório — `switch-persona`/`end-impersonation` auditadas
- [x] Dashboard: MRR, ARR, Churn, Inadimplência, Trials ativos — `DashboardFinanceiroSaaS`
- [ ] Configurações globais: templates, integrações, chaves <!-- parcial: conectores/integrações configuráveis; templates de e-mail não editáveis -->

## FASE 9 — Painel Admin do Tenant
- [x] Dashboard de uso (storage, clientes, usuários) — `GET /api/rbac/quotas/:tenantId`
- [x] Plano atual + próxima cobrança — `AssinaturaFaturas` (plano + `currentPeriodEndsAt`)
- [ ] Lista de faturas + download <!-- parcial: lista de faturas em `AssinaturaFaturas`; sem download -->
- [ ] Atualizar cartão / método de pagamento
- [ ] Upgrade / Downgrade com cálculo proporcional <!-- parcial: `plans/change` com pró-rata existe, mas restrito ao escopo SaaS (sem self-service do tenant) -->
- [x] Gestão de usuários e permissões
- [ ] Configurar e-mail de cobrança
- [x] Central de avisos — mensagens internas (`/api/rbac/messages`)

## FASE 10 — Observabilidade e Operação
- [ ] Logs estruturados (JSON) com correlação por request
- [ ] Métricas (Prometheus / OpenTelemetry)
- [ ] Alertas de erro (Sentry / Datadog)
- [x] Healthcheck endpoints — `GET /api/health`
- [ ] Backups automáticos do banco + storage <!-- parcial: depende do backup gerenciado do Supabase; sem configuração no repositório -->
- [ ] Plano de disaster recovery documentado
- [ ] Painel de status público (opcional, mas recomendado)

## FASE 11 — Segurança e Conformidade
- [ ] LGPD: consentimento, direito ao esquecimento, export de dados <!-- parcial: fluxos de export/anonymize registrados (pendentes) + mascaramento de PII; consentimento/revoke incompletos -->
- [ ] Criptografia em repouso e em trânsito <!-- parcial: TLS forçado (SSL com validação); repouso delegado ao Supabase -->
- [ ] Secrets em vault (não no `.env` de produção)
- [x] Política de senhas fortes — `isStrongPassword`
- [ ] Revisão de dependências (Dependabot / Snyk)
- [ ] Pentest ou revisão de segurança antes de lançar <!-- parcial: skills de pentest (Strix) em `.agents/skills`; sem relatório executado -->
- [ ] Termos de uso e política de privacidade publicados

## FASE 12 — Experiência do Cliente
- [ ] Onboarding guiado (checklist inicial) <!-- parcial: cadastro self-service (`register-company`); sem checklist guiado pós-login -->
- [ ] Tour interativo na primeira sessão
- [ ] Central de ajuda / docs
- [x] Suporte in-app (chat ou ticket) — `SuporteChatIA` (Gemini)
- [ ] Feedback de uso (NPS, churn survey ao cancelar)
