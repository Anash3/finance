'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, ChevronDown, ChevronRight, Terminal, CheckCircle2, Cpu } from 'lucide-react';

// --- TYPES ---
type AgentStep = {
  type: 'thought' | 'tool_call' | 'observation';
  title: string;
  details: string;
};

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string; 
  steps?: AgentStep[];
  isThinking?: boolean;
  isExpanded?: boolean; 
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const toggleExpand = (id: string) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, isExpanded: !m.isExpanded } : m));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setInput('');
    setIsLoading(true);

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: userText };
    const assistantMsgId = (Date.now() + 1).toString();
    
    // Initialize assistant message
    const assistantMsg: Message = { 
      id: assistantMsgId, role: 'assistant', content: '', steps: [], isThinking: true, isExpanded: false 
    };

    setMessages(prev => [...prev, userMsg, assistantMsg]);

    try {
      const response = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userText }),
      });

      if (!response.body) throw new Error('No stream');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value, { stream: true }).split('\n').filter(l => l.trim() !== '');

        setMessages(prev => {
          const newMessages = [...prev];
          const idx = newMessages.findIndex(m => m.id === assistantMsgId);
          if (idx === -1) return prev;
          
          const currentMsg = { ...newMessages[idx] };
          if (!currentMsg.steps) currentMsg.steps = [];

          for (const line of lines) {
            try {
              const data = JSON.parse(line);

              // 1. THOUGHTS
              if (data.type === 'thought') {
                 // Sometimes the final text is just in a thought, capture it if it looks like an answer
                 if (data.content.startsWith("Final Answer:")) {
                    currentMsg.content = data.content.replace("Final Answer:", "").trim();
                 } else {
                    currentMsg.steps.push({ type: 'thought', title: 'Reasoning', details: data.content });
                 }
              } 
              // 2. TOOL CALLS
              else if (data.type === 'tool_call') {
                // INTERCEPT "final_answer" TOOL
                if (data.tool === 'final_answer') {
                    // Extract the answer from the arguments
                    const args = typeof data.args === 'string' ? JSON.parse(data.args) : data.args;
                    if (args && args.answer) {
                        currentMsg.content = args.answer;
                    }
                    // We DO NOT add this to 'steps' so it stays hidden from the logs
                } else {
                    // Normal tool calls go into the logs
                    currentMsg.steps.push({ type: 'tool_call', title: `Used ${data.tool}`, details: JSON.stringify(data.args) });
                }
              } 
              // 3. OBSERVATIONS
              else if (data.type === 'observation') {
                // Only add observation if the previous step wasn't our hidden final_answer
                const lastStep = currentMsg.steps[currentMsg.steps.length - 1];
                // Only add result if the last thing logged was actually a tool call
                if (lastStep && lastStep.type === 'tool_call') {
                   currentMsg.steps.push({ type: 'observation', title: 'Result', details: data.content });
                }
              }

            } catch (e) { console.error(e); }
          }
          newMessages[idx] = currentMsg;
          return newMessages;
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
      setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, isThinking: false } : m));
    }
  };

  return (
    <div className="app-layout">
      <div className="chat-feed">
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', marginTop: '20vh', opacity: 0.5 }}>
            <Bot size={48} style={{ margin: '0 auto 20px' }} />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 500 }}>MCP Agent Online</h2>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={msg.role === 'user' ? 'msg-user' : 'msg-agent'}>
            
            {/* USER MESSAGE */}
            {msg.role === 'user' && msg.content}

            {/* AGENT MESSAGE */}
            {msg.role === 'assistant' && (
              <>
                {/* 1. COLLAPSIBLE LOGS (Hidden by default) */}
                {(msg.steps && msg.steps.length > 0) && (
                  <div className="thought-process">
                    <div className="thought-header" onClick={() => toggleExpand(msg.id)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {msg.isThinking ? <Cpu size={16} className="animate-pulse" /> : <CheckCircle2 size={16} color="#10b981" />}
                        <span>
                          {msg.isThinking ? "Thinking..." : `Processed ${msg.steps.length} steps`}
                        </span>
                      </div>
                      {msg.isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </div>

                    {msg.isExpanded && (
                      <div className="thought-content">
                        {msg.steps.map((step, i) => (
                          <div key={i} className={`step-row ${step.type}`}>
                            <div style={{ display: 'flex', gap: '6px', fontWeight: 600, alignItems: 'center' }}>
                              {step.type === 'tool_call' && <Terminal size={12} />}
                              {step.title}
                            </div>
                            <div className="code-block">
                              {step.details.length > 200 ? step.details.slice(0, 200) + "..." : step.details}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 2. FINAL ANSWER (Displayed Cleanly Below) */}
                {/* Inside app/page.tsx */}

{msg.content && (
  <div 
    className="final-answer animate-in fade-in" 
    style={{ whiteSpace: 'pre-wrap' }} // <--- Add this style
  >
    {msg.content}
  </div>
)}
              </>
            )}
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      <form className="input-container" onSubmit={handleSubmit}>
        <input 
          className="chat-input" 
          placeholder="Ask a question..." 
          value={input} 
          onChange={e => setInput(e.target.value)} 
          disabled={isLoading}
        />
        <button type="submit" className="submit-btn" disabled={isLoading || !input.trim()}>
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}