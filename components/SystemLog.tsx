import React, { useRef, useEffect } from 'react';
import { LogMessage } from '../types';
import { ScrollArea } from './ui/scroll-area';
import { Terminal, Activity, Globe } from 'lucide-react';
import { format } from 'date-fns';

interface SystemLogProps {
  messages: LogMessage[];
}

const SystemLog: React.FC<SystemLogProps> = ({ messages }) => {
  const endOfMessagesRef = useRef<HTMLDivElement | null>(null);

  const toValidDate = (value: unknown): Date | null => {
    if (!value) return null;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
    if (typeof value === 'string' || typeof value === 'number') {
      const d = new Date(value);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    if (typeof value === 'object') {
      const v = value as any;
      if (typeof v.toDate === 'function') {
        const d = v.toDate();
        return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null;
      }
      if (typeof v.seconds === 'number') {
        const d = new Date(v.seconds * 1000);
        return Number.isNaN(d.getTime()) ? null : d;
      }
    }
    return null;
  };

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getLogStyle = (type: LogMessage['type']) => {
    switch (type) {
      case 'info':
        return 'text-slate-400';
      case 'success':
        return 'text-emerald-400';
      case 'error':
        return 'text-red-400';
      case 'warning':
        return 'text-amber-400';
      default:
        return 'text-slate-300';
    }
  };

  return (
    <div className="rounded-2xl border border-slate-800/70 bg-slate-900/50 overflow-hidden flex flex-col h-[min(320px,36vh)] md:h-[min(360px,40vh)]">
      <div className="px-5 py-4 border-b border-slate-800/60 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Terminal className="h-4 w-4 text-blue-400" />
            Console
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">App messages and diagnostics</p>
        </div>
        <Activity className="h-3.5 w-3.5 text-emerald-500/80 animate-pulse shrink-0" />
      </div>
      <div className="p-0 flex-1 min-h-0">
        <ScrollArea className="h-full">
          <div className="p-4 font-mono text-[12px] leading-relaxed space-y-3">
            {messages.length === 0 ? (
              <div className="text-center py-14 text-slate-600 text-sm">No messages yet</div>
            ) : (
              messages.map((msg, index) => (
                <div key={msg.id || index} className={`flex items-start gap-3 ${getLogStyle(msg.type)}`}>
                  <span className="min-w-[52px] shrink-0 text-slate-600 text-[11px] tabular-nums">
                    {(() => {
                      const date = toValidDate(msg.timestamp);
                      return date ? format(date, 'HH:mm:ss') : '—';
                    })()}
                  </span>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <p>{msg.text}</p>
                    {msg.location && (
                      <div className="flex items-center gap-1 text-[10px] text-slate-600">
                        <Globe className="w-3 h-3 shrink-0" />
                        {msg.location}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={endOfMessagesRef} />
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default SystemLog;
