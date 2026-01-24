'use client';

import { useEffect, useState } from 'react';

interface SplashScreenProps {
  onFinish?: () => void;
  duration?: number;
}

export default function SplashScreen({ onFinish, duration = 2000 }: SplashScreenProps) {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setFadeOut(true);
    }, duration - 500);

    const finishTimer = setTimeout(() => {
      onFinish?.();
    }, duration);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(finishTimer);
    };
  }, [duration, onFinish]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-br from-[#0f4c4a] via-[#1a6b68] to-[#0f4c4a] transition-opacity duration-500 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-32 h-32 rounded-full bg-white/20 blur-3xl" />
        <div className="absolute bottom-20 right-10 w-40 h-40 rounded-full bg-white/20 blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-24 h-24 rounded-full bg-white/10 blur-2xl" />
      </div>

      {/* Logo container with animation */}
      <div className="relative animate-pulse">
        <img
          src="/images/icons/fiestapp-logo.svg"
          alt="FiestApp"
          className="w-32 h-32 md:w-40 md:h-40"
        />
      </div>

      {/* App name */}
      <h1 className="mt-6 text-3xl md:text-4xl font-bold text-white tracking-tight">
        FiestApp
      </h1>

      {/* Tagline */}
      <p className="mt-2 text-white/70 text-sm md:text-base">
        Vive la fiesta auténtica
      </p>

      {/* Loading indicator */}
      <div className="mt-8 flex gap-1.5">
        <div className="w-2 h-2 rounded-full bg-white/80 animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 rounded-full bg-white/80 animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 rounded-full bg-white/80 animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}
