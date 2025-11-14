// src/locales/i18n.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Các file JSON ngôn ngữ
import vi from './vi.json';
import en from './en.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      vi: { translation: vi },
      en: { translation: en },
    },
    lng: 'vi', // Ngôn ngữ mặc định
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // react đã tự xử lý XSS
    },
  });

export default i18n;
