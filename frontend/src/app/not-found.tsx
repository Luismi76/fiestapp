import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-white to-secondary/5 px-4">
      <div className="text-center max-w-md">
        <p className="text-8xl font-display font-bold text-primary/20 mb-2">404</p>
        <h1 className="text-2xl font-display font-bold text-[#1A1410] mb-3">
          Página no encontrada
        </h1>
        <p className="text-[#8B7355] mb-8">
          Parece que esta fiesta ya terminó. La página que buscas no existe o ha sido movida.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/experiences" className="btn btn-primary">
            Explorar experiencias
          </Link>
          <Link href="/" className="btn btn-secondary">
            Ir al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
