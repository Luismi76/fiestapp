'use client';

import { useState } from 'react';
import logger from '@/lib/logger';

interface TranslateButtonProps {
  messageId: string;
  originalText: string;
  originalLang?: string;
  translations?: Record<string, string>;
  targetLang?: string;
  onTranslate: (messageId: string, targetLang: string) => Promise<{
    translatedText: string;
    detectedLanguage?: string;
  }>;
  compact?: boolean;
}

const LANGUAGE_NAMES: Record<string, string> = {
  es: 'Español',
  en: 'Inglés',
  fr: 'Francés',
  de: 'Alemán',
  it: 'Italiano',
  pt: 'Portugués',
  ca: 'Catalán',
  eu: 'Euskera',
  gl: 'Gallego',
};

export default function TranslateButton({
  messageId,
  originalText,
  originalLang,
  translations = {},
  targetLang = 'es',
  onTranslate,
  compact = false,
}: TranslateButtonProps) {
  const [loading, setLoading] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [translation, setTranslation] = useState<string | null>(
    translations?.[targetLang] || null
  );
  const [detectedLang, setDetectedLang] = useState<string | null>(originalLang || null);
  const [error, setError] = useState<string | null>(null);

  // Don't show button if original language matches target
  if (detectedLang && detectedLang === targetLang) {
    return null;
  }

  const handleTranslate = async () => {
    // If we already have the translation, just toggle visibility
    if (translation) {
      setShowTranslation(!showTranslation);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await onTranslate(messageId, targetLang);
      setTranslation(result.translatedText);
      if (result.detectedLanguage) {
        setDetectedLang(result.detectedLanguage);
      }
      setShowTranslation(true);
    } catch (err) {
      logger.error('Translation error:', err);
      setError('No se pudo traducir');
    } finally {
      setLoading(false);
    }
  };

  if (compact) {
    return (
      <div className="inline-flex flex-col">
        <button
          onClick={handleTranslate}
          disabled={loading}
          className="text-xs text-gray-400 hover:text-primary transition-colors inline-flex items-center gap-1"
          title="Traducir mensaje"
        >
          {loading ? (
            <span className="inline-block w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="m10.5 21 5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 0 1 6-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 0 1-3.827-5.802" />
            </svg>
          )}
          {showTranslation ? 'Ver original' : 'Traducir'}
        </button>

        {showTranslation && translation && (
          <p className="text-sm text-gray-500 italic mt-1 pl-1 border-l-2 border-gray-200">
            {translation}
          </p>
        )}

        {error && (
          <span className="text-xs text-red-500">{error}</span>
        )}
      </div>
    );
  }

  return (
    <div className="mt-2">
      <button
        onClick={handleTranslate}
        disabled={loading}
        className="text-xs px-2 py-1 text-gray-500 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors inline-flex items-center gap-1"
      >
        {loading ? (
          <>
            <span className="inline-block w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
            Traduciendo...
          </>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="m10.5 21 5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 0 1 6-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 0 1-3.827-5.802" />
            </svg>
            {showTranslation ? 'Ver original' : `Traducir a ${LANGUAGE_NAMES[targetLang] || targetLang}`}
          </>
        )}
      </button>

      {showTranslation && translation && (
        <div className="mt-2 p-2 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-1 text-xs text-gray-400 mb-1">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3">
              <path strokeLinecap="round" strokeLinejoin="round" d="m10.5 21 5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 0 1 6-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 0 1-3.827-5.802" />
            </svg>
            <span>
              Traducido {detectedLang ? `desde ${LANGUAGE_NAMES[detectedLang] || detectedLang}` : ''}
            </span>
          </div>
          <p className="text-sm text-gray-700">{translation}</p>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-500 mt-1">{error}</p>
      )}
    </div>
  );
}
