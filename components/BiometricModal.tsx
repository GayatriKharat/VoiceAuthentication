import React, { useState, useEffect, useRef } from 'react';
import { AuthAction, User } from '../types';
import {
  generateVoiceprint,
  getVoiceSimilarityScore,
  SIMILARITY_THRESHOLD,
  VoiceProcessingError,
  getAudioContext,
} from '../utils/audioProcessor';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldCheck, Mic, Loader2, AlertCircle, Globe, CheckCircle2 } from 'lucide-react';

interface BiometricModalProps {
  action: AuthAction;
  onClose: () => void;
  onSuccess: (result?: any) => void;
  onFailure: (reason: string) => void;
}

const RECORDING_DURATION_MS = 6000;

// ---------------------------------------------------------------
// Speech Recognition helpers
// ---------------------------------------------------------------
const SpeechRecognitionAPI =
  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
const hasSpeechRecognition = !!SpeechRecognitionAPI;

/** Normalise text for phrase comparison: lowercase, strip most punctuation */
const normaliseText = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();

/** Word-overlap score between spoken and required phrase. Returns 0–1. */
const phraseMatchScore = (spoken: string, required: string): number => {
  const spokenNorm = normaliseText(spoken);
  const requiredNorm = normaliseText(required);
  if (!spokenNorm || !requiredNorm) return 0;
  if (spokenNorm === requiredNorm) return 1;
  const reqWords = requiredNorm.split(' ');
  const spkWords = new Set(spokenNorm.split(' '));
  let matches = 0;
  for (const w of reqWords) {
    if (spkWords.has(w)) matches++;
  }
  return matches / reqWords.length;
};

const PHRASE_MATCH_THRESHOLD = 0.55; // 55% of words must match (generous for ASR errors)

// ---------------------------------------------------------------
// Derive required phrase from action
// ---------------------------------------------------------------
const getRequiredPhrase = (action: AuthAction): string => {
  if (action.type === 'enroll') return action.passPhrase;
  return action.user.passPhrase || 'My voice is my passport, verify me';
};

const getLanguageCode = (action: AuthAction): string => {
  if (action.type === 'enroll') return action.passPhraseLanguageCode;
  return action.user.passPhraseLanguageCode || 'en-US';
};

const getLanguageName = (action: AuthAction): string => {
  if (action.type === 'enroll') return action.passPhraseLanguage;
  return action.user.passPhraseLanguage || 'English';
};

const isRtl = (langCode: string): boolean =>
  ['ar-SA', 'ur-PK', 'he-IL', 'fa-IR'].includes(langCode);

// ---------------------------------------------------------------
// Component
// ---------------------------------------------------------------
const BiometricModal: React.FC<BiometricModalProps> = ({ action, onClose, onSuccess, onFailure }) => {
  const [status, setStatus] = useState<'idle' | 'recording' | 'processing' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [countdown, setCountdown] = useState(RECORDING_DURATION_MS / 1000);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [phraseVerified, setPhraseVerified] = useState<boolean | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef<string>('');

  const requiredPhrase = getRequiredPhrase(action);
  const langCode = getLanguageCode(action);
  const langName = getLanguageName(action);
  const rtl = isRtl(langCode);
  const title = action.type === 'enroll'
    ? (action.recordingLabel ? `Voice Enrollment — ${action.recordingLabel}` : 'Voice Enrollment')
    : 'Biometric Security Check';

  const clearTimers = () => {
    if (recordingTimerRef.current) clearTimeout(recordingTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
  };

  const stopRecognition = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
    }
  };

  const startRecording = async () => {
    if (status !== 'idle') return;
    setErrorMessage('');
    setLiveTranscript('');
    setPhraseVerified(null);
    transcriptRef.current = '';
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      await getAudioContext();

      // --- MediaRecorder setup ---
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
      mediaRecorderRef.current = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        setStatus('processing');
        stopRecognition();
        stream.getTracks().forEach((t) => t.stop());

        if (audioChunksRef.current.length === 0) {
          setErrorMessage('No audio data captured. Check your microphone.');
          setStatus('error');
          return;
        }

        // --- Phrase verification (if SpeechRecognition available) ---
        if (hasSpeechRecognition && action.type !== 'enroll') {
          const transcript = transcriptRef.current.trim();
          if (transcript) {
            const score = phraseMatchScore(transcript, requiredPhrase);
            if (score < PHRASE_MATCH_THRESHOLD) {
              const confidence = (score * 100).toFixed(0);
              setErrorMessage(
                `Wrong phrase detected (${confidence}% match). Please say exactly: "${requiredPhrase}"`
              );
              setStatus('error');
              return;
            }
            setPhraseVerified(true);
          }
        }

        try {
          const audioBlob = new Blob(audioChunksRef.current, {
            type: mediaRecorderRef.current?.mimeType || 'audio/webm',
          });
          const currentVoiceprint = await generateVoiceprint(audioBlob);

          if (action.type === 'enroll') {
            onSuccess(currentVoiceprint);
          } else if (action.type === 'verify') {
            const storedVp = action.user.voiceprint
              ? new Float32Array(action.user.voiceprint)
              : null;
            if (!storedVp) {
              onFailure('No voiceprint on file for this user.');
              return;
            }
            const score = getVoiceSimilarityScore(currentVoiceprint, storedVp);
            if (score >= SIMILARITY_THRESHOLD) {
              onSuccess({ user: action.user, voiceprint: currentVoiceprint });
            } else {
              const confidence = score > 0 ? (score * 100).toFixed(1) : '0';
              onFailure(`Voice not recognised (${confidence}% match). Access denied.`);
            }
          } else if (action.type === 'identify') {
            // 'identify' used in legacy paths — search enrolled users
            const usersToSearch = 'users' in action ? (action as any).users as User[] : [action.user];
            let bestMatch: User | null = null;
            let maxScore = -1;
            for (const user of usersToSearch) {
              if (user.voiceprint) {
                const storedVp = new Float32Array(user.voiceprint);
                const score = getVoiceSimilarityScore(currentVoiceprint, storedVp);
                if (score > maxScore) { maxScore = score; bestMatch = user; }
              }
            }
            if (bestMatch && maxScore >= SIMILARITY_THRESHOLD) {
              onSuccess({ user: bestMatch, voiceprint: currentVoiceprint });
            } else {
              const confidence = maxScore > 0 ? (maxScore * 100).toFixed(1) : '0';
              onFailure(`Biometric identity rejected (${confidence}% match). Access denied.`);
            }
          }
        } catch (err) {
          setErrorMessage(
            err instanceof VoiceProcessingError
              ? err.message
              : 'Internal analysis failed. Please try again.'
          );
          setStatus('error');
        }
      };

      // --- SpeechRecognition setup (simultaneously with MediaRecorder) ---
      if (hasSpeechRecognition) {
        const recognition = new SpeechRecognitionAPI();
        recognition.lang = langCode;
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        recognition.onresult = (event: any) => {
          let fullTranscript = '';
          for (let i = 0; i < event.results.length; i++) {
            fullTranscript += event.results[i][0].transcript;
          }
          transcriptRef.current = fullTranscript;
          setLiveTranscript(fullTranscript);
        };

        recognition.onerror = () => {
          // Non-fatal — voice biometric still proceeds
        };

        recognitionRef.current = recognition;
        try { recognition.start(); } catch { /* ignore if already started */ }
      }

      // --- Start recording ---
      mediaRecorderRef.current.start();
      setStatus('recording');
      setCountdown(RECORDING_DURATION_MS / 1000);

      countdownIntervalRef.current = window.setInterval(
        () => setCountdown((p) => (p > 1 ? p - 1 : 0)),
        1000
      );
      recordingTimerRef.current = window.setTimeout(() => stopRecording(), RECORDING_DURATION_MS);
    } catch (err: any) {
      console.error('Biometric access error:', err);
      setErrorMessage('Microphone access denied. Check your browser permissions.');
      setStatus('error');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    clearTimers();
  };

  useEffect(() => {
    return () => {
      clearTimers();
      stopRecognition();
      mediaRecorderRef.current?.stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Waveform bars for visual feedback
  const waveformBars = Array.from({ length: 9 });

  return (
    <div className="fixed inset-0 bg-slate-950/90 z-[250] flex items-center justify-center p-4 backdrop-blur-xl">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-2xl w-full max-w-lg p-10 relative overflow-hidden"
      >
        {/* Ambient glow */}
        <div
          className={`absolute inset-0 transition-all duration-700 pointer-events-none rounded-[2.5rem] ${
            status === 'recording'
              ? 'bg-red-600/5 shadow-[inset_0_0_60px_rgba(239,68,68,0.07)]'
              : 'bg-transparent'
          }`}
        />

        <button
          onClick={onClose}
          className="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors z-10"
        >
          <X className="h-6 w-6" />
        </button>

        <div className="space-y-8 text-center relative">
          {/* Header */}
          <div className="space-y-2">
            <div className="mx-auto w-16 h-16 bg-blue-600/10 rounded-2xl flex items-center justify-center border border-blue-500/20 mb-4">
              <ShieldCheck className="w-8 h-8 text-blue-500" />
            </div>
            <h2 className="text-xl font-bold text-white uppercase tracking-widest">{title}</h2>
            <p className="text-slate-500 text-xs font-bold tracking-widest uppercase">
              Biometric Matrix Verification
              {hasSpeechRecognition && action.type !== 'enroll' && ' + Phrase Check'}
            </p>
          </div>

          {/* Required Phrase Box */}
          <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700/50 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold text-blue-400 uppercase tracking-[0.2em]">
                Required Phrase:
              </p>
              {langName && (
                <span className="flex items-center gap-1 text-[10px] text-slate-500 font-semibold">
                  <Globe className="w-3 h-3" />
                  {langName}
                </span>
              )}
            </div>
            <h3
              className="text-lg font-medium text-white italic leading-snug"
              dir={rtl ? 'rtl' : 'ltr'}
            >
              "{requiredPhrase}"
            </h3>
          </div>

          {/* Live transcript */}
          <AnimatePresence>
            {status === 'recording' && hasSpeechRecognition && action.type !== 'enroll' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-slate-800/30 border border-slate-700/30 rounded-2xl px-4 py-3 text-left"
              >
                <p className="text-[10px] text-slate-600 uppercase font-bold tracking-widest mb-1">
                  Live Transcript:
                </p>
                <p className="text-sm text-slate-300 italic min-h-[1.25rem]" dir={rtl ? 'rtl' : 'ltr'}>
                  {liveTranscript || (
                    <span className="text-slate-600">Start speaking...</span>
                  )}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Mic Button + Waveform */}
          <div className="flex flex-col items-center justify-center space-y-5">
            <div className="relative">
              {/* Animated waveform rings when recording */}
              {status === 'recording' && (
                <>
                  <div className="absolute inset-0 border-4 border-red-500/20 rounded-full animate-ping" />
                  <div className="absolute -inset-3 border border-red-500/10 rounded-full animate-pulse" />
                </>
              )}
              <button
                onClick={startRecording}
                disabled={status !== 'idle'}
                className={`w-28 h-28 rounded-full flex items-center justify-center transition-all duration-500 relative shadow-2xl ${
                  status === 'idle'
                    ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/40 hover:scale-105'
                    : status === 'recording'
                    ? 'bg-red-600 shadow-red-900/40'
                    : 'bg-slate-800 opacity-50'
                }`}
              >
                {status === 'recording' ? (
                  <div className="flex flex-col items-center gap-1">
                    {/* Mini waveform */}
                    <div className="flex items-end gap-0.5 h-8">
                      {waveformBars.map((_, i) => (
                        <div
                          key={i}
                          className="w-1.5 bg-white/80 rounded-full"
                          style={{
                            height: `${20 + Math.sin(Date.now() / 200 + i) * 10}px`,
                            animation: `waveBar ${0.4 + i * 0.07}s ease-in-out infinite alternate`,
                          }}
                        />
                      ))}
                    </div>
                    <span className="text-white font-bold text-sm">{countdown}s</span>
                  </div>
                ) : status === 'processing' ? (
                  <Loader2 className="h-10 w-10 text-white animate-spin" />
                ) : (
                  <Mic className="h-10 w-10 text-white" />
                )}
              </button>
            </div>

            {/* Status text */}
            <div className="h-8 flex items-center justify-center">
              <AnimatePresence mode="wait">
                {status === 'recording' && (
                  <motion.div
                    key="recording"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="flex items-center gap-2 text-red-400 text-xs font-bold uppercase tracking-widest"
                  >
                    <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
                    System Listening...
                  </motion.div>
                )}
                {status === 'processing' && (
                  <motion.div
                    key="processing"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="text-blue-400 text-xs font-bold uppercase tracking-widest"
                  >
                    Analysing Biometric Matrix...
                  </motion.div>
                )}
                {status === 'error' && (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="flex items-center gap-2 text-red-400 text-xs font-bold max-w-xs text-center leading-relaxed italic"
                  >
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {errorMessage}
                  </motion.div>
                )}
                {status === 'idle' && !phraseVerified && (
                  <motion.p
                    key="idle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-slate-500 text-xs font-medium"
                  >
                    Click the microphone to start capture
                  </motion.p>
                )}
                {phraseVerified && status !== 'recording' && status !== 'processing' && (
                  <motion.div
                    key="verified"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Phrase verified
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Speech recognition notice */}
          {!hasSpeechRecognition && action.type !== 'enroll' && (
            <p className="text-[10px] text-slate-600 text-center">
              ℹ️ Voice-only mode — phrase content verification unavailable in this browser.
            </p>
          )}

          {/* Retry button */}
          {status === 'error' && (
            <button
              onClick={() => { setStatus('idle'); setLiveTranscript(''); transcriptRef.current = ''; }}
              className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all"
            >
              Retry
            </button>
          )}
        </div>
      </motion.div>

      {/* Waveform keyframes */}
      <style>{`
        @keyframes waveBar {
          from { transform: scaleY(0.5); }
          to { transform: scaleY(1.2); }
        }
      `}</style>
    </div>
  );
};

export default BiometricModal;
