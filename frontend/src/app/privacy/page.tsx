import Link from 'next/link';

export default function PrivacyPage() {
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
          <h1 className="text-xl font-bold text-gray-900">Privacidad</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Politica de Privacidad</h2>

          <div className="prose prose-gray max-w-none space-y-6">
            <p className="text-gray-600">
              Ultima actualizacion: Enero 2026
            </p>

            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">1. Informacion que recopilamos</h3>
              <p className="text-gray-600">
                En FiestApp recopilamos la informacion que nos proporcionas directamente al crear una cuenta,
                como tu nombre, correo electronico y foto de perfil. Tambien recopilamos informacion sobre
                tu uso de la plataforma para mejorar nuestros servicios.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">2. Como usamos tu informacion</h3>
              <p className="text-gray-600">
                Utilizamos tu informacion para:
              </p>
              <ul className="list-disc list-inside text-gray-600 mt-2 space-y-1">
                <li>Proporcionar y mantener nuestros servicios</li>
                <li>Conectarte con anfitriones y viajeros</li>
                <li>Enviar notificaciones sobre tus reservas y matches</li>
                <li>Mejorar y personalizar tu experiencia</li>
                <li>Procesar pagos de forma segura</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">3. Compartir informacion</h3>
              <p className="text-gray-600">
                Compartimos tu informacion basica de perfil con otros usuarios cuando interactuas con ellos
                (por ejemplo, cuando solicitas una experiencia). No vendemos tu informacion personal a terceros.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">4. Seguridad</h3>
              <p className="text-gray-600">
                Implementamos medidas de seguridad tecnicas y organizativas para proteger tu informacion
                personal contra acceso no autorizado, alteracion o destruccion.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">5. Tus derechos</h3>
              <p className="text-gray-600">
                Tienes derecho a acceder, corregir o eliminar tu informacion personal. Puedes ejercer estos
                derechos desde la configuracion de tu cuenta o contactandonos directamente.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">6. Contacto</h3>
              <p className="text-gray-600">
                Si tienes preguntas sobre esta politica de privacidad, puedes contactarnos en:
                <a href="mailto:privacidad@fiestapp.es" className="text-blue-600 hover:underline ml-1">
                  privacidad@fiestapp.es
                </a>
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
