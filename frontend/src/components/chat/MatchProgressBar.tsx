'use client';

import { MatchStatus } from '@/types/match';

interface MatchProgressBarProps {
  status: MatchStatus;
}

const steps = [
  { key: 'pending', label: 'Solicitud' },
  { key: 'accepted', label: 'Aceptada' },
  { key: 'experience', label: 'Experiencia' },
  { key: 'completed', label: 'Completada' },
] as const;

const statusToStep: Record<MatchStatus, number> = {
  pending: 0,
  accepted: 1,
  rejected: -1,
  cancelled: -1,
  completed: 3,
};

export default function MatchProgressBar({ status }: MatchProgressBarProps) {
  const currentStep = statusToStep[status];

  // No mostrar para estados terminales negativos
  if (status === 'rejected' || status === 'cancelled') {
    const config = status === 'rejected'
      ? { label: 'Solicitud rechazada', bg: 'bg-red-50', text: 'text-red-600', icon: '✕' }
      : { label: 'Experiencia cancelada', bg: 'bg-gray-50', text: 'text-gray-500', icon: '—' };

    return (
      <div className={`mx-4 mt-3 px-4 py-3 rounded-xl ${config.bg} flex items-center justify-center gap-2`}>
        <span className={`text-sm font-semibold ${config.text}`}>{config.icon} {config.label}</span>
      </div>
    );
  }

  return (
    <div className="mx-4 mt-3">
      {/* Progress dots and line */}
      <div className="flex items-center gap-1 mb-1.5">
        {steps.map((step, i) => {
          const isDone = i < currentStep;
          const isActive = i === currentStep;

          return (
            <div key={step.key} className="flex items-center flex-1 last:flex-none">
              {/* Dot */}
              <div
                className={`w-2.5 h-2.5 rounded-full flex-shrink-0 transition-colors ${
                  isDone ? 'bg-emerald-500' : isActive ? 'bg-primary' : 'bg-gray-200'
                }`}
              />
              {/* Line */}
              {i < steps.length - 1 && (
                <div
                  className={`h-[2px] flex-1 mx-1 rounded-full transition-colors ${
                    isDone ? 'bg-emerald-500' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Labels */}
      <div className="flex justify-between">
        {steps.map((step, i) => {
          const isDone = i < currentStep;
          const isActive = i === currentStep;

          return (
            <span
              key={step.key}
              className={`text-[10px] font-semibold transition-colors ${
                isDone ? 'text-emerald-600' : isActive ? 'text-primary' : 'text-gray-400'
              } ${i === 0 ? 'text-left' : i === steps.length - 1 ? 'text-right' : 'text-center'}`}
            >
              {step.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
