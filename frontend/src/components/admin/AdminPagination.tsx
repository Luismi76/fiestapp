'use client';

interface AdminPaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function AdminPagination({ page, totalPages, onPageChange }: AdminPaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex justify-center items-center gap-2">
      <button
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page === 1}
        className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm disabled:opacity-50"
      >
        Anterior
      </button>
      <span className="px-4 py-2 text-sm text-gray-600">
        Pagina {page} de {totalPages}
      </span>
      <button
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm disabled:opacity-50"
      >
        Siguiente
      </button>
    </div>
  );
}
