'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { HelpCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import ReactMarkdown from 'react-markdown';

const DEFAULT_HOW_TO_CONTENT = `# How to Use the Blueprint

The Blueprint is a guide that helps you understand and navigate through different aspects of your life. Here's how to use it:

1. **Browse Sections**: Each section represents a major life area
2. **Explore Subsections**: Within each section, you'll find specific topics
3. **Understand Malleability**: The color indicators show how changeable each aspect is:
   - 🟢 Green: Highly malleable
   - 🟡 Yellow: Moderately malleable
   - 🔴 Red: Less malleable

4. **Read Examples**: Each subsection includes practical examples
5. **Take Action**: Use the insights to make informed decisions
6. **Format Your Responses**: Use the text editor to format your responses:
   - Use the bullet list button (•) to create bullet points
   - Press Enter to continue lists automatically
   - Use the numbered list button (1.) to create numbered lists
   - Press Enter on an empty list item to exit the list

Remember, this is a guide, not a strict rulebook. Adapt it to your unique situation.`;

interface HowToGuideProps {
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  showButton?: boolean;
}

export function HowToGuide({ isOpen: externalIsOpen, onOpenChange, showButton = true }: HowToGuideProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasSeenGuide, setHasSeenGuide] = useState(false);
  const [content] = useState(DEFAULT_HOW_TO_CONTENT);

  // Handle external control
  useEffect(() => {
    if (typeof externalIsOpen !== 'undefined') {
      setIsOpen(externalIsOpen);
    }
  }, [externalIsOpen]);

  useEffect(() => {
    const checkFirstVisit = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data } = await supabase
          .from('user_preferences')
          .select('has_seen_guide')
          .eq('user_id', user.id)
          .single();

        if (!data?.has_seen_guide) {
          setIsOpen(true);
        } else {
          setHasSeenGuide(true);
        }
      }
    };

    checkFirstVisit();
  }, []);

  const handleClose = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      await supabase
        .from('user_preferences')
        .upsert(
          {
            user_id: user.id,
            has_seen_guide: true
          },
          {
            onConflict: 'user_id',
            ignoreDuplicates: false
          }
        );
    }

    setHasSeenGuide(true);
    setIsOpen(false);
    if (onOpenChange) {
      onOpenChange(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (onOpenChange) {
      onOpenChange(open);
    }
  };

  return (
    <>
      {showButton && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleOpenChange(true)}
          className="fixed bottom-4 right-4 bg-white/5 hover:bg-white/10"
        >
          <HelpCircle className="h-5 w-5 text-white" />
        </Button>
      )}

      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-2xl bg-gray-900/95 backdrop-blur-sm border border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">How to Use the Blueprint</DialogTitle>
            <DialogDescription className="text-gray-400">
              Please read through this guide to understand how to use the blueprint effectively.
            </DialogDescription>
          </DialogHeader>
          
          <div className="prose prose-invert max-w-none">
            <ReactMarkdown
              components={{
                h1: ({ children }) => <h1 className="text-white">{children}</h1>,
                h2: ({ children }) => <h2 className="text-white">{children}</h2>,
                h3: ({ children }) => <h3 className="text-white">{children}</h3>,
                p: ({ children }) => <p className="text-white">{children}</p>,
                li: ({ children }) => <li className="text-white">{children}</li>,
                ul: ({ children }) => <ul className="text-white">{children}</ul>,
                ol: ({ children }) => <ol className="text-white">{children}</ol>
              }}
            >
              {content}
            </ReactMarkdown>
          </div>

          {!hasSeenGuide && (
            <div className="mt-6 flex justify-end">
              <Button onClick={handleClose} className="text-white">
                I understand, let's begin
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
} 