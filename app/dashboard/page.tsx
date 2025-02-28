'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Settings, CheckSquare, Edit, HelpCircle, ChevronRight, Bookmark, ChevronDown, ChevronUp, Info, Lock, Check, Trash2, Lightbulb, ChevronLeft, RotateCcw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { createClient } from '@/utils/supabase/client';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/utils/utils";
import { HowToGuide } from '@/components/HowToGuide';
import RichTextInput from "@/components/RichTextInput";
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';

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

interface UserResponse {
  id: string;
  user_id: string;
  subsection_id: string;
  content: string;  // Changed from response to content to match DB schema
  created_at: string;
  updated_at: string;
}

interface UserProgress {
  id: string;
  user_id: string;
  subsection_id: string;
  completed: boolean;
  flagged: boolean;
  created_at: string;
  updated_at: string;
}

interface DashboardMode {
  type: 'view' | 'edit';
  section?: number;
}

interface CommittedResponse {
  subsectionId: string;
  isCommitted: boolean;
}

interface ProTip {
  id: string;
  title: string;
  description: string;
}

// Mock pro tips (to be moved to database later)
const PRO_TIPS: ProTip[] = [
  {
    id: '1',
    title: 'Take Your Time',
    description: 'This is a journey of self-discovery. Don\'t rush through the sections. You owe yourself a few good hours to hit reset.'
  },
  {
    id: '2',
    title: 'Be Honest',
    description: 'The more authentic your responses, the more valuable your blueprint will be.'
  },
  {
    id: '3',
    title: 'Revisit & Refine',
    description: 'Your responses can evolve as you gain new insights. Come back to review periodically.'
  }
];

// Add this constant for consistent tooltip styling
const TOOLTIP_CLASSES = {
  content: "bg-gray-900/95 backdrop-blur-sm border border-gray-800 text-white p-3 rounded-lg shadow-xl",
  arrow: "border-gray-800"
};

// Replace the hardcoded MOCK_USER with a function to get the user from cookies
const getMockUser = () => {
  const mockUserCookie = document.cookie.split(';').find(c => c.trim().startsWith('mock_user='));
  if (!mockUserCookie) return null;
  try {
    return JSON.parse(decodeURIComponent(mockUserCookie.split('=')[1]));
  } catch (e) {
    console.error('Error parsing mock user cookie:', e);
    return null;
  }
};


export default function DashboardPage() {
  const [mode, setMode] = useState<DashboardMode>({ type: 'view' });
  const [isNewUserDialogOpen, setIsNewUserDialogOpen] = useState(false);
  const [selectedPage, setSelectedPage] = useState<'home' | 'actionables' | 'settings'>('home');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Add this useEffect to handle automatic sidebar collapse
  useEffect(() => {
    const handleResize = () => {
      // Calculate 40% of viewport width
      const fortyPercentWidth = window.innerWidth * 0.4;
      const shouldCollapse = window.innerWidth <= fortyPercentWidth;
      setIsSidebarCollapsed(shouldCollapse);
    };

    // Initial check
    handleResize();

    // Add event listener
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="flex min-h-screen">
      {/* Left Panel */}
      <div 
        className={cn(
          "bg-gray-900/50 backdrop-blur-sm border-r border-white/10 transition-all duration-300",
          mode.type === 'edit' ? 'hidden' : '',
          isSidebarCollapsed ? 'w-16' : 'w-64'
        )}
      >
        <div className="flex flex-col h-full">
          <div className="p-4 flex flex-col gap-4">
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="w-full flex items-center justify-between px-3 py-2 bg-gray-800/80 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <span className="text-gray-400 text-sm">{isSidebarCollapsed ? '' : ''} </span>
              {isSidebarCollapsed ? (
                <ChevronRight className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronLeft className="h-4 w-4 text-gray-400" />
              )}
            </button>
            {!isSidebarCollapsed && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsNewUserDialogOpen(true)}
                  className="px-3 py-1.5 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600/40 transition-colors text-sm flex items-center gap-1.5"
                >
                  <HelpCircle className="h-4 w-4" />
                  New User?
                </button>
                <button
                  onClick={() => setMode({ type: 'edit' })}
                  className="px-3 py-1.5 bg-purple-600/20 text-purple-400 rounded-lg hover:bg-purple-600/40 transition-colors text-sm flex items-center gap-1.5"
                >
                  <Edit className="h-4 w-4" />
                  Editor
                </button>
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="space-y-2 p-4">
            <button
              onClick={() => setSelectedPage('home')}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors w-full",
                selectedPage === 'home'
                  ? 'bg-white/10 text-white'
                  : 'text-gray-400 hover:bg-white/5'
              )}
            >
              <Home className="h-5 w-5" />
              {!isSidebarCollapsed && "Home"}
            </button>
            <Link
              href="/dashboard/actionables"
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors w-full",
                selectedPage === 'actionables'
                  ? 'bg-white/10 text-white'
                  : 'text-gray-400 hover:bg-white/5'
              )}
            >
              <CheckSquare className="h-5 w-5" />
              {!isSidebarCollapsed && "Actionables"}
            </Link>
            <Link
              href="/dashboard/settings"
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors w-full",
                selectedPage === 'settings'
                  ? 'bg-white/10 text-white'
                  : 'text-gray-400 hover:bg-white/5'
              )}
            >
              <Settings className="h-5 w-5" />
              {!isSidebarCollapsed && "Settings"}
            </Link>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-auto">
        {mode.type === 'view' ? (
          <ViewerMode onSwitchToEdit={() => setMode({ type: 'edit' })} />
        ) : (
          <EditorMode onClose={() => setMode({ type: 'view' })} />
        )}
      </div>

      {/* New User Dialog */}
      <Dialog open={isNewUserDialogOpen} onOpenChange={setIsNewUserDialogOpen}>
        <DialogContent className="bg-gray-900/95 backdrop-blur-sm border border-white/10 text-white max-w-3xl">
          <div className="relative">
            <div className="space-y-4">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text">
                Welcome to Your Dashboard!
              </h2>
              <div className="space-y-4 text-gray-300">
                <p>
                  This is your personal space to create and manage your life blueprint. Here&apos;s how it works:
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 rounded-lg p-4">
                    <h3 className="font-medium text-white mb-2">Viewer Mode</h3>
                    <p className="text-sm">
                      View your completed blueprint sections and responses. Hover over subsections to see detailed descriptions.
                    </p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4">
                    <h3 className="font-medium text-white mb-2">Editor Mode</h3>
                    <p className="text-sm">
                      Make changes to your blueprint. Work through sections in order and bookmark important areas to revisit.
                    </p>
                  </div>
                </div>
                <p className="text-sm">
                  Start by clicking the &quot;Editor&quot; button to begin creating your blueprint. You can switch between viewer and editor modes at any time.
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const ViewerMode = ({ onSwitchToEdit }: { onSwitchToEdit: () => void }) => {
  const [sections, setSections] = useState<Section[]>([]);
  const [subsections, setSubsections] = useState<Subsection[]>([]);
  const [userResponses, setUserResponses] = useState<Record<string, string>>({});
  const [committedResponses, setCommittedResponses] = useState<Set<string>>(new Set());
  const [expandedSectionDetails, setExpandedSectionDetails] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSectionComplete, setIsSectionComplete] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchViewerData = async () => {
      setLoading(true);
      setError(null);

      try {
        const supabase = createClient();
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!session) throw new Error('No active session');

        const userId = session.user.id;
        
        const [sectionsResponse, subsectionsResponse, userResponsesResponse, userProgressResponse] = await Promise.all([
          supabase.from('guide_sections').select('*').order('order_position'),
          supabase.from('guide_subsections').select('*').order('order_position'),
          supabase.from('user_responses').select('*').eq('user_id', userId),
          supabase.from('user_progress').select('*').eq('user_id', userId).eq('completed', true)
        ]);

        if (sectionsResponse.error) throw sectionsResponse.error;
        if (subsectionsResponse.error) throw subsectionsResponse.error;
        if (userResponsesResponse.error) throw userResponsesResponse.error;
        if (userProgressResponse.error) throw userProgressResponse.error;

        setSections(sectionsResponse.data);
        setSubsections(subsectionsResponse.data);

        // Process user responses
        const responses: Record<string, string> = {};
        userResponsesResponse.data.forEach((response: UserResponse) => {
          responses[response.subsection_id] = response.content;
        });
        setUserResponses(responses);

        // Process committed responses
        const committed = new Set<string>();
        userProgressResponse.data.forEach((progress: UserProgress) => {
          committed.add(progress.subsection_id);
        });
        setCommittedResponses(committed);

        // Set isSectionComplete
        const sectionComplete: Record<string, boolean> = {};
        sectionsResponse.data.forEach((section: Section) => {
          const sectionSubsections = subsectionsResponse.data.filter((sub: Subsection) => sub.section_id === section.id);
          sectionComplete[section.id] = sectionSubsections.every((sub: Subsection) => committed.has(sub.id));
        });
        setIsSectionComplete(sectionComplete);
      } catch (error) {
        console.error('Error fetching viewer data:', error);
        setError('Failed to load blueprint data');
      } finally {
        setLoading(false);
      }
    };

    fetchViewerData();
  }, [isSectionComplete]);

  // Add this function to toggle section details
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

  if (loading) return <div className="p-4 text-gray-400">Loading...</div>;
  if (error) return <div className="p-4 text-red-400">{error}</div>;

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text">
        Your Blueprint
      </h1>

      {completedSections.length === 0 ? (
        <div className="bg-white/5 rounded-xl backdrop-blur-sm border border-white/10 p-6">
          <p className="text-gray-400">
            You haven&apos;t completed any sections yet. Start building your blueprint by clicking the &quot;Editor&quot; button.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {completedSections.map(section => (
            <div 
              key={section.id} 
              className="bg-white/5 rounded-xl backdrop-blur-sm border border-white/10 p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-white">{section.title}</h2>
                  <p className="text-gray-400">{section.description}</p>
                  
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
                        <div className="mt-3 p-4 bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/20 rounded-lg animate-fadeIn shadow-inner">
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
                  .filter(sub => sub.section_id === section.id && isSectionComplete[section.id])
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
              <button
                onClick={onSwitchToEdit}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Continue Building
              </button>
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
                Congratulations! You&apos;ve completed all sections of your blueprint... for now!
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

function EditorMode({ onClose }: { onClose: () => void }) {
  const [sections, setSections] = useState<Section[]>([]);
  const [subsections, setSubsections] = useState<Subsection[]>([]);
  const [userResponses, setUserResponses] = useState<Record<string, string>>({});
  const [committedResponses, setCommittedResponses] = useState<CommittedResponse[]>([]);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [expandedExamples, setExpandedExamples] = useState<Set<string>>(new Set());
  const [expandedSectionDetails, setExpandedSectionDetails] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookmarkedSubsections, setBookmarkedSubsections] = useState<Set<string>>(new Set());
  const subsectionRefs = useRef<Record<string, HTMLDivElement>>({});
  const [isRestartDialogOpen, setIsRestartDialogOpen] = useState(false);
  const [clearingSectionId, setClearingSectionId] = useState<string | null>(null);
  const [expandedProTips, setExpandedProTips] = useState(false);
  const [commitSectionId, setCommitSectionId] = useState<string | null>(null);
  const [isExitDialogOpen, setIsExitDialogOpen] = useState(false);
  const [hasUncommittedChanges, setHasUncommittedChanges] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  useEffect(() => {
    const hasSeenEditor = localStorage.getItem('hasSeenEditor');
    if (!hasSeenEditor) {
      setIsHelpOpen(true);
      localStorage.setItem('hasSeenEditor', 'true');
    }
  }, []);

  useEffect(() => {
    fetchBlueprintData();
  }, []);

  useEffect(() => {
    // Auto-open the current section that needs to be completed
    if (sections.length > 0) {
      const currentSection = sections.find(section => !isSectionComplete(section.id));
      if (currentSection) {
        setExpandedSection(currentSection.id);
      }
    }
  }, [sections]);

  const fetchBlueprintData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const supabase = createClient();

      // Get session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('Session error:', sessionError);
        setError('Authentication error');
        setLoading(false);
        return;
      }
      if (!session) {
        console.error('No active session found');
        setError('No active session');
        setLoading(false);
        return;
      }

      const userId = session.user.id;
      console.log('Fetching data for user:', userId);

      const [sectionsResponse, subsectionsResponse, userResponsesResponse, userProgressResponse] = await Promise.all([
        supabase.from('guide_sections').select('*').order('order_position'),
        supabase.from('guide_subsections').select('*').order('order_position'),
        supabase.from('user_responses').select('*').eq('user_id', userId),
        supabase.from('user_progress').select('*').eq('user_id', userId)
      ]);

      if (sectionsResponse.error) throw sectionsResponse.error;
      if (subsectionsResponse.error) throw subsectionsResponse.error;
      if (userResponsesResponse.error) throw userResponsesResponse.error;
      if (userProgressResponse.error) throw userProgressResponse.error;

      setSections(sectionsResponse.data);
      setSubsections(subsectionsResponse.data);
      
      // Set user responses
      const responses: Record<string, string> = {};
      userResponsesResponse.data.forEach((response: UserResponse) => {
        responses[response.subsection_id] = response.content;
      });
      setUserResponses(responses);

      // Set committed responses and bookmarks
      const committed: CommittedResponse[] = userProgressResponse.data
        .filter((progress: UserProgress) => progress.completed)
        .map((progress: UserProgress) => ({
          subsectionId: progress.subsection_id,
          isCommitted: true
        }));
      setCommittedResponses(committed);

      // Set bookmarks from flagged items
      const bookmarked = new Set<string>(
        userProgressResponse.data
          .filter((progress: UserProgress) => progress.flagged)
          .map((progress: UserProgress) => progress.subsection_id)
      );
      setBookmarkedSubsections(bookmarked);
    } catch (error) {
      console.error('Error fetching blueprint data:', error);
      setError('Failed to load blueprint data');
    } finally {
      setLoading(false);
    }
  };

  // Update saveUserResponse function
  const saveUserResponse = async (subsectionId: string, content: string) => {
    const user = getMockUser();
    if (!user) {
      console.error('User session not found');
      return;
    }

    console.log('Attempting to save response for user:', user.id);
    
    try {
      const supabase = createClient();
      
      // First verify we have an active session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('Session error:', sessionError);
        return;
      }
      if (!session) {
        console.error('No active session found');
        return;
      }
      
      // Important: Use the session user ID instead of mock user
      const userId = session.user.id;
      console.log('Active session found for user:', userId);
      
      // First, check if a response exists
      console.log('Checking for existing response...');
      const { data: existingResponses, error: fetchError } = await supabase
        .from('user_responses')
        .select('id')
        .eq('user_id', userId)
        .eq('subsection_id', subsectionId);

      if (fetchError) {
        console.error('Error fetching existing response:', fetchError);
        throw fetchError;
      }

      const existingResponse = existingResponses?.[0];
      console.log('Existing response:', existingResponse);

      if (existingResponse) {
        console.log('Updating existing response...');
        const { error: updateError } = await supabase
          .from('user_responses')
          .update({
            content: content,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingResponse.id);
          
        if (updateError) {
          console.error('Error updating response:', updateError);
          throw updateError;
        }
      } else {
        console.log('Creating new response...');
        const { error: insertError } = await supabase
          .from('user_responses')
          .insert({
            user_id: userId,
            subsection_id: subsectionId,
            content: content,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          
        if (insertError) {
          console.error('Error inserting response:', insertError);
          throw insertError;
        }
      }
      
      console.log('Successfully saved response');
    } catch (error) {
      console.error('Error saving response:', error);
    }
  };

  // Update saveUserProgress function
  const saveUserProgress = async (subsectionId: string, completed: boolean) => {
    try {
      const supabase = createClient();
      
      // First verify we have an active session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('Session error:', sessionError);
        return;
      }
      if (!session) {
        console.error('No active session found');
        return;
      }
      
      const userId = session.user.id;
      console.log('Saving progress for user:', userId);

      // First check if a record exists
      const { data: existingProgress, error: fetchError } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('subsection_id', subsectionId)
        .maybeSingle();  // Use maybeSingle instead of single to avoid 406

      if (fetchError) {
        console.error('Error checking existing progress:', fetchError);
        return;
      }

      if (existingProgress) {
        // Update existing record
        const { error: updateError } = await supabase
          .from('user_progress')
          .update({
            completed: completed,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingProgress.id)
          .select();  // Add select() to ensure proper response format

        if (updateError) {
          console.error('Error updating progress:', updateError);
          return;
        }
      } else {
        // Insert new record
        const { error: insertError } = await supabase
          .from('user_progress')
          .insert({
            user_id: userId,
            subsection_id: subsectionId,
            completed: completed,
            updated_at: new Date().toISOString()
          })
          .select();  // Add select() to ensure proper response format

        if (insertError) {
          console.error('Error inserting progress:', insertError);
          return;
        }
      }

      console.log('Successfully saved progress');
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  };

  const toggleBookmark = async (subsectionId: string) => {
    if (isSubsectionCommitted(subsectionId)) return;
    
    const newBookmarks = new Set(bookmarkedSubsections);
    const isFlagged = newBookmarks.has(subsectionId);
    
    if (isFlagged) {
      newBookmarks.delete(subsectionId);
    } else {
      newBookmarks.add(subsectionId);
    }
    
    setBookmarkedSubsections(newBookmarks);
    await saveUserProgress(subsectionId, isSubsectionCommitted(subsectionId));
  };

  // Update clearBookmarks function to use session user
  const clearBookmarks = async () => {
    try {
      const supabase = createClient();
      
      // Get session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        console.error('Session error:', sessionError);
        return;
      }

      const { error: updateError } = await supabase
        .from('user_progress')
        .update({ flagged: false })
        .eq('user_id', session.user.id);

      if (updateError) {
        console.error('Error clearing bookmarks:', updateError);
        return;
      }

      setBookmarkedSubsections(new Set());
    } catch (error) {
      console.error('Error clearing bookmarks:', error);
    }
  };

  const toggleCommit = async (subsectionId: string) => {
    if (!canCommitSubsection(subsectionId)) return;
    
    const isCurrentlyCommitted = isSubsectionCommitted(subsectionId);
    const newCommittedResponses = committedResponses.filter(r => r.subsectionId !== subsectionId);
    
    if (!isCurrentlyCommitted) {
      newCommittedResponses.push({ subsectionId, isCommitted: true });
      // Remove bookmark if committing
      const newBookmarks = new Set(bookmarkedSubsections);
      newBookmarks.delete(subsectionId);
      setBookmarkedSubsections(newBookmarks);
      await saveUserProgress(subsectionId, true);
    } else {
      await saveUserProgress(subsectionId, false);
    }
    
    setCommittedResponses(newCommittedResponses);
  };

  // Check for uncommitted changes when trying to exit
  const handleClose = () => {
    const hasUnsavedChanges = Object.entries(userResponses).some(([subsectionId, content]) => {
      const isCommitted = isSubsectionCommitted(subsectionId);
      return content && content.trim().length > 0 && !isCommitted;
    });

    if (hasUnsavedChanges) {
      setHasUncommittedChanges(true);
      setIsExitDialogOpen(true);
    } else {
      onClose();
    }
  };

  const toggleExample = (subsectionId: string) => {
    setExpandedExamples(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(subsectionId)) {
        newExpanded.delete(subsectionId);
      } else {
        newExpanded.add(subsectionId);
      }
      return newExpanded;
    });
  };

  const scrollToSubsection = (subsectionId: string) => {
    const element = subsectionRefs.current[subsectionId];
    if (element) {
      const section = sections.find(sec => 
        subsections.find(sub => sub.id === subsectionId)?.section_id === sec.id
      );
      if (section) {
        setExpandedSection(section.id);
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
    }
  };

  const isSubsectionCommitted = (subsectionId: string) => {
    return committedResponses.some(r => r.subsectionId === subsectionId && r.isCommitted);
  };

  const canCommitSubsection = (subsectionId: string) => {
    const response = userResponses[subsectionId];
    return response && response.trim().length >= 10;
  };

  const isSectionComplete = (sectionId: string) => {
    const sectionSubsections = subsections.filter(sub => sub.section_id === sectionId);
    return sectionSubsections.every(sub => isSubsectionCommitted(sub.id));
  };

  const canEditSection = (sectionId: string) => {
    const sectionIndex = sections.findIndex(s => s.id === sectionId);
    if (sectionIndex === 0) return true;
    const previousSection = sections[sectionIndex - 1];
    return previousSection ? isSectionComplete(previousSection.id) : true;
  };

  const clearSection = (sectionId: string) => {
    const sectionSubsections = subsections.filter(sub => sub.section_id === sectionId);
    
    // Clear responses and commits for the section
    setUserResponses(prev => {
      const newResponses = { ...prev };
      sectionSubsections.forEach(sub => delete newResponses[sub.id]);
      return newResponses;
    });

    setCommittedResponses(prev => 
      prev.filter(r => !sectionSubsections.some(sub => sub.id === r.subsectionId))
    );

    // Clear bookmarks for the section
    setBookmarkedSubsections(prev => {
      const newBookmarks = new Set(prev);
      sectionSubsections.forEach(sub => newBookmarks.delete(sub.id));
      return newBookmarks;
    });

    // Close the dialog
    setClearingSectionId(null);
  };

  const restartBlueprint = async () => {
    try {
      const supabase = createClient();
      
      // Get session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('No active session found');
        return;
      }

      const userId = session.user.id;

      // Delete all user responses
      await supabase
        .from('user_responses')
        .delete()
        .eq('user_id', userId);

      // Reset all user progress
      await supabase
        .from('user_progress')
        .delete()
        .eq('user_id', userId);

      // Close dialog and refetch data
      setIsRestartDialogOpen(false);
      await fetchBlueprintData();
    } catch (error) {
      console.error('Error restarting blueprint:', error);
    }
  };

  const getSectionStatus = (sectionId: string) => {
    const sectionSubsections = subsections.filter(sub => sub.section_id === sectionId);
    const hasStarted = sectionSubsections.some(sub => userResponses[sub.id]?.trim());
    const isComplete = sectionSubsections.every(sub => isSubsectionCommitted(sub.id));
    
    return {
      hasStarted,
      isComplete
    };
  };

  const canCommitSection = (sectionId: string) => {
    const sectionSubsections = subsections.filter(sub => sub.section_id === sectionId);
    return sectionSubsections.every(sub => canCommitSubsection(sub.id));
  };

  const commitSection = (sectionId: string) => {
    if (!canCommitSection(sectionId)) return;
    
    const sectionSubsections = subsections.filter(sub => sub.section_id === sectionId);
    sectionSubsections.forEach(sub => {
      if (canCommitSubsection(sub.id)) {
        toggleCommit(sub.id);
      }
    });
    setCommitSectionId(null);
  };

  // Add this function to toggle section details
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

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-900 z-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading blueprint...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-gray-900 z-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={fetchBlueprintData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-900 z-50">
      <div className="h-full flex justify-center">
        {/* Main Editor Area */}
        <div className="flex-1 p-6 overflow-auto max-w-5xl">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text">
                Blueprint Editor
              </h1>
              <button
                onClick={() => setIsHelpOpen(true)}
                className="px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors text-sm flex items-center gap-1.5 w-auto max-[800px]:w-9 max-[800px]:px-0 max-[800px]:justify-center"
              >
                <HelpCircle className="h-4 w-4" />
                <span className="max-[800px]:hidden">Help?</span>
              </button>
              <button
                onClick={() => setExpandedProTips(!expandedProTips)}
                className="px-3 py-1.5 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors text-sm flex items-center gap-1.5 w-auto max-[800px]:w-9 max-[800px]:px-0 max-[800px]:justify-center"
              >
                <Lightbulb className="h-4 w-4" />
                <span className="max-[800px]:hidden">Tips</span>
              </button>
              
            </div>
            <div className="flex items-center gap-4">
            <button
                onClick={() => setIsRestartDialogOpen(true)}
                className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors text-sm flex items-center gap-1.5 w-auto max-[800px]:w-9 max-[800px]:px-0 max-[800px]:justify-center"
              >
                <RotateCcw className="h-4 w-4" />
                <span className="max-[800px]:hidden">Restart</span>
              </button>
              <button
                onClick={handleClose}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Done
              </button>
              <button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="p-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
              >
                {isSidebarCollapsed ? (
                  <>
                    <ChevronLeft className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-400 text-sm">Show Progress</span>
                  </>
                ) : (
                  <>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-400 text-sm">Hide Progress</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Pro Tips Gallery */}
          <AnimatePresence>
            {expandedProTips && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-8"
              >
                <div className="grid grid-cols-3 gap-4">
                  {PRO_TIPS.map(tip => (
                    <div
                      key={tip.id}
                      className="bg-purple-500/10 rounded-lg p-4 border border-purple-500/20"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Lightbulb className="h-4 w-4 text-purple-400" />
                        <h3 className="font-medium text-purple-400">{tip.title}</h3>
                      </div>
                      <p className="text-sm text-gray-400">{tip.description}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-8">
            {sections.map((section) => {
              const status = getSectionStatus(section.id);
              const ringColor = status.isComplete ? 'ring-green-500/50' : 
                              status.hasStarted ? 'ring-blue-500/50' : 
                              'ring-white/10';

              return (
                <div
                  key={section.id}
                  className={cn(
                    "bg-white/5 rounded-xl backdrop-blur-sm border border-white/10 p-6 ring-1",
                    ringColor
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div>
                        <h2 className="text-xl font-semibold text-white">{section.title}</h2>
                        <p className="text-gray-400 mt-1">{section.description}</p>
                        
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
                              <div className="mt-3 p-4 bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/20 rounded-lg animate-fadeIn shadow-inner">
                                <div className="prose prose-invert prose-sm max-w-none">
                                  <ReactMarkdown>{section.subdescription}</ReactMarkdown>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      {!canEditSection(section.id) && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 rounded-lg">
                          <Lock className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-400 text-sm font-medium">Section Locked</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {status.hasStarted && (
                        <>
                          <button
                            onClick={() => setClearingSectionId(section.id)}
                            className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors text-sm"
                          >
                            Clear Section
                          </button>
                          {status.isComplete ? (
                            <div className="px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg text-sm">
                              Completed
                            </div>
                          ) : (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => canCommitSection(section.id) ? setCommitSectionId(section.id) : null}
                                    className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                                      canCommitSection(section.id)
                                        ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                                        : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                    }`}
                                  >
                                    Commit Section
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent className={TOOLTIP_CLASSES.content}>
                                  <p className="max-w-xs">
                                    {canCommitSection(section.id)
                                      ? "Commit all responses in this section"
                                      : "All subsections must have valid responses to commit the section"}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </>
                      )}
                      <button
                        onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
                        className="p-2 bg-gray-700 rounded-full hover:bg-gray-600 transition-colors"
                      >
                        {expandedSection === section.id ? (
                          <ChevronUp className="h-5 w-5 text-white" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-white" />
                        )}
                      </button>
                    </div>
                  </div>

                  {expandedSection === section.id && (
                    <div className="mt-6 space-y-4">
                      {subsections
                        .filter(sub => sub.section_id === section.id)
                        .map((subsection) => (
                          <div
                            key={subsection.id}
                            ref={el => {
                              if (el) subsectionRefs.current[subsection.id] = el;
                            }}
                            className={cn(
                              "bg-gray-800/50 rounded-lg p-4 border border-white/10",
                              isSubsectionCommitted(subsection.id) ? "ring-1 ring-green-500/50" :
                              userResponses[subsection.id]?.trim() ? "ring-1 ring-blue-500/50" : ""
                            )}
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <h3 className="text-white font-medium">{subsection.title}</h3>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <Info className="h-4 w-4 text-gray-400" />
                                    </TooltipTrigger>
                                    <TooltipContent className={TOOLTIP_CLASSES.content}>
                                      <div className="prose prose-invert max-w-xs">
                                        <ReactMarkdown
                                          components={{
                                            p: ({ children }) => <p className="text-gray-400 mt-1">{children}</p>,
                                            strong: ({ children }) => <strong className="text-white">{children}</strong>,
                                            em: ({ children }) => <em className="text-gray-300">{children}</em>,
                                            ul: ({ children }) => <ul className="list-disc pl-4 text-gray-400">{children}</ul>,
                                            ol: ({ children }) => <ol className="list-decimal pl-4 text-gray-400">{children}</ol>,
                                            li: ({ children }) => <li className="text-gray-400">{children}</li>
                                          }}
                                        >
                                          {subsection.subdescription}
                                        </ReactMarkdown>
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => toggleBookmark(subsection.id)}
                                  disabled={isSubsectionCommitted(subsection.id)}
                                  className={`p-1.5 rounded-full transition-colors ${
                                    isSubsectionCommitted(subsection.id)
                                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                      : bookmarkedSubsections.has(subsection.id)
                                      ? 'bg-blue-500/20 text-blue-400'
                                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                                  }`}
                                >
                                  <Bookmark className="h-4 w-4" />
                                </button>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        onClick={() => toggleCommit(subsection.id)}
                                        disabled={!canCommitSubsection(subsection.id) || !canEditSection(section.id)}
                                        className={`p-1.5 rounded-full transition-colors ${
                                          !canEditSection(section.id)
                                            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                            : isSubsectionCommitted(subsection.id)
                                            ? 'bg-green-500/20 text-green-400'
                                            : canCommitSubsection(subsection.id)
                                            ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/40'
                                            : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                        }`}
                                      >
                                        {isSubsectionCommitted(subsection.id) ? (
                                          <Edit className="h-4 w-4" />
                                        ) : (
                                          <Check className="h-4 w-4" />
                                        )}
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent className={TOOLTIP_CLASSES.content}>
                                      <p>{isSubsectionCommitted(subsection.id) ? 'Edit Response' : 'Commit Response'}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </div>

                            <div className="space-y-3 text-sm">
                              <div className="flex items-start gap-2">
                                <div className="flex-1 prose prose-invert max-w-none">
                                  <ReactMarkdown
                                    components={{
                                      p: ({ children }) => <p className="text-gray-400 mt-1">{children}</p>,
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
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                                        subsection.malleability_level === 'green' ? 'bg-green-500/20 text-green-400' :
                                        subsection.malleability_level === 'yellow' ? 'bg-yellow-500/20 text-yellow-400' :
                                        'bg-red-500/20 text-red-400'
                                      }`}>
                                        {subsection.malleability_level === 'green' ? 'flexible' :
                                         subsection.malleability_level === 'yellow' ? 'stiff' :
                                         'static'}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent className={TOOLTIP_CLASSES.content}>
                                      <div className="prose prose-invert max-w-xs">
                                        <ReactMarkdown>
                                          {subsection.malleability_details}
                                        </ReactMarkdown>
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>

                              <div>
                                <button
                                  onClick={() => toggleExample(subsection.id)}
                                  className="text-blue-400 hover:text-blue-300 transition-colors text-sm"
                                >
                                  {expandedExamples.has(subsection.id) ? 'Hide Example' : 'Show Example'}
                                </button>
                                {expandedExamples.has(subsection.id) && (
                                  <div className="mt-2 p-3 bg-gray-900/80 rounded-lg border border-gray-800">
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
                                  </div>
                                )}
                              </div>

                              <div>
                                <RichTextInput
                                  value={userResponses[subsection.id] || ''}
                                  onChange={(newValue) => {
                                    setUserResponses(prev => ({
                                      ...prev,
                                      [subsection.id]: newValue
                                    }));
                                    // Debounce the save
                                    const timeoutId = setTimeout(() => {
                                      saveUserResponse(subsection.id, newValue);
                                    }, 500);
                                    return () => clearTimeout(timeoutId);
                                  }}
                                  disabled={isSubsectionCommitted(subsection.id) || !canEditSection(section.id)}
                                  placeholder={
                                    !canEditSection(section.id)
                                      ? "Complete previous sections first"
                                      : isSubsectionCommitted(subsection.id)
                                      ? "Response committed. Click edit to modify."
                                      : "Enter your response... (Formatting supported)"
                                  }
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Progress Sidebar */}
        <div className={cn(
          "h-full border-l border-white/10 bg-gray-900 transition-all duration-300 overflow-y-auto p-4",
          isSidebarCollapsed ? "w-16" : "w-64",
          "max-[800px]:hidden" // Hide completely on small screens
        )}>
          <div className="space-y-6">
            {!isSidebarCollapsed && (
              <>
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-3">Progress</h3>
                  <div className="space-y-4">
                    {sections.map((section) => {
                      const sectionSubsections = subsections.filter(sub => sub.section_id === section.id);
                      const completedSubsections = sectionSubsections.filter(sub => isSubsectionCommitted(sub.id));
                      const progress = sectionSubsections.length ? 
                        (completedSubsections.length / sectionSubsections.length) * 100 : 0;
                      
                      return (
                        <div key={section.id} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400 truncate">{section.title}</span>
                            <span className="text-xs text-gray-400">{Math.round(progress)}%</span>
                          </div>
                          <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full transition-all duration-300"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-gray-400">Bookmarks</h3>
                    {bookmarkedSubsections.size > 0 && (
                      <button
                        onClick={clearBookmarks}
                        className="p-1 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {Array.from(bookmarkedSubsections).map(subsectionId => {
                      const subsection = subsections.find(sub => sub.id === subsectionId);
                      if (!subsection) return null;
                      
                      return (
                        <button
                          key={subsectionId}
                          onClick={() => scrollToSubsection(subsectionId)}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-sm"
                        >
                          <Bookmark className="h-4 w-4 text-blue-400" />
                          <span className="text-gray-300 truncate">{subsection.title}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Exit Dialog */}
      <Dialog open={isExitDialogOpen} onOpenChange={setIsExitDialogOpen}>
        <DialogContent className="bg-gray-900/95 backdrop-blur-sm border border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Uncommitted Changes</DialogTitle>
            <DialogDescription className="text-gray-400">
              You have uncommitted changes that will be lost if you exit. Would you like to commit your changes first?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 justify-end">
            <button
              onClick={() => {
                setIsExitDialogOpen(false);
                onClose();
              }}
              className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Exit Without Saving
            </button>
            <button
              onClick={() => setIsExitDialogOpen(false)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Continue Editing
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restart Blueprint Dialog */}
      <Dialog open={isRestartDialogOpen} onOpenChange={setIsRestartDialogOpen}>
        <DialogContent className="bg-gray-900/95 backdrop-blur-sm border border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Restart Blueprint?</DialogTitle>
            <DialogDescription className="text-gray-400">
              This will clear all your responses and progress. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 justify-end">
            <button
              onClick={() => setIsRestartDialogOpen(false)}
              className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={restartBlueprint}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Restart
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear Section Dialog */}
      <Dialog open={clearingSectionId !== null} onOpenChange={() => setClearingSectionId(null)}>
        <DialogContent className="bg-gray-900/95 backdrop-blur-sm border border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Clear Section?</DialogTitle>
            <DialogDescription className="text-gray-400">
              This will clear all responses in this section and lock subsequent sections. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 justify-end">
            <button
              onClick={() => setClearingSectionId(null)}
              className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => clearingSectionId && clearSection(clearingSectionId)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Clear Section
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Commit Section Dialog */}
      <Dialog open={commitSectionId !== null} onOpenChange={() => setCommitSectionId(null)}>
        <DialogContent className="bg-gray-900/95 backdrop-blur-sm border border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Commit Section?</DialogTitle>
            <DialogDescription className="text-gray-400">
              This will commit all responses in this section. You can still edit them later if needed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 justify-end">
            <button
              onClick={() => setCommitSectionId(null)}
              className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => commitSectionId && commitSection(commitSectionId)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Commit Section
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add HowToGuide Dialog */}
      <HowToGuide
        isOpen={isHelpOpen}
        onOpenChange={setIsHelpOpen}
        showButton={false}
        displayMode="dialog"
      />
    </div>
  );
} 