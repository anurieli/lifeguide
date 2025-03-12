'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp, ArrowDown, HelpCircle, Sidebar, Maximize2, RotateCcw } from 'lucide-react';
import FocusCard from './FocusCard';
import AdjacentCard from './AdjacentCard';
import { cn } from '@/utils/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check, Bookmark } from 'lucide-react';
import SectionIndicator from './SectionIndicator';

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

interface FocusModeProps {
  sections: Section[];
  subsections: Subsection[];
  userResponses: Record<string, string>;
  bookmarkedSubsections: Set<string>;
  committedResponses: { subsectionId: string; isCommitted: boolean }[];
  expandedExamples: Set<string>;
  onToggleExample: (subsectionId: string) => void;
  onToggleBookmark: (subsectionId: string) => void;
  onToggleCommit: (subsectionId: string) => void;
  onResponseChange: (subsectionId: string, content: string) => void;
  isSubsectionCommitted: (subsectionId: string) => any;
  canCommitSubsection: (subsectionId: string) => any;
  canEditSection: (sectionId: string) => any;
  TOOLTIP_CLASSES: { content: string; arrow: string };
  clearBookmarks?: () => void;
  onExitFocusMode?: () => void;
  onToggleProgress?: () => void;
}

export default function FocusMode({
  sections,
  subsections,
  userResponses,
  bookmarkedSubsections,
  committedResponses,
  expandedExamples,
  onToggleExample,
  onToggleBookmark,
  onToggleCommit,
  onResponseChange,
  isSubsectionCommitted,
  canCommitSubsection,
  canEditSection,
  TOOLTIP_CLASSES,
  clearBookmarks,
  onExitFocusMode,
  onToggleProgress
}: FocusModeProps) {
  const [currentFocusIndex, setCurrentFocusIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showShortcutHelper, setShowShortcutHelper] = useState(true); // Show by default
  const [isHowToOpen, setIsHowToOpen] = useState(false);
  
  // Get a flat list of subsections ordered by section
  const allSubsections = sections.flatMap(section => 
    subsections
      .filter(sub => sub.section_id === section.id)
      .sort((a, b) => a.order_position - b.order_position)
  );

  // Calculate adjacent indices
  const prevIndex = currentFocusIndex > 0 ? currentFocusIndex - 1 : null;
  const nextIndex = currentFocusIndex < allSubsections.length - 1 ? currentFocusIndex + 1 : null;

  const currentSubsection = allSubsections[currentFocusIndex];
  const prevSubsection = prevIndex !== null ? allSubsections[prevIndex] : null;
  const nextSubsection = nextIndex !== null ? allSubsections[nextIndex] : null;

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Command+Down to go to next
      if ((e.metaKey || e.ctrlKey) && e.key === 'ArrowDown') {
        e.preventDefault();
        if (nextIndex !== null) {
          // If current card is uncommitted, commit it before moving
          if (currentSubsection && !isSubsectionCommitted(currentSubsection.id) && 
              canCommitSubsection(currentSubsection.id)) {
            onToggleCommit(currentSubsection.id);
            setTimeout(() => {
              setCurrentFocusIndex(nextIndex);
            }, 100);
          } else {
            setCurrentFocusIndex(nextIndex);
          }
        }
      }
      // Command+Up to go to previous
      if ((e.metaKey || e.ctrlKey) && e.key === 'ArrowUp') {
        e.preventDefault();
        if (prevIndex !== null) {
          // If current card is uncommitted, commit it before moving
          if (currentSubsection && !isSubsectionCommitted(currentSubsection.id) && 
              canCommitSubsection(currentSubsection.id)) {
            onToggleCommit(currentSubsection.id);
            setTimeout(() => {
              setCurrentFocusIndex(prevIndex);
            }, 100);
          } else {
            setCurrentFocusIndex(prevIndex);
          }
        }
      }
      
      // Space key to enter edit mode
      if (e.key === ' ' && !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
        // Only if the target is not an input element (to avoid conflicts with typing)
        const target = e.target as HTMLElement;
        const isInputElement = target.tagName === 'INPUT' || 
                              target.tagName === 'TEXTAREA' || 
                              target.isContentEditable;
        
        if (!isInputElement && currentSubsection) {
          // If the current subsection is committed, toggle it to edit mode
          if (isSubsectionCommitted(currentSubsection.id) && canEditSection(currentSubsection.section_id)) {
            e.preventDefault(); // Prevent space from scrolling the page
            onToggleCommit(currentSubsection.id);
          }
        }
      }
      
      // Toggle shortcut helper with ? key
      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        e.preventDefault();
        setShowShortcutHelper(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [prevIndex, nextIndex, currentSubsection, isSubsectionCommitted, canCommitSubsection, onToggleCommit, canEditSection]);

  // Navigation methods
  const goToPrevious = () => {
    if (prevIndex !== null) {
      // If current card is uncommitted, commit it before moving
      if (currentSubsection && !isSubsectionCommitted(currentSubsection.id) && 
          canCommitSubsection(currentSubsection.id)) {
        onToggleCommit(currentSubsection.id);
        setTimeout(() => {
          setCurrentFocusIndex(prevIndex);
        }, 100);
      } else {
        setCurrentFocusIndex(prevIndex);
      }
    }
  };

  const goToNext = () => {
    if (nextIndex !== null) {
      // If current card is uncommitted, commit it before moving
      if (currentSubsection && !isSubsectionCommitted(currentSubsection.id) && 
          canCommitSubsection(currentSubsection.id)) {
        onToggleCommit(currentSubsection.id);
        setTimeout(() => {
          setCurrentFocusIndex(nextIndex);
        }, 100);
      } else {
        setCurrentFocusIndex(nextIndex);
      }
    }
  };

  const handleToggleBookmark = (subsectionId: string) => {
    // Check if the subsection is already bookmarked before toggling
    const isCurrentlyBookmarked = bookmarkedSubsections.has(subsectionId);
    
    // Call the toggle function
    onToggleBookmark(subsectionId);
    
    // Only move to next if we're adding a bookmark (not removing it)
    if (!isCurrentlyBookmarked && nextIndex !== null) {
      // Add a small delay to allow the user to see the bookmark animation
      setTimeout(() => {
        goToNext();
      }, 300);
    }
  };

  const handleToggleCommit = (subsectionId: string) => {
    // Check if the subsection is already committed before toggling
    const isCurrentlyCommitted = isSubsectionCommitted(subsectionId);
    
    // Call the toggle function
    onToggleCommit(subsectionId);
    
    // Only move to next if we're committing (not uncommitting/editing)
    if (!isCurrentlyCommitted && nextIndex !== null) {
      // Add a small delay to allow the user to see the commit animation
      setTimeout(() => {
        goToNext();
      }, 300);
    }
  };

  // Shortcut helper component
  const ShortcutHelper = () => (
    <div className="bg-gray-800/70 backdrop-blur-sm border border-white/10 rounded-lg p-1.5 w-full max-w-3xl">
      <div className="flex items-center flex-wrap gap- text-xs text-gray-400">
        <div className="flex items-center gap-1 font-medium mr-1">
          <span>Shortcuts</span>
          <span>👉</span>
        </div>
        <div className="flex-1 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-[10px]">Esc</kbd>
            <span className="ml-0.5">Exit</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-[10px]">Space</kbd>
            <span className="ml-0.5">Edit</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="flex items-center">
              <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-[10px]">{navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}</kbd>
              <span>+</span>
              <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-[10px]">↑</kbd>
            </div>
            <span className="ml-0.5">Prev</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="flex items-center">
              <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-[10px]">{navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}</kbd>
              <span>+</span>
              <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-[10px]">↓</kbd>
            </div>
            <span className="ml-0.5">Next</span>
          </div>
        </div>
      </div>
    </div>
  );

  // Add ESC key handler
  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // First close the shortcut helper if it's open
        if (showShortcutHelper) {
          setShowShortcutHelper(false);
          return;
        }
        
        // Then exit focus mode if the handler exists
        if (onExitFocusMode) {
          // Auto-commit any uncommitted subsections before exiting
          if (currentSubsection && !isSubsectionCommitted(currentSubsection.id) && 
              canCommitSubsection(currentSubsection.id) && canEditSection(currentSubsection.section_id)) {
            onToggleCommit(currentSubsection.id);
            // Small delay to ensure the commit is processed
            setTimeout(() => {
              onExitFocusMode();
            }, 100);
          } else {
            onExitFocusMode();
          }
        }
      }
    };

    window.addEventListener('keydown', handleEscKey);
    return () => window.removeEventListener('keydown', handleEscKey);
  }, [onExitFocusMode, showShortcutHelper, currentSubsection, isSubsectionCommitted, canCommitSubsection, canEditSection, onToggleCommit]);

  // Get the current section for the section title
  const currentSection = sections.find(section => 
    section.id === currentSubsection?.section_id
  );

  // Update the exit focus mode button to auto-commit
  const handleExitFocusMode = () => {
    if (onExitFocusMode) {
      // Auto-commit any uncommitted subsections before exiting
      if (currentSubsection && !isSubsectionCommitted(currentSubsection.id) && 
          canCommitSubsection(currentSubsection.id) && canEditSection(currentSubsection.section_id)) {
        onToggleCommit(currentSubsection.id);
        // Small delay to ensure the commit is processed
        setTimeout(() => {
          onExitFocusMode();
        }, 100);
      } else {
        onExitFocusMode();
      }
    }
  };

  if (!currentSubsection) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        No subsections available
      </div>
    );
  }

  return (
    <div className="relative flex flex-col h-full overflow-hidden" ref={containerRef}>
      {/* Custom CSS to hide scrollbars */}
      <style jsx global>{`
        /* Hide scrollbar for Chrome, Safari and Opera */
        .focus-mode-container::-webkit-scrollbar {
          display: none;
        }
        
        /* Hide scrollbar for IE, Edge and Firefox */
        .focus-mode-container {
          -ms-overflow-style: none;  /* IE and Edge */
          scrollbar-width: none;  /* Firefox */
        }

        /* Futura-like font for section title */
        .section-title {
          font-family: Futura, "Trebuchet MS", Arial, sans-serif;
          text-transform: lowercase;
          letter-spacing: 0.5px;
        }
      `}</style>

      {/* How To button and other controls - now vertical */}
      <div className="absolute left-4 top-4 z-10 flex flex-col gap-2">
        <button
          onClick={() => setIsHowToOpen(true)}
          className="p-2 bg-blue-500/20 text-blue-400 rounded-full hover:bg-blue-500/30 transition-colors"
          aria-label="How to use Focus Mode"
        >
          <HelpCircle className="h-5 w-5" />
        </button>
        
        {/* Progress toggle button */}
        {onToggleProgress && (
          <button
            onClick={onToggleProgress}
            className="p-2 bg-purple-500/20 text-purple-400 rounded-full hover:bg-purple-500/30 transition-colors"
            aria-label="Toggle progress panel"
          >
            <Sidebar className="h-5 w-5" />
          </button>
        )}
        
        {/* Exit focus mode button */}
        {onExitFocusMode && (
          <button
            onClick={handleExitFocusMode}
            className="p-2 bg-gray-700/80 text-gray-400 rounded-full hover:bg-gray-700 transition-colors"
            aria-label="Exit focus mode"
          >
            <Maximize2 className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Update the buttons to be vertical */}
      <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex flex-col gap-3 z-10">
        <button
          onClick={goToPrevious}
          disabled={prevIndex === null}
          className={cn(
            "p-3 rounded-full shadow-lg transition-all",
            prevIndex !== null 
              ? "bg-gray-800 text-white hover:bg-gray-700" 
              : "bg-gray-800/50 text-gray-500 cursor-not-allowed"
          )}
        >
          <ArrowUp className="h-5 w-5" />
        </button>
        <button
          onClick={goToNext}
          disabled={nextIndex === null}
          className={cn(
            "p-3 rounded-full shadow-lg transition-all",
            nextIndex !== null 
              ? "bg-gray-800 text-white hover:bg-gray-700" 
              : "bg-gray-800/50 text-gray-500 cursor-not-allowed"
          )}
        >
          <ArrowDown className="h-5 w-5" />
        </button>
        
        {/* Back to Start button - only shown on the last card */}
        {nextIndex === null && prevIndex !== null && (
          <button
            onClick={() => setCurrentFocusIndex(0)}
            className="p-3 rounded-full shadow-lg transition-all bg-blue-600 text-white hover:bg-blue-700 mt-2"
            title="Back to Start"
          >
            <RotateCcw className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Use the SectionIndicator component */}
      <SectionIndicator 
        sections={sections}
        allSubsections={allSubsections}
        currentSubsectionId={currentSubsection?.id || ''}
        currentIndex={currentFocusIndex}
        position="left"
        onNavigateToSubsection={(subsectionId) => {
          const index = allSubsections.findIndex(sub => sub.id === subsectionId);
          if (index !== -1) {
            setCurrentFocusIndex(index);
          }
        }}
        isSubsectionCommitted={isSubsectionCommitted}
        canEditSection={canEditSection}
      />

      {/* How To Dialog - Update to include new shortcuts */}
      <Dialog open={isHowToOpen} onOpenChange={setIsHowToOpen}>
        <DialogContent className="bg-gray-900/95 backdrop-blur-sm border border-white/10 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text">
              How to Use Focus Mode
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-6">
              {/* Keyboard Shortcuts - Updated */}
              <div className="bg-gray-800/50 rounded-lg p-4 border border-white/10">
                <h3 className="text-lg font-medium text-white mb-3 flex items-center gap-2">
                  <kbd className="px-2 py-1 bg-gray-700 rounded text-xs">⌘</kbd>
                  <span>Keyboard Shortcuts</span>
                </h3>
                <ul className="space-y-2 text-gray-300">
                  <li className="flex items-center gap-2">
                    <span className="text-blue-400">•</span>
                    <div className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-[10px]">Space</kbd>
                      <span className="ml-1">Edit current card</span>
                    </div>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-blue-400">•</span>
                    <div className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-[10px]">{navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}</kbd>
                      <span>+</span>
                      <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-[10px]">↓</kbd>
                      <span className="ml-1">Go to next card</span>
                    </div>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-blue-400">•</span>
                    <div className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-[10px]">{navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}</kbd>
                      <span>+</span>
                      <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-[10px]">↑</kbd>
                      <span className="ml-1">Go to previous card</span>
                    </div>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-blue-400">•</span>
                    <div className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-[10px]">Esc</kbd>
                      <span className="ml-1">Exit focus mode (auto-saves)</span>
                    </div>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-blue-400">•</span>
                    <div className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-[10px]">?</kbd>
                      <span className="ml-1">Toggle shortcut helper</span>
                    </div>
                  </li>
                </ul>
              </div>
              
              {/* Navigation - Updated */}
              <div className="bg-gray-800/50 rounded-lg p-4 border border-white/10">
                <h3 className="text-lg font-medium text-white mb-3 flex items-center gap-2">
                  <motion.div 
                    animate={{ y: [0, -5, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  >
                    <ArrowUp className="h-5 w-5 text-blue-400" />
                  </motion.div>
                  <span>Navigation</span>
                  <motion.div 
                    animate={{ y: [0, 5, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  >
                    <ArrowDown className="h-5 w-5 text-blue-400" />
                  </motion.div>
                </h3>
                <ul className="space-y-2 text-gray-300">
                  <li className="flex items-center gap-2">
                    <span className="text-blue-400">•</span>
                    <span>Use the arrow buttons to move between cards</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-blue-400">•</span>
                    <span>Click on the previous/next cards to jump</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-blue-400">•</span>
                    <span>The timeline on the left shows your place</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-blue-400">•</span>
                    <span>Uncommitted changes are saved when navigating</span>
                  </li>
                </ul>
              </div>
              
              {/* Bookmarks */}
              <div className="bg-gray-800/50 rounded-lg p-4 border border-white/10">
                <h3 className="text-lg font-medium text-white mb-3 flex items-center gap-2">
                  <Bookmark className="h-5 w-5 text-blue-400" />
                  <span>Bookmarks</span>
                </h3>
                <ul className="space-y-2 text-gray-300">
                  <li className="flex items-center gap-2">
                    <span className="text-blue-400">•</span>
                    <span>Click to bookmark a card in the progress side panel</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-blue-400">•</span>
                    <span>Adding a bookmark will move to the next card</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-blue-400">•</span>
                    <span>Removing a bookmark will stay on the current card</span>
                  </li>
                </ul>
              </div>
              
              {/* Committing */}
              <div className="bg-gray-800/50 rounded-lg p-4 border border-white/10">
                <h3 className="text-lg font-medium text-white mb-3 flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-400" />
                  <span>Committing</span>
                </h3>
                <ul className="space-y-2 text-gray-300">
                  <li className="flex items-center gap-2">
                    <span className="text-blue-400">•</span>
                    <span>Click the check icon to commit your response</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-blue-400">•</span>
                    <span>Committing will move to the next card</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-blue-400">•</span>
                    <span>Click the edit icon to make changes to a committed response</span>
                  </li>
                </ul>
              </div>

          
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Content without drag constraints */}
      <div 
        className="flex-1 overflow-hidden py-8 focus-mode-container"
      >
        <div 
          className="h-full flex flex-col gap-4 w-full max-w-4xl mx-auto px-4"
        >
          {/* Previous subsection with animation */}
          {prevSubsection && (
            <div className="transform transition-all duration-300 opacity-80 hover:opacity-100">
              <AdjacentCard
                subsection={prevSubsection}
                isBookmarked={bookmarkedSubsections.has(prevSubsection.id)}
                isPrevious={true}
                onClick={goToPrevious}
              />
            </div>
          )}

          {/* Current subsection with animation */}
          <div 
            className="flex-1 min-h-[60vh] flex flex-col items-center py-4 w-full"
          >
            <FocusCard
              subsection={currentSubsection}
              sectionTitle={currentSection?.title}
              userResponse={userResponses[currentSubsection.id] || ''}
              isCommitted={isSubsectionCommitted(currentSubsection.id)}
              isBookmarked={bookmarkedSubsections.has(currentSubsection.id)}
              canCommit={canCommitSubsection(currentSubsection.id)}
              canEdit={canEditSection(currentSubsection.section_id)}
              onResponseChange={(value) => onResponseChange(currentSubsection.id, value)}
              onToggleCommit={() => handleToggleCommit(currentSubsection.id)}
              onToggleBookmark={() => handleToggleBookmark(currentSubsection.id)}
              onToggleExample={() => onToggleExample(currentSubsection.id)}
              isExampleShown={expandedExamples.has(currentSubsection.id)}
              TOOLTIP_CLASSES={TOOLTIP_CLASSES}
              autoFocus={true}
            />
            
            {/* Shortcut helper below the card */}
            {showShortcutHelper && <div className="mt-2 w-full flex justify-center">
              <ShortcutHelper />
            </div>}
          </div>

          {/* Next subsection with animation */}
          {nextSubsection && (
            <div className="transform transition-all duration-300 opacity-80 hover:opacity-100">
              <AdjacentCard
                subsection={nextSubsection}
                isBookmarked={bookmarkedSubsections.has(nextSubsection.id)}
                isPrevious={false}
                onClick={goToNext}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 