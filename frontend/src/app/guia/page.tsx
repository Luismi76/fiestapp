'use client';

import { useState } from 'react';
import Link from 'next/link';
import MainLayout from '@/components/MainLayout';
import { useAuth } from '@/contexts/AuthContext';

type SectionId = string;

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className={`w-5 h-5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

function StepNumber({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold text-white shrink-0" style={{ background: 'var(--gradient-primary)' }}>
      {n}
    </span>
  );
}

function AccordionSection({
  id,
  icon,
  title,
  openSections,
  toggle,
  children,
}: {
  id: SectionId;
  icon: string;
  title: string;
  openSections: Set<SectionId>;
  toggle: (id: SectionId) => void;
  children: React.ReactNode;
}) {
  const isOpen = openSections.has(id);
  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => toggle(id)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-[var(--surface-tile)] transition-colors"
        aria-expanded={isOpen}
      >
        <span className="text-2xl">{icon}</span>
        <span className="flex-1 font-semibold text-[var(--text-primary)]">{title}</span>
        <ChevronIcon open={isOpen} />
      </button>
      {isOpen && (
        <div className="px-5 pb-5 space-y-4 text-[var(--text-secondary)] text-[15px] leading-relaxed animate-[fade-in_200ms_ease-out]">
          {children}
        </div>
      )}
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 items-start">
      <StepNumber n={n} />
      <div className="pt-0.5">{children}</div>
    </div>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 items-start bg-[var(--accent)]/10 rounded-xl px-4 py-3 text-sm">
      <span className="text-lg shrink-0">💡</span>
      <span className="text-[var(--text-primary)]">{children}</span>
    </div>
  );
}

/* ─── SECCIONES VIAJERO ─── */

function ViajeroSections({ openSections, toggle }: { openSections: Set<SectionId>; toggle: (id: SectionId) => void }) {
  return (
    <div className="space-y-3">
      <AccordionSection id="v-registro" icon="📝" title="Registro y verificación" openSections={openSections} toggle={toggle}>
        <Step n={1}>
          <p>Ve a <strong>Registrarse</strong> desde la pantalla de inicio. Puedes registrarte con tu email o directamente con <strong>Google</strong>.</p>
        </Step>
        <Step n={2}>
          <p>Rellena tus datos: nombre, email, contraseña, edad y ciudad. Opcionalmente puedes indicar si viajas en pareja o con hijos.</p>
        </Step>
        <Step n={3}>
          <p>Confirma tu email haciendo clic en el enlace que recibirás en tu bandeja de entrada.</p>
        </Step>
        <Step n={4}>
          <p>Para mayor confianza, puedes <strong>verificar tu identidad</strong> desde <em>Perfil &gt; Verificar identidad</em>. Los perfiles verificados generan más confianza entre anfitriones.</p>
        </Step>
        <Tip>Un perfil completo con foto, bio y ciudad aumenta tus posibilidades de que te acepten.</Tip>
      </AccordionSection>

      <AccordionSection id="v-explorar" icon="🔍" title="Buscar experiencias" openSections={openSections} toggle={toggle}>
        <Step n={1}>
          <p>Desde la pestaña <strong>Explorar</strong> verás el catálogo de experiencias disponibles.</p>
        </Step>
        <Step n={2}>
          <p>Usa los <strong>filtros</strong> para refinar la búsqueda: tipo (pago, intercambio o flexible), festival, ciudad, rango de precio y ordenamiento.</p>
        </Step>
        <Step n={3}>
          <p>También puedes descubrir experiencias desde el <strong>Mapa</strong> interactivo o el <strong>Calendario</strong> de festividades.</p>
        </Step>
        <Step n={4}>
          <p>Haz clic en una experiencia para ver todos los detalles: fotos, descripción, reseñas, disponibilidad y precio.</p>
        </Step>
        <Tip>Guarda tus experiencias favoritas con el corazón para acceder fácilmente después desde Favoritos.</Tip>
      </AccordionSection>

      <AccordionSection id="v-solicitar" icon="🎫" title="Solicitar una experiencia" openSections={openSections} toggle={toggle}>
        <Step n={1}>
          <p>Dentro del detalle de una experiencia, pulsa <strong>&quot;Solicitar&quot;</strong>.</p>
        </Step>
        <Step n={2}>
          <p>Selecciona el <strong>número de participantes</strong> y las <strong>fechas</strong> disponibles.</p>
        </Step>
        <Step n={3}>
          <p>Si la experiencia es de tipo <strong>intercambio</strong>, elige cuál de tus experiencias ofreces a cambio.</p>
        </Step>
        <Step n={4}>
          <p>Escribe un <strong>mensaje personalizado</strong> al anfitrión explicando por qué te interesa.</p>
        </Step>
        <Step n={5}>
          <p>Revisa el resumen (precio total, fechas, participantes) y pulsa <strong>Enviar solicitud</strong>.</p>
        </Step>
        <Tip>Un mensaje personalizado y detallado aumenta mucho las posibilidades de aceptación.</Tip>
      </AccordionSection>

      <AccordionSection id="v-chat" icon="💬" title="Chat y comunicación" openSections={openSections} toggle={toggle}>
        <Step n={1}>
          <p>Una vez enviada tu solicitud, se abre un <strong>chat directo</strong> con el anfitrión desde la sección <strong>Mensajes</strong>.</p>
        </Step>
        <Step n={2}>
          <p>Puedes enviar <strong>mensajes de texto</strong>, <strong>notas de voz</strong>, <strong>ubicaciones</strong> y usar <strong>respuestas rápidas</strong>.</p>
        </Step>
        <Step n={3}>
          <p>Si el anfitrión habla otro idioma, usa el botón de <strong>traducir</strong> en cada mensaje.</p>
        </Step>
        <Tip>La barra de progreso en la parte superior del chat te muestra el estado actual de tu solicitud.</Tip>
      </AccordionSection>

      <AccordionSection id="v-pago" icon="💳" title="Pagos y monedero" openSections={openSections} toggle={toggle}>
        <Step n={1}>
          <p>Si la experiencia es de pago, una vez aceptada tu solicitud verás el botón <strong>&quot;Pagar experiencia&quot;</strong> en el chat.</p>
        </Step>
        <Step n={2}>
          <p>El pago se realiza de forma segura a través de <strong>Stripe</strong>. Tu dinero queda en garantía hasta que se confirme la finalización.</p>
        </Step>
        <Step n={3}>
          <p>Desde <strong>Monedero</strong> puedes recargar saldo, ver tu historial de transacciones y el detalle de comisiones.</p>
        </Step>
        <Tip>La plataforma cobra una comisión de 1,50 EUR por acuerdo completado. Los intercambios son gratuitos.</Tip>
      </AccordionSection>

      <AccordionSection id="v-finalizar" icon="✅" title="Finalizar y valorar" openSections={openSections} toggle={toggle}>
        <Step n={1}>
          <p>Tras vivir la experiencia, entra al chat y pulsa <strong>&quot;Confirmar finalización&quot;</strong>.</p>
        </Step>
        <Step n={2}>
          <p>Ambas partes (viajero y anfitrión) deben confirmar para que el match se marque como <strong>completado</strong>.</p>
        </Step>
        <Step n={3}>
          <p>Una vez completado, podrás dejar una <strong>valoración</strong> con estrellas (1-5) y un comentario.</p>
        </Step>
        <Tip>Tus valoraciones ayudan a otros viajeros a elegir y premian a los buenos anfitriones.</Tip>
      </AccordionSection>

      <AccordionSection id="v-disputas" icon="⚖️" title="Disputas y problemas" openSections={openSections} toggle={toggle}>
        <p>Si algo no sale como esperabas, puedes abrir una <strong>disputa</strong> desde el chat del match:</p>
        <Step n={1}>
          <p>Pulsa <strong>&quot;Abrir disputa&quot;</strong> y selecciona el motivo: no-show, experiencia diferente, problema de seguridad, pago u otro.</p>
        </Step>
        <Step n={2}>
          <p>Describe lo ocurrido y adjunta <strong>evidencias</strong> (fotos, capturas).</p>
        </Step>
        <Step n={3}>
          <p>El equipo de FiestApp revisará el caso y resolverá con un posible <strong>reembolso total o parcial</strong>.</p>
        </Step>
        <Tip>Siempre intenta resolver el problema hablando primero con el anfitrión por el chat.</Tip>
      </AccordionSection>

      <AccordionSection id="v-favoritos" icon="❤️" title="Favoritos y alertas" openSections={openSections} toggle={toggle}>
        <Step n={1}>
          <p>Pulsa el <strong>corazón</strong> en cualquier experiencia o festival para guardarlo en Favoritos.</p>
        </Step>
        <Step n={2}>
          <p>Desde la sección <strong>Favoritos</strong> puedes ver todas tus experiencias y festivales guardados.</p>
        </Step>
        <Step n={3}>
          <p>Activa las <strong>alertas de disponibilidad</strong> para recibir una notificación cuando se libere una plaza.</p>
        </Step>
      </AccordionSection>

      <AccordionSection id="v-calendario" icon="📅" title="Calendario de festividades" openSections={openSections} toggle={toggle}>
        <Step n={1}>
          <p>Accede al <strong>Calendario</strong> para ver todas las fiestas populares organizadas por mes.</p>
        </Step>
        <Step n={2}>
          <p>Alterna entre <strong>festividades</strong> y <strong>experiencias</strong> con el selector.</p>
        </Step>
        <Step n={3}>
          <p>Puedes <strong>descargar</strong> el calendario en formato iCal o añadirlo directamente a <strong>Google Calendar</strong>.</p>
        </Step>
      </AccordionSection>
    </div>
  );
}

/* ─── SECCIONES ANFITRION ─── */

function AnfitrionSections({ openSections, toggle }: { openSections: Set<SectionId>; toggle: (id: SectionId) => void }) {
  return (
    <div className="space-y-3">
      <AccordionSection id="a-crear" icon="🎉" title="Crear una experiencia" openSections={openSections} toggle={toggle}>
        <Step n={1}>
          <p>Pulsa el botón <strong>&quot;+&quot;</strong> en la navegación (o <strong>&quot;Crear experiencia&quot;</strong> en el header).</p>
        </Step>
        <Step n={2}>
          <p><strong>Paso 1 - Qué ofreces:</strong> Título, descripción, categoría, ciudad, tipo (pago, intercambio o flexible), puntos clave y capacidad máxima.</p>
        </Step>
        <Step n={3}>
          <p><strong>Paso 2 - Fotos y disponibilidad:</strong> Sube fotos atractivas de tu experiencia, define los días disponibles en el calendario y elige la política de cancelación.</p>
        </Step>
        <Step n={4}>
          <p><strong>Paso 3 - Revisar y publicar:</strong> Revisa todos los detalles, opcionalmente configura precios por grupo, y publica.</p>
        </Step>
        <Tip>Tu experiencia se guarda automáticamente como borrador. Puedes volver a editarla antes de publicar.</Tip>
      </AccordionSection>

      <AccordionSection id="a-gestionar" icon="📋" title="Gestionar mis experiencias" openSections={openSections} toggle={toggle}>
        <Step n={1}>
          <p>Desde <strong>Mis Experiencias</strong> verás todas las que has creado con su estado (publicada/borrador).</p>
        </Step>
        <Step n={2}>
          <p>Puedes <strong>editar</strong> cualquier dato, <strong>activar/desactivar</strong> la publicación o <strong>eliminar</strong> experiencias.</p>
        </Step>
        <Step n={3}>
          <p>Cada experiencia muestra el número de solicitudes recibidas y su valoración media.</p>
        </Step>
        <Tip>Si necesitas pausar temporalmente, desactiva la publicación en lugar de eliminar para conservar las reseñas.</Tip>
      </AccordionSection>

      <AccordionSection id="a-precios" icon="💰" title="Precios y precios por grupo" openSections={openSections} toggle={toggle}>
        <p>Puedes configurar precios diferenciados según el tamaño del grupo:</p>
        <Step n={1}>
          <p>En la edición de tu experiencia, accede a <strong>Precios por grupo</strong>.</p>
        </Step>
        <Step n={2}>
          <p>Define <strong>tramos</strong>: por ejemplo, 1-2 personas a 25 EUR/persona, 3-5 personas a 20 EUR/persona.</p>
        </Step>
        <Step n={3}>
          <p>El precio se calculará automáticamente según el número de participantes que indique el viajero.</p>
        </Step>
        <Tip>Los precios por grupo son opcionales. Si no los configuras, se usará el precio base para todos.</Tip>
      </AccordionSection>

      <AccordionSection id="a-solicitudes" icon="📩" title="Gestionar solicitudes" openSections={openSections} toggle={toggle}>
        <Step n={1}>
          <p>Las solicitudes de viajeros aparecen en la pestaña <strong>&quot;Recibidas&quot;</strong> de Mensajes.</p>
        </Step>
        <Step n={2}>
          <p>Entra al chat para leer el mensaje del viajero y conocer sus detalles.</p>
        </Step>
        <Step n={3}>
          <p>Puedes <strong>aceptar</strong> o <strong>rechazar</strong> la solicitud. Al aceptar, puedes ajustar las fechas si es necesario.</p>
        </Step>
        <Step n={4}>
          <p>Si es una experiencia de pago, el viajero procederá al pago tras tu aceptación.</p>
        </Step>
        <Tip>Responde rápido a las solicitudes. Los anfitriones con mejor tiempo de respuesta aparecen mejor posicionados.</Tip>
      </AccordionSection>

      <AccordionSection id="a-chat" icon="💬" title="Comunicación con viajeros" openSections={openSections} toggle={toggle}>
        <Step n={1}>
          <p>Usa el <strong>chat</strong> para resolver dudas, compartir detalles logísticos y coordinar el punto de encuentro.</p>
        </Step>
        <Step n={2}>
          <p>Envía <strong>ubicaciones</strong> para facilitar el encuentro, y <strong>notas de voz</strong> para explicaciones más personales.</p>
        </Step>
        <Step n={3}>
          <p>Las <strong>respuestas rápidas</strong> te permiten configurar mensajes frecuentes para ahorrar tiempo.</p>
        </Step>
        <Tip>Puedes personalizar tus respuestas rápidas desde el icono de respuestas rápidas en el chat.</Tip>
      </AccordionSection>

      <AccordionSection id="a-cobros" icon="🏦" title="Cobros y monedero" openSections={openSections} toggle={toggle}>
        <Step n={1}>
          <p>Los pagos de los viajeros quedan en <strong>garantía</strong> hasta que ambas partes confirmen la finalización.</p>
        </Step>
        <Step n={2}>
          <p>Una vez completado el match, el dinero se <strong>libera a tu monedero</strong> descontando la comisión de la plataforma (1,50 EUR).</p>
        </Step>
        <Step n={3}>
          <p>Consulta tu saldo y todas las transacciones desde la sección <strong>Monedero</strong>.</p>
        </Step>
        <Tip>Las experiencias de intercambio no tienen coste de comisión.</Tip>
      </AccordionSection>

      <AccordionSection id="a-estadisticas" icon="📊" title="Estadísticas y rendimiento" openSections={openSections} toggle={toggle}>
        <Step n={1}>
          <p>Accede a <strong>Estadísticas</strong> desde el menú para ver tu rendimiento como anfitrión.</p>
        </Step>
        <Step n={2}>
          <p>Consulta métricas clave: total de experiencias, solicitudes recibidas, matches completados, tasa de finalización y valoración media.</p>
        </Step>
        <Step n={3}>
          <p>La vista de <strong>Analytics</strong> muestra gráficos de tendencias y actividad mensual por experiencia.</p>
        </Step>
        <Tip>Usa las estadísticas para identificar qué experiencias funcionan mejor y optimizar tu oferta.</Tip>
      </AccordionSection>

      <AccordionSection id="a-resenas" icon="⭐" title="Reseñas y reputación" openSections={openSections} toggle={toggle}>
        <Step n={1}>
          <p>Los viajeros pueden dejar <strong>valoraciones</strong> tras completar una experiencia. Tu nota media aparece en tu perfil y en cada experiencia.</p>
        </Step>
        <Step n={2}>
          <p>También puedes ganar <strong>insignias</strong> (badges) de reputación conforme acumulas experiencias completadas y buenas valoraciones.</p>
        </Step>
        <Step n={3}>
          <p>Puedes ver tus reseñas recibidas desde tu perfil público o desde la sección de estadísticas.</p>
        </Step>
        <Tip>La verificación de identidad y las buenas reseñas aumentan significativamente la confianza de los viajeros.</Tip>
      </AccordionSection>

      <AccordionSection id="a-disputas" icon="⚖️" title="Disputas recibidas" openSections={openSections} toggle={toggle}>
        <p>Si un viajero abre una disputa sobre tu experiencia:</p>
        <Step n={1}>
          <p>Recibirás una <strong>notificación</strong> y podrás ver los detalles en la sección <strong>Disputas</strong>.</p>
        </Step>
        <Step n={2}>
          <p>Responde con tu versión de los hechos y adjunta <strong>evidencias</strong> si las tienes.</p>
        </Step>
        <Step n={3}>
          <p>El equipo de FiestApp mediará y tomará una decisión justa para ambas partes.</p>
        </Step>
        <Tip>Mantener una buena comunicación previa reduce drásticamente las disputas.</Tip>
      </AccordionSection>
    </div>
  );
}

/* ─── PAGINA PRINCIPAL ─── */

export default function GuiaPage() {
  const { isAuthenticated } = useAuth();
  const [tab, setTab] = useState<'viajero' | 'anfitrion'>('viajero');
  const [openSections, setOpenSections] = useState<Set<SectionId>>(new Set());

  const toggle = (id: SectionId) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    const allIds = tab === 'viajero'
      ? ['v-registro', 'v-explorar', 'v-solicitar', 'v-chat', 'v-pago', 'v-finalizar', 'v-disputas', 'v-favoritos', 'v-calendario']
      : ['a-crear', 'a-gestionar', 'a-precios', 'a-solicitudes', 'a-chat', 'a-cobros', 'a-estadisticas', 'a-resenas', 'a-disputas'];
    setOpenSections(new Set(allIds));
  };

  const collapseAll = () => {
    setOpenSections(new Set());
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-[var(--surface-warm)]">
        {/* Header */}
        <div className="bg-white/95 backdrop-blur-md border-b border-[var(--border-light)] sticky top-0 z-10">
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
            <Link
              href={isAuthenticated ? '/dashboard' : '/'}
              className="w-10 h-10 flex items-center justify-center bg-[var(--surface-tile)] rounded-full text-[var(--text-secondary)] hover:bg-[var(--surface-warm)] transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-[var(--text-primary)] font-display">Guía de uso</h1>
              <p className="text-xs text-[var(--text-muted)]">Aprende a usar FiestApp paso a paso</p>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
          {/* Intro */}
          <div className="card-festive p-5 text-center space-y-2">
            <h2 className="text-lg font-bold text-[var(--text-primary)] font-display">Bienvenido a FiestApp</h2>
            <p className="text-sm text-[var(--text-secondary)]">
              Conectamos viajeros con anfitriones locales para vivir las fiestas populares españolas de forma auténtica. Elige tu perfil para ver la guía adaptada.
            </p>
          </div>

          {/* Tabs */}
          <div className="flex rounded-2xl bg-[var(--surface-tile)] p-1.5 gap-1">
            <button
              onClick={() => { setTab('viajero'); setOpenSections(new Set()); }}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all ${
                tab === 'viajero'
                  ? 'bg-white text-[var(--primary)] shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              🎒 Soy viajero
            </button>
            <button
              onClick={() => { setTab('anfitrion'); setOpenSections(new Set()); }}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all ${
                tab === 'anfitrion'
                  ? 'bg-white text-[var(--primary)] shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              🏠 Soy anfitrión
            </button>
          </div>

          {/* Expand/Collapse controls */}
          <div className="flex justify-end gap-2">
            <button onClick={expandAll} className="text-xs text-[var(--primary)] hover:underline font-medium">
              Expandir todo
            </button>
            <span className="text-xs text-[var(--text-muted)]">|</span>
            <button onClick={collapseAll} className="text-xs text-[var(--primary)] hover:underline font-medium">
              Colapsar todo
            </button>
          </div>

          {/* Sections */}
          {tab === 'viajero' ? (
            <ViajeroSections openSections={openSections} toggle={toggle} />
          ) : (
            <AnfitrionSections openSections={openSections} toggle={toggle} />
          )}

          {/* Footer help */}
          <div className="card p-5 text-center space-y-3">
            <p className="text-sm text-[var(--text-secondary)]">
              ¿No encuentras lo que buscas?
            </p>
            <div className="flex justify-center gap-3">
              <Link href="/terms" className="btn-ghost text-sm px-4 py-2 rounded-full">
                Términos de uso
              </Link>
              <Link href="/privacy" className="btn-ghost text-sm px-4 py-2 rounded-full">
                Privacidad
              </Link>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              Contacto: <a href="mailto:soporte@fiestapp.es" className="text-[var(--primary)] hover:underline">soporte@fiestapp.es</a>
            </p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
