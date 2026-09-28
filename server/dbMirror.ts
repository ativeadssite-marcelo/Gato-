// =========================================================================
// ESPELHO POSTGRES — PRIMITIVO COMPARTILHADO
// =========================================================================
// O padrão de espelho do projeto (server/store.ts, server/credentials.ts): a
// memória é a fonte de verdade imediata e o Postgres é espelho best-effort que
// nunca derruba a requisição.
//
// Vive num módulo próprio porque dois domínios precisam dele — a identidade
// (server/identityStore.ts) e as credenciais de login (server/auth.ts) — e o
// auth precisa de um caminho que NÃO passe pela identidade: a hidratação de
// identidade lê as credenciais do auth, então um import de mão dupla criaria
// ciclo entre os dois módulos.
//
// POR QUE UMA FILA (e não fire-and-forget solto): as escritas têm dependência
// de ordem. Criar um usuário espelha "RbacUser" e logo em seguida
// "UserCredential", que tem foreign key para o usuário; disparadas em paralelo,
// a credencial pode chegar primeiro e ser recusada pela FK — perdendo
// silenciosamente o login recém-criado. A fila garante que o banco veja as
// escritas na mesma ordem em que a memória as aplicou.
//
// Sem banco configurado isto é um no-op silencioso; é o que mantém a suíte de
// testes inteira rodando sem Postgres.
// =========================================================================

import { getDbPool, isDatabaseConfigured } from "./db";

let chain: Promise<void> = Promise.resolve();
let pending = 0;

/**
 * Teto da fila. Banco fora do ar não pode virar crescimento sem limite: cada
 * escrita esperaria o timeout da conexão e a fila acumularia. Passando do teto,
 * a escrita é DESCARTADA — e isso é aceitável porque o espelho é best-effort e o
 * próximo boot reidrata do banco o estado que já está em memória. O que não se
 * pode é aplicar depois, fora de ordem, um estado que já foi superado.
 */
const MAX_PENDING = 500;

/**
 * Enfileira a escrita. Erros viram aviso no console: uma falha de espelho não
 * pode transformar uma operação já concluída em memória num erro para o
 * usuário.
 */
export function mirror(sql: string, params: unknown[] = []): void {
  if (!isDatabaseConfigured()) return;

  if (pending >= MAX_PENDING) {
    console.warn(
      `[GATO Espelho] Fila cheia (${pending} pendentes) — escrita descartada. Banco indisponível?`,
    );
    return;
  }

  pending += 1;
  chain = chain
    .then(() => getDbPool().query(sql, params).then(() => undefined))
    .catch((err) => {
      console.warn("[GATO Espelho] Postgres indisponível:", err?.message || err);
    })
    .finally(() => {
      pending -= 1;
    });
}
