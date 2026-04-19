import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  Loader2,
  AlertCircle,
  Mail,
  KeyRound,
  User as UserIcon,
  Eye,
  EyeOff,
  ArrowLeft,
} from 'lucide-react';
import { auth, googleProvider } from '../firebase';
import {
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth';

type Mode = 'signin' | 'signup';

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

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    setError('');
    setInfo('');
    try {
      sessionStorage.setItem('vas_last_auth_method', 'google');
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
        sessionStorage.setItem('vas_last_auth_method', 'email_password_signup');
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (displayName.trim()) {
          await updateProfile(cred.user, { displayName: displayName.trim() });
        }
      } else {
        sessionStorage.setItem('vas_last_auth_method', 'email_password');
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

  const switchMode = (next: Mode) => {
    setMode(next);
    setError('');
    setInfo('');
  };

  return (
    <div className="fixed inset-0 z-[200] overflow-y-auto overscroll-contain bg-[#020617]">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] bg-blue-900/5 rounded-full blur-[180px]" />
      </div>

      <div className="flex min-h-[100svh] w-full justify-center items-start sm:items-center px-2 py-2 sm:px-3 sm:py-4 box-border">
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
          className="w-full max-w-xl sm:max-w-2xl max-h-[calc(100svh-0.75rem)] sm:max-h-[min(calc(100vh-1.25rem),680px)] flex flex-col overflow-hidden bg-slate-900/70 backdrop-blur-2xl border border-slate-800 rounded-2xl shadow-2xl text-center relative z-10 sm:my-auto"
        >
          {onBackToIntro && (
            <button
              type="button"
              onClick={onBackToIntro}
              className="absolute top-2.5 left-2.5 z-20 flex items-center gap-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-slate-500 hover:text-blue-400 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>
          )}

          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 pt-10 pb-4 sm:px-8 sm:pt-9 sm:pb-5 space-y-3 text-left sm:text-center">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.05, duration: 0.35 }}
              className="mx-auto w-14 h-14 sm:w-16 sm:h-16 bg-blue-600/10 rounded-2xl flex items-center justify-center border border-blue-500/20 shadow-lg shadow-blue-900/20"
            >
              <ShieldCheck className="w-7 h-7 sm:w-8 sm:h-8 text-blue-500" />
            </motion.div>

            <div className="space-y-0.5 sm:space-y-1">
              <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-blue-500/90">
                Step 2 · Sign in
              </p>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">Enterprise Access</h1>
            </div>

            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-800/40 border border-slate-800 rounded-2xl text-[10px] sm:text-[11px] font-bold uppercase tracking-wide">
              <button
                type="button"
                onClick={() => switchMode('signin')}
                className={`py-2.5 rounded-xl transition-all ${
                  mode === 'signin'
                    ? 'bg-slate-900 text-white shadow'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => switchMode('signup')}
                className={`py-2.5 rounded-xl transition-all ${
                  mode === 'signup'
                    ? 'bg-slate-900 text-white shadow'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Register
              </button>
            </div>

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

            <div className="flex items-center gap-4 text-slate-600 text-[10px] font-bold uppercase tracking-[0.2em] justify-center">
              <div className="h-px flex-1 bg-slate-800" />
              <span>Or</span>
              <div className="h-px flex-1 bg-slate-800" />
            </div>

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
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AuthModal;
