import React from 'react';
import { LoginHistoryEntry } from '../types';
import { ScrollArea } from './ui/scroll-area';
import { MapPin, Clock, History } from 'lucide-react';
import { motion } from 'framer-motion';

interface LoginHistoryPanelProps {
  sessions: LoginHistoryEntry[];
}

const countryToFlag = (country: string): string => {
  const map: Record<string, string> = {
    India: '🇮🇳',
    'United States': '🇺🇸',
    'United Kingdom': '🇬🇧',
    Pakistan: '🇵🇰',
    Bangladesh: '🇧🇩',
    Germany: '🇩🇪',
    France: '🇫🇷',
    Spain: '🇪🇸',
    Brazil: '🇧🇷',
    Russia: '🇷🇺',
    China: '🇨🇳',
    Japan: '🇯🇵',
    'Saudi Arabia': '🇸🇦',
    Australia: '🇦🇺',
    Canada: '🇨🇦',
    Italy: '🇮🇹',
    Mexico: '🇲🇽',
    Argentina: '🇦🇷',
    'South Korea': '🇰🇷',
    Netherlands: '🇳🇱',
    Sweden: '🇸🇪',
    Norway: '🇳🇴',
    Portugal: '🇵🇹',
    Poland: '🇵🇱',
    Turkey: '🇹🇷',
  };
  return map[country] || '🌐';
};

const toValidDate = (value: unknown): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === 'object') {
    const v = value as { toDate?: () => Date; seconds?: number };
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

const formatDate = (value: unknown): string => {
  const date = toValidDate(value);
  if (!date) return 'Unknown date';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const LoginHistoryPanel: React.FC<LoginHistoryPanelProps> = ({ sessions }) => {
  return (
    <div className="rounded-2xl border border-slate-800/70 bg-slate-900/50 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-800/60 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <History className="h-4 w-4 text-blue-400" />
            Sign-ins
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Recent sessions on this device</p>
        </div>
        <span className="text-xs tabular-nums text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60">
          {sessions.length}
        </span>
      </div>

      <ScrollArea className="h-56">
        {sessions.length === 0 ? (
          <div className="text-center py-12 px-6">
            <div className="mx-auto w-11 h-11 rounded-xl bg-slate-800/50 flex items-center justify-center mb-2">
              <MapPin className="h-5 w-5 text-slate-600" />
            </div>
            <p className="text-sm text-slate-500">No sessions yet</p>
            <p className="text-xs text-slate-600 mt-1">History appears after you sign in.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-800/50">
            {sessions.map((session, idx) => {
              const isRecent = idx === 0;
              const flag = countryToFlag(session.country || '');
              return (
                <motion.li
                  key={session.id || String(session.timestamp)}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className={`px-5 py-3.5 flex items-start gap-3 ${isRecent ? 'bg-blue-500/[0.06]' : ''}`}
                >
                  <div
                    className={`mt-0.5 w-9 h-9 rounded-lg flex items-center justify-center text-base shrink-0 border ${
                      isRecent
                        ? 'bg-blue-500/15 border-blue-500/25'
                        : 'bg-slate-800/50 border-slate-700/60'
                    }`}
                  >
                    {flag}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-white truncate">
                        {session.city && session.city !== 'Unknown'
                          ? `${session.city}, ${session.country}`
                          : session.displayName || session.timezone}
                      </p>
                      {isRecent && (
                        <span className="shrink-0 text-[10px] bg-blue-500/15 text-blue-400 border border-blue-500/25 px-1.5 py-0.5 rounded-md font-medium">
                          Latest
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span title={formatDate(session.timestamp)}>
                        {timeAgo(session.timestamp)} · {formatDate(session.timestamp)}
                      </span>
                    </div>
                    {session.region && session.region !== 'Unknown' && (
                      <p className="text-xs text-slate-600 mt-0.5 truncate">{session.region}</p>
                    )}
                  </div>
                </motion.li>
              );
            })}
          </ul>
        )}
      </ScrollArea>
    </div>
  );
};

export default LoginHistoryPanel;
