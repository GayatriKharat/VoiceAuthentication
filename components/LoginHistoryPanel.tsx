import React from 'react';
import { LoginHistoryEntry } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { MapPin, Clock, History } from 'lucide-react';
import { motion } from 'framer-motion';

interface LoginHistoryPanelProps {
  sessions: LoginHistoryEntry[];
}

/** Country code → flag emoji (approximation via regional indicators) */
const countryToFlag = (country: string): string => {
  const map: Record<string, string> = {
    'India': '🇮🇳', 'United States': '🇺🇸', 'United Kingdom': '🇬🇧',
    'Pakistan': '🇵🇰', 'Bangladesh': '🇧🇩', 'Germany': '🇩🇪',
    'France': '🇫🇷', 'Spain': '🇪🇸', 'Brazil': '🇧🇷', 'Russia': '🇷🇺',
    'China': '🇨🇳', 'Japan': '🇯🇵', 'Saudi Arabia': '🇸🇦',
    'Australia': '🇦🇺', 'Canada': '🇨🇦', 'Italy': '🇮🇹',
    'Mexico': '🇲🇽', 'Argentina': '🇦🇷', 'South Korea': '🇰🇷',
    'Netherlands': '🇳🇱', 'Sweden': '🇸🇪', 'Norway': '🇳🇴',
    'Portugal': '🇵🇹', 'Poland': '🇵🇱', 'Turkey': '🇹🇷',
  };
  return map[country] || '🌐';
};

/** Format timestamp to human-readable relative time */
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

/** Format timestamp to human-readable relative time */
const timeAgo = (value: unknown): string => {
  const date = toValidDate(value);
  if (!date) return 'Unknown time';
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60_000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  return `${days}d ago`;
};

/** Format timestamp to date string */
const formatDate = (value: unknown): string => {
  const date = toValidDate(value);
  if (!date) return 'Unknown date';
  return date.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const LoginHistoryPanel: React.FC<LoginHistoryPanelProps> = ({ sessions }) => {
  return (
    <Card className="bg-slate-900/40 border-slate-800/50 shadow-2xl overflow-hidden rounded-[2rem]">
      <CardHeader className="border-b border-slate-800/50 bg-slate-900/60 p-6">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
            <History className="h-4 w-4 text-blue-500" />
            Login History
          </CardTitle>
          <span className="text-[10px] font-mono text-slate-600 border border-slate-800 bg-slate-800/50 px-2 py-1 rounded-lg">
            {sessions.length} session{sessions.length !== 1 ? 's' : ''}
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea className="h-64">
          {sessions.length === 0 ? (
            <div className="text-center py-16 px-6 space-y-3">
              <div className="mx-auto w-12 h-12 bg-slate-800/50 rounded-2xl flex items-center justify-center opacity-30">
                <MapPin className="h-6 w-6 text-slate-400" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-500">No sessions recorded</p>
                <p className="text-[10px] text-slate-700 uppercase tracking-widest">
                  Login history will appear here
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/30">
              {sessions.map((session, idx) => {
                const isRecent = idx === 0;
                const flag = countryToFlag(session.country || '');
                return (
                  <motion.div
                    key={session.id || session.timestamp}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className={`p-4 flex items-start gap-3 hover:bg-slate-800/20 transition-all ${
                      isRecent ? 'bg-blue-500/5' : ''
                    }`}
                  >
                    {/* Flag / indicator */}
                    <div className={`mt-0.5 w-8 h-8 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${
                      isRecent
                        ? 'bg-blue-600/20 border border-blue-500/20'
                        : 'bg-slate-800/50 border border-slate-700/50'
                    }`}>
                      {flag}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold text-white truncate">
                          {session.city && session.city !== 'Unknown'
                            ? `${session.city}, ${session.country}`
                            : session.displayName || session.timezone}
                        </p>
                        {isRecent && (
                          <span className="flex-shrink-0 text-[9px] bg-blue-600/20 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded-md font-black uppercase tracking-widest">
                            Current
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Clock className="w-3 h-3 text-slate-600" />
                        <span className="text-[10px] text-slate-500" title={formatDate(session.timestamp)}>
                          {timeAgo(session.timestamp)} · {formatDate(session.timestamp)}
                        </span>
                      </div>
                      {session.region && session.region !== 'Unknown' && (
                        <p className="text-[10px] text-slate-600 mt-0.5 truncate">
                          {session.region}
                        </p>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default LoginHistoryPanel;
