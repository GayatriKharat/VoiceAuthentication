import React from 'react';

type ZLayer = 'flow' | 'biometric' | 'auth';

const zClass: Record<ZLayer, string> = {
  flow: 'z-[100]',
  biometric: 'z-[250]',
  auth: 'z-[200]',
};

/**
 * Scrollable overlay so tall flows fit any screen: outer page scrolls, inner card can cap height.
 */
const FlowModalShell: React.FC<{
  children: React.ReactNode;
  layer?: ZLayer;
  backdrop?: 'dark' | 'darker';
}> = ({ children, layer = 'flow', backdrop = 'dark' }) => {
  const bg =
    backdrop === 'darker' ? 'bg-slate-950/90 backdrop-blur-xl' : 'bg-slate-950/80 backdrop-blur-sm';
  return (
    <div
      className={`fixed inset-0 ${zClass[layer]} overflow-y-auto overscroll-contain ${bg}`}
      role="presentation"
    >
      <div className="flex min-h-[100dvh] w-full min-w-0 items-center justify-center p-3 sm:p-4 py-6 sm:py-10">
        {children}
      </div>
    </div>
  );
};

export default FlowModalShell;
