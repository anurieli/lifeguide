'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, HelpCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface InstructionCard {
  id: number;
  title: string;
  content: string;
  icon?: React.ReactNode;
}

const INSTRUCTION_CARDS: InstructionCard[] = [
  {
    id: 0,
    title: "Welcome to Lifeguide",
    content: "**Before you begin, please take a moment to read through these guidelines.**\n\nThese aren't strict rules, but rather advice on how to truly make Lifeguide have an impact on your life. Going through these instructions just once will help you understand how to get the most value from this tool.\n\nLifeguide is designed to be a powerful companion on your journey of self-discovery and personal growth. These guidelines will help you use it effectively."
  },
  {
    id: 1,
    title: "Build in Order",
    content: "**Order matters** Lifeguide was designed with first principles, and the order of the guides sections is not without reason. So work on this sheet in order: first *Persona Building* (defining who you are), then *Goal Setting* (where most people fail), and finally *Forging The Mindset* (Tools for later)."
  },
  {
    id: 2,
    title: "Complete Quickly",
    content: "**You want to be in and introspective state of flow when filling your guide.** You want to maintain the linearity of your motivatiated self. For the best results, finish in the same day. \n\n  If you don't finish in the same day, when you return start from the top by re-reading all your previous completions, and making any changes you feel necessary."
  },
  {
    id: 3,
    title: "Handling Roadblocks",
    content: "**If you're stuck on a section** and aren't capable of providing a genuine response, then bookmark it and move on. \n\n If you are no longer in that introspective state of flow, close the editor and go chill. \n\n Remember, the next time you get back to the document, start from the top, as these things build on each other."
  },
  {
    id: 4,
    title: "Daily Review",
    content: "**You want to keep this top of mind for a while.** Read this every day (morning and night), no matter, for at least 5 days straight. Engage with it as much as possible when first starting. \n\n Try and incorporate it into your daily routine, as it will become a part of your identity."
  },
  {
    id: 5,
    title: "Dynamic Blueprint",
    content: "**This can change,** it's supposed to. It's dynamic (the goals portion should be less dynamic). When you read it every day, think if your responses still resonate; if not, change them. \n\n The more you become one with it the better you can get it to be exactly what you need to succeed (you can cut out fluff, hone in on what really matters as you slowly remove things that don't feed your purpose)."
  },
  {
    id: 6,
    title: "Understand Malleability Levels",
    content: "**How dynamic is this section?** *Regarding previous card...* \n\n- 🟢 *Flexible, dynamic, designed to be changed and altered as fast as you change.* Hell, it's even advised that you engage with these sections as often as possible.  \n- 🟡 *Don't rush to change.* These sections are subject to change, as we are not robots, but don't make it a habit to alter these sections once set in stone. Before submitting these sections, review them and question them before moving onto the next section.  \n- 🔴 *This should be a constant,* as it's much harder to run towards a moving goal. Each section's description will define its own rules for alteration. Before submitting these sections, review them before moving onto the next section, and be sure to get back to them once more before submitting the entire sheet."
  },
  {
    id: 7,
    title: "Final Review",
    content: "**Before submitting,** go over the whole thing again (I know it's tedious), but as we work on this sheet, our brains are becoming increasingly accustomed to this introspectiveness. Leverage the state you will be in to thoroughly review your sheet, remembering that there are certain sections that are temporarily \"permanent\"."
  },
  {
    id: 8,
    title: "Be Authentic",
    content: "**No one is reading this,** so speak the your truth."
  },
  {
    id: 9,
    title: "Ready to Begin",
    content: "You can always revisit these instructions by clicking the **Guide Instructions** button at the top of the editor.\n\nBy clicking \"I Agree & Continue\", you confirm that you've read and understood these guidelines."
  }
];

interface FirstTimeEditorWindowProps {
  onComplete: () => void;
}

export default function FirstTimeEditorWindow({ onComplete }: FirstTimeEditorWindowProps) {
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [hasSeenAllCards, setHasSeenAllCards] = useState(false);
  
  const totalCards = INSTRUCTION_CARDS.length;
  const currentCard = INSTRUCTION_CARDS[currentCardIndex];
  const isLastCard = currentCardIndex === totalCards - 1;
  
  const nextCard = () => {
    if (currentCardIndex < totalCards - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
    }
    
    if (currentCardIndex === totalCards - 2) {
      setHasSeenAllCards(true);
    }
  };
  
  const prevCard = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center">
      <div className="w-full max-w-2xl mx-auto">
        <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              Blueprint Instructions
            </h2>
            <div className="text-sm text-white/80">
              {currentCardIndex + 1} of {totalCards}
            </div>
          </div>
          
          {/* Card Content */}
          <div className="p-6 min-h-[300px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentCard.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <h3 className="text-2xl font-bold text-white">{currentCard.title}</h3>
                <div className="prose prose-invert max-w-none">
                  <ReactMarkdown
                    components={{
                      p: ({node, ...props}) => <p className="text-gray-300 mb-4" {...props} />,
                      strong: ({node, ...props}) => <strong className="text-white font-bold" {...props} />,
                      ul: ({node, ...props}) => <ul className="list-disc pl-6 space-y-2 text-gray-300" {...props} />,
                      ol: ({node, ...props}) => <ol className="list-decimal pl-6 space-y-2 text-gray-300" {...props} />,
                      li: ({node, ...props}) => <li className="text-gray-300" {...props} />
                    }}
                  >
                    {currentCard.content}
                  </ReactMarkdown>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
          
          {/* Navigation */}
          <div className="p-4 border-t border-gray-700 flex items-center justify-between">
            <button
              onClick={prevCard}
              disabled={currentCardIndex === 0}
              className={`flex items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                currentCardIndex === 0
                  ? 'text-gray-500 cursor-not-allowed'
                  : 'text-white hover:bg-gray-800'
              }`}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            
            <div className="flex space-x-1">
              {INSTRUCTION_CARDS.map((_, index) => (
                <div
                  key={index}
                  className={`h-1.5 w-6 rounded-full ${
                    index === currentCardIndex
                      ? 'bg-blue-500'
                      : index < currentCardIndex
                      ? 'bg-gray-500'
                      : 'bg-gray-700'
                  }`}
                />
              ))}
            </div>
            
            {isLastCard ? (
              <button
                onClick={onComplete}
                disabled={!hasSeenAllCards}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-colors"
              >
                I Agree & Continue
              </button>
            ) : (
              <button
                onClick={nextCard}
                className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 