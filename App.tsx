
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, FileHistoryEntry, LogMessage, LoginHistoryEntry } from './types';
import Header from './components/Header';
import UserPanel from './components/UserPanel';
import FileActions from './components/FileActions';
import SystemLog from './components/SystemLog';
import FileHistoryPanel from './components/FileHistoryPanel';
import EnrollmentFlow from './components/EnrollmentFlow';
import EncryptionFlow from './components/EncryptionFlow';
import DecryptionFlow from './components/DecryptionFlow';
import AuthModal from './components/AuthModal';
import LoginHistoryPanel from './components/LoginHistoryPanel';
import AccountPanel from './components/AccountPanel';
import LandingPage from './components/LandingPage';
import DashboardHero from './components/DashboardHero';
import SecurityActivityPanel from './components/SecurityActivityPanel';
import { Toaster, toast } from 'sonner';
import { auth, db, handleFirestoreError, OperationType, requestLoginDigestEmail } from './firebase';
import {
  onAuthStateChanged,
  signOut,
  isSignInWithEmailLink,
  signInWithEmailLink,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  limit,
  addDoc,
  serverTimestamp,
  doc,
  deleteDoc,
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { getLocationInfo } from './utils/locationService';
import { recordSecurityEvent } from './utils/securityAudit';

const MAX_USERS = 50;

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [fileHistory, setFileHistory] = useState<FileHistoryEntry[]>([]);
  const [logMessages, setLogMessages] = useState<LogMessage[]>([]);
  const [loginSessions, setLoginSessions] = useState<LoginHistoryEntry[]>([]);
  const [activeFlow, setActiveFlow] = useState<'enroll' | 'encrypt' | 'decrypt' | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [showLanding, setShowLanding] = useState(
    () => localStorage.getItem('vas_seen_intro') !== '1'
  );
  const [showSecurityFeed, setShowSecurityFeed] = useState(false);

  // Prevent duplicate login session logging per browser tab
  const sessionLoggedRef = useRef(false);
  const emailLinkHandledRef = useRef(false);

  // ---------------------------------------------------------------
  // Email magic link completion (passwordless) — same tab as send
  // ---------------------------------------------------------------
  useEffect(() => {
    if (typeof window === 'undefined' || emailLinkHandledRef.current) return;
    const href = window.location.href;
    if (!isSignInWithEmailLink(auth, href)) return;

    emailLinkHandledRef.current = true;
    const email = localStorage.getItem('emailForSignIn');
    if (!email) {
      console.warn('Email link sign-in: missing emailForSignIn');
      emailLinkHandledRef.current = false;
      return;
    }

    (async () => {
      try {
        sessionStorage.setItem('vas_last_auth_method', 'email_magic_link');
        await signInWithEmailLink(auth, email, href);
        localStorage.removeItem('emailForSignIn');
        window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
      } catch (e) {
        console.error('Email link sign-in failed:', e);
        emailLinkHandledRef.current = false;
        toast.error('Sign-in link invalid or expired. Request a new one.');
      }
    })();
  }, []);

  // ---------------------------------------------------------------
  // Auth Listener
  // ---------------------------------------------------------------
  useEffect(() => {
    // Safety net: some browser/privacy setups can delay Firebase auth init.
    // Never let the app stay on a blank loading screen forever.
    const authReadyFallback = setTimeout(() => {
      setIsAuthReady((prev) => {
        if (!prev) {
          console.warn('Auth init timeout reached; continuing in signed-out mode.');
          return true;
        }
        return prev;
      });
    }, 4000);

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsAuthReady(true);
      if (!user) {
        // Reset session flag on logout so next login gets logged
        sessionLoggedRef.current = false;
        sessionStorage.removeItem('vas_session_uid');
      }
    });
    return () => {
      clearTimeout(authReadyFallback);
      unsubscribe();
    };
  }, []);

  // ---------------------------------------------------------------
  // Log login session with location (once per browser tab per user)
  // ---------------------------------------------------------------
  useEffect(() => {
    if (!currentUser || sessionLoggedRef.current) return;

    // Check if this tab already logged this user's session
    if (sessionStorage.getItem('vas_session_uid') === currentUser.uid) {
      sessionLoggedRef.current = true;
      return;
    }

    sessionLoggedRef.current = true;

    const logSession = async () => {
      try {
        const location = await getLocationInfo();
        await addDoc(collection(db, `login_history/${currentUser.uid}/sessions`), {
          userUid: currentUser.uid,
          userName: currentUser.displayName || 'Unknown',
          userEmail: currentUser.email || '',
          timestamp: new Date().toISOString(),
          city: location.city,
          region: location.region,
          country: location.country,
          timezone: location.timezone,
          lat: location.lat,
          lon: location.lon,
          displayName: location.displayName,
        });
        sessionStorage.setItem('vas_session_uid', currentUser.uid);

        const method = sessionStorage.getItem('vas_last_auth_method') ?? 'unknown';
        sessionStorage.removeItem('vas_last_auth_method');
        await recordSecurityEvent(
          db,
          currentUser,
          'LOGIN_SUCCESS',
          `Signed in successfully (${method.replace(/_/g, ' ')}). ${location.city ? `Approx. location: ${location.city}.` : ''}`,
          { method, timezone: location.timezone ?? '' }
        );
        await requestLoginDigestEmail();
      } catch (error) {
        console.warn('Could not log session location:', error);
      }
    };

    logSession();
  }, [currentUser]);

  // ---------------------------------------------------------------
  // Firestore Real-time Listeners
  // ---------------------------------------------------------------
  useEffect(() => {
    if (!isAuthReady || !currentUser) return;

    // Users listener
    const usersUnsub = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const usersData = snapshot.docs.map((d) => ({ ...d.data() } as User));
        setUsers(usersData);
        const myProfile = usersData.find((u) => u.uid === currentUser.uid);
        setUserProfile(myProfile || null);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'users')
    );

    // File history listener
    const historyQ = query(
      collection(db, 'file_history'),
      orderBy('timestamp', 'desc'),
      limit(50)
    );
    const historyUnsub = onSnapshot(
      historyQ,
      (snapshot) => {
        const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as FileHistoryEntry));
        setFileHistory(data);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'file_history')
    );

    // System logs listener
    const logsQ = query(
      collection(db, 'system_logs'),
      orderBy('timestamp', 'desc'),
      limit(50)
    );
    const logsUnsub = onSnapshot(
      logsQ,
      (snapshot) => {
        const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as LogMessage));
        setLogMessages(data);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'system_logs')
    );

    // Login sessions listener (current user only)
    const sessionsQ = query(
      collection(db, `login_history/${currentUser.uid}/sessions`),
      orderBy('timestamp', 'desc'),
      limit(10)
    );
    const sessionsUnsub = onSnapshot(
      sessionsQ,
      (snapshot) => {
        const data = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        } as LoginHistoryEntry));
        setLoginSessions(data);
      },
      (error) => console.warn('Login sessions listener error:', error)
    );

    return () => {
      usersUnsub();
      historyUnsub();
      logsUnsub();
      sessionsUnsub();
    };
  }, [isAuthReady, currentUser]);

  // ---------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------
  const addLog = useCallback(
    async (text: string, type: LogMessage['type']) => {
      if (!currentUser) return;
      try {
        await addDoc(collection(db, 'system_logs'), {
          text,
          type,
          timestamp: new Date().toISOString(),
          userUid: currentUser.uid,
          userName: currentUser.displayName || 'System',
          location: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
      } catch (error) {
        console.error('Failed to add log:', error);
      }
    },
    [currentUser]
  );

  const addFileHistoryEntry = useCallback(
    async (entry: Omit<FileHistoryEntry, 'id' | 'timestamp'>) => {
      try {
        await addDoc(collection(db, 'file_history'), {
          ...entry,
          timestamp: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'file_history');
      }
    },
    []
  );

  const handleDeleteUser = async (userUid: string) => {
    if (!currentUser) return;

    const isSelf = userUid === currentUser.uid;
    const isAdmin = userProfile?.role === 'admin';

    if (!isSelf && !isAdmin) {
      toast.error('Administrative privileges required to delete other users.');
      return;
    }

    const target = users.find((u) => u.uid === userUid);
    const targetName = target?.name || target?.email || 'this user';

    const performDelete = async () => {
      try {
        if (isSelf && currentUser) {
          await recordSecurityEvent(
            db,
            currentUser,
            'ACCOUNT_DELETE_SELF',
            'User removed their enrollment from the workspace.',
            {}
          );
        }
        await deleteDoc(doc(db, 'users', userUid));
        addLog(
          isSelf
            ? `User ${targetName} deleted their own enrollment.`
            : `User profile ${targetName} decommissioned by administrator.`,
          'warning'
        );
        toast.success(
          isSelf
            ? 'Your enrollment has been deleted. Signing you out…'
            : `Deleted ${targetName}.`
        );
        if (isSelf) {
          setTimeout(() => {
            signOut(auth).catch(() => {});
          }, 800);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `users/${userUid}`);
      }
    };

    toast.warning(
      isSelf
        ? 'Delete your voice enrollment? You will be signed out and can re-enroll later.'
        : `Delete ${targetName}? This removes their voiceprint permanently.`,
      {
        duration: 10000,
        action: {
          label: 'Delete',
          onClick: performDelete,
        },
        cancel: {
          label: 'Cancel',
          onClick: () => {},
        },
      }
    );
  };

  // ---------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------
  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
          <p className="text-slate-500 font-mono text-xs uppercase tracking-widest">
            Initialising Secure Environment...
          </p>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------
  // Landing + Auth gate
  // ---------------------------------------------------------------
  if (!currentUser) {
    if (showLanding) {
      return (
        <>
          <LandingPage
            onLaunch={() => {
              localStorage.setItem('vas_seen_intro', '1');
              setShowLanding(false);
            }}
          />
          <Toaster position="bottom-right" theme="dark" closeButton />
        </>
      );
    }
    return (
      <AuthModal
        onBackToIntro={() => {
          localStorage.removeItem('vas_seen_intro');
          setShowLanding(true);
        }}
      />
    );
  }

  const handleLogout = async () => {
    const u = auth.currentUser;
    if (u) {
      await recordSecurityEvent(db, u, 'LOGOUT', 'User signed out from this browser.', {});
    }
    await signOut(auth);
  };

  const regionLabel =
    loginSessions[0]?.city && loginSessions[0].city !== 'Unknown'
      ? loginSessions[0].city
      : loginSessions[0]?.timezone?.split('/')[1]?.replace(/_/g, ' ') || '—';

  // ---------------------------------------------------------------
  // Main UI
  // ---------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans selection:bg-blue-500/30 relative overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-blue-600/15 blur-3xl" />
        <div className="absolute top-1/2 -left-32 h-96 w-96 rounded-full bg-indigo-600/10 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-64 w-64 rounded-full bg-cyan-500/5 blur-3xl" />
      </div>

      <Header user={currentUser} onLogout={handleLogout} />

      <main className="relative container mx-auto max-w-7xl px-4 md:px-8 py-6 md:py-9 space-y-8">
        <DashboardHero
          displayName={currentUser.displayName}
          teamCount={users.length}
          regionLabel={regionLabel}
        />

        {/* Primary actions */}
        <section className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-white tracking-tight">What do you want to do?</h3>
            <p className="text-sm text-slate-500 mt-1">Pick a step — you can come back to this hub anytime.</p>
          </div>
          <FileActions
            onStartEnrollment={() => setActiveFlow('enroll')}
            onStartEncryption={() => setActiveFlow('encrypt')}
            onStartDecryption={() => setActiveFlow('decrypt')}
          />
        </section>

        {/* Account + team */}
        <section className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-white tracking-tight">Account & team</h3>
            <p className="text-sm text-slate-500 mt-1">Your profile and enrolled people in this workspace.</p>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
            <div className="xl:col-span-4 min-w-0">
              <AccountPanel
                currentUser={currentUser}
                userProfile={userProfile}
                onDeleteMyAccount={() => handleDeleteUser(currentUser.uid)}
                onLogout={handleLogout}
              />
            </div>
            <div className="xl:col-span-8 min-w-0">
              <UserPanel
                users={users}
                onDeleteUser={handleDeleteUser}
                maxUsers={MAX_USERS}
                currentUserRole={userProfile?.role}
                currentUserUid={currentUser.uid}
              />
            </div>
          </div>
        </section>

        {/* Sign-ins */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start max-w-6xl">
          <LoginHistoryPanel sessions={loginSessions} />
          <SecurityActivityPanel userUid={currentUser.uid} />
        </section>

        {/* Optional audit */}
        <section className="space-y-4 pt-4 border-t border-slate-800/50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-white tracking-tight">Audit & console</h3>
              <p className="text-sm text-slate-500 mt-1">File events and system log — hidden by default.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowSecurityFeed((s) => !s)}
              className="shrink-0 px-4 py-2 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-sm font-medium border border-slate-700/80 transition-colors"
            >
              {showSecurityFeed ? 'Hide' : 'Show'}
            </button>
          </div>
          <AnimatePresence>
            {showSecurityFeed && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
                  <FileHistoryPanel history={fileHistory} />
                  <SystemLog messages={logMessages} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </main>

      {/* Flows */}
      <AnimatePresence>
        {activeFlow === 'enroll' && (
          <EnrollmentFlow
            currentUser={currentUser}
            onComplete={() => setActiveFlow(null)}
            onUserEnrolled={() => {}}
            addLog={addLog}
          />
        )}
        {activeFlow === 'encrypt' && (
          <EncryptionFlow
            users={users.filter((u) => u.isEnrolled)}
            currentUserProfile={userProfile}
            onComplete={() => setActiveFlow(null)}
            addLog={addLog}
            addFileHistoryEntry={addFileHistoryEntry}
          />
        )}
        {activeFlow === 'decrypt' && (
          <DecryptionFlow
            users={users.filter((u) => u.isEnrolled)}
            currentUserProfile={userProfile}
            onComplete={() => setActiveFlow(null)}
            addLog={addLog}
            addFileHistoryEntry={addFileHistoryEntry}
          />
        )}
      </AnimatePresence>

      <Toaster position="bottom-right" theme="dark" closeButton />
    </div>
  );
};

export default App;
