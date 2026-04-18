import React from 'react';
import { User } from '../types';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { TrashIcon } from './icons/TrashIcon';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { GlobeIcon, UserCheck, ShieldAlert } from 'lucide-react';

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
    <Card className="bg-slate-900/40 border-slate-800/50 shadow-2xl overflow-hidden rounded-[2rem]">
      <CardHeader className="border-b border-slate-800/50 bg-slate-900/60 p-6">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-blue-500" />
            Global Registry
          </CardTitle>
          <Badge variant="outline" className="bg-slate-800/50 text-slate-400 border-slate-700 font-mono text-[10px]">
            {users.length} / {maxUsers}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[600px]">
          {users.length === 0 ? (
            <div className="text-center py-32 px-8 space-y-4">
              <div className="mx-auto w-16 h-16 bg-slate-800/50 rounded-2xl flex items-center justify-center opacity-20">
                <UserCircleIcon className="h-10 w-10" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-400">Registry Offline</p>
                <p className="text-[10px] text-slate-600 uppercase tracking-widest leading-relaxed">No biometric profiles detected in the global security cloud.</p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/30">
              {users.map((user) => (
                <div
                  key={user.uid}
                  className="p-5 flex items-center justify-between hover:bg-blue-500/5 transition-all group relative"
                >
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      {user.isEnrolled ? (
                        <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 shadow-lg shadow-emerald-900/10">
                          <CheckCircleIcon className="h-5 w-5 text-emerald-400" />
                        </div>
                      ) : (
                        <div className="p-2.5 bg-amber-500/10 rounded-xl border border-amber-500/20 shadow-lg shadow-amber-900/10">
                          <ShieldAlert className="h-5 w-5 text-amber-400" />
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-white">{user.name}</p>
                        {user.role === 'admin' && (
                          <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[8px] h-4 px-1 font-black uppercase">Admin</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] text-slate-500 font-medium">{user.email}</span>
                        {user.location && (
                          <span className="text-[9px] text-slate-600 flex items-center gap-1 font-bold uppercase tracking-tighter">
                            <GlobeIcon className="h-2.5 w-2.5" />
                            {user.location}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {(currentUserRole === 'admin' || user.uid === currentUserUid) && (
                    <button
                      onClick={() => onDeleteUser(user.uid)}
                      className="p-2.5 rounded-xl text-slate-600 hover:bg-red-500/10 hover:text-red-400 transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 border border-transparent hover:border-red-500/20"
                      aria-label={
                        user.uid === currentUserUid
                          ? `Delete my enrollment (${user.name})`
                          : `Decommission user ${user.name}`
                      }
                      title={
                        user.uid === currentUserUid
                          ? 'Delete my enrollment'
                          : 'Delete user'
                      }
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default UserPanel;
