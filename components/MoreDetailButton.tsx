'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface MoreDetailButtonProps {
  subdescription?: string;
}

export default function MoreDetailButton({ subdescription }: MoreDetailButtonProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!subdescription) return null;

  return (
    <div className="mt-3">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/30 rounded-lg text-amber-300 hover:from-amber-500/30 hover:to-yellow-500/30 transition-all shadow-sm hover:shadow-amber-500/20"
      >
        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        <span className="text-sm font-medium">More Detail</span>
      </button>
      
      {isExpanded && (
        <div className="mt-3 p-4 bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/20 rounded-lg animate-fadeIn shadow-inner">
          <div className="prose prose-invert prose-sm max-w-none">
            <ReactMarkdown>{subdescription}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
} 