'use client';

import { useState } from 'react';
import Link from 'next/link';

interface OnboardingBannerProps {
  userName: string;
  hasExperiences: boolean;
  hasMatches: boolean;
  hasAvatar: boolean;
  hasBio: boolean;
}

interface Step {
  key: string;
  label: string;
  href: string;
  done: boolean;
  cta: string;
}

export default function OnboardingBanner({
  userName,
  hasExperiences,
  hasMatches,
  hasAvatar,
  hasBio,
}: OnboardingBannerProps) {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('onboarding_dismissed') === 'true';
  });

  const steps: Step[] = [
    {
      key: 'profile',
      label: 'Completa tu perfil',
      href: '/profile/edit',
      done: hasAvatar && hasBio,
      cta: 'Editar perfil',
    },
    {
      key: 'explore',
      label: 'Explora experiencias',
      href: '/experiences',
      done: hasMatches,
      cta: 'Explorar',
    },
    {
      key: 'host',
      label: 'Crea tu primera experiencia',
      href: '/experiences/create',
      done: hasExperiences,
      cta: 'Crear',
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const allDone = completedCount === steps.length;

  if (dismissed || allDone) return null;

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem('onboarding_dismissed', 'true');
    } catch {
      // localStorage no disponible
    }
  };

  return (
    <div className="mx-4 lg:mx-0 mb-6 rounded-2xl bg-gradient-to-br from-primary/5 via-white to-accent/5 border border-primary/10 p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="font-display text-lg text-[#1A1410]">
            ¡Bienvenido/a, {userName}!
          </h2>
          <p className="text-sm text-[#8B7355] mt-1">
            Completa estos pasos para sacar el máximo partido a FiestApp
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="text-gray-400 hover:text-gray-600 text-sm"
          aria-label="Cerrar"
        >
          ✕
        </button>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${(completedCount / steps.length) * 100}%` }}
          />
        </div>
        <span className="text-xs text-[#8B7355] font-medium">
          {completedCount}/{steps.length}
        </span>
      </div>

      <div className="space-y-3">
        {steps.map((step, i) => (
          <div
            key={step.key}
            className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
              step.done
                ? 'bg-green-50'
                : 'bg-white border border-gray-100'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                step.done
                  ? 'bg-green-500 text-white'
                  : 'bg-primary/10 text-primary'
              }`}
            >
              {step.done ? '✓' : i + 1}
            </div>
            <span
              className={`flex-1 text-sm font-medium ${
                step.done ? 'text-green-700 line-through' : 'text-[#1A1410]'
              }`}
            >
              {step.label}
            </span>
            {!step.done && (
              <Link
                href={step.href}
                className="text-xs font-semibold text-primary hover:text-primary/80 px-3 py-1.5 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors"
              >
                {step.cta}
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
