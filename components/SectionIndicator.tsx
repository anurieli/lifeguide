'use client';

import { useEffect, useState } from 'react';
import { Home, Video, Info, Mail, CircleHelp } from 'lucide-react';
import { useMediaQuery } from '@/hooks/useMediaQuery';

interface Section {
  id: string;
  label: string;
  icon: React.ReactElement;
}

const sections: Section[] = [
  { id: 'hero', label: '', icon: <Home className="w-4 h-4" /> },
  { id: 'overview', label: '', icon: <CircleHelp className="w-4 h-4" /> },
  // TODO: Add videos back in
  // { id: 'videos', label: '', icon: <Video className="w-4 h-4" /> },
  { id: 'about', label: '', icon: <Info className="w-4 h-4" /> },
  { id: 'contact', label: '', icon: <Mail className="w-4 h-4" /> }
];

export default function SectionIndicator() {
  const [activeSection, setActiveSection] = useState('hero');
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isLargeScreen = useMediaQuery('(min-width: 1280px)');
  const isNarrowScreen = useMediaQuery('(max-width: 80vw)'); // Changed to 68% width

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      {
        rootMargin: '-50% 0px -50% 0px'
      }
    );

    sections.forEach(({ id }) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Hide on mobile or narrow screen
  if (isMobile || isNarrowScreen) return null;

  return (
    <div className="fixed right-4 md:right-8 top-1/2 transform -translate-y-1/2 z-30">
      <div className="flex flex-col gap-4">
        {sections.map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => scrollToSection(id)}
            className={`relative group flex items-center ${
              activeSection === id ? 'text-blue-500' : 'text-gray-400'
            }`}
          >
            {isLargeScreen ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5">
                {icon}
                <span className="text-sm whitespace-nowrap">{label}</span>
              </div>
            ) : (
              <div className="relative">
                <div className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/5">
                  {icon}
                </div>
                <span className="absolute right-full mr-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap text-sm">
                  {label}
                </span>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
} 