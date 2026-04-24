'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { invoicesApi, InvoiceSummary, TaxRegime } from '@/lib/api';
import MainLayout from '@/components/MainLayout';

const REGIME_LABELS: Record<TaxRegime, string> = {
  IVA_GENERAL_21: 'IVA 21%',
  IVA_REDUCIDO_10: 'IVA 10%',
  IVA_SUPERREDUCIDO_4: 'IVA 4%',
  IGIC_CANARIAS_7: 'IGIC 7%',
  IPSI_CEUTA_4: 'IPSI 4%',
  IPSI_MELILLA_4: 'IPSI 4%',
  EXENTO_UE: 'Exento (UE)',
  EXENTO_EXTRA_UE: 'Exento (exportación)',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${d.getUTCFullYear()}`;
}

function formatEur(n: number): string {
  return `${n.toFixed(2)} €`;
}

export default function MyInvoicesPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    invoicesApi
      .getMine(1, 50)
      .then((res) => {
        if (!cancelled) setInvoices(res.invoices);
      })
      .catch(() => {
        if (!cancelled) setError('No se pudieron cargar tus facturas');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const handleDownload = async (inv: InvoiceSummary) => {
    setDownloadingId(inv.id);
    try {
      await invoicesApi.downloadPdf(inv.id, `factura-${inv.fullNumber}.pdf`);
    } catch {
      setError('No se pudo descargar la factura');
    } finally {
      setDownloadingId(null);
    }
  };

  if (authLoading || loading) {
    return (
      <MainLayout>
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="spinner spinner-lg" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-6">
          <Link
            href="/profile/me"
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver al perfil
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">Mis facturas</h1>
          <p className="text-sm text-gray-500 mt-1">
            Descarga las facturas de tus compras de packs en FiestApp.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {invoices.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <svg
              className="w-12 h-12 text-gray-300 mx-auto mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="text-sm text-gray-500">
              Todavía no tienes facturas. Cuando compres tu primer pack aparecerá aquí.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {invoices.map((inv) => (
              <div
                key={inv.id}
                className="bg-white rounded-2xl shadow-sm p-4 flex items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900 text-sm truncate">
                      {inv.fullNumber}
                    </span>
                    {inv.type === 'RECTIFYING' && (
                      <span className="text-[10px] font-medium bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                        Rectificativa
                      </span>
                    )}
                    {inv.type === 'SIMPLIFIED' && (
                      <span className="text-[10px] font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        Simplificada
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate">{inv.concept}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-[11px] text-gray-400">
                    <span>{formatDate(inv.issueDate)}</span>
                    <span>·</span>
                    <span>{REGIME_LABELS[inv.taxRegime]}</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-gray-900">{formatEur(inv.grossAmount)}</p>
                  <button
                    onClick={() => handleDownload(inv)}
                    disabled={downloadingId === inv.id}
                    className="mt-1.5 text-xs font-medium text-[#FF6B35] hover:underline disabled:opacity-50"
                  >
                    {downloadingId === inv.id ? 'Descargando…' : 'Descargar PDF'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
