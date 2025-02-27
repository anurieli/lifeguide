'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface ExpandableExampleProps {
  example: string;
}

export default function ExpandableExample({ example }: ExpandableExampleProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div 
      className={`bg-blue-900/20 border border-blue-800/30 rounded-lg p-3 transition-all duration-300 ${isExpanded ? 'bg-blue-900/30' : 'hover:bg-blue-900/25'}`}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-medium text-blue-400">Example:</h4>
        <div className="flex items-center gap-1.5 text-xs text-blue-400">
          <span>{isExpanded ? 'Hover to view' : 'Hover to expand'}</span>
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