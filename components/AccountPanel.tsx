import React from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { User } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { UserCircle, ShieldCheck, ShieldAlert, Trash2, LogOut } from 'lucide-react';

interface AccountPanelProps {
  currentUser: FirebaseUser;
  userProfile: User | null;
  onDeleteMyAccount: () => void;
  onLogout: () => void;
}

const AccountPanel: React.FC<AccountPanelProps> = ({
  currentUser,
  userProfile,
  onDeleteMyAccount,
  onLogout,
}) => {
  const isEnrolled = !!userProfile?.isEnrolled;
  const hasProfile = !!userProfile;

  return (
    <Card className="bg-slate-900/40 border-slate-800/50 shadow-2xl overflow-hidden rounded-[2rem]">
      <CardHeader className="border-b border-slate-800/50 bg-slate-900/60 p-6">
        <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
          <UserCircle className="h-4 w-4 text-blue-500" />
          My Account
        </CardTitle>
      </CardHeader>

      <CardContent className="p-6 space-y-5">
        <div className="flex items-start gap-3">
          {isEnrolled ? (
            <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
            </div>
          ) : (
            <div className="p-2.5 bg-amber-500/10 rounded-xl border border-amber-500/20">
              <ShieldAlert className="h-5 w-5 text-amber-400" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-white truncate">
                {currentUser.displayName || userProfile?.name || 'Signed in'}
              </p>
              {userProfile?.role === 'admin' && (
                <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[8px] h-4 px-1 font-black uppercase">
                  Admin
                </Badge>
              )}
            </div>
            <p className="text-[10px] text-slate-500 truncate">
              {currentUser.email || currentUser.phoneNumber || currentUser.uid}
            </p>
            <p className="text-[9px] mt-2 uppercase tracking-widest font-bold">
              {isEnrolled ? (
                <span className="text-emerald-400">Voice enrolled</span>
              ) : hasProfile ? (
                <span className="text-amber-400">Profile exists · voice not enrolled</span>
              ) : (
                <span className="text-slate-500">No enrollment on this account yet</span>
              )}
            </p>
          </div>
        </div>

        <div className="border-t border-red-500/10 pt-5 space-y-3">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-red-400/80">
            Danger Zone
          </p>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Deleting your account removes your voiceprint and encryption keys.
            Files shared with you will become unrecoverable on this account.
            You will be signed out immediately.
          </p>
          <button
            onClick={onDeleteMyAccount}
            disabled={!hasProfile}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 disabled:hover:bg-red-500/10 disabled:opacity-40 disabled:cursor-not-allowed text-red-400 border border-red-500/20 transition-all text-xs font-bold uppercase tracking-widest"
            title={
              hasProfile
                ? 'Delete my account and sign out'
                : 'Nothing to delete — enroll first to create a profile'
            }
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete my account
          </button>
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/50 hover:bg-slate-800 text-slate-400 border border-slate-700/50 transition-all text-xs font-bold uppercase tracking-widest"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AccountPanel;
