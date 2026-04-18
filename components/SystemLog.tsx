import React, { useRef, useEffect } from 'react';
import { LogMessage } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { Terminal, Activity, Globe } from 'lucide-react';
import { format } from 'date-fns';

interface SystemLogProps {
  messages: LogMessage[];
}

const SystemLog: React.FC<SystemLogProps> = ({ messages }) => {
  const endOfMessagesRef = useRef<HTMLDivElement | null>(null);

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
    <Card className="bg-slate-900/40 border-slate-800/50 shadow-2xl rounded-[2rem] overflow-hidden flex flex-col h-[500px]">
      <CardHeader className="p-6 border-b border-slate-800/50 bg-slate-900/60">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
            <Terminal className="h-4 w-4 text-blue-500" />
            System Console
          </CardTitle>
          <Activity className="h-3.5 w-3.5 text-emerald-500 animate-pulse" />
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-grow">
        <ScrollArea className="h-full">
          <div className="p-6 font-mono text-[11px] space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-20 text-slate-700">
                <p className="uppercase tracking-widest">Awaiting System Feed...</p>
              </div>
            ) : (
              messages.map((msg, index) => (
                <div key={msg.id || index} className={`flex items-start gap-4 ${getLogStyle(msg.type)}`}>
                  <div className="flex flex-col items-end min-w-[60px] opacity-40">
                    <span>{format(new Date(msg.timestamp), 'HH:mm:ss')}</span>
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="leading-relaxed">{msg.text}</p>
                    {msg.location && (
                      <div className="flex items-center gap-1 text-[9px] opacity-30 uppercase font-black tracking-tighter">
                        <Globe className="w-2 h-2" />
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
      </CardContent>
    </Card>
  );
};

export default SystemLog;
