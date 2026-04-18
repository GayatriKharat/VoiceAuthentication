
import React from 'react';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { User as FirebaseUser } from 'firebase/auth';
import { LogOut, User as UserIcon, Globe } from 'lucide-react';
import { motion } from 'framer-motion';

interface HeaderProps {
  user: FirebaseUser | null;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout }) => {
  return (
    <header className="bg-slate-950/50 backdrop-blur-xl p-4 sticky top-0 z-50 border-b border-slate-800/50">
      <div className="container mx-auto flex items-center justify-between">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center space-x-4"
        >
          <div className="p-2.5 bg-blue-600/10 rounded-2xl border border-blue-500/20 shadow-inner">
            <ShieldCheckIcon className="h-7 w-7 text-blue-500" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-white tracking-tighter uppercase">
              Voice <span className="text-blue-500">Authentication</span> System
            </h1>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <p className="text-[9px] uppercase tracking-[0.3em] text-slate-500 font-black">Enterprise Security Node</p>
            </div>
          </div>
        </motion.div>

        {user && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center space-x-6"
          >
            <div className="hidden md:flex items-center space-x-4 px-5 py-2.5 bg-slate-900/80 rounded-2xl border border-slate-800 shadow-xl">
              <div className="relative">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="" className="h-8 w-8 rounded-xl ring-2 ring-blue-500/20" referrerPolicy="no-referrer" />
                ) : (
                  <div className="h-8 w-8 rounded-xl bg-slate-800 flex items-center justify-center">
                    <UserIcon className="h-4 w-4 text-slate-400" />
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full" />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-white leading-none">{user.displayName}</p>
                <p className="text-[10px] text-slate-500 mt-1 font-medium">{user.email}</p>
              </div>
            </div>
            <button 
              onClick={onLogout}
              className="p-3 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-2xl transition-all border border-transparent hover:border-red-400/20"
              title="Terminate Session"
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

