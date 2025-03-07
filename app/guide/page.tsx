import { createClient } from '@/utils/supabase/server'
import ReactMarkdown from 'react-markdown';
import { HowToGuide } from '@/components/HowToGuide';
import { Info, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import ExpandableExample from '@/components/ExpandableExample';
import MoreDetailButton from '@/components/MoreDetailButton';

interface Section {
  id: string;
  title: string;
  description: string;
  order_position: number;
  subdescription?: string;
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

// Helper function to get color based on malleability level
const getMalleabilityColor = (level: 'green' | 'yellow' | 'red') => {
  switch (level) {
    case 'green':
      return {
        bg: 'bg-green-500/10',
        border: 'border-green-500/30',
        text: 'text-green-400',
        label: 'Highly Malleable'
      };
    case 'yellow':
      return {
        bg: 'bg-yellow-500/10',
        border: 'border-yellow-500/30',
        text: 'text-yellow-400',
        label: 'Moderately Malleable'
      };
    case 'red':
      return {
        bg: 'bg-red-500/10',
        border: 'border-red-500/30',
        text: 'text-red-400',
        label: 'Minimally Malleable'
      };
    default:
      return {
        bg: 'bg-gray-500/10',
        border: 'border-gray-500/30',
        text: 'text-gray-400',
        label: 'Unknown'
      };
  }
};

export default async function GuidePage() {
  // Fetch data from Supabase
  const supabase = await createClient();
  
  // Set 10 second timeout for each fetch
  const timeout = new Promise<never>((_, reject) => 
    setTimeout(() => reject(new Error('Guide data fetch timeout')), 10000)
  );
  
  try {
    console.log('Fetching guide data');
    
    // Create promises for fetching sections and subsections
    const sectionsPromise = supabase
      .from('guide_sections')
      .select('*')
      .order('order_position');
      
    const subsectionsPromise = supabase
      .from('guide_subsections')
      .select('*')
      .order('order_position');
    
    // Use Promise.race with timeout to fetch both datasets
    const [sectionsResponse, subsectionsResponse] = await Promise.all([
      Promise.race([sectionsPromise, timeout]),
      Promise.race([subsectionsPromise, timeout])
    ]);
    
    if (sectionsResponse.error) {
      throw new Error(`Error fetching sections: ${sectionsResponse.error.message}`);
    }
    
    if (subsectionsResponse.error) {
      throw new Error(`Error fetching subsections: ${subsectionsResponse.error.message}`);
    }
    
    const sections: Section[] = sectionsResponse.data || [];
    const subsections: Subsection[] = subsectionsResponse.data || [];
    
    console.log(`Guide data fetched successfully: ${sections.length} sections, ${subsections.length} subsections`);
    
    const disclaimerTextMarkdown = `**This guide is for public reference**. The interactive version of this guide is available when you sign in, allowing you to create your personalized life plan based on these principles. \nTry it out, *it&apos;ll only hurt a little*.
    
    `;

    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white pt-16 px-4 sm:px-6 lg:px-8">
        {/* Top-Level Container */}
        <div className="max-w-4xl mx-auto">
          {/* Header Section */}
          <div className="text-center mb-10">
            <div className="flex justify-center items-center gap-4 mb-6">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text">
                The Life Guide
              </h1>
              <HowToGuide displayMode="dialog" showButton={true} buttonPosition="inline" />
            </div>
            
            
            {/* Context Box */}
            <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 mb-10">
              <p className="text-gray-300 text-sm">
                <ReactMarkdown>{disclaimerTextMarkdown}</ReactMarkdown>
              </p>
            </div>
          </div>
          
          {/* Loading State - would be managed by client component */}
          {sections.length === 0 ? (
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-8 text-center">
              <div className="animate-spin h-8 w-8 border-t-2 border-blue-500 border-r-2 rounded-full mx-auto mb-4"></div>
              <p className="text-xl text-blue-300">Loading guide...</p>
            </div>
          ) : (
            /* Main Content (Sections Loop) */
            <div className="space-y-12">
              {sections.map((section, sectionIndex) => (
                <div 
                  key={section.id} 
                  className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden shadow-xl animate-fadeIn"
                  style={{ 
                    animationDelay: `${sectionIndex * 150}ms`,
                    opacity: 0,
                  }}
                >
                  {/* Section Header */}
                  <div className="bg-gradient-to-r from-blue-900/80 to-purple-900/80 px-6 py-5 border-b border-gray-700/50">
                    <h2 className="text-2xl font-bold text-white">{section.title}</h2>
                    <div className="text-gray-300 mt-2 prose prose-invert prose-sm max-w-none">
                      <ReactMarkdown>{section.description}</ReactMarkdown>
                    </div>
                    
                    {/* Add More Detail button */}
                    <MoreDetailButton subdescription={section.subdescription} />
                  </div>
                  
                  {/* Subsections Loop */}
                  <div className="p-6">
                    <div className="space-y-6">
                      {subsections
                        .filter(sub => sub.section_id === section.id)
                        .map((subsection, subIndex) => {
                          const malleabilityStyle = getMalleabilityColor(subsection.malleability_level);
                          
                          return (
                            <div 
                              key={subsection.id} 
                              className="bg-gray-800/50 border border-gray-700/50 rounded-lg overflow-hidden shadow-md hover:shadow-blue-900/10 transition-all animate-fadeIn"
                              style={{ 
                                animationDelay: `${(sectionIndex * 150) + (subIndex * 100)}ms`,
                                opacity: 0,
                              }}
                            >
                              <div className="p-5">
                                <div className="flex justify-between items-start mb-3">
                                  <div className="flex items-center gap-2">
                                    <h3 className="text-xl font-semibold text-white">{subsection.title}</h3>
                                    {subsection.subdescription && (
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Info className="h-4 w-4 text-gray-400 hover:text-gray-300 cursor-help" />
                                          </TooltipTrigger>
                                          <TooltipContent className="bg-gray-800 border border-gray-700 text-white max-w-md">
                                            <div className="prose prose-invert prose-sm max-w-none">
                                              <ReactMarkdown>{subsection.subdescription}</ReactMarkdown>
                                            </div>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    )}
                                  </div>
                                  
                                  {/* Malleability Badge with Tooltip */}
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div 
                                          className={`px-2 py-1 rounded-full text-xs ${malleabilityStyle.bg} ${malleabilityStyle.border} ${malleabilityStyle.text} cursor-help flex items-center gap-1`}
                                        >
                                          {malleabilityStyle.label}
                                          <HelpCircle className="h-3 w-3" />
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent className="bg-gray-800 border border-gray-700 text-white max-w-md">
                                        <div className="prose prose-invert prose-sm max-w-none">
                                          <ReactMarkdown>{subsection.malleability_details}</ReactMarkdown>
                                        </div>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                                
                                {/* Description - render markdown */}
                                <div className="text-gray-300 mb-4 prose prose-invert prose-sm max-w-none">
                                  <ReactMarkdown>{subsection.description}</ReactMarkdown>
                                </div>
                                
                                {/* Example (Expandable on Click with Client Component) */}
                                {subsection.example && (
                                  <ExpandableExample example={subsection.example} />
                                )}
                              </div>
                            </div>
                          );
                        })
                      }
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <div className="mt-12 text-center">
            <p className="text-gray-400 text-sm">
              Sign in to create your personal life blueprint based on this guide.
            </p>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error fetching guide data:', error);
    
    // Return an error state
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white pt-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text mb-8 text-center">
            Life Guide
          </h1>
          <div className="bg-red-900/30 border border-red-800/50 rounded-xl p-8 text-center">
            <p className="text-xl text-red-300 mb-2">Error Loading Guide</p>
            <p className="text-gray-300">We&apos;re having trouble loading the guide content. Please try again later.</p>
            <button 
              className="mt-4 px-4 py-2 bg-red-800/50 hover:bg-red-800/70 rounded-md transition-colors"
              onClick={() => window.location.reload()}
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }
} 