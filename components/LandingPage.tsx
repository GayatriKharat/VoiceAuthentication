import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ShieldCheck,
  Lock,
  Users,
  Globe,
  ArrowRight,
  Fingerprint,
  KeyRound,
  FileLock2,
  Mic2,
  Sparkles,
  CheckCircle2,
  Zap,
  Server,
} from 'lucide-react';

interface LandingPageProps {
  onLaunch: () => void;
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.12 },
  },
};

const item = {
  hidden: { opacity: 0, y: 22 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 380, damping: 28 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};

const LandingPage: React.FC<LandingPageProps> = ({ onLaunch }) => {
  const reduceMotion = useReducedMotion();

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 relative overflow-x-hidden selection:bg-blue-500/30">
      {/* Animated ambient layers */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute -top-1/4 -left-1/4 w-[min(90vw,55rem)] h-[min(90vw,55rem)] rounded-full bg-blue-600/25 blur-[120px]"
          animate={
            reduceMotion
              ? {}
              : { scale: [1, 1.08, 1], opacity: [0.35, 0.5, 0.35] }
          }
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -bottom-1/3 -right-1/4 w-[min(95vw,60rem)] h-[min(95vw,60rem)] rounded-full bg-indigo-600/20 blur-[140px]"
          animate={
            reduceMotion
              ? {}
              : { scale: [1.05, 1, 1.05], opacity: [0.25, 0.42, 0.25] }
          }
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] max-w-4xl h-[80vw] max-h-[640px] rounded-full bg-cyan-500/5 blur-[100px]"
          animate={reduceMotion ? {} : { rotate: [0, 360] }}
          transition={{ duration: 120, repeat: Infinity, ease: 'linear' }}
        />
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(59, 130, 246, 0.06) 1px, transparent 1px),
              linear-gradient(90deg, rgba(59, 130, 246, 0.06) 1px, transparent 1px)
            `,
            backgroundSize: '48px 48px',
            maskImage: 'radial-gradient(ellipse 70% 60% at 50% 40%, black 20%, transparent 80%)',
          }}
        />
      </div>

      {/* Top bar */}
      <header className="relative z-20 border-b border-white/5 bg-[#020617]/70 backdrop-blur-xl">
        <div className="container mx-auto max-w-7xl px-4 md:px-8 py-4 flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className="p-2 rounded-xl bg-blue-500/15 border border-blue-500/25">
              <ShieldCheck className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                OS Voice Authentication
              </p>
              <p className="text-sm font-bold text-white tracking-tight">Enterprise Security Suite</p>
            </div>
          </motion.div>
          <motion.button
            type="button"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={onLaunch}
            className="text-xs font-bold uppercase tracking-widest text-blue-400 hover:text-white border border-blue-500/30 hover:border-blue-400/60 px-4 py-2 rounded-xl transition-colors"
          >
            Sign in
          </motion.button>
        </div>
      </header>

      <main className="relative z-10">
        {/* Hero */}
        <section className="container mx-auto max-w-7xl px-4 md:px-8 pt-12 md:pt-20 pb-20 md:pb-28">
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="max-w-4xl mx-auto text-center space-y-8"
          >
            <motion.div variants={item} className="flex flex-col items-center gap-3">
              <span className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">
                Step 1 · Welcome
              </span>
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/35 bg-gradient-to-r from-blue-500/15 to-indigo-500/10 px-5 py-2 text-xs uppercase tracking-[0.18em] font-bold text-blue-200 shadow-lg shadow-blue-500/10">
                <Sparkles className="h-4 w-4 text-amber-300" />
                Voice · Encryption · Team Access
              </div>
            </motion.div>

            <motion.h1
              variants={item}
              className="text-4xl sm:text-5xl md:text-7xl font-black tracking-tight leading-[1.05]"
            >
              <span className="bg-gradient-to-br from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                Secure your files
              </span>
              <span className="block mt-2 bg-gradient-to-r from-blue-400 via-cyan-300 to-indigo-400 bg-clip-text text-transparent">
                with voice identity
              </span>
            </motion.h1>

            <motion.p
              variants={item}
              className="text-slate-400 text-base md:text-lg leading-relaxed max-w-2xl mx-auto"
            >
              A full-stack voice biometric workspace: enroll once, encrypt for chosen teammates only, and
              decrypt with voice verification plus per-user RSA key wrapping — built for distributed teams
              who need clarity without sacrificing security.
            </motion.p>

            <motion.div
              variants={item}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2"
            >
              <motion.button
                type="button"
                onClick={onLaunch}
                whileHover={reduceMotion ? {} : { scale: 1.02 }}
                whileTap={reduceMotion ? {} : { scale: 0.98 }}
                className="group relative inline-flex items-center gap-2 px-10 py-4 rounded-2xl font-extrabold tracking-wide text-white overflow-hidden shadow-2xl shadow-blue-600/30"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600" />
                <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r from-indigo-600 via-blue-500 to-cyan-500" />
                <span className="relative flex items-center gap-2">
                  Launch Secure Access
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </motion.button>
              <button
                type="button"
                onClick={onLaunch}
                className="text-sm text-slate-500 hover:text-slate-200 underline-offset-4 hover:underline transition-colors"
              >
                Skip intro · Go to sign in
              </button>
            </motion.div>

            {/* Stats strip */}
            <motion.div
              variants={item}
              className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-10 max-w-3xl mx-auto"
            >
              {[
                { label: 'Auth methods', value: '3+', sub: 'Google · Email · Phone OTP' },
                { label: 'Crypto', value: 'AES-256', sub: 'GCM + RSA-OAEP' },
                { label: 'Team model', value: 'Multi', sub: 'Recipient-specific keys' },
                { label: 'Client-side', value: 'Web Crypto', sub: 'Keys stay in-browser' },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-2xl border border-slate-800/80 bg-slate-950/50 backdrop-blur-sm px-4 py-3 text-left"
                >
                  <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{s.label}</p>
                  <p className="text-lg font-mono font-bold text-white mt-0.5">{s.value}</p>
                  <p className="text-[11px] text-slate-600 leading-tight mt-1">{s.sub}</p>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </section>

        {/* Feature grid */}
        <section className="border-y border-white/5 bg-slate-950/40 backdrop-blur-sm">
          <div className="container mx-auto max-w-7xl px-4 md:px-8 py-16 md:py-24">
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-80px' }}
              variants={fadeUp}
              className="text-center max-w-2xl mx-auto mb-14"
            >
              <h2 className="text-2xl md:text-4xl font-black text-white tracking-tight">
                Everything in one secure workspace
              </h2>
              <p className="text-slate-400 mt-3 text-sm md:text-base">
                From enrollment to team file sharing — each layer is designed to reduce risk and keep the
                experience simple for operators.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[
                {
                  icon: Mic2,
                  title: 'Voice biometric enrollment',
                  desc: 'Capture calibrated voice samples and build a profile used for verification before sensitive actions.',
                  accent: 'from-blue-500/20 to-transparent',
                },
                {
                  icon: Fingerprint,
                  title: 'Verification gate',
                  desc: 'Decrypt and sensitive flows can require voice match — so access stays tied to the person, not just the password.',
                  accent: 'from-emerald-500/20 to-transparent',
                },
                {
                  icon: KeyRound,
                  title: 'Per-user RSA keys',
                  desc: 'Each account gets a keypair; file keys are wrapped only for recipients you explicitly select.',
                  accent: 'from-violet-500/20 to-transparent',
                },
                {
                  icon: FileLock2,
                  title: 'AES-GCM file encryption',
                  desc: 'Files are encrypted with a fresh key; integrity is protected so tampering is detectable.',
                  accent: 'from-amber-500/15 to-transparent',
                },
                {
                  icon: Users,
                  title: 'Team recipient control',
                  desc: 'Encrypt once for multiple teammates — only those recipients can unwrap the decryption key.',
                  accent: 'from-cyan-500/15 to-transparent',
                },
                {
                  icon: Server,
                  title: 'Firebase-backed identity',
                  desc: 'Google, email/password, and phone OTP — unified auth with enterprise-friendly sign-in options.',
                  accent: 'from-rose-500/15 to-transparent',
                },
              ].map((card, i) => (
                <motion.div
                  key={card.title}
                  initial={{ opacity: 0, y: 28 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ delay: i * 0.06, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  whileHover={reduceMotion ? {} : { y: -4 }}
                  className="group relative rounded-3xl border border-slate-800/70 bg-slate-900/40 p-6 overflow-hidden"
                >
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${card.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
                  />
                  <div className="relative space-y-3">
                    <div className="inline-flex p-3 rounded-2xl bg-slate-950/80 border border-slate-800">
                      <card.icon className="h-6 w-6 text-blue-400" />
                    </div>
                    <h3 className="font-bold text-lg text-white">{card.title}</h3>
                    <p className="text-sm text-slate-400 leading-relaxed">{card.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works — timeline */}
        <section className="container mx-auto max-w-7xl px-4 md:px-8 py-16 md:py-24">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={fadeUp}
            className="text-center mb-12"
          >
            <h2 className="text-2xl md:text-4xl font-black text-white">How the flow works</h2>
            <p className="text-slate-400 mt-2 max-w-xl mx-auto text-sm">
              Four clear steps from first login to protected collaboration.
            </p>
          </motion.div>

          <div className="relative max-w-3xl mx-auto">
            <div className="absolute left-[1.125rem] md:left-1/2 md:-translate-x-px top-0 bottom-0 w-px bg-gradient-to-b from-blue-500/50 via-slate-700 to-transparent" />
            {[
              {
                step: '01',
                title: 'Sign in',
                body: 'Use Google, email & password, or phone OTP — your session is managed by Firebase Auth.',
              },
              {
                step: '02',
                title: 'Enroll your voice',
                body: 'Record samples with your passphrase phrase. We derive a voiceprint model for later verification.',
              },
              {
                step: '03',
                title: 'Encrypt for your team',
                body: 'Pick teammates who are enrolled. The file key is wrapped so only they can decrypt.',
              },
              {
                step: '04',
                title: 'Decrypt with verification',
                body: 'Authorized recipients verify identity (voice + UI) and unwrap their key to read the file.',
              },
            ].map((row, i) => (
              <motion.div
                key={row.step}
                initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="relative flex gap-6 md:gap-10 pb-12 last:pb-0"
              >
                <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 border-4 border-[#020617] flex items-center justify-center text-xs font-black text-white z-10">
                  {row.step}
                </div>
                <div className="flex-1 rounded-2xl border border-slate-800/80 bg-slate-900/50 p-5 md:p-6">
                  <h3 className="font-bold text-white text-lg">{row.title}</h3>
                  <p className="text-slate-400 text-sm mt-2 leading-relaxed">{row.body}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Security + CTA */}
        <section className="border-t border-white/5 bg-gradient-to-b from-slate-950/80 to-[#020617]">
          <div className="container mx-auto max-w-7xl px-4 md:px-8 py-16 md:py-24">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <h2 className="text-2xl md:text-3xl font-black text-white mb-4">
                  Security built for real operations
                </h2>
                <p className="text-slate-400 text-sm leading-relaxed mb-6">
                  This app combines modern authentication with strong cryptography and a clear separation of
                  duties: identity is proven by Firebase; file access is enforced by encryption and
                  recipient lists; voice verification adds an extra gate for sensitive actions.
                </p>
                <ul className="space-y-3">
                  {[
                    'No shared “master password” for team files — keys are wrapped per recipient.',
                    'Client-side AES-GCM and RSA via Web Crypto API where applicable.',
                    'Optional AI-assisted explanations (Gemini) only when you configure an API key.',
                    'Firestore rules should restrict data to authenticated users — review rules in production.',
                  ].map((line) => (
                    <li key={line} className="flex gap-3 text-sm text-slate-300">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="relative rounded-[2rem] border border-blue-500/20 bg-slate-900/60 p-8 md:p-10 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-transparent to-indigo-600/10" />
                <div className="relative space-y-6">
                  <div className="flex items-center gap-2 text-blue-300">
                    <Zap className="h-5 w-5" />
                    <span className="text-xs font-black uppercase tracking-[0.2em]">Ready when you are</span>
                  </div>
                  <p className="text-white text-lg font-semibold leading-snug">
                    Open the secure workspace — enroll, share, and collaborate with confidence.
                  </p>
                  <button
                    type="button"
                    onClick={onLaunch}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-white text-slate-950 font-extrabold hover:bg-slate-100 transition-colors"
                  >
                    Enter application
                    <ArrowRight className="h-5 w-5" />
                  </button>
                  <p className="text-[11px] text-slate-500 flex items-center gap-2">
                    <Globe className="h-3.5 w-3.5" />
                    Works in modern browsers with microphone access for voice features.
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/5 py-8 text-center text-[11px] text-slate-600">
          <p>OS Voice Authentication System · Enterprise-grade voice & encryption workspace</p>
        </footer>
      </main>
    </div>
  );
};

export default LandingPage;
