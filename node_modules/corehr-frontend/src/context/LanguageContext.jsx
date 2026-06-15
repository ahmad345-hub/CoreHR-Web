import { createContext, useContext, useState, useEffect } from 'react'
import en from '../locales/en'
import ar from '../locales/ar'

const translations = { en, ar }

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem('corehr_lang') || 'en')

  const setLang = (newLang) => {
    setLangState(newLang)
    localStorage.setItem('corehr_lang', newLang)
  }

  useEffect(() => {
    const dir = lang === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.dir  = dir
    document.documentElement.lang = lang
    document.body.style.fontFamily = lang === 'ar'
      ? "'Cairo', 'Noto Kufi Arabic', 'Segoe UI', sans-serif"
      : "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
  }, [lang])

  // Simple nested key resolver: t('nav.items.dashboard')
  const t = (key) => {
    const val = key.split('.').reduce((obj, k) => obj?.[k], translations[lang])
    return val ?? key
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, isRTL: lang === 'ar' }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLang = () => useContext(LanguageContext)
