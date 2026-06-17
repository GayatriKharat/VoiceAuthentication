import React, { useMemo } from 'react';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import type { UserSecurityEvent } from '../types';
import { ScrollArea } from './ui/scroll-area';
import { Shield, Activity } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../firebase';

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

const formatWhen = (value: unknown): string => {
  const d = toValidDate(value);
  if (!d) return '—';
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const actionStyle = (action: string): string => {
  switch (action) {
    case 'LOGIN_SUCCESS':
      return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    case 'LOGOUT':
      return 'text-slate-400 bg-slate-800/80 border-slate-700';
    case 'ENROLL_COMPLETE':
      return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
    case 'FILE_ENCRYPT':
      return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20';
    case 'FILE_DECRYPT':
      return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
    case 'ACCOUNT_DELETE_SELF':
      return 'text-red-400 bg-red-500/10 border-red-500/20';
    default:
      return 'text-slate-300 bg-slate-800/60 border-slate-700';
  }
};

interface SecurityActivityPanelProps {
  userUid: string;
}

const SecurityActivityPanel: React.FC<SecurityActivityPanelProps> = ({ userUid }) => {
  const [events, setEvents] = React.useState<UserSecurityEvent[]>([]);
  const [listenerError, setListenerError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const q = query(
      collection(db, 'user_security_events'),
      where('userId', '==', userUid),
      orderBy('createdAt', 'desc'),
      limit(30)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setListenerError(null);
        setEvents(
          snap.docs.map((d) => ({ id: d.id, ...d.data() } as UserSecurityEvent))
        );
      },
      (err) => {
        console.warn('Security activity listener:', err);
        setListenerError(String(err instanceof Error ? err.message : err));
        try {
          handleFirestoreError(err, OperationType.LIST, 'user_security_events');
        } catch (e) {
          console.warn('Failed to call handleFirestoreError:', e);
        }
      }
    );
    return () => unsub();
  }, [userUid]);

  const empty = useMemo(() => events.length === 0, [events.length]);
  const [showCreateTestEvent, setShowCreateTestEvent] = React.useState(false);

  return (
    <div className="rounded-2xl border border-slate-800/70 bg-slate-900/50 overflow-hidden">
      <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-slate-800/60">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <Shield className="h-4 w-4 text-blue-400" />
          Security activity
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Audit trail for your account (same data summarized in login emails when enabled).
        </p>
      </div>
      <ScrollArea className="h-[min(11rem,30dvh)] sm:h-[min(12rem,32dvh)]">
        {empty ? (
          <div className="flex flex-col items-center justify-center py-6 sm:py-8 text-slate-600 gap-2 px-4">
            <Activity className="h-8 w-8 opacity-40" />
            <p className="text-sm text-slate-500">No events recorded yet</p>
            <p className="text-xs text-slate-600 text-center">
              Sign in, enroll, or use encrypt/decrypt to populate this log.
            </p>
            {listenerError && (
              <p className="text-xs text-red-400 mt-2 text-center">Listener error: {listenerError}</p>
            )}
            <div className="mt-3 text-[11px] text-slate-500 text-center">
              <p>If you recently triggered events but see nothing, check browser console for:</p>
              <ul className="list-disc list-inside mt-1">
                <li>Firestore listener errors (permission issues).</li>
                <li>Logs from <span className="font-medium">handleFirestoreError</span> and <span className="font-medium">securityAudit</span>.</li>
              </ul>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-slate-800/50">
            {events.map((ev) => (
              <li key={ev.id} className="px-4 py-3 hover:bg-slate-800/25 transition-colors">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${actionStyle(String(ev.action))}`}
                  >
                    {ev.action}
                  </span>
                  <span className="text-[11px] text-slate-500 tabular-nums">
                    {formatWhen(ev.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-slate-300 leading-snug">{ev.summary}</p>
              </li>
            ))}
          </ul>
        )}
      </ScrollArea>
      <div className="px-4 py-3 border-t border-slate-800/60 flex items-center justify-between">
        <div className="text-xs text-slate-500">Diagnostics</div>
        <div className="flex items-center gap-2">
          <button
            className="text-xs px-2 py-1 rounded bg-slate-800/60 hover:bg-slate-800/70"
            onClick={() => {
              setShowCreateTestEvent((s) => !s);
            }}
          >
            {showCreateTestEvent ? 'Hide' : 'Create test event'}
          </button>
        </div>
      </div>
      {showCreateTestEvent && (
        <div className="p-4 border-t border-slate-800/60 bg-slate-900/40">
          <p className="text-xs text-slate-400 mb-2">Create a sample `user_security_events` document (client will attempt to write as the current user).</p>
          <button
            className="text-sm px-3 py-1 rounded bg-blue-500 text-white"
            onClick={async () => {
              try {
                // Lazy import to avoid circular module load issues in tests
                const mod = await import('../utils/securityAudit');
                const { recordSecurityEvent } = mod;
                // get auth currentUser from firebase directly
                const { auth, db } = await import('../firebase');
                if (!auth.currentUser) {
                  throw new Error('Not signed in');
                }
                await recordSecurityEvent(db, auth.currentUser, 'LOGIN_SUCCESS', 'Test event created from UI');
                // eslint-disable-next-line no-alert
                alert('Test event write attempted — check console for result.');
              } catch (e) {
                console.error('Failed to create test event:', e);
                // eslint-disable-next-line no-alert
                alert('Failed to create test event: ' + String(e));
              }
            }}
          >
            Write test event
          </button>
        </div>
      )}
    </div>
  );
};

export default SecurityActivityPanel;
