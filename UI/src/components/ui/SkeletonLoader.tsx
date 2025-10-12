/**
 * Skeleton Loader Component
 * Shows placeholder animation while content is loading
 */

import React from 'react';

interface SkeletonProps {
  className?: string;
  count?: number;
}

export const SkeletonLine: React.FC<SkeletonProps> = ({ className = '', count = 1 }) => {
  return (
    <>
      {[...Array(count)].map((_, i) => (
        <div
          key={i}
          className={`animate-pulse bg-gray-300 rounded ${className}`}
        />
      ))}
    </>
  );
};

export const ThesisRowSkeleton: React.FC = () => (
  <tr className="animate-pulse hover:bg-gray-50">
    <td className="px-6 py-4">
      <div className="flex items-center">
        <div className="h-4 w-4 bg-gray-300 rounded mr-3"></div>
        <div className="flex-1 min-w-0">
          <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-300 rounded w-1/2"></div>
        </div>
      </div>
    </td>
    <td className="px-6 py-4">
      <div className="h-6 bg-gray-300 rounded-full w-24"></div>
    </td>
    <td className="px-6 py-4">
      <div className="h-4 bg-gray-300 rounded w-32"></div>
    </td>
    <td className="px-6 py-4">
      <div className="h-4 bg-gray-300 rounded w-24"></div>
    </td>
    <td className="px-6 py-4">
      <div className="flex items-center space-x-2">
        <div className="h-4 w-4 bg-gray-300 rounded"></div>
        <div className="h-4 w-4 bg-gray-300 rounded"></div>
        <div className="h-4 w-4 bg-gray-300 rounded"></div>
        <div className="h-4 w-4 bg-gray-300 rounded"></div>
      </div>
    </td>
  </tr>
);

interface ThesisListSkeletonProps {
  rows?: number;
}

export const ThesisListSkeleton: React.FC<ThesisListSkeletonProps> = ({ rows = 10 }) => (
  <tbody>
    {[...Array(rows)].map((_, i) => (
      <ThesisRowSkeleton key={i} />
    ))}
  </tbody>
);

export const FormSkeleton: React.FC = () => (
  <div className="space-y-6 animate-pulse">
    {[...Array(5)].map((_, i) => (
      <div key={i}>
        <div className="h-4 bg-gray-300 rounded w-1/4 mb-2"></div>
        <div className="h-10 bg-gray-200 rounded"></div>
      </div>
    ))}
  </div>
);

export const StatCardSkeleton: React.FC = () => (
  <div className="bg-white rounded-lg shadow p-6 animate-pulse">
    <div className="flex items-center">
      <div className="p-3 rounded-full bg-gray-200 w-12 h-12"></div>
      <div className="ml-4 flex-1">
        <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
        <div className="h-6 bg-gray-300 rounded w-16"></div>
      </div>
    </div>
  </div>
);

