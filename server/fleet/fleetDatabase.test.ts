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
  getIndividualFleetVehicleModels,
  getAvailableYearsForSelection,
  getEnginesForSelection,
  queryPartsByVehicleApplication,
} from "../../src/data/fleetDatabase";
import { Product } from "../../src/types";

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

test("modelos agrupados aparecem como opções individuais em todas as montadoras", () => {
  const allNames = BRAZILIAN_FLEET_DATABASE.flatMap(getIndividualFleetVehicleModels);
  assert.ok(allNames.includes("Fit"));
  assert.ok(allNames.includes("City"));
  assert.ok(allNames.includes("WR-V"));
  assert.ok(allNames.includes("NXR Bros 160"));
  assert.ok(allNames.includes("Citroën Basalt"));

  for (const model of BRAZILIAN_FLEET_DATABASE) {
    const names = getIndividualFleetVehicleModels(model);
    assert.ok(names.length > 0, `${model.id} não oferece nenhuma opção`);
    assert.strictEqual(new Set(names).size, names.length, `${model.id} tem nomes duplicados`);
    if (names.length > 1) {
      assert.ok(
        names.every((name) => !/[/&]/.test(name)),
        `${model.id} ainda tem opções agrupadas: ${names.join(", ")}`
      );
    }
  }
});

test("opções individuais mantêm os anos e motores do registro original", () => {
  const model = BRAZILIAN_FLEET_DATABASE.find((vehicle) => vehicle.id === "honda-fit-city-wrv");
  assert.ok(model);
  assert.ok(getIndividualFleetVehicleModels(model).includes("Fit"));
  const years = getAvailableYearsForSelection(model.montadora, model.id);
  assert.strictEqual(years[0], model.anoFim);
  assert.strictEqual(years.at(-1), model.anoInicio);
  assert.deepStrictEqual(getEnginesForSelection(model.id), model.motores);
});

test("consulta de peças aplica o nome individual, não o nome agregado do registro", () => {
  const product: Product = {
    id: "part-fit",
    code: "FIT-001",
    oemCode: "",
    similarCodes: [],
    barcode: "",
    name: "Filtro Honda Fit",
    brand: "GATO",
    category: "auto",
    supplier: "Fornecedor",
    location: { corridor: "A", shelf: "1", box: "1" },
    stock: 1,
    minStock: 0,
    unitCost: 1,
    transportCost: 0,
    markupPercent: 0,
    sellingPrice: 1,
    ncm: "",
    cst: "",
    cfop: "",
    taxBaseIcms: 0,
    applications: [{
      id: "fit-app",
      brand: "Honda",
      vehicle: "Fit",
      yearRange: "2014-2020",
      engine: "1.5",
      transmission: "Manual",
      traction: "4x2",
      airConditioning: true,
    }],
    updatedAt: "",
  };

  const modelId = "honda-fit-city-wrv";
  assert.strictEqual(
    queryPartsByVehicleApplication([product], {
      montadora: "Honda",
      modeloId: modelId,
      modeloTexto: "Fit",
    }).length,
    1
  );
  assert.strictEqual(
    queryPartsByVehicleApplication([product], {
      montadora: "Honda",
      modeloId: modelId,
      modeloTexto: "City",
    }).length,
    0
  );

  const citySedanProduct: Product = {
    ...product,
    id: "part-city-sedan",
    name: "Filtro Honda City Sedan",
    applications: [{
      ...product.applications[0],
      id: "city-sedan-app",
      vehicle: "City Sedan",
    }],
  };
  assert.strictEqual(
    queryPartsByVehicleApplication([citySedanProduct], {
      montadora: "Honda",
      modeloId: modelId,
      modeloTexto: "City Hatch",
    }).length,
    0
  );
});
