
import React from 'react';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { User as FirebaseUser } from 'firebase/auth';
import { LogOut, User as UserIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface HeaderProps {
  user: FirebaseUser | null;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout }) => {
  return (
    <header className="bg-slate-950/70 backdrop-blur-xl px-3 sm:px-4 py-2 sm:py-2.5 sticky top-0 z-50 border-b border-slate-800/60">
      <div className="container mx-auto max-w-7xl flex items-center justify-between gap-4">
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3 min-w-0"
        >
          <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20 shrink-0">
            <ShieldCheckIcon className="h-6 w-6 text-blue-400" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base md:text-lg font-semibold text-white tracking-tight truncate">
              Voice <span className="text-blue-400">Auth</span>
            </h1>
            <p className="text-[11px] text-slate-500 hidden sm:block">Workspace</p>
          </div>
        </motion.div>

        {user && (
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 shrink-0"
          >
            <div className="hidden sm:flex items-center gap-3 pl-3 pr-4 py-2 bg-slate-900/70 rounded-xl border border-slate-800/80 max-w-[min(280px,50vw)]">
              <div className="relative shrink-0">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt=""
                    className="h-8 w-8 rounded-lg ring-1 ring-slate-700"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-lg bg-slate-800 flex items-center justify-center">
                    <UserIcon className="h-4 w-4 text-slate-400" />
                  </div>
                )}
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-slate-900 rounded-full" />
              </div>
              <div className="text-left min-w-0">
                <p className="text-xs font-medium text-white truncate">{user.displayName}</p>
                <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="p-2.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors border border-transparent hover:border-red-500/20"
              title="Sign out"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </motion.div>
        )}
      </div>
    </header>
  );
};

export default Header;

