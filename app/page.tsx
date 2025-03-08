'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/utils/AuthProvider';
import { motion } from 'framer-motion';
import SectionIndicator from '@/components/SectionIndicator';
import TopSectionIndicator from '@/components/TopSectionIndicator';
import ClientOverviewCarousel from '@/components/ClientOverviewCarousel';
import ContactForm from '@/components/ContactForm';
import PersonaRibbon from '@/components/PersonaRibbon';
import WelcomePopup from '@/components/WelcomePopup';
// import VideoCarousel from '@/components/VideoCarousel';
import SimpleAuthButton from '@/components/SimpleAuthButton';
import ReactMarkdown from 'react-markdown';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';


const gradientText = "bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text";

export default function WelcomePage() {
  const { user } = useAuth();

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
      <section id="hero" className="py-5 md:py-24 flex flex-col items-center justify-center relative min-h-[600px] md:min-h-[700px]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-4xl mx-auto px-4 mb-16"
        >
          <h1 className={`text-5xl md:text-6xl font-bold ${gradientText} mb-6`}>
            Welcome to Lifeguide
          </h1>
          
          <p className="text-xl text-gray-400 mb-0 max-w-2xl mx-auto">
          Pause the chaos. Build your life's manual. Start living right.
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
            <div className="w-full mt-2 text-center">
              <p className="text-xs text-amber-400/80 italic font-sans max-w-xs sm:max-w-none mx-auto">
                *you thought you got rickrolled, but this is just a placeholder till my demo video is ready!
              </p>
            </div>
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
                <p className="text-gray-400 text-xl">Your journey to being one with yourself.</p>
              </motion.div>

              <div className="max-w-full overflow-hidden">
                <ClientOverviewCarousel />
              </div>

              <div className="mt-8 md:mt-12 flex flex-wrap justify-center gap-4">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <SimpleAuthButton />
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
                <p className="text-xl text-gray-400 mb-0 max-w-2xl mx-auto">Why does this exist?</p>
              </motion.div>

              <div className="space-y-6">
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="what-is-lifeguide" className="border-white/10">
                    <AccordionTrigger className="flex items-center justify-between">
                      <div className="flex flex-col sm:flex-row sm:items-center text-left gap-2">
                        <h3 className={`text-xl font-bold ${gradientText}`}>What is LifeGuide</h3>
                        <p className="text-gray-400 text-sm sm:text-base sm:ml-4">A practical, no-nonsense approach to personal development</p>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-300">
                      <div className="prose prose-invert max-w-none space-y-4 pt-4">
                        <ReactMarkdown components={{
                          p: ({node, ...props}) => <p className="text-base md:text-lg text-gray-300 break-words" {...props} />
                        }}>
                          Life Guide is a raw, interactive blueprint built to wrestle your life into focus, sharpen your mind, and 
                          carve out a path forward. Drawing from hard-earned lessons in military grit, business strategy, and real 
                          self-discovery, it's a system that bends to fit you—cutting through the noise so you can own your future.
                        </ReactMarkdown>

                        <ReactMarkdown components={{
                          p: ({node, ...props}) => <p className="text-base md:text-lg text-gray-300 break-words" {...props} />
                        }}>
                        This isn't some slick app peddling quick fixes. Life Guide is a back-to-basics gut check that demands you 
                        face yourself—no shortcuts, no fluff. Other tools promise change in five minutes; you're here because you know
                         that's bullshit. Real shifts take real work. To know where you're going, you've got to dig into who you are: 
                         your strengths, your cracks, your chaos. Without that, you're just flailing. Life Guide forces you to sit in 
                         the mess, name it, and reshape it into something solid.
                        </ReactMarkdown>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                  
                  <AccordionItem value="inspiration" className="border-white/10">
                    <AccordionTrigger className="flex items-center justify-between">
                      <div className="flex flex-col sm:flex-row sm:items-center text-left gap-2">
                        <h3 className={`text-xl font-bold ${gradientText}`}>The Inspiration</h3>
                        <p className="text-gray-400 text-sm sm:text-base sm:ml-4">Born from personal struggle and transformation</p>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-300">
                      <div className="prose prose-invert max-w-none space-y-4 pt-4">
                        <ReactMarkdown components={{
                          p: ({node, ...props}) => <p className="text-base md:text-lg text-gray-300 break-words" {...props} />
                        }}>
                          Life Guide was born from a brutal truth: you can't chase what matters until you know who's staring
                           back at you. Life's a blur these days—too damn fast. We're all scrambling after dreams we can't 
                           even define, never stopping to ask: What do I actually want? That's not a soft question—it's your anchor.
                           When shit hits the fan, knowing who you are and why you're still swinging is what keeps you steady.
                           </ReactMarkdown>
                          
                          <ReactMarkdown components={{
                          p: ({node, ...props}) => <p className="text-base md:text-lg text-gray-300 break-words" {...props} />
                        }}>
                        It started after I got back from a year-long war—real war, not some metaphor. Jetlagged, restless, asking 
                        "What now?" at 1 AM, I grabbed a pen and paper. By 5 AM, I had a personal manual—a lifeline I'd read every 
                        morning and night. For weeks, I leaned on it, tweaking it when I had to. Months later, the impact was undeniable:
                         no more running from my flaws, no more dread about what's next. I stopped fearing myself and took the 
                         reins. That's when I knew—this wasn't just for me. I had to share it, free, with anyone ready to face 
                         their own fight.
                        </ReactMarkdown>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                  
                  <AccordionItem value="vision" className="border-white/10">
                    <AccordionTrigger className="flex items-center justify-between">
                      <div className="flex flex-col sm:flex-row sm:items-center text-left gap-2">
                        <h3 className={`text-xl font-bold ${gradientText}`}>The Vision</h3>
                        <p className="text-gray-400 text-sm sm:text-base sm:ml-4">Creating a world of intentional, purpose-driven lives</p>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-300">
                      <div className="prose prose-invert max-w-none space-y-4 pt-4">
                        <p className="text-base md:text-lg text-gray-300 break-words">
                        I see a world where people don't just drift—they live with guts and purpose.
                        \Life Guide is our weapon: a dead-simple tool to cut through the haze and build a 
                        life that's real and yours. It's about that pause, that unflinching stare into yourself.
                         Because once you see who you are, you can step into who you're meant to be.
                         </p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
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
