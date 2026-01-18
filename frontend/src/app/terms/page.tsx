import Link from 'next/link';

export default function TermsPage() {
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
          <h1 className="text-xl font-bold text-gray-900">Terminos de Uso</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Terminos y Condiciones</h2>

          <div className="prose prose-gray max-w-none space-y-6">
            <p className="text-gray-600">
              Ultima actualizacion: Enero 2026
            </p>

            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">1. Aceptacion de los terminos</h3>
              <p className="text-gray-600">
                Al acceder y utilizar FiestApp, aceptas estar sujeto a estos terminos y condiciones de uso.
                Si no estas de acuerdo con alguna parte de estos terminos, no podras usar nuestros servicios.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">2. Descripcion del servicio</h3>
              <p className="text-gray-600">
                FiestApp es una plataforma que conecta viajeros con anfitriones locales para vivir experiencias
                autenticas durante las fiestas populares espanolas. Facilitamos el contacto entre usuarios,
                pero no somos responsables directos de las experiencias ofrecidas.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">3. Registro y cuenta</h3>
              <p className="text-gray-600">
                Para usar FiestApp debes:
              </p>
              <ul className="list-disc list-inside text-gray-600 mt-2 space-y-1">
                <li>Tener al menos 18 anos de edad</li>
                <li>Proporcionar informacion veraz y actualizada</li>
                <li>Mantener la confidencialidad de tu contrasena</li>
                <li>Ser responsable de toda actividad en tu cuenta</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">4. Normas de conducta</h3>
              <p className="text-gray-600">
                Los usuarios se comprometen a:
              </p>
              <ul className="list-disc list-inside text-gray-600 mt-2 space-y-1">
                <li>Tratar a otros usuarios con respeto</li>
                <li>No publicar contenido ofensivo o ilegal</li>
                <li>No utilizar la plataforma con fines fraudulentos</li>
                <li>Cumplir con las leyes locales aplicables</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">5. Pagos y tarifas</h3>
              <p className="text-gray-600">
                FiestApp cobra una tarifa de servicio de 1,50 EUR por cada match completado. Los pagos entre
                usuarios se procesan de forma segura a traves de nuestra plataforma. Los reembolsos se gestionan
                segun nuestra politica de cancelacion.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">6. Responsabilidad</h3>
              <p className="text-gray-600">
                FiestApp actua como intermediario y no es responsable de las acciones de los usuarios ni de
                la calidad de las experiencias ofrecidas. Recomendamos siempre verificar las resenas y
                comunicarse claramente antes de confirmar una experiencia.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">7. Cancelacion de cuenta</h3>
              <p className="text-gray-600">
                Puedes cancelar tu cuenta en cualquier momento desde la configuracion. Nos reservamos el
                derecho de suspender o cancelar cuentas que violen estos terminos.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">8. Modificaciones</h3>
              <p className="text-gray-600">
                Podemos modificar estos terminos en cualquier momento. Te notificaremos de cambios
                significativos a traves de la plataforma o por correo electronico.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">9. Contacto</h3>
              <p className="text-gray-600">
                Para preguntas sobre estos terminos, contactanos en:
                <a href="mailto:legal@fiestapp.es" className="text-blue-600 hover:underline ml-1">
                  legal@fiestapp.es
                </a>
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
