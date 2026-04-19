import React from 'react';
import { motion } from 'framer-motion';
import { DASHBOARD_IMAGES } from './dashboardAssets';
import { Sparkles, Shield } from 'lucide-react';

interface DashboardHeroProps {
  displayName: string | null | undefined;
  teamCount: number;
  regionLabel: string;
}

const DashboardHero: React.FC<DashboardHeroProps> = ({ displayName, teamCount, regionLabel }) => {
  const name = displayName?.trim() || 'there';

  return (
    <section className="relative overflow-hidden rounded-3xl border border-slate-700/50 bg-slate-900/40 shadow-2xl shadow-blue-950/20">
      {/* Background image + gradient */}
      <div className="absolute inset-0">
        <img
          src={DASHBOARD_IMAGES.ethicalHacking}
          alt=""
          className="h-full w-full object-cover opacity-100"
          loading="eager"
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#020617]/10 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#020617]/10 via-transparent to-transparent" />
      </div>

      <div className="relative grid gap-5 sm:gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8 p-4 sm:p-6 md:p-7">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="space-y-3 sm:space-y-4 max-w-xl"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/25 bg-blue-500/10 px-2.5 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-[11px] font-medium text-blue-300">
            <Sparkles className="h-3.5 w-3.5" />
            Your secure workspace
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight text-white leading-tight">
            Welcome back,{' '}
            <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
              {name}
            </span>
          </h2>
          <p className="text-xs sm:text-sm md:text-base text-slate-400 leading-relaxed">
            Enroll your voice once, share encrypted files with your team, and decrypt only when your voice and
            permissions match — all in one place.
          </p>
          <div className="flex flex-wrap gap-2 sm:gap-3 pt-0.5 sm:pt-1">
            <div className="flex items-center gap-2 rounded-lg sm:rounded-xl border border-white/10 bg-black/30 px-3 py-2 sm:px-4 sm:py-2.5 backdrop-blur-sm">
              <Shield className="h-4 w-4 text-emerald-400" />
              <div>
                <p className="text-[10px] uppercase tracking-wide text-slate-500">Session</p>
                <p className="text-sm font-medium text-emerald-400">Verified & active</p>
              </div>
            </div>
            <div className="rounded-lg sm:rounded-xl border border-white/10 bg-black/30 px-3 py-2 sm:px-4 sm:py-2.5 backdrop-blur-sm">
              <p className="text-[10px] uppercase tracking-wide text-slate-500">Team</p>
              <p className="text-sm font-semibold tabular-nums text-white">{teamCount} enrolled</p>
            </div>
            <div className="rounded-lg sm:rounded-xl border border-white/10 bg-black/30 px-3 py-2 sm:px-4 sm:py-2.5 backdrop-blur-sm min-w-[100px] sm:min-w-[120px]">
              <p className="text-[10px] uppercase tracking-wide text-slate-500">Region</p>
              <p className="text-sm font-medium text-slate-200 truncate max-w-[160px]">{regionLabel}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.08 }}
          className="relative hidden sm:block min-h-[140px] max-h-[200px] lg:max-h-none lg:min-h-[160px]"
        >
          <div className="absolute inset-0 rounded-xl sm:rounded-2xl border border-white/10 overflow-hidden shadow-xl">
            <img
              src={DASHBOARD_IMAGES.hackerTools}
              alt="Voice and collaboration"
              className="h-full w-full object-cover opacity-100"
              loading="lazy"
              decoding="async"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#020617]/10 via-transparent to-transparent" />
          </div>
          <p className="absolute bottom-3 left-3 right-3 text-[10px] text-slate-500">
            Voice-first access · end-to-end encryption for your files
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default DashboardHero;
