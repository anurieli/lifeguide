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
          
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
          A No-Bullshit, practical, interactive guide designed to help you organize your life, 
          sharpen your mindset, and achieve your goals. Built on battle-tested strategies from 
  the military, business, and personal development, Lifegaid combines structure with 
  adaptability—helping you cut through distractions and take control of your future.
          </p>

          <PersonaRibbon />

          <div className="aspect-video w-full max-w-3xl rounded-lg overflow-hidden shadow-2xl mb-8 mt-12">
            <iframe
              src="https://www.youtube.com/embed/dQw4w9WgXcQ"
              title="LifeGuide Introduction"
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>

          <motion.button
            onClick={() => {
              document.getElementById('overview')?.scrollIntoView({ behavior: 'smooth' });
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="text-lg font-medium px-8 py-3 bg-blue-600 rounded-full hover:bg-blue-700 transition-colors"
          >
            So How Does This Work?
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
                <p className="text-white">Your journey to a more organized and purposeful life</p>
              </motion.div>

              <div className="max-w-full overflow-hidden">
                <OverviewCarousel />
              </div>

              <div className="mt-8 md:mt-12 flex flex-wrap justify-center gap-4">
                <motion.button
                  onClick={signIn}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-5 sm:px-6 py-2.5 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Sign in with Google
                </motion.button>
                
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
      <section id="videos" className="py-16 md:py-20 mt-8 md:mt-12">
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
      </section>

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
                  LifeGuide was born from a simple observation: many people struggle to organize their lives
                  and maintain focus on their goals. We&apos;ve combined battle-tested strategies from military,
                  business, and personal development to create a practical system that actually works.
                </p>

                <p className="text-base md:text-lg text-white break-words">
                  Our platform isn&apos;t just another productivity tool—it&apos;s a comprehensive system designed
                  to help you understand yourself better, set meaningful goals, and stay accountable
                  to your vision. How? By focusing on no-tech first principles, where the human needs to sit down 
                  with themselves and just think about who they are and where they want to go. It&apos;s hard work.
                  Todays platforms try to use tech to make it easy for you... but there is no easy way out. You are 
                  here because after all your attemts you realized you have to do the inner work.
                </p>

                <h3 className={`text-xl md:text-2xl font-bold ${gradientText}`}>Our Vision</h3>
                <p className="text-base md:text-lg text-white break-words">
                  We envision a world where everyone has access to the tools and guidance they need
                  to live a more intentional, fulfilled life. LifeGuide is our contribution to making
                  that vision a reality.
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
