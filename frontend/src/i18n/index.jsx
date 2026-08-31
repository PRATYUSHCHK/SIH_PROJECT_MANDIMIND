import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { en } from './translations/en.js';
import { hi } from './translations/hi.js';
import { te } from './translations/te.js';
import { ta } from './translations/ta.js';
import { kn } from './translations/kn.js';
import { ml } from './translations/ml.js';
import { mr } from './translations/mr.js';
import { bn } from './translations/bn.js';
import { gu } from './translations/gu.js';
import { pa } from './translations/pa.js';
import { or } from './translations/or.js';
import { ur } from './translations/ur.js';

export const LANGUAGES = [
  { code: 'en', name: 'English', native: 'English', rtl: false },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी', rtl: false },
  { code: 'te', name: 'Telugu', native: 'తెలుగు', rtl: false },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்', rtl: false },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ', rtl: false },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം', rtl: false },
  { code: 'mr', name: 'Marathi', native: 'मराठी', rtl: false },
  { code: 'bn', name: 'Bengali', native: 'বাংলা', rtl: false },
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી', rtl: false },
  { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ', rtl: false },
  { code: 'or', name: 'Odia', native: 'ଓଡ଼ିଆ', rtl: false },
  { code: 'ur', name: 'Urdu', native: 'اردو', rtl: true },
];

const TRANSLATIONS = {
  en,
  hi,
  te,
  ta,
  kn,
  ml,
  mr,
  bn,
  gu,
  pa,
  or,
  ur,
};

const LanguageContext = createContext(null);

function getNested(obj, path) {
  if (!obj || !path) return undefined;
  const keys = path.split('.');
  let current = obj;
  for (const k of keys) {
    if (current && typeof current === 'object' && k in current) {
      current = current[k];
    } else {
      return undefined;
    }
  }
  return current;
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    return localStorage.getItem('mm_lang') || 'en';
  });

  const setLanguage = useCallback((code) => {
    if (TRANSLATIONS[code]) {
      setLangState(code);
      localStorage.setItem('mm_lang', code);
      const isRtl = LANGUAGES.find((l) => l.code === code)?.rtl || false;
      document.documentElement.setAttribute('dir', isRtl ? 'rtl' : 'ltr');
      document.documentElement.setAttribute('lang', code);
    }
  }, []);

  useEffect(() => {
    const isRtl = LANGUAGES.find((l) => l.code === lang)?.rtl || false;
    document.documentElement.setAttribute('dir', isRtl ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', lang);
  }, [lang]);

  const t = useCallback(
    (key, paramsOrFallback = '', fallback = '') => {
      let params = null;
      let defaultText = '';
      if (typeof paramsOrFallback === 'object' && paramsOrFallback !== null) {
        params = paramsOrFallback;
        defaultText = fallback;
      } else if (typeof paramsOrFallback === 'string') {
        defaultText = paramsOrFallback;
      }

      const currentDict = TRANSLATIONS[lang] || TRANSLATIONS.en;
      let val = getNested(currentDict, key);
      if (typeof val !== 'string') {
        val = getNested(TRANSLATIONS.en, key);
      }
      if (typeof val !== 'string') {
        val = defaultText || key;
      }

      if (params && typeof val === 'string') {
        Object.keys(params).forEach((paramKey) => {
          val = val.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), params[paramKey]);
        });
      }

      return val;
    },
    [lang]
  );

  const value = useMemo(
    () => ({
      lang,
      setLanguage,
      t,
      languages: LANGUAGES,
      currentLangObj: LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0],
    }),
    [lang, setLanguage, t]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useTranslation() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    return {
      t: (k, fb = '') => fb || k,
      lang: 'en',
      setLanguage: () => {},
      languages: LANGUAGES,
      currentLangObj: LANGUAGES[0],
    };
  }
  return ctx;
}

export const useLanguage = useTranslation;
