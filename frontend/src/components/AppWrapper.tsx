'use client';

import { useState, useEffect } from 'react';
import SplashScreen from './SplashScreen';

interface AppWrapperProps {
  children: React.ReactNode;
}

export default function AppWrapper({ children }: AppWrapperProps) {
  // Start with consistent state for SSR hydration
  const [isFirstVisit, setIsFirstVisit] = useState(false);
  const [showSplash, setShowSplash] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Check sessionStorage after hydration to avoid mismatch
  // This is a valid hydration pattern - we need to set state after mount
  useEffect(() => {
    const hasVisited = sessionStorage.getItem('fiestapp_visited');
    if (!hasVisited) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsFirstVisit(true);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowSplash(true);
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsHydrated(true);
  }, []);

  const handleSplashFinish = () => {
    setShowSplash(false);
    sessionStorage.setItem('fiestapp_visited', 'true');
  };

  // During SSR and initial hydration, render children normally
  if (!isHydrated) {
    return <>{children}</>;
  }

  return (
    <>
      {showSplash && isFirstVisit && (
        <SplashScreen onFinish={handleSplashFinish} duration={2500} />
      )}
      <div className={showSplash && isFirstVisit ? 'opacity-0' : 'opacity-100 transition-opacity duration-300'}>
        {children}
      </div>
    </>
  );
}
