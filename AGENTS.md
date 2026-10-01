# Instruções para o agente (Claude Code)

> **Antes de tudo:** leia `docs/handoff-proximo-agente.md` — persona do SaaS,
> mapa completo de funcionalidades, pontos de atenção e estado atual do projeto
> (fonte de verdade viva; atualize-o quando o estado mudar).

Ao iniciar uma sessão:
1. Leia `docs/arquitetura-saas.mmd` para entender a arquitetura alvo.
2. Leia `docs/checklist-saas.md` e percorra o código do repositório.
3. Para cada item do checklist, marque `[x]` se já estiver implementado,
   deixe `[ ]` se não estiver, e adicione uma anotação curta:
   `<!-- parcial: existe X, falta Y -->` quando for o caso.
4. Gere `docs/relatorio-gaps.md` com:
   - Resumo por fase (feito / pendente / parcial)
   - Lista priorizada (P0 crítico, P1 importante, P2 desejável)
   - Sugestão de próximas 5 tarefas para o time
5. Nunca altere código sem confirmação; primeiro proponha o plano.

Padrões do projeto:
- Sempre aplicar multi-tenancy com `tenant_id`.
- Toda ação sensível gera log de auditoria.
- Toda feature nova precisa de teste.
- Cobrança sempre via gateway, nunca cartão no próprio backend.
