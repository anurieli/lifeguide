'use client';

import { useDashboard } from '@/context/DashboardContext';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Section, Subsection, UserProgress, UserResponse } from '@/types/blueprint';
import ReactMarkdown from 'react-markdown';
import { ChevronDown, ChevronUp, ChevronRight, Check } from 'lucide-react';
import { cn } from '@/utils/utils';
import ProgressBar from '@/app/components/ProgressBar';
import CongratsPopup from '@/components/CongratulationsPopup';

export function BlueprintContent() {
  const { user, isMobile } = useDashboard();
  const [sections, setSections] = useState<Section[]>([]);
  const [subsections, setSubsections] = useState<Subsection[]>([]);
  const [userResponses, setUserResponses] = useState<Record<string, string>>({});
  const [committedResponses, setCommittedResponses] = useState<Set<string>>(new Set());
  const [expandedSectionDetails, setExpandedSectionDetails] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSectionComplete, setIsSectionComplete] = useState<Record<string, boolean>>({});
  const [userName, setUserName] = useState<string>('');
  const [showCongratsPopup, setShowCongratsPopup] = useState(false);

  useEffect(() => {
    if (user) {
      fetchBlueprintData();
      // Extract first name from user metadata
      const fullName = user.user_metadata?.name || '';
      const firstName = fullName ? fullName.split(' ')[0] : user.email?.split('@')[0] || '';
      setUserName(firstName);
    }
  }, [user]);

  useEffect(() => {
    if (!loading && sections.length > 0) {
      // Check if all sections have 100% progress
      const allSectionsComplete = sections.length > 0 && sections.every(section => {
        const sectionSubsections = subsections.filter(sub => sub.section_id === section.id);
        // Only consider sections that have subsections
        if (sectionSubsections.length === 0) return true;
        
        // Check if all subsections in this section are committed
        const completedSubsections = sectionSubsections.filter(sub => committedResponses.has(sub.id));
        const progress = completedSubsections.length / sectionSubsections.length * 100;
        
        // Section is complete when progress is 100%
        return progress >= 99.99;
      });
      
      if (allSectionsComplete) {
        // Check sessionStorage instead of localStorage so it resets when the browser session ends
        const key = `blueprint_congrats_shown_${user?.id}`;
        const hasShownBefore = sessionStorage.getItem(key);
        
        if (!hasShownBefore) {
          // Show popup and mark it as shown
          setShowCongratsPopup(true);
          sessionStorage.setItem(key, Date.now().toString());
        }
      }
    }
  }, [loading, sections, subsections, committedResponses, user?.id]);

  const fetchBlueprintData = async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      
      // Fetch sections - using guide_sections instead of sections
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('guide_sections')
        .select('*')
        .order('order_position', { ascending: true });
      
      if (sectionsError) throw sectionsError;
      
      // Fetch subsections - using guide_subsections instead of subsections
      const { data: subsectionsData, error: subsectionsError } = await supabase
        .from('guide_subsections')
        .select('*')
        .order('order_position', { ascending: true });
      
      if (subsectionsError) throw subsectionsError;
      
      // Fetch user responses
      const { data: responsesData, error: responsesError } = await supabase
        .from('user_responses')
        .select('*')
        .eq('user_id', user?.id);
      
      if (responsesError) throw responsesError;
      
      // Fetch user progress
      const { data: progressData, error: progressError } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', user?.id)
        .eq('completed', true);
      
      if (progressError) throw progressError;
      
      // Process data
      setSections(sectionsData || []);
      setSubsections(subsectionsData || []);
      
      // Process user responses
      const responses: Record<string, string> = {};
      responsesData?.forEach((response: UserResponse) => {
        responses[response.subsection_id] = response.content;
      });
      setUserResponses(responses);
      
      // Process committed responses
      const committed = new Set<string>();
      progressData?.forEach((progress: UserProgress) => {
        committed.add(progress.subsection_id);
      });
      setCommittedResponses(committed);
      
      // Calculate section completion
      const sectionComplete: Record<string, boolean> = {};
      sectionsData?.forEach((section: Section) => {
        const sectionSubsections = subsectionsData?.filter(
          (sub: Subsection) => sub.section_id === section.id
        );
        sectionComplete[section.id] = sectionSubsections?.every(
          (sub: Subsection) => committed.has(sub.id)
        ) ?? false;
      });
      setIsSectionComplete(sectionComplete);
      
    } catch (error) {
      console.error('Error fetching blueprint data:', error);
      setError('Failed to load blueprint data');
    } finally {
      setLoading(false);
    }
  };

  // Toggle section details
  const toggleSectionDetails = (sectionId: string) => {
    setExpandedSectionDetails(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(sectionId)) {
        newExpanded.delete(sectionId);
      } else {
        newExpanded.add(sectionId);
      }
      return newExpanded;
    });
  };

  const completedSections = sections.filter(section => isSectionComplete[section.id]);
  const nextSection = sections.find(section => !isSectionComplete[section.id]);

  // Add this function to check if a subsection is committed
  const isSubsectionCommitted = (subsectionId: string) => {
    return committedResponses.has(subsectionId);
  };

  const handleCloseCongratsPopup = () => {
    setShowCongratsPopup(false);
  };

  // Add debug function to reset localStorage flag and trigger popup
  const resetCongratsPopup = () => {
    if (user) {
      const key = `blueprint_congrats_shown_${user.id}`;
      sessionStorage.removeItem(key);
      setShowCongratsPopup(true);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        <p className="ml-3 text-lg text-gray-400">Loading your blueprint...</p>
      </div>
    );
  }

  if (error) {
    return <div className="p-4 text-red-400">{error}</div>;
  }

  return (
    <div className="flex justify-center">
      <CongratsPopup isOpen={showCongratsPopup} onClose={handleCloseCongratsPopup} />
      
      <div className={`flex w-full ${isMobile ? "flex-col" : "max-w-6xl"}`}>
        <div className={`flex-grow space-y-6 ${isMobile ? "" : "pr-4"}`}>
          <h1 className={`${isMobile ? "text-2xl" : "text-3xl"} font-bold text-white`}>
            Welcome back{userName ? <span className="bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text">, {userName}</span> : ''}
            
            {/* Add hidden debug button for devs only - will be invisible in production */}
            {process.env.NODE_ENV === 'development' && (
              <button 
                onClick={resetCongratsPopup}
                className="ml-2 text-xs text-gray-700 hover:text-gray-500 bg-gray-900 py-1 px-2 rounded-md"
                title="Debug: Show Congrats Popup"
              >
                🎉
              </button>
            )}
          </h1>
          <p className="text-white font-bold">Here's your personal Life Blueprint.</p>

          {completedSections.length === 0 ? (
            <div className="bg-white/5 rounded-xl backdrop-blur-sm border border-white/10 p-6">
              <p className="text-gray-400">
                You haven&apos;t completed any sections yet. Start building your blueprint by visiting the Editor.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {completedSections.map(section => (
                <div 
                  key={section.id} 
                  className="bg-white/5 rounded-xl backdrop-blur-sm border border-white/10 p-6"
                >
                  <div className={`flex ${isMobile ? "flex-col" : "items-start justify-between"} mb-4`}>
                    <div>
                      <h2 className="text-xl font-semibold text-white">{section.title}</h2>
                      <ReactMarkdown components={{
                        p: ({node, ...props}) => <p className="text-gray-400" {...props} />
                      }}>
                        {section.description}
                      </ReactMarkdown>
                      
                      {/* Add More Detail button */}
                      {section.subdescription && (
                        <div className="mt-3">
                          <button
                            onClick={() => toggleSectionDetails(section.id)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/30 rounded-lg text-amber-300 hover:from-amber-500/30 hover:to-yellow-500/30 transition-all shadow-sm hover:shadow-amber-500/20"
                          >
                            {expandedSectionDetails.has(section.id) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            <span className="text-sm font-medium">More Detail</span>
                          </button>
                          
                          {expandedSectionDetails.has(section.id) && (
                            <div className="mt-3 p-4 bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/20 rounded-lg shadow-inner">
                              <div className="prose prose-invert prose-sm max-w-none">
                                <ReactMarkdown>{section.subdescription}</ReactMarkdown>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {subsections
                      .filter(sub => sub.section_id === section.id && committedResponses.has(sub.id))
                      .map(subsection => (
                        <div key={subsection.id} className="bg-gray-800/50 rounded-lg p-4">
                          <h3 className="text-white font-medium mb-2">{subsection.title}</h3>
                          <div className="bg-gray-900/50 rounded p-3">
                            <p className="text-white whitespace-pre-wrap">{userResponses[subsection.id]}</p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {nextSection ? (
            <div className="bg-blue-500/10 rounded-xl backdrop-blur-sm border border-blue-500/20 p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-500/20 rounded-full">
                  <ChevronRight className="h-6 w-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-blue-400 mb-2">Continue Your Journey</h3>
                  <p className="text-gray-400 mb-4">
                    Your next section is &quot;{nextSection.title}&quot;. Keep building your blueprint to unlock more insights.
                  </p>
                  <a
                    href="/dashboard/editor"
                    className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Continue Building
                  </a>
                </div>
              </div>
            </div>
          ) : completedSections.length === sections.length && sections.length > 0 ? (
            <div className="bg-green-500/10 rounded-xl backdrop-blur-sm border border-green-500/20 p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-green-500/20 rounded-full">
                  <Check className="h-6 w-6 text-green-400" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-green-400 mb-2">All Sections Completed!</h3>
                  <p className="text-gray-400">
                    Congratulations! You&apos;ve completed all sections of your blueprint.
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
        <div className="w-64 flex-shrink-0 space-y-8 pl-4">
          <ProgressBar 
            sections={sections}
            subsections={subsections}
            isSubsectionCommitted={isSubsectionCommitted}
            className="hidden md:block" // Only show on medium screens and up
          />
        </div>
      </div>
    </div>
  );
} 