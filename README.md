<div align="center">
  <img width="1200" height="475" alt="Voice Authentication System" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Voice Authentication System

A browser-based voice biometric authentication and secure team file sharing platform built with React, TypeScript, Firebase, and Vite.

This project lets users enroll with a voice password in their chosen language, stores the recorded audio and transcript, and uses voiceprint verification to protect access to encrypted data.

## Features

- Voice-only enrollment flow with audio capture, transcript review, and biometric voiceprint storage
- Multi-language voice password support, including Marathi, Hindi, Urdu, Spanish, French, German, and more
- Secure Firestore user profiles under `/users/{uid}`
- Per-user RSA keypair generation for team file sharing
- Voice verification gate for encryption/decryption operations
- Login history and security event auditing
- Responsive UI with Tailwind CSS and framer-motion animations

## Tech stack

- React 19 + TypeScript
- Vite
- Firebase Authentication, Firestore, Cloud Functions client integration
- Tailwind CSS
- framer-motion
- Web Speech API / microphone capture
- Web Crypto API for local key generation
- Sonner toast notifications

## Getting started

### Prerequisites

- Node.js 18+ (recommended)
- npm
- Firebase project with Firestore and Authentication enabled

### Install

```bash
npm install
```

### Configure

1. Update `firebase-applet-config.json` with your Firebase project settings.
2. If you want to use AI or Gemini features, create `.env.local` and add:

```env
GEMINI_API_KEY=your_api_key_here
```

3. Verify Firestore security rules are deployed from `firestore.rules`.

### Run locally

```bash
npm run dev
```

Open the app in your browser at:

```text
http://localhost:5173
```

## Firebase setup

The app depends on Firestore rules that require:

- authenticated users only
- user profile documents under `/users/{uid}`
- `uid` in the document matches the authenticated user
- `role` must be `user` unless the user is already an admin

The rules file is stored at `firestore.rules`.

## Project structure

- `src/` — main app source code
- `components/` — enrollment, biometric modal, dashboards, panels, and UI components
- `utils/` — crypto helpers, audio processing, location, and security audit utilities
- `firebase.ts` — Firebase initialization and helper exports
- `types.ts` — shared application data models
- `vite.config.ts` — Vite configuration

## Deployment

Build the production bundle with:

```bash
npm run build
```

Preview the production build locally with:

```bash
npm run preview
```

For hosting, deploy the `dist/` contents to any static site host, or use Vercel/Netlify.

## Notes

- New users enroll with voice and transcript instead of a typed password.
- Voice password audio is saved as a data URL and associated with the user profile.
- The biometric model uses voiceprint vectors generated from recorded audio samples.

## Contributing

Contributions, issues, and feature requests are welcome. Feel free to open a PR or issue.

## License

This repository does not specify a license. Add one if you want to make this project open source.
