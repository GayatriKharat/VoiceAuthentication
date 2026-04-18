import React, { useState } from 'react';
import { User } from '../types';
import BiometricModal from './BiometricModal';
import PhraseSelector, { PhraseSelection } from './PhraseSelector';
import FlowModalShell from './FlowModalShell';
import { X } from 'lucide-react';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { setDoc, doc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { UserPlus, ShieldCheck, Languages, Mic, AlertTriangle } from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { averageVoiceprints } from '../utils/audioProcessor';
import { generateUserKeyMaterial } from '../utils/crypto';
import { recordSecurityEvent } from '../utils/securityAudit';
import { motion, AnimatePresence } from 'framer-motion';

type Step = 'name' | 'phrase' | 'enroll1' | 'enroll2' | 'saving' | 'error';

interface EnrollmentFlowProps {
  currentUser: FirebaseUser;
  onComplete: () => void;
  onUserEnrolled: (user: User) => void;
  addLog: (text: string, type: 'info' | 'success' | 'error' | 'warning') => void;
}

const STEP_LABELS: Record<Step, string> = {
  name: 'Identity',
  phrase: 'Passphrase',
  enroll1: 'Sample 1',
  enroll2: 'Sample 2',
  saving: 'Complete',
};

const EnrollmentFlow: React.FC<EnrollmentFlowProps> = ({
  currentUser,
  onComplete,
  onUserEnrolled,
  addLog,
}) => {
  const [step, setStep] = useState<Step>('name');
  const [userName, setUserName] = useState(currentUser.displayName || '');
  const [phraseSelection, setPhraseSelection] = useState<PhraseSelection | null>(null);
  const [voiceprint1, setVoiceprint1] = useState<Float32Array | null>(null);
  const [isBiometricOpen, setIsBiometricOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState<string>(
    'Averaging voice samples and synchronising to global registry...'
  );
  const [saveError, setSaveError] = useState<string | null>(null);

  const steps: Step[] = ['name', 'phrase', 'enroll1', 'enroll2', 'saving'];
  const currentStepIdx = steps.indexOf(step);

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim()) return;
    addLog(`Initialising enrollment for: ${userName.trim()}`, 'info');
    setStep('phrase');
  };

  const handlePhraseConfirm = (selection: PhraseSelection) => {
    setPhraseSelection(selection);
    addLog(`Passphrase set in ${selection.language}: "${selection.phrase.slice(0, 30)}..."`, 'info');
    setStep('enroll1');
    setIsBiometricOpen(true);
  };

  const handleEnroll1Success = (result: Float32Array) => {
    setIsBiometricOpen(false);
    setVoiceprint1(result);
    toast.success('Voice sample 1 captured! Please record once more.');
    addLog('Voice sample 1 captured successfully.', 'info');
    setStep('enroll2');
    setTimeout(() => setIsBiometricOpen(true), 800);
  };

  const handleEnroll2Success = async (result: Float32Array) => {
    setIsBiometricOpen(false);
    setIsSaving(true);
    setSaveError(null);
    setStep('saving');

    if (!voiceprint1 || !result || !auth.currentUser || !phraseSelection) {
      setSaveError('Enrollment data incomplete. Please start over.');
      setStep('error');
      setIsSaving(false);
      return;
    }

    try {
      setSaveProgress('Averaging voice samples (step 1/3)...');
      const averagedVoiceprint = averageVoiceprints(voiceprint1, result);
      addLog('Averaging two voice samples for optimised biometric model...', 'info');

      setSaveProgress('Generating your personal encryption keypair (step 2/3)... this can take 2-5 seconds');
      addLog('Generating personal encryption keypair for team sharing...', 'info');
      const keyMaterial = await generateUserKeyMaterial(auth.currentUser.uid);

      setSaveProgress('Saving profile to secure cloud (step 3/3)...');

      const adminEmail = 'gayatrikharat62@gmail.com';
      const newUser: User = {
        uid: auth.currentUser.uid,
        name: userName.trim(),
        email: auth.currentUser.email || '',
        isEnrolled: true,
        voiceprint: Array.from(averagedVoiceprint),
        role: auth.currentUser.email === adminEmail ? 'admin' : 'user',
        createdAt: new Date().toISOString(),
        location: Intl.DateTimeFormat().resolvedOptions().timeZone,
        passPhrase: phraseSelection.phrase,
        passPhraseLanguage: phraseSelection.language,
        passPhraseLanguageCode: phraseSelection.languageCode,
        publicKey: keyMaterial.publicKey,
        encryptedPrivateKey: keyMaterial.encryptedPrivateKey,
      };

      const writePromise = setDoc(doc(db, 'users', auth.currentUser.uid), newUser);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error('Firestore write timed out after 20s. Check your network and Firestore rules.')
            ),
          20000
        )
      );
      await Promise.race([writePromise, timeoutPromise]);

      toast.success('Biometric profile enrolled and synchronised globally!');
      addLog(
        `User ${newUser.name} enrolled with ${phraseSelection.language} passphrase from ${newUser.location}.`,
        'success'
      );
      if (auth.currentUser) {
        await recordSecurityEvent(
          db,
          auth.currentUser,
          'ENROLL_COMPLETE',
          `Voice enrollment and keypair created for ${newUser.name}.`,
          { language: phraseSelection.language }
        );
      }
      onUserEnrolled(newUser);
      onComplete();
    } catch (error) {
      console.error('[EnrollmentFlow] save failed:', error);
      const msg =
        error instanceof Error
          ? error.message
          : typeof error === 'string'
            ? error
            : 'Unknown error while saving enrollment.';
      setSaveError(msg);
      setStep('error');
      handleFirestoreError(error, OperationType.CREATE, `users/${auth.currentUser?.uid}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRetrySave = () => {
    if (!voiceprint1) {
      setStep('enroll1');
      setSaveError(null);
      setIsBiometricOpen(true);
      return;
    }
    setSaveError(null);
    setStep('enroll2');
    setTimeout(() => setIsBiometricOpen(true), 300);
  };

  const handleEnrollFailure = (reason: string) => {
    setIsBiometricOpen(false);
    toast.error(`Enrollment failed: ${reason}`);
    addLog(`Voice enrollment failed: ${reason}`, 'error');
    if (step === 'enroll1') {
      setIsBiometricOpen(true);
    } else {
      setStep('enroll1');
      setTimeout(() => setIsBiometricOpen(true), 400);
    }
  };

  return (
    <>
    <FlowModalShell>
      <Card className="w-full max-w-lg flex flex-col max-h-[min(92dvh,880px)] bg-slate-900 border-slate-800 shadow-2xl relative rounded-3xl overflow-hidden my-auto">
        <Button
          variant="ghost"
          size="icon"
          onClick={onComplete}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 text-slate-500 hover:text-white z-20 shrink-0"
        >
          <X className="h-5 w-5" />
        </Button>

        <CardHeader className="shrink-0 pt-8 pb-4 px-5 sm:px-8 text-center space-y-3 border-b border-slate-800/60">
          <div className="mx-auto p-3 bg-blue-600/10 rounded-2xl border border-blue-500/20 w-fit">
            <UserPlus className="h-7 w-7 sm:h-8 sm:w-8 text-blue-500" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Biometric Enrollment
            </CardTitle>
            <p className="text-slate-500 text-[10px] sm:text-xs font-semibold uppercase tracking-wider">
              Secure node provisioning
            </p>
          </div>

          <div className="flex items-center justify-center pt-1 pb-0.5 max-w-full overflow-x-auto gap-0 px-1">
            {(['name', 'phrase', 'enroll1', 'enroll2'] as Step[]).map((s, i) => (
              <React.Fragment key={s}>
                {i > 0 && (
                  <div
                    className={`h-px w-3 sm:w-6 shrink-0 ${i <= currentStepIdx ? 'bg-emerald-500/45' : 'bg-slate-800'}`}
                  />
                )}
                <div className="flex flex-col items-center gap-0.5 shrink-0 px-0.5">
                  <div
                    className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-[9px] sm:text-[10px] font-bold transition-all ${
                      i < currentStepIdx
                        ? 'bg-emerald-500 text-white'
                        : i === currentStepIdx
                          ? 'bg-blue-600 text-white ring-2 ring-blue-500/30'
                          : 'bg-slate-800 text-slate-600'
                    }`}
                  >
                    {i < currentStepIdx ? '✓' : i + 1}
                  </div>
                  <span className="text-[7px] sm:text-[8px] text-slate-500 uppercase tracking-tighter text-center leading-tight w-[3.25rem] sm:w-14">
                    {STEP_LABELS[s]}
                  </span>
                </div>
              </React.Fragment>
            ))}
          </div>
        </CardHeader>

        <CardContent className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 sm:px-8 pb-6 sm:pb-8 pt-4">
          <AnimatePresence mode="wait">
            {step === 'name' && (
              <motion.div
                key="name"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <form onSubmit={handleNameSubmit} className="space-y-4 sm:space-y-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 ml-0.5">
                      Display name
                    </label>
                    <Input
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder="e.g. Priya Sharma"
                      className="bg-slate-800/50 border-slate-700 h-11 sm:h-12 text-base rounded-xl focus:ring-blue-500/20"
                      autoFocus
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={!userName.trim()}
                    className="w-full h-11 sm:h-12 bg-blue-600 hover:bg-blue-500 font-semibold text-base rounded-xl shadow-lg shadow-blue-900/20"
                  >
                    Next: choose passphrase
                  </Button>
                </form>
              </motion.div>
            )}

            {step === 'phrase' && (
              <motion.div
                key="phrase"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div className="space-y-3">
                  <div className="flex items-start gap-2 text-slate-400 text-xs leading-relaxed">
                    <Languages className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                    <span>Choose a phrase in any language. Say this exact phrase when you authenticate.</span>
                  </div>
                  <PhraseSelector onConfirm={handlePhraseConfirm} />
                </div>
              </motion.div>
            )}

            {(step === 'enroll1' || step === 'enroll2') && !isBiometricOpen && (
              <motion.div
                key={step}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8 sm:py-10 space-y-4"
              >
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 mx-auto">
                  <div className="absolute inset-0 border-4 border-blue-500/10 rounded-full" />
                  <div className="absolute inset-0 border-t-4 border-blue-500 rounded-full animate-spin" />
                  <Mic className="absolute inset-0 m-auto h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
                </div>
                <div className="space-y-1">
                  <p className="text-base sm:text-lg font-semibold text-white">
                    {step === 'enroll1' ? 'Preparing first recording…' : 'Almost done — one more sample'}
                  </p>
                  <p className="text-sm text-slate-500">
                    {step === 'enroll2'
                      ? 'Two samples build a more reliable voice model.'
                      : 'The capture window will open in a moment.'}
                  </p>
                </div>
              </motion.div>
            )}

            {step === 'saving' && (
              <motion.div
                key="saving"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8 sm:py-10 space-y-4"
              >
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 mx-auto">
                  <div className="absolute inset-0 border-4 border-emerald-500/10 rounded-full" />
                  <div className="absolute inset-0 border-t-4 border-emerald-500 rounded-full animate-spin" />
                  <ShieldCheck className="absolute inset-0 m-auto h-6 w-6 sm:h-8 sm:w-8 text-emerald-500" />
                </div>
                <div className="space-y-1">
                  <p className="text-base sm:text-lg font-semibold text-white">Saving your profile</p>
                  <p className="text-sm text-slate-500 text-balance">{saveProgress}</p>
                </div>
              </motion.div>
            )}

            {step === 'error' && (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-4 space-y-4"
              >
                <div className="mx-auto p-3 bg-red-500/10 rounded-2xl border border-red-500/20 w-fit">
                  <AlertTriangle className="h-7 w-7 sm:h-8 sm:w-8 text-red-400" />
                </div>
                <div className="space-y-2 text-left sm:text-center">
                  <p className="text-base font-semibold text-white">Enrollment failed</p>
                  <p className="text-sm text-red-400/90 break-words">{saveError}</p>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Tip: open the browser console (F12) for details. Common causes: Firestore rules, network, or
                    permissions.
                  </p>
                </div>
                <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 justify-center pt-2">
                  <Button variant="ghost" onClick={onComplete} className="text-slate-400 hover:text-white rounded-xl">
                    Cancel
                  </Button>
                  <Button onClick={handleRetrySave} className="bg-blue-600 hover:bg-blue-500 font-semibold rounded-xl">
                    Retry
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </FlowModalShell>

      {isBiometricOpen && step === 'enroll1' && phraseSelection && (
        <BiometricModal
          action={{
            type: 'enroll',
            user: { name: userName } as User,
            passPhrase: phraseSelection.phrase,
            passPhraseLanguage: phraseSelection.language,
            passPhraseLanguageCode: phraseSelection.languageCode,
            recordingLabel: 'Sample 1 of 2',
          }}
          onClose={onComplete}
          onSuccess={handleEnroll1Success}
          onFailure={handleEnrollFailure}
        />
      )}

      {isBiometricOpen && step === 'enroll2' && phraseSelection && (
        <BiometricModal
          action={{
            type: 'enroll',
            user: { name: userName } as User,
            passPhrase: phraseSelection.phrase,
            passPhraseLanguage: phraseSelection.language,
            passPhraseLanguageCode: phraseSelection.languageCode,
            recordingLabel: 'Sample 2 of 2',
          }}
          onClose={onComplete}
          onSuccess={handleEnroll2Success}
          onFailure={handleEnrollFailure}
        />
      )}
    </>
  );
};

export default EnrollmentFlow;
