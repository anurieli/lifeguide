'use client';

import { useEffect, useState } from 'react';
import { Home, CircleHelp, Video, Info, Mail } from 'lucide-react';
import { useMediaQuery } from '@/hooks/useMediaQuery';

interface Section {
  id: string;
  label: string;
  icon: React.ReactElement;
}

const sections: Section[] = [
  { id: 'hero', label: 'Home', icon: <Home className="w-4 h-4" /> },
  { id: 'overview', label: 'Overview', icon: <CircleHelp className="w-4 h-4" /> },
  { id: 'videos', label: 'Videos', icon: <Video className="w-4 h-4" /> },
  { id: 'about', label: 'About', icon: <Info className="w-4 h-4" /> },
  { id: 'contact', label: 'Contact', icon: <Mail className="w-4 h-4" /> }
];

export default function TopSectionIndicator() {
  const [activeSection, setActiveSection] = useState('hero');
  const isDesktop = useMediaQuery('(min-width: 1024px)');

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

  return (
    <div className="sticky top-[60px] z-40 bg-black/50 backdrop-blur-sm border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-center items-center h-10">
          <div className="flex gap-6 md:gap-12">
            {sections.map(({ id, label, icon }) => (
              <button
                key={id}
                onClick={() => scrollToSection(id)}
                className="relative group"
              >
                <div
                  className={`absolute inset-0 rounded transition-colors ${
                    activeSection === id ? 'bg-white/10' : 'group-hover:bg-white/5'
                  }`}
                />
                <div className="relative px-3 py-1">
                  {isDesktop ? (
                    <span className={`text-sm transition-colors ${
                      activeSection === id ? 'text-white' : 'text-gray-400 group-hover:text-gray-300'
                    }`}>
                      {label}
                    </span>
                  ) : (
                    <div className={`transition-colors ${
                      activeSection === id ? 'text-white' : 'text-gray-400 group-hover:text-gray-300'
                    }`}>
                      {icon}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 