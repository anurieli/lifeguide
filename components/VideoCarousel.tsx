'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMediaQuery } from '@/hooks/useMediaQuery';

const videos = [
  { 
    id: 1, 
    title: 'Goal Setting Mastery', 
    description: 'Learn proven techniques for setting and achieving meaningful goals',
    videoUrl: 'https://static.videezy.com/system/resources/previews/000/005/529/original/Reaviling_Sjusj%C3%B8en_Ski_Senter.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4'
  },
  { 
    id: 2, 
    title: 'Building Resilience', 
    description: 'Develop mental toughness and bounce back from setbacks',
    videoUrl: 'https://static.videezy.com/system/resources/previews/000/039/504/original/SDOF_20.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1519834785169-98be25ec3f84'
  },
  { 
    id: 3, 
    title: 'Daily Habits', 
    description: 'Create powerful routines that drive consistent progress',
    videoUrl: 'https://static.videezy.com/system/resources/previews/000/004/381/original/Yoga_Girl.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1506485338023-6ce5f36692df'
  },
  { 
    id: 4, 
    title: 'Mindset Transformation', 
    description: 'Reshape your thinking for greater success',
    videoUrl: 'https://static.videezy.com/system/resources/previews/000/044/479/original/200519_05_Journal_Writing_4k_012.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1489533119213-66a5cd877091'
  },
];

export default function VideoCarousel() {
  const [currentIndex, setCurrentIndex] = useState(1);
  const [isPlaying, setIsPlaying] = useState<number | null>(null);
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const isMobile = useMediaQuery('(max-width: 640px)');

  // Pause video when switching to mobile
  useEffect(() => {
    if (isMobile && isPlaying !== null) {
      setIsPlaying(null);
    }
  }, [isMobile, isPlaying]);

  const handlePrevious = () => {
    setIsPlaying(null);
    setCurrentIndex((prev) => (prev === 0 ? videos.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setIsPlaying(null);
    setCurrentIndex((prev) => (prev === videos.length - 1 ? 0 : prev + 1));
  };

  const NavigationButtons = () => (
    <>
      <button
        onClick={handlePrevious}
        className={`p-3 md:p-4 rounded-full bg-black/50 hover:bg-black/70 transition-colors backdrop-blur-sm group ${
          isDesktop 
            ? 'absolute left-[10%] md:left-[15%] top-1/2 -translate-y-1/2 z-20' 
            : 'flex items-center justify-center'
        }`}
        aria-label="Previous video"
      >
        <ChevronLeft className="w-6 h-6 md:w-8 md:h-8 text-white opacity-75 group-hover:opacity-100 transition-opacity" />
      </button>

      <button
        onClick={handleNext}
        className={`p-3 md:p-4 rounded-full bg-black/50 hover:bg-black/70 transition-colors backdrop-blur-sm group ${
          isDesktop 
            ? 'absolute right-[10%] md:right-[15%] top-1/2 -translate-y-1/2 z-20'
            : 'flex items-center justify-center'
        }`}
        aria-label="Next video"
      >
        <ChevronRight className="w-6 h-6 md:w-8 md:h-8 text-white opacity-75 group-hover:opacity-100 transition-opacity" />
      </button>
    </>
  );

  return (
    <div className="relative w-full py-1">
      <div className={`relative ${isMobile ? 'h-[40vh]' : 'h-[50vh] md:h-[70vh]'} flex items-center justify-center`}>
        <AnimatePresence mode="popLayout">
          {videos.map((video, index) => {
            const position = (index - currentIndex + videos.length) % videos.length;
            const isCenter = position === 0;
            const isLeft = position === videos.length - 1;
            const isRight = position === 1;
            
            // On mobile, only show the center video
            if (isMobile && !isCenter) return null;
            // On desktop, show left, center, and right videos
            if (!isMobile && !isCenter && !isLeft && !isRight) return null;

            const xOffset = isDesktop 
              ? (isLeft ? '-65%' : isRight ? '65%' : '5%')
              : (isLeft ? '-55%' : isRight ? '55%' : '5%');

            return (
              <motion.div
                key={video.id}
                initial={false}
                animate={{
                  scale: isCenter ? 1 : 0.7,
                  x: isMobile ? '0%' : xOffset,
                  zIndex: isCenter ? 10 : 0,
                  opacity: isCenter ? 1 : 0.4,
                  rotateY: isMobile ? 0 : (isLeft ? 25 : isRight ? -25 : 0),
                }}
                transition={{ duration: 0.4 }}
                className={`absolute ${isMobile ? 'w-[85%] max-w-[300px]' : 'w-[250px] md:w-[300px]'} rounded-xl overflow-hidden shadow-2xl bg-gray-800/80`}
                style={{ aspectRatio: '9/16' }}
              >
                {/* Video Container */}
                <div className="relative w-full h-full">
                  {/* Thumbnail/Preview */}
                  <div 
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url(${video.thumbnail})` }}
                  />
                  
                  {/* Video Player (only load for center card) */}
                  {isCenter && (
                    <div className="absolute inset-0">
                      <video
                        src={video.videoUrl}
                        className="w-full h-full object-cover"
                        loop
                        muted
                        playsInline
                        autoPlay={isPlaying === video.id}
                        onClick={() => setIsPlaying(isPlaying === video.id ? null : video.id)}
                      />
                      
                      {/* Play/Pause Button */}
                      <button
                        onClick={() => setIsPlaying(isPlaying === video.id ? null : video.id)}
                        className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors"
                        aria-label={isPlaying === video.id ? "Pause video" : "Play video"}
                      >
                        {isPlaying === video.id ? (
                          <svg className="w-16 h-16 text-white opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        ) : (
                          <svg className="w-16 h-16 text-white opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Content Overlay */}
                  <div className="absolute inset-x-0 bottom-0 p-4 md:p-6 bg-gradient-to-t from-black/80 to-transparent">
                    <h3 className="text-lg md:text-xl font-semibold mb-1 md:mb-2 text-white">{video.title}</h3>
                    <p className="text-xs md:text-sm text-gray-300">{video.description}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Navigation Buttons - Desktop */}
        {isDesktop ? (
          <NavigationButtons />
        ) : null}
      </div>

      {/* Mobile Navigation */}
      {!isDesktop && (
        <div className="flex justify-center gap-4 mt-4">
          <NavigationButtons />
        </div>
      )}

      {/* Mobile Video Indicator */}
      {isMobile && (
        <div className="flex justify-center gap-2 mt-4">
          {videos.map((video, index) => (
            <button
              key={video.id}
              onClick={() => {
                setIsPlaying(null);
                setCurrentIndex(index);
              }}
              className={`w-2 h-2 rounded-full ${
                index === currentIndex ? 'bg-white' : 'bg-white/30'
              }`}
              aria-label={`Go to video ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
} 