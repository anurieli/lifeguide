'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/utils/AuthProvider';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
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

// Scrolling Thoughts Background Component
const ScrollingThoughtsBackground = () => {
  // List of thought-provoking questions
  const questions = [
    "What truly matters to you?",
    "Where are you hiding from yourself?",
    "What would you do if fear didn't exist?",
    "Why do you keep running?",
    "What's your next brave step?",
    "Who are you when no one's watching?",
    "What's worth fighting for?",
    "When did you last feel alive?",
    "What's stopping you right now?",
    "How will you define success?"
  ];

  // Variants for question states
  const questionVariants = {
    normal: { 
      opacity: 0.3,
      color: "#9CA3AF" // Light grey
    },
    highlighted: { 
      opacity: 1,
      color: "#FFFFFF", // White
      transition: { duration: 0.5 }
    }
  };

  // Variants for row animation
  const rowVariants = {
    animate: (i: number) => ({
      x: i % 2 === 0 ? [-2000, 0] : [0, -2000],
      transition: {
        x: {
          repeat: Infinity,
          duration: 40,
          ease: "linear",
          delay: i * 0.3
        }
      }
    })
  };

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 opacity-25">
      {Array.from({ length: 10 }).map((_, rowIndex) => (
        <motion.div
          key={rowIndex}
          className="absolute w-[200%] flex gap-12 whitespace-nowrap items-center justify-start pl-8"
          style={{ 
            top: `${rowIndex * 10}%`, 
            height: '10%' 
          }}
          variants={rowVariants}
          custom={rowIndex}
          animate="animate"
        >
          {questions.map((question, questionIndex) => (
            <motion.span
              key={`${rowIndex}-${questionIndex}`}
              variants={questionVariants}
              initial="normal"
              animate={questionIndex === rowIndex % questions.length ? "highlighted" : "normal"}
              className="text-sm md:text-base"
            >
              {question}
            </motion.span>
          ))}
          {questions.map((question, questionIndex) => (
            <motion.span
              key={`${rowIndex}-${questionIndex}-duplicate`}
              variants={questionVariants}
              initial="normal"
              animate={questionIndex === rowIndex % questions.length ? "highlighted" : "normal"}
              className="text-sm md:text-base"
            >
              {question}
            </motion.span>
          ))}
        </motion.div>
      ))}
    </div>
  );
};

export default function WelcomePage() {
  const { user } = useAuth();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });
  
  // Parallax effect values
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 500], [0, -100]);
  const y2 = useTransform(scrollY, [0, 500], [0, -50]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);

  // Function to scroll to section and center it
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const elementRect = element.getBoundingClientRect();
      const absoluteElementTop = elementRect.top + window.pageYOffset;
      const middle = absoluteElementTop - (window.innerHeight / 2) + (elementRect.height / 2);
      window.scrollTo({
        top: middle,
        behavior: 'smooth'
      });
    }
  };

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
      
      {/* Progress Bar */}
      <motion.div 
        className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 to-purple-500 z-50 origin-left"
        style={{ scaleX }}
      />

      {/* Hero Section */}
      <motion.section 
        id="hero" 
        className="py-5 md:py-24 flex flex-col items-center justify-center relative min-h-[600px] md:min-h-[700px] overflow-hidden"
        style={{ 
          background: "transparent" 
        }}
      >
        <div className="absolute inset-0 backdrop-blur-[2px] bg-black/5 pointer-events-none z-0"></div>
        <ScrollingThoughtsBackground />
        
        {/* Parallax Background Elements */}
        <motion.div 
          className="absolute top-0 left-0 w-full h-full pointer-events-none z-1"
          style={{ opacity }}
        >
          <motion.div 
            className="absolute -top-20 -left-20 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl"
            style={{ y: y1 }}
          />
          <motion.div 
            className="absolute top-40 -right-20 w-80 h-80 rounded-full bg-purple-500/10 blur-3xl"
            style={{ y: y2 }}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="text-center max-w-4xl mx-auto px-4 mb-16 relative z-10"
        >
          <motion.h1 
            className={`text-5xl md:text-6xl font-bold ${gradientText} mb-6`}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8 }}
          >
            Face yourself. Reset Your Path. Build Your Life Manual.
          </motion.h1>
          
          <motion.p 
            className="text-xl text-gray-400 mb-0 max-w-2xl mx-auto"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            Pause the chaos. Build your life's manual. Start living right.
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <PersonaRibbon />
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 1.2 }}
            className="flex flex-wrap justify-center gap-4 mt-8"
          >
            <motion.button
              onClick={() => scrollToSection('overview')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="text-lg font-medium px-8 py-3 bg-blue-600 rounded-full hover:bg-blue-700 transition-colors"
            >
              So How Does This Work 😩
            </motion.button>
            
            <motion.button
              onClick={() => scrollToSection('video')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="text-lg font-medium px-8 py-3 bg-white text-gray-900 rounded-full hover:bg-gray-100 transition-colors"
            >
              Watch Demo
            </motion.button>
          </motion.div>
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
      </motion.section>

      {/* About Section */}
      <section id="about" className="py-16 md:py-20 mt-8 md:mt-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <motion.div 
            className="bg-white/5 rounded-3xl shadow-2xl backdrop-blur-sm overflow-hidden"
            initial={{ opacity: 0, y: 100 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ 
              duration: 0.8,
              type: "spring",
              stiffness: 50
            }}
          >
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
          </motion.div>
        </div>
      </section>

      {/* Intro Video Section */}
      <section id="video" className="py-16 md:py-20 mt-8 md:mt-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <motion.div 
            className="bg-white/5 rounded-3xl shadow-2xl backdrop-blur-sm overflow-hidden"
            initial={{ opacity: 0, y: 100 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ 
              duration: 0.8,
              type: "spring",
              stiffness: 50
            }}
          >
            <div className="p-6 md:p-12">
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="text-center mb-8 md:mb-12"
              >
                <h2 className={`text-3xl md:text-4xl font-bold ${gradientText} mb-4`}>Intro Video</h2>
                <p className="text-xl text-gray-400 mb-0 max-w-2xl mx-auto">See how LifeGuide works in action</p>
              </motion.div>

              <motion.div 
                className="relative max-w-3xl mx-auto"
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ 
                  duration: 0.8,
                  type: "spring",
                  stiffness: 50
                }}
              >
                <motion.div 
                  className="absolute inset-0 -m-8 border-4 border-dashed border-amber-400/70 rounded-xl" 
                  style={{ 
                    filter: 'drop-shadow(0 0 2px rgba(251, 191, 36, 0.4))',
                    transform: 'rotate(-0.5deg)'
                  }}
                  animate={{
                    borderColor: ["rgba(251, 191, 36, 0.7)", "rgba(251, 191, 36, 0.3)", "rgba(251, 191, 36, 0.7)"],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                ></motion.div>
                <motion.div 
                  className="aspect-video w-full max-w-2xl mx-auto rounded-lg overflow-hidden shadow-2xl relative"
                  whileHover={{ 
                    scale: 1.02,
                    transition: { duration: 0.3 }
                  }}
                >
                  <iframe
                    src="https://www.youtube.com/embed/dQw4w9WgXcQ"
                    title="LifeGuide Introduction"
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </motion.div>
                <div className="w-full mt-2 text-center">
                  <p className="text-xs text-amber-400/80 italic font-sans max-w-xs sm:max-w-none mx-auto">
                    *you thought you got rickrolled, but this is just a placeholder till my demo video is ready!
                  </p>
                </div>
              </motion.div>

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
                    View the Blueprint
                  </motion.button>
                </Link>
                <p className="w-full text-center text-sm text-gray-400 mt-2">
                  The Blueprint is what LifeGuide is based on. It's the backbone of the platfrom.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Overview Section */}
      <section id="overview" className="py-16 md:py-20 mt-8 md:mt-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <motion.div 
            className="bg-white/5 rounded-3xl shadow-2xl backdrop-blur-sm overflow-hidden"
            initial={{ opacity: 0, y: 100 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ 
              duration: 0.8,
              type: "spring",
              stiffness: 50
            }}
          >
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
          </motion.div>
        </div>
      </section>

      {/* About Me Section */}
      <section id="about-me" className="py-16 md:py-20 mt-8 md:mt-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <motion.div 
            className="bg-white/5 rounded-3xl shadow-2xl backdrop-blur-sm overflow-hidden"
            initial={{ opacity: 0, y: 100 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ 
              duration: 0.8,
              type: "spring",
              stiffness: 50
            }}
          >
            <div className="p-6 md:p-12">
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="text-center mb-8 md:mb-12"
              >
                <h2 className={`text-3xl md:text-4xl font-bold ${gradientText} mb-4`}>About Me</h2>
                <p className="text-xl text-gray-400 mb-0 max-w-2xl mx-auto">The creator behind LifeGuide</p>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 max-w-5xl mx-auto">
                <motion.div
                  initial={{ opacity: 0, x: -50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="flex flex-col items-center md:items-end"
                >
                  <div className="relative w-64 h-64 md:w-80 md:h-80 overflow-hidden rounded-xl border-2 border-blue-500/30">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20"></div>
                    {/* Placeholder image - replace with your actual photo */}
                    <img 
                      src="https://oibpypueiknfqnljgqjr.supabase.co/storage/v1/object/sign/images/ariel.JPG?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmwiOiJpbWFnZXMvYXJpZWwuSlBHIiwiaWF0IjoxNzQxNTQzMjczLCJleHAiOjE3NzMwNzkyNzN9.wKOEVsOpdMw2jw68aVB1ev9kAmPe-lq1unBvg-NHfEM" 
                      alt="Creator of LifeGuide" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex gap-4 mt-4 items-center">
                    <motion.button
                      onClick={() => scrollToSection('contact')}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
                    >
                      <span>Contact Me</span>
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                        <path d="M5 12h14"></path>
                        <path d="m12 5 7 7-7 7"></path>
                      </svg>
                    </motion.button>
                    <motion.a
                      href="https://x.com/wannabfounder?s=21" 
                      target="_blank"
                      rel="noopener noreferrer"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      className="bg-black hover:bg-grey-600 text-white p-3 rounded-full flex items-center justify-center"
                    >
                      <img 
                        src='/x_logo.svg' 
                        alt="X" 
                        width={24}
                        height={24}
                        className="w-5 h-5"
                      />
                    </motion.a>
                    <motion.a
                      href="https://linkedin.com/in/nurieli" 
                      target="_blank"
                      rel="noopener noreferrer"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      className="bg-blue-700 hover:bg-blue-800 text-white p-3 rounded-full flex items-center justify-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
                        <rect x="2" y="9" width="4" height="12"></rect>
                        <circle cx="4" cy="4" r="2"></circle>
                      </svg>
                    </motion.a>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  className="text-left space-y-4"
                >
                  <p className="text-gray-300 text-lg">
                    Hey there, I'm the creator of LifeGuide. After spending years navigating the complexities of personal development, military service, and entrepreneurship, I realized that what most people need isn't another productivity app—it's a framework for honest self-reflection and intentional living.
                  </p>
                  <p className="text-gray-300 text-lg">
                    LifeGuide was born from my own journey of rebuilding after returning from deployment. What started as personal notes scribbled at 1 AM has evolved into a system that's helped me and countless others gain clarity and purpose.
                  </p>
                  <p className="text-gray-300 text-lg">
                    My mission is simple: provide a no-nonsense tool that helps you cut through the noise, face yourself honestly, and build a life that's authentically yours—no fluff, no empty promises, just practical guidance.
                  </p>
                  
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-16 md:py-20 mt-8 md:mt-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <motion.div 
            className="bg-white/5 rounded-3xl shadow-2xl backdrop-blur-sm overflow-hidden"
            initial={{ opacity: 0, y: 100 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ 
              duration: 0.8,
              type: "spring",
              stiffness: 50
            }}
          >
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
          </motion.div>
        </div>
      </section>
    </>
  );
}
