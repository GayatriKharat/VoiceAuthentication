import React from 'react';
import { motion } from 'framer-motion';
import { DASHBOARD_IMAGES } from './dashboardAssets';
import { Sparkles, Shield } from 'lucide-react';

interface DashboardHeroProps {
  displayName: string | null | undefined;
  teamCount: number;
  regionLabel: string;
}

const DashboardHero: React.FC<DashboardHeroProps> = ({
  displayName,
  teamCount,
  regionLabel,
}) => {
  const name = displayName?.trim() || 'there';

  return (
    <section className="relative overflow-hidden rounded-3xl border border-indigo-500/20 bg-slate-900/40 shadow-2xl shadow-indigo-900/20">

      {/* 🔥 CYBER BACKGROUND */}
      <div className="absolute inset-0">

        {/* Base Image */}
        <img
          src={DASHBOARD_IMAGES.ethicalHacking}
          alt="Cyber background"
          className="h-full w-full object-cover brightness-50"
        />

        {/* 🔷 Cyber Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px]" />

        {/* 💡 Glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(0,255,255,0.15),transparent_40%)] animate-pulse" />

        {/* 🌌 Floating Particles */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(25)].map((_, i) => (
            <div
              key={i}
              className="absolute w-[2px] h-[2px] bg-cyan-400 rounded-full opacity-70 animate-pulse"
              style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
              }}
            />
          ))}
        </div>

        {/* 🔥 Dark Overlay */}
        <div className="absolute inset-0 bg-black/70" />
      </div>

      {/* CONTENT */}
      <div className="relative grid gap-6 lg:grid-cols-[1.05fr_0.95fr] p-6 md:p-8">

        {/* LEFT */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4 max-w-xl"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs text-indigo-300">
            <Sparkles className="h-4 w-4" />
            Secure Workspace
          </div>

          <h2 className="text-3xl md:text-4xl font-semibold text-white">
            Welcome back,{' '}
            <span className="bg-gradient-to-r from-indigo-400 to-cyan-300 bg-clip-text text-transparent">
              {name}
            </span>
          </h2>

          <p className="text-slate-400">
            Voice authentication meets end-to-end encryption. Secure your files using biometric identity.
          </p>

          {/* STATUS */}
          <div className="flex gap-3 flex-wrap">

            <div className="flex items-center gap-2 rounded-xl border border-indigo-500/20 bg-black/40 px-4 py-2 backdrop-blur-md">
              <Shield className="h-4 w-4 text-emerald-400" />
              <span className="text-emerald-400 text-sm">Verified</span>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/40 px-4 py-2 backdrop-blur-md">
              <p className="text-xs text-slate-500">Team</p>
              <p className="text-white font-semibold">{teamCount}</p>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/40 px-4 py-2 backdrop-blur-md">
              <p className="text-xs text-slate-500">Region</p>
              <p className="text-white">{regionLabel}</p>
            </div>

          </div>
        </motion.div>

        {/* RIGHT */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative hidden sm:block"
        >
          <div className="absolute inset-0 rounded-2xl border border-indigo-500/20 overflow-hidden shadow-xl">
            <img
              src={DASHBOARD_IMAGES.hackerTools}
              className="h-full w-full object-cover opacity-90"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          </div>
        </motion.div>

      </div>
    </section>
  );
};

export default DashboardHero;