# Camadas de Acesso — GATO SaaS

> Modelo hierárquico de acesso. Cada camada define: **o que aparece no menu**,
> **responsabilidades**, **acesso a funcionalidades** e **características**.
> Mapeia os papéis RBAC já existentes (`server/rbacEngine.ts` → `ROLE_DEFINITIONS`).
> O **Super Admin** pode redefinir o que cada camada inferior enxerga (overrides).

## Visão geral das camadas

| # | Camada | Papel RBAC | Escopo | Quem é |
|---|--------|-----------|--------|--------|
| 1 | Super Admin | `super_admin` | SaaS | Dono do SaaS (você) |
| 2 | Equipe SaaS | `saas_financeiro`, `saas_fiscal`, `saas_suporte`, `saas_config`, `saas_cs` | SaaS | Colaboradores internos especializados |
| 3 | Admin do Tenant | `tenant_admin` | Tenant | Cliente contratante (dono da empresa) |
| 4 | Usuário do Tenant | `tenant_user` | Tenant | Operador (venda, balcão, estoque) |
| 5 | Somente Leitura | `tenant_readonly` | Tenant | Auditor / suporte externo |

---

## Camada 1 — Super Admin (`super_admin`)

**Responsabilidades:** controle total da plataforma; criar/remover administradores;
gerenciar planos, tenants, usuários e permissões; definir o que as camadas
inferiores veem; billing, fiscal, conectores, mensagens e segurança.

**Menu (todos os itens):** Início, Consulta de Peças, Estoque, Vendas, Orçamentos,
Clientes, Marketing, Fornecedores, Conectores, Relatórios, Configurações,
Assinatura & Faturas, **Admin Impostos**, **Governança & RBAC**,
**Financeiro SaaS**, **Banco de Dados**, Baixar NF-e/XML, Ordem de Serviço.

**Acesso a funcionalidades:** `full` em tudo. Exceção: dados confidenciais de
tenant (`company_data`, `customers_employees`) exigem **justificativa + auditoria**
(`audit_required`).

**Características:** MFA obrigatório; elevação por **senha master** (30 min);
pode **impersonar** qualquer persona (somente leitura, auditado); acesso ao
**editor de camadas** (redefine permissões dos papéis inferiores).

---

## Camada 2 — Equipe SaaS (papéis especializados)

Papéis `saas_*` com segregação de função — ninguém vê dados pessoais dos tenants
sem permissão. Todos exigem **MFA**.

| Papel | Menu | Acesso | Responsabilidade |
|-------|------|--------|------------------|
| `saas_financeiro` | Financeiro SaaS, Assinatura, Governança (visão) | `billing_contracts` full; `manage_accounts` leitura; mensagens | Mensalidades, boletos, contratos, cobrança |
| `saas_fiscal` | Admin Impostos | `fiscal_config` full | Regras fiscais, CFOP/NCM, tributos |
| `saas_suporte` | (suporte técnico) | `bug_support` full; reset de senha (logs mascarados) | Tickets, bugs, reset de acesso |
| `saas_config` | Conectores, Configurações de produto | `updates`/`connectors`/`layout_ui` full | Conectores, layout, feature flags |
| `saas_cs` | Assinatura (visão), mensagens | `manage_accounts`/`limits_quotas` leitura; mensagens full | Customer Success, onboarding, uso |

**Características:** MFA obrigatório; **sem acesso** a `company_data` e
`customers_employees` (dados pessoais dos clientes finais); não alteram permissões.

---

## Camada 3 — Admin do Tenant (`tenant_admin`)

**Responsabilidades:** administrar a própria empresa — usuários, clientes,
funcionários, estoque, dados cadastrais, faturas e upgrade de plano.

**Menu (operacional + gestão própria):** Início, Consulta de Peças, Estoque,
Vendas, Orçamentos, Clientes, Marketing, Fornecedores, Relatórios, Configurações,
Assinatura & Faturas, Baixar NF-e/XML, Ordem de Serviço.
**Não vê:** Admin Impostos, Governança & RBAC, Financeiro SaaS, Banco de Dados,
Conectores.

**Acesso:** `own_tenant_only` em tudo do próprio tenant (dados, clientes,
usuários, cotas, faturas). Nunca enxerga outro tenant.

**Características:** MFA opcional (recomendado); cria usuários só com papéis
`tenant_*`; solicita upgrade (pró-rata).

---

## Camada 4 — Usuário do Tenant (`tenant_user`)

**Responsabilidades:** operação diária (vendas, balcão, atendimento, emissão).

**Menu:** Início, Consulta de Peças, Estoque, Vendas, Orçamentos, Clientes,
Marketing, Fornecedores, Relatórios, Ordem de Serviço.
**Não vê:** Configurações, Assinatura & Faturas, e todos os itens SaaS.

**Acesso:** `customers_employees`/`company_data` conforme função; **sem** billing,
sem gestão de usuários, sem alteração de configurações críticas.

**Características:** sem MFA obrigatório; não altera configs; permissões podem ser
refinadas pelo Admin do Tenant (overrides por usuário).

---

## Camada 5 — Somente Leitura (`tenant_readonly`)

**Responsabilidades:** auditoria externa / suporte — visualiza sem alterar.

**Menu:** Início, Consulta de Peças, Relatórios.

**Acesso:** `read_only` em todas as funcionalidades do tenant; **nenhuma escrita**.

**Características:** sem escrita; ideal para auditor fiscal/contábil.

---

## Como o Super Admin define o que a camada inferior vê

1. A matriz de permissões por papel (`ROLE_DEFINITIONS`) é o **padrão**.
2. O Super Admin pode aplicar **overrides por papel** (endpoints
   `GET/PUT /api/rbac/role-overrides`) e **por usuário** (`customOverrides`).
3. O **menu** é renderizado a partir do nível de permissão resultante
   (`src/utils/menuAccess.ts`): recurso com nível `none` esconde o item.
4. Telas críticas (Impostos, Governança, Financeiro SaaS, Banco de Dados) exigem
   também **senha master** (eleveção auditada de 30 min).
