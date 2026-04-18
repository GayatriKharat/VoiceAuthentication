import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY ?? process.env.GEMINI_API_KEY ?? '' });

const prompts: Record<string, string> = {
  'voice-enrollment-mfcc': `
    Explain the process of enrolling a user's voice for a biometric authentication system.
    Focus on MFCC (Mel-Frequency Cepstral Coefficients) and how they create a unique 'voiceprint'.
    Keep the explanation concise, technical yet understandable, and under 150 words.
    Start with "Technical Briefing: Voice Enrollment".
  `,
  'voice-verification': `
    Explain voice verification: how a live voice sample's MFCC features are compared to a stored
    voiceprint using cosine similarity to authenticate a user.
    Keep the explanation concise, technical yet understandable, and under 150 words.
    Start with "Technical Briefing: Voice Verification".
  `,
  'voice-keyed-encryption': `
    Explain how PBKDF2 key derivation with high iteration counts (310,000+) produces a strong
    AES-256-GCM file encryption key. Mention how biometric gating (voice auth) secures access
    to this key without the key being derived from the voice itself.
    Keep the explanation concise, technical yet understandable, and under 150 words.
    Start with "Technical Briefing: Voice-Keyed Encryption".
  `,
  'biometric-decryption': `
    Explain how a user can decrypt a file using their voice: the system first performs biometric
    identity verification (MFCC cosine similarity check), then on success unwraps a stored
    AES-GCM File Encryption Key using the system KEK to decrypt the file.
    Keep the explanation concise, technical yet understandable, and under 150 words.
    Start with "Technical Briefing: Biometric Decryption".
  `,
};

export const getExplanation = async (topic: string): Promise<string> => {
  const prompt = prompts[topic];
  if (!prompt) return 'No technical explanation available for this topic.';

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
    });
    return response.text ?? 'No response from AI.';
  } catch (error) {
    console.error(`AI explanation error for topic "${topic}":`, error);
    return 'Error: Could not retrieve technical details from the AI model.';
  }
};
