/**
 * Cópia para a área de transferência com fallback.
 *
 * `navigator.clipboard` só existe em contexto seguro (HTTPS ou localhost). Quando o sistema
 * roda em HTTP numa rede interna — cenário real de balcão — ele é `undefined`, então há um
 * fallback via `<textarea>` + `document.execCommand('copy')`.
 */

/**
 * Copia `texto` para a área de transferência.
 * Retorna `false` quando os dois caminhos falham, para o chamador avisar o usuário.
 */
export async function copyTextToClipboard(texto: string): Promise<boolean> {
  if (!texto) return false;

  if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(texto);
      return true;
    } catch {
      // Cai no fallback abaixo.
    }
  }

  return copiarComTextarea(texto);
}

function copiarComTextarea(texto: string): boolean {
  try {
    const area = document.createElement('textarea');
    area.value = texto;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.top = '-9999px';
    area.style.opacity = '0';
    document.body.appendChild(area);

    area.select();
    area.setSelectionRange(0, area.value.length);
    const sucesso = document.execCommand('copy');

    document.body.removeChild(area);
    return sucesso;
  } catch {
    return false;
  }
}
