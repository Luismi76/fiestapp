import type { Step } from 'react-joyride';
import type { TourId } from '@/lib/api';

/**
 * Definición declarativa de los tours.
 *
 * Cada tour referencia elementos del DOM mediante `data-tour="..."`.
 * Los componentes de la app deben añadir esos atributos para que el tour
 * pueda anclar los pasos. Si un selector no existe en la página actual,
 * Joyride simplemente lo omite.
 */

export interface TourDefinition {
  id: TourId;
  /** Título humano usado en la UI de "ver tutoriales" */
  title: string;
  /** Descripción corta para listados */
  description: string;
  /** Página recomendada para iniciar el tour (para el botón de "ver de nuevo") */
  startPath: string;
  steps: Step[];
}

// En Joyride v3 los pasos ya no tienen `disableBeacon`. El beacon se controla
// desde las options globales (`skipBeacon: true`) y se aplica a todos los pasos.

export const welcomeTour: TourDefinition = {
  id: 'welcome',
  title: 'Bienvenida a FiestApp',
  description:
    'Recorrido inicial por las secciones principales de la aplicación.',
  startPath: '/dashboard',
  steps: [
    {
      target: 'body',
      placement: 'center',
      title: '¡Bienvenido a FiestApp!',
      content:
        'Descubre fiestas populares españolas y conecta con anfitriones locales para vivirlas con quien las conoce de verdad. Te enseñamos lo básico en menos de un minuto.',
    },
    {
      target: '[data-tour="nav-experiences"]',
      title: 'Explora experiencias',
      content:
        'Desde aquí puedes buscar experiencias publicadas por anfitriones: precios, intercambios o ambos.',
    },
    {
      target: '[data-tour="nav-matches"]',
      title: 'Tus mensajes y reservas',
      content:
        'Aquí ves todas tus solicitudes y los chats con los anfitriones (o viajeros, si tú eres el anfitrión).',
    },
    {
      target: 'body',
      placement: 'center',
      title: 'Tu perfil',
      content:
        'Toca tu avatar (arriba a la derecha en el dashboard, o en el menú) para acceder a tu perfil. Desde ahí puedes editar tus datos, gestionar tu monedero, configurar tu cuenta de Stripe Connect (si eres anfitrión) y volver a ver estos tutoriales en cualquier momento.',
    },
    {
      target: 'body',
      placement: 'center',
      title: '¡Listo para empezar!',
      content:
        'Para reservar tu primera experiencia necesitarás un pack de operaciones en tu monedero. Cada solicitud aceptada consume 1 operación. Diviértete explorando.',
    },
  ],
};

export const bookingTour: TourDefinition = {
  id: 'booking',
  title: 'Cómo reservar una experiencia',
  description: 'Te mostramos cómo enviar una solicitud y qué pasa después.',
  startPath: '/experiences',
  steps: [
    {
      target: '[data-tour="experience-price"]',
      title: 'Precio y modalidad',
      content:
        'Cada experiencia indica si es de pago, intercambio o ambas. El precio mostrado es lo que pagarás al anfitrión.',
    },
    {
      target: '[data-tour="experience-dates"]',
      title: 'Fechas disponibles',
      content:
        'Selecciona las fechas en las que quieres vivir la experiencia. El anfitrión deberá confirmarlas.',
    },
    {
      target: '[data-tour="experience-request"]',
      title: 'Enviar solicitud',
      content:
        'Cuando envíes la solicitud, el anfitrión recibirá una notificación. Hasta que no la acepte, no se cobra nada.',
    },
    {
      target: 'body',
      placement: 'center',
      title: '¿Y luego qué?',
      content:
        'Si el anfitrión acepta, abrimos un chat para coordinaros y pasarás al pago. Recuerda: necesitas operaciones disponibles en tu monedero.',
    },
  ],
};

export const hostTour: TourDefinition = {
  id: 'host',
  title: 'Convierte en anfitrión',
  description:
    'Pasos para publicar tu primera experiencia y empezar a recibir reservas.',
  startPath: '/experiences/new',
  steps: [
    {
      target: '[data-tour="experience-form-basics"]',
      title: 'Datos básicos',
      content:
        'Pon un título descriptivo, elige el festival al que se asocia y añade una buena descripción de lo que ofreces.',
    },
    {
      target: '[data-tour="experience-form-mode"]',
      title: 'Modalidad y precio',
      content:
        'Decide si tu experiencia es de pago, intercambio o mixta. Si es de pago, define el importe que recibirás (FiestApp añade su comisión por encima).',
    },
    {
      target: '[data-tour="experience-form-deposit"]',
      title: 'Depósito (opcional)',
      content:
        'Para experiencias muy adelantadas en el tiempo puedes pedir un depósito ahora y cobrar el resto automáticamente unos días antes del evento.',
    },
    {
      target: '[data-tour="experience-form-publish"]',
      title: 'Publicar',
      content:
        'Cuando publiques, los viajeros podrán enviarte solicitudes. Para cobrar necesitarás completar tu cuenta de Stripe Connect desde tu perfil.',
    },
  ],
};

export const paymentTour: TourDefinition = {
  id: 'payment',
  title: 'Modos de pago de una reserva',
  description: 'Diferencias entre pago inmediato, retención y depósito.',
  startPath: '/matches',
  steps: [
    {
      target: '[data-tour="payment-mode-immediate"]',
      title: 'Pago inmediato',
      content:
        'Disponible si la experiencia es en menos de 7 días: el cargo se hace ahora y el anfitrión lo recibe el día del evento.',
    },
    {
      target: '[data-tour="payment-mode-hold"]',
      title: 'Pago con retención',
      content:
        'Para experiencias en menos de 6 meses: retenemos el importe en tu tarjeta y solo se cobra cuando la experiencia se completa.',
    },
    {
      target: '[data-tour="payment-mode-deposit"]',
      title: 'Depósito + resto',
      content:
        'Para experiencias muy lejanas: pagas un depósito ahora y el resto se cobra automáticamente unos días antes. Ideal para reservas con mucha anticipación.',
    },
    {
      target: 'body',
      placement: 'center',
      title: 'Política de cancelación',
      content:
        'Si cancelas tú, asumes la comisión de Stripe del depósito. Si cancela el anfitrión, la asume él. En casos de fuerza mayor, FiestApp absorbe los costes y ambos recuperáis vuestras operaciones.',
    },
  ],
};

export const tourRegistry: Record<TourId, TourDefinition> = {
  welcome: welcomeTour,
  booking: bookingTour,
  host: hostTour,
  payment: paymentTour,
};

export const allTours: TourDefinition[] = [
  welcomeTour,
  bookingTour,
  hostTour,
  paymentTour,
];
