#!/usr/bin/env node
// =========================================================================
// PROVISIONAMENTO DO CONTRATANTE — GATO SaaS (Tenant + depósito/CD)
// =========================================================================
// Por que este script existe: as LEITURAS das rotas `/api/db/*` funcionam sem
// nenhuma linha em "Tenant" (devolvem lista vazia), mas as ESCRITAS não:
//
//   - cadastro de produto, cliente e fornecedor exige a linha do contratante
//     (server.ts:343, 706, 807 — respondem 400 "Tenant inválido" sem ela);
//   - cadastro de produto COM estoque inicial exige um depósito da empresa
//     (server.ts:370-376 — responde 409 sem linha em "Warehouse").
//
// E não há rota de cadastro nem para um nem para outro: "Tenant" nasce do
// signup (`insertTenantAccount`, server/db.ts) ou daqui; "Warehouse" não nasce
// de lugar nenhum (a própria migration 0005 registra isso). Sem este passo, o
// sistema lê tudo vazio e não deixa cadastrar nada — o teste real não começa.
//
// O <tenantId> precisa ser EXATAMENTE o tenant que os usuários da empresa já
// carregam na sessão (`RbacUser.tenantId`, semeado em server/rbacEngine.ts).
// É ele que o servidor usa como filtro em toda query — gravar com outro id
// cria uma empresa nova e deixa os usuários olhando para o vazio.
//
// COMO USAR (não precisa de banco nem de .env — só imprime o SQL):
//
//   node scripts/provisionar-tenant.mjs <tenantId> "<nome da empresa>" \
//     [--cnpj 12.345.678/0001-90] [--cidade "Campo Grande"] [--uf MS] \
//     [--deposito "CD Principal"] [--deposito-code CD-01] [--status active]
//
// Depois cole a saída no SQL Editor do Supabase e execute. Idempotente: rodar
// de novo atualiza os mesmos registros (útil para corrigir nome/CNPJ depois).
//
// NOTA sobre o status: o gate de assinatura do middleware (server/auth.ts:962)
// lê "TenantSubscription" (store de billing), NÃO esta coluna — um tenant sem
// assinatura é tratado como trial com acesso liberado. O status daqui é o que
// os painéis administrativos exibem; o padrão é 'active' para não marcar uma
// empresa já provisionada como trial.
// =========================================================================

const args = process.argv.slice(2);
const positional = args.filter((a) => !a.startsWith("--"));
const flags = {};
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith("--")) {
    const key = args[i].slice(2);
    const value = args[i + 1] && !args[i + 1].startsWith("--") ? args[++i] : "true";
    flags[key] = value;
  }
}

function usage(message) {
  console.error(`\n  ${message}\n`);
  console.error('  Uso: node scripts/provisionar-tenant.mjs <tenantId> "<nome da empresa>" [opções]\n');
  console.error("  Opções:");
  console.error("    --cnpj <cnpj>              CNPJ da empresa (opcional)");
  console.error('    --cidade "<cidade>"        Cidade da sede (opcional)');
  console.error("    --uf <UF>                  UF da sede, 2 letras (opcional)");
  console.error('    --deposito "<nome>"        Nome do depósito/CD (padrão: Centro de Distribuição)');
  console.error("    --deposito-code <código>   Código do depósito/CD (padrão: CD-01)");
  console.error("    --status <status>          active | trial (padrão: active)\n");
  console.error("  Exemplo (tenant de teste do MG Auto Peças):");
  console.error("    node scripts/provisionar-tenant.mjs cmtt58e6o0000ju346a0g6s32 \\");
  console.error('      "MG Auto Peças" --cidade "Campo Grande" --uf MS\n');
  process.exit(1);
}

const [tenantIdArg, nameArg] = positional;
if (!tenantIdArg || !nameArg) usage("Faltam argumentos.");

const tenantId = tenantIdArg.trim();
const name = nameArg.trim();
const cnpj = (flags.cnpj || "").trim();
const city = (flags.cidade || "").trim();
const uf = (flags.uf || "").trim().toUpperCase();
const warehouseName = (flags.deposito || "Centro de Distribuição").trim();
const warehouseCode = (flags["deposito-code"] || "CD-01").trim();
const status = (flags.status || "active").trim().toLowerCase();

// O id vem da linha de comando e entra em SQL por interpolação: aceita só o
// formato que a aplicação gera (cuid/ids com letras, números, _ e -).
if (!/^[A-Za-z0-9_-]{6,64}$/.test(tenantId)) {
  usage(`tenantId inválido: "${tenantIdArg}" — use o id exato do usuário (ex.: cmtt58e6o0000ju346a0g6s32).`);
}
if (name.length < 2) usage("Informe o nome da empresa (mínimo 2 caracteres).");
if (uf && !/^[A-Z]{2}$/.test(uf)) usage(`UF inválida: "${flags.uf}" — use duas letras (ex.: MS).`);
if (!["active", "trial"].includes(status)) usage(`Status inválido: "${status}" — use active ou trial.`);

// O depósito segue o mesmo tenant; id estável para o ON CONFLICT ser idempotente.
const warehouseId = `wh_${tenantId}_cd01`;

console.log(`-- =========================================================================`);
console.log(`-- Contratante: ${name}`);
console.log(`-- tenantId:    ${tenantId}`);
console.log(`-- Gerado em ${new Date().toISOString()}`);
console.log(`-- Idempotente: rodar de novo atualiza os mesmos registros.`);
console.log(`-- =========================================================================`);
console.log(``);
console.log(`-- 1) Contratante (sem esta linha todo cadastro responde "Tenant inválido")`);
console.log(`INSERT INTO "Tenant"`);
console.log(`  (id, name, "tradeName", cnpj, city, uf, "planId", "planName", status)`);
console.log(`VALUES`);
console.log(`  (${sqlStr(tenantId)}, ${sqlStr(name)}, ${sqlStr(name)}, ${sqlStr(cnpj)},`);
console.log(`   ${sqlStr(city)}, ${sqlStr(uf)}, 'plan_starter', 'GATO Starter (Essencial)', ${sqlStr(status)})`);
console.log(`ON CONFLICT (id) DO UPDATE SET`);
console.log(`  name = EXCLUDED.name, "tradeName" = EXCLUDED."tradeName", cnpj = EXCLUDED.cnpj,`);
console.log(`  city = EXCLUDED.city, uf = EXCLUDED.uf, status = EXCLUDED.status,`);
console.log(`  "updatedAt" = NOW();`);
console.log(``);
console.log(`-- 2) Depósito/CD (sem ele o cadastro de produto com estoque inicial responde 409)`);
console.log(`INSERT INTO "Warehouse" (id, code, name, address, "tenantId")`);
console.log(`VALUES`);
console.log(`  (${sqlStr(warehouseId)}, ${sqlStr(warehouseCode)}, ${sqlStr(warehouseName)}, NULL, ${sqlStr(tenantId)})`);
console.log(`ON CONFLICT (id) DO UPDATE SET`);
console.log(`  code = EXCLUDED.code, name = EXCLUDED.name, "updatedAt" = NOW();`);
console.log(``);
console.log(`-- 3) Conferência (deve devolver 1 linha em cada consulta)`);
console.log(`SELECT id, name, status, "planName" FROM "Tenant" WHERE id = ${sqlStr(tenantId)};`);
console.log(`SELECT id, code, name FROM "Warehouse" WHERE "tenantId" = ${sqlStr(tenantId)};`);

/** Escapa apóstrofo para literal SQL (os valores vêm da linha de comando). */
function sqlStr(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}
