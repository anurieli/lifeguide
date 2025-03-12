'use client';

import { useState, useRef, useEffect } from 'react';
import { Bookmark, Edit, Check, Info, HelpCircle } from 'lucide-react';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import RichTextInput from "@/components/RichTextInput";
import ReactMarkdown from 'react-markdown';
import { cn } from "@/utils/utils";

interface Subsection {
  id: string;
  section_id: string;
  title: string;
  description: string;
  subdescription: string;
  malleability_level: 'green' | 'yellow' | 'red';
  malleability_details: string;
  example: string;
  order_position: number;
}

interface FocusCardProps {
  subsection: Subsection;
  sectionTitle?: string;
  userResponse: string;
  isCommitted: boolean;
  isBookmarked: boolean;
  canCommit: boolean;
  canEdit: boolean;
  onResponseChange: (value: string) => void;
  onToggleCommit: () => void;
  onToggleBookmark: () => void;
  onToggleExample: () => void;
  isExampleShown: boolean;
  TOOLTIP_CLASSES: { content: string; arrow: string };
  autoFocus?: boolean;
}

export default function FocusCard({
  subsection,
  sectionTitle,
  userResponse,
  isCommitted,
  isBookmarked,
  canCommit,
  canEdit,
  onResponseChange,
  onToggleCommit,
  onToggleBookmark,
  onToggleExample,
  isExampleShown,
  TOOLTIP_CLASSES,
  autoFocus
}: FocusCardProps) {
  // Reference to the card container
  const cardRef = useRef<HTMLDivElement>(null);
  
  return (
    <div className="flex flex-col w-full max-w-4xl mx-auto" ref={cardRef}>
      {sectionTitle && (
        <div className="mb-3 pointer-events-none">
          <style jsx>{`
            .section-title {
              font-family: Futura, "Trebuchet MS", Arial, sans-serif;
              text-transform: lowercase;
              letter-spacing: 0.5px;
            }
          `}</style>
          <h2 className="section-title text-4xl font-light text-gray-500 opacity-60 pl-2">
            {sectionTitle}
          </h2>
        </div>
      )}
      
      <div className="bg-white/10 rounded-xl backdrop-blur-sm border border-white/10 p-6 ring-1 ring-white/20 shadow-xl w-full">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-medium text-white">{subsection.title}</h3>
            {subsection.subdescription && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-5 w-5 text-gray-400" />
                  </TooltipTrigger>
                  <TooltipContent className={TOOLTIP_CLASSES.content}>
                    <div className="prose prose-invert max-w-xs">
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <p className="text-gray-400 mt-1">{children}</p>,
                          strong: ({ children }) => <strong className="text-white">{children}</strong>,
                          em: ({ children }) => <em className="text-gray-300">{children}</em>,
                          ul: ({ children }) => <ul className="list-disc pl-4 text-gray-400">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal pl-4 text-gray-400">{children}</ol>,
                          li: ({ children }) => <li className="text-gray-400">{children}</li>
                        }}
                      >
                        {subsection.subdescription}
                      </ReactMarkdown>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleBookmark}
              disabled={isCommitted}
              className={`p-2 rounded-full transition-colors ${
                isCommitted
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : isBookmarked
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              }`}
            >
              <Bookmark className="h-5 w-5" />
            </button>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={onToggleCommit}
                    disabled={!canCommit || !canEdit}
                    className={`p-2 rounded-full transition-colors ${
                      !canEdit
                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                        : isCommitted
                        ? 'bg-green-500/20 text-green-400'
                        : canCommit
                        ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/40'
                        : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {isCommitted ? (
                      <Edit className="h-5 w-5" />
                    ) : (
                      <Check className="h-5 w-5" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent className={TOOLTIP_CLASSES.content}>
                  <p>{isCommitted ? 'Edit Response' : 'Commit Response'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        <div className="space-y-6 text-sm">
          <div className="flex items-start gap-2">
            <div className="flex-1 prose prose-invert max-w-none text-lg">
              <ReactMarkdown
                components={{
                  p: ({ children }) => <p className="text-gray-300 mt-2">{children}</p>,
                  strong: ({ children }) => <strong className="text-white">{children}</strong>,
                  em: ({ children }) => <em className="text-gray-300">{children}</em>,
                  ul: ({ children }) => <ul className="list-disc pl-4 text-gray-300">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal pl-4 text-gray-300">{children}</ol>,
                  li: ({ children }) => <li className="text-gray-300">{children}</li>
                }}
              >
                {subsection.description}
              </ReactMarkdown>
            </div>
            <span className={`px-2 py-0.5 h-min rounded-full text-xs ${
              subsection.malleability_level === 'green' ? 'bg-green-500/20 text-green-400' :
              subsection.malleability_level === 'yellow' ? 'bg-yellow-500/20 text-yellow-400' :
              'bg-red-500/20 text-red-400'
            }`}>
              {subsection.malleability_level === 'green' ? 'flexible' :
              subsection.malleability_level === 'yellow' ? 'stiff' :
              'static'}
            </span>
            {subsection.malleability_details && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="h-4 w-4 text-gray-400" />
                  </TooltipTrigger>
                  <TooltipContent className={TOOLTIP_CLASSES.content}>
                    <div className="prose prose-invert max-w-xs">
                      <ReactMarkdown>
                        {subsection.malleability_details}
                      </ReactMarkdown>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          <div>
            <button
              onClick={onToggleExample}
              className="text-blue-400 hover:text-blue-300 transition-colors text-sm mb-2"
            >
              {isExampleShown ? 'Hide Example' : 'Show Example'}
            </button>
            {isExampleShown && (
              <div className="mt-2 p-4 bg-gray-900/80 rounded-lg border border-gray-800">
                <div className="prose prose-invert max-w-none">
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p className="text-gray-400">{children}</p>,
                      strong: ({ children }) => <strong className="text-white">{children}</strong>,
                      em: ({ children }) => <em className="text-gray-300">{children}</em>,
                      ul: ({ children }) => <ul className="list-disc pl-4 text-gray-400">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal pl-4 text-gray-400">{children}</ol>,
                      li: ({ children }) => <li className="text-gray-400">{children}</li>
                    }}
                  >
                    {subsection.example}
                  </ReactMarkdown>
                </div>
              </div>
            )}
          </div>

          <div>
            <RichTextInput
              value={userResponse || ''}
              onChange={onResponseChange}
              disabled={isCommitted || !canEdit}
              placeholder={
                !canEdit
                  ? "Complete previous sections first"
                  : isCommitted
                  ? "Response committed. Click edit to modify."
                  : "Start typing here..."
              }
              autoFocus={autoFocus && !isCommitted && canEdit}
            />
          </div>
        </div>
      </div>
    </div>
  );
} 