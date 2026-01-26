/**
 * Utilidades para optimización de imágenes con Cloudinary
 */

// Cloudinary configuration
const CLOUDINARY_CLOUD_NAME = 'dxgwtqbtt';
const CLOUDINARY_BASE_URL = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image`;

/**
 * Tipos de transformación de imagen
 */
export type ImageFormat = 'auto' | 'webp' | 'avif' | 'jpg' | 'png';
export type ImageFit = 'fill' | 'scale' | 'fit' | 'pad' | 'crop' | 'thumb';
export type ImageGravity = 'auto' | 'face' | 'center' | 'north' | 'south' | 'east' | 'west';

export interface ImageOptions {
  width?: number;
  height?: number;
  quality?: number | 'auto';
  format?: ImageFormat;
  fit?: ImageFit;
  gravity?: ImageGravity;
  dpr?: number;
  blur?: number;
}

/**
 * Detecta si una URL es de Cloudinary
 */
export function isCloudinaryUrl(url: string): boolean {
  return url.includes('cloudinary.com') || url.includes('res.cloudinary');
}

/**
 * Extrae el public_id de una URL de Cloudinary (incluyendo extensión)
 */
export function extractPublicId(url: string): string | null {
  if (!isCloudinaryUrl(url)) return null;

  // Formato: https://res.cloudinary.com/{cloud}/image/upload/v{version}/{public_id}.{ext}
  // o con transformaciones: .../upload/f_auto,q_auto/{public_id}.{ext}
  const match = url.match(/\/upload\/(?:v\d+\/)?(?:[a-z_]+[,:][^/]+\/)*(.+)$/);
  return match ? match[1] : null;
}

/**
 * Genera una URL de Cloudinary optimizada con transformaciones
 * Inserta las transformaciones en la URL original (preserva el cloud name)
 */
export function optimizeImage(url: string, options: ImageOptions = {}): string {
  // Si no es una URL de Cloudinary, devolver tal cual
  if (!isCloudinaryUrl(url)) {
    return url;
  }

  const {
    width,
    height,
    quality = 'auto',
    format = 'auto',
    fit = 'fill',
    gravity = 'auto',
    dpr,
    blur,
  } = options;

  const transformations: string[] = [];

  // Formato y calidad automáticos
  transformations.push(`f_${format}`);
  transformations.push(`q_${quality}`);

  // Dimensiones
  if (width) transformations.push(`w_${width}`);
  if (height) transformations.push(`h_${height}`);

  // Modo de ajuste
  transformations.push(`c_${fit}`);

  // Gravedad (punto focal)
  if (fit === 'fill' || fit === 'crop' || fit === 'thumb') {
    transformations.push(`g_${gravity}`);
  }

  // DPR para pantallas de alta resolución
  if (dpr) transformations.push(`dpr_${dpr}`);

  // Blur para placeholders
  if (blur) transformations.push(`e_blur:${blur}`);

  // Insertar transformaciones después de /upload/ en la URL original
  // Esto preserva el cloud name original de la URL
  const transformStr = transformations.join(',');
  return url.replace('/upload/', `/upload/${transformStr}/`);
}

/**
 * Genera URLs para srcset responsive
 */
export function generateSrcSet(
  url: string,
  widths: number[] = [320, 640, 960, 1280, 1920],
  options: Omit<ImageOptions, 'width'> = {}
): string {
  if (!isCloudinaryUrl(url)) return url;

  return widths
    .map((w) => `${optimizeImage(url, { ...options, width: w })} ${w}w`)
    .join(', ');
}

/**
 * Genera URL para placeholder blur
 */
export function getBlurPlaceholder(url: string): string {
  return optimizeImage(url, {
    width: 20,
    quality: 30,
    blur: 1000,
  });
}

/**
 * Presets de tamaños comunes
 */
export const IMAGE_PRESETS = {
  // Avatares
  avatarSmall: { width: 40, height: 40, fit: 'fill' as ImageFit, gravity: 'face' as ImageGravity },
  avatarMedium: { width: 80, height: 80, fit: 'fill' as ImageFit, gravity: 'face' as ImageGravity },
  avatarLarge: { width: 160, height: 160, fit: 'fill' as ImageFit, gravity: 'face' as ImageGravity },

  // Tarjetas de experiencia
  cardThumbnail: { width: 400, height: 300, fit: 'fill' as ImageFit },
  cardLarge: { width: 800, height: 600, fit: 'fill' as ImageFit },

  // Galería de experiencia
  galleryThumbnail: { width: 150, height: 150, fit: 'fill' as ImageFit },
  galleryMain: { width: 1200, height: 800, fit: 'fill' as ImageFit },

  // Hero/Banner
  heroBanner: { width: 1920, height: 600, fit: 'fill' as ImageFit },

  // Festival
  festivalCard: { width: 600, height: 400, fit: 'fill' as ImageFit },
};

/**
 * Aplica un preset de imagen
 */
export function applyPreset(url: string, preset: keyof typeof IMAGE_PRESETS): string {
  return optimizeImage(url, IMAGE_PRESETS[preset]);
}

/**
 * Genera props para componente Image de Next.js
 */
export function getNextImageProps(url: string, options: ImageOptions = {}) {
  const optimizedUrl = optimizeImage(url, options);
  const blurDataURL = getBlurPlaceholder(url);

  return {
    src: optimizedUrl,
    blurDataURL,
    placeholder: 'blur' as const,
  };
}

/**
 * Hook-friendly: Genera todas las URLs necesarias para una imagen
 */
export function prepareImage(url: string, options: ImageOptions = {}) {
  return {
    src: optimizeImage(url, options),
    srcSet: generateSrcSet(url, undefined, options),
    placeholder: getBlurPlaceholder(url),
    isCloudinary: isCloudinaryUrl(url),
  };
}
