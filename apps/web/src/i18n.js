import { createContext, useContext } from 'react'
import en from './locales/en.json'
import tr from './locales/tr.json'
import de from './locales/de.json'
import es from './locales/es.json'
import pt from './locales/pt.json'
import fr from './locales/fr.json'

const translations = { en, tr, de, es, pt, fr }

export const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'tr', name: 'Türkçe' },
  { code: 'de', name: 'Deutsch' },
  { code: 'es', name: 'Español' },
  { code: 'pt', name: 'Português' },
  { code: 'fr', name: 'Français' },
]

export function getT(lang) {
  const dict = translations[lang] || translations.en
  return (key) => dict[key] ?? translations.en[key] ?? key
}

export const LanguageContext = createContext(() => (key) => key)

export function useT() {
  return useContext(LanguageContext)
}
