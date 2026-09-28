// =========================================================================
// GERADOR DE SENHA FORTE — LADO CLIENTE
// =========================================================================
// O botão "gerar senha forte" das telas de equipe preenche o campo do
// formulário; o servidor continua com um único caminho (a senha digitada), que
// ele valida com `isStrongPassword`. Assim não existe um segundo caminho de
// criação de senha para manter.
//
// Por que o alfabeto exclui l, I, O, 0 e 1: essa senha costuma ser lida em voz
// alta ou transcrita à mão para outra pessoa. Os caracteres ambíguos geram
// chamado de suporte por erro de digitação, não por segurança.
// =========================================================================

const LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const DIGITS = "23456789";
const ALL = LETTERS + DIGITS;

/**
 * Inteiro aleatório em [0, max) sem viés de módulo: descarta a faixa incompleta
 * em vez de usar o resto da divisão direto.
 */
function randomInt(max: number): number {
  const buf = new Uint32Array(1);
  const limit = Math.floor(0x100000000 / max) * max;
  let value = 0;
  do {
    crypto.getRandomValues(buf);
    value = buf[0];
  } while (value >= limit);
  return value % max;
}

/**
 * Senha com letra e dígito garantidos (é o mínimo que `isStrongPassword`
 * exige), embaralhada depois de montada para que a posição não seja previsível.
 */
export function generateStrongPassword(length = 16): string {
  const chars: string[] = [LETTERS[randomInt(LETTERS.length)], DIGITS[randomInt(DIGITS.length)]];
  while (chars.length < length) chars.push(ALL[randomInt(ALL.length)]);

  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}
