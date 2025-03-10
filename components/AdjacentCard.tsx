'use client';

import { Bookmark, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/utils/utils';

interface Subsection {
  id: string;
  title: string;
}

interface AdjacentCardProps {
  subsection: Subsection;
  isBookmarked: boolean;
  isPrevious: boolean; // true for previous, false for next
  onClick: () => void;
}

export default function AdjacentCard({
  subsection,
  isBookmarked,
  isPrevious,
  onClick
}: AdjacentCardProps) {
  return (
    <button
      onClick={onClick}
      className="w-full max-w-4xl mx-auto bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 p-3 text-left transition-all duration-200 group transform hover:scale-[1.02] shadow-sm hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isPrevious ? (
            <ChevronUp className="h-4 w-4 text-gray-400 group-hover:text-gray-300" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400 group-hover:text-gray-300" />
          )}
          <span className="text-sm text-gray-400 font-medium group-hover:text-gray-300 truncate">
            {isPrevious ? 'Previous' : 'Next'}: {subsection.title}
          </span>
        </div>
        {isBookmarked && (
          <div className="text-blue-400">
            <Bookmark className="h-4 w-4" />
          </div>
        )}
      </div>
    </button>
  );
} 