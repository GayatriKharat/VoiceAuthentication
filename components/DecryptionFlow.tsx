import React, { useState, useRef, useEffect } from 'react';
import { User, EncryptedFile, FileHistoryEntry } from '../types';
import BiometricModal from './BiometricModal';
import { decryptFileForUser, loadUserPrivateKey } from '../utils/crypto';
import { ensureUserHasKeypair } from '../utils/userKeys';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { toast } from 'sonner';
import {
  FileDown,
  LockOpen,
  ShieldCheck,
  X,
  FileSearch,
  AlertCircle,
  Users,
  Check,
  Ban,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type Step = 'uploadFile' | 'reviewAccess' | 'decryptVoice' | 'download';

const MAX_FILE_SIZE_MB = 15;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

interface DecryptionFlowProps {
  users: User[];
  currentUserProfile: User | null;
  onComplete: () => void;
  addLog: (text: string, type: 'info' | 'success' | 'error' | 'warning') => void;
  addFileHistoryEntry: (entry: Omit<FileHistoryEntry, 'id' | 'timestamp'>) => void;
}

const DecryptionFlow: React.FC<DecryptionFlowProps> = ({
  currentUserProfile,
  onComplete,
  addLog,
  addFileHistoryEntry,
}) => {
  const [step, setStep] = useState<Step>('uploadFile');
  const [encryptedFile, setEncryptedFile] = useState<File | null>(null);
  const [originalFileName, setOriginalFileName] = useState('');
  const [decryptedFileUrl, setDecryptedFileUrl] = useState<string | null>(null);
  const [isBiometricModalOpen, setIsBiometricModalOpen] = useState(false);
  const [parsedEncryptedData, setParsedEncryptedData] = useState<EncryptedFile | null>(null);
  const [isLegacyFile, setIsLegacyFile] = useState(false);
  const [accessGranted, setAccessGranted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (decryptedFileUrl) URL.revokeObjectURL(decryptedFileUrl);
    };
  }, [decryptedFileUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error(`File too large. Max ${MAX_FILE_SIZE_MB}MB allowed.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    if (!file.name.endsWith('.vas')) {
      toast.error('Invalid file type. Please select a .vas vault file.');
      return;
    }
    setEncryptedFile(file);
  };

  const handleUploadSubmit = async () => {
    if (!encryptedFile || !currentUserProfile) return;
    addLog(`Analysing vault file '${encryptedFile.name}'...`, 'info');
    try {
      const fileContent = await encryptedFile.text();
      const encryptedData: EncryptedFile = JSON.parse(fileContent);
      if (!encryptedData?.originalFileName) {
        throw new Error('Invalid or corrupted file format.');
      }
      setParsedEncryptedData(encryptedData);

      const isV3 = encryptedData.version === 3 && !!encryptedData.recipients;
      setIsLegacyFile(!isV3);

      const amIOnTheList =
        !isV3 ||
        encryptedData.recipients!.some((r) => r.uid === currentUserProfile.uid);

      setAccessGranted(amIOnTheList);

      if (amIOnTheList) {
        addLog(
          isV3
            ? `Access granted: you are on the recipient list for '${encryptedData.originalFileName}'.`
            : `Legacy vault detected. Proceeding with biometric unlock.`,
          'info'
        );
      } else {
        addLog(
          `Access denied: ${currentUserProfile.name} is NOT a recipient of '${encryptedData.originalFileName}'.`,
          'warning'
        );
      }

      setStep('reviewAccess');
    } catch {
      toast.error('Decryption failed: File is corrupted or invalid.');
      addLog('Decryption failed: File is corrupted or invalid.', 'error');
      setEncryptedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const startVoiceUnlock = () => {
    if (!currentUserProfile || !accessGranted) return;
    setStep('decryptVoice');
    setIsBiometricModalOpen(true);
    addLog(
      `Verifying voice of ${currentUserProfile.name} to unlock...`,
      'info'
    );
  };

  const handleVerifySuccess = async () => {
    setIsBiometricModalOpen(false);
    if (!parsedEncryptedData || !currentUserProfile) return;

    addLog(
      `Biometric verification successful for ${currentUserProfile.name}. Unwrapping key...`,
      'success'
    );

    try {
      const profile = await ensureUserHasKeypair(currentUserProfile);
      if (!profile.encryptedPrivateKey) {
        throw new Error('Your personal key is missing. Please re-enroll.');
      }

      const privateKey = await loadUserPrivateKey(
        profile.uid,
        profile.encryptedPrivateKey
      );

      const {
        blob: decryptedBlob,
        fileName: originalName,
        senderName,
      } = await decryptFileForUser(parsedEncryptedData, profile.uid, privateKey);

      setDecryptedFileUrl(URL.createObjectURL(decryptedBlob));
      setOriginalFileName(originalName);
      setStep('download');
      toast.success(
        senderName
          ? `Unlocked. Sent by ${senderName}.`
          : 'Vault unlocked successfully.'
      );
      addLog(
        `File '${originalName}' decrypted by ${profile.name}${
          senderName ? ` (sent by ${senderName})` : ''
        }.`,
        'success'
      );

      addFileHistoryEntry({
        fileName: originalName,
        operation: 'decrypt',
        userUid: profile.uid,
        userName: profile.name,
        status: 'success',
        location: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
    } catch (error) {
      console.error(error);
      const msg = error instanceof Error ? error.message : 'Decryption error';
      toast.error(msg.startsWith('ACCESS_DENIED') ? 'You are not a recipient.' : 'Decryption error.');
      addLog(`Decryption error: ${msg}`, 'error');
      onComplete();
    }
  };

  const handleAuthFailure = (reason: string) => {
    setIsBiometricModalOpen(false);
    toast.error(`Security Alert: ${reason}`);
    addLog(`Security Alert: Identity verification failed. Reason: ${reason}`, 'error');
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
              Enroll your voice before you can open team files sent to you.
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
          <div className="mx-auto p-4 bg-blue-600/10 rounded-2xl border border-blue-500/20 w-fit">
            <LockOpen className="h-8 w-8 text-blue-500" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold tracking-tight text-white">
              Vault Decryption
            </CardTitle>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">
              Only Authorised Recipients Can Unlock
            </p>
          </div>
        </CardHeader>

        <CardContent className="pb-10 px-10">
          <AnimatePresence mode="wait">
            {/* Step 1: Upload vault file */}
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
                  className="group relative cursor-pointer border-2 border-dashed border-slate-800 rounded-3xl p-12 transition-all hover:border-blue-500/50 hover:bg-blue-500/5 flex flex-col items-center justify-center text-center space-y-4 shadow-inner"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept=".vas"
                  />
                  <div className="p-5 bg-slate-800/80 rounded-2xl group-hover:scale-110 transition-transform shadow-xl">
                    <FileDown className="h-8 w-8 text-slate-400 group-hover:text-blue-400" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-200">
                      {encryptedFile ? encryptedFile.name : 'Select .vas Vault File'}
                    </p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                      {encryptedFile
                        ? `${(encryptedFile.size / 1024 / 1024).toFixed(2)} MB`
                        : `Max Payload: ${MAX_FILE_SIZE_MB}MB`}
                    </p>
                  </div>
                </div>
                {encryptedFile && (
                  <Button
                    onClick={handleUploadSubmit}
                    className="w-full h-14 bg-blue-600 hover:bg-blue-500 font-bold text-lg rounded-2xl shadow-lg shadow-blue-900/20"
                  >
                    Check Access
                  </Button>
                )}
              </motion.div>
            )}

            {/* Step 2: Review access (who sent it, am I on the list?) */}
            {step === 'reviewAccess' && parsedEncryptedData && (
              <motion.div
                key="review"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <div className="p-5 bg-slate-800/40 border border-slate-800 rounded-2xl space-y-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                      File
                    </p>
                    <p className="text-sm font-bold text-white truncate">
                      {parsedEncryptedData.originalFileName}
                    </p>
                  </div>
                  {parsedEncryptedData.senderName && (
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                        Sent By
                      </p>
                      <p className="text-sm font-semibold text-indigo-300">
                        {parsedEncryptedData.senderName}
                        {parsedEncryptedData.senderLanguage && (
                          <span className="text-slate-500 font-normal text-xs ml-2">
                            ({parsedEncryptedData.senderLanguage})
                          </span>
                        )}
                      </p>
                    </div>
                  )}
                  {parsedEncryptedData.recipients && (
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        Authorised Recipients
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {parsedEncryptedData.recipients.map((r) => {
                          const isMe = r.uid === currentUserProfile.uid;
                          return (
                            <span
                              key={r.uid}
                              className={`px-2.5 py-1 border text-[11px] font-semibold rounded-lg flex items-center gap-1 ${
                                isMe
                                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                                  : 'bg-slate-700/40 border-slate-700 text-slate-300'
                              }`}
                            >
                              {isMe && <Check className="w-3 h-3" />}
                              {r.name}
                              {isMe && <span className="text-[9px] opacity-70 ml-0.5">You</span>}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {isLegacyFile && (
                    <div className="text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
                      Legacy vault file — no per-recipient lock. Any enrolled user who
                      passes their own voice check can open it.
                    </div>
                  )}
                </div>

                {accessGranted ? (
                  <Button
                    onClick={startVoiceUnlock}
                    className="w-full h-14 bg-blue-600 hover:bg-blue-500 font-bold text-lg rounded-2xl shadow-lg shadow-blue-900/20"
                  >
                    Verify My Voice &amp; Unlock
                  </Button>
                ) : (
                  <div className="p-5 bg-red-500/5 border border-red-500/20 rounded-2xl flex items-start gap-3">
                    <Ban className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-red-300">Access Denied</p>
                      <p className="text-xs text-slate-400">
                        This file was not sealed for {currentUserProfile.name}. Ask the
                        sender to re-encrypt and include you as a recipient.
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 3: Scanning */}
            {step === 'decryptVoice' && !isBiometricModalOpen && (
              <motion.div
                key="scanning"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12 space-y-6"
              >
                <div className="relative w-20 h-20 mx-auto">
                  <div className="absolute inset-0 border-4 border-blue-500/10 rounded-full" />
                  <div className="absolute inset-0 border-t-4 border-blue-500 rounded-full animate-spin" />
                  <FileSearch className="absolute inset-0 m-auto h-8 w-8 text-blue-500" />
                </div>
                <div className="space-y-2">
                  <p className="text-lg font-bold text-white">Awaiting Biometric Confirmation</p>
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
                    <p className="text-sm font-bold text-white truncate">{originalFileName}</p>
                    <p className="text-[10px] text-emerald-500/70 font-black uppercase tracking-widest">
                      Vault Unlocked Successfully
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Button asChild className="h-14 bg-blue-600 hover:bg-blue-500 rounded-2xl font-bold">
                    <a href={decryptedFileUrl!} download={originalFileName}>
                      Download Asset
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

      {/* Biometric verification modal */}
      {isBiometricModalOpen && currentUserProfile && (
        <BiometricModal
          action={{ type: 'verify', user: currentUserProfile }}
          onClose={() => setIsBiometricModalOpen(false)}
          onSuccess={handleVerifySuccess}
          onFailure={handleAuthFailure}
        />
      )}
    </div>
  );
};

export default DecryptionFlow;
