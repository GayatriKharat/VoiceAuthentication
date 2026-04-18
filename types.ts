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
  senderLanguage?: string;
  recipients?: Array<{ uid: string; name: string; wrappedKey: string }>;
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
  | { type: 'verify'; user: User }
  | { type: 'identify'; user: User };
