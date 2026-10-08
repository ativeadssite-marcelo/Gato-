# Relatório de Gaps (SaaS)

> Última revisão: **08/10/2026** (o commit do trabalho de 02/10 e o modo base limpa foram
> fechados; a lista vencida sobre árvore suja saiu).

## Resumo por Fase

- **FASE 0 — Fundação do Projeto:** Parcial (falta validação zod de env, formatação/lint integrados, testes com coverage)
- **FASE 1 — Multi-tenancy:** Feito
- **FASE 2 — Autenticação e Autorização:** Parcial (falta 2FA, refresh token e rate limit por tenant)
- **FASE 3 — Planos e Quotas:** Parcial (falta tabela db para planos e sync com código, job de recálculo e CRUD no Admin)
- **FASE 4 — Trial:** Parcial (falta e-mail de boas-vindas e suspensão pós-carência)
- **FASE 5 — Gateway de Cobrança:** Feito
- **FASE 6 — Webhooks e Ciclo de Vida da Assinatura:** Parcial (falta sync de `subscription.updated` e dunning)
- **FASE 7 — Faturas e Notificações:** Parcial (falta e-mails em HTML, fila SQS/Redis e templates editáveis)
- **FASE 8 — Painel Super Admin:** Parcial (faltam ações de ativar/suspender tenants e configurações globais)
- **FASE 9 — Painel Admin do Tenant:** Parcial (falta self-service de upgrade/downgrade, download de fatura, e alteração de cartão)
- **FASE 10 — Observabilidade e Operação:** Pendente (falta logs estruturados, métricas, alertas, backups e plano DR)
- **FASE 11 — Segurança e Conformidade:** Pendente (falta LGPD, secretos em vault, deps check, pentest validado e termos)
- **FASE 12 — Experiência do Cliente:** Pendente (falta onboarding, tour guiado e feedback)

## Lista Priorizada de Ações

### P0 (Crítico)
1. **Ligar o front na API (bloqueio do teste real):** o app inicializa as entidades de movimento
   das constantes de `src/data/initialData.ts` e não lê nada do banco — ver §3.19 da handoff.
   Sem isso não existe cadastro real nem teste de ponta a ponta. **Frente em andamento desde 08/10.**
2. **Correção dos 3 P0 de Segurança (PDV e Billing):**
   - **P0-4**: Cartão/PIX sendo contado como dinheiro (`issueReceipt` gravando `sale_cash` indevidamente).
   - **P0-5**: Replay de webhook reativando assinatura inadimplente.
   - **P0-6**: Autoativação de plano pago ignorando gateway.
3. **Deploy de Teste (.env.production):** Injetar configurações obrigatórias para DB, master password, gateway Asaas e session secret.

### P1 (Importante)
4. **Rate Limit por Tenant e Validação de `.env` (Zod):** Evitar sobrecarga direcional e garantir subida segura da aplicação.
5. **Self-service de Assinatura (Upgrade/Downgrade):** Funcionalidade para Admin do Tenant atualizar cartão ou plano.

### P2 (Desejável)
6. **Observabilidade (Logs JSON, Métricas):** Melhorar capacidade de debug em produção.
7. **E-mails HTML e Fila de Disparo (Redis/MQ):** Melhorar UI/UX da comunicação e não bloquear event-loop.

## Sugestão de Próximas 5 Tarefas para o Time

1. **Ligação Front ↔ API (P0, em andamento):** carregar `products`, `customers`, `quotes` e `suppliers` da API no `App.tsx` (começando pelo `GET /api/db/quotes`, que não existe) e fazer as telas escreverem via API — conduzido pelo modo base limpa (`VITE_USE_SEED=false`).
2. **Hotfix de Segurança (Backend):** Corrigir `P0-4` (tipo de recebimento no caixa), `P0-5` (idempotência/verificação webhook Asaas) e `P0-6` (bloqueio de ativação manual).
3. **Setup de Produção (Infra):** Configurar o `.env.production` no ambiente real, incluindo certificados DB (`SUPABASE_DB_SSL_CA`).
4. **Fase B do PDV (Feature):** Implementar carrinho de compras com leitura de código de barras e baixa de movimento no caixa.
5. **Fase C do PDV (Feature):** Iniciar integração para emissão de NFC-e (hoje apenas um stub).