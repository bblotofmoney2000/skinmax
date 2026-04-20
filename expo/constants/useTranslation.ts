import { getLocales } from 'expo-localization';
import { useMemo } from 'react';
import { translations, Language, TranslationKeys } from './translations';

export function useTranslation(): TranslationKeys {
  const locale = useMemo(() => {
    const locales = getLocales();
    const deviceLanguage = locales[0]?.languageCode || 'en';
    
    console.log('Device language:', deviceLanguage);
    
    if (deviceLanguage === 'fr') {
      return 'fr' as Language;
    }
    
    return 'en' as Language;
  }, []);

  return translations[locale];
}
