'use client';

import { cn } from '@/utils/utils';

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
}

export default function SectionIndicator({
  sections,
  allSubsections,
  currentSubsectionId,
  currentIndex,
  className,
  position = 'left'
}: SectionIndicatorProps) {
  // Find the current subsection
  const currentSubsection = allSubsections.find(sub => sub.id === currentSubsectionId);
  
  return (
    <div 
      className={cn(
        "absolute top-1/2 transform -translate-y-1/2 h-2/5 w-px bg-gray-700 hidden md:block",
        position === 'left' ? "left-8" : "right-8",
        className
      )}
    >
      <div className="relative h-full w-full">
        {/* Subsection ticks */}
        {allSubsections.map((subsection, index) => {
          // Calculate position - going down as you progress
          const position = (index / (allSubsections.length - 1)) * 100;
          
          // Determine if this is the current subsection
          const isActive = subsection.id === currentSubsectionId;
          
          // Determine if this is the first subsection of a section
          const isFirstInSection = index === 0 || 
            allSubsections[index - 1]?.section_id !== subsection.section_id;
          
          // Skip some ticks to make it more compact (show only every 3rd tick unless it's active or first in section)
          if (!isActive && !isFirstInSection && index % 3 !== 0) {
            return null;
          }
          
          return (
            <div 
              key={subsection.id}
              className={cn(
                "absolute h-px transition-all duration-200",
                position === 'left' ? "left-0" : "right-0",
                isActive ? "w-3 bg-blue-500" : "w-1.5 bg-gray-500",
                isFirstInSection ? "mt-1" : ""
              )}
              style={{ 
                top: `${position}%`,
                marginTop: isFirstInSection ? '2px' : '0'
              }}
            />
          );
        })}
        
        {/* Current position indicator */}
        <div 
          className={cn(
            "absolute w-3 h-1 bg-blue-500 rounded-sm transition-all duration-300",
            position === 'left' ? "left-0" : "right-0"
          )}
          style={{ 
            top: `${(currentIndex / (allSubsections.length - 1)) * 100}%`,
            transform: 'translateY(-50%)'
          }}
        />
        
        {/* Section labels */}
        {sections.map((section, sectionIndex) => {
          // Find the first subsection of this section
          const firstSubsectionOfSection = allSubsections.find(sub => sub.section_id === section.id);
          if (!firstSubsectionOfSection) return null;
          
          // Find its index
          const subsectionIndex = allSubsections.findIndex(sub => sub.id === firstSubsectionOfSection.id);
          
          // Calculate position - going down
          const position = (subsectionIndex / (allSubsections.length - 1)) * 100;
          
          // Determine if this section is active
          const isActive = currentSubsection?.section_id === section.id;
          
          // Skip some section labels to make it more compact (show only every other section unless it's active)
          if (!isActive && sectionIndex % 2 !== 0) {
            return null;
          }
          
          return (
            <div 
              key={section.id}
              className={cn(
                "absolute whitespace-nowrap transition-all duration-200",
                position === 'left' ? "left-4" : "right-4",
                isActive ? "text-blue-400" : "text-gray-500"
              )}
              style={{ top: `${position}%`, transform: 'translateY(-50%)' }}
            >
              <span className="text-[8px] font-medium opacity-60">{section.title}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
} 