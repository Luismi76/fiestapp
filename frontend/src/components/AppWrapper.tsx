'use client';

import { useState, useEffect } from 'react';
import SplashScreen from './SplashScreen';

interface AppWrapperProps {
  children: React.ReactNode;
}

export default function AppWrapper({ children }: AppWrapperProps) {
  const [showSplash, setShowSplash] = useState(true);
  const [isFirstVisit, setIsFirstVisit] = useState(true);

  useEffect(() => {
    // Check if user has visited before in this session
    const hasVisited = sessionStorage.getItem('fiestapp_visited');
    if (hasVisited) {
      setShowSplash(false);
      setIsFirstVisit(false);
    }
  }, []);

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
