import { cn } from "@/utils/utils";
import { Bookmark, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

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

interface ProgressBarProps {
  sections: Section[];
  subsections: Subsection[];
  isSubsectionCommitted: (subsectionId: string) => boolean;
  bookmarkedSubsections?: Set<string>;
  clearBookmarks?: () => void;
  scrollToSubsection?: (subsectionId: string) => void;
  className?: string;
}

export default function ProgressBar({
  sections,
  subsections,
  isSubsectionCommitted,
  bookmarkedSubsections = new Set(),
  clearBookmarks = () => {},
  scrollToSubsection = () => {},
  className
}: ProgressBarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className={cn(
      "relative h-full bg-gray-900 transition-all duration-300 overflow-y-auto",
      isCollapsed ? "w-16" : "w-64",
      className
    )}>
      {/* Toggle button */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute top-4 left-2 p-1 rounded-full bg-gray-800 border border-white/10 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors z-10"
        aria-label={isCollapsed ? "Expand progress" : "Collapse progress"}
      >
        {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>

      <div className="p-4 space-y-6">
        {!isCollapsed && (
          <>
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3">Progress</h3>
              <div className="space-y-4">
                {sections.map((section) => {
                  const sectionSubsections = subsections.filter(sub => sub.section_id === section.id);
                  const completedSubsections = sectionSubsections.filter(sub => isSubsectionCommitted(sub.id));
                  const progress = sectionSubsections.length ? 
                    (completedSubsections.length / sectionSubsections.length) * 100 : 0;
                  
                  return (
                    <div key={section.id} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400 truncate">{section.title}</span>
                        <span className="text-xs text-gray-400">{Math.round(progress)}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-400">Bookmarks</h3>
                {bookmarkedSubsections.size > 0 && (
                  <button
                    onClick={clearBookmarks}
                    className="p-1 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {Array.from(bookmarkedSubsections).map(subsectionId => {
                  const subsection = subsections.find(sub => sub.id === subsectionId);
                  if (!subsection) return null;
                  
                  return (
                    <button
                      key={subsectionId}
                      onClick={() => scrollToSubsection(subsectionId)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-sm"
                    >
                      <Bookmark className="h-4 w-4 text-blue-400" />
                      <span className="text-gray-300 truncate">{subsection.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
} 