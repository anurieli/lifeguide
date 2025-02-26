'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { motion } from 'framer-motion';
import { HowToGuide } from '@/components/HowToGuide';
import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import ReactMarkdown from 'react-markdown';

interface Section {
  id: string;
  title: string;
  description: string;
  order_position: number;
}

interface Subsection {
  id: string;
  section_id: string;
  title: string;
  description: string;
  subdescription: string;
  malleability_level: 'green' | 'yellow' | 'red';
  malleability_details: string;
  example: string;
  order_position: number;
}

const gradientText = "bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text";

const TOOLTIP_CLASSES = {
  content: "bg-gray-900/95 backdrop-blur-sm border border-gray-800 text-white p-3 rounded-lg shadow-xl max-w-xs",
};

export default function GuidePage() {
  const [sections, setSections] = useState<Section[]>([]);
  const [subsections, setSubsections] = useState<Subsection[]>([]);
  const [expandedSubsection, setExpandedSubsection] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  useEffect(() => {
    const fetchBlueprintData = async () => {
      try {
        setLoading(true);
        setError(null);
        const supabase = createClient();

        const [sectionsResponse, subsectionsResponse] = await Promise.all([
          supabase.from('guide_sections').select('*').order('order_position'),
          supabase.from('guide_subsections').select('*').order('order_position')
        ]);

        if (sectionsResponse.error) throw sectionsResponse.error;
        if (subsectionsResponse.error) throw subsectionsResponse.error;

        if (sectionsResponse.data) {
          setSections(sectionsResponse.data.map((section: { 
            id: string;
            title: string;
            description: string;
            order_position: number;
          }) => ({
            id: section.id,
            title: section.title,
            description: section.description,
            order_position: section.order_position
          })));
        }

        if (subsectionsResponse.data) {
          setSubsections(subsectionsResponse.data.map((subsection: {
            id: string;
            section_id: string;
            title: string;
            description: string;
            subdescription: string;
            malleability_level: 'green' | 'yellow' | 'red';
            malleability_details: string;
            example: string;
            order_position: number;
          }) => ({
            id: subsection.id,
            section_id: subsection.section_id,
            title: subsection.title,
            description: subsection.description,
            subdescription: subsection.subdescription,
            malleability_level: subsection.malleability_level,
            malleability_details: subsection.malleability_details,
            example: subsection.example,
            order_position: subsection.order_position
          })));
        }
      } catch (err) {
        console.error('Error fetching blueprint data:', err);
        setError('Failed to load guide data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchBlueprintData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen pt-24 px-4 md:px-8 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading guide...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen pt-24 px-4 md:px-8 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 px-4 md:px-8 pb-16">
      {/* Header with explanation */}
      <div className="max-w-4xl mx-auto mb-12 text-center">
        <div className="flex items-center justify-center gap-4 mb-6">
          <h1 className={`text-4xl font-bold ${gradientText}`}>The Life Blueprint Guide</h1>
          <button
            onClick={() => setIsHelpOpen(true)}
            className="px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors text-sm"
          >
            How to Use
          </button>
        </div>
        <p className="text-gray-300 text-lg mb-8">
          This is the foundation of our platform - a comprehensive guide designed to help you understand and map out your life&apos;s journey. 
          Each section represents a crucial area of life, with specific prompts and examples to guide your self-reflection.
        </p>
        <div className="bg-white/5 rounded-xl p-6 backdrop-blur-sm border border-white/10">
          <p className="text-gray-400">
            This is a reference guide that forms the basis of our platform. While you can use this as inspiration for your own paper-based reflection,
            our platform provides an interactive and guided experience to help you create your personalized life blueprint.
            The examples shown here are meant to inspire and demonstrate the kind of insights you might discover in your own journey.
          </p>
        </div>
      </div>

      {/* Blueprint Sections */}
      <div className="max-w-4xl mx-auto space-y-12">
        {sections.map((section) => (
          <motion.div
            key={section.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 rounded-xl overflow-hidden backdrop-blur-sm border border-white/10"
          >
            <div className="p-6">
              <h2 className="text-2xl font-semibold text-white mb-3">{section.title}</h2>
              <p className="text-gray-400 mb-6">{section.description}</p>

              <div className="space-y-4">
                {subsections
                  .filter((sub) => sub.section_id === section.id)
                  .map((subsection) => (
                    <motion.div
                      key={subsection.id}
                      className="group relative bg-gray-800/50 rounded-lg p-4 border border-white/10 transition-all duration-300 hover:bg-gray-800/70"
                      onHoverStart={() => setExpandedSubsection(subsection.id)}
                      onHoverEnd={() => setExpandedSubsection(null)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <h3 className="text-white font-medium">{subsection.title}</h3>
                          {subsection.subdescription && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <Info className="h-4 w-4 text-gray-400" />
                                </TooltipTrigger>
                                <TooltipContent className={TOOLTIP_CLASSES.content}>
                                  <p>{subsection.subdescription}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                        <div>
                          {subsection.malleability_details ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <div className={`px-2 py-1 rounded-full text-xs ${
                                    subsection.malleability_level === 'green' ? 'bg-green-500/20 text-green-400' :
                                    subsection.malleability_level === 'yellow' ? 'bg-yellow-500/20 text-yellow-400' :
                                    'bg-red-500/20 text-red-400'
                                  }`}>
                                    {subsection.malleability_level}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent className={TOOLTIP_CLASSES.content}>
                                  <p>{subsection.malleability_details}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <div className={`px-2 py-1 rounded-full text-xs ${
                              subsection.malleability_level === 'green' ? 'bg-green-500/20 text-green-400' :
                              subsection.malleability_level === 'yellow' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-red-500/20 text-red-400'
                            }`}>
                              {subsection.malleability_level}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 space-y-4">
                        <div className="prose prose-invert max-w-none">
                          <ReactMarkdown
                            components={{
                              p: ({ children }) => <p className="text-gray-400">{children}</p>,
                              strong: ({ children }) => <strong className="text-white">{children}</strong>,
                              em: ({ children }) => <em className="text-gray-300">{children}</em>,
                              ul: ({ children }) => <ul className="list-disc pl-4 text-gray-400">{children}</ul>,
                              ol: ({ children }) => <ol className="list-decimal pl-4 text-gray-400">{children}</ol>,
                              li: ({ children }) => <li className="text-gray-400">{children}</li>
                            }}
                          >
                            {subsection.description}
                          </ReactMarkdown>
                        </div>

                        {expandedSubsection === subsection.id && subsection.example && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="pt-4 border-t border-white/10"
                          >
                            <h4 className="text-sm font-medium text-gray-300 mb-2">Example</h4>
                            <div className="prose prose-invert max-w-none">
                              <ReactMarkdown
                                components={{
                                  p: ({ children }) => <p className="text-gray-400">{children}</p>,
                                  strong: ({ children }) => <strong className="text-white">{children}</strong>,
                                  em: ({ children }) => <em className="text-gray-300">{children}</em>,
                                  ul: ({ children }) => <ul className="list-disc pl-4 text-gray-400">{children}</ul>,
                                  ol: ({ children }) => <ol className="list-decimal pl-4 text-gray-400">{children}</ol>,
                                  li: ({ children }) => <li className="text-gray-400">{children}</li>
                                }}
                              >
                                {subsection.example}
                              </ReactMarkdown>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  ))}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* How To Guide Dialog */}
      <HowToGuide 
        isOpen={isHelpOpen} 
        onOpenChange={setIsHelpOpen} 
        showButton={false} 
        displayMode="dialog"
      />
    </div>
  );
} 