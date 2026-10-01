# Roadmap PDV — Funções de Caixa de Loja (GATO)

> Mapa das funções de um caixa/ponto de venda (PDV) contra o sistema GATO.
> Fases definidas com o time em 01/10/2026. Status: `[x]` feito, `[~]` parcial, `[ ]` pendente.

## Legenda de criticidade (conforme operação da loja)

| Prioridade | Função | Risco se errar |
|---|---|---|
| Crítica | Troco correto | Prejuízo direto no caixa |
| Crítica | Fechamento de caixa (bate-caixa) | Divergência física × sistema |
| Alta | Passar produtos + totalizar | Lentidão na fila |
| Alta | Formas de pagamento (dinheiro, cartão, PIX, vales) | Recebimento incorreto |
| Alta | Cancelamentos e descontos | Abuso / perda de margem |
| Alta | Emissão de cupom fiscal (NFC-e) | Multa SEFAZ |

---

## Fase A — Tela Caixa completa (turno operacional) ✅ IMPLEMENTADA

- [x] Abertura de caixa com fundo de troco (`POST /api/caixa/open`)
- [x] Checklist de abertura do PDV (impressora, leitor de código de barras, gaveta, fundo) — persistido por dia
- [x] Movimentações: vendas (dinheiro/cartão/PIX/boleto), sangria, suprimento, devoluções, ajuste
- [x] **Vales/voucher** (alimentação, refeição, presente) como forma de pagamento — fora do cálculo de dinheiro em gaveta
- [x] **Cálculo de troco** no recebimento em dinheiro (valor recebido × total)
- [x] Fechamento com conferência esperado × contado e diferença (sobra/falta)
- [x] **Relatório de caixa imprimível** (bate-caixa com totais, movimentações, diferença e assinaturas)
- [x] Resumo do turno: fundo, esperado, vendas por forma, suprimentos, sangrias, vales, boletos abertos

Arquivos: `src/components/CaixaView.tsx`, `server/caixa.ts`, `server/caixaRoutes.ts`, `src/types/caixa.ts`.

## Fase B — Fluxo de venda PDV (balcão com código de barras)

- [ ] Captura por leitor de código de barras (entrada USB/teclado — HID emula teclado)
- [ ] Carrinho de venda com totalização em tempo real e desconto por item/cupom
- [ ] Cancelamento de item/venda com senha de gerente (permissão `sales` + override)
- [ ] Troco no fechamento da venda (integrar ao movimento `sale_cash` do caixa)
- [ ] Vínculo venda → movimentação de caixa automática (hoje é manual pelo Caixa)
- [ ] Atalhos de teclado (F1–F12) no padrão dos PDVs de mercado

Base atual: `src/components/BalcaoCotacao.tsx` (formas de pagamento, desconto de tabela, integração NF-e).

## Fase C — Documentos fiscais (NFC-e / CF-e)

- [ ] Emissão real de NFC-e (modelo 65) — hoje `EmissaoNfe.tsx` exibe stub "em desenvolvimento"
- [ ] Cancelamento dentro do prazo SEFAZ (com autorização)
- [ ] Reimpressão de DANFE NFC-e / segunda via do cupom
- [ ] Integração: venda PDV → NFC-e → movimento de caixa → resumo do turno
- [ ] Gateway fiscal homologado (ambiente de homologação antes da produção)

## Pendências transversais

- [ ] PIX QR Code estático/dinâmico exibido no caixa (já existe gerador PIX no balcão — verificar)
- [ ] Impressora ESC/POS térmica (WebUSB/Web Serial) — hoje só impressão via `window.print`
- [ ] Auditoria financeira: registrar `recordAudit` em abertura/fechamento/emissões (ver `PROJETO_SEGURANCA_AUDIT.md`)
- [ ] Testes de servidor para `server/caixa.ts` (padrão `tsx --test`)
- [ ] Corrigir erro pré-existente `server/caixaRoutes.ts:290` (`ReceiptBody.cashRegisterId?` × `IssueReceiptInput`)

## Próximas 5 tarefas sugeridas

1. Fechar a Fase A com testes de servidor de caixa (abrir → movimentar → fechar → diferença).
2. Iniciar Fase B: carrinho de venda com código de barras no `BalcaoCotacao`.
3. Automatizar registro de movimento de caixa a partir da venda concluída.
4. Homologação NFC-e (Fase C) — exigência legal de maior risco.
5. Corrigir o erro de tipo pré-existente em `caixaRoutes.ts`.
