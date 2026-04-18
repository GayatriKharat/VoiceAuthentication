import React, { useState, useMemo } from 'react';
import { FileHistoryEntry } from '../types';
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
    <div className="rounded-2xl border border-slate-800/70 bg-slate-900/50 overflow-hidden flex flex-col h-[min(320px,36vh)] md:h-[min(360px,40vh)]">
      <div className="p-4 border-b border-slate-800/60 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <History className="h-4 w-4 text-blue-400" />
              File audit
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Encrypt and decrypt events</p>
          </div>
          <Badge variant="outline" className="bg-slate-800/80 text-slate-400 border-slate-700/60 text-xs tabular-nums">
            {filteredHistory.length}
          </Badge>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
          <Input
            placeholder="Search by file or user…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-slate-800/60 border-slate-700/60 pl-9 h-9 text-sm rounded-lg"
          />
        </div>
      </div>
      <div className="p-0 flex-1 min-h-0">
        <ScrollArea className="h-full">
          {filteredHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-600 gap-2">
              <FileText className="h-9 w-9 opacity-25" />
              <p className="text-sm text-slate-500">No events yet</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-800/50">
              {filteredHistory.map((entry) => (
                <li key={entry.id} className="px-4 py-3.5 flex items-center justify-between gap-3 hover:bg-slate-800/25 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2 rounded-lg border shrink-0 ${
                        entry.operation === 'encrypt'
                          ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                          : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      }`}
                    >
                      {entry.operation === 'encrypt' ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{entry.fileName}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                        <span className="truncate">{entry.userName}</span>
                        <span className="text-slate-700">·</span>
                        <span className="flex items-center gap-1 shrink-0 text-slate-600">
                          <Globe className="h-3 w-3" />
                          {entry.location || '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-1.5 py-0 h-5 border-0 ${
                        entry.status === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                      }`}
                    >
                      {entry.status}
                    </Badge>
                    <p className="text-[11px] text-slate-600 font-mono mt-1">
                      {(() => {
                        const date = toValidDate(entry.timestamp);
                        return date ? format(date, 'HH:mm:ss') : '—';
                      })()}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </div>
    </div>
  );
};

export default FileHistoryPanel;
