import React, { useState, useMemo } from 'react';
import { FileHistoryEntry } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Lock, Unlock, FileText, Search, History, Globe } from 'lucide-react';
import { format } from 'date-fns';

interface FileHistoryPanelProps {
  history: FileHistoryEntry[];
}

const FileHistoryPanel: React.FC<FileHistoryPanelProps> = ({ history }) => {
  const [searchTerm, setSearchTerm] = useState('');

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

  const filteredHistory = useMemo(() => {
    return history.filter((entry) => {
      const lowerSearch = searchTerm.toLowerCase();
      return (
        entry.fileName.toLowerCase().includes(lowerSearch) ||
        entry.userName.toLowerCase().includes(lowerSearch)
      );
    });
  }, [history, searchTerm]);

  return (
    <Card className="bg-slate-900/40 border-slate-800/50 shadow-2xl rounded-[2rem] overflow-hidden flex flex-col h-[500px]">
      <CardHeader className="p-6 border-b border-slate-800/50 bg-slate-900/60">
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
              <History className="h-4 w-4 text-blue-500" />
              Audit Trail
            </CardTitle>
            <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[10px] font-mono">
              {filteredHistory.length} Events
            </Badge>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            <Input 
              placeholder="Search audit trail..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-800/50 border-slate-700/50 pl-10 h-10 text-xs rounded-xl"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-grow">
        <ScrollArea className="h-full">
          {filteredHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-600 space-y-3">
              <FileText className="h-10 w-10 opacity-20" />
              <p className="text-xs font-bold uppercase tracking-widest">No Security Events</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/30">
              {filteredHistory.map((entry) => (
                <div key={entry.id} className="p-5 flex items-center justify-between hover:bg-slate-800/20 transition-all">
                  <div className="flex items-center gap-4">
                    <div className={`p-2.5 rounded-xl border ${
                      entry.operation === 'encrypt' 
                        ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' 
                        : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    }`}>
                      {entry.operation === 'encrypt' ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white truncate max-w-[180px]">{entry.fileName}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-slate-500 font-medium">{entry.userName}</span>
                        <span className="text-[10px] text-slate-700">•</span>
                        <span className="text-[9px] text-slate-600 flex items-center gap-1 font-bold uppercase tracking-tighter">
                          <Globe className="h-2.5 w-2.5" />
                          {entry.location || 'Global'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className={`text-[8px] font-black uppercase px-1.5 h-4 mb-1 border-none ${
                      entry.status === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                    }`}>
                      {entry.status}
                    </Badge>
                    <p className="text-[9px] text-slate-600 font-mono">
                      {(() => {
                        const date = toValidDate(entry.timestamp);
                        return date ? format(date, 'HH:mm:ss') : '--:--:--';
                      })()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default FileHistoryPanel;
