'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import SplashScreen from './SplashScreen';
import EvalWidget from './evaluation/EvalWidget';

interface AppWrapperProps {
  children: React.ReactNode;
}

export default function AppWrapper({ children }: AppWrapperProps) {
  const pathname = usePathname();
  // Start with consistent state for SSR hydration
  const [isFirstVisit, setIsFirstVisit] = useState(false);
  const [showSplash, setShowSplash] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  // Check sessionStorage after hydration to avoid mismatch
  // This is a valid hydration pattern - we need to set state after mount
  useEffect(() => {
    const hasVisited = sessionStorage.getItem('fiestapp_visited');
    if (!hasVisited) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsFirstVisit(true);
      setShowSplash(true);
    }
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
      <EvalWidget />
    </>
  );
}
