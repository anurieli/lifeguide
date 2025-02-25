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

Remember, this is a guide, not a strict rulebook. Adapt it to your unique situation.`;

export function HowToGuide() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasSeenGuide, setHasSeenGuide] = useState(false);
  const [content, setContent] = useState(DEFAULT_HOW_TO_CONTENT);

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
        .upsert({
          user_id: user.id,
          has_seen_guide: true
        });
    }

    setHasSeenGuide(true);
    setIsOpen(false);
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-white/5 hover:bg-white/10"
      >
        <HelpCircle className="h-5 w-5" />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>How to Use the Blueprint</DialogTitle>
            <DialogDescription>
              Please read through this guide to understand how to use the blueprint effectively.
            </DialogDescription>
          </DialogHeader>
          
          <div className="prose prose-invert max-w-none">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>

          {!hasSeenGuide && (
            <div className="mt-6 flex justify-end">
              <Button onClick={handleClose}>
                I understand, let's begin
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
} 