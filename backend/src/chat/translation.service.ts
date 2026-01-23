import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

// Idiomas soportados
export const SUPPORTED_LANGUAGES = [
  { code: 'es', name: 'Español' },
  { code: 'en', name: 'English' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'it', name: 'Italiano' },
  { code: 'pt', name: 'Português' },
  { code: 'ca', name: 'Català' },
  { code: 'eu', name: 'Euskara' },
  { code: 'gl', name: 'Galego' },
];

interface TranslationResult {
  translatedText: string;
  detectedLanguage?: string;
}

type TranslationProvider = 'libretranslate' | 'mymemory' | 'google';

@Injectable()
export class TranslationService {
  private readonly provider: TranslationProvider;
  private readonly googleApiKey?: string;
  private readonly libreTranslateUrl: string;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.googleApiKey = this.configService.get('GOOGLE_TRANSLATE_API_KEY');
    this.libreTranslateUrl = this.configService.get('LIBRETRANSLATE_URL') || 'https://libretranslate.com';

    // Determinar proveedor: Google si hay API key, sino LibreTranslate
    this.provider = this.googleApiKey ? 'google' : 'libretranslate';
    console.log(`[TranslationService] Using provider: ${this.provider}`);
  }

  /**
   * Traduce un mensaje por su ID (usado por WebSocket gateway)
   */
  async translateMessage(
    messageId: string,
    targetLang: string,
  ): Promise<TranslationResult> {
    // Obtener mensaje
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new Error('Mensaje no encontrado');
    }

    // Verificar si ya tenemos la traducción en caché
    const translations = (message.translations as Record<string, string>) || {};
    if (translations[targetLang]) {
      return {
        translatedText: translations[targetLang],
        detectedLanguage: message.originalLang || undefined,
      };
    }

    // Traducir
    const result = await this.translate(message.content, targetLang);

    // Guardar en caché
    translations[targetLang] = result.translatedText;
    await this.prisma.message.update({
      where: { id: messageId },
      data: {
        translations,
        originalLang: result.detectedLanguage || message.originalLang,
      },
    });

    return result;
  }

  /**
   * Traduce texto directamente (usado por REST controller)
   */
  async translateText(
    text: string,
    targetLang: string,
  ): Promise<TranslationResult> {
    return this.translate(text, targetLang);
  }

  private async translate(
    text: string,
    targetLang: string,
  ): Promise<TranslationResult> {
    switch (this.provider) {
      case 'google':
        return this.translateWithGoogle(text, targetLang);
      case 'mymemory':
        return this.translateWithMyMemory(text, targetLang);
      case 'libretranslate':
      default:
        return this.translateWithLibreTranslate(text, targetLang);
    }
  }

  // LibreTranslate - Gratuito y open source
  private async translateWithLibreTranslate(
    text: string,
    targetLang: string,
  ): Promise<TranslationResult> {
    try {
      // Detectar idioma primero
      const detectResponse = await fetch(`${this.libreTranslateUrl}/detect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: text }),
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      if (!detectResponse.ok) {
        console.log('[TranslationService] LibreTranslate detect failed, falling back to MyMemory');
        throw new Error('LibreTranslate not available');
      }

      const detectData = await detectResponse.json();
      const detectedLang = detectData[0]?.language;

      if (!detectedLang) {
        console.log('[TranslationService] Could not detect language, falling back to MyMemory');
        throw new Error('Could not detect language');
      }

      // Si ya está en el idioma objetivo, devolver original
      if (detectedLang === targetLang) {
        return { translatedText: text, detectedLanguage: detectedLang };
      }

      // Traducir
      const response = await fetch(`${this.libreTranslateUrl}/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: text,
          source: detectedLang,
          target: targetLang,
          format: 'text',
        }),
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      if (!response.ok) {
        throw new Error(`LibreTranslate error: ${response.status}`);
      }

      const data = await response.json();
      return {
        translatedText: data.translatedText,
        detectedLanguage: detectedLang,
      };
    } catch (error) {
      console.error('LibreTranslate error:', error);
      return this.translateWithMyMemory(text, targetLang);
    }
  }

  // MyMemory - Gratuito, 5000 palabras/día
  private async translateWithMyMemory(
    text: string,
    targetLang: string,
  ): Promise<TranslationResult> {
    try {
      const detectedLang = this.detectLanguage(text);

      if (detectedLang === targetLang) {
        return { translatedText: text, detectedLanguage: detectedLang };
      }

      const langPair = `${detectedLang}|${targetLang}`;
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langPair}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`MyMemory error: ${response.status}`);
      }

      const data = await response.json();

      if (data.responseStatus === 200 && data.responseData?.translatedText) {
        return {
          translatedText: data.responseData.translatedText,
          detectedLanguage: detectedLang,
        };
      }

      throw new Error('MyMemory returned invalid response');
    } catch (error) {
      console.error('MyMemory error:', error);
      return this.mockTranslate(text, targetLang);
    }
  }

  // Google Translate - Requiere API key
  private async translateWithGoogle(
    text: string,
    targetLang: string,
  ): Promise<TranslationResult> {
    try {
      const response = await fetch(
        `https://translation.googleapis.com/language/translate/v2?key=${this.googleApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            q: text,
            target: targetLang,
            format: 'text',
          }),
        },
      );

      if (!response.ok) {
        throw new Error('Google Translate API error');
      }

      const data = await response.json();
      const translation = data.data.translations[0];

      return {
        translatedText: translation.translatedText,
        detectedLanguage: translation.detectedSourceLanguage,
      };
    } catch (error) {
      console.error('Google Translate error:', error);
      return this.translateWithMyMemory(text, targetLang);
    }
  }

  private mockTranslate(
    text: string,
    targetLang: string,
  ): TranslationResult {
    // Detectar idioma simple (basado en palabras comunes)
    const detectedLang = this.detectLanguage(text);

    // Si el idioma detectado es el mismo que el objetivo, devolver el texto original
    if (detectedLang === targetLang) {
      return {
        translatedText: text,
        detectedLanguage: detectedLang,
      };
    }

    // En desarrollo, simplemente indicar que es una traducción mock
    return {
      translatedText: `[${targetLang.toUpperCase()}] ${text}`,
      detectedLanguage: detectedLang,
    };
  }

  private detectLanguage(text: string): string {
    const lowerText = ` ${text.toLowerCase()} `; // Add spaces for word boundary matching

    // Palabras comunes en español (con espacio para coincidencia de palabras completas)
    const spanishWords = [' hola ', ' gracias ', ' buenos ', ' días ', ' qué ', ' cómo ', ' estás ', ' dónde ', ' cuándo ', ' quiero ', ' tengo ', ' vamos ', ' este ', ' esta ', ' para ', ' pero ', ' porque ', ' cuando ', ' donde ', ' muy ', ' bien ', ' más ', ' menos ', ' todo ', ' nada ', ' algo ', ' mucho ', ' poco '];
    // Palabras comunes en inglés
    const englishWords = [' hello ', ' thanks ', ' good ', ' morning ', ' what ', ' how ', ' are ', ' where ', ' when ', ' want ', ' have ', ' this ', ' that ', ' the ', ' for ', ' but ', ' because ', ' very ', ' well ', ' more ', ' less ', ' all ', ' nothing ', ' something ', ' much ', ' little ', ' going ', ' weekend ', ' today ', ' tomorrow ', ' would ', ' could ', ' should ', ' will '];
    // Palabras comunes en francés
    const frenchWords = [' bonjour ', ' merci ', ' comment ', ' allez ', ' vous ', ' bien ', ' oui ', ' non ', ' je ', ' tu ', ' nous ', ' avec ', ' pour ', ' mais ', ' parce ', ' très ', ' plus ', ' moins ', ' tout ', ' rien ', ' quelque '];

    let spanishCount = 0;
    let englishCount = 0;
    let frenchCount = 0;

    spanishWords.forEach((word) => {
      if (lowerText.includes(word)) spanishCount++;
    });
    englishWords.forEach((word) => {
      if (lowerText.includes(word)) englishCount++;
    });
    frenchWords.forEach((word) => {
      if (lowerText.includes(word)) frenchCount++;
    });

    console.log(`[TranslationService] Language detection for "${text}": es=${spanishCount}, en=${englishCount}, fr=${frenchCount}`);

    if (englishCount > spanishCount && englishCount > frenchCount) {
      return 'en';
    }
    if (frenchCount > spanishCount && frenchCount > englishCount) {
      return 'fr';
    }
    return 'es'; // Default a español
  }

  getSupportedLanguages() {
    return SUPPORTED_LANGUAGES;
  }
}
