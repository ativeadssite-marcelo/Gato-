# Relatório de Gaps — GATO SaaS

> Gerado em 2026-09-23 por análise do repositório (sem alteração de código).
> Fonte: `docs/checklist-saas.md` e `docs/arquitetura-saas.mmd`.

## ✅ Atualização — implementado em 2026-09-23

As 5 tarefas prioritárias foram implementadas e verificadas (typecheck limpo,
**20 testes passando**, build de produção sem erros):

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
   `.github/workflows/ci.yml` e testes unitários (`node:test` via `tsx`).

**Enforcement de acesso por status da assinatura (2026-09-23):** o middleware
`requireAuth` agora bloqueia o acesso no servidor — `expired` vira somente leitura
(402 `SUBSCRIPTION_EXPIRED` em escrita), `suspended`/`canceled` bloqueiam tudo
(403), com trilha de auditoria. O frontend espelha a regra: `App.tsx` consulta
`/api/billing/subscription` e renderiza `SubscriptionBlockedScreen` (reativação
self-service para o admin do tenant) em vez do app. Escopo SaaS e autosserviço
(`/api/auth`, `/api/billing`) permanecem isentos para permitir reativação.

Pendências conhecidas:
- Schema ainda sem smoke test contra um Postgres real (sem credenciais neste ambiente).
- Asaas/SendGrid aguardam as chaves reais (`ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN`, `SENDGRID_API_KEY`).
- Sem transição automática para `suspended` (após carência) — só o bloqueio já está pronto.

## Resumo geral

| Métrica | Qtd |
|---|---|
| Total de itens | 88 |
| ✅ Feito (`[x]`) | 50 |
| 🟡 Parcial (`<!-- parcial -->`) | 19 |
| ❌ Pendente (`[ ]`) | 19 |

O GATO tem uma **fundação de segurança e multi-tenancy forte e fora da curva**
(RBAC granular de 9 papéis, sessão assinada HMAC, auditoria com mascaramento de
PII, isolamento em runtime, enforcement de assinatura e quotas). O gap restante
concentra-se em **maturidade de operação**: observabilidade, sessão (refresh +
2FA), self-service de faturas e conformidade (LGPD/vault/deps).

## Resumo por fase

| Fase | Feito | Parcial | Pendente | Diagnóstico |
|---|---|---|---|---|
| 0 — Fundação | 5 | 3 | 0 | 🟡 Docker/CI/migrations/seeds ok; falta env com schema (zod), lint/eslint e testes de integração/cobertura |
| 1 — Multi-tenancy | 6 | 0 | 0 | ✅ Completa (filtro server-side + testes de isolamento) |
| 2 — Auth & RBAC | 4 | 2 | 1 | 🟡 Sólida; falta refresh token com rotação, 2FA TOTP real e rate limit por tenant |
| 3 — Planos & Quotas | 3 | 2 | 1 | 🟡 Enforcement em runtime ok; falta CRUD de planos completo e job de recálculo |
| 4 — Trial | 4 | 1 | 1 | ✅ Ciclo + enforcement de expiração ligados; falta e-mail de boas-vindas e transição p/ suspended |
| 5 — Gateway de Cobrança | 8 | 0 | 0 | ✅ Asaas completo (customer, assinatura, webhook assinado + idempotente) |
| 6 — Ciclo de vida | 4 | 1 | 1 | ✅ Status + bloqueio de cancelamento; falta sincronizar plano em `subscription.updated` |
| 7 — Faturas & Notificações | 5 | 1 | 2 | 🟡 Faturas + cron ok; falta fila com retry, templates editáveis e corpo HTML |
| 8 — Super Admin | 4 | 2 | 0 | 🟡 Governança + dashboard financeiro; falta ativar/suspender e configs globais |
| 9 — Admin Tenant | 4 | 2 | 2 | 🟡 Uso/plano/faturas/usuários ok; falta download, cartão, upgrade self-service e e-mail de cobrança |
| 10 — Observabilidade | 1 | 1 | 5 | ❌ Só healthcheck; logs JSON, métricas, alertas, backups, DR e status público pendentes |
| 11 — Segurança & LGPD | 1 | 3 | 3 | 🟡 Bons controles; faltam vault, revisão de deps, termos e LGPD completo |
| 12 — Experiência | 1 | 1 | 3 | 🟡 Suporte in-app ok; sem onboarding/tour/help/NPS |

## Priorização

### P0 — Crítico (bloqueia operação real como SaaS)

A lista P0 original foi **zerada** (persistência, gateway, ciclo de vida,
e-mail, quotas e CI/CD). Os itens abaixo são o que falta para operar em
produção com confiança:

1. **Observabilidade** — logs estruturados (JSON) com `requestId` de correlação,
   métricas Prometheus/OpenTelemetry e alertas de erro (Sentry). Hoje só existe
   `GET /api/health`.
2. **Fila de envio de e-mail com retry** — hoje o cron escreve no log de envio,
   mas não há fila (Redis/SQS) nem retry confiável para falhas transitórias.
3. **Refresh token com rotação** — sessões longas hoje dependem de um único token;
   falta o par access/refresh com revogação e rotação.

### P1 — Importante (qualidade/segurança de produção)

- 2FA/MFA real (TOTP) para `super_admin` e `tenant_admin`.
- Painel de faturas self-service: download, atualizar cartão, upgrade/downgrade
  com pró-rata pelo próprio tenant, e-mail de cobrança configurável.
- Job periódico de recálculo de uso + transição automática `trial → suspended`
  após carência.
- Secrets em vault + revisão de dependências (Dependabot/Snyk).

### P2 — Desejável (maturidade/experiência)

- Onboarding guiado + tour, central de ajuda, NPS/churn survey.
- Termos de uso e política de privacidade publicados; DR documentado; painel de
  status público.

## Próximas 5 tarefas recomendadas

1. **Observabilidade** — logs JSON com `requestId`, métricas Prometheus/OTel e
   alertas de erro (Sentry) com correlação por request.
2. **Refresh token com rotação + 2FA (TOTP) real** — Fase 2; hoje 2FA é só modelo.
3. **Painel de faturas self-service** — download de faturas, atualizar cartão,
   upgrade/downgrade self-service e e-mail de cobrança configurável (Fase 9).
4. **Fila de e-mail com retry + transição `trial → suspended`** — Fase 7/4.
5. **LGPD + hardening** — consentimento/export/anonymize, secrets em vault,
   revisão de dependências e termos publicados (Fase 11).

## Observações de contexto

- A arquitetura já cobre o "padrão de mercado" nas Fases 1, 2 e 5
  (multi-tenancy, RBAC e gateway) — isso reduz o risco residual a "operação e
  conformidade", não a "redesenho de segurança".
- Os itens de billing usam o Asaas como gateway; não há cartão processado no
  backend — respeita a regra "cobrança sempre via gateway".
- A bateria `runSecurityIsolationTests()` (`/api/rbac/test-isolation`) é valiosa,
  mas roda em runtime; deve ser portada para a suíte de testes automatizados.
