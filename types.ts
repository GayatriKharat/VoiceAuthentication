export interface User {
  uid: string;
  name: string;
  email: string;
  isEnrolled: boolean;
  voiceprint: number[] | null;
  role: 'admin' | 'user';
  createdAt: string;
  location?: string;
  lastActive?: string;
  passPhrase?: string;
  passPhraseLanguage?: string;
  passPhraseLanguageCode?: string;

  // Per-user RSA keypair for team file-sharing.
  // Only the teammates listed as recipients can unwrap a file's FEK.
  publicKey?: string;                 // JWK JSON string — safe to share
  encryptedPrivateKey?: {             // Private key wrapped with a UID-bound KEK
    iv: string;
    ciphertext: string;
  };
}

export interface EncryptedFile {
  version?: 2 | 3;
  iv: string;
  ciphertext: string;
  mimeType: string;
  originalFileName: string;
  hmac?: string;

  // v2 (legacy): shared KEK; any voice-verified user could decrypt.
  wrappedKeys?: Array<{ userId: number; wrappedKey: string }>;

  // v3 (team sharing): FEK wrapped per recipient with their public key.
  senderUid?: string;
  senderName?: string;
  senderLanguage?: string;               // e.g., "English", "German", "Hindi"
  senderLanguageCode?: string;           // BCP-47 code, e.g., "en-US", "de-DE"
  recipients?: Array<{ 
    uid: string; 
    name: string; 
    wrappedKey: string;
    accessGrantedAt?: string;            // ISO timestamp of explicit access grant
    accessGrantedBy?: string;            // UID of user who granted access (for audit)
  }>;
  
  // Access control: explicit grants per user (beyond RSA wrapping)
  accessGrants?: Array<{
    uid: string;                         // User ID granted access
    name: string;                        // User name (for display)
    grantedAt: string;                   // ISO timestamp of grant
    grantedBy: string;                   // UID of person who granted access
    reason?: string;                     // Optional reason for grant
  }>;
}

export interface FileHistoryEntry {
  id: string;
  fileName: string;
  operation: 'encrypt' | 'decrypt';
  userUid: string;
  userName: string;
  status: 'success' | 'failed';
  timestamp: string;
  location?: string;
}

export interface LogMessage {
  id?: string;
  text: string;
  type: 'info' | 'success' | 'error' | 'warning';
  timestamp: string;
  location?: string;
  userUid?: string;
  userName?: string;
}

/** Immutable security / audit trail entries (per user). */
export type SecurityAuditAction =
  | 'LOGIN_SUCCESS'
  | 'LOGOUT'
  | 'ENROLL_COMPLETE'
  | 'FILE_ENCRYPT'
  | 'FILE_DECRYPT'
  | 'MAGIC_LINK_SENT'
  | 'ACCOUNT_DELETE_SELF';

export interface UserSecurityEvent {
  id?: string;
  userId: string;
  action: SecurityAuditAction | string;
  summary: string;
  metadata?: Record<string, string>;
  userEmail?: string;
  displayName?: string;
  userAgent?: string;
  createdAt?: string | { toDate?: () => Date; seconds?: number };
}

export interface LoginHistoryEntry {
  id?: string;
  userUid: string;
  userName: string;
  userEmail: string;
  timestamp: string;
  city?: string;
  region?: string;
  country?: string;
  timezone: string;
  lat?: number;
  lon?: number;
  displayName?: string;
}

// Biometric action types passed to BiometricModal
export type AuthAction =
  | {
      type: 'enroll';
      user: Partial<User>;
      passPhrase: string;
      passPhraseLanguage: string;
      passPhraseLanguageCode: string;
      recordingLabel?: string; // e.g. "Sample 1 of 2"
    }
  | {
      type: 'verify';
      user: User;
      senderLanguage?: string;           // For file decryption: sender's enrollment language
      senderLanguageCode?: string;       // For file decryption: sender's language code (BCP-47)
    }
  | { type: 'identify'; user: User };
