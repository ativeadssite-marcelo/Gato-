/**
 * Impressão de documentos isolados.
 *
 * O app não tem CSS de impressão global, então `window.print()` na própria página imprime a
 * aplicação inteira com o overlay do modal por cima. A saída é abrir uma janela própria com
 * um documento HTML completo — padrão já usado pelo relatório de caixa (`CaixaView.tsx`).
 *
 * ⚠️ Chame SEMPRE de dentro do `onClick`, sem `await` antes: navegadores bloqueiam pop-up
 * aberto fora do gesto do usuário.
 */

export interface PrintResult {
  ok: boolean;
  reason?: 'blocked' | 'write_failed';
}

export interface PrintDocumentOptions {
  title?: string;
  width?: number;
  height?: number;
}

/**
 * Abre `html` numa janela nova e dispara a impressão.
 * Retorna `{ ok: false, reason: 'blocked' }` quando o navegador bloqueia o pop-up.
 */
export function printHtmlDocument(html: string, opts: PrintDocumentOptions = {}): PrintResult {
  const { width = 420, height = 820 } = opts;

  const win = window.open('', '_blank', `width=${width},height=${height}`);
  if (!win) {
    return { ok: false, reason: 'blocked' };
  }

  try {
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
    return { ok: true };
  } catch {
    try {
      win.close();
    } catch {
      // Janela já fechada pelo usuário — nada a fazer.
    }
    return { ok: false, reason: 'write_failed' };
  }
}
