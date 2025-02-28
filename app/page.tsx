'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import SectionIndicator from '@/components/SectionIndicator';
import TopSectionIndicator from '@/components/TopSectionIndicator';
import OverviewCarousel from '@/components/OverviewCarousel';
import ContactForm from '@/components/ContactForm';
import PersonaRibbon from '@/components/PersonaRibbon';
import WelcomePopup from '@/components/WelcomePopup';
import VideoCarousel from '@/components/VideoCarousel';
import AuthButton from '@/components/AuthButton';
import ReactMarkdown from 'react-markdown';


const gradientText = "bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text";

export default function WelcomePage() {
  const { signIn } = useAuth();

  useEffect(() => {
    // Show welcome popup for first-time visitors
    const hasVisited = localStorage.getItem('hasVisited');
    if (!hasVisited) {
      // TODO: Implement welcome popup
      localStorage.setItem('hasVisited', 'true');
    }
  }, []);

  return (
    <>
      <WelcomePopup />
      <TopSectionIndicator />
      <SectionIndicator />

      {/* Hero Section */}
      <section id="hero" className="py-20 md:py-24 flex flex-col items-center justify-center relative min-h-[600px] md:min-h-[700px]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-4xl mx-auto px-4 mb-16"
        >
          <h1 className={`text-5xl md:text-6xl font-bold ${gradientText} mb-6`}>
            Welcome to LifeGuide
          </h1>
          
          <p className="text-xl text-gray-300 mb-0 max-w-2xl mx-auto">
          A No-Bullshit, practical, interactive guide designed to help you organize your life, 
          sharpen your mindset, and achieve your goals. Built on battle-tested strategies from 
  the military, business, and personal development, Lifegaid combines structure with 
  adaptability—helping you cut through distractions and take control of your future.
          </p>

          <PersonaRibbon />

          <div className="relative max-w-3xl mx-auto mt-12 mb-8">
          <div className="absolute inset-0 -m-8 border-4 border-dashed border-amber-400/70 rounded-xl" style={{ 
              filter: 'drop-shadow(0 0 2px rgba(251, 191, 36, 0.4))',
              transform: 'rotate(-0.5deg)'
            }}></div>
            <div className="aspect-video w-full max-w-2xl mx-auto rounded-lg overflow-hidden shadow-2xl relative">
              <iframe
                src="https://www.youtube.com/embed/dQw4w9WgXcQ"
                title="LifeGuide Introduction"
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <p className="text-xs text-amber-400/80 italic absolute bottom-[-19px] left-2" style={{ fontFamily: 'Comic Sans MS, cursive, sans-serif' }}>
              *you thought you got rickrolled, but this is just a placeholder till my demo video is ready!
            </p>
          </div>

          <motion.button
            onClick={() => {
              document.getElementById('overview')?.scrollIntoView({ behavior: 'smooth' });
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="text-lg font-medium px-8 py-3 bg-blue-600 mt-6 rounded-full hover:bg-blue-700 transition-colors"
          >
            So How Does This Work 😩
          </motion.button>
        </motion.div>

        <motion.div
          animate={{
            y: [0, 10, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute bottom-4 md:bottom-8"
        >
          <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </motion.div>
      </section>

      {/* Overview Section */}
      <section id="overview" className="py-16 md:py-20 mt-8 md:mt-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="bg-white/5 rounded-3xl shadow-2xl backdrop-blur-sm overflow-hidden">
            <div className="p-6 md:p-12">
              <motion.div 
                className="text-center mb-8 md:mb-12"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <h2 className={`text-3xl md:text-4xl font-bold ${gradientText} mb-4`}>How It Works</h2>
                <p className="text-white">Your journey to being one with yourself.</p>
              </motion.div>

              <div className="max-w-full overflow-hidden">
                <OverviewCarousel />
              </div>

              <div className="mt-8 md:mt-12 flex flex-wrap justify-center gap-4">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <AuthButton />
                </motion.div>
                
                <Link href="/guide">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-5 sm:px-6 py-2.5 sm:py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    View Guide
                  </motion.button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Video Series Section */}
      {/* <section id="videos" className="py-16 md:py-20 mt-8 md:mt-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="bg-white/5 rounded-3xl shadow-2xl backdrop-blur-sm overflow-hidden">
            <div className="p-6 md:p-12">
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="text-center mb-8 md:mb-12"
              >
                <h2 className={`text-3xl md:text-4xl font-bold ${gradientText} mb-4`}>Quick Insights</h2>
                <p className="text-white">Let me personally explain </p>
              </motion.div>

              <div className="max-w-full overflow-hidden">
                <VideoCarousel />
              </div>
            </div>
          </div>
        </div>
      </section> */}

      {/* About Section */}
      <section id="about" className="py-16 md:py-20 mt-8 md:mt-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="bg-white/5 rounded-3xl shadow-2xl backdrop-blur-sm overflow-hidden">
            <div className="p-6 md:p-12">
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="text-center mb-8 md:mb-12"
              >
                <h2 className={`text-3xl md:text-4xl font-bold ${gradientText} mb-4`}>About LifeGuide</h2>
                <p className="text-white">Why the fuck did I make this?</p>
              </motion.div>

              <div className="prose prose-invert max-w-none space-y-4 md:space-y-6">
                <p className="text-base md:text-lg text-white break-words">
                 <ReactMarkdown>
                  LifeGuide came from a raw truth: you can’t chase goals that matter until you 
                  know who’s staring back in the mirror. Life moves fast—too fast. We’re all scrambling, 
                  chasing dreams we can’t even explain, never pausing to ask: What the hell do I actually
                   want? That question isn’t fluff—it’s your lifeline. When everything falls apart, a clear 
                   vision of who you are and why you’re fighting is what keeps you standing.
                  </ReactMarkdown>
               
               </p>

                <p className="text-base md:text-lg text-white break-words">
                  <ReactMarkdown>
                  This isn’t another productivity app. Lifeguide is a system, stripped down and real, built to 
                  make you face yourself first. No shortcuts, no tech crutches—just you, sitting with your thoughts, digging
                   into who you are and where you’re headed. It’s tough, unglamorous work. Other platforms peddle quick fixes, 
                   promising change in five minutes. They’re wrong. You’re here because you’ve tried them all and learned the hard 
                   way: real change demands inner work, and there’s no dodging it.
                   To reach your goals, you need to know your core—your strengths, your flaws, where you stand in this
                    messy life, the tools you’ve got, the habits you carry. Without that, you’re swinging blind. If you don’t
                     stop to find the cracks, how will you mend them? And when your head’s a storm of noise, how do you even see 
                     what’s broken beneath it all? Lifeguide cuts through that chaos, forcing you to name your truth so you can reshape it.
                  </ReactMarkdown>
                </p>

                <h3 className={`text-xl md:text-2xl font-bold ${gradientText}`}>The Vision</h3>
                <p className="text-base md:text-lg text-white break-words">
                Our vision is a world where everyone can live with purpose, not just drift through the noise. Lifeguide is our 
                stand—a tool to guide you toward a life that’s intentional, honest, and yours. We believe in the power of that pause,
                 that unflinching look inside. Because once you know who you are, you can become who you’re meant to be.

                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-16 md:py-20 mt-8 md:mt-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="bg-white/5 rounded-3xl shadow-2xl backdrop-blur-sm overflow-hidden">
            <div className="p-6 md:p-12">
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="text-center mb-8 md:mb-12"
              >
                <h2 className={`text-3xl md:text-4xl font-bold ${gradientText} mb-4`}>Get in Touch</h2>
                <p className="text-white">Have questions or suggestions? We&apos;d love to hear from you.</p>
              </motion.div>

              <div className="max-w-full overflow-hidden">
                <ContactForm />
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
