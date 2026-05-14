import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MessageSquare, X, ArrowUp, Sparkles, User, FileText, Upload, Check, AlertTriangle, Paperclip } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { connectCopilotWS, uploadDocument, copilotChat } from '../../../api/client';
import type { WSMessage } from '../../../api/client';

interface Message {
  id: string;
  role: "user" | "agent";
  content: React.ReactNode;
  rawText?: string;
}

const SUGGESTIONS = [
  "Show my documents",
  "Run audit on ISO 27001",
  "Show findings",
  "Pending findings",
  "Audit status",
  "Generate report",
  "Explain A.9.1.1",
  "What frameworks are available?",
];

export default function AuditorChatbot() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<{action: string; params: any} | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const streamBufferRef = useRef("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "init-1",
      role: "agent",
      rawText: "Hello! I'm your Compliance Intelligence Copilot — connected in real-time to the platform.\n\nI can **upload documents**, **run audits**, **review findings**, and **generate reports** — all through this conversation.\n\nTry dragging a document into this chat, or ask me anything!",
      content: (
        <div className="space-y-2">
          <p>Hello! I'm your <strong>Compliance Intelligence Copilot</strong> — connected in real-time to the platform.</p>
          <p>I can <strong>upload documents</strong>, <strong>run audits</strong>, <strong>review findings</strong>, and <strong>generate reports</strong> — all through this conversation.</p>
          <p>Try dragging a document into this chat, or ask me anything!</p>
        </div>
      )
    }
  ]);

  // ── WebSocket Connection ─────────────────────────────────────────────

  const connectWS = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = connectCopilotWS(
      (msg: WSMessage) => {
        switch (msg.type) {
          case "auth_ok":
            setIsConnected(true);
            break;

          case "auth_error":
            setIsConnected(false);
            break;

          case "token":
            // Streaming token — append to buffer
            streamBufferRef.current += msg.content || "";
            // Update the last agent message in-place
            setMessages(prev => {
              const last = prev[prev.length - 1];
              if (last?.role === "agent" && last.id.startsWith("stream-")) {
                const updated = [...prev];
                const text = streamBufferRef.current;
                updated[updated.length - 1] = {
                  ...last,
                  rawText: text,
                  content: <div className="whitespace-pre-wrap">{text}</div>,
                };
                return updated;
              }
              return prev;
            });
            break;

          case "action": {
            setIsTyping(false);
            const data = msg.data;
            if (!data) break;

            if (data.type === "confirm") {
              // Show confirmation with buttons
              setPendingConfirm({ action: data.action, params: data.params });
              setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: "agent",
                rawText: data.content,
                content: <div className="whitespace-pre-wrap">{data.content}</div>,
              }]);
            } else if (data.type === "findings") {
              // Render findings as rich cards
              const items = data.content || [];
              setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: "agent",
                rawText: data.summary,
                content: (
                  <div className="space-y-2">
                    <p className="font-medium">{data.summary}</p>
                    <div className="max-h-60 overflow-y-auto space-y-1.5 mt-2">
                      {items.slice(0, 10).map((f: any) => (
                        <div key={f.id} className="bg-white border border-gray-200 rounded-lg p-2.5 text-xs">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-gray-700">{f.controlId}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                              f.severity === 'high' ? 'bg-red-100 text-red-700' :
                              f.severity === 'medium' ? 'bg-amber-100 text-amber-700' :
                              'bg-green-100 text-green-700'
                            }`}>{f.severity}</span>
                          </div>
                          <p className="text-gray-600 mt-0.5 line-clamp-1">{f.controlName}</p>
                          <div className="flex justify-between mt-1">
                            <span className={`text-[10px] uppercase font-semibold ${
                              f.reviewStatus === 'accepted' ? 'text-green-600' :
                              f.reviewStatus === 'rejected' ? 'text-red-600' :
                              f.reviewStatus === 'modified' ? 'text-purple-600' :
                              'text-gray-400'
                            }`}>{f.reviewStatus}</span>
                            <span className="text-gray-400">{Math.round(f.confidence * 100)}%</span>
                          </div>
                        </div>
                      ))}
                      {items.length > 10 && (
                        <p className="text-gray-400 text-xs text-center pt-1">+ {items.length - 10} more findings</p>
                      )}
                    </div>
                  </div>
                ),
              }]);
            } else if (data.type === "documents") {
              const items = data.content || [];
              setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: "agent",
                rawText: data.summary,
                content: (
                  <div className="space-y-2">
                    <p className="font-medium">{data.summary}</p>
                    <div className="space-y-1.5 mt-2">
                      {items.map((d: any) => (
                        <div key={d.id} className="bg-white border border-gray-200 rounded-lg p-2.5 text-xs flex items-center gap-2">
                          <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-800 truncate">{d.filename}</p>
                            <p className="text-gray-400">{d.size} · {d.uploaded}</p>
                          </div>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                            d.masking === 'complete' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                          }`}>{d.masking}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ),
              }]);
            } else {
              // Plain text action result
              setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: "agent",
                rawText: data.content,
                content: <div className="whitespace-pre-wrap">{data.content}</div>,
              }]);
            }
            break;
          }

          case "done":
            setIsTyping(false);
            streamBufferRef.current = "";
            break;
        }
      },
      () => {
        setIsConnected(false);
        // Auto-reconnect after 3 seconds
        setTimeout(connectWS, 3000);
      }
    );

    wsRef.current = ws;
  }, []);

  useEffect(() => {
    if (isOpen) {
      connectWS();
    }
    return () => {
      // Don't close WS when panel closes — keep connection alive
    };
  }, [isOpen, connectWS]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isTyping]);

  // ── Send Message ─────────────────────────────────────────────────────

  const handleSend = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text, rawText: text };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);
    setPendingConfirm(null);

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      // Add a placeholder streaming message
      const streamId = `stream-${Date.now()}`;
      streamBufferRef.current = "";
      setMessages(prev => [...prev, {
        id: streamId,
        role: "agent",
        rawText: "",
        content: <div className="whitespace-pre-wrap"></div>,
      }]);

      wsRef.current.send(JSON.stringify({ type: "message", content: text }));
    } else {
      // Fallback to HTTP if WS not connected
      try {
        const history = messages
          .filter(m => m.rawText)
          .map(m => ({ role: m.role === "agent" ? "assistant" : "user", content: m.rawText! }));
        history.push({ role: "user", content: text });

        const responseText = await copilotChat(history, "compliance-audit");
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: "agent",
          rawText: responseText,
          content: <div className="whitespace-pre-wrap">{responseText}</div>
        }]);
      } catch {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: "agent",
          rawText: "Connection error. Trying to reconnect...",
          content: <p className="text-amber-600">Connection error. Trying to reconnect...</p>
        }]);
        connectWS();
      } finally {
        setIsTyping(false);
      }
    }
  };

  // ── Confirm Action ───────────────────────────────────────────────────

  const handleConfirm = (confirmed: boolean) => {
    if (!pendingConfirm) return;

    if (confirmed && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "confirm_action",
        action: pendingConfirm.action,
        params: pendingConfirm.params,
      }));
      setIsTyping(true);
      setMessages(prev => [...prev, {
        id: Date.now().toString(), role: "user", content: "✅ Yes, proceed!", rawText: "Yes, proceed"
      }]);
    } else {
      setMessages(prev => [...prev, {
        id: Date.now().toString(), role: "user", content: "❌ Cancelled", rawText: "Cancelled"
      }]);
    }
    setPendingConfirm(null);
  };

  // ── File Upload ──────────────────────────────────────────────────────

  const handleFileUpload = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'docx', 'txt'].includes(ext || '')) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(), role: "agent",
        content: <p className="text-red-500">⚠️ Only PDF, DOCX, and TXT files are supported.</p>
      }]);
      return;
    }

    setMessages(prev => [...prev, {
      id: Date.now().toString(), role: "user",
      content: (
        <div className="flex items-center gap-2">
          <Paperclip className="w-4 h-4" />
          <span>{file.name}</span>
          <span className="text-xs opacity-60">({(file.size / 1024).toFixed(0)} KB)</span>
        </div>
      ),
      rawText: `Uploaded: ${file.name}`,
    }]);

    try {
      await uploadDocument(file);

      // Notify WebSocket
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "file_uploaded", filename: file.name }));
      } else {
        setMessages(prev => [...prev, {
          id: Date.now().toString(), role: "agent",
          rawText: `${file.name} uploaded successfully!`,
          content: <p>📎 <strong>{file.name}</strong> uploaded! Processing PII masking and embeddings...</p>
        }]);
      }
    } catch (err: any) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(), role: "agent",
        content: <p className="text-red-500">❌ Upload failed: {err.message || "Unknown error"}</p>
      }]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
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
        <div
          className={`fixed bottom-6 right-6 w-[420px] h-[680px] max-h-[88vh] bg-white rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.25)] flex flex-col z-50 overflow-hidden border border-gray-200 animate-in slide-in-from-bottom-10 fade-in duration-300 ${isDragging ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          
          {/* HEADER */}
          <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-white shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 leading-none">Auditor Copilot</h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-500' : 'bg-amber-500'}`}></span>
                  <span className="text-xs text-gray-500 font-medium">
                    {isConnected ? 'Live — Streaming' : 'Connecting...'}
                  </span>
                </div>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* DRAG OVERLAY */}
          {isDragging && (
            <div className="absolute inset-0 bg-indigo-50/90 z-10 flex flex-col items-center justify-center rounded-2xl">
              <Upload className="w-10 h-10 text-indigo-500 mb-2" />
              <p className="text-indigo-700 font-semibold">Drop document here</p>
              <p className="text-indigo-400 text-sm">PDF, DOCX, or TXT</p>
            </div>
          )}

          {/* MESSAGE FEED */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-gray-50/50">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                
                {/* Avatar */}
                <div className="shrink-0">
                  {msg.role === 'user' ? (
                    <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center">
                      <User className="w-3.5 h-3.5 text-gray-600" />
                    </div>
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center">
                      <Sparkles className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                </div>

                {/* Bubble */}
                <div className={`max-w-[85%] ${msg.role === 'user' ? 'bg-gray-900 text-white px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm' : 'text-gray-800 text-sm leading-relaxed'}`}>
                  {msg.content}
                </div>

              </div>
            ))}

            {/* Confirm Buttons */}
            {pendingConfirm && (
              <div className="flex gap-2 pl-10">
                <button
                  onClick={() => handleConfirm(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" /> Yes, proceed
                </button>
                <button
                  onClick={() => handleConfirm(false)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold px-4 py-2 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}
            
            {isTyping && !streamBufferRef.current && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '75ms'}}></div>
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* INPUT AREA */}
          <div className="p-4 bg-white border-t border-gray-100 shrink-0">
            
            {/* Suggestions */}
            <div className="flex overflow-x-auto gap-1.5 pb-3 no-scrollbar scroll-smooth">
              {SUGGESTIONS.map((sug, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(sug)}
                  className="shrink-0 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 px-2.5 py-1.5 rounded-full transition-colors border border-transparent hover:border-gray-300 cursor-pointer"
                >
                  {sug}
                </button>
              ))}
            </div>

            {/* Input Box */}
            <div className="relative flex items-end border border-gray-300 rounded-xl bg-white shadow-sm focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition-all">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 text-gray-400 hover:text-indigo-600 transition-colors cursor-pointer"
                title="Attach document"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt"
                className="hidden"
                onChange={(e) => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0]); e.target.value = ''; }}
              />
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything or drop a document..."
                className="w-full max-h-32 min-h-[44px] py-3 pr-12 bg-transparent border-none focus:ring-0 focus:outline-none resize-none text-sm placeholder:text-gray-400 no-scrollbar"
                rows={1}
              />
              <button
                onClick={() => handleSend(input)}
                disabled={!input.trim() || isTyping}
                className="absolute right-2 bottom-2 w-7 h-7 bg-indigo-600 text-white rounded-lg flex items-center justify-center disabled:opacity-50 disabled:bg-gray-200 disabled:text-gray-400 transition-colors cursor-pointer"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
            </div>
            <div className="text-center mt-2">
              <span className="text-[10px] text-gray-400">Real-time AI · Drop files to upload · All actions persist to DB</span>
            </div>
          </div>
          
        </div>
      )}
    </>
  );
}
