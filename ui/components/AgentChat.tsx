'use client';

import { useEffect, useRef, useState } from 'react';

interface Message {
  id: string;
  role: 'user' | 'agent';
  content: string;
  loading?: boolean;
}

const DEMO_QUERIES = [
  'Analyze our floor energy consumption and identify all operational inefficiencies from the past hour.',
  'Has conveyor_03 experienced this fault pattern before? What was the previous resolution?',
  'What is the current status of all machines and their energy footprint?',
  'Generate a maintenance report including all fault occurrences and resolutions.',
];

export default function AgentChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'agent',
      content: 'Plant Manager Agent online. I have access to the factory episodic memory — all anomalies, state transitions, and historical fault records stored in Supermemory. Ask me anything about the production floor.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage(query: string) {
    if (!query.trim() || loading) return;
    setInput('');
    setLoading(true);

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: query };
    const agentMsgId = (Date.now() + 1).toString();
    const agentMsg: Message = { id: agentMsgId, role: 'agent', content: '', loading: true };

    setMessages(prev => [...prev, userMsg, agentMsg]);

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      if (!res.ok) throw new Error(`Agent error: ${res.status}`);
      if (!res.body) throw new Error('No response body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setMessages(prev =>
          prev.map(m => m.id === agentMsgId ? { ...m, content: accumulated, loading: false } : m)
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setMessages(prev =>
        prev.map(m =>
          m.id === agentMsgId
            ? { ...m, content: `Error: ${msg}`, loading: false }
            : m
        )
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full bg-gray-900/50 rounded-xl border border-gray-800">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-sm">🤖</div>
        <div>
          <div className="text-sm font-semibold text-gray-200">Plant Manager Agent</div>
          <div className="text-[10px] text-gray-500">Powered by Supermemory + Groq llama-3.3-70b</div>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] text-gray-500">Online</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[90%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-indigo-600/80 text-white rounded-br-none'
                : 'bg-gray-800 text-gray-200 rounded-bl-none border border-gray-700'
            }`}>
              {msg.loading ? (
                <div className="flex items-center gap-1.5 py-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:0ms]" />
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:150ms]" />
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:300ms]" />
                </div>
              ) : (
                <span className="whitespace-pre-wrap">{msg.content}</span>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Demo queries */}
      <div className="px-3 pb-2">
        <div className="text-[10px] text-gray-600 mb-1.5 uppercase tracking-wider">Quick queries</div>
        <div className="flex flex-wrap gap-1.5">
          {DEMO_QUERIES.map((q, i) => (
            <button
              key={i}
              onClick={() => sendMessage(q)}
              disabled={loading}
              className="text-[10px] px-2 py-1 rounded-full bg-gray-800 text-gray-400 border border-gray-700 hover:border-indigo-600 hover:text-indigo-400 transition-colors disabled:opacity-50 text-left"
            >
              {q.length > 50 ? q.slice(0, 48) + '…' : q}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="p-3 border-t border-gray-800">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
            placeholder="Ask the Plant Manager Agent…"
            disabled={loading}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {loading ? '…' : '↑'}
          </button>
        </div>
      </div>
    </div>
  );
}
