'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, PanInfo, useAnimation } from 'framer-motion';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Step {
  title: string;
  description: string | React.ReactElement;
  subdescription: string | React.ReactElement;
  icon: React.ReactElement;
}

const steps: Step[] = [
  {
    title: 'Sign Up',
    description: 'Either with Google or the old-fashioned way.',
    subdescription: 'No, we don\'t care about selling your data, we just need to save your progress!',
    icon: (
      <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
      </svg>
    ),
  },
  {
    title: 'Set Aside a Time - Lock In',
    description:'Sit down, detach for second, prepare to go deep.',
    subdescription: 'This is the hard part, but it just works. You\'re worth a try.',
    icon: (
      <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    title: 'Build Your Blueprint',
    description:'Take your time building your Lifeguide – you are rewiring your subconscious in the process.',
    subdescription: 'An hour or all day. Surrender to the process just this once.',
    icon: (
      <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    title: 'Reflect &  Repeat',
    description: 'Come back and read over your Lifeguide as often as possible.',
    subdescription: 'Don\'t forget that as you evolve, your Lifeguide should too.',
    icon: (
      <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
  },
];

export default function OverviewCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTablet = useMediaQuery('(max-width: 1023px) and (min-width: 769px)');
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
  
  // For the carousel animation
  const controls = useAnimation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragStartX, setDragStartX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const goToNext = () => {
    if (isDragging) return;
    
    const nextIndex = (currentIndex + 1) % steps.length;
    
    // Animate slide out to the left
    controls.start({
      x: '-100%',
      transition: { duration: 0.3 }
    }).then(() => {
      setCurrentIndex(nextIndex);
      // Reset position and animate in from the right
      controls.set({ x: '100%' });
      controls.start({
        x: 0,
        transition: { duration: 0.3 }
      });
    });
  };

  const goToPrevious = () => {
    if (isDragging) return;
    
    const prevIndex = (currentIndex - 1 + steps.length) % steps.length;
    
    // Animate slide out to the right
    controls.start({
      x: '100%',
      transition: { duration: 0.3 }
    }).then(() => {
      setCurrentIndex(prevIndex);
      // Reset position and animate in from the left
      controls.set({ x: '-100%' });
      controls.start({
        x: 0,
        transition: { duration: 0.3 }
      });
    });
  };

  const handleDragStart = () => {
    setIsDragging(true);
    if (containerRef.current) {
      setDragStartX(0); // Reset to 0 as we'll use relative values
    }
  };

  const handleDrag = (_: any, info: PanInfo) => {
    // Update the position as the user drags
    controls.set({ x: info.offset.x });
  };

  const handleDragEnd = (_: any, info: PanInfo) => {
    setIsDragging(false);
    
    // Determine if we should navigate based on drag distance and velocity
    const threshold = 50;
    const velocity = 0.5;
    
    if (info.offset.x > threshold || (info.velocity.x > velocity && info.offset.x > 0)) {
      // Dragged right - go to previous
      controls.start({
        x: '100%',
        transition: { duration: 0.2 }
      }).then(() => {
        const prevIndex = (currentIndex - 1 + steps.length) % steps.length;
        setCurrentIndex(prevIndex);
        controls.set({ x: '-100%' });
        controls.start({
          x: 0,
          transition: { duration: 0.2 }
        });
      });
    } else if (info.offset.x < -threshold || (info.velocity.x < -velocity && info.offset.x < 0)) {
      // Dragged left - go to next
      controls.start({
        x: '-100%',
        transition: { duration: 0.2 }
      }).then(() => {
        const nextIndex = (currentIndex + 1) % steps.length;
        setCurrentIndex(nextIndex);
        controls.set({ x: '100%' });
        controls.start({
          x: 0,
          transition: { duration: 0.2 }
        });
      });
    } else {
      // Not enough drag - snap back
      controls.start({
        x: 0,
        transition: { duration: 0.2 }
      });
    }
  };

  const goToSlide = (index: number) => {
    if (isDragging || index === currentIndex) return;
    
    const direction = index > currentIndex ? -1 : 1;
    
    controls.start({
      x: `${direction * 100}%`,
      transition: { duration: 0.3 }
    }).then(() => {
      setCurrentIndex(index);
      controls.set({ x: `${-direction * 100}%` });
      controls.start({
        x: 0,
        transition: { duration: 0.3 }
      });
    });
  };

  useEffect(() => {
    // Auto-shift every 16 seconds (doubled from 8 seconds)
    const timer = setInterval(() => {
      if (!isDragging) {
        goToNext();
      }
    }, 16000);

    return () => clearInterval(timer);
  }, [isDragging]);

  // Initialize animation control
  useEffect(() => {
    controls.set({ x: 0 });
  }, []);

  if (isDesktop) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3 mx-auto w-full">
        {steps.map((step, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: .3, delay: index * 0.1 }}
            className="flex flex-col items-center text-center p-2 md:p-3 bg-gray-800/50 rounded-xl h-full"
          >
            <div className="text-blue-500 mb-2 shrink-0">
              {step.icon}
            </div>
            <h3 className="text-base md:text-lg font-bold mb-1 text-white">
              {step.title}
            </h3>
            <div className="w-full overflow-hidden">
              <p className="text-white text-xs md:text-sm mb-1 line-clamp-3 break-words">
                {step.description}
              </p>
              <p className="text-gray-400 text-xs italic mb-1 line-clamp-2 break-words">
                {step.subdescription}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full relative">
      <div 
        className="overflow-hidden rounded-xl bg-gray-800/50 p-3 md:p-4"
        ref={containerRef}
      >
        <motion.div
          animate={controls}
          initial={{ x: 0 }}
          drag={isTouchDevice ? "x" : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.1}
          onDragStart={handleDragStart}
          onDrag={handleDrag}
          onDragEnd={handleDragEnd}
          className="flex flex-col items-center text-center touch-pan-y"
        >
          <div className="text-blue-500 mb-2 shrink-0">
            {steps[currentIndex].icon}
          </div>
          <h3 className="text-lg md:text-xl font-bold mb-2 text-white">
            {steps[currentIndex].title}
          </h3>
          <div className="w-full overflow-hidden">
            <p className="text-white text-xs md:text-sm mb-1 break-words line-clamp-4">
              {steps[currentIndex].description}
            </p>
            <p className="text-gray-400 text-xs italic break-words line-clamp-3">
              {steps[currentIndex].subdescription}
            </p>
          </div>
        </motion.div>
      </div>

      {/* Navigation buttons - visible on non-mobile and tablet */}
      {(!isMobile || isTablet) && (
        <div className="absolute top-1/2 left-0 right-0 -mt-6 flex justify-between px-2 pointer-events-none">
          <button 
            onClick={goToPrevious}
            className="bg-gray-800/70 hover:bg-gray-700 text-white rounded-full p-2 pointer-events-auto"
            aria-label="Previous slide"
          >
            <ChevronLeft size={20} />
          </button>
          <button 
            onClick={goToNext}
            className="bg-gray-800/70 hover:bg-gray-700 text-white rounded-full p-2 pointer-events-auto"
            aria-label="Next slide"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}

      <div className="flex justify-center mt-3 gap-2">
        {steps.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full transition-all duration-300 ${
              index === currentIndex ? 'bg-blue-500 w-6 md:w-8' : 'bg-gray-600'
            }`}
          />
        ))}
      </div>
    </div>
  );
} 