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
  h1: ({ children }) => <h1 className="text-2xl font-bold text-white mb-4">{children}</h1>,
  h2: ({ children }) => <h2 className="text-xl font-bold text-white mb-3">{children}</h2>,
  h3: ({ children }) => <h3 className="text-lg font-bold text-white mb-2">{children}</h3>,
  p: ({ children }) => <p className="text-white mb-4">{children}</p>,
  ul: ({ children }) => <ul className="list-disc pl-6 text-white mb-4">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-6 text-white mb-4">{children}</ol>,
  li: ({ children }) => <li className="text-white mb-1 pl-1">{children}</li>,
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
  // State for visibility and editing mode
  const [isVisible, setIsVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [savedContent, setSavedContent] = useState(DEFAULT_GUIDE);
  const [isExpanded, setIsExpanded] = useState(false);

  // Ref for uncontrolled textarea
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load content and check first-time status on mount
  useEffect(() => {
    const storedContent = localStorage.getItem('guideContent');
    if (storedContent) {
      setSavedContent(storedContent);
    }

    const hasSeen = localStorage.getItem('hasSeenGuide');
    if (!hasSeen && displayMode === 'dialog') {
      setIsVisible(true);
    }
  }, [displayMode]);

  // Handle external control of visibility
  useEffect(() => {
    if (typeof externalIsOpen !== 'undefined') {
      setIsVisible(externalIsOpen);
    }
  }, [externalIsOpen]);

  // Handlers
  const toggleVisibility = () => {
    const newState = !isVisible;
    setIsVisible(newState);
    if (onOpenChange) {
      onOpenChange(newState);
    }
    if (newState) {
      localStorage.setItem('hasSeenGuide', 'true');
    }
  };

  const startEditing = () => {
    setIsEditing(true);
    setIsExpanded(true); // Auto-expand when editing
    if (textareaRef.current) {
      textareaRef.current.value = savedContent;
    }
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const saveContent = () => {
    if (textareaRef.current) {
      const newContent = textareaRef.current.value;
      setSavedContent(newContent);
      localStorage.setItem('guideContent', newContent);
    }
    setIsEditing(false);
    setIsExpanded(false); // Collapse after saving
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setIsExpanded(false); // Collapse after canceling
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  // Inline mode: render directly in the page
  if (displayMode === 'inline') {
    return (
      <div className={`bg-gray-900 text-white rounded-lg relative transition-all duration-300 ${
        isExpanded ? 'fixed inset-4 z-50 overflow-auto' : 'h-[500px] overflow-hidden'
      }`}>
        <div className={`p-4 ${isExpanded ? 'max-w-4xl mx-auto' : ''}`}>
          <textarea
            ref={textareaRef}
            defaultValue={savedContent}
            className={`w-full p-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              isEditing ? 'block' : 'hidden'
            } ${isExpanded ? 'h-[calc(100vh-150px)]' : 'h-64'}`}
          />
          <div className={`${isEditing ? 'hidden' : 'block'} ${isExpanded ? '' : 'max-h-[420px] overflow-hidden'}`}>
            <div className="prose">
              <ReactMarkdown components={markdownComponents}>{savedContent}</ReactMarkdown>
            </div>
          </div>
          
          <div className="flex justify-between items-center mt-4">
            {isEditable && (
              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <Button variant="outline" onClick={cancelEditing}>
                      Cancel
                    </Button>
                    <Button onClick={saveContent}>Save</Button>
                  </>
                ) : (
                  <Button onClick={startEditing}>Edit</Button>
                )}
              </div>
            )}
            
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleExpand} 
              className="ml-auto"
            >
              {isExpanded ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        
        {isExpanded && (
          <div 
            className="fixed inset-0 bg-black/50 -z-10" 
            onClick={() => !isEditing && setIsExpanded(false)}
          />
        )}
      </div>
    );
  }

  // Dialog mode: render as a modal
  return (
    <>
      {showButton && (
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleVisibility}
          className={buttonPosition === 'fixed' 
            ? "fixed bottom-4 right-4 bg-gray-800 text-white hover:bg-gray-700" 
            : "bg-gray-800 text-white hover:bg-gray-700"}
        >
          <HelpCircle className="h-5 w-5" />
        </Button>
      )}
      {isVisible && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-900 text-white p-6 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-auto">
            <div className="space-y-4">
              <h2 className="text-xl font-bold">How to Use This</h2>
              <textarea
                ref={textareaRef}
                defaultValue={savedContent}
                className={`w-full h-64 p-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isEditing ? 'block' : 'hidden'
                }`}
              />
              <div className={isEditing ? 'hidden' : 'block'}>
                <div className="prose">
                  <ReactMarkdown components={markdownComponents}>{savedContent}</ReactMarkdown>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                {isEditable && isEditing ? (
                  <>
                    <Button variant="outline" onClick={cancelEditing}>
                      Cancel
                    </Button>
                    <Button onClick={saveContent}>Save</Button>
                  </>
                ) : (
                  <>
                    {isEditable && (
                      <Button onClick={startEditing} variant="outline">
                        Edit
                      </Button>
                    )}
                    <Button onClick={toggleVisibility}>Close</Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}