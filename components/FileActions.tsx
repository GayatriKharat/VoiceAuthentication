import React from 'react';
import { UserPlus, Lock, Unlock, ChevronRight } from 'lucide-react';
import { DASHBOARD_IMAGES } from './dashboardAssets';

interface FileActionsProps {
  onStartEnrollment: () => void;
  onStartEncryption: () => void;
  onStartDecryption: () => void;
}

const actions = [
  {
    title: 'Enroll',
    desc: 'Record your voice profile once.',
    onClickKey: 'enroll' as const,
    icon: UserPlus,
    image: DASHBOARD_IMAGES.voice,
    accent: 'text-blue-400',
    ring: 'ring-blue-500/25',
  },
  {
    title: 'Encrypt',
    desc: 'Lock a file for chosen teammates.',
    onClickKey: 'encrypt' as const,
    icon: Lock,
    image: DASHBOARD_IMAGES.encrypt,
    accent: 'text-indigo-400',
    ring: 'ring-indigo-500/25',
  },
  {
    title: 'Decrypt',
    desc: 'Open a file if you are allowed.',
    onClickKey: 'decrypt' as const,
    icon: Unlock,
    image: DASHBOARD_IMAGES.team,
    accent: 'text-emerald-400',
    ring: 'ring-emerald-500/25',
  },
];

const FileActions: React.FC<FileActionsProps> = ({
  onStartEnrollment,
  onStartEncryption,
  onStartDecryption,
}) => {
  const handlers = {
    enroll: onStartEnrollment,
    encrypt: onStartEncryption,
    decrypt: onStartDecryption,
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {actions.map((a) => (
        <button
          key={a.title}
          type="button"
          onClick={handlers[a.onClickKey]}
          className={`group relative text-left rounded-2xl border border-slate-800/80 overflow-hidden focus:outline-none focus-visible:ring-2 ${a.ring} transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/40`}
        >
          {/* ✅ IMAGE (NO BLUR NOW → visible) */}
          <img
            src={a.image}
            alt={a.title}
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />

          {/* ✅ LIGHT OVERLAY (so image is visible) */}
          <div className="absolute inset-0 bg-black/40" />

          {/* CONTENT */}
          <div className="relative p-4 sm:p-5 flex flex-col gap-3 sm:gap-4 min-h-[120px]">
            <div className="flex items-start justify-between gap-3">
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-black/40 ${a.accent}`}
              >
                <a.icon className="h-5 w-5" />
              </div>

              <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-white group-hover:translate-x-1 transition-all mt-0.5" />
            </div>

            <div>
              <h3 className="font-semibold text-white text-lg">
                {a.title}
              </h3>
              <p className="text-slate-300 text-sm mt-1">
                {a.desc}
              </p>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
};

export default FileActions;