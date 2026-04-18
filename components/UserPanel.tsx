import React from 'react';
import { User } from '../types';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { TrashIcon } from './icons/TrashIcon';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { GlobeIcon, Users, ShieldAlert } from 'lucide-react';

interface UserPanelProps {
  users: User[];
  onDeleteUser: (userUid: string) => void;
  maxUsers: number;
  currentUserRole?: string;
  currentUserUid?: string;
}

const UserPanel: React.FC<UserPanelProps> = ({
  users,
  onDeleteUser,
  maxUsers,
  currentUserRole,
  currentUserUid,
}) => {
  return (
    <div className="rounded-2xl border border-slate-800/70 bg-slate-900/50 overflow-hidden flex flex-col min-h-0">
      <div className="px-5 py-4 border-b border-slate-800/60 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-400" />
            Team
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Enrolled people in this workspace</p>
        </div>
        <span className="text-xs tabular-nums text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60">
          {users.length} / {maxUsers}
        </span>
      </div>
      <ScrollArea className="h-[min(20rem,38vh)] md:h-[min(22rem,42vh)]">
        {users.length === 0 ? (
          <div className="text-center py-16 px-6">
            <div className="mx-auto w-12 h-12 rounded-xl bg-slate-800/50 flex items-center justify-center mb-3">
              <UserCircleIcon className="h-7 w-7 text-slate-600" />
            </div>
            <p className="text-sm font-medium text-slate-400">No enrolled users yet</p>
            <p className="text-xs text-slate-600 mt-1">Use Enroll to add the first profile.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-800/50">
            {users.map((user) => (
              <li
                key={user.uid}
                className="px-5 py-4 flex items-center justify-between gap-3 hover:bg-slate-800/30 transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {user.isEnrolled ? (
                    <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 shrink-0">
                      <CheckCircleIcon className="h-4 w-4 text-emerald-400" />
                    </div>
                  ) : (
                    <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 shrink-0">
                      <ShieldAlert className="h-4 w-4 text-amber-400" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-white truncate">{user.name}</span>
                      {user.role === 'admin' && (
                        <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[10px] h-5">
                          Admin
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 truncate">
                      <span className="truncate">{user.email || '—'}</span>
                      {user.location && (
                        <span className="flex items-center gap-1 shrink-0 text-slate-600">
                          <GlobeIcon className="h-3 w-3" />
                          {user.location}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {(currentUserRole === 'admin' || user.uid === currentUserUid) && (
                  <button
                    type="button"
                    onClick={() => onDeleteUser(user.uid)}
                    className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0 opacity-100 md:opacity-0 md:group-hover:opacity-100"
                    aria-label={user.uid === currentUserUid ? 'Remove my enrollment' : `Remove ${user.name}`}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </ScrollArea>
    </div>
  );
};

export default UserPanel;
