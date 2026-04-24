'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import api from '@/lib/api';

export type TaskSeverity = 'critical' | 'warning' | 'info';

export interface PendingTask {
  id: string;
  severity: TaskSeverity;
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  count?: number;
}

const SEVERITY_STYLES: Record<TaskSeverity, { bg: string; border: string; accent: string; icon: string }> = {
  critical: { bg: 'bg-red-50', border: 'border-red-200', accent: 'text-red-700', icon: 'text-red-500' },
  warning:  { bg: 'bg-amber-50', border: 'border-amber-200', accent: 'text-amber-800', icon: 'text-amber-500' },
  info:     { bg: 'bg-blue-50', border: 'border-blue-200', accent: 'text-blue-700', icon: 'text-blue-500' },
};

function SeverityIcon({ severity }: { severity: TaskSeverity }) {
  if (severity === 'critical') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.008v.008H12v-.008Z" />
      </svg>
    );
  }
  if (severity === 'warning') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    );
  }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
    </svg>
  );
}

interface Props {
  tasks?: PendingTask[];
  fetchOnMount?: boolean;
  showHeader?: boolean;
  emptyMessage?: string;
}

/**
 * Bloque de tareas pendientes (fiscales, operativas críticas).
 * - Si `tasks` se pasa como prop, renderiza esas.
 * - Si `fetchOnMount` está activo, hace fetch a /admin/tasks/pending.
 * - Cuando no hay tareas: banner verde "Todo al día" (oculta si showHeader=false).
 */
export default function PendingTasksCard({
  tasks: tasksProp,
  fetchOnMount = false,
  showHeader = true,
  emptyMessage = 'No hay tareas fiscales pendientes.',
}: Props) {
  const [tasks, setTasks] = useState<PendingTask[]>(tasksProp || []);

  useEffect(() => {
    if (!fetchOnMount) return;
    let cancelled = false;
    api.get('/admin/tasks/pending')
      .then((r) => { if (!cancelled) setTasks(Array.isArray(r.data) ? r.data : []); })
      .catch(() => { if (!cancelled) setTasks([]); });
    return () => { cancelled = true; };
  }, [fetchOnMount]);

  useEffect(() => {
    if (tasksProp) setTasks(tasksProp);
  }, [tasksProp]);

  if (!tasks.length) {
    if (!showHeader) return null;
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-emerald-600 flex-shrink-0">
          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
        </svg>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-emerald-900">Todo al día</p>
          <p className="text-xs text-emerald-700">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {showHeader && (
        <div className="flex items-center gap-2 px-1">
          <div className="w-2 h-2 bg-red-500 rounded-full" />
          <h3 className="text-sm font-semibold text-gray-900">Tareas pendientes</h3>
          <span className="text-xs text-gray-400">({tasks.length})</span>
        </div>
      )}
      <div className="space-y-2">
        {tasks.map((task) => {
          const style = SEVERITY_STYLES[task.severity];
          return (
            <div key={task.id} className={`${style.bg} ${style.border} border rounded-2xl p-3 md:p-4 flex items-start gap-3`}>
              <div className={`${style.icon} flex-shrink-0 mt-0.5`}>
                <SeverityIcon severity={task.severity} />
              </div>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-semibold ${style.accent}`}>{task.title}</p>
                <p className="text-xs text-gray-700 mt-0.5 leading-relaxed">{task.description}</p>
                <Link
                  href={task.ctaHref}
                  className={`inline-flex items-center gap-1 mt-2 text-xs font-semibold ${style.accent} hover:underline`}
                >
                  {task.ctaLabel}
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
