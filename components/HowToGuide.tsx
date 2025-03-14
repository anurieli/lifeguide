// HowToGuide.tsx
'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { HelpCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface HowToGuideProps {
  displayMode?: 'dialog' | 'inline';
  isEditable?: boolean;
  showButton?: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  buttonPosition?: 'fixed' | 'inline';
}

const DEFAULT_GUIDE = `# Welcome to Your Guide

1. **Build in Order.** **Order matters** Lifeguide was designed with first principles, and the order of the guides sections is not without reason. So work on this sheet in order: first *Persona Building* (defining who you are), then *Goal Setting* (where most people fail), and finally *Forging The Mindset* (Tools for later).

2. **Complete Quickly.** **You want to be in an introspective state of flow when filling your guide.** You want to maintain the linearity of your motivated self. For the best results, finish in the same day. If you don't finish in the same day, when you return start from the top by re-reading all your previous completions, and making any changes you feel necessary.

3. **Handling Roadblocks.** **If you're stuck on a section** and aren't capable of providing a genuine response, then bookmark it and move on. If you are no longer in that introspective state of flow, close the editor and go chill. Remember, the next time you get back to the document, start from the top, as these things build on each other.

4. **Daily Review.** **You want to keep this top of mind for a while.** Read this every day (morning and night), no matter, for at least 5 days straight. Engage with it as much as possible when first starting. Try and incorporate it into your daily routine, as it will become a part of your identity.

5. **Dynamic Blueprint.** **This can change,** it's supposed to. It's dynamic (the goals portion should be less dynamic). When you read it every day, think if your responses still resonate; if not, change them. The more you become one with it the better you can get it to be exactly what you need to succeed (you can cut out fluff, hone in on what really matters as you slowly remove things that don't feed your purpose).

6. **Understand Malleability Levels.** **How dynamic is this section?** *Regarding previous card...*  
   - 🟢 *Flexible, dynamic, designed to be changed and altered as fast as you change.* Hell, it's even advised that you engage with these sections as often as possible.  
   - 🟡 *Don't rush to change.* These sections are subject to change, as we are not robots, but don't make it a habit to alter these sections once set in stone. Before submitting these sections, review them and question them before moving onto the next section.  
   - 🔴 *This should be a constant,* as it's much harder to run towards a moving goal. Each section's description will define its own rules for alteration. Before submitting these sections, review them before moving onto the next section, and be sure to get back to them once more before submitting the entire sheet.

7. **Final Review.** **Before submitting,** go over the whole thing again (I know it's tedious), but as we work on this sheet, our brains are becoming increasingly accustomed to this introspectiveness. Leverage the state you will be in to thoroughly review your sheet, remembering that there are certain sections that are temporarily "permanent".

8. **Be Authentic.** **No one is reading this,** so speak the your truth.`;

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
  const [content, setContent] = useState(DEFAULT_GUIDE);
  const [isOpen, setIsOpen] = useState(externalIsOpen ?? false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const saveContent = () => {
    if (textareaRef.current) {
      setContent(textareaRef.current.value);
    }
    setIsEditOpen(false);
  };

  // For dialog mode
  const FloatingButton = () => (
    <Button
      onClick={() => {
        const newState = !isOpen;
        setIsOpen(newState);
        if (onOpenChange) onOpenChange(newState);
      }}
      className={`flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white ${
        buttonPosition === 'fixed' ? 'fixed bottom-4 right-4 z-50 shadow-lg' : 'inline-flex'
      }`}
    >
      <HelpCircle className="w-4 h-4" />
      <span className="hidden sm:inline">Guide Instructions</span>
    </Button>
  );

  const FloatingDialog = () => {
    if (!isOpen) return null;
    
    return (
      <div className="fixed bottom-20 right-4 w-[90vw] max-w-md z-50 max-h-[600px] bg-gray-900 border border-gray-700 rounded-lg shadow-xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">Guide Instructions</h2>
          <div className="flex items-center gap-2">
            {isEditable && (
              <Button
                onClick={() => setIsEditOpen(true)}
                variant="outline"
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600 text-xs"
              >
                Edit
              </Button>
            )}
            <Button
              onClick={() => {
                setIsOpen(false);
                if (onOpenChange) onOpenChange(false);
              }}
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white"
            >
              ✕
            </Button>
          </div>
        </div>
        <div className="overflow-y-auto p-4" style={{ maxHeight: "500px" }}>
          <ReactMarkdown components={markdownComponents}>{content}</ReactMarkdown>
        </div>
      </div>
    );
  };

  // For inline mode
  const InlineContent = () => (
    <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-lg overflow-hidden w-full h-full">
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <h2 className="text-lg font-semibold text-white">Guide Instructions</h2>
        {isEditable && (
          <Button
            onClick={() => setIsEditOpen(true)}
            variant="outline"
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600 text-xs"
          >
            Edit
          </Button>
        )}
      </div>
      <div className="p-4 overflow-y-auto" style={{ height: 'calc(100% - 60px)' }}>
        <ReactMarkdown components={markdownComponents}>{content}</ReactMarkdown>
      </div>
    </div>
  );

  return (
    <>
      {showButton && <FloatingButton />}
      
      {displayMode === 'dialog' ? (
        <FloatingDialog />
      ) : (
        <InlineContent />
      )}

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Guide Instructions</DialogTitle>
          </DialogHeader>
          <textarea
            ref={textareaRef}
            defaultValue={content}
            className="w-full h-[50vh] p-3 bg-gray-700 text-white border border-gray-700 rounded-md"
          />
          <div className="flex justify-end space-x-2 mt-4">
            <Button
              onClick={() => setIsEditOpen(false)}
              variant="outline"
              className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
            >
              Cancel
            </Button>
            <Button
              onClick={saveContent}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}