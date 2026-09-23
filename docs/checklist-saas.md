# Checklist SaaS — Padrão de Mercado

> Instrução para o agente: percorra o repositório, marque `[x]` no que já existe,
> deixe `[ ]` no que falta, e ao final gere um relatório de gaps priorizados.
> Considere "padrão de mercado" as práticas descritas em cada item.
>
> Estado atual marcado em 2026-09-23 por análise do repositório `gato-final`
> (React + Express + Supabase). `<!-- parcial: ... -->` indica que existe parte,
> mas falta o restante.
>
> ⚠️ Após esta marcação, as 5 tarefas prioritárias foram implementadas (ver
> `docs/relatorio-gaps.md` → "Atualização"). Itens afetados: migrations/persistência
> (F0/F1), gateway Asaas + webhook idempotente (F5/F6), e-mail + cron (F7),
> enforcement de quotas (F3) e CI/Docker/testes (F0/F10). Os `[ ]` abaixo ainda
> refletem o estado *pré-implementação*; atualizar as marcas item a item é a
> próxima etapa de manutenção.

## FASE 0 — Fundação do Projeto
- [x] Estrutura monorepo ou separação clara (backend / frontend / infra) — `src/` (React) + `server/` (Express) + `server.ts`
- [ ] Variáveis de ambiente via `.env` + validação com schema (zod/joi/pydantic) <!-- parcial: existe `.env.example` + `dotenv`, falta validação com schema (zod) -->
- [ ] Dockerfile + docker-compose para dev
- [ ] CI/CD (GitHub Actions / GitLab CI)
- [ ] Lint + formatter + pre-commit hooks <!-- parcial: só `tsc --noEmit` como lint; sem eslint/prettier/pre-commit -->
- [ ] Testes automatizados (unit + integration) com cobertura mínima definida <!-- parcial: bateria de testes de isolamento RBAC em runtime (`/api/rbac/test-isolation`); sem framework de testes unit/integration -->
- [ ] Migrations versionadas (Prisma, Knex, Alembic, Flyway)
- [x] Seeds para ambiente de dev — `src/data/initialData.ts` + `server/rbacEngine.ts` (em memória, não via migrations)

## FASE 1 — Multi-tenancy
- [x] Modelo de dados com `tenant_id` em todas as tabelas de negócio
- [x] Middleware que injeta `tenant_id` no contexto da request — `requireAuth` deriva o tenant do token assinado (nunca de headers)
- [x] Isolamento de queries (row-level security ou filtro obrigatório) — `resolveDataScope` no backend
- [x] Isolamento de arquivos por pasta/prefixo do tenant no storage — rotas de logo usam `:tenantId`
- [ ] Índices compostos começando por `tenant_id` <!-- parcial: coluna aplicada via backend; índices não definidos em migrations versionadas -->
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
- [ ] Tabela `planos` com: nome, preço, trial_dias, storage_mb, max_clientes, max_usuarios <!-- parcial: `SAAS_PLANS` em código (const), sem persistência e sem `trial_dias` explícito -->
- [ ] Tabela `uso` para métricas por tenant e período
- [ ] Serviço de verificação de quota antes de upload/cadastro <!-- parcial: `evaluateTenantQuota()` calcula, mas não bloqueia escrita -->
- [ ] Bloqueio + sugestão de upgrade ao exceder <!-- parcial: modelado (soft/hard block + template `limite_atingido`), não aplicado em runtime -->
- [ ] Job periódico que recalcula uso (evita inconsistência)
- [ ] Tela do Super Admin para CRUD de planos <!-- parcial: `POST /api/rbac/plans/change` existe; lista é estática, sem CRUD completo -->

## FASE 4 — Trial (Teste Grátis)
- [x] Ao cadastrar, criar tenant com `status = trial` e `trial_fim` — `register-company` cria `status: "trial"` (14 dias)
- [ ] E-mail de boas-vindas com data de fim do trial
- [ ] Cron diário: aviso 3 dias, 1 dia e no dia do fim
- [ ] Ao expirar sem pagamento: `status = expired` → modo somente leitura <!-- parcial: status `expired` não existe; só active/suspended/trial/blocked -->
- [ ] Após carência configurável: `status = suspended`
- [ ] Rota de conversão trial → pago

## FASE 5 — Gateway de Cobrança
- [ ] Escolha do gateway (Stripe, Asaas, Pagar.me, Mercado Pago, Iugu) <!-- parcial: conectores (Mercado Pago, Asaas…) listados como dados simulados em `initialData.ts`, sem SDK -->
- [ ] Criação de customer no gateway ao converter
- [ ] Criação de assinatura recorrente
- [ ] Suporte a cartão + Pix + boleto (conforme gateway)
- [ ] Salvar `gateway_customer_id` e `gateway_subscription_id` no banco
- [ ] Endpoint de webhook com validação de assinatura <!-- parcial: webhooks com HMAC (`requireIngestAuth`) para marketplaces/bancos, não para gateway de cobrança -->
- [ ] Idempotência nos webhooks (evitar processar evento duplicado)
- [ ] Log de todos os eventos recebidos <!-- parcial: log de auditoria genérico; sem log dedicado de eventos de webhook -->

## FASE 6 — Webhooks e Ciclo de Vida da Assinatura
- [ ] `invoice.paid` → fatura paga, assinatura `active`, estende próxima cobrança
- [ ] `invoice.payment_failed` → `past_due` + e-mail de cobrança
- [ ] `subscription.canceled` → `canceled` + bloqueio de acesso
- [ ] `subscription.updated` → sincroniza plano
- [ ] Retentativas de cobrança (dunning) configuradas no gateway
- [ ] Mapeamento claro de status: trial / active / past_due / suspended / canceled / expired <!-- parcial: apenas active/suspended/trial/blocked no tipo `TenantAccount` -->

## FASE 7 — Faturas e Notificações
- [ ] Tabela `faturas`: valor, vencimento, status, pago_em, link de pagamento
- [ ] Listagem de faturas no painel do tenant
- [ ] Cron diário para verificar vencimentos:
  - [ ] 3 dias antes
  - [ ] 1 dia antes
  - [ ] no dia
  - [ ] 1, 3 e 7 dias após
- [ ] E-mail HTML com variáveis (nome da empresa, valor, vencimento, link) <!-- parcial: `MESSAGE_TEMPLATES` com placeholders `{{tenantName}}`/`{{amount}}`; sem envio real de e-mail -->
- [ ] Enviar apenas para `tenant_admin` ou e-mail de cobrança configurável
- [ ] Fila de envio (Redis/SQS) + retry
- [ ] Log de envios (evitar duplicidade)
- [ ] Templates editáveis no Super Admin

## FASE 8 — Painel Super Admin
- [x] Lista de todos os tenants com filtros (status, plano, vencimento) <!-- parcial: lista completa; filtros limitados -->
- [x] Detalhe do tenant: uso, faturas, histórico, logs
- [ ] Ações: ativar, suspender, cancelar, alterar plano, dar desconto <!-- parcial: alterar plano (pró-rata) e simular persona; ativar/suspender/cancelar não implementados como ações completas -->
- [x] Impersonar tenant com log obrigatório — `switch-persona`/`end-impersonation` auditadas
- [ ] Dashboard: MRR, ARR, Churn, Inadimplência, Trials ativos
- [ ] Configurações globais: templates, integrações, chaves <!-- parcial: conectores/integrações configuráveis; templates de e-mail não editáveis -->

## FASE 9 — Painel Admin do Tenant
- [x] Dashboard de uso (storage, clientes, usuários) — `GET /api/rbac/quotas/:tenantId`
- [x] Plano atual + próxima cobrança <!-- parcial: plano atual exibido; sem próxima cobrança real -->
- [ ] Lista de faturas + download
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
