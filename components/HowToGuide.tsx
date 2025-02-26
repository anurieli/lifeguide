// HowToGuide.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { HelpCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';

interface HowToGuideProps {
  displayMode?: 'dialog' | 'inline'; // Dialog or inline display
  isEditable?: boolean;             // Allow editing if true
  showButton?: boolean;             // Show a trigger button
  isOpen?: boolean;                 // Control dialog visibility externally
  onOpenChange?: (open: boolean) => void; // Handle dialog visibility changes
}

const DEFAULT_GUIDE = `# Welcome to Your Guide

- **Step 1**: Explore the basics
- **Step 2**: Customize as needed
- **Step 3**: Enjoy the journey`;

// Markdown components configuration
const markdownComponents: Components = {
  h1: ({ children }) => <h1 className="text-2xl font-bold text-white mb-4">{children}</h1>,
  h2: ({ children }) => <h2 className="text-xl font-bold text-white mb-3">{children}</h2>,
  h3: ({ children }) => <h3 className="text-lg font-bold text-white mb-2">{children}</h3>,
  p: ({ children }) => <p className="text-white mb-4">{children}</p>,
  ul: ({ children }) => <ul className="list-disc list-inside text-white mb-4">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal list-inside text-white mb-4">{children}</ol>,
  li: ({ children }) => <li className="text-white mb-1">{children}</li>,
  strong: ({ children }) => <strong className="font-bold text-white">{children}</strong>,
  em: ({ children }) => <em className="italic text-white">{children}</em>,
} as Components;

export function HowToGuide({
  displayMode = 'dialog',
  isEditable = false,
  showButton = true,
  isOpen: externalIsOpen,
  onOpenChange,
}: HowToGuideProps) {
  // State for visibility and editing mode
  const [isVisible, setIsVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [savedContent, setSavedContent] = useState(DEFAULT_GUIDE);

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
  };

  const cancelEditing = () => {
    setIsEditing(false);
  };

  // Inline mode: render directly in the page
  if (displayMode === 'inline') {
    return (
      <div className="p-4 bg-gray-900 text-white rounded-lg relative">
        <div className="space-y-4">
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
          {isEditable && (
            <div className="flex justify-end gap-2">
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
        </div>
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
          className="fixed bottom-4 right-4 bg-gray-800 text-white hover:bg-gray-700"
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