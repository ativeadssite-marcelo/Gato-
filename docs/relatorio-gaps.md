# Relatório de Gaps — GATO SaaS

> Gerado em 2026-09-23 por análise do repositório (sem alteração de código).
> Fonte: `docs/checklist-saas.md` e `docs/arquitetura-saas.mmd`.

## ✅ Atualização — implementado em 2026-09-23

As 5 tarefas prioritárias foram implementadas e verificadas (typecheck limpo,
**14 testes passando**, build de produção sem erros):

1. **Persistência + migrations** — `db/migrations/0001_saas_billing.sql`,
   `server/migrate.ts` (runner transacional) e `server/store.ts` (domínio de
   billing em memória + espelho best-effort no Postgres).
2. **Gateway de cobrança (Asaas)** — `server/billing/` com cliente HTTP real,
   lógica de assinatura (pró-rata, trial→pago, ciclo de status) e webhook com
   **validação de assinatura + idempotência**.
3. **E-mail transacional + cron** — `server/notifications/` com adaptadores
   `console`/`sendgrid`, templates com variáveis e cron de vencimento/trial.
4. **Enforcement de quotas** — `server/quotas.ts` (`checkQuota`/`incrementUsage`)
   instrumentado em products/customers/logo (bloqueio `402` + sugestão de upgrade).
5. **CI/CD + Docker + testes** — `Dockerfile`, `docker-compose.yml`,
   `.github/workflows/ci.yml` e 14 testes unitários (`node:test` via `tsx`).

Pendências conhecidas:
- Schema ainda sem smoke test contra um Postgres real (sem credenciais neste ambiente).
- Asaas/SendGrid aguardam as chaves reais (`ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN`, `SENDGRID_API_KEY`).
- UI de faturas no painel do tenant e dashboard financeiro SaaS (MRR/Churn) ainda não construídas.

## Resumo geral

| Métrica | Qtd |
|---|---|
| Total de itens | 88 |
| ✅ Feito (`[x]`) | 20 |
| 🟡 Parcial (`<!-- parcial -->`) | 23 |
| ❌ Pendente (`[ ]`) | 45 |

O GATO tem uma **fundação de segurança e multi-tenancy forte e fora da curva**
(RBAC granular de 9 papéis, sessão assinada HMAC, auditoria com mascaramento de
PII, testes de isolamento em runtime). O gap concentra-se em **tudo que está
depois da autenticação**: cobrança real, ciclo de vida da assinatura, faturas,
e-mail transacional, cron de vencimento, persistência/migrations, CI/CD e
observabilidade.

## Resumo por fase

| Fase | Feito | Parcial | Pendente | Diagnóstico |
|---|---|---|---|---|
| 0 — Fundação | 2 | 3 | 3 | Sem Docker/CI/migrations/testes/README |
| 1 — Multi-tenancy | 5 | 1 | 0 | ✅ Forte (filtro server-side + testes de isolamento) |
| 2 — Auth & RBAC | 4 | 2 | 1 | ✅ Forte (falta 2FA real + refresh token + rate por tenant) |
| 3 — Planos & Quotas | 0 | 3 | 3 | ⚠️ Modelado, mas sem persistência nem enforcement |
| 4 — Trial | 1 | 0 | 5 | ⚠️ Só cria o trial; sem e-mail/cron/expiração |
| 5 — Gateway de Cobrança | 0 | 3 | 5 | ❌ Apenas dados simulados, sem SDK/webhook de billing |
| 6 — Ciclo de vida da assinatura | 0 | 0 | 6 | ❌ Inexistente |
| 7 — Faturas & Notificações | 0 | 1 | 7 | ❌ Sem tabela de faturas nem envio de e-mail |
| 8 — Super Admin | 2 | 3 | 1 | 🟡 Boa cobertura de governança; sem dashboard financeiro |
| 9 — Admin Tenant | 3 | 2 | 3 | 🟡 Uso/usuários/avisos ok; sem faturas/cartão/upgrade self-service |
| 10 — Observabilidade | 1 | 1 | 5 | ❌ Só healthcheck |
| 11 — Segurança & LGPD | 1 | 3 | 3 | 🟡 Bons controles; faltam vault, deps, termos |
| 12 — Experiência | 1 | 1 | 3 | 🟡 Suporte in-app ok; sem onboarding/tour/NPS |

## Priorização

### P0 — Crítico (bloqueia operação real como SaaS)

1. **Persistência real + migrations versionadas.** Tenants, usuários, RBAC,
   auditoria e planos hoje vivem em arrays em memória (`rbacEngine.ts`,
   `auth.ts`) — um restart perde cadastros e trilha. Migrar para Supabase/Postgres
   com migrations versionadas.
2. **Integração com gateway de cobrança real** (Asaas ou Mercado Pago para
   Pix/boleto, Stripe para cartão) + **webhook assinado e idempotente**
   (`invoice.paid` / `invoice.payment_failed` / `subscription.canceled`).
3. **Ciclo de vida da assinatura** com status completos
   (`trial → active → past_due → suspended/canceled/expired`) e **enforcement de
   acesso** (bloqueio real, não só visual).
4. **E-mail transacional + cron diário** (boas-vindas, avisos de vencimento
   3/1/0/1/3/7 dias, cobrança). Hoje os templates existem, mas nada é enviado.
5. **Enforcement de quotas em runtime** + tabela `uso` real (bloquear
   upload/cadastro ao exceder) — hoje `evaluateTenantQuota()` usa contadores
   hardcoded e não bloqueia escrita.
6. **CI/CD + suíte de testes** (Vitest/Jest) e **Docker/docker-compose**.

### P1 — Importante (qualidade/segurança de produção)

- 2FA/MFA real (TOTP) + rotação de refresh token.
- Tabela `faturas` + painel de faturas no tenant + link de pagamento/download.
- Dashboard financeiro SaaS: MRR, ARR, Churn, Inadimplência, Trials ativos.
- CRUD de planos no Super Admin + templates de e-mail editáveis.
- Rate limiting por tenant; observabilidade (logs JSON, Sentry, métricas
  Prometheus/OTel); secrets em vault.

### P2 — Desejável (maturidade/experiência)

- Onboarding guiado + tour, central de ajuda, NPS/churn survey.
- Painel de status público, DR documentado, Dependabot/Snyk, termos de uso e
  política de privacidade publicados.

## Próximas 5 tarefas recomendadas

1. **Migrations versionadas + persistência real** — criar schema Supabase
   (`tenants`, `planos`, `uso`, `faturas`, `assinaturas`, `audit_log`,
   `users`) e substituir os arrays em memória por leitura/escrita no Postgres.
2. **Integrar gateway de cobrança (Asaas)** — customer + assinatura recorrente,
   salvar `gateway_customer_id`/`gateway_subscription_id`, endpoint de webhook
   com validação de assinatura e idempotência.
3. **Serviço de e-mail transacional (SES/SendGrid)** + **cron diário** de
   vencimento/fatura (3/1/0/1/3/7 dias) com fila + retry e log de envio.
4. **Enforce de quotas em runtime** — tabela `uso` real, verificação antes de
   upload/cadastro, soft/hard block efetivo e job de recálculo.
5. **Pipeline CI/CD + suíte de testes + Docker** — Vitest para unit/integration,
   GitHub Actions e docker-compose de dev.

## Observações de contexto

- A arquitetura já cobre muito do "padrão de mercado" nas Fases 1 e 2
  (multi-tenancy e RBAC) — isso é um diferencial que reduz o risco dos itens
  P0 acima a "persistência e cobrança", não a "redesenho de segurança".
- Os itens de billing hoje são **simulados** (`initialData.ts` lista conectores
  Mercado Pago/Asaas como dados, sem SDK). Não há cartão sendo processado no
  backend — o que respeita a regra "cobrança sempre via gateway".
- A bateria `runSecurityIsolationTests()` (`/api/rbac/test-isolation`) é valiosa,
  mas roda em runtime; deve ser portada para a suíte de testes automatizados.
