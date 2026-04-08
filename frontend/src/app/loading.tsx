export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="h-12 w-12 rounded-full border-4 border-gray-200 border-t-[#FF6B35] animate-spin" />
      <p className="mt-4 text-gray-600 text-sm font-medium">Cargando...</p>
    </div>
  );
}
