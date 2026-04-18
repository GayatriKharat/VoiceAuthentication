import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  Lock,
  Globe,
  Loader2,
  AlertCircle,
  Mail,
  KeyRound,
  User as UserIcon,
  Eye,
  EyeOff,
  Phone,
  Hash,
  ArrowLeft,
} from 'lucide-react';
import { auth, googleProvider } from '../firebase';
import {
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  ConfirmationResult,
} from 'firebase/auth';

type Mode = 'signin' | 'signup' | 'phone';
type PhoneStep = 'enter-number' | 'enter-code';

const friendlyError = (code: string | undefined, fallback: string) => {
  switch (code) {
    case 'auth/invalid-email':
      return 'That email address looks invalid.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    case 'auth/user-not-found':
      return 'No account found with that email.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password.';
    case 'auth/email-already-in-use':
      return 'An account already exists with that email.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.';
    case 'auth/operation-not-allowed':
      return 'This sign-in method is not enabled for the Firebase project.';
    case 'auth/invalid-phone-number':
      return 'That phone number looks invalid. Include country code, e.g. +14155551234.';
    case 'auth/missing-phone-number':
      return 'Please enter a phone number.';
    case 'auth/quota-exceeded':
      return 'SMS quota exceeded for this project. Try again later.';
    case 'auth/invalid-verification-code':
      return 'That verification code is incorrect.';
    case 'auth/code-expired':
      return 'That code expired. Please request a new one.';
    case 'auth/captcha-check-failed':
      return 'reCAPTCHA failed. Reload the page and try again.';
    default:
      return fallback;
  }
};

interface AuthModalProps {
  /** Return to the marketing landing page (clears intro flag in parent). */
  onBackToIntro?: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ onBackToIntro }) => {
  const [mode, setMode] = useState<Mode>('signin');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  // Email/password state
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Phone/OTP state
  const [phoneStep, setPhoneStep] = useState<PhoneStep>('enter-number');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const recaptchaSlotRef = useRef<HTMLDivElement | null>(null);
  const confirmationResultRef = useRef<ConfirmationResult | null>(null);

  const teardownRecaptcha = () => {
    try {
      recaptchaVerifierRef.current?.clear();
    } catch {
      // ignore
    }
    recaptchaVerifierRef.current = null;

    if (recaptchaSlotRef.current && recaptchaSlotRef.current.parentNode) {
      recaptchaSlotRef.current.parentNode.removeChild(recaptchaSlotRef.current);
    }
    recaptchaSlotRef.current = null;

    if (recaptchaContainerRef.current) {
      recaptchaContainerRef.current.innerHTML = '';
    }
  };

  // Clean up reCAPTCHA when switching away from phone mode or unmounting
  useEffect(() => {
    if (mode !== 'phone') {
      teardownRecaptcha();
    }
    return () => {
      teardownRecaptcha();
    };
  }, [mode]);

  const ensureRecaptcha = (): RecaptchaVerifier => {
    if (recaptchaVerifierRef.current) return recaptchaVerifierRef.current;
    if (!recaptchaContainerRef.current) {
      throw new Error('reCAPTCHA container not ready.');
    }

    // Always start from a clean container — Firebase + StrictMode otherwise
    // throws "reCAPTCHA has already been rendered in this element".
    recaptchaContainerRef.current.innerHTML = '';

    // Mount the widget into a fresh child div so the next verifier we create
    // (after clear()) gets a brand-new DOM node instead of reusing one that
    // grecaptcha still considers "rendered into".
    const slot = document.createElement('div');
    recaptchaContainerRef.current.appendChild(slot);
    recaptchaSlotRef.current = slot;

    const verifier = new RecaptchaVerifier(auth, slot, {
      size: 'invisible',
      callback: () => {
        // solved – allow sending SMS
      },
      'expired-callback': () => {
        setError('reCAPTCHA expired. Please try again.');
      },
    });
    recaptchaVerifierRef.current = verifier;
    return verifier;
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    setError('');
    setInfo('');
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      if (
        err?.code !== 'auth/popup-closed-by-user' &&
        err?.code !== 'auth/cancelled-popup-request'
      ) {
        setError(friendlyError(err?.code, err?.message || 'Authentication failed.'));
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');

    if (!email.trim() || !password) {
      setError('Please enter both email and password.');
      return;
    }
    if (mode === 'signup' && password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);
    try {
      if (mode === 'signup') {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (displayName.trim()) {
          await updateProfile(cred.user, { displayName: displayName.trim() });
        }
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
    } catch (err: any) {
      setError(friendlyError(err?.code, err?.message || 'Authentication failed.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    setError('');
    setInfo('');
    if (!email.trim()) {
      setError('Enter your email above, then click "Forgot password?" again.');
      return;
    }
    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setInfo('Password reset email sent. Check your inbox.');
    } catch (err: any) {
      setError(friendlyError(err?.code, err?.message || 'Could not send reset email.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');

    const trimmed = phoneNumber.trim().replace(/\s+/g, '');
    if (!trimmed.startsWith('+') || trimmed.length < 8) {
      setError('Enter your phone number in international format, e.g. +14155551234.');
      return;
    }

    setIsLoading(true);
    try {
      const verifier = ensureRecaptcha();
      const confirmation = await signInWithPhoneNumber(auth, trimmed, verifier);
      confirmationResultRef.current = confirmation;
      setPhoneStep('enter-code');
      setInfo('Verification code sent via SMS.');
    } catch (err: any) {
      setError(friendlyError(err?.code, err?.message || 'Could not send code.'));
      teardownRecaptcha();
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');

    const code = otpCode.trim();
    if (code.length < 6) {
      setError('Enter the 6-digit code from the SMS.');
      return;
    }
    if (!confirmationResultRef.current) {
      setError('Session expired. Please request a new code.');
      setPhoneStep('enter-number');
      return;
    }

    setIsLoading(true);
    try {
      await confirmationResultRef.current.confirm(code);
      // onAuthStateChanged in App.tsx will handle state update
    } catch (err: any) {
      setError(friendlyError(err?.code, err?.message || 'Could not verify code.'));
    } finally {
      setIsLoading(false);
    }
  };

  const resetPhoneFlow = () => {
    setPhoneStep('enter-number');
    setOtpCode('');
    setError('');
    setInfo('');
    confirmationResultRef.current = null;
    teardownRecaptcha();
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setError('');
    setInfo('');
    if (next !== 'phone') resetPhoneFlow();
  };

  return (
    <div className="fixed inset-0 bg-[#020617] z-[200] flex items-center justify-center p-4 overflow-y-auto">
      {/* Ambient glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] bg-blue-900/5 rounded-full blur-[180px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
        className="w-full max-w-md bg-slate-900/60 backdrop-blur-2xl border border-slate-800 p-8 rounded-[2.5rem] shadow-2xl text-center space-y-6 relative z-10 my-8"
      >
        {onBackToIntro && (
          <button
            type="button"
            onClick={onBackToIntro}
            className="absolute top-4 left-4 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-500 hover:text-blue-400 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to intro
          </button>
        )}
        {/* Icon */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="mx-auto w-20 h-20 bg-blue-600/10 rounded-3xl flex items-center justify-center border border-blue-500/20 shadow-xl shadow-blue-900/20"
        >
          <ShieldCheck className="w-10 h-10 text-blue-500" />
        </motion.div>

        {/* Header */}
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-500/90">
            Step 2 · Sign in
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-white">Enterprise Access</h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            Secure Biometric Gateway with multi-language voice authentication.
            <br />
            {mode === 'signin' && 'Sign in to continue.'}
            {mode === 'signup' && 'Create an account to get started.'}
            {mode === 'phone' &&
              (phoneStep === 'enter-number'
                ? 'Receive a one-time code via SMS.'
                : 'Enter the code we texted you.')}
          </p>
        </div>

        {/* Mode tabs */}
        <div className="grid grid-cols-3 p-1 bg-slate-800/40 border border-slate-800 rounded-2xl text-[10px] font-bold uppercase tracking-widest">
          <button
            type="button"
            onClick={() => switchMode('signin')}
            className={`py-2 rounded-xl transition-all ${
              mode === 'signin'
                ? 'bg-slate-900 text-white shadow'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => switchMode('signup')}
            className={`py-2 rounded-xl transition-all ${
              mode === 'signup'
                ? 'bg-slate-900 text-white shadow'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Create
          </button>
          <button
            type="button"
            onClick={() => switchMode('phone')}
            className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1 ${
              mode === 'phone'
                ? 'bg-slate-900 text-white shadow'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Phone className="w-3 h-3" />
            OTP
          </button>
        </div>

        {/* Alerts */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3 text-red-400 text-sm text-left"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )}
          {info && !error && (
            <motion.div
              key="info"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-start gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-4 py-3 text-emerald-400 text-sm text-left"
            >
              <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{info}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Email / password form */}
        {(mode === 'signin' || mode === 'signup') && (
          <form onSubmit={handleEmailSubmit} className="space-y-3 text-left">
            {mode === 'signup' && (
              <label className="block">
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                  Display Name
                </span>
                <div className="mt-1.5 relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Jane Doe"
                    autoComplete="name"
                    className="w-full h-11 pl-10 pr-3 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 transition"
                  />
                </div>
              </label>
            )}

            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                Email
              </span>
              <div className="mt-1.5 relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  autoComplete="email"
                  required
                  className="w-full h-11 pl-10 pr-3 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 transition"
                />
              </div>
            </label>

            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                Password
              </span>
              <div className="mt-1.5 relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'signup' ? 'At least 6 characters' : '••••••••'}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  required
                  className="w-full h-11 pl-10 pr-10 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </label>

            {mode === 'signin' && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handlePasswordReset}
                  disabled={isLoading}
                  className="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-60 transition"
                >
                  Forgot password?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || isGoogleLoading}
              className="w-full h-12 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-blue-900/30"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{mode === 'signup' ? 'Creating account...' : 'Signing in...'}</span>
                </>
              ) : (
                <span>{mode === 'signup' ? 'Create Account' : 'Sign In'}</span>
              )}
            </button>
          </form>
        )}

        {/* Phone / OTP forms */}
        {mode === 'phone' && phoneStep === 'enter-number' && (
          <form onSubmit={handleSendOtp} className="space-y-3 text-left">
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                Phone Number
              </span>
              <div className="mt-1.5 relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+14155551234"
                  autoComplete="tel"
                  required
                  className="w-full h-11 pl-10 pr-3 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 transition"
                />
              </div>
              <p className="mt-1.5 text-[11px] text-slate-500">
                Use international format, including the country code (e.g. +91, +1).
              </p>
            </label>

            <button
              type="submit"
              disabled={isLoading || isGoogleLoading}
              className="w-full h-12 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-blue-900/30"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Sending code...</span>
                </>
              ) : (
                <span>Send Verification Code</span>
              )}
            </button>
          </form>
        )}

        {mode === 'phone' && phoneStep === 'enter-code' && (
          <form onSubmit={handleVerifyOtp} className="space-y-3 text-left">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={resetPhoneFlow}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition"
              >
                <ArrowLeft className="w-3 h-3" />
                Change number
              </button>
              <span className="text-[11px] text-slate-500 font-mono truncate max-w-[60%] text-right">
                {phoneNumber}
              </span>
            </div>

            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                6-Digit Code
              </span>
              <div className="mt-1.5 relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  autoComplete="one-time-code"
                  required
                  className="w-full h-11 pl-10 pr-3 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-100 placeholder:text-slate-600 tracking-[0.4em] text-center font-mono focus:outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 transition"
                />
              </div>
            </label>

            <button
              type="submit"
              disabled={isLoading || isGoogleLoading}
              className="w-full h-12 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-blue-900/30"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <span>Verify &amp; Sign In</span>
              )}
            </button>
          </form>
        )}

        {/* Invisible reCAPTCHA container – required for phone auth */}
        <div ref={recaptchaContainerRef} id="recaptcha-container" />

        {/* Divider */}
        <div className="flex items-center gap-4 text-slate-600 text-[10px] font-bold uppercase tracking-[0.2em] justify-center">
          <div className="h-px flex-1 bg-slate-800" />
          <span>Or</span>
          <div className="h-px flex-1 bg-slate-800" />
        </div>

        {/* Google button */}
        <button
          id="google-signin-btn"
          type="button"
          onClick={handleGoogleLogin}
          disabled={isLoading || isGoogleLoading}
          className="w-full h-12 bg-white hover:bg-slate-100 disabled:opacity-60 disabled:cursor-not-allowed text-slate-950 font-bold rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-lg"
        >
          {isGoogleLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin text-slate-600" />
              <span>Authenticating...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </>
          )}
        </button>

        <div className="text-[10px] text-slate-600 font-bold uppercase tracking-[0.2em]">
          Secured by Firebase Auth
        </div>

        {/* Security badges */}
        <div className="grid grid-cols-3 gap-4 pt-2">
          <div className="flex flex-col items-center gap-1.5 p-3 bg-slate-800/30 rounded-2xl border border-slate-800">
            <Lock className="w-4 h-4 text-blue-400" />
            <span className="text-[10px] text-slate-500 font-semibold">AES-256</span>
          </div>
          <div className="flex flex-col items-center gap-1.5 p-3 bg-slate-800/30 rounded-2xl border border-slate-800">
            <Globe className="w-4 h-4 text-blue-400" />
            <span className="text-[10px] text-slate-500 font-semibold">Global Sync</span>
          </div>
          <div className="flex flex-col items-center gap-1.5 p-3 bg-slate-800/30 rounded-2xl border border-slate-800">
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            <span className="text-[10px] text-slate-500 font-semibold">Biometrics</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AuthModal;
