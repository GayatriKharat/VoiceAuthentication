import React, { useState, useRef, useEffect, useMemo } from 'react';
import { User, FileHistoryEntry } from '../types';
import BiometricModal from './BiometricModal';
import { encryptFileForTeam } from '../utils/crypto';
import { ensureUserHasKeypair } from '../utils/userKeys';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { toast } from 'sonner';
import {
  FileUp,
  Lock,
  ShieldCheck,
  X,
  Users,
  Check,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type Step =
  | 'uploadFile'
  | 'selectRecipients'
  | 'verifyAndEncrypt'
  | 'download';

const MAX_FILE_SIZE_MB = 15;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

interface EncryptionFlowProps {
  users: User[];
  currentUserProfile: User | null;
  onComplete: () => void;
  addLog: (text: string, type: 'info' | 'success' | 'error' | 'warning') => void;
  addFileHistoryEntry: (entry: Omit<FileHistoryEntry, 'id' | 'timestamp'>) => void;
}

const EncryptionFlow: React.FC<EncryptionFlowProps> = ({
  users,
  currentUserProfile,
  onComplete,
  addLog,
  addFileHistoryEntry,
}) => {
  const [step, setStep] = useState<Step>('uploadFile');
  const [fileToEncrypt, setFileToEncrypt] = useState<File | null>(null);
  const [encryptedFileUrl, setEncryptedFileUrl] = useState<string | null>(null);
  const [encryptedFileName, setEncryptedFileName] = useState('');
  const [isBiometricModalOpen, setIsBiometricModalOpen] = useState(false);
  const [selectedUids, setSelectedUids] = useState<Set<string>>(new Set());
  const [includeSelf, setIncludeSelf] = useState(true);
  const [isEncrypting, setIsEncrypting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const teammates = useMemo(
    () =>
      users.filter(
        (u) =>
          u.isEnrolled &&
          u.publicKey &&
          u.uid !== currentUserProfile?.uid
      ),
    [users, currentUserProfile]
  );

  useEffect(() => {
    return () => {
      if (encryptedFileUrl) URL.revokeObjectURL(encryptedFileUrl);
    };
  }, [encryptedFileUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error(`File too large. Max ${MAX_FILE_SIZE_MB}MB allowed.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setFileToEncrypt(file);
  };

  const handleUploadSubmit = () => {
    if (!fileToEncrypt) return;
    if (!currentUserProfile) {
      toast.error('You need to enroll your voice first.');
      onComplete();
      return;
    }
    addLog(`File '${fileToEncrypt.name}' selected. Choose recipients.`, 'info');
    setStep('selectRecipients');
  };

  const toggleRecipient = (uid: string) => {
    setSelectedUids((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedUids(new Set(teammates.map((t) => t.uid)));
  };

  const clearAll = () => {
    setSelectedUids(new Set());
  };

  const proceedToVerify = () => {
    if (!currentUserProfile) return;
    const totalRecipients = selectedUids.size + (includeSelf ? 1 : 0);
    if (totalRecipients === 0) {
      toast.error('Select at least one recipient (or include yourself).');
      return;
    }
    setStep('verifyAndEncrypt');
    setIsBiometricModalOpen(true);
    addLog(
      `Sender: ${currentUserProfile.name}. Sealing for ${totalRecipients} recipient(s). Awaiting voice authorization...`,
      'info'
    );
  };

  const handleVerificationSuccess = async () => {
    setIsBiometricModalOpen(false);
    if (!currentUserProfile || !fileToEncrypt) return;

    setIsEncrypting(true);
    addLog(
      `Access granted to ${currentUserProfile.name}. Wrapping file key for each recipient...`,
      'success'
    );

    try {
      const sender = await ensureUserHasKeypair(currentUserProfile);

      const recipients = teammates
        .filter((t) => selectedUids.has(t.uid))
        .map((t) => ({ uid: t.uid, name: t.name, publicKey: t.publicKey! }));

      if (includeSelf && sender.publicKey) {
        recipients.push({
          uid: sender.uid,
          name: sender.name,
          publicKey: sender.publicKey,
        });
      }

      const encryptedData = await encryptFileForTeam(
        fileToEncrypt,
        {
          uid: sender.uid,
          name: sender.name,
          language: sender.passPhraseLanguage,
        },
        recipients
      );

      const newEncryptedFileName = `${fileToEncrypt.name}.vas`;
      const blob = new Blob([JSON.stringify(encryptedData)], {
        type: 'application/json',
      });

      setEncryptedFileUrl(URL.createObjectURL(blob));
      setEncryptedFileName(newEncryptedFileName);
      setStep('download');
      toast.success(
        `Sealed for ${recipients.length} recipient${recipients.length === 1 ? '' : 's'}.`
      );

      addFileHistoryEntry({
        fileName: fileToEncrypt.name,
        operation: 'encrypt',
        userUid: sender.uid,
        userName: sender.name,
        status: 'success',
        location: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });

      addLog(
        `File '${fileToEncrypt.name}' encrypted by ${sender.name} for: ${recipients
          .map((r) => r.name)
          .join(', ')}.`,
        'success'
      );
    } catch (error) {
      console.error(error);
      toast.error('Encryption failed.');
      addLog(
        `File encryption failed: ${error instanceof Error ? error.message : 'Internal Error'}`,
        'error'
      );
      onComplete();
    } finally {
      setIsEncrypting(false);
    }
  };

  const handleAuthFailure = (reason: string) => {
    setIsBiometricModalOpen(false);
    toast.error(`Verification failed: ${reason}`);
    addLog(`Biometric verification failed: ${reason}`, 'error');
    onComplete();
  };

  if (!currentUserProfile) {
    return (
      <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-slate-900 border-slate-800 shadow-2xl relative rounded-[2.5rem]">
          <Button
            variant="ghost"
            size="icon"
            onClick={onComplete}
            className="absolute top-6 right-6 text-slate-500 hover:text-white"
          >
            <X className="h-5 w-5" />
          </Button>
          <CardContent className="p-10 text-center space-y-4">
            <AlertCircle className="h-10 w-10 text-amber-400 mx-auto" />
            <h3 className="text-xl font-bold text-white">Enrollment Required</h3>
            <p className="text-slate-400 text-sm">
              Enroll your voice before you can encrypt files for your team.
            </p>
            <Button
              onClick={onComplete}
              className="h-12 bg-blue-600 hover:bg-blue-500 rounded-2xl font-bold"
            >
              Close
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
      <Card className="w-full max-w-lg bg-slate-900 border-slate-800 shadow-2xl relative rounded-[2.5rem] overflow-hidden my-8">
        <Button
          variant="ghost"
          size="icon"
          onClick={onComplete}
          className="absolute top-6 right-6 text-slate-500 hover:text-white z-10"
        >
          <X className="h-5 w-5" />
        </Button>

        <CardHeader className="pt-10 text-center space-y-4">
          <div className="mx-auto p-4 bg-indigo-600/10 rounded-2xl border border-indigo-500/20 w-fit">
            <Lock className="h-8 w-8 text-indigo-500" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold tracking-tight text-white">
              Secure Team Encryption
            </CardTitle>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">
              Locked For Selected Teammates Only
            </p>
          </div>
        </CardHeader>

        <CardContent className="pb-10 px-10">
          <AnimatePresence mode="wait">
            {/* Step 1: Upload File */}
            {step === 'uploadFile' && (
              <motion.div
                key="upload"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="group relative cursor-pointer border-2 border-dashed border-slate-800 rounded-3xl p-12 transition-all hover:border-indigo-500/50 hover:bg-indigo-500/5 flex flex-col items-center justify-center text-center space-y-4 shadow-inner"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="p-5 bg-slate-800/80 rounded-2xl group-hover:scale-110 transition-transform shadow-xl">
                    <FileUp className="h-8 w-8 text-slate-400 group-hover:text-indigo-400" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-200">
                      {fileToEncrypt ? fileToEncrypt.name : 'Select File to Encrypt'}
                    </p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                      {fileToEncrypt
                        ? `${(fileToEncrypt.size / 1024 / 1024).toFixed(2)} MB`
                        : `Max Payload: ${MAX_FILE_SIZE_MB}MB`}
                    </p>
                  </div>
                </div>
                {fileToEncrypt && (
                  <Button
                    onClick={handleUploadSubmit}
                    className="w-full h-14 bg-indigo-600 hover:bg-indigo-500 font-bold text-lg rounded-2xl shadow-lg shadow-indigo-900/20"
                  >
                    Continue to Recipients
                  </Button>
                )}
              </motion.div>
            )}

            {/* Step 2: Select Recipients (multi-select teammates) */}
            {step === 'selectRecipients' && (
              <motion.div
                key="recipients"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-400" />
                    <p className="text-sm text-slate-300 font-semibold">
                      Who can open this file?
                    </p>
                  </div>
                  <div className="flex gap-2 text-[10px] font-bold uppercase tracking-widest">
                    <button
                      onClick={selectAll}
                      disabled={!teammates.length}
                      className="text-indigo-400 hover:text-indigo-300 disabled:opacity-40"
                    >
                      All
                    </button>
                    <span className="text-slate-700">|</span>
                    <button
                      onClick={clearAll}
                      disabled={!selectedUids.size}
                      className="text-slate-400 hover:text-slate-200 disabled:opacity-40"
                    >
                      None
                    </button>
                  </div>
                </div>

                {/* Sender (always included option) */}
                <label className="flex items-center justify-between px-4 py-3 bg-slate-800/60 border border-slate-700 rounded-2xl cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-600/20 flex items-center justify-center border border-emerald-500/30 text-emerald-400 font-bold text-sm">
                      {currentUserProfile.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">
                        {currentUserProfile.name}{' '}
                        <span className="text-[9px] text-emerald-400 font-black uppercase ml-1">
                          You
                        </span>
                      </p>
                      <p className="text-[10px] text-slate-500">
                        Include yourself so you can open it later
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={includeSelf}
                    onChange={(e) => setIncludeSelf(e.target.checked)}
                    className="w-5 h-5 accent-emerald-500"
                  />
                </label>

                {/* Teammates */}
                {teammates.length === 0 ? (
                  <div className="text-center py-6 text-slate-500 text-sm bg-slate-800/30 border border-slate-800 rounded-2xl">
                    No other enrolled teammates yet.
                    <br />
                    <span className="text-[11px] text-slate-600">
                      Ask them to sign in and enroll their voice to appear here.
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {teammates.map((user) => {
                      const isChecked = selectedUids.has(user.uid);
                      return (
                        <label
                          key={user.uid}
                          className={`flex items-center justify-between px-4 py-3 border rounded-2xl transition-all cursor-pointer ${
                            isChecked
                              ? 'bg-indigo-500/10 border-indigo-500/40'
                              : 'bg-slate-800/40 border-slate-700 hover:border-indigo-500/30'
                          }`}
                        >
                          <div className="flex items-center gap-3 text-left">
                            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 flex items-center justify-center border border-indigo-500/20 text-indigo-400 font-bold text-sm">
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white">{user.name}</p>
                              <p className="text-[10px] text-slate-500">
                                {user.passPhraseLanguage
                                  ? `${user.passPhraseLanguage} passphrase`
                                  : user.email}
                              </p>
                            </div>
                          </div>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleRecipient(user.uid)}
                            className="w-5 h-5 accent-indigo-500"
                          />
                        </label>
                      );
                    })}
                  </div>
                )}

                <div className="pt-2 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">
                    {selectedUids.size + (includeSelf ? 1 : 0)} recipient(s) selected
                  </span>
                </div>

                <Button
                  onClick={proceedToVerify}
                  disabled={selectedUids.size + (includeSelf ? 1 : 0) === 0}
                  className="w-full h-14 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 font-bold text-lg rounded-2xl shadow-lg shadow-indigo-900/20"
                >
                  Verify My Voice &amp; Encrypt
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </motion.div>
            )}

            {/* Step 3: Verifying */}
            {step === 'verifyAndEncrypt' && !isBiometricModalOpen && (
              <motion.div
                key="verifying"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12 space-y-6"
              >
                <div className="relative w-20 h-20 mx-auto">
                  <div className="absolute inset-0 border-4 border-indigo-500/10 rounded-full" />
                  <div className="absolute inset-0 border-t-4 border-indigo-500 rounded-full animate-spin" />
                  <Lock className="absolute inset-0 m-auto h-8 w-8 text-indigo-500" />
                </div>
                <div className="space-y-2">
                  <p className="text-lg font-bold text-white">
                    {isEncrypting
                      ? 'Wrapping File Key For Each Recipient...'
                      : 'Awaiting Your Voice Authorization'}
                  </p>
                  <p className="text-sm text-slate-500">
                    Verifying identity for:{' '}
                    <span className="text-white font-semibold">
                      {currentUserProfile.name}
                    </span>
                  </p>
                </div>
              </motion.div>
            )}

            {/* Step 4: Download */}
            {step === 'download' && (
              <motion.div
                key="download"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-6"
              >
                <div className="p-6 bg-emerald-500/5 border border-emerald-500/20 rounded-3xl flex items-center space-x-5">
                  <div className="p-4 bg-emerald-500/10 rounded-2xl">
                    <ShieldCheck className="h-7 w-7 text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{encryptedFileName}</p>
                    <p className="text-[10px] text-emerald-500/70 font-black uppercase tracking-widest">
                      Sealed — only selected recipients can open
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-slate-800/40 border border-slate-800 rounded-2xl space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Authorized Recipients
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {includeSelf && (
                      <span className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold rounded-lg flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        {currentUserProfile.name} (You)
                      </span>
                    )}
                    {teammates
                      .filter((t) => selectedUids.has(t.uid))
                      .map((t) => (
                        <span
                          key={t.uid}
                          className="px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-[11px] font-semibold rounded-lg flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" />
                          {t.name}
                        </span>
                      ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Button
                    asChild
                    className="h-14 bg-blue-600 hover:bg-blue-500 rounded-2xl font-bold"
                  >
                    <a href={encryptedFileUrl!} download={encryptedFileName}>
                      Download Vault
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={onComplete}
                    className="h-14 border-slate-800 text-slate-400 hover:bg-slate-800 rounded-2xl font-bold"
                  >
                    Close Session
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Biometric verification modal — the sender's own voice authorizes the send */}
      {isBiometricModalOpen && currentUserProfile && (
        <BiometricModal
          action={{ type: 'verify', user: currentUserProfile }}
          onClose={() => setIsBiometricModalOpen(false)}
          onSuccess={handleVerificationSuccess}
          onFailure={handleAuthFailure}
        />
      )}
    </div>
  );
};

export default EncryptionFlow;
