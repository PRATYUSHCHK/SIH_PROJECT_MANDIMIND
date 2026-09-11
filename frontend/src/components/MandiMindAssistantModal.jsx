import { useState, useRef, useEffect } from 'react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useTranslation } from '../i18n/index.jsx';
import { DataStatusBadge } from './DataStatusBadge.jsx';
import {
  Sparkles,
  Send,
  X,
  Bot,
  User as UserIcon,
  Loader2,
  HelpCircle,
  Truck,
  IndianRupee,
  Users,
  Package,
} from 'lucide-react';

const SUGGESTIONS = [
  'What happens after we collect 1000 kg?',
  'Where is my potato?',
  'Has my potato order been collected?',
  'How is my farmer payment calculated?',
];

export function MandiMindAssistantModal({ isOpen, onClose }) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [messages, setMessages] = useState([
    {
      sender: 'assistant',
      text: `Hello ${user?.name || ''}! I am your MandiMind AI Agricultural Assistant. How can I help you with your crop listings, buyer requirements, supply pools, or delivery tracking today?`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  if (!isOpen) return null;

  async function handleSend(textToSend) {
    const q = (textToSend || input).trim();
    if (!q) return;

    const userMsg = {
      sender: 'user',
      text: q,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      const { data } = await api.post('/assistant/chat', { query: q });
      const assistantMsg = {
        sender: 'assistant',
        text: data.answer || "I couldn't process that query. Please try again.",
        contextType: data.contextType,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: "I am having trouble connecting to MandiMind intelligence right now. Please check your network and try again.",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-5 backdrop-blur-sm">
      <div className="flex h-[560px] max-h-[90vh] w-full max-w-xl flex-col rounded-2xl border border-line bg-white shadow-2xl dark:border-night-mute/20 dark:bg-night-card overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line/70 bg-gradient-to-r from-forest/15 via-earth/30 to-harvest/15 px-5 py-3.5 dark:border-night-mute/30">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-forest text-white shadow-md">
              <Sparkles size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-ink dark:text-night-text">MandiMind AI Assistant</h3>
                <span className="rounded-full bg-forest/20 px-2 py-0.2 text-[9px] font-extrabold text-forest uppercase">
                  Context-Aware
                </span>
              </div>
              <p className="text-[10px] text-mute">Supply Pool Lifecycle • Real-Time Order Intelligence</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-mute hover:bg-earth dark:hover:bg-night-lift hover:text-ink transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
          {messages.map((m, idx) => {
            const isUser = m.sender === 'user';
            return (
              <div
                key={idx}
                className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-forest text-white text-xs">
                    <Bot size={14} />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs shadow-sm ${
                    isUser
                      ? 'bg-forest text-white rounded-br-none dark:bg-harvest dark:text-ink font-medium'
                      : 'bg-earth/50 text-ink dark:bg-night-lift dark:text-night-text rounded-bl-none border border-line/40 dark:border-night-mute/20'
                  }`}
                >
                  <p className="leading-relaxed whitespace-pre-wrap">{m.text}</p>
                  <div
                    className={`mt-1 text-[9px] ${
                      isUser ? 'text-white/70 dark:text-ink/70 text-right' : 'text-mute'
                    }`}
                  >
                    {m.time}
                  </div>
                </div>
                {isUser && (
                  <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-earth text-ink dark:bg-night-lift dark:text-night-text text-xs font-bold">
                    {user?.avatarInitials || 'ME'}
                  </div>
                )}
              </div>
            );
          })}

          {loading && (
            <div className="flex gap-2.5 items-center text-mute text-xs">
              <div className="grid h-7 w-7 place-items-center rounded-full bg-forest text-white">
                <Bot size={14} />
              </div>
              <div className="flex items-center gap-1.5 rounded-2xl bg-earth/50 px-4 py-2.5 dark:bg-night-lift">
                <Loader2 size={13} className="animate-spin text-forest dark:text-harvest" />
                <span>Checking supply pools and logistics state...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="border-t border-line/50 bg-earth/20 px-4 py-2 dark:border-night-mute/20 dark:bg-night-lift/20">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
            {SUGGESTIONS.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSend(s)}
                className="shrink-0 rounded-full border border-line bg-white px-2.5 py-1 text-[10px] font-semibold text-ink hover:bg-earth hover:border-forest/40 dark:border-night-mute/30 dark:bg-night-card dark:text-night-text transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Input Field */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2 border-t border-line/60 bg-white p-3 dark:border-night-mute/30 dark:bg-night-card"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about orders, supply pools, shipments, or payments..."
            className="flex-1 rounded-xl border border-line px-3.5 py-2 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-forest/30 dark:border-night-mute/20 dark:bg-night-lift dark:text-night-text"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="grid h-8 w-8 place-items-center rounded-xl bg-forest text-white hover:bg-forest-deep disabled:opacity-40 transition-colors dark:bg-harvest dark:text-ink"
          >
            <Send size={14} />
          </button>
        </form>
      </div>
    </div>
  );
}
