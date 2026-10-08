// =========================================================================
// TESTES DA CASCATA DE VEÍCULOS (src/data/fleetDatabase.ts)
// =========================================================================
// Estes testes existem por causa de um defeito real: os botões de segmento da
// tela de Aplicação tinham rótulos escritos à mão ("Automóvel / Hatch",
// "SUV / Crossover", "Motocicleta") que NÃO existem na base ("Passeio", "SUV",
// "Moto"). Como o filtro compara por igualdade exata, cinco dos seis botões
// devolviam vazio — e nenhum alerta aparecia.
//
// A correção foi derivar a lista do dado. O teste trava isso por dois lados:
// todo segmento oferecido existe de verdade na base, e nenhum veículo fica de
// fora da soma dos segmentos.
// =========================================================================

import { test } from "node:test";
import assert from "node:assert";
import {
  BRAZILIAN_FLEET_DATABASE,
  getDistinctFleetSegments,
  getDistinctFleetMakes,
  getMakesBySegment,
  getModelsBySegmentAndMake,
} from "../../src/data/fleetDatabase";

test("todo segmento oferecido na tela tem veículo de verdade na base", () => {
  const segmentos = getDistinctFleetSegments();
  assert.ok(segmentos.length > 0, "nenhum segmento na base");

  for (const segmento of segmentos) {
    const veiculos = BRAZILIAN_FLEET_DATABASE.filter((v) => v.segmento === segmento);
    assert.ok(
      veiculos.length > 0,
      `o botão "${segmento}" apareceria na tela e não filtraria nada (0 veículos)`
    );
  }
});

test("a soma dos segmentos cobre a base inteira (nenhum veículo fica de fora)", () => {
  const cobertos = getDistinctFleetSegments().reduce(
    (total, segmento) => total + BRAZILIAN_FLEET_DATABASE.filter((v) => v.segmento === segmento).length,
    0
  );
  assert.strictEqual(cobertos, BRAZILIAN_FLEET_DATABASE.length);
});

test("a lista de segmentos é exatamente o que a base tem — nem a menos, nem a mais", () => {
  // "A menos" = segmento novo na base sem botão na tela (ninguém acha o veículo).
  // "A mais" = botão que não filtra nada, que foi o defeito original.
  const daBase = [...new Set(BRAZILIAN_FLEET_DATABASE.map((v) => v.segmento))].sort();
  const oferecidos = [...getDistinctFleetSegments()].sort();
  assert.deepStrictEqual(oferecidos, daBase);
});

test("montadoras do segmento têm veículo do segmento — e só dele", () => {
  for (const segmento of getDistinctFleetSegments()) {
    const montadoras = getMakesBySegment(segmento);
    assert.ok(montadoras.length > 0, `segmento ${segmento} sem montadora`);

    for (const montadora of montadoras) {
      const veiculos = BRAZILIAN_FLEET_DATABASE.filter(
        (v) => v.montadora === montadora && v.segmento === segmento
      );
      assert.ok(veiculos.length > 0, `${montadora} apareceu em ${segmento} sem veículo do segmento`);
    }
  }
});

test("getMakesBySegment('todos') é a lista completa de montadoras", () => {
  assert.deepStrictEqual(getMakesBySegment("todos"), getDistinctFleetMakes());
});

test("modelos respeitam segmento E montadora ao mesmo tempo", () => {
  const modelos = getModelsBySegmentAndMake("Caminhão / Pesado", "Scania");
  assert.ok(modelos.length > 0, "Scania deveria ter modelo pesado na base");
  for (const modelo of modelos) {
    assert.strictEqual(modelo.montadora, "Scania");
    assert.strictEqual(modelo.segmento, "Caminhão / Pesado");
  }
});

test("montadora que não tem o segmento devolve lista vazia, não a base inteira", () => {
  // Yamaha é moto; em "Caminhão / Pesado" não pode sobrar nada.
  assert.deepStrictEqual(getModelsBySegmentAndMake("Caminhão / Pesado", "Yamaha"), []);
});
