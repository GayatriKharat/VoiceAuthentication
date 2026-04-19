import React from 'react';
import { UserPlus, Lock, Unlock, ChevronRight } from 'lucide-react';
import { DASHBOARD_IMAGES } from './dashboardAssets';

const actions = [
  {
    title: 'Enroll',
    desc: 'Record your voice profile.',
    icon: UserPlus,
    image: DASHBOARD_IMAGES.voice,
    color: 'blue',
  },
  {
    title: 'Encrypt',
    desc: 'Secure your files.',
    icon: Lock,
    image: DASHBOARD_IMAGES.encrypt,
    color: 'indigo',
  },
  {
    title: 'Decrypt',
    desc: 'Access authorized files.',
    icon: Unlock,
    image: DASHBOARD_IMAGES.team,
    color: 'emerald',
  },
];

export default function FileActions({
  onStartEnrollment,
  onStartEncryption,
  onStartDecryption,
}: any) {
  const handlers = [onStartEnrollment, onStartEncryption, onStartDecryption];

  return (
    <div className="grid md:grid-cols-3 gap-5">

      {actions.map((a, i) => (
        <button
          key={a.title}
          onClick={handlers[i]}
          className="group relative rounded-2xl overflow-hidden border border-indigo-500/10 hover:border-indigo-400/40 transition-all duration-300 hover:shadow-[0_0_30px_rgba(99,102,241,0.25)]"
        >
          {/* IMAGE */}
          <img
            src={a.image}
            className="absolute inset-0 w-full h-full object-cover brightness-75 group-hover:brightness-100 transition"
          />

          {/* OVERLAY */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

          {/* CONTENT */}
          <div className="relative p-5 flex flex-col justify-between min-h-[140px]">

            <div className="flex justify-between">
              <a.icon className="text-indigo-400" />
              <ChevronRight className="text-slate-400 group-hover:translate-x-1 transition" />
            </div>

            <div>
              <h3 className="text-white text-lg font-semibold">{a.title}</h3>
              <p className="text-slate-400 text-sm">{a.desc}</p>
            </div>

          </div>
        </button>
      ))}

    </div>
  );
}