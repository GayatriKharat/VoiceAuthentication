import React from 'react';
import { UserPlus, Lock, Unlock } from 'lucide-react';
import { Card, CardContent } from './ui/card';

interface FileActionsProps {
  onStartEnrollment: () => void;
  onStartEncryption: () => void;
  onStartDecryption: () => void;
}

const FileActions: React.FC<FileActionsProps> = ({ onStartEnrollment, onStartEncryption, onStartDecryption }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Enroll Action */}
      <Card 
        onClick={onStartEnrollment}
        className="group cursor-pointer bg-slate-900/40 border-slate-800/50 hover:bg-blue-500/5 hover:border-blue-500/30 transition-all rounded-[2rem] overflow-hidden"
      >
        <CardContent className="p-8 flex items-start space-x-6">
          <div className="p-4 bg-blue-600/10 rounded-2xl border border-blue-500/20 group-hover:scale-110 transition-transform">
            <UserPlus className="h-7 w-7 text-blue-500" />
          </div>
          <div className="space-y-2">
            <h3 className="font-bold text-lg text-white">Enroll Profile</h3>
            <p className="text-slate-500 text-xs leading-relaxed font-medium">Provision a new biometric node in the global security cloud.</p>
          </div>
        </CardContent>
      </Card>
      
      {/* Encrypt Action */}
      <Card 
        onClick={onStartEncryption}
        className="group cursor-pointer bg-slate-900/40 border-slate-800/50 hover:bg-indigo-500/5 hover:border-indigo-500/30 transition-all rounded-[2rem] overflow-hidden"
      >
        <CardContent className="p-8 flex items-start space-x-6">
          <div className="p-4 bg-indigo-600/10 rounded-2xl border border-indigo-500/20 group-hover:scale-110 transition-transform">
            <Lock className="h-7 w-7 text-indigo-500" />
          </div>
          <div className="space-y-2">
            <h3 className="font-bold text-lg text-white">Seal Asset</h3>
            <p className="text-slate-500 text-xs leading-relaxed font-medium">Execute high-level encryption on corporate data assets.</p>
          </div>
        </CardContent>
      </Card>

      {/* Decrypt Action */}
      <Card 
        onClick={onStartDecryption}
        className="group cursor-pointer bg-slate-900/40 border-slate-800/50 hover:bg-emerald-500/5 hover:border-emerald-500/30 transition-all rounded-[2rem] overflow-hidden"
      >
        <CardContent className="p-8 flex items-start space-x-6">
          <div className="p-4 bg-emerald-600/10 rounded-2xl border border-emerald-500/20 group-hover:scale-110 transition-transform">
            <Unlock className="h-7 w-7 text-emerald-500" />
          </div>
          <div className="space-y-2">
            <h3 className="font-bold text-lg text-white">Unlock Vault</h3>
            <p className="text-slate-500 text-xs leading-relaxed font-medium">Access protected assets via biometric identity verification.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FileActions;
