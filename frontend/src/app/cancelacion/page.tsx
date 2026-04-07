import Link from 'next/link';

export default function CancelacionPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link
            href="/"
            className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-full text-gray-600 hover:bg-gray-200 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Política de cancelación</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Cómo funciona la cancelación en FiestApp</h2>
          <p className="text-gray-500 text-sm mb-8">Última actualización: abril 2026</p>

          <div className="space-y-10">
            {/* Intro */}
            <p className="text-gray-600">
              Cuando reservas una experiencia, el anfitrión ya ha elegido una de las cuatro políticas de cancelación disponibles.
              Esta política determina cuánto dinero se te devuelve si decides cancelar, y depende del tiempo que falte para que empiece la experiencia.
            </p>

            {/* Flexible */}
            <section>
              <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500" /> Flexible
              </h3>
              <div className="bg-gray-50 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-gray-200 text-left">
                    <th className="px-4 py-3 font-medium text-gray-500">Cuándo cancelas</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Reembolso</th>
                  </tr></thead>
                  <tbody>
                    <tr className="border-b border-gray-100"><td className="px-4 py-3 text-gray-700">24 horas o más antes</td><td className="px-4 py-3 font-semibold text-emerald-600">100%</td></tr>
                    <tr className="border-b border-gray-100"><td className="px-4 py-3 text-gray-700">Entre 12 y 24 horas antes</td><td className="px-4 py-3 font-semibold text-amber-600">50%</td></tr>
                    <tr><td className="px-4 py-3 text-gray-700">Menos de 12 horas antes</td><td className="px-4 py-3 font-semibold text-red-500">0%</td></tr>
                  </tbody>
                </table>
              </div>
              <p className="text-sm text-gray-500 mt-2">Es la política por defecto y la más generosa para el viajero.</p>
            </section>

            {/* Moderada */}
            <section>
              <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500" /> Moderada
              </h3>
              <div className="bg-gray-50 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-gray-200 text-left">
                    <th className="px-4 py-3 font-medium text-gray-500">Cuándo cancelas</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Reembolso</th>
                  </tr></thead>
                  <tbody>
                    <tr className="border-b border-gray-100"><td className="px-4 py-3 text-gray-700">72 horas (3 días) o más antes</td><td className="px-4 py-3 font-semibold text-emerald-600">100%</td></tr>
                    <tr className="border-b border-gray-100"><td className="px-4 py-3 text-gray-700">Entre 24 y 72 horas antes</td><td className="px-4 py-3 font-semibold text-amber-600">50%</td></tr>
                    <tr><td className="px-4 py-3 text-gray-700">Menos de 24 horas antes</td><td className="px-4 py-3 font-semibold text-red-500">0%</td></tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* Estricta */}
            <section>
              <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-orange-500" /> Estricta
              </h3>
              <div className="bg-gray-50 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-gray-200 text-left">
                    <th className="px-4 py-3 font-medium text-gray-500">Cuándo cancelas</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Reembolso</th>
                  </tr></thead>
                  <tbody>
                    <tr className="border-b border-gray-100"><td className="px-4 py-3 text-gray-700">7 días o más antes</td><td className="px-4 py-3 font-semibold text-emerald-600">100%</td></tr>
                    <tr className="border-b border-gray-100"><td className="px-4 py-3 text-gray-700">Entre 3 y 7 días antes</td><td className="px-4 py-3 font-semibold text-amber-600">50%</td></tr>
                    <tr><td className="px-4 py-3 text-gray-700">Menos de 3 días antes</td><td className="px-4 py-3 font-semibold text-red-500">0%</td></tr>
                  </tbody>
                </table>
              </div>
              <p className="text-sm text-gray-500 mt-2">Pensada para experiencias que requieren mucha preparación o tienen plazas muy limitadas.</p>
            </section>

            {/* Sin reembolso */}
            <section>
              <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500" /> Sin reembolso
              </h3>
              <div className="bg-gray-50 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-gray-200 text-left">
                    <th className="px-4 py-3 font-medium text-gray-500">Cuándo cancelas</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Reembolso</th>
                  </tr></thead>
                  <tbody>
                    <tr className="border-b border-gray-100"><td className="px-4 py-3 text-gray-700">En cualquier momento</td><td className="px-4 py-3 font-semibold text-red-500">0%</td></tr>
                    <tr><td className="px-4 py-3 text-gray-700">Si el anfitrión cancela</td><td className="px-4 py-3 font-semibold text-emerald-600">100%</td></tr>
                  </tbody>
                </table>
              </div>
              <p className="text-sm text-gray-500 mt-2">Solo disponible para anfitriones con identidad verificada, buenas valoraciones y experiencia demostrada.</p>
            </section>

            <hr className="border-gray-200" />

            {/* Cuando el anfitrión cancela */}
            <section>
              <h3 className="text-lg font-bold text-gray-900 mb-3">Cuando el anfitrión cancela</h3>
              <p className="text-gray-600 mb-3">
                Si es el anfitrión quien cancela, <strong>siempre se devuelve el 100% al viajero</strong>, sin importar la política elegida ni el tiempo que falte.
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                <p className="font-medium mb-1">Consecuencias para el anfitrión:</p>
                <ul className="list-disc list-inside space-y-1 text-amber-700">
                  <li>2 cancelaciones en 30 días: aviso de advertencia</li>
                  <li>3 o más: penalización automática y posible despublicación de experiencias</li>
                </ul>
              </div>
            </section>

            {/* Límite de cancelaciones */}
            <section>
              <h3 className="text-lg font-bold text-gray-900 mb-3">Límite de cancelaciones</h3>
              <p className="text-gray-600 mb-3">
                Tanto viajeros como anfitriones tienen un límite de <strong>3 cancelaciones cada 30 días</strong>.
              </p>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">●</span><span>0-1 cancelación: sin restricción</span></div>
                <div className="flex items-start gap-2"><span className="text-amber-500 mt-0.5">●</span><span>2 cancelaciones: puedes cancelar, con aviso</span></div>
                <div className="flex items-start gap-2"><span className="text-red-500 mt-0.5">●</span><span>3 o más: no puedes cancelar (contacta soporte)</span></div>
              </div>
            </section>

            {/* Comisión */}
            <section>
              <h3 className="text-lg font-bold text-gray-900 mb-3">Comisión de servicio al cancelar</h3>
              <p className="text-gray-600">
                Al cerrar un acuerdo, ambas partes pagan una comisión de servicio (IVA incluido) que se descuenta del monedero. Al cancelar:
              </p>
              <ul className="list-disc list-inside text-gray-600 mt-2 space-y-1">
                <li><strong>Quien cancela</strong> pierde su comisión.</li>
                <li><strong>La otra parte</strong> recupera la suya.</li>
              </ul>
            </section>

            {/* Fuerza mayor */}
            <section>
              <h3 className="text-lg font-bold text-gray-900 mb-3">Cancelación por fuerza mayor</h3>
              <p className="text-gray-600 mb-3">
                Si un festival se cancela por causas ajenas (mal tiempo, emergencias, decisiones de autoridades),
                el equipo de FiestApp puede declarar fuerza mayor:
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li>Todas las reservas vinculadas se cancelan automáticamente</li>
                <li>Reembolso del 100% independientemente de la política</li>
                <li>Ambas partes recuperan su comisión</li>
                <li>No cuenta para el límite de cancelaciones</li>
              </ul>
            </section>

            <hr className="border-gray-200" />

            {/* Donde se ve */}
            <section>
              <h3 className="text-lg font-bold text-gray-900 mb-3">¿Dónde puedo ver la política antes de reservar?</h3>
              <p className="text-gray-600">
                La política de cancelación aparece en la ficha de cada experiencia y en la página de reserva, con un código de colores:
              </p>
              <div className="flex gap-4 mt-3 text-sm">
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-emerald-500" /><span className="text-gray-600">Reembolso total</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-amber-500" /><span className="text-gray-600">Reembolso parcial</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-red-500" /><span className="text-gray-600">Sin reembolso</span></div>
              </div>
            </section>

            {/* FAQ */}
            <section>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Preguntas frecuentes</h3>
              <div className="space-y-4">
                <div>
                  <p className="font-medium text-gray-900 text-sm">¿Si cancelo y vuelvo a reservar, me cuenta como dos cancelaciones?</p>
                  <p className="text-sm text-gray-600 mt-1">Sí. Cada cancelación cuenta por separado.</p>
                </div>
                <div>
                  <p className="font-medium text-gray-900 text-sm">¿Puedo cambiar la fecha en lugar de cancelar?</p>
                  <p className="text-sm text-gray-600 mt-1">Actualmente, cambiar la fecha implica cancelar y crear una nueva reserva. Se aplica la política de cancelación vigente.</p>
                </div>
                <div>
                  <p className="font-medium text-gray-900 text-sm">¿Qué pasa si el anfitrión no se presenta?</p>
                  <p className="text-sm text-gray-600 mt-1">Puedes abrir una reclamación. El equipo revisará el caso y, si procede, te devolverá el importe completo.</p>
                </div>
                <div>
                  <p className="font-medium text-gray-900 text-sm">¿Por qué algunos anfitriones no pueden usar &quot;Sin reembolso&quot;?</p>
                  <p className="text-sm text-gray-600 mt-1">Para proteger a los viajeros. Solo los anfitriones con identidad verificada, buenas valoraciones y experiencia demostrada pueden ofrecer esta política.</p>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* Links */}
        <div className="flex justify-center gap-4 mt-6 text-sm text-gray-400">
          <Link href="/terms" className="hover:text-gray-600 transition-colors">Términos de uso</Link>
          <Link href="/privacy" className="hover:text-gray-600 transition-colors">Privacidad</Link>
          <Link href="/guia" className="hover:text-gray-600 transition-colors">Guía de uso</Link>
        </div>
      </div>
    </div>
  );
}
