
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
import { Toaster, toast } from 'sonner';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
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
import { Globe, ShieldCheck } from 'lucide-react';
import { getLocationInfo } from './utils/locationService';

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
    return <AuthModal />;
  }

  const handleLogout = () => signOut(auth);

  // ---------------------------------------------------------------
  // Main UI
  // ---------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans selection:bg-blue-500/30">
      <Header user={currentUser} onLogout={handleLogout} />

      <main className="container mx-auto p-4 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-800 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-blue-400 text-xs font-bold uppercase tracking-widest">
              <Globe className="w-3 h-3" />
              <span>Secure Collaboration Workspace</span>
            </div>
            <h2 className="text-3xl font-light tracking-tight text-white">
              Welcome back, <span className="font-bold text-blue-500">{currentUser.displayName || 'Operator'}</span>
            </h2>
            <p className="text-sm text-slate-400">
              Enroll your voice, encrypt for selected teammates, and decrypt only if authorized.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-8 px-6 py-3 bg-slate-900/50 rounded-2xl border border-slate-800">
              <div className="text-center">
                <div className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">
                  Team Members
                </div>
                <div className="text-xl font-mono text-white">{users.length}</div>
              </div>
              <div className="w-px h-8 bg-slate-800" />
              <div className="text-center">
                <div className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">
                  Security Status
                </div>
                <div className="text-xl font-mono text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4" />
                  Active
                </div>
              </div>
              <div className="w-px h-8 bg-slate-800" />
              <div className="text-center">
                <div className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">
                  Your Location
                </div>
                <div className="text-sm font-mono text-blue-400 max-w-[120px] truncate">
                  {loginSessions[0]?.city && loginSessions[0].city !== 'Unknown'
                    ? `${loginSessions[0].city}`
                    : loginSessions[0]?.timezone?.split('/')[1]?.replace(/_/g, ' ') || '—'}
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowSecurityFeed((s) => !s)}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-all shadow-lg shadow-blue-900/20"
            >
              {showSecurityFeed ? 'Hide Security Feed' : 'Show Security Feed'}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {showSecurityFeed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <FileHistoryPanel history={fileHistory} />
                <SystemLog messages={logMessages} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <FileActions
          onStartEnrollment={() => setActiveFlow('enroll')}
          onStartEncryption={() => setActiveFlow('encrypt')}
          onStartDecryption={() => setActiveFlow('decrypt')}
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 space-y-8">
            <AccountPanel
              currentUser={currentUser}
              userProfile={userProfile}
              onDeleteMyAccount={() => handleDeleteUser(currentUser.uid)}
              onLogout={handleLogout}
            />
            <UserPanel
              users={users}
              onDeleteUser={handleDeleteUser}
              maxUsers={MAX_USERS}
              currentUserRole={userProfile?.role}
              currentUserUid={currentUser.uid}
            />
            {/* Login History Panel */}
            <LoginHistoryPanel sessions={loginSessions} />
          </div>

          <div className="lg:col-span-7 space-y-8">
            <div className="rounded-[2rem] border border-slate-800/60 bg-slate-900/30 p-6">
              <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-400 mb-2">
                Quick Guide
              </h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                1) Enroll your voice profile once. 2) Encrypt files and choose allowed recipients.
                3) Recipients verify voice and decrypt only if they are authorized.
              </p>
            </div>
            <UserPanel
              users={users}
              onDeleteUser={handleDeleteUser}
              maxUsers={MAX_USERS}
              currentUserRole={userProfile?.role}
              currentUserUid={currentUser.uid}
            />
          </div>
        </div>
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
