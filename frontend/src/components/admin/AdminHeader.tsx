'use client';

import Link from 'next/link';
import { ReactNode } from 'react';

interface AdminHeaderProps {
  title: string;
  backHref?: string;
  rightContent?: ReactNode;
  showFilterButton?: boolean;
  filterActive?: boolean;
  onFilterToggle?: () => void;
}

export default function AdminHeader({
  title,
  backHref = '/admin',
  rightContent,
  showFilterButton = false,
  filterActive = false,
  onFilterToggle,
}: AdminHeaderProps) {
  return (
    <div className="bg-white border-b border-gray-100 sticky top-0 z-40">
      <div className="flex items-center px-4 h-14">
        <Link
          href={backHref}
          className="w-10 h-10 flex items-center justify-center text-gray-600 hover:text-gray-900 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-5 h-5"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </Link>
        <span className="flex-1 text-center font-semibold text-gray-900">{title}</span>
        {showFilterButton ? (
          <button
            onClick={onFilterToggle}
            className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${
              filterActive ? 'bg-primary/10 text-primary' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75"
              />
            </svg>
          </button>
        ) : rightContent ? (
          <div className="w-10 flex justify-end">{rightContent}</div>
        ) : (
          <div className="w-10" />
        )}
      </div>
    </div>
  );
}
