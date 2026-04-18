import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Lock, Users, Globe, ArrowRight } from 'lucide-react';

interface LandingPageProps {
  onLaunch: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLaunch }) => {
  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-15%] left-[-10%] w-[45rem] h-[45rem] bg-blue-600/20 blur-[140px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-15%] w-[50rem] h-[50rem] bg-indigo-600/20 blur-[160px] rounded-full" />
      </div>

      <main className="container mx-auto px-6 py-16 md:py-24 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="max-w-5xl mx-auto text-center space-y-8"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-xs uppercase tracking-[0.2em] font-bold text-blue-300">
            <ShieldCheck className="h-3.5 w-3.5" />
            Enterprise Voice Security
          </div>

          <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight">
            Voice Authentication
            <span className="block text-blue-400">for Global Teams</span>
          </h1>

          <p className="max-w-3xl mx-auto text-slate-300 text-base md:text-lg leading-relaxed">
            Protect files with voice biometrics, team-based access control, and multi-recipient encryption.
            Built for distributed organizations that need speed, trust, and secure collaboration.
          </p>

          <div className="pt-4">
            <button
              onClick={onLaunch}
              className="group inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold tracking-wide shadow-2xl shadow-blue-900/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Launch Secure Access
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="max-w-6xl mx-auto mt-14 grid grid-cols-1 md:grid-cols-3 gap-5"
        >
          <div className="rounded-3xl border border-slate-800/70 bg-slate-900/60 p-6 space-y-3 backdrop-blur-xl">
            <Lock className="h-6 w-6 text-indigo-400" />
            <h3 className="font-bold text-lg">Strong Encryption</h3>
            <p className="text-sm text-slate-400">AES-GCM + per-user wrapped keys for controlled file decryption.</p>
          </div>

          <div className="rounded-3xl border border-slate-800/70 bg-slate-900/60 p-6 space-y-3 backdrop-blur-xl">
            <Users className="h-6 w-6 text-emerald-400" />
            <h3 className="font-bold text-lg">Team Access Control</h3>
            <p className="text-sm text-slate-400">Only selected teammates can decrypt shared files, from any location.</p>
          </div>

          <div className="rounded-3xl border border-slate-800/70 bg-slate-900/60 p-6 space-y-3 backdrop-blur-xl">
            <Globe className="h-6 w-6 text-blue-400" />
            <h3 className="font-bold text-lg">Global Ready</h3>
            <p className="text-sm text-slate-400">Designed for remote teams with clean login and fast secure workflows.</p>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default LandingPage;
