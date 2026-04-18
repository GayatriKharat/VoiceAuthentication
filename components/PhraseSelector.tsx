import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check, Globe, Languages } from 'lucide-react';

interface Language {
  code: string;        // BCP-47 speech recognition code
  label: string;       // Display label
  flag: string;        // Emoji flag
  phrases: string[];   // 3 suggested phrases
  rtl?: boolean;       // Right-to-left
}

const LANGUAGES: Language[] = [
  {
    code: 'en-US',
    label: 'English',
    flag: '🇺🇸',
    phrases: [
      'My voice is my passport, verify me',
      'Secure my data with the sound of my voice',
      'The quick brown fox jumps over the lazy dog',
    ],
  },
  {
    code: 'hi-IN',
    label: 'Hindi (हिंदी)',
    flag: '🇮🇳',
    phrases: [
      'मेरी आवाज़ मेरी पहचान है',
      'मेरे स्वर से मेरे डेटा को सुरक्षित करें',
      'आवाज़ से अपनी पहचान साबित करें',
    ],
  },
  {
    code: 'ur-PK',
    label: 'Urdu (اردو)',
    flag: '🇵🇰',
    rtl: true,
    phrases: [
      'میری آواز میرا پاسورڈ ہے',
      'میری آواز سے میری شناخت کریں',
      'آواز سے ڈیٹا کو محفوظ بنائیں',
    ],
  },
  {
    code: 'bn-BD',
    label: 'Bengali (বাংলা)',
    flag: '🇧🇩',
    phrases: [
      'আমার কণ্ঠস্বর আমার পাসওয়ার্ড',
      'আমার ভয়েস দিয়ে আমার পরিচয় যাচাই করুন',
      'কণ্ঠস্বর দিয়ে ডেটা সুরক্ষিত করুন',
    ],
  },
  {
    code: 'ar-SA',
    label: 'Arabic (العربية)',
    flag: '🇸🇦',
    rtl: true,
    phrases: [
      'صوتي هو مفتاحي الأمني',
      'تحقق من هويتي بصوتي',
      'صوتي يحمي بياناتي السرية',
    ],
  },
  {
    code: 'es-ES',
    label: 'Spanish (Español)',
    flag: '🇪🇸',
    phrases: [
      'Mi voz es mi contraseña segura',
      'Verifica mi identidad con mi voz',
      'Mi voz protege mis datos secretos',
    ],
  },
  {
    code: 'fr-FR',
    label: 'French (Français)',
    flag: '🇫🇷',
    phrases: [
      'Ma voix est ma clé secrète',
      'Vérifiez mon identité avec ma voix',
      'Ma voix protège mes données personnelles',
    ],
  },
  {
    code: 'de-DE',
    label: 'German (Deutsch)',
    flag: '🇩🇪',
    phrases: [
      'Meine Stimme ist mein Passwort',
      'Bestätigen Sie meine Identität mit meiner Stimme',
      'Meine Stimme schützt meine Daten',
    ],
  },
  {
    code: 'pt-BR',
    label: 'Portuguese (Português)',
    flag: '🇧🇷',
    phrases: [
      'Minha voz é minha senha segura',
      'Verifique minha identidade com minha voz',
      'Minha voz protege meus dados',
    ],
  },
  {
    code: 'ru-RU',
    label: 'Russian (Русский)',
    flag: '🇷🇺',
    phrases: [
      'Мой голос является моим паролем',
      'Проверьте мою личность по голосу',
      'Мой голос защищает мои данные',
    ],
  },
  {
    code: 'zh-CN',
    label: 'Mandarin (普通话)',
    flag: '🇨🇳',
    phrases: [
      '我的声音是我的密码',
      '用我的声音验证我的身份',
      '我的声音保护我的数据',
    ],
  },
  {
    code: 'ja-JP',
    label: 'Japanese (日本語)',
    flag: '🇯🇵',
    phrases: [
      '私の声は私のパスワードです',
      '私の声で私のアイデンティティを確認してください',
      '私の声が私のデータを守ります',
    ],
  },
];

const CUSTOM_LABEL = 'Custom Phrase';

export interface PhraseSelection {
  phrase: string;
  language: string;       // Human-readable label e.g. "Hindi"
  languageCode: string;   // BCP-47 e.g. "hi-IN"
}

interface PhraseSelectorProps {
  onConfirm: (selection: PhraseSelection) => void;
}

const PhraseSelector: React.FC<PhraseSelectorProps> = ({ onConfirm }) => {
  const [selectedLang, setSelectedLang] = useState<Language>(LANGUAGES[0]);
  const [selectedPhrase, setSelectedPhrase] = useState<string>(LANGUAGES[0].phrases[0]);
  const [isCustom, setIsCustom] = useState(false);
  const [customPhrase, setCustomPhrase] = useState('');
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);

  const activePhrase = isCustom ? customPhrase.trim() : selectedPhrase;
  const wordCount = activePhrase.split(/\s+/).filter(Boolean).length;
  const isValid = wordCount >= 3 && activePhrase.length > 0;

  const handleLangSelect = (lang: Language) => {
    setSelectedLang(lang);
    setSelectedPhrase(lang.phrases[0]);
    setIsCustom(false);
    setLangDropdownOpen(false);
  };

  const handleConfirm = () => {
    if (!isValid) return;
    onConfirm({
      phrase: activePhrase,
      language: selectedLang.label.split(' ')[0], // "Hindi" from "Hindi (हिंदी)"
      languageCode: selectedLang.code,
    });
  };

  return (
    <div className="space-y-6">
      {/* Language Selector */}
      <div className="space-y-2">
        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
          Passphrase Language
        </label>
        <div className="relative">
          <button
            type="button"
            onClick={() => setLangDropdownOpen(!langDropdownOpen)}
            className="w-full flex items-center justify-between px-4 py-3.5 bg-slate-800/60 border border-slate-700 rounded-2xl text-white font-medium hover:border-blue-500/50 transition-all"
          >
            <span className="flex items-center gap-2.5">
              <span className="text-xl">{selectedLang.flag}</span>
              <span className="text-sm">{selectedLang.label}</span>
            </span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${langDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {langDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full mt-2 w-full bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden max-h-56 overflow-y-auto"
              >
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => handleLangSelect(lang)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-800 transition-colors text-sm ${
                      selectedLang.code === lang.code ? 'bg-blue-600/10 text-blue-400' : 'text-white'
                    }`}
                  >
                    <span className="text-lg">{lang.flag}</span>
                    <span className="flex-1">{lang.label}</span>
                    {selectedLang.code === lang.code && <Check className="w-4 h-4" />}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Phrase Options */}
      <div className="space-y-2">
        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
          Choose Your Passphrase
        </label>
        <div className="space-y-2">
          {selectedLang.phrases.map((phrase) => (
            <button
              key={phrase}
              type="button"
              onClick={() => { setSelectedPhrase(phrase); setIsCustom(false); }}
              className={`w-full text-left px-4 py-3.5 rounded-2xl border transition-all text-sm font-medium ${
                !isCustom && selectedPhrase === phrase
                  ? 'border-blue-500/50 bg-blue-500/10 text-white'
                  : 'border-slate-700 bg-slate-800/40 text-slate-300 hover:border-slate-600 hover:bg-slate-800/80'
              }`}
              dir={selectedLang.rtl ? 'rtl' : 'ltr'}
            >
              <span className="flex items-center justify-between gap-2">
                <span>{phrase}</span>
                {!isCustom && selectedPhrase === phrase && (
                  <Check className="w-4 h-4 text-blue-400 flex-shrink-0" />
                )}
              </span>
            </button>
          ))}

          {/* Custom Option */}
          <button
            type="button"
            onClick={() => setIsCustom(true)}
            className={`w-full text-left px-4 py-3.5 rounded-2xl border transition-all text-sm ${
              isCustom
                ? 'border-blue-500/50 bg-blue-500/10 text-white'
                : 'border-slate-700 border-dashed bg-transparent text-slate-500 hover:border-slate-600 hover:text-slate-400'
            }`}
          >
            <span className="flex items-center gap-2">
              <Languages className="w-4 h-4" />
              {isCustom ? 'Writing custom phrase...' : '+ Write my own phrase'}
            </span>
          </button>
        </div>

        <AnimatePresence>
          {isCustom && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
            >
              <textarea
                value={customPhrase}
                onChange={(e) => setCustomPhrase(e.target.value)}
                placeholder="Type your passphrase in any language..."
                dir={selectedLang.rtl ? 'rtl' : 'ltr'}
                rows={2}
                className="w-full mt-2 px-4 py-3 bg-slate-800/60 border border-slate-700 rounded-2xl text-white placeholder-slate-600 text-sm focus:outline-none focus:border-blue-500/50 resize-none"
                autoFocus
              />
              <p className="text-[10px] text-slate-600 mt-1 ml-1">
                {wordCount} word{wordCount !== 1 ? 's' : ''} — minimum 3 words required
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Preview */}
      {activePhrase && (
        <motion.div
          key={activePhrase}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4 space-y-1"
        >
          <p className="text-[10px] text-blue-400 uppercase font-bold tracking-widest flex items-center gap-1">
            <Globe className="w-3 h-3" /> Your Passphrase ({selectedLang.flag} {selectedLang.label.split(' ')[0]})
          </p>
          <p
            className="text-white font-medium text-sm leading-relaxed italic"
            dir={selectedLang.rtl ? 'rtl' : 'ltr'}
          >
            "{activePhrase}"
          </p>
        </motion.div>
      )}

      {/* Confirm Button */}
      <button
        type="button"
        onClick={handleConfirm}
        disabled={!isValid}
        className="w-full h-12 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-900/20"
      >
        Confirm Passphrase
      </button>
    </div>
  );
};

export default PhraseSelector;
