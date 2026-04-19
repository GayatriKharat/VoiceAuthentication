
import { EncryptedFile } from "../types";

// Hardened system secret — in production, derive from a server-side secret via Cloud Functions.
const APP_SECRET = "voice-auth-system-master-vault-2025-v2";
const SYSTEM_SALT = new TextEncoder().encode("voice-auth-system-fixed-salt-v2-secure");

// ---------------------------------------------------------------
// Buffer helpers
// ---------------------------------------------------------------

/** Convert ArrayBuffer → Base64 in 32KB chunks (avoids stack overflow on large files) */
const bufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.byteLength; i += CHUNK) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK) as any);
  }
  return btoa(binary);
};

/** Convert Base64 → ArrayBuffer */
const base64ToBuffer = (base64: string): ArrayBuffer => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};

// ---------------------------------------------------------------
// Key Derivation
// ---------------------------------------------------------------

/**
 * Derives the System Key Encryption Key (KEK) using PBKDF2-SHA256.
 * Iteration count: 310,000 — OWASP 2023 recommendation for SHA-256 PBKDF2.
 *
 * The fixed salt means any user successfully verified by the biometric gatekeeper
 * can unlock the wrapped FEK — biometrics provide the ACCESS gate, not the key material.
 */
const deriveSystemKek = async (): Promise<CryptoKey> => {
  const encoder = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    encoder.encode(APP_SECRET),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: SYSTEM_SALT,
      iterations: 310_000,   // Raised from 100k → 310k (OWASP 2023)
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["wrapKey", "unwrapKey"]
  );
};

// ---------------------------------------------------------------
// HMAC Integrity
// ---------------------------------------------------------------

/** Derives an HMAC-SHA256 signing key from the APP_SECRET */
const deriveHmacKey = async (): Promise<CryptoKey> => {
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(APP_SECRET + "-hmac-signing"),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
  return keyMaterial;
};

/** Compute HMAC-SHA256 over ciphertext to detect tampering */
const computeHmac = async (ciphertext: string, iv: string): Promise<string> => {
  const key = await deriveHmacKey();
  const data = new TextEncoder().encode(ciphertext + "|" + iv);
  const sig = await window.crypto.subtle.sign("HMAC", key, data);
  return bufferToBase64(sig);
};

/** Verify HMAC — throws if tampered */
const verifyHmac = async (hmac: string, ciphertext: string, iv: string): Promise<void> => {
  const key = await deriveHmacKey();
  const data = new TextEncoder().encode(ciphertext + "|" + iv);
  const expected = base64ToBuffer(hmac);
  const valid = await window.crypto.subtle.verify("HMAC", key, expected, data);
  if (!valid) {
    throw new Error("File integrity check FAILED — the file may have been tampered with.");
  }
};

// ---------------------------------------------------------------
// Public API
// ---------------------------------------------------------------

/** Encrypt a file with AES-256-GCM + HMAC-SHA256 integrity tag */
export const encryptFile = async (file: File): Promise<EncryptedFile> => {
  // 1. Generate a random File Encryption Key (FEK)
  const fek = await window.crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );

  // 2. Encrypt file content
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const fileBuffer = await file.arrayBuffer();
  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    fek,
    fileBuffer
  );

  // 3. Wrap FEK with System KEK
  const systemKek = await deriveSystemKek();
  const wrappedKeyBuffer = await window.crypto.subtle.wrapKey(
    "raw",
    fek,
    systemKek,
    { name: "AES-GCM", iv }
  );

  const ivB64 = bufferToBase64(iv);
  const ciphertextB64 = bufferToBase64(ciphertextBuffer);

  // 4. Compute HMAC integrity tag
  const hmac = await computeHmac(ciphertextB64, ivB64);

  return {
    iv: ivB64,
    ciphertext: ciphertextB64,
    wrappedKeys: [{ userId: 0, wrappedKey: bufferToBase64(wrappedKeyBuffer) }],
    mimeType: file.type || 'application/octet-stream',
    originalFileName: file.name,
    hmac,
  };
};

// ---------------------------------------------------------------
// Team sharing — per-user RSA keypair & multi-recipient wrapping
// ---------------------------------------------------------------

/**
 * Derive a UID-bound KEK used to wrap each user's private key at rest.
 * The voice check is the UI access gate; Firestore rules should ensure
 * only the owning user can read their encryptedPrivateKey field.
 */
const deriveUserKek = async (uid: string): Promise<CryptoKey> => {
  const encoder = new TextEncoder();
  const material = await window.crypto.subtle.importKey(
    "raw",
    encoder.encode(APP_SECRET + "|user|" + uid),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: SYSTEM_SALT,
      iterations: 310_000,
      hash: "SHA-256",
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
};

export interface UserKeyMaterial {
  publicKey: string;
  encryptedPrivateKey: { iv: string; ciphertext: string };
}

/** Generate an RSA-OAEP 2048 keypair for a user and wrap the private key. */
export const generateUserKeyMaterial = async (uid: string): Promise<UserKeyMaterial> => {
  const keypair = await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  );

  const publicJwk = await window.crypto.subtle.exportKey("jwk", keypair.publicKey);
  const privateJwk = await window.crypto.subtle.exportKey("jwk", keypair.privateKey);

  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const kek = await deriveUserKek(uid);
  const encrypted = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    kek,
    new TextEncoder().encode(JSON.stringify(privateJwk))
  );

  return {
    publicKey: JSON.stringify(publicJwk),
    encryptedPrivateKey: {
      iv: bufferToBase64(iv),
      ciphertext: bufferToBase64(encrypted),
    },
  };
};

/** Load the user's private RSA key into memory (only after voice verification). */
export const loadUserPrivateKey = async (
  uid: string,
  encryptedPrivateKey: { iv: string; ciphertext: string }
): Promise<CryptoKey> => {
  const kek = await deriveUserKek(uid);
  const iv = base64ToBuffer(encryptedPrivateKey.iv);
  const ct = base64ToBuffer(encryptedPrivateKey.ciphertext);
  const plain = await window.crypto.subtle.decrypt({ name: "AES-GCM", iv }, kek, ct);
  const jwk = JSON.parse(new TextDecoder().decode(plain));
  return window.crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["decrypt"]
  );
};

const importRecipientPublicKey = async (publicKeyJwk: string): Promise<CryptoKey> => {
  const jwk = JSON.parse(publicKeyJwk);
  return window.crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["encrypt"]
  );
};

export interface TeamRecipient {
  uid: string;
  name: string;
  publicKey: string;
}

export interface TeamSender {
  uid: string;
  name: string;
  language?: string;
  languageCode?: string;
}

/**
 * Encrypt a file for a specific list of teammates.
 * Each recipient's public key wraps a copy of the file encryption key,
 * so only those exact UIDs can unwrap and decrypt.
 */
export const encryptFileForTeam = async (
  file: File,
  sender: TeamSender,
  recipients: TeamRecipient[]
): Promise<EncryptedFile> => {
  if (!recipients.length) {
    throw new Error("At least one recipient is required.");
  }

  const fekRaw = window.crypto.getRandomValues(new Uint8Array(32));
  const fek = await window.crypto.subtle.importKey(
    "raw",
    fekRaw,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );

  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const fileBuffer = await file.arrayBuffer();
  const ctBuffer = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    fek,
    fileBuffer
  );

  const ivB64 = bufferToBase64(iv);
  const ctB64 = bufferToBase64(ctBuffer);
  const hmac = await computeHmac(ctB64, ivB64);

  const wrappedForRecipients = await Promise.all(
    recipients.map(async (r) => {
      const pub = await importRecipientPublicKey(r.publicKey);
      const wrapped = await window.crypto.subtle.encrypt(
        { name: "RSA-OAEP" },
        pub,
        fekRaw
      );
      return {
        uid: r.uid,
        name: r.name,
        wrappedKey: bufferToBase64(wrapped),
      };
    })
  );

  return {
    version: 3,
    iv: ivB64,
    ciphertext: ctB64,
    mimeType: file.type || "application/octet-stream",
    originalFileName: file.name,
    hmac,
    senderUid: sender.uid,
    senderName: sender.name,
    senderLanguage: sender.language,
    senderLanguageCode: sender.languageCode,
    recipients: wrappedForRecipients,
  };
};

/**
 * Decrypt a v3 team file for the current user.
 * Falls back to legacy v2 decryption when the file predates team sharing.
 */
export const decryptFileForUser = async (
  encryptedData: EncryptedFile,
  recipientUid: string,
  recipientPrivateKey: CryptoKey
): Promise<{ blob: Blob; fileName: string; senderName?: string }> => {
  if (encryptedData.version !== 3 || !encryptedData.recipients) {
    const legacy = await decryptFile(encryptedData);
    return { blob: legacy.blob, fileName: legacy.fileName, senderName: undefined };
  }

  const entry = encryptedData.recipients.find((r) => r.uid === recipientUid);
  if (!entry) {
    throw new Error("ACCESS_DENIED: You are not a recipient of this file.");
  }

  const { iv: ivB64, ciphertext: ctB64, hmac } = encryptedData;
  if (hmac) {
    await verifyHmac(hmac, ctB64, ivB64);
  }

  const wrappedFek = base64ToBuffer(entry.wrappedKey);
  const fekRaw = await window.crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    recipientPrivateKey,
    wrappedFek
  );
  const fek = await window.crypto.subtle.importKey(
    "raw",
    fekRaw,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );

  const iv = base64ToBuffer(ivB64);
  const ct = base64ToBuffer(ctB64);
  const plain = await window.crypto.subtle.decrypt({ name: "AES-GCM", iv }, fek, ct);

  return {
    blob: new Blob([plain], { type: encryptedData.mimeType }),
    fileName: encryptedData.originalFileName,
    senderName: encryptedData.senderName,
  };
};

/** Decrypt a file after the user has been verified by voice biometrics (v2 legacy) */
export const decryptFile = async (
  encryptedData: EncryptedFile
): Promise<{ blob: Blob; fileName: string }> => {
  if (!encryptedData?.wrappedKeys?.[0]) {
    throw new Error("File is corrupted or not a valid encrypted file format.");
  }

  const { iv: ivB64, ciphertext: ciphertextB64, hmac } = encryptedData;

  // 1. Verify HMAC integrity if present (v2+ files)
  if (hmac) {
    await verifyHmac(hmac, ciphertextB64, ivB64);
  }

  const systemKek = await deriveSystemKek();
  const iv = base64ToBuffer(ivB64);
  const wrappedKey = base64ToBuffer(encryptedData.wrappedKeys[0].wrappedKey);

  try {
    // 2. Unwrap FEK using System KEK
    const fek = await window.crypto.subtle.unwrapKey(
      "raw",
      wrappedKey,
      systemKek,
      { name: "AES-GCM", iv },
      { name: "AES-GCM", length: 256 },
      true,
      ["decrypt"]
    );

    // 3. Decrypt main ciphertext
    const ciphertext = base64ToBuffer(ciphertextB64);
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      fek,
      ciphertext
    );

    return {
      blob: new Blob([decryptedBuffer], { type: encryptedData.mimeType }),
      fileName: encryptedData.originalFileName,
    };
  } catch (error) {
    console.error("Decryption crypto error:", error);
    throw new Error("Integrity check failed. The file could not be decrypted.", { cause: error });
  }
};
