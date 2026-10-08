// =========================================================================
// TESTES DO MODO BASE LIMPA (VITE_USE_SEED)
// =========================================================================
// O modo limpa é ligado por `VITE_USE_SEED=false` no `.env`, variável que só o Vite injeta
// no bundle. Aqui no Node `import.meta.env` não existe, então este arquivo trava o PADRÃO:
// sem a variável, o app tem de continuar carregando os seeds de demonstração. Um erro aqui
// esvaziaria o produto inteiro para todo mundo que não configurou nada.
//
// O ramo do modo limpa em si não é testável daqui (depende do Vite). Ele é verificado de
// duas outras formas: no build — o Rollup dobra a constante e elimina os ramos mortos, então
// os números de demonstração desaparecem do bundle quando a flag está ligada — e no roteiro
// manual de `docs/handoff-proximo-agente.md`.
// =========================================================================

import { test } from "node:test";
import assert from "node:assert";
import {
  USE_SEED_DATA,
  demoAddon,
  loadEntityState,
  seedList,
} from "../../src/utils/seedMode";

test("sem VITE_USE_SEED o modo base limpa fica desligado", () => {
  assert.strictEqual(USE_SEED_DATA, true);
});

test("seedList devolve a lista semeada quando o modo limpa está desligado", () => {
  const produtos = [{ id: "p1" }, { id: "p2" }];
  assert.deepStrictEqual(seedList(produtos), produtos);
  assert.deepStrictEqual(seedList([]), []);
});

test("loadEntityState cai no seed quando não há localStorage (Node não tem)", () => {
  assert.deepStrictEqual(loadEntityState("gato_inexistente", [1, 2, 3]), [1, 2, 3]);
});

test("demoAddon preserva os números de demonstração fora do modo limpa", () => {
  assert.strictEqual(demoAddon(7820.0), 7820.0);
  assert.strictEqual(demoAddon(0), 0);
});
