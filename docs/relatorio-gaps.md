# Relatório de Gaps — GATO SaaS

> Geração automática baseada no checklist-saas.md (estado: 2026-09-23).
> Itens `[x]` = implementados | Itens `[ ]` = pendentes | Itens `<!-- parcial: ... -->` = parcialmente implementados.

## Resumo por Fase

| Fase | Total | Concluídos | Pendentes | Parciais | P0 Crítico | P1 Importante | P2 Desejável |
|------|-------|------------|-----------|----------|------------|---------------|--------------|
| FASE 0 — Fundação | 8 | 5 | 2 | 1 | 3 | 2 | 0 |
| FASE 1 — Multi-tenancy | 7 | 7 | 0 | 0 | 0 | 0 | 0 |
| FASE 2 — Autenticação e Autorização | 7 | 5 | 1 | 1 | 2 | 2 | 0 |
| FASE 3 — Planos e Quotas | 7 | 4 | 1 | 2 | 2 | 2 | 0 |
| FASE 4 — Trial | 7 | 5 | 1 | 1 | 1 | 1 | 0 |
| FASE 5 — Gateway de Cobrança | 8 | 8 | 0 | 0 | 0 | 0 | 0 |
| FASE 6 — Webhooks e Ciclo de Vida | 7 | 6 | 0 | 1 | 1 | 0 | 0 |
| FASE 7 — Faturas e Notificações | 9 | 6 | 1 | 2 | 2 | 2 | 0 |
| FASE 8 — Painel Super Admin | 6 | 5 | 0 | 1 | 1 | 0 | 0 |
| FASE 9 — Painel Admin do Tenant | 9 | 6 | 2 | 1 | 2 | 2 | 0 |
| FASE 10 — Observabilidade e Operação | 8 | 1 | 5 | 2 | 5 | 2 | 0 |
| FASE 11 — Segurança e Conformidade | 8 | 1 | 3 | 4 | 4 | 3 | 0 |
| FASE 12 — Experiência do Cliente | 5 | 1 | 3 | 1 | 1 | 2 | 0 |
| **TOTAL** | **87** | **58** | **19** | **16** | **26** | **18** | **0** |

---

## Gaps Prioritizados (P0 Crítico)

| # | Item | Fase | Descrição |
|---|------|------|-----------|
| 1 | Variáveis de ambiente via `.env` + validação com schema (zod) | FASE 0 | Validação manual atual; falta schema estruturado com Zod para falha rápida em produção |
| 2 | Testes automatizados (unit + integration) com cobertura mínima | FASE 0 | 14 testes unitários isolados; não há testes de integração nem cobertura mínima definida |
| 3 | Rate limiting por tenant | FASE 2 | Rate limit por IP em memória (250/min) existe; não há rate limit por tenant isolado |
| 4 | 2FA para super_admin e tenant_admin | FASE 2 | Modelo `mfaEnabled`/`mfaEnforced`/`requiresMfa` existe; sem fluxo real de verificação TOTP |
| 5 | Job periódico que recalcula uso | FASE 3 | Necessário para evitar inconsistência de uso ao longo do tempo |
| 6 | After-hold: status = suspended após carência configurável | FASE 4 | Fluxo não implementado; status atual vai apenas `expired` → somente leitura |
| 7 | E-mail de boas-vindas com data de fim do trial | FASE 4 | Template `trial_welcome` existe; não é disparado no cadastro de empresa |
| 8 | Logs estruturados (JSON) com correlação por request | FASE 10 | Não implementado; necessidade de estruturação para observabilidade |
| 9 | Métricas (Prometheus / OpenTelemetry) | FASE 10 | Não implementado; necessário para monitoramento de produção |
| 10 | Alertas de erro (Sentry / Datadog) | FASE 10 | Não implementado; necessário para detecção proativa de falhas |

---

## Gaps Prioritizados (P1 Importante)

| # | Item | Fase | Descrição |
|---|------|------|-----------|
| 1 | Lint + formatter + pre-commit hooks | FASE 0 | Apenas `tsc --noEmit` como lint; não há ESLint/Prettier/hooks de pre-commit |
| 2 | 2FA fluxo real (TOTP) | FASE 2 | Modelo existe; falta implementação do fluxo de verificação TOTP |
| 3 | Rate limiting por tenant | FASE 2 | Inexistente; precisa ser implementado junto com o por IP |
| 4 | Tabela `planos` com campos completos | FASE 3 | `SAAS_PLANS` é fonte em código; tabela migration 0001 tem estrutura limitada |
| 5 | Job periódico de recálculo de uso | FASE 3 | Evita inconsistência de uso ao longo do tempo |
| 6 | Status `suspended` após carência | FASE 4 | Implementar fluxo após `expired` |
| 7 | E-mail de boas-vindas trial | FASE 4 | Template existe; disparo no cadastro não implementado |
| 8 | `subscription.updated` → sincroniza plano | FASE 6 | `SUBSCRIPTION_UPDATE` mapeia para `active`; não sincroniza plano no backend |
| 9 | E-mail HTML com variáveis | FASE 7 | Templates de texto existem; não há corpo HTML com `{{variaveis}}` |
| 10 | Fila de envio (Redis/SQS) + retry | FASE 7 | Envio direto sem fila; necessário para confiabilidade |
| 11 | Ações Super Admin: ativar, suspender, cancelar, alterar plano, dar desconto | FASE 8 | `ativar`/`suspender` não implementados; `alterar plano` limitado a pró-rata |
| 12 | Configurar e-mail de cobrança | FASE 9 | Inexistente; necessário para notificações personalizadas |
| 13 | Upgrade/Downgrade com cálculo proporcional (self-service tenant) | FASE 9 | `plans/change` com pró-rata existe, mas restrito ao escopo SaaS; não é self-service |
| 14 | Templates editáveis no Super Admin | FASE 8 | Templates de e-mail não editáveis via painel |
| 15 | Lista de faturas + download no painel do tenant | FASE 9 | Lista existe em `AssinaturaFaturas`; não há download/PDF |
| 16 | Logs estruturados (JSON) com correlação por request | FASE 10 | Necessário para operabilidade em produção |
| 17 | Painel de status público | FASE 11 | Opcional, mas recomendado para transparência |

---

## Gaps Prioritizados (P2 Desejável)

| # | Item | Fase | Descrição |
|---|------|------|-----------|
| 1 | Secrets em vault (não no `.env` de produção) | FASE 11 | Boa prática de segurança; não implementado |
| 2 | Revisão de dependências (Dependabot / Snyk) | FASE 11 | Não configurado; necessário para segurança da supply chain |
| 3 | Pentest ou revisão de segurança antes de lançar | FASE 11 | Skills Strix disponíveis; nenhum relatório executado |
| 4 | Termos de uso e política de privacidade publicados | FASE 11 | Necessário conformidade LGPD e confiança do cliente |
| 5 | Onboarding guiado (checklist inicial) | FASE 12 | Cadastro self-service existe; sem checklist guiado pós-login |
| 6 | Tour interativo na primeira sessão | FASE 12 | Não implementado |
| 7 | Central de ajuda / docs | FASE 12 | Não existe público interno/externo |
| 8 | Feedback de uso (NPS, churn survey ao cancelar) | FASE 12 | Não implementado |

---

## Próximas 5 Tarefas para o Time

1. **Implementar validação de ambiente com schema Zod** (FASE 0, P0) — Substituir validação manual em `server/env.ts` por schema-based validation using Zod (já há import do Zod, basta criar schema e validar no startup).

2. **Adicionir testes de integração com cobertura mínima** (FASE 0, P0) — Criar suíte de testes de integração que cobre fluxos críticos (auth, trial, billing) e definir cobertura mínima (ex: 80%).

3. **Implementar rate limit por tenant** (FASE 2, P0) — Estender o rate limiter existente para incluir `tenantId` no key, evitando que um tenant consome o limite completo de outro.

4. **Implementar fluxo 2FA (TOTP) para super_admin e tenant_admin** (FASE 2, P0) — Implementar geração e verificação de códigos TOTP (RFC 6238) com suportes a `mfaEnabled`, `mfaEnforced` e `requiresMfa`.

5. **Criar job periódico que recalcula uso de quotas** (FASE 3, P0) — Agendar execução diária/semanal do recálculo de `TenantUsage` para evitar inconsistências ao longo do tempo, especialmente após operações de upgrade/downgrade.

---