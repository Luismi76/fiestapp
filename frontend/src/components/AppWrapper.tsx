'use client';

import { useState } from 'react';
import SplashScreen from './SplashScreen';

interface AppWrapperProps {
  children: React.ReactNode;
}

// Helper to safely check sessionStorage (handles SSR)
const getInitialVisitState = () => {
  if (typeof window === 'undefined') return true;
  return !sessionStorage.getItem('fiestapp_visited');
};

export default function AppWrapper({ children }: AppWrapperProps) {
  const [isFirstVisit] = useState(getInitialVisitState);
  const [showSplash, setShowSplash] = useState(isFirstVisit);

  const handleSplashFinish = () => {
    setShowSplash(false);
    sessionStorage.setItem('fiestapp_visited', 'true');
  };

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
