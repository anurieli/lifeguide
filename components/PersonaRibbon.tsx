'use client';

import { useState, useEffect } from 'react';

const personas = [
  {"title": "Relentless Self-Improvers", "description": "Never stop tweaking and refining their lives, always chasing the next level."},
  {"title": "Chronic Self-Help Book Buyers", "description": "Innocently keep falling for every new promise of transformation on the shelf."},
  {"title": "Stuck Souls Seeking Clarity", "description": "Feel trapped in life's fog and crave a map to figure out why."},
  {"title": "Dreamers with Dusty Journals", "description": "Full of big ideas but struggle to turn scribbles into action."},
  {"title": "Overwhelmed Overthinkers", "description": "Minds buzzing with chaos, desperate for a way to quiet the noise."},
  {"title": "Goal-Setting Gurus-in-Training", "description": "Love the idea of goals but trip over making them stick."},
  {"title": "Burnout Rebels", "description": "Tired of grinding for nothing, ready to reclaim purpose with intent."},
  {"title": "Secret Aspiration Hoarders", "description": "Hide their wildest dreams, needing a push to write them down."},
  {"title": "Habit Hoppers", "description": "Jump from routine to routine, seeking one that finally clicks."},
  {"title": "Quietly Ambitious", "description": "Soft-spoken but fiercely driven, looking for a structured path."},
  {"title": "Life's Crossroads Wanderers", "description": "At a turning point, unsure which way leads to fulfillment."},
  {"title": "Distraction Dodgers", "description": "Battling daily noise, yearning to focus on what truly matters."},
  {"title": "Reflective Restarters", "description": "Always hitting reset, hoping this time they'll build something lasting."},
  {"title": "Potential Unleashers", "description": "Know they've got more inside, just need the tools to dig it out."},
  {"title": "Chaos Tamers", "description": "Life's a mess of mountains, and they want one clear line to follow."},
  {"title": "Visionary Procrastinators", "description": "See the future vividly but stall on the steps to get there."},
  {"title": "Introspective Introverts", "description": "Love going deep inside, ready to turn thoughts into plans."},
  {"title": "Hustle-Weary Warriors", "description": "Worked hard for others, now it's time to work for themselves."},
  {"title": "Purpose Chasers", "description": "Feel the itch for meaning, hunting for a way to pin it down."},
  {"title": "Late-Night Life Planners", "description": "Dream up grand schemes at 2 a.m., need daylight structure."},
  {"title": "Almost-There Achievers", "description": "So close to breakthroughs, just missing that final nudge."},
  {"title": "Reinvention Enthusiasts", "description": "Thrive on change, eager to craft their next chapter."},
  {"title": "Hidden Trailblazers", "description": "Quietly bold, ready to forge a path others will follow."},
  {"title": "Resilience Builders", "description": "Been knocked down, now building a mindset to rise stronger."},
  {"title": "Everyday Philosophers", "description": "Ponder life's big questions, seeking practical answers."},
  {"title": "Sidetracked Dreamcatchers", "description": "Catch fleeting goals, need a net to hold them tight."},
  {"title": "North Star Seekers", "description": "Lost without a guiding light, hungry for direction."},
  {"title": "Unseen Strivers", "description": "Work hard in the shadows, craving a spotlight on their own terms."},
  {"title": "Restless Reinforcers", "description": "Can't sit still, want to channel energy into growth."},
  {"title": "Life's Puzzle Solvers", "description": "Pieces scattered everywhere, ready to fit them into a masterpiece."}
];

const colors = [
  '#F97316', // Orange
  '#3B82F6', // Deep Blue
  '#2DD4BF', // Teal
  '#22C55E', // Green
  '#EAB308', // Yellow
  '#EF4444'  // Red
];

export default function PersonaRibbon() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentColor, setCurrentColor] = useState(colors[0]);
  const [showTooltip, setShowTooltip] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % personas.length);
      setCurrentColor(colors[Math.floor(Math.random() * colors.length)]);
    }, 8000);

    return () => clearInterval(interval);
  }, [isPaused]);

  const currentPersona = personas[currentIndex];

  return (
    <div className="relative w-full flex justify-center my=0">
      <div className="relative w-full max-w-[800px] text-center text-3xl font-bold py-6 px-4 whitespace-nowrap overflow-visible">
        <span 
          className="font-['Fredoka_One'] tracking-wider text-[clamp(1rem,4vw,2rem)] relative cursor-pointer inline-block text-white"
          onMouseEnter={() => {
            setShowTooltip(true);
            setIsPaused(true);
          }}
          onMouseLeave={() => {
            setShowTooltip(false);
            setIsPaused(false);
          }}
        >
          for the {' '}
          <span 
            className="transition-colors duration-500 bg-clip-text text-transparent bg-gradient-to-r relative"
            style={{ 
              backgroundImage: `linear-gradient(to right, ${currentColor}, ${colors[(colors.indexOf(currentColor) + 1) % colors.length]})` 
            }}
          >
            {currentPersona.title}
          </span>

          {/* Tooltip */}
          {showTooltip && (
            <div className="absolute left-1/2 transform -translate-x-1/2 bottom-full mb-3 w-64 p-3 bg-gray-800/95 rounded-md shadow-lg z-50 backdrop-blur-sm">
              <div className="text-xs text-white whitespace-normal">
                <div className="text-gray-300 leading-relaxed">{currentPersona.description}</div>
              </div>
              {/* Arrow */}
              <div className="absolute bottom-[-6px] left-1/2 transform -translate-x-1/2 w-3 h-3 bg-gray-800/95 rotate-45"></div>
            </div>
          )}
        </span>
      </div>
    </div>
  );
} 