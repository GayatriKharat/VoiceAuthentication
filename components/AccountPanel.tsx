import React from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { User } from '../types';
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
    <div className="rounded-2xl border border-slate-800/70 bg-slate-900/50 overflow-hidden">
      <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-slate-800/60">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <UserCircle className="h-4 w-4 text-blue-400" />
          Account
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">Your session and enrollment</p>
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        <div className="flex items-start gap-3">
          {isEnrolled ? (
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/25">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
            </div>
          ) : (
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/25">
              <ShieldAlert className="h-5 w-5 text-amber-400" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium text-white truncate">
                {currentUser.displayName || userProfile?.name || 'Signed in'}
              </p>
              {userProfile?.role === 'admin' && (
                <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[10px] h-5 px-1.5">
                  Admin
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-500 truncate mt-0.5">
              {currentUser.email || currentUser.phoneNumber || currentUser.uid}
            </p>
            <p className="text-xs mt-2 text-slate-400">
              {isEnrolled
                ? 'Voice profile active'
                : hasProfile
                  ? 'Complete voice enrollment to use encrypt/decrypt'
                  : 'Enroll to create your profile'}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-4 space-y-3">
          <p className="text-xs font-medium text-slate-300">Account actions</p>
          <button
            type="button"
            onClick={onDeleteMyAccount}
            disabled={!hasProfile}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-red-500/10 hover:bg-red-500/15 disabled:opacity-40 disabled:cursor-not-allowed text-red-400/90 border border-red-500/20 text-xs font-medium transition-colors"
            title={hasProfile ? 'Remove enrollment and sign out' : 'Enroll first'}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete my enrollment
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/80 text-xs font-medium transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccountPanel;
