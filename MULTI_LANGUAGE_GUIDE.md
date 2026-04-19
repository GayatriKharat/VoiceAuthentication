# Multi-Language Voice Authentication System Guide

## Overview
The voice authentication system now supports true multi-language capabilities, enabling international team collaboration with language-specific voice verification and secure file sharing.

## Key Features Implemented

### 1. **Language-Specific Voice Enrollment**
Each user enrolls their voice using a specific language and phrase:
- User stores their enrollment language preference
- Phrases are now **hidden from UI** during verification (users must remember them)
- Language codes are tracked using BCP-47 standard (e.g., `en-US`, `de-DE`, `hi-IN`)

**Supported Languages:**
- English (en-US)
- German (de-DE)
- Hindi (hi-IN)
- Spanish (es-ES)
- French (fr-FR)
- Portuguese (pt-BR)
- Russian (ru-RU)
- Chinese Mandarin (zh-CN)
- Japanese (ja-JP)
- Arabic (ar-SA)
- Urdu (ur-PK)
- Bengali (bn-BD)

### 2. **Language-Enforced Voice Verification**
During decryption, the system enforces strict language matching:
- File sender's enrollment language is stored with the encrypted file
- Recipients MUST verify using the same language as the sender
- If languages don't match → **Access Denied**
- Prevents cross-language voice spoofing attacks

### 3. **Hidden Phrases for Security**
Phrases are now treated as true secrets:
- **During Enrollment**: Phrases are displayed (users need to know what to say)
- **During Verification/Decryption**: Phrases are HIDDEN (users must remember them)
- Only language indicator is shown during verification
- Phrases are never displayed in UI during file access

### 4. **File Recipient Access Control**
Encrypted files include sender language metadata:
```json
{
  "senderUid": "user_a_uid",
  "senderName": "Alice",
  "senderLanguage": "English",
  "senderLanguageCode": "en-US",
  "recipients": [
    { "uid": "user_b_uid", "name": "Bob", "wrappedKey": "..." }
  ]
}
```

## Scenario: International File Transfer

### Step 1: User A (English, UK) Encrypts File
1. User A enrolls voice with English phrase and English language selection
2. User A selects to encrypt file for User B
3. User A performs voice verification (in English)
4. System records:
   - Sender: User A
   - Sender Language: English (en-US)
   - Recipients: User B
   - File is encrypted with User B's RSA public key

### Step 2: User B (German, Germany) Receives File
1. User B receives the `.vas` vault file
2. System shows: "Sent by Alice (English)"
3. User B is on the recipient list ✓

### Step 3: User B Attempts Decryption
1. User B uploads the vault file
2. System checks: "You are authorized to access this file"
3. User B clicks to decrypt
4. **BiometricModal opens with language indicator: "Verification Language: English"**
5. User B speaks the phrase they know (but phrase is HIDDEN)

### Step 4: Language Verification
The system runs two checks:
```
1. Language Enforcement:
   - Enrolled language: German (de-DE)
   - Required language: English (en-US)
   → MISMATCH! Access Denied

Error Message:
"Language mismatch: You enrolled with de-DE but are verifying with en-DE.
 Please use the same language."
```

**Correct Scenario - User B Uses English:**
```
1. User B says the English phrase
2. Language matches sender's enrollment language ✓
3. Voice biometric matches ✓
4. File decryption succeeds ✓
```

## Technical Implementation

### New Functions

#### `compareVoiceprintsWithLanguage()`
Located in `utils/audioProcessor.ts`

```typescript
export const compareVoiceprintsWithLanguage = (
  enrolledVp: Float32Array,
  currentVp: Float32Array,
  enrolledLanguageCode: string,
  verificationLanguageCode: string
): {
  isMatch: boolean;
  score: number;
  langMismatch: boolean;
  reason: string;
}
```

**Behavior:**
- Returns `{ isMatch: false, langMismatch: true }` if languages don't match
- Returns voice similarity score if languages match
- Logs warnings for language mismatches

### Updated Types

#### `EncryptedFile` (in `types.ts`)
```typescript
export interface EncryptedFile {
  senderLanguage?: string;        // e.g., "English"
  senderLanguageCode?: string;    // e.g., "en-US"
  recipients?: Array<{
    uid: string;
    name: string;
    wrappedKey: string;
    accessGrantedAt?: string;     // ISO timestamp
    accessGrantedBy?: string;     // Auditing
  }>;
}
```

#### `AuthAction` (in `types.ts`)
```typescript
| {
    type: 'verify';
    user: User;
    senderLanguage?: string;      // For decryption: sender's language
    senderLanguageCode?: string;  // For decryption: sender's language code
  }
```

### Updated Components

#### `BiometricModal.tsx`
- **Hidden phrase box** for non-enrollment actions
- **Language indicator** instead of phrase during verification
- Uses `compareVoiceprintsWithLanguage()` for language-enforced verification
- Displays language-specific error messages

#### `DecryptionFlow.tsx`
- Passes sender's language to BiometricModal via `senderLanguageCode`
- Shows sender's language in file metadata review
- Displays language enforcement errors

#### `EncryptionFlow.tsx`
- Captures sender's `passPhraseLanguageCode`
- Passes to `encryptFileForTeam()` function

#### `crypto.ts`
- Updated `TeamSender` interface to include `languageCode`
- Stores `senderLanguageCode` in encrypted file metadata

### Updated Services

#### `audioProcessor.ts`
- Added language-specific verification function
- Maintains backward compatibility with existing `compareVoiceprints()`
- Language mismatch detection before voice similarity check

## Security Benefits

1. **Language Binding**: Files are bound to sender's enrollment language
   - Prevents attackers from accessing files by using different language
   - Adds another dimension to multi-factor authentication

2. **Phrase Confidentiality**: Hidden phrases ensure users must remember them
   - Phrases are not visible in UI (unlike before)
   - True "something you know" factor

3. **Cross-Language Isolation**: Different language enrollments don't interfere
   - Same person with German and English voices can have separate accounts
   - Voice profiles are language-specific for better accuracy

## Error Scenarios

### Scenario 1: Language Mismatch
```
Error: Language mismatch: You enrolled with de-DE but are verifying with en-US.
       Please use the same language.
Resolution: User must perform verification in their enrollment language
```

### Scenario 2: Not a Recipient
```
Error: ACCESS_DENIED: You are not a recipient of this file.
Resolution: File sender must grant you access by adding you to recipients list
```

### Scenario 3: Voice Not Recognized
```
Error: Voice not recognized (45% match). Access denied.
Resolution: User must re-enroll or attempt verification again
```

## User Journey

### For Sender (File Encryptor)
1. Enroll voice with preferred language
2. Select file to encrypt
3. Choose recipients from enrolled users list
4. Perform voice verification
5. File is encrypted and ready to share
6. Share `.vas` file with recipient

### For Recipient (File Decryptor)
1. Receive `.vas` file from sender
2. Upload file to application
3. System checks access permissions
4. View sender name and enrollment language
5. Click "Decrypt" to begin
6. See language indicator (but NOT the phrase)
7. Perform voice verification in sender's language
8. If verification succeeds → File downloads
9. If language mismatch → Access denied

## Best Practices

1. **Remember Your Phrase**: Since phrases are hidden during verification, users must memorize them
2. **Language Consistency**: Stay in the same language when enrolling and verifying
3. **Secure Phrases**: Choose meaningful phrases that are easy to remember
4. **File Sharing**: Only encrypt files for users whose languages match yours (or they must use your language)

## Configuration

### Supported Languages
Located in `components/PhraseSelector.tsx`

Each language has:
- BCP-47 code (e.g., `en-US`, `de-DE`)
- Display label (e.g., "German (Deutsch)")
- Emoji flag
- 3 suggested phrases
- Optional RTL support for Arabic/Urdu

To add new language:
```typescript
const LANGUAGES: Language[] = [
  // ... existing languages
  {
    code: 'it-IT',
    label: 'Italian (Italiano)',
    flag: '🇮🇹',
    phrases: [
      'La mia voce è la mia password',
      'Verifica la mia identità con la mia voce',
      'La mia voce protegge i miei dati',
    ],
  },
];
```

## Troubleshooting

### User can't decrypt file despite being on recipient list
**Cause**: Voice doesn't match or language mismatch
**Solution**: 
1. Check language indicator shown during verification
2. Verify using the same language as sender
3. Try re-recording voice (microphone issues?)

### Language indicator not showing
**Cause**: Sender didn't have language code when encrypting (legacy file)
**Solution**: Have sender re-encrypt file with current version

### Phrase verification keeps failing
**Cause**: Speech recognition not working properly
**Solution**: 
1. Check browser microphone permissions
2. Speak clearly and distinctly
3. Ensure background noise is minimal

## Future Enhancements

1. **Custom Phrases**: Allow users to create custom secret phrases
2. **Multi-Language Enrollment**: Support same user in multiple languages
3. **Language Auto-Detection**: Automatically detect language from audio
4. **Translation Service**: Generate phrases in any language
5. **Biometric Liveness Detection**: Enhanced anti-spoofing for multi-language

## Files Modified

- `types.ts` - Added language fields to EncryptedFile and AuthAction
- `utils/audioProcessor.ts` - Added compareVoiceprintsWithLanguage()
- `utils/crypto.ts` - Updated TeamSender interface, added languageCode support
- `components/BiometricModal.tsx` - Hidden phrases, language-specific verification
- `components/EncryptionFlow.tsx` - Capture sender language code
- `components/DecryptionFlow.tsx` - Pass sender language to verification
