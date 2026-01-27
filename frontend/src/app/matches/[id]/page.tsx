'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

/**
 * Redirect from /matches/[id] to /messages/[id]
 * This maintains backward compatibility while unifying routes.
 */
export default function MatchRedirect() {
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    const id = params.id as string;
    router.replace(`/messages/${id}`);
  }, [params.id, router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="spinner spinner-lg" />
    </div>
  );
}
