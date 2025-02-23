'use client';

import { useEffect, useState } from 'react';

interface Section {
  id: string;
  label: string;
}

const sections: Section[] = [
  { id: 'hero', label: 'Home' },
  { id: 'overview', label: 'Overview' },
  { id: 'videos', label: 'Videos' },
  { id: 'about', label: 'About' },
  { id: 'contact', label: 'Contact' }
];

export default function SectionIndicator() {
  const [activeSection, setActiveSection] = useState('hero');

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
    <div className="fixed right-8 top-1/2 transform -translate-y-1/2 z-50">
      <div className="flex flex-col gap-4">
        {sections.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => scrollToSection(id)}
            className={`relative group flex items-center ${
              activeSection === id ? 'text-blue-500' : 'text-gray-400'
            }`}
          >
            <div className="w-2 h-2 rounded-full bg-current transition-all duration-200 group-hover:scale-150" />
            <span className="absolute right-full mr-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap text-sm">
              {label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
} 