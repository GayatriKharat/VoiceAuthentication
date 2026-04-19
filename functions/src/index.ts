/**
 * Optional Cloud Functions for enterprise-style login notifications.
 *
 * Deploy: `firebase deploy --only functions`
 * Configure SMTP (any provider): set environment variables on the function:
 *   SMTP_HOST, SMTP_PORT (default 587), SMTP_USER, SMTP_PASS, SMTP_FROM
 * If your Firestore uses a named database (not default), set:
 *   FIRESTORE_DATABASE_ID=your-database-id
 *
 * Without SMTP, the callable succeeds but skips sending email (see logs).
 */

import { initializeApp, getApps, getApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as nodemailer from 'nodemailer';

if (!getApps().length) {
  initializeApp();
}

function getDb() {
  const id = process.env.FIRESTORE_DATABASE_ID?.trim();
  if (id && id !== '(default)') {
    return getFirestore(getApp(), id);
  }
  return getFirestore();
}

function formatTs(t: Timestamp | undefined): string {
  if (!t) return '—';
  try {
    return t.toDate().toISOString();
  } catch {
    return '—';
  }
}

export const requestLoginDigestEmail = onCall(
  {
    region: 'us-central1',
    cors: true,
    timeoutSeconds: 60,
  },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError('unauthenticated', 'You must be signed in.');
    }

    const uid = request.auth.uid;
    let userEmail: string;
    try {
      const user = await getAuth().getUser(uid);
      userEmail = user.email ?? '';
    } catch {
      throw new HttpsError('internal', 'Could not load user profile.');
    }

    if (!userEmail) {
      return { ok: true, sent: false, reason: 'no-email-on-account' };
    }

    const db = getDb();
    const snap = await db
      .collection('user_security_events')
      .where('userId', '==', uid)
      .orderBy('createdAt', 'desc')
      .limit(40)
      .get();

    const lines: string[] = [];
    snap.forEach((doc) => {
      const d = doc.data();
      const when = formatTs(d.createdAt as Timestamp);
      lines.push(`• [${when}] ${d.action}: ${d.summary}`);
    });

    const summaryBody =
      lines.length > 0
        ? lines.join('\n')
        : '• No prior security events recorded for this account yet.';

    const host = process.env.SMTP_HOST?.trim();
    const port = Number(process.env.SMTP_PORT || '587');
    const smtpUser = process.env.SMTP_USER?.trim();
    const smtpPass = process.env.SMTP_PASS?.trim();
    const from = process.env.SMTP_FROM?.trim() || smtpUser || 'noreply@localhost';

    if (!host || !smtpUser || !smtpPass) {
      console.warn(
        'requestLoginDigestEmail: SMTP not configured (set SMTP_HOST, SMTP_USER, SMTP_PASS). Skipping email.'
      );
      return { ok: true, sent: false, reason: 'smtp-not-configured' };
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user: smtpUser, pass: smtpPass },
    });

    const subject = 'Voice Auth — successful sign-in & recent activity summary';
    const text = [
      'Hello,',
      '',
      'This is an automated security notice from your Voice Authentication workspace.',
      '',
      'A successful sign-in was recorded for your account.',
      '',
      'Recent activity associated with your user ID (newest first):',
      '',
      summaryBody,
      '',
      'If you did not sign in, change your Firebase Auth password and review Firestore security rules.',
      '',
      '— Voice Authentication System',
    ].join('\n');

    const html = `
      <p>Hello,</p>
      <p><strong>Successful sign-in</strong> was recorded for your account.</p>
      <p>Recent activity (newest first):</p>
      <pre style="font-family:monospace;font-size:12px;background:#f4f4f4;padding:12px;border-radius:8px;white-space:pre-wrap;">${summaryBody.replace(/</g, '&lt;')}</pre>
      <p style="color:#666;font-size:12px;">If this was not you, secure your account immediately.</p>
    `;

    await transporter.sendMail({
      from,
      to: userEmail,
      subject,
      text,
      html,
    });

    return { ok: true, sent: true };
  }
);
