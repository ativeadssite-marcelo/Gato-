#!/usr/bin/env node
// =========================================================================
// GERADOR DO SQL DO SUPER ADMIN — GATO SaaS
// =========================================================================
// Por que este script existe: em produção não há seed de demonstração, então a
// PRIMEIRA conta de super_admin precisa ser criada de fora da aplicação (não dá
// para pedir a um super_admin que crie outro — ovo e galinha).
//
// Por que direto no banco e não em GATO_USERS_JSON:
//
//   1. A senha não fica em texto puro no ambiente. `GATO_USERS_JSON` é uma
//      variável de ambiente: ela aparece em `docker inspect`, em
//      `/proc/<pid>/environ`, no arquivo do compose e em log de CI. Aqui só o
//      hash scrypt existe, no mesmo lugar que o resto da identidade.
//
//   2. Trocar a senha depois FUNCIONA. `seedEnvUsers()` roda a CADA boot e
//      `addCredential()` sempre sobrescreve a credencial em memória; como
//      `hydrateIdentityStore()` pula e-mail que já está em memória, a senha do
//      env vence em todo boot. Se você trocar a senha pela tela
//      (reset-password → setCredential → espelha no banco), o próximo restart
//      REVERTE para a senha do env, em silêncio. Com a conta no banco, a troca
//      persiste.
//
// COMO USAR (não precisa de banco nem de .env — só imprime o SQL):
//
//   node scripts/criar-super-admin.mjs <email> "<nome>"
//
// A senha é pedida em seguida, digitada às escuras. Ela NÃO deve vir como
// argumento: argumento de linha de comando aparece em `ps`/Gerenciador de
// Tarefas para qualquer usuário da máquina e fica gravado no histórico do shell
// (~/.bash_history, PSReadLine). Se ainda assim quiser passar por argumento
// (uso automatizado), o script avisa que aquela via é insegura.
//
// Depois cole a saída no SQL Editor do Supabase e execute.
//
// O formato precisa bater EXATAMENTE com o que server/auth.ts usa:
//   salt = crypto.randomBytes(16).toString("hex")        (32 chars hex)
//   hash = crypto.scryptSync(senha, salt, 64).toString("hex")  (128 chars hex)
// =========================================================================

import crypto from "node:crypto";

const [, , emailArg, nameArg, passwordArg] = process.argv;

function usage(message) {
  console.error(`\n  ${message}\n`);
  console.error('  Uso: node scripts/criar-super-admin.mjs <email> "<nome>"\n');
  console.error("  Exemplo:");
  console.error('    node scripts/criar-super-admin.mjs dono@suaempresa.com.br "Marcelo Silva"\n');
  console.error("  A senha é pedida depois, sem eco no terminal.\n");
  process.exit(1);
}

/**
 * Lê a senha sem ecoar no terminal. Com TTY, desliga o echo e mostra `*`; sem
 * TTY (pipe), lê a linha crua — não há terminal para vazar.
 *
 * O prompt e os asteriscos saem em STDERR de propósito: assim o STDOUT carrega
 * SÓ o SQL, e `node scripts/criar-super-admin.mjs ... > arquivo.sql` gera um
 * arquivo limpo, pronto para colar no Supabase — sem a linha do prompt no meio.
 */
function promptPassword(question) {
  return new Promise((resolve) => {
    if (!process.stdin.isTTY) {
      const chunks = [];
      process.stdin.on("data", (c) => chunks.push(c));
      process.stdin.on("end", () =>
        resolve(Buffer.concat(chunks).toString("utf8").trim()),
      );
      return;
    }

    process.stderr.write(question);
    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    let value = "";

    const finish = (result) => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.removeListener("data", onData);
      process.stderr.write("\n");
      resolve(result);
    };

    const onData = (ch) => {
      switch (ch) {
        case "\n":
        case "\r":
        case "\u0004":
          return finish(value);
        case "\u0003": // Ctrl+C
          process.stderr.write("\n");
          process.exit(130);
          return;
        case "\u007f":
        case "\b":
          if (value.length) {
            value = value.slice(0, -1);
            process.stderr.write("\b \b");
          }
          return;
        default:
          value += ch;
          process.stderr.write("*");
      }
    };

    stdin.on("data", onData);
  });
}

if (!emailArg || !nameArg) usage("Faltam argumentos.");

if (passwordArg) {
  console.error(
    "\n  AVISO: senha passada por argumento. Ela fica visível em `ps` e no\n" +
      "  histórico do shell. O recomendado é omitir o 3º argumento e digitá-la\n" +
      "  quando o script pedir.\n",
  );
}

const email = emailArg.trim().toLowerCase();
const name = nameArg.trim();
const password = passwordArg || (await promptPassword("  Senha do super admin: "));

// A tabela guarda email sempre em minúsculas (senão o login normaliza e não acha).
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  usage(`E-mail inválido: ${emailArg}`);
}
if (name.length < 2) usage("Informe o nome do responsável (mínimo 2 caracteres).");
if (password.length < 8) {
  usage("Senha com menos de 8 caracteres — o servidor recusaria este cadastro.");
}

const salt = crypto.randomBytes(16).toString("hex");
const hash = crypto.scryptSync(password, salt, 64).toString("hex");
const initials = name
  .split(/\s+/)
  .slice(0, 2)
  .map((p) => p[0])
  .join("")
  .toUpperCase();

// id fixo: rodar de novo ATUALIZA a mesma conta (serve para trocar a senha).
const userId = "usr_super_admin";

console.log(`-- =========================================================================`);
console.log(`-- Super Admin: ${email}`);
console.log(`-- Gerado em ${new Date().toISOString()} — a senha NÃO aparece neste SQL, só o hash.`);
console.log(`-- Idempotente: rodar de novo atualiza o usuário e troca a senha.`);
console.log(`-- =========================================================================`);
console.log(``);
console.log(`-- 1) Usuário da plataforma (tenantId = 'system')`);
console.log(`INSERT INTO "RbacUser"`);
console.log(`  (id, "tenantId", "tenantName", name, email, "roleCode", "roleName", department,`);
console.log(`   active, "avatarInitials", "mfaEnabled", "mfaEnforced")`);
console.log(`VALUES`);
console.log(`  ('${userId}', 'system', 'SaaS Plataforma Central', ${sqlStr(name)}, ${sqlStr(email)},`);
console.log(`   'super_admin', 'Super Admin — Eu', 'Diretoria / Tech Lead',`);
console.log(`   TRUE, ${sqlStr(initials)}, FALSE, FALSE)`);
console.log(`ON CONFLICT (id) DO UPDATE SET`);
console.log(`  name = EXCLUDED.name, email = EXCLUDED.email, active = TRUE,`);
console.log(`  "avatarInitials" = EXCLUDED."avatarInitials";`);
console.log(``);
console.log(`-- 2) Credencial (o hash scrypt; a senha em texto puro não entra no banco)`);
console.log(`INSERT INTO "UserCredential" (email, "userId", salt, hash)`);
console.log(`VALUES (${sqlStr(email)}, '${userId}', '${salt}', '${hash}')`);
console.log(`ON CONFLICT (email) DO UPDATE SET`);
console.log(`  "userId" = EXCLUDED."userId", salt = EXCLUDED.salt, hash = EXCLUDED.hash,`);
console.log(`  "updatedAt" = NOW();`);
console.log(``);
console.log(`-- 3) Conferência (deve devolver 1 linha com active = true)`);
console.log(`SELECT u.id, u.email, u."roleCode", u.active, (c.email IS NOT NULL) AS tem_senha`);
console.log(`  FROM "RbacUser" u`);
console.log(`  LEFT JOIN "UserCredential" c ON c."userId" = u.id`);
console.log(` WHERE u.id = '${userId}';`);

/** Escapa apóstrofo para literal SQL (o valor vem da linha de comando). */
function sqlStr(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}
