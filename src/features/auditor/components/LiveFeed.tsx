import React, { useEffect, useRef } from "react"
import { Loader2, CheckCircle2, Circle, ChevronRight } from "lucide-react"
import { Badge } from "@/components/ui/Badge"

export interface LogEntry {
  id: string;
  message: React.ReactNode;
  status: 'loading' | 'success' | 'info' | 'pending' | 'result';
  badgeType?: 'covered' | 'partial' | 'gap' | 'stale';
  indent?: boolean;
}

interface LiveFeedProps {
  logs: LogEntry[];
}

export function LiveFeed({ logs }: LiveFeedProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when logs change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const renderIcon = (status: LogEntry['status']) => {
    switch (status) {
      case 'loading':
        return <Loader2 className="w-4 h-4 text-indigo-500 animate-spin shrink-0" />;
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />;
      case 'pending':
        return <Circle className="w-4 h-4 text-gray-300 shrink-0" />;
      case 'info':
        return <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />;
      case 'result':
        return <div className="w-4 h-4 shrink-0" />; // Spacer for alignment
    }
  };

  return (
    <div className="flex flex-col w-full rounded-xl border border-gray-200 bg-gray-950 text-gray-300 font-mono text-sm overflow-hidden shadow-inner h-[400px]">
      <div className="flex items-center px-4 py-2 border-b border-gray-800 bg-gray-900">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
          <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
        </div>
        <span className="ml-4 text-xs text-gray-500 font-sans font-medium">Audit Execution Engine</span>
      </div>
      
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-2 scroll-smooth"
      >
        {logs.map((log) => (
          <div 
            key={log.id} 
            className={`flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300 ${log.indent ? 'ml-6 text-gray-400' : ''}`}
          >
            <div className="mt-0.5">
              {renderIcon(log.status)}
            </div>
            
            <div className="flex-1 break-words flex flex-wrap items-center gap-2">
              <span className={log.status === 'success' ? 'text-gray-200' : ''}>
                {log.message}
              </span>
              
              {log.status === 'result' && log.badgeType && (
                <Badge variant={log.badgeType} className="text-[10px] py-0 h-5">
                  {log.badgeType.toUpperCase()}
                </Badge>
              )}
            </div>
          </div>
        ))}
        
        {/* Blinking cursor */}
        {logs.length > 0 && logs[logs.length - 1].status === 'loading' && (
          <div className="flex items-center gap-2 mt-2 text-indigo-400">
            <span className="animate-pulse">_</span>
          </div>
        )}
      </div>
    </div>
  )
}
