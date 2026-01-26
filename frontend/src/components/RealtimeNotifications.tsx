'use client';

import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Component that initializes real-time notification listening.
 * Renders nothing visible - toasts are shown via the ToastProvider.
 * Must be placed inside AuthProvider and ToastProvider.
 */
export default function RealtimeNotifications() {
  const { user } = useAuth();

  // Only activate for logged-in users
  if (!user) {
    return null;
  }

  return <NotificationListener />;
}

// Separate component to avoid hook rules issues with conditional return
function NotificationListener() {
  // This hook connects to the socket and shows toasts for incoming notifications
  useRealtimeNotifications();

  // Render nothing - toasts appear via ToastProvider
  return null;
}
