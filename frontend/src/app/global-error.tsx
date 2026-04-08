'use client';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body className="bg-gray-50 flex items-center justify-center min-h-screen px-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-6">
            <span className="text-[#FF6B35]">500</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Algo ha salido mal
          </h1>
          <p className="text-gray-600 mb-8">
            Ha ocurrido un error inesperado. Por favor, vuelve a intentarlo.
          </p>
          <button
            onClick={() => reset()}
            className="inline-flex items-center justify-center rounded-lg bg-[#FF6B35] px-6 py-3 text-white font-medium hover:bg-[#e55a2b] transition-colors"
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}
