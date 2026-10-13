# Relatório de Gaps (SaaS)

> Última revisão: **13/10/2026**. Atualizado após correção do fail-open de migrations no startup
> de produção e revisão das pendências registradas na auditoria de segurança.

## Resumo por Fase

- **FASE 0 — Fundação do Projeto:** Parcial (migrations versionadas; boot de produção agora aborta se DB/migrations falharem; falta formatter/pre-commit e meta de cobertura)
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
1. **Executar deploy de teste em staging:** staging ainda não está disponível. Quando existir,
   configurar segredos e TLS/CA, usar Asaas sandbox e tenant descartável; validar boot, migrations,
   autenticação, cobrança/webhook e fluxos essenciais antes de produção.
2. **Fechar os 9 achados P1 restantes** documentados em
   [`auditoria-2026-10-02.md`](./auditoria-2026-10-02.md) antes de disponibilizar publicamente.
3. **Avaliar/remediar o advisory alto de `source-map-js`** reportado por
   `npm audit --omit=dev --audit-level=high`; ainda não foi corrigido nem validado como explorável.
4. **Configurar e verificar segredos e infraestrutura de produção**, incluindo DB SSL CA, domínio,
   proxy confiável, backups e restauração.

> O bloqueio P0-7 de migrations/startup foi corrigido nesta revisão. Os P0-4/P0-5/P0-6 de caixa e
> billing também constam como corrigidos em [`auditoria-2026-10-02.md`](./auditoria-2026-10-02.md).
> Isso não equivale a aprovação para deploy público: faltam staging e os itens acima.

### P1 (Importante)
5. **Rate limit por tenant e MFA TOTP:** hoje o rate limit é por IP; MFA e políticas associadas
   seguem pendentes conforme os achados P1.
6. **Persistência e isolamento multi-tenant:** tratar os demais achados P1 de webhooks, matriz
   tributária, frota, LGPD, senha master, overrides RBAC e broadcast.

### P2 (Desejável)
7. **Observabilidade (Logs JSON, Métricas):** Melhorar capacidade de debug em produção.
8. **E-mails HTML e Fila de Disparo (Redis/MQ):** Melhorar UI/UX da comunicação e não bloquear event-loop.

## Sugestão de Próximas 5 Tarefas para o Time

1. Disponibilizar staging isolado com banco/tenant descartáveis e credenciais de Asaas sandbox.
2. Validar em staging boot, migrations, smoke tests e fluxos críticos de venda, autenticação e cobrança.
3. Remediar os 9 achados P1 restantes da auditoria, começando por autorização cross-tenant e credenciais.
4. Resolver o advisory de `source-map-js` com atualização compatível e repetir a auditoria de dependências.
5. Configurar segredos, TLS, backups/restauração, domínio e proxy confiável antes de produção.