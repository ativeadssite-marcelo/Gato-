import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  Send, 
  User, 
  Sparkles, 
  Car, 
  FileText, 
  HelpCircle, 
  Wrench,
  RotateCcw,
  CheckCircle2
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export const SuporteChatIA: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm-1',
      sender: 'assistant',
      text: 'Olá! Sou o Assistente Técnico Especialista do GATO AutoPeças. Posso tirar dúvidas sobre aplicações veiculares (motor, câmbio, ar condicionado), NCM e tributação de autopeças (ICMS-ST), ou ajudar na operação do sistema (importação de XML, cotação de balcão e marketplaces). Como posso te ajudar agora?',
      timestamp: '09:00',
    }
  ]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || inputPrompt;
    if (!query.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputPrompt('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/gemini/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: query,
          context: 'Atue como o consultor técnico sênior e especialista em autopeças, motopeças e frotas do Sistema GATO.',
        }),
      });

      const data = await response.json();
      const reply = data.response || data.text || 'Desculpe, não consegui obter a resposta no momento. Por favor tente novamente.';

      const assistantMsg: ChatMessage = {
        id: `ast-${Date.now()}`,
        sender: 'assistant',
        text: reply,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      // Fallback answers if offline or missing API key
      const fallbackReplies: Record<string, string> = {
        ncm: 'Para autopeças, os NCMs mais comuns são: 8708.29.99 (Partes e acessórios de carroceria), 8708.30.90 (Freios e pastilhas), 8708.80.00 (Amortecedores de suspensão) e 8421.23.00 (Filtros de óleo). A maioria é sujeita a ICMS-ST no Convênio 142/2018.',
        gol: 'Para Volkswagen Gol G5 (2008-2012) 1.0 e 1.6: Amortecedores dianteiros utilizam o código Cofap GP30123 / OEM 5U0413031. Pastilhas de freio dianteiras: Fras-le PD/58.',
      };

      const lower = query.toLowerCase();
      let reply = 'Estou com alta demanda de consultas, mas aqui está a recomendação padrão: verifique sempre o ano de fabricação, motorização (ex: 8V vs 16V) e se o veículo possui ar condicionado antes de finalizar a cotação no balcão!';
      if (lower.includes('ncm') || lower.includes('imposto')) reply = fallbackReplies.ncm;
      else if (lower.includes('gol')) reply = fallbackReplies.gol;

      const assistantMsg: ChatMessage = {
        id: `ast-${Date.now()}`,
        sender: 'assistant',
        text: reply,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickQuestion = (q: string) => {
    setInputPrompt(q);
    handleSendMessage(q);
  };

  return (
    <div className="space-y-6" id="view-suporte-chat">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-5 border border-sky-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sky-700 font-bold text-xs uppercase tracking-wider mb-1">
            <Bot className="w-4 h-4 text-sky-600" />
            <span>Suporte Técnico Integrado com IA Automotiva</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 font-['Outfit'] tracking-tight">
            Consultor Técnico & Tira-Dúvidas GATO
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
            Tire dúvidas em tempo real sobre compatibilidade veicular (ano, motor, câmbio, A/C), NCM e substituição tributária (ST), ou suporte operacional ao sistema.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1.5 rounded-xl">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>IA Especialista Online</span>
          </span>
        </div>
      </div>

      {/* Main Chat Box */}
      <div className="bg-white rounded-2xl border border-sky-100 shadow-sm flex flex-col h-[560px] overflow-hidden">
        {/* Quick Suggestion Chips */}
        <div className="p-3 bg-sky-50/70 border-b border-sky-100 flex items-center gap-2 overflow-x-auto text-xs">
          <span className="text-[10px] font-bold text-sky-900 uppercase shrink-0">Perguntas Rápidas:</span>
          <button
            type="button"
            onClick={() => handleQuickQuestion('Qual o NCM e regras de ICMS-ST para amortecedores e freios?')}
            className="px-2.5 py-1 bg-white border border-sky-200 rounded-lg text-slate-800 hover:bg-sky-100 shrink-0 font-medium"
          >
            NCM e ICMS-ST de Peças
          </button>
          <button
            type="button"
            onClick={() => handleQuickQuestion('Como funciona a importação de XML com código cadastrado vs não cadastrado?')}
            className="px-2.5 py-1 bg-white border border-sky-200 rounded-lg text-slate-800 hover:bg-sky-100 shrink-0 font-medium"
          >
            Como importar XML NF-e
          </button>
          <button
            type="button"
            onClick={() => handleQuickQuestion('Qual amortecedor e pastilha serve no Gol G5 1.0 Flex?')}
            className="px-2.5 py-1 bg-white border border-sky-200 rounded-lg text-slate-800 hover:bg-sky-100 shrink-0 font-medium"
          >
            Aplicação Gol G5
          </button>
          <button
            type="button"
            onClick={() => handleQuickQuestion('Qual óleo e viscosidade para Hilux 2.8 Diesel e Scania R450?')}
            className="px-2.5 py-1 bg-white border border-sky-200 rounded-lg text-slate-800 hover:bg-sky-100 shrink-0 font-medium"
          >
            Linha Pesada & Diesel
          </button>
        </div>

        {/* Message Stream */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4">
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <div
                key={msg.id}
                className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    isUser ? 'bg-sky-950 text-white' : 'bg-sky-600 text-white shadow-xs'
                  }`}
                >
                  {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                <div
                  className={`max-w-2xl rounded-2xl p-4 text-xs leading-relaxed ${
                    isUser
                      ? 'bg-sky-900 text-white rounded-tr-none'
                      : 'bg-slate-50 border border-slate-200 text-slate-800 rounded-tl-none space-y-1 whitespace-pre-line'
                  }`}
                >
                  <p>{msg.text}</p>
                  <span
                    className={`block text-[9px] mt-1 text-right ${
                      isUser ? 'text-sky-300' : 'text-slate-400'
                    }`}
                  >
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 animate-spin" />
              </div>
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl rounded-tl-none text-xs text-slate-500 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                <span>Consultando catálogo técnico de autopeças e regras tributárias...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
          <input
            type="text"
            id="chat-user-input-prompt"
            placeholder="Digite sua dúvida sobre veículo, código de peça, tributos ou suporte ao sistema..."
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSendMessage();
            }}
            disabled={isLoading}
            className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
          />
          <button
            type="button"
            id="btn-send-chat-message"
            onClick={() => handleSendMessage()}
            disabled={isLoading || !inputPrompt.trim()}
            className="p-3 bg-sky-950 hover:bg-sky-900 text-white rounded-xl shadow transition active:scale-95 disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
