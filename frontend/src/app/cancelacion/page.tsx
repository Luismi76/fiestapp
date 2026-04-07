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
          <h1 className="text-xl font-bold text-gray-900">Politica de cancelacion</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Como funciona la cancelacion en FiestApp</h2>
          <p className="text-gray-500 text-sm mb-8">Ultima actualizacion: abril 2026</p>

          <div className="space-y-10">
            {/* Intro */}
            <p className="text-gray-600">
              Cuando reservas una experiencia, el anfitrion ya ha elegido una de las cuatro politicas de cancelacion disponibles.
              Esta politica determina cuanto dinero se te devuelve si decides cancelar, y depende del tiempo que falte para que empiece la experiencia.
            </p>

            {/* Flexible */}
            <section>
              <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500" /> Flexible
              </h3>
              <div className="bg-gray-50 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-gray-200 text-left">
                    <th className="px-4 py-3 font-medium text-gray-500">Cuando cancelas</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Reembolso</th>
                  </tr></thead>
                  <tbody>
                    <tr className="border-b border-gray-100"><td className="px-4 py-3 text-gray-700">24 horas o mas antes</td><td className="px-4 py-3 font-semibold text-emerald-600">100%</td></tr>
                    <tr className="border-b border-gray-100"><td className="px-4 py-3 text-gray-700">Entre 12 y 24 horas antes</td><td className="px-4 py-3 font-semibold text-amber-600">50%</td></tr>
                    <tr><td className="px-4 py-3 text-gray-700">Menos de 12 horas antes</td><td className="px-4 py-3 font-semibold text-red-500">0%</td></tr>
                  </tbody>
                </table>
              </div>
              <p className="text-sm text-gray-500 mt-2">Es la politica por defecto y la mas generosa para el viajero.</p>
            </section>

            {/* Moderada */}
            <section>
              <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500" /> Moderada
              </h3>
              <div className="bg-gray-50 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-gray-200 text-left">
                    <th className="px-4 py-3 font-medium text-gray-500">Cuando cancelas</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Reembolso</th>
                  </tr></thead>
                  <tbody>
                    <tr className="border-b border-gray-100"><td className="px-4 py-3 text-gray-700">72 horas (3 dias) o mas antes</td><td className="px-4 py-3 font-semibold text-emerald-600">100%</td></tr>
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
                    <th className="px-4 py-3 font-medium text-gray-500">Cuando cancelas</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Reembolso</th>
                  </tr></thead>
                  <tbody>
                    <tr className="border-b border-gray-100"><td className="px-4 py-3 text-gray-700">7 dias o mas antes</td><td className="px-4 py-3 font-semibold text-emerald-600">100%</td></tr>
                    <tr className="border-b border-gray-100"><td className="px-4 py-3 text-gray-700">Entre 3 y 7 dias antes</td><td className="px-4 py-3 font-semibold text-amber-600">50%</td></tr>
                    <tr><td className="px-4 py-3 text-gray-700">Menos de 3 dias antes</td><td className="px-4 py-3 font-semibold text-red-500">0%</td></tr>
                  </tbody>
                </table>
              </div>
              <p className="text-sm text-gray-500 mt-2">Pensada para experiencias que requieren mucha preparacion o tienen plazas muy limitadas.</p>
            </section>

            {/* Sin reembolso */}
            <section>
              <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500" /> Sin reembolso
              </h3>
              <div className="bg-gray-50 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-gray-200 text-left">
                    <th className="px-4 py-3 font-medium text-gray-500">Cuando cancelas</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Reembolso</th>
                  </tr></thead>
                  <tbody>
                    <tr className="border-b border-gray-100"><td className="px-4 py-3 text-gray-700">En cualquier momento</td><td className="px-4 py-3 font-semibold text-red-500">0%</td></tr>
                    <tr><td className="px-4 py-3 text-gray-700">Si el anfitrion cancela</td><td className="px-4 py-3 font-semibold text-emerald-600">100%</td></tr>
                  </tbody>
                </table>
              </div>
              <p className="text-sm text-gray-500 mt-2">Solo disponible para anfitriones con identidad verificada, buenas valoraciones y experiencia demostrada.</p>
            </section>

            <hr className="border-gray-200" />

            {/* Cuando el anfitrion cancela */}
            <section>
              <h3 className="text-lg font-bold text-gray-900 mb-3">Cuando el anfitrion cancela</h3>
              <p className="text-gray-600 mb-3">
                Si es el anfitrion quien cancela, <strong>siempre se devuelve el 100% al viajero</strong>, sin importar la politica elegida ni el tiempo que falte.
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                <p className="font-medium mb-1">Consecuencias para el anfitrion:</p>
                <ul className="list-disc list-inside space-y-1 text-amber-700">
                  <li>2 cancelaciones en 30 dias: aviso de advertencia</li>
                  <li>3 o mas: penalizacion automatica y posible despublicacion de experiencias</li>
                </ul>
              </div>
            </section>

            {/* Limite de cancelaciones */}
            <section>
              <h3 className="text-lg font-bold text-gray-900 mb-3">Limite de cancelaciones</h3>
              <p className="text-gray-600 mb-3">
                Tanto viajeros como anfitriones tienen un limite de <strong>3 cancelaciones cada 30 dias</strong>.
              </p>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">●</span><span>0-1 cancelacion: sin restriccion</span></div>
                <div className="flex items-start gap-2"><span className="text-amber-500 mt-0.5">●</span><span>2 cancelaciones: puedes cancelar, con aviso</span></div>
                <div className="flex items-start gap-2"><span className="text-red-500 mt-0.5">●</span><span>3 o mas: no puedes cancelar (contacta soporte)</span></div>
              </div>
            </section>

            {/* Comision */}
            <section>
              <h3 className="text-lg font-bold text-gray-900 mb-3">Comision de servicio al cancelar</h3>
              <p className="text-gray-600">
                Al cerrar un acuerdo, ambas partes pagan una comision de servicio (IVA incluido) que se descuenta del monedero. Al cancelar:
              </p>
              <ul className="list-disc list-inside text-gray-600 mt-2 space-y-1">
                <li><strong>Quien cancela</strong> pierde su comision.</li>
                <li><strong>La otra parte</strong> recupera la suya.</li>
              </ul>
            </section>

            {/* Fuerza mayor */}
            <section>
              <h3 className="text-lg font-bold text-gray-900 mb-3">Cancelacion por fuerza mayor</h3>
              <p className="text-gray-600 mb-3">
                Si un festival se cancela por causas ajenas (mal tiempo, emergencias, decisiones de autoridades),
                el equipo de FiestApp puede declarar fuerza mayor:
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li>Todas las reservas vinculadas se cancelan automaticamente</li>
                <li>Reembolso del 100% independientemente de la politica</li>
                <li>Ambas partes recuperan su comision</li>
                <li>No cuenta para el limite de cancelaciones</li>
              </ul>
            </section>

            <hr className="border-gray-200" />

            {/* Donde se ve */}
            <section>
              <h3 className="text-lg font-bold text-gray-900 mb-3">Donde puedo ver la politica antes de reservar</h3>
              <p className="text-gray-600">
                La politica de cancelacion aparece en la ficha de cada experiencia y en la pagina de reserva, con un codigo de colores:
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
                  <p className="font-medium text-gray-900 text-sm">Si cancelo y vuelvo a reservar, me cuenta como dos cancelaciones?</p>
                  <p className="text-sm text-gray-600 mt-1">Si. Cada cancelacion cuenta por separado.</p>
                </div>
                <div>
                  <p className="font-medium text-gray-900 text-sm">Puedo cambiar la fecha en lugar de cancelar?</p>
                  <p className="text-sm text-gray-600 mt-1">Actualmente, cambiar la fecha implica cancelar y crear una nueva reserva. Se aplica la politica de cancelacion vigente.</p>
                </div>
                <div>
                  <p className="font-medium text-gray-900 text-sm">Que pasa si el anfitrion no se presenta?</p>
                  <p className="text-sm text-gray-600 mt-1">Puedes abrir una reclamacion. El equipo revisara el caso y, si procede, te devolvera el importe completo.</p>
                </div>
                <div>
                  <p className="font-medium text-gray-900 text-sm">Por que algunos anfitriones no pueden usar &quot;Sin reembolso&quot;?</p>
                  <p className="text-sm text-gray-600 mt-1">Para proteger a los viajeros. Solo los anfitriones con identidad verificada, buenas valoraciones y experiencia demostrada pueden ofrecer esta politica.</p>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* Links */}
        <div className="flex justify-center gap-4 mt-6 text-sm text-gray-400">
          <Link href="/terms" className="hover:text-gray-600 transition-colors">Terminos de uso</Link>
          <Link href="/privacy" className="hover:text-gray-600 transition-colors">Privacidad</Link>
          <Link href="/guia" className="hover:text-gray-600 transition-colors">Guia de uso</Link>
        </div>
      </div>
    </div>
  );
}
