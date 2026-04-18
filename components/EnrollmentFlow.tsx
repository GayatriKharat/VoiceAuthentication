import React, { useState } from 'react';
import { User } from '../types';
import BiometricModal from './BiometricModal';
import PhraseSelector, { PhraseSelection } from './PhraseSelector';
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
  const [saveProgress, setSaveProgress] = useState<string>('Averaging voice samples and synchronising to global registry...');
  const [saveError, setSaveError] = useState<string | null>(null);

  const steps: Step[] = ['name', 'phrase', 'enroll1', 'enroll2', 'saving'];
  const currentStepIdx = steps.indexOf(step);

  // ---------------------------------------------------------------
  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim()) return;
    addLog(`Initialising enrollment for: ${userName.trim()}`, 'info');
    setStep('phrase');
  };

  const handlePhraseConfirm = (selection: PhraseSelection) => {
    setPhraseSelection(selection);
    addLog(
      `Passphrase set in ${selection.language}: "${selection.phrase.slice(0, 30)}..."`,
      'info'
    );
    setStep('enroll1');
    setIsBiometricOpen(true);
  };

  // First voice sample captured
  const handleEnroll1Success = (result: Float32Array) => {
    setIsBiometricOpen(false);
    setVoiceprint1(result);
    toast.success('Voice sample 1 captured! Please record once more.');
    addLog('Voice sample 1 captured successfully.', 'info');
    setStep('enroll2');
    // Small delay so user sees the feedback
    setTimeout(() => setIsBiometricOpen(true), 800);
  };

  // Second voice sample captured — average and save
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

      // Guard against the write hanging forever (bad network / security rule stall)
      const writePromise = setDoc(doc(db, 'users', auth.currentUser.uid), newUser);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Firestore write timed out after 20s. Check your network and Firestore rules.')), 20000)
      );
      await Promise.race([writePromise, timeoutPromise]);

      toast.success('Biometric profile enrolled and synchronised globally!');
      addLog(
        `User ${newUser.name} enrolled with ${phraseSelection.language} passphrase from ${newUser.location}.`,
        'success'
      );
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
    // Re-trigger second sample since that's where the key+save happens
    setSaveError(null);
    setStep('enroll2');
    setTimeout(() => setIsBiometricOpen(true), 300);
  };

  const handleEnrollFailure = (reason: string) => {
    setIsBiometricOpen(false);
    toast.error(`Enrollment failed: ${reason}`);
    addLog(`Voice enrollment failed: ${reason}`, 'error');
    // Allow retry
    if (step === 'enroll1') {
      setIsBiometricOpen(true); // reopen for retry
    } else {
      setStep('enroll1'); // go back to first sample
      setTimeout(() => setIsBiometricOpen(true), 400);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <Card className="w-full max-w-lg bg-slate-900 border-slate-800 shadow-2xl relative rounded-[2.5rem] overflow-hidden">
        <Button
          variant="ghost"
          size="icon"
          onClick={onComplete}
          className="absolute top-6 right-6 text-slate-500 hover:text-white"
        >
          <X className="h-5 w-5" />
        </Button>

        <CardHeader className="pt-10 text-center space-y-4">
          <div className="mx-auto p-4 bg-blue-600/10 rounded-2xl border border-blue-500/20 w-fit">
            <UserPlus className="h-8 w-8 text-blue-500" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold tracking-tight text-white">
              Biometric Enrollment
            </CardTitle>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">
              Secure Node Provisioning
            </p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 pt-2">
            {(['name', 'phrase', 'enroll1', 'enroll2'] as Step[]).map((s, i) => (
              <React.Fragment key={s}>
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${
                      i < currentStepIdx
                        ? 'bg-emerald-500 text-white'
                        : i === currentStepIdx
                        ? 'bg-blue-600 text-white ring-2 ring-blue-500/30'
                        : 'bg-slate-800 text-slate-600'
                    }`}
                  >
                    {i < currentStepIdx ? '✓' : i + 1}
                  </div>
                  <span className="text-[8px] text-slate-600 uppercase tracking-widest">
                    {STEP_LABELS[s]}
                  </span>
                </div>
                {i < 3 && <div className={`flex-1 h-px max-w-[2rem] ${i < currentStepIdx ? 'bg-emerald-500/40' : 'bg-slate-800'}`} />}
              </React.Fragment>
            ))}
          </div>
        </CardHeader>

        <CardContent className="pb-10 px-10">
          <AnimatePresence mode="wait">
            {/* Step 1: Name */}
            {step === 'name' && (
              <motion.div
                key="name"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <form onSubmit={handleNameSubmit} className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">
                      Legal Identity Name
                    </label>
                    <Input
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder="e.g. Priya Sharma"
                      className="bg-slate-800/50 border-slate-700 h-14 text-lg rounded-2xl focus:ring-blue-500/20"
                      autoFocus
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={!userName.trim()}
                    className="w-full h-14 bg-blue-600 hover:bg-blue-500 font-bold text-lg rounded-2xl shadow-lg shadow-blue-900/20"
                  >
                    Next: Choose Passphrase
                  </Button>
                </form>
              </motion.div>
            )}

            {/* Step 2: Phrase */}
            {step === 'phrase' && (
              <motion.div
                key="phrase"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-slate-400 text-xs">
                    <Languages className="w-4 h-4 text-blue-400" />
                    <span>Choose a phrase in any language. You must say this exact phrase each time you authenticate.</span>
                  </div>
                  <PhraseSelector onConfirm={handlePhraseConfirm} />
                </div>
              </motion.div>
            )}

            {/* Step 3/4: Recording spinner */}
            {(step === 'enroll1' || step === 'enroll2') && !isBiometricOpen && (
              <motion.div
                key={step}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12 space-y-6"
              >
                <div className="relative w-20 h-20 mx-auto">
                  <div className="absolute inset-0 border-4 border-blue-500/10 rounded-full" />
                  <div className="absolute inset-0 border-t-4 border-blue-500 rounded-full animate-spin" />
                  <Mic className="absolute inset-0 m-auto h-8 w-8 text-blue-500" />
                </div>
                <div className="space-y-2">
                  <p className="text-lg font-bold text-white">
                    {step === 'enroll1' ? 'Preparing First Recording...' : 'Almost Done! One More Recording'}
                  </p>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    {step === 'enroll2'
                      ? 'Two samples create a more reliable voice model.'
                      : 'The secure capture modal will open shortly.'}
                  </p>
                </div>
              </motion.div>
            )}

            {/* Step saving */}
            {step === 'saving' && (
              <motion.div
                key="saving"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12 space-y-6"
              >
                <div className="relative w-20 h-20 mx-auto">
                  <div className="absolute inset-0 border-4 border-emerald-500/10 rounded-full" />
                  <div className="absolute inset-0 border-t-4 border-emerald-500 rounded-full animate-spin" />
                  <ShieldCheck className="absolute inset-0 m-auto h-8 w-8 text-emerald-500" />
                </div>
                <div className="space-y-2">
                  <p className="text-lg font-bold text-white">Synthesising Biometric Profile</p>
                  <p className="text-sm text-slate-500">{saveProgress}</p>
                </div>
              </motion.div>
            )}

            {/* Error state */}
            {step === 'error' && (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8 space-y-6"
              >
                <div className="mx-auto p-4 bg-red-500/10 rounded-2xl border border-red-500/20 w-fit">
                  <AlertTriangle className="h-8 w-8 text-red-400" />
                </div>
                <div className="space-y-2">
                  <p className="text-lg font-bold text-white">Enrollment Failed</p>
                  <p className="text-sm text-red-400/80 break-words px-4">{saveError}</p>
                  <p className="text-[11px] text-slate-500 mt-4">
                    Tip: open the browser console (F12) for the full error.
                    Common causes: network issue, Firestore rules, or the new account's email not yet verified.
                  </p>
                </div>
                <div className="flex gap-3 justify-center pt-2">
                  <Button
                    onClick={handleRetrySave}
                    className="bg-blue-600 hover:bg-blue-500 font-bold rounded-xl px-6"
                  >
                    Retry Recording
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={onComplete}
                    className="text-slate-400 hover:text-white font-bold rounded-xl px-6"
                  >
                    Cancel
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Biometric capture modals */}
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
    </div>
  );
};

export default EnrollmentFlow;
