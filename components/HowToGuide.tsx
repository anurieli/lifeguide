// HowToGuide.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { HelpCircle, Maximize2, Minimize2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';

interface HowToGuideProps {
  displayMode?: 'dialog' | 'inline'; // Dialog or inline display
  isEditable?: boolean;             // Allow editing if true
  showButton?: boolean;             // Show a trigger button
  isOpen?: boolean;                 // Control dialog visibility externally
  onOpenChange?: (open: boolean) => void; // Handle dialog visibility changes
  buttonPosition?: 'fixed' | 'inline'; // Button position: fixed at bottom-right or inline
}

const DEFAULT_GUIDE = `# Welcome to Your Guide

1. **Build this in order.** First Persona Building (defining who you are)… then goal setting (where most people fail)… etc.

2. **Finish this in a week or less,** and for the best results in the same day. Complete section by section in order. When you return to do the next session, start from the very first section by re-reading all your previous completions, and making any changes you feel necessary.

3. **If you're stuck on a section** and aren't capable of providing a genuine response, then stop. Remember, the next time you get back to the document, start from the top, as these things build on each other.

4. **Until completion, read every day** (morning and night) no matter, and once completed, continue doing so for 5 days straight. Engage with it as much as possible when first starting.

5. **This can change,** its dynamic (the goals portion should be less dynamic). Read this every day if you can, morning and night. The more you become one with it the better you can get it to be exactly what you need to succeed (you can cut out fluff, hone in on what really matters as you slowly remove things that don't feed your purpose). (Rules for changing below)

6. **Malleability Level:** How often can I alter my answer?  
   - 🟢 *Flexible, dynamic, designed to be changed and altered as fast as you change.* Hell, it's even advised that you engage with these sections as often as possible.  
   - 🟡 *Don't rush to change.* These sections are subject to change, as we are not robots, but don't make it a habit to alter these sections once set in stone. Before submitting these sections, review them and question them before moving onto the next section.  
   - 🔴 *This should be a constant,* as it's much harder to run towards a moving goal. Each section's description will define its own rules for alteration. Before submitting these sections, review them before moving onto the next section, and be sure to get back to them once more before submitting the entire sheet.

   *Hover over a flag for more details.*

7. **Before submitting,** go over the whole thing again (I know it's tedious), but as we work on this sheet, our brains are becoming increasingly accustomed to this introspectiveness. Leverage the state you will be in to thoroughly review your sheet, remembering that there are certain sections that are temporarily "permanent" (as per #6).

8. **No one is reading this,** so speak the fucking truth.`;

// Markdown components configuration
const markdownComponents: Components = {
  h1: ({ children }) => <h1 className="text-2xl font-bold text-white mb-4 text-left">{children}</h1>,
  h2: ({ children }) => <h2 className="text-xl font-bold text-white mb-3 text-left">{children}</h2>,
  h3: ({ children }) => <h3 className="text-lg font-bold text-white mb-2 text-left">{children}</h3>,
  p: ({ children }) => <p className="text-white mb-4 text-left">{children}</p>,
  ul: ({ children }) => <ul className="list-disc pl-6 text-white mb-4 text-left">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-6 text-white mb-4 text-left">{children}</ol>,
  li: ({ children }) => <li className="text-white mb-1 pl-1 text-left">{children}</li>,
  strong: ({ children }) => <strong className="font-bold text-white">{children}</strong>,
  em: ({ children }) => <em className="italic text-white">{children}</em>,
} as Components;

export function HowToGuide({
  displayMode = 'dialog',
  isEditable = false,
  showButton = true,
  isOpen: externalIsOpen,
  onOpenChange,
  buttonPosition = 'fixed',
}: HowToGuideProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState(DEFAULT_GUIDE);
  const [isEditing, setIsEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const isMobile = typeof window !== 'undefined' ? window.innerWidth < 768 : false;

  // Sync with external open state if provided
  useEffect(() => {
    if (externalIsOpen !== undefined) {
      setIsOpen(externalIsOpen);
    }
  }, [externalIsOpen]);

  // Handle escape key to close dialog
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        if (onOpenChange) onOpenChange(false);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onOpenChange]);

  // Handle click outside to close dialog
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(e.target as Node) && isOpen) {
        setIsOpen(false);
        if (onOpenChange) onOpenChange(false);
      }
    };

    if (displayMode === 'dialog') {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, displayMode, onOpenChange]);

  const toggleVisibility = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    if (onOpenChange) onOpenChange(newState);
  };

  const startEditing = () => {
    setIsEditing(true);
    // Focus the textarea after it's rendered
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 0);
  };

  const saveContent = () => {
    if (textareaRef.current) {
      setContent(textareaRef.current.value);
    }
    setIsEditing(false);
  };

  const cancelEditing = () => {
    setIsEditing(false);
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  // Button component
  const GuideButton = () => (
    <Button
      onClick={toggleVisibility}
      className={`flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white ${
        buttonPosition === 'fixed'
          ? 'fixed bottom-4 right-4 z-50 shadow-lg'
          : 'inline-flex'
      }`}
    >
      <HelpCircle className="w-4 h-4" />
      <span className="hidden sm:inline">Guide Instructions</span>
    </Button>
  );

  // Dialog content
  const DialogContent = () => (
    <div
      ref={dialogRef}
      className={`bg-gray-900 border border-gray-700 rounded-lg shadow-xl overflow-hidden ${
        isExpanded
          ? 'fixed inset-4 z-50'
          : `fixed bottom-20 right-4 w-[90vw] max-w-md z-50 ${isMobile ? 'max-h-[70vh]' : 'max-h-[600px]'}`
      }`}
    >
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <h2 className="text-lg font-semibold text-white">Guide Instructions</h2>
        <div className="flex items-center gap-2">
          {isEditable && !isEditing && (
            <Button
              onClick={startEditing}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              Edit
            </Button>
          )}
          <Button
            onClick={toggleExpand}
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-white"
          >
            {isExpanded ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </Button>
          <Button
            onClick={toggleVisibility}
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-white"
          >
            ✕
          </Button>
        </div>
      </div>

      <div className={`overflow-y-auto p-4 ${isMobile ? 'max-h-[50vh]' : 'max-h-[500px]'}`}>
        {isEditing ? (
          <div className="flex flex-col gap-4">
            <textarea
              ref={textareaRef}
              defaultValue={content}
              className="w-full h-[300px] p-3 bg-gray-800 text-white border border-gray-700 rounded-md"
            />
            <div className="flex justify-end gap-2">
              <Button
                onClick={cancelEditing}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                onClick={saveContent}
                size="sm"
                className="text-xs bg-blue-600 hover:bg-blue-700"
              >
                Save
              </Button>
            </div>
          </div>
        ) : (
          <ReactMarkdown components={markdownComponents}>{content}</ReactMarkdown>
        )}
      </div>
    </div>
  );

  // Inline content
  const InlineContent = () => (
    <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-lg overflow-hidden w-full">
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <h2 className="text-lg font-semibold text-white">Guide Instructions</h2>
        {isEditable && !isEditing && (
          <Button
            onClick={startEditing}
            variant="outline"
            size="sm"
            className="text-xs"
          >
            Edit
          </Button>
        )}
      </div>

      <div className="p-4">
        {isEditing ? (
          <div className="flex flex-col gap-4">
            <textarea
              ref={textareaRef}
              defaultValue={content}
              className="w-full h-[300px] p-3 bg-gray-800 text-white border border-gray-700 rounded-md"
            />
            <div className="flex justify-end gap-2">
              <Button
                onClick={cancelEditing}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                onClick={saveContent}
                size="sm"
                className="text-xs bg-blue-600 hover:bg-blue-700"
              >
                Save
              </Button>
            </div>
          </div>
        ) : (
          <ReactMarkdown components={markdownComponents}>{content}</ReactMarkdown>
        )}
      </div>
    </div>
  );

  return (
    <>
      {showButton && <GuideButton />}
      
      {displayMode === 'dialog' ? (
        isOpen && <DialogContent />
      ) : (
        <InlineContent />
      )}
    </>
  );
}