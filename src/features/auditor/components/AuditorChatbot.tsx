import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, ArrowUp, Sparkles, User, FileText, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { copilotChat } from '../../../api/client';

interface Message {
  id: string;
  role: "user" | "agent";
  content: React.ReactNode;
  rawText?: string;
}

const SUGGESTIONS = [
  "Explain ISO A.9.2.5",
  "Summarize pending gaps",
  "Generate final report",
  "What is adversarial debate?",
];

export default function AuditorChatbot() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "init-1",
      role: "agent",
      rawText: "Hello! I am your Compliance Intelligence Assistant. I am directly connected to the platform's reasoning engine. I can help you configure your audit, analyze complex framework controls, summarize evidence gaps, or generate your final reports. How can I assist you today?",
      content: (
        <div className="space-y-2">
          <p>Hello! I am your <strong>Compliance Intelligence Assistant</strong>.</p>
          <p>I am directly connected to the platform's reasoning engine. I can help you configure your audit, analyze complex framework controls, summarize evidence gaps, or generate your final reports.</p>
          <p>How can I assist you today?</p>
        </div>
      )
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isTyping]);

  const handleSend = async (text: string) => {
    if (!text.trim()) return;
    
    // Add User Message
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text, rawText: text };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    try {
      // Build conversation history for the API
      const history = messages
        .filter(m => m.rawText)
        .map(m => ({ role: m.role === "agent" ? "assistant" : "user", content: m.rawText! }));
      history.push({ role: "user", content: text });

      // Call real copilot API
      const responseText = await copilotChat(history, "compliance-audit");
      
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: "agent",
        rawText: responseText,
        content: <div className="whitespace-pre-wrap">{responseText}</div>
      }]);
    } catch (err: any) {
      // Fallback if API is unreachable
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: "agent",
        rawText: "I'm having trouble connecting to the reasoning engine right now. Please try again shortly.",
        content: <p className="text-amber-600">I'm having trouble connecting to the reasoning engine right now. Please try again shortly.</p>
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(input);
    }
  };

  return (
    <>
      {/* FLOATING ACTION BUTTON */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-gray-900 hover:bg-gray-800 text-white rounded-full shadow-2xl flex items-center justify-center transition-transform hover:scale-105 z-50 animate-in fade-in zoom-in duration-300"
        >
          <Sparkles className="w-6 h-6" />
        </button>
      )}

      {/* CHAT PANEL */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-[400px] h-[650px] max-h-[85vh] bg-white rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.25)] flex flex-col z-50 overflow-hidden border border-gray-200 animate-in slide-in-from-bottom-10 fade-in duration-300">
          
          {/* HEADER */}
          <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-white shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 leading-none">Auditor Copilot</h3>
                <span className="text-xs text-indigo-600 font-medium">Platform Brain Online</span>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* MESSAGE FEED */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-gray-50/50">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                
                {/* Avatar */}
                <div className="shrink-0">
                  {msg.role === 'user' ? (
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                      <User className="w-4 h-4 text-gray-600" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>

                {/* Bubble */}
                <div className={`max-w-[80%] ${msg.role === 'user' ? 'bg-gray-900 text-white px-4 py-3 rounded-2xl rounded-tr-sm text-sm' : 'text-gray-800 text-sm leading-relaxed'}`}>
                  {msg.content}
                </div>

              </div>
            ))}
            
            {isTyping && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* INPUT AREA */}
          <div className="p-4 bg-white border-t border-gray-100 shrink-0">
            
            {/* Suggestions */}
            <div className="flex overflow-x-auto gap-2 pb-3 no-scrollbar scroll-smooth">
              {SUGGESTIONS.map((sug, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(sug)}
                  className="shrink-0 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-full transition-colors border border-transparent hover:border-gray-300"
                >
                  {sug}
                </button>
              ))}
            </div>

            {/* Input Box */}
            <div className="relative flex items-end border border-gray-300 rounded-xl bg-white shadow-sm focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition-all">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about frameworks, evidence, or commands..."
                className="w-full max-h-32 min-h-[44px] py-3 pl-4 pr-12 bg-transparent border-none focus:ring-0 resize-none text-sm placeholder:text-gray-400 no-scrollbar"
                rows={1}
              />
              <button
                onClick={() => handleSend(input)}
                disabled={!input.trim() || isTyping}
                className="absolute right-2 bottom-2 w-7 h-7 bg-indigo-600 text-white rounded-lg flex items-center justify-center disabled:opacity-50 disabled:bg-gray-200 disabled:text-gray-400 transition-colors"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
            </div>
            <div className="text-center mt-2">
              <span className="text-[10px] text-gray-400">AI can make mistakes. Verify important findings.</span>
            </div>
          </div>
          
        </div>
      )}
    </>
  );
}
