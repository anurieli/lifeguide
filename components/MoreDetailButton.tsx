'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Info, PlusCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface MoreDetailButtonProps {
  subdescription?: string;
}

export default function MoreDetailButton({ subdescription }: MoreDetailButtonProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Initial check
    checkMobile();
    
    // Add resize listener
    window.addEventListener('resize', checkMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!subdescription) return null;

  // For mobile: always show content without buttons
  if (isMobile) {
    return (
      <div className="mt-4 mb-4">
        <div className="p-4 bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/20 rounded-lg shadow-inner">
          <div className="prose prose-invert prose-sm max-w-none">
            <ReactMarkdown>{subdescription}</ReactMarkdown>
          </div>
        </div>
      </div>
    );
  }

  // For desktop: use the original expandable button
  return (
    <div className="mt-3">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/30 rounded-lg text-amber-300 hover:from-amber-500/30 hover:to-yellow-500/30 transition-all shadow-sm hover:shadow-amber-500/20"
        aria-expanded={isExpanded}
        aria-label={isExpanded ? "Hide details" : "Show more details"}
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