'use client';

import { cn } from '@/utils/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Check, Lock } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';

interface Section {
  id: string;
  title: string;
  description: string;
  order_position: number;
  subdescription?: string;
}

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

interface SectionIndicatorProps {
  sections: Section[];
  allSubsections: Subsection[];
  currentSubsectionId: string;
  currentIndex: number;
  className?: string;
  position?: 'left' | 'right';
  onNavigateToSubsection?: (subsectionId: string) => void;
  isSubsectionCommitted?: (subsectionId: string) => boolean;
  canEditSection?: (sectionId: string) => boolean;
}

export default function SectionIndicator({
  sections,
  allSubsections,
  currentSubsectionId,
  currentIndex,
  className,
  position = 'left',
  onNavigateToSubsection,
  isSubsectionCommitted = () => false,
  canEditSection = () => true
}: SectionIndicatorProps) {
  // Find the current subsection
  const currentSubsection = allSubsections.find(sub => sub.id === currentSubsectionId);
  
  // Group subsections by section
  const subsectionsBySection = sections.reduce((acc, section) => {
    acc[section.id] = allSubsections.filter(sub => sub.section_id === section.id);
    return acc;
  }, {} as Record<string, Subsection[]>);

  // State to track if focus card is close to the timeline
  const [showLabels, setShowLabels] = useState(true);
  const timelineRef = useRef<HTMLDivElement>(null);
  
  // Effect to check if focus card is close to the timeline
  useEffect(() => {
    const checkFocusCardPosition = () => {
      // Look for any element with class containing "focus-card" or similar
      const focusCards = document.querySelectorAll('[class*="focus-card"], [class*="focusCard"], .card, .main-content');
      const timeline = timelineRef.current;
      
      if (focusCards.length > 0 && timeline) {
        const timelineRect = timeline.getBoundingClientRect();
        
        // Check each potential focus card
        for (const focusCard of focusCards) {
          const focusRect = focusCard.getBoundingClientRect();
          
          // Calculate distance between focus card and timeline
          const distance = position === 'left' 
            ? focusRect.left - timelineRect.right
            : timelineRect.left - focusRect.right;
          
          // If any focus card is too close, hide labels
          if (distance < 150) {
            setShowLabels(false);
            return;
          }
        }
        
        // If we get here, no focus cards are too close
        setShowLabels(true);
      }
    };
    
    // Check initially and on window resize
    checkFocusCardPosition();
    
    // Also check periodically in case of dynamic content changes
    const intervalId = setInterval(checkFocusCardPosition, 500);
    window.addEventListener('resize', checkFocusCardPosition);
    document.addEventListener('scroll', checkFocusCardPosition, { passive: true });
    
    return () => {
      clearInterval(intervalId);
      window.removeEventListener('resize', checkFocusCardPosition);
      document.removeEventListener('scroll', checkFocusCardPosition);
    };
  }, [position]);
  
  return (
    <div 
      ref={timelineRef}
      className={cn(
        "absolute top-1/2 transform -translate-y-1/2 h-2/5 hidden md:block",
        position === 'left' ? "left-8" : "right-8",
        className
      )}
    >
      <div className="relative h-full w-full">
        {/* Render sections and their subsections */}
        {sections.map((section, sectionIndex) => {
          const sectionSubsections = subsectionsBySection[section.id] || [];
          if (sectionSubsections.length === 0) return null;
          
          // Calculate the section's position range
          const sectionStartIndex = allSubsections.findIndex(sub => sub.id === sectionSubsections[0].id);
          const sectionEndIndex = sectionStartIndex + sectionSubsections.length - 1;
          
          // Calculate position percentage for the section label (at the start of its subsections)
          const sectionLabelPosition = (sectionStartIndex / (allSubsections.length - 1)) * 100;
          
          // Determine if this section is active
          const isActive = currentSubsection?.section_id === section.id;
          const isLocked = !canEditSection(section.id);
          
          return (
            <div key={section.id} className="flex flex-col items-center">
              {/* Section label - positioned much further to the right of the timeline */}
              {showLabels && (
                <div 
                  className={cn(
                    "absolute whitespace-nowrap transition-all duration-200 flex items-center gap-1 hidden md:flex",
                    isActive ? "text-blue-400" : isLocked ? "text-gray-500" : "text-gray-400"
                  )}
                  style={{ 
                    top: `${sectionLabelPosition}%`, 
                    transform: 'translateY(-50%)',
                    [position === 'left' ? 'left' : 'right']: position === 'left' ? '40px' : '40px'
                  }}
                >
                  <span className="text-[10px] font-medium">
                    {section.title}
                  </span>
                  {isLocked && <Lock className="h-2.5 w-2.5 text-gray-500" />}
                </div>
              )}
              
              {/* Subsection ticks for this section */}
              <div className="flex flex-col gap-0.5">
                {sectionSubsections.map((subsection, subIndex) => {
                  const globalIndex = allSubsections.findIndex(sub => sub.id === subsection.id);
                  const positionPercent = (globalIndex / (allSubsections.length - 1)) * 100;
                  
                  // Determine status
                  const isActive = subsection.id === currentSubsectionId;
                  const isCompleted = isSubsectionCommitted(subsection.id);
                  const isLocked = !canEditSection(section.id);
                  
                  // Determine color based on status
                  let tickColor = "bg-gray-200"; // incomplete (white)
                  if (isLocked) tickColor = "bg-gray-600"; // unavailable (grey)
                  if (isCompleted) tickColor = "bg-blue-500"; // completed (blue)
                  if (isActive) tickColor = "bg-blue-500"; // active (blue)
                  
                  return (
                    <TooltipProvider key={subsection.id}>
                      <Tooltip delayDuration={300}>
                        <TooltipTrigger asChild>
                          <button
                            className={cn(
                              "absolute transition-all duration-200 cursor-pointer hover:opacity-100 rounded-sm",
                              position === 'left' ? "left-0" : "right-0",
                              isActive ? "w-10 h-1.5" : "w-5 h-1.5",
                              tickColor,
                              isLocked ? "opacity-50 cursor-not-allowed" : "opacity-80 hover:opacity-100"
                            )}
                            style={{ top: `${positionPercent}%` }}
                            onClick={() => {
                              if (!isLocked && onNavigateToSubsection) {
                                onNavigateToSubsection(subsection.id);
                              }
                            }}
                          >
                            {isCompleted && (
                              <span className="absolute -right-3 top-1/2 transform -translate-y-1/2">
                                <Check className="h-3 w-3 text-blue-500" />
                              </span>
                            )}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent 
                          side={position === 'left' ? 'right' : 'left'}
                          className="bg-gray-800 text-white border-gray-700 text-xs py-1 px-2"
                        >
                          {subsection.title}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
} 