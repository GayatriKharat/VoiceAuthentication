import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFunctions, httpsCallable, type Functions } from 'firebase/functions';
import { getFirestore, doc, setDoc, getDoc, collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
let firestoreInstance;
try {
  // Prefer the configured named database when available.
  firestoreInstance = getFirestore(app, firebaseConfig.firestoreDatabaseId);
} catch (error) {
  // Never hard-crash app boot because of a database-id mismatch.
  console.warn(
    'Firebase: Failed to initialize configured Firestore database, falling back to default.',
    error
  );
  firestoreInstance = getFirestore(app);
}
export const db = firestoreInstance;
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

/** Same region as Cloud Functions (`functions/src/index.ts`). */
const FUNCTIONS_REGION = 'us-central1';

let functionsInstance: Functions | null = null;
export function getFirebaseFunctions(): Functions {
  if (!functionsInstance) {
    functionsInstance = getFunctions(app, FUNCTIONS_REGION);
  }
  return functionsInstance;
}

/**
 * Sends login + activity summary email if Cloud Functions + SMTP are configured.
 * Safe to call on every session start; failures are logged only.
 */
export async function requestLoginDigestEmail(): Promise<void> {
  try {
    const callable = httpsCallable(getFirebaseFunctions(), 'requestLoginDigestEmail');
    await callable();
  } catch (e) {
    console.warn(
      '[requestLoginDigestEmail] Skipped or failed (deploy functions and set SMTP to enable):',
      e
    );
  }
}

// Connection test as per guidelines
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'system', 'connection_test'));
    console.log("Firebase: Connection established.");
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Firebase: Client is offline. Check configuration.");
      return;
    }
    // Log other startup errors without breaking UI rendering.
    console.warn("Firebase: Connection test failed:", error);
  }
}
testConnection();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return errInfo;
}
