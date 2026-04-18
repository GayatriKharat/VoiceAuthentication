import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { User } from '../types';
import { generateUserKeyMaterial } from './crypto';

/**
 * Make sure this user has a keypair stored in Firestore.
 * Returns the (possibly updated) profile so callers can use it immediately.
 *
 * Existing users who enrolled before team sharing existed will get a keypair
 * generated the first time they open the encrypt or decrypt flow.
 */
export const ensureUserHasKeypair = async (profile: User): Promise<User> => {
  if (profile.publicKey && profile.encryptedPrivateKey) return profile;

  const material = await generateUserKeyMaterial(profile.uid);
  await updateDoc(doc(db, 'users', profile.uid), {
    publicKey: material.publicKey,
    encryptedPrivateKey: material.encryptedPrivateKey,
  });

  return {
    ...profile,
    publicKey: material.publicKey,
    encryptedPrivateKey: material.encryptedPrivateKey,
  };
};
