import {
  collection,
  addDoc,
  serverTimestamp,
  type Firestore,
} from 'firebase/firestore';
import type { User as FirebaseUser } from 'firebase/auth';
import type { SecurityAuditAction } from '../types';

export async function recordSecurityEvent(
  db: Firestore,
  user: FirebaseUser,
  action: SecurityAuditAction,
  summary: string,
  metadata?: Record<string, string>
): Promise<void> {
  try {
    const docRef = await addDoc(collection(db, 'user_security_events'), {
      userId: user.uid,
      action,
      summary,
      metadata: metadata ?? {},
      userEmail: user.email ?? '',
      displayName: user.displayName ?? '',
      userAgent:
        typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 240) : '',
      createdAt: serverTimestamp(),
    });
    // Return the doc id in a debug-friendly console log to help troubleshooting
    console.debug('[securityAudit] event created', { id: docRef.id, action, userId: user.uid });
  } catch (e) {
    console.warn('[securityAudit] Failed to record event:', e);
  }
}

export function authProviderLabel(user: FirebaseUser): string {
  const p = user.providerData[0]?.providerId ?? 'unknown';
  if (p === 'google.com') return 'Google';
  if (p === 'password') return 'Email & password';
  if (p === 'phone') return 'SMS OTP';
  if (p === 'emailLink') return 'Email magic link';
  return p;
}
