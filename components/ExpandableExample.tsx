'use client';

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { ChevronDown, ChevronUp, PlusCircle } from 'lucide-react';

interface ExpandableExampleProps {
  example: string;
}

export default function ExpandableExample({ example }: ExpandableExampleProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check if we're on a mobile device
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

  const toggleExpand = () => {
    if (isMobile) {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <div 
      className={`bg-blue-900/20 border border-blue-800/30 rounded-lg p-3 transition-all duration-300 ${isExpanded ? 'bg-blue-900/30' : 'hover:bg-blue-900/25'}`}
      onMouseEnter={() => !isMobile && setIsExpanded(true)}
      onMouseLeave={() => !isMobile && setIsExpanded(false)}
      onClick={toggleExpand}
      role={isMobile ? "button" : undefined}
      aria-expanded={isMobile ? isExpanded : undefined}
    >
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-medium text-blue-400">Example:</h4>
        <div className="flex items-center gap-1.5 text-xs text-blue-400">
          <span>{isMobile ? (isExpanded ? 'Tap to hide' : 'Tap to view') : (isExpanded ? 'Hover to view' : 'Hover to expand')}</span>
          {isExpanded ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </div>
      </div>
      
      <div 
        className={`overflow-hidden transition-all duration-300 ${
          isExpanded ? 'max-h-[1000px] opacity-100 mt-2' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="prose prose-invert prose-sm max-w-none">
          <ReactMarkdown>{example}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
} 