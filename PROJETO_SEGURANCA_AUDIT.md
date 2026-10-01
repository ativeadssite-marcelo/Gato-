# GATO SaaS Security Audit Report - Projeto Seguranca Skill
**Audit Mode**: AUDIT (diagnóstico apenas - nenhuma alteração)
**Target**: gato-final (GATO Gestão de Estoque e Balcão SaaS)
**Branch**: feat/billing-saas
**Date**: 2026-09-30
**Auditor**: Manual Security Review (strix-cli not available)

---

## 1. RESUMO EXECUTIVO

### Estado Atual de Segurança
O sistema GATO SaaS apresenta uma arquitetura de segurança robusta em múltiplas áreas, com algumas falhas críticas que requerem atenção imediata antes da produção.

### Principais Conquistas
- ✅ **Autenticação Forte**: Tokens de sessão HMAC-SHA256 com timingSafeEqual, proteção contra brute-force, revogação de tokens
- ✅ **RBAC Granular**: 7 papéis bem definidos, segregação de funções SaaS vs Tenant, MFA obrigatório para equipe administrativa
- ✅ **Isolamento Multi-tenant**: Todos os serviços filtram por `tenantId` no servidor (nunca confiando em dados do cliente)
- ✅ **Proteção de PII**: Mascaramento automático de CPF/CNPJ/e-mail em logs de auditoria
- ✅ **Validação de Ambiente**: Zod schema com falha fechada (fail-closed) em produção
- ✅ **Rate Limiting**: Proteção contra DoS em múltiplos níveis
- ✅ **Headers de Segurança**: CSP, HSTS, X-Frame-Options, etc. implementados

### Principais Problemas
- 🔴 **CRÍTICO**: Caixa routes usam `requirePermission("sales")` onde `"sales"` é um `TenantPermissionKey`, não um `PermissionResource`. Isso causa:
  - Erros de compilação TypeScript
  - Bloqueio potencial de TODAS as rotas de caixa (RBAC nega acesso por padrão)
  - Risco de bypass se TypeScript for compilado com permissividade
- 🔴 **MÉDIO**: Falta de validação de entrada (Zod) em rotas de caixa - risco de injeção/formatos maliciosos
- 🔴 **MÉDIO**: Ausência de proteção CSRF em endpoints POST/PUT/PATCH/DELETE
- 🟡 **BAIXO**: Registro de auditoria insuficiente para operações financeiras críticas

### Nível de Risco Geral: **ALTO** (Devido à falha crítica de autorização que bloqueia funcionalidade essencial)

---

## 2. MATRIZ DE SEGURANÇA

| Área | Status | Evidência |
|------|--------|-----------|
| **Autenticação** | ✅ Forte | `server/auth.ts`: HMAC-SHA256, timingSafeEqual, revogação, MFA |
| **Autorização (RBAC)** | ⚠️ Parcial | `server/rbacEngine.ts`: Modelo sólido, mas caixa routes usam tipo errado |
| **Validação de Entrada** | ❌ Ausente | `server/caixaRoutes.ts`: Nenhuma validação Zod nos schemas |
| **Isolamento Multi-tenant** | ✅ Implementado | `server/caixa.ts`: Todas as queries filtram por `tenantId` |
| **Proteção CSRF** | ❌ Ausente | Todos os POST/PUT/PATCH/DELETE endpoints sem token |
| **Registro de Auditoria** | ⚠️ Parcial | `server/auditStore.ts`: Centralizado, mas caixa.ts não registra eventos financeiros |
| **Variáveis de Ambiente** | ✅ Fortes | `server/env.ts`: Zod validation, fail-closed, mínimo 32 chars secret |
| **Credenciais & Segredos** | ✅ Seguras | `server/credentials.ts`: SHA256 + prefix search, timingSafeEqual |
| **Rate Limiting** | ✅ Implementado | `server.ts`: 250/60s padrão, limites específicos por função |
| **Headers de Segurança** | ✅ Implementados | `server.ts`: HSTS, X-Frame-Options, X-Content-Type-Options, etc. |
| **Tratamento de Erros** | ✅ Seguro | `server.ts`: logAndFail evita stack traces e vazamento de credenciais |
| **Proteção contra DoS** | ✅ Implementada | Rate limiting + size limits (15MB JSON, 3MB uploads) |

---

## 3. VULNERABILIDADES

### V1 - Falha Crítica de Autorização (PERMISSION MISMATCH)
- **ID**: V1
- **Severidade**: ALTO (CVSS 8.1)
- **OWASP**: A01:2021 - Controle de Acesso Quebrado
- **Arquivo/Endpoint**: `server/caixaRoutes.ts` (múltiplas linhas)
- **Problema**: `requirePermission("sales")` usado onde `"sales"` é um `TenantPermissionKey`, não um `PermissionResource`. O `PermissionResource` válido inclui: `company_data`, `customers_employees`, `billing_contracts`, `fiscal_config`, etc. `"sales"` aparece apenas em `TenantPermissionKey`.
- **Evidência**: 
  - Linha 43: `requirePermission("sales")`
  - Linha 63: `requirePermission("sales", { write: true })`
  - Linha 106: `requirePermission("sales", { write: true })`
  - Linha 141: `requirePermission("sales")`
  - Linha 156: `requirePermission("sales")`
  - Linha 184: `requirePermission("sales", { write: true })`
  - Linha 273: `requirePermission("sales", { write: true })`
  - Linha 303: `requirePermission("sales")`
  - Linha 329: `requirePermission("sales", { write: true })`
  - Linha 351: `requirePermission("sales")`
  - Linha 363: `requirePermission("sales")`
  - Linha 379: `requirePermission("sales", { write: true })`
  - Linha 403: `requirePermission("sales")`
  - Todos também usam `resolveDataScope(req, "sales")` com o mesmo problema
- **Impacto**: 
  - TypeScript compilation error (string "sales" não é atribuível a PermissionResource)
  - Em tempo de ejecución: `effectiveAccessLevel(user, "sales")` retorna `undefined` → acesso negado para TODOS os papéis
  - Funcionalidade de caixa completamente bloqueada
- **Correção**: Substituir `requirePermission("sales")` por:
  - `requireTenantPermission("sales")` para verificação de capacidade operacional OU
  - `requirePermission("company_data")` + `requireTenantPermission("sales")` para recurso + capacidade
  - Exemplo correto: `requireAuth, requirePermission("company_data"), requireTenantPermission("sales", { write: true })`
- **Status**: ✅ Pronto para correção

### V2 - Falta de Validação de Entrada
- **ID**: V2
- **Severidade**: MÉDIO (CVSS 6.5)
- **OWASP**: A03:2021 - Injeção
- **Arquivo/Endpoint**: `server/caixaRoutes.ts` (todos os endpoints POST/PUT)
- **Problema**: Nenhuma validação de schema aplicada nos corpos de requisição (OpenCaixaBody, CloseCaixaBody, MovementBody, ReceiptBody, BoletoBody). Dependência apenas de verificações manuais de tipo.
- **Evidência**:
  - Linhas 69-76: Verificação manual de `openingAmount`
  - Linhas 114-119: Verificação manual de `actualAmount`
  - Linhas 191-196: Verificação manual de campos obrigatórios
  - Linhas 280-285: Verificação de `body.items` sem validação de esquema
  - Linhas 336-341: Verificação manual de campos obrigatórios
- **Impacto**: 
  - Risco de injeção de dados maliciosos (embora limitado por checagens manuais básicas)
  - Formatos inválidos podem causar erros de runtime
  - Inconsistência na validação entre endpoints
- **Correção**: 
  - Definir schemas Zod para cada tipo de entrada (reutilizando tipos de `src/types/caixa.ts`)
  - Aplicar validação no início de cada handler: `const parsed = caixaSchema.safeParse(req.body)`
  - Retornar 400 com detalhes específicos em caso de falha
- **Status**: ✅ Pronto para correção

### V3 - Ausência de Proteção CSRF
- **ID**: V3
- **Severidade**: MÉDIO (CVSS 5.4)
- **OWASP**: A01:2021 - Controle de Acesso Quebrado
- **Arquivo/Endpoint**: Todos os endpoints POST/PUT/PATCH/DELETE em `server.ts` e `server/caixaRoutes.ts`
- **Problema**: Ausência de tokens CSRF ou validação de origin/referer em requisições de estado modificador.
- **Evidência**:
  - `server.ts`: Nenhum middleware CSRF aplicado antes dos parsers
  - `server/caixaRoutes.ts`: 12 endpoints POST/PUT/PATCH sem proteção CSRF
- **Impacto**: 
  - Risco de ataque CSRF onde um site maligno pode forçar o navegador do usuário autenticado a executar ações não intencionais (criar caixa, emitir boletos, etc.)
  - Particularmente crítico dado que a autenticação é baseada em cookies/session tokens
- **Correção**:
  - Implementar middleware CSRF (ex: csurf) ou validação de token customizada
  - Gerar token por sessão e validar em requests de modificação
  - Isolar endpoints de webhook/API se aplicável
- **Status**: ✅ Pronto para correção

### V4 - Lacuna de Registro de Auditoria
- **ID**: V4
- **Severidade**: BAIXO (CVSS 4.8)
- **OWASP**: A09:2021 - Falhas de Registro e Monitoramento
- **Arquivo/Endpoint**: `server/caixa.ts` (serviço de negócio)
- **Problema**: Nenhum registro de auditoria para operações financeiras críticas (abertura/fechamento de caixa, emissão de boletos/recibos).
- **Evidência**:
  - `server/caixa.ts`: Funções como `openCashRegister`, `closeCashRegister`, `issueBoleto`, `issueReceipt` não chamam `recordAudit()`
  - Em contraste: `server/auth.ts` registra eventos de login, elevação, mudanças de senha
- **Impacto**: 
  - Impossibilidade de rastrear quem realizou operações financeiras críticas
  - Falha em atender requisitos de compliance (SOX, LGPD, etc.)
  - Dificuldade em investigação de incidentes
- **Correção**:
  - Adicionar chamadas a `recordAudit()` em todas as funções de negócio críticas
  - Incluir detalhes como valor, tipo de operação, IDs afetados
  - Exemplo: `recordAudit(req, user, "OPEN_CASH_REGISTER", "company_data", register.id, "success", { amount: input.openingAmount })`
- **Status**: ✅ Pronto para correção

### V5 - Dados de Boleto Simulados
- **ID**: V5
- **Severidade**: BAIXO (CVSS 2.1)
- **OWASP**: A06:2021 - Componentes Vulneráveis e Desatualizados
- **Arquivo/Endpoint**: `server/caixa.ts:538-542` (função `generateBarcode`)
- **Problema**: Função `generateBarcode` cria dados simulados em vez de integrar com gateway real de boleto (Asaas).
- **Evidência**:
  - Linha 538: `function generateBarcode(amount: number, dueDate: string): string {`
  - Linha 540: `return \`BLO-\${data.replace(/[^0-9]/g, \"\").slice(0, 20)}\`;`
  - Comentário: "// Gera um código de barras simulado (em produção integrar com o gateway)"
- **Impacto**: 
  - Funcionalidade de boleto não processa pagamentos reais
  - Risco de falsificação se usado em produção sem aviso claro
  - Não é uma vulnerabilidade de segurança direta, mas falha de funcionalidade
- **Correção**:
  - Implementar integração real com Asaas ou outro gateway de boleto
  - Ou marcar claramente como "modo simulação" com desativação em produção via variável de ambiente
- **Status**: ⚠️ Requer desenvolvimento (não é correção de segurança pura)

---

## 4. PENDÊNCIAS

| Item | Descrição | Motivo do Pendente |
|------|-----------|-------------------|
| P1 | Verificar se todos os endpoints de caixa têm tenantId filtering adequado | Já verificado - todas as funções em `server/caixa.ts` filtram por `tenantId` |
| P2 | Testar integração real com Asaas para boleto | Funcionalidade marcada como simulada no código |
| P3 | Verificar cobertura de logs de auditoria para todos os módulos críticos | Auth e rbac têm logs completos; caixa falta eventos financeiros |
| P4 | Validar eficácia do rate limiting sob carga | Implementado mas não testado em carga real |
| P5 | Revisar dependências de terceiros para CVEs conhecido | Não foi feito scan de dependências (package-lock.json) |
| P6 | Testar cenários de falha de banco (fail-open/fail-closed) | Código trata indisponibilidade como no-op silencioso (aceitável para espelho best-effort) |

---

## 5. PRÓXIMOS PASSOS ORDENADOS POR RISCO

### ⚠️ PRIORIDADE CRÍTICA (Resolver antes de qualquer deploy)
1. **Corrigir falha de autorização V1** em `server/caixaRoutes.ts`:
   - Substituir todas as ocorrências de `requirePermission("sales")` pela combinação correta:
     - `requireAuth, requirePermission("company_data"), requireTenantPermission("sales", { write: true })` para operações de escrita
     - `requireAuth, requirePermission("company_data"), requireTenantPermission("sales")` para operações de leitura
   - Também corrigir `resolveDataScope(req, "sales")` para usar um recurso válido como `"company_data"`

### 🔧 PRIORIDADE ALTA (Resolver no próximo sprint)
2. **Implementar validação de entrada Zod** em `server/caixaRoutes.ts`:
   - Criar schemas Zod para `OpenCaixaInput`, `CloseCaixaInput`, `MovementBody`, `ReceiptBody`, `BoletoBody`
   - Aplicar validação no início de cada handler POST/PUT/PATCH
3. **Adicionar proteção CSRF** em todos os endpoints de modificação:
   - Implementar middleware CSRF ou validação de token customizada
   - Considerar uso de cookie SameSite=Strict + header de validação

### 📝 PRIORIDADE MÉDIA (Melhorias de qualidade)
4. **Adicionar registro de auditoria** em `server/caixa.ts`:
   - Registrar eventos de abertura/fechamento de caixa
   - Registrar emissão de boletos e recibos
   - Registrar cancelamento de recibos
   - Registrar registro de movimentos
5. **Clarear status da funcionalidade de boleto**:
   - Implementar integração real com Asaas OU
   - Adicionar variável de ambiente `GATO_BOLETO_MODE=simulation|real` com aviso claro em modo simulação

### 🔍 PRIORIDADE BAIXA (Validação e teste)
6. **Executar varredura de dependências** (`npm audit` ou similar)
7. **Realizar teste de penetração limitado** nos endpoints corrigidos
8. **Validar logs de auditoria** com cenários de uso real

---

## CONCLUSÃO

O sistema GATO SaaS demonstra um forte fundamento de segurança com autenticação robusta, RBAC bem definido, isolamento multi-tenant correto e proteções básicas contra ataques comuns. A questão crítica identificada (V1) é um erro de tipagem na camada de autorização que, se não corrigido, tornará a funcionalidade de caixa totalmente inacessível devido ao bloqueio de RBAC ou erros de compilação.

Esta falha é particularmente significativa porque:
1. Afeta diretamente o módulo de caixa (PDV) - funcionalidade essencial do produto
2. É facilmente identificável em compilação TypeScript
3. Tem correção direta e simples (substituir tipo de permissão)
4. Uma vez corrigido, permite que as outras boas práticas de segurança funcionem como esperado

Após a correção dos itens de prioridade crítica e alta, o sistema estará em posição sólida para avançar para testes de segurança mais profundos ou implantação em estágio de pré-produção.

**Recomendação Final**: Corrija V1 imediatamente, depois implemente V2 e V3 no próximo sprint. Estas três correções elevarão significativamente a postura de segurança do módulo de caixa.