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
import { useAuth } from '@/utils/AuthProvider';
import { AlertCircle } from 'lucide-react';
import EditorMode from './editor';

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

export default function DashboardPage() {
  const { user, loading, error } = useAuth();
  const [mode, setMode] = useState<DashboardMode>({ type: 'view' });
  const [isNewUserDialogOpen, setIsNewUserDialogOpen] = useState(false);
  const [selectedPage, setSelectedPage] = useState<'home' | 'actionables' | 'settings'>('home');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  // Add logging for debugging
  useEffect(() => {
    console.log('[DashboardPage] Auth state:', { 
      user: user ? `User: ${user.email}` : 'No user', 
      loading, 
      error: error || 'None' 
    });
    
    // If we have auth cookies but no user, try to refresh the page once
    if (!user && !loading && typeof window !== 'undefined') {
      const projectId = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^\.]+)\./)?.[1];
      const hasCookies = document.cookie.includes(`sb-${projectId}-auth-token`);
      
      console.log(`[DashboardPage] Auth cookies present: ${hasCookies}, projectId: ${projectId}`);
      
      if (hasCookies) {
        console.log('[DashboardPage] Auth cookies present but no user, refreshing session...');
        const supabase = createClient();
        supabase.auth.refreshSession().then(({ data, error }) => {
          console.log('[DashboardPage] Session refresh result:', 
                      data.session ? 'Session refreshed' : 'No session', 
                      'Error:', error ? error.message : 'None');
          
          if (data.session) {
            window.location.reload();
          }
        });
      }
    }
  }, [user, loading, error]);

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

  // If still loading, show a loading state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading your dashboard...</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  // If there's an error or no user (should not happen due to middleware, but as a fallback)
  if (error || !user) {
    // Check if we have auth cookies but no user object
    const projectId = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^\.]+)\./)?.[1];
    const hasCookies = typeof window !== 'undefined' && 
                      (document.cookie.includes(`sb-${projectId}-auth-token.0`) || 
                       document.cookie.includes(`sb-${projectId}-auth-token.1`));
    
    // If we have cookies but no user, try to force a session refresh
    if (hasCookies && typeof window !== 'undefined') {
      const supabase = createClient();
      
      // Try to refresh the session one more time
      supabase.auth.refreshSession().then(({ data, error: refreshError }) => {
        if (data.session) {
          console.log('[DashboardPage] Session refreshed successfully, reloading page');
          window.location.reload();
        } else {
          console.error('[DashboardPage] Failed to refresh session:', refreshError);
        }
      });
    }
    
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900">
        <div className="text-center max-w-md p-6 bg-gray-800 rounded-lg shadow-lg">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
          <h2 className="mt-4 text-xl font-bold text-white">Authentication Error</h2>
          <p className="mt-2 text-gray-400">
            {error || "You need to be signed in to access this page."}
          </p>
          <div className="mt-4 flex flex-col gap-2">
            <Link href="/auth/login" className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              Go to Login
            </Link>
            <button 
              onClick={() => window.location.reload()} 
              className="inline-block px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Refresh Page
            </button>
            <div className="mt-2 p-2 bg-gray-700 rounded text-xs text-left text-gray-300">
              <p>Debug info:</p>
              <p>User: {user ? `Found (${user.email})` : 'Not found'}</p>
              <p>Has Auth Cookies: {hasCookies ? 'Yes' : 'No'}</p>
              <p>Error: {error || 'None'}</p>
              <p>Cookies: {typeof window !== 'undefined' ? document.cookie : 'N/A'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
      const timestamp = new Date().toISOString();
      console.log(`[DASHBOARD ${timestamp}] Starting to fetch viewer data...`);
      setLoading(true);
      setError(null);

      try {
        console.log(`[DASHBOARD ${timestamp}] Creating Supabase client...`);
        const supabase = createClient();
        
        console.log(`[DASHBOARD ${timestamp}] Getting session...`);
        let { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error(`[DASHBOARD ${timestamp}] Session error:`, sessionError);
          console.error(`[DASHBOARD ${timestamp}] Session error details:`, {
            message: sessionError.message,
            status: sessionError.status || 'unknown'
          });
          throw sessionError;
        }
        
        // If no session, try to refresh it
        if (!session) {
          console.warn(`[DASHBOARD ${timestamp}] No active session found, attempting refresh`);
          
          // Check if we have auth cookies that might indicate a broken session
          const hasSBCookies = typeof document !== 'undefined' && document.cookie.includes('sb-');
          console.log(`[DASHBOARD ${timestamp}] Auth cookies present without session: ${hasSBCookies}`);
          
          if (hasSBCookies) {
            console.log(`[DASHBOARD ${timestamp}] Attempting session refresh...`);
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
            
            if (refreshError) {
              console.error(`[DASHBOARD ${timestamp}] Session refresh failed:`, refreshError);
            } else if (refreshData.session) {
              console.log(`[DASHBOARD ${timestamp}] Session refreshed successfully`);
              session = refreshData.session;
            } else {
              console.error(`[DASHBOARD ${timestamp}] Session refresh returned no session or error`);
            }
          }
        }
        
        if (!session) {
          console.error(`[DASHBOARD ${timestamp}] No active session found after refresh attempt`);
          
          // Check if there's a mock_user cookie that might be causing issues
          const hasMockUser = typeof document !== 'undefined' && document.cookie.includes('mock_user');
          if (hasMockUser) {
            console.warn(`[DASHBOARD ${timestamp}] Found mock_user cookie that may be causing issues`);
            document.cookie = 'mock_user=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
            console.log(`[DASHBOARD ${timestamp}] Cleared mock_user cookie, reloading page`);
            window.location.reload();
            return;
          }
          
          setError('Your session has expired. Please sign in again.');
          setLoading(false);
          
          // Redirect to login after a short delay
          setTimeout(() => {
            window.location.href = '/login?expired=true';
          }, 2000);
          
          return;
        }

        console.log(`[DASHBOARD ${timestamp}] Active session found, user ID:`, session.user.id);
        console.log(`[DASHBOARD ${timestamp}] Session expires:`, session.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'unknown');
        
        const userId = session.user.id;
        
        console.log(`[DASHBOARD ${timestamp}] Fetching blueprint data for user ${userId}...`);
        
        // Wrap each query in a try/catch to get better error reporting
        let sectionsResponse, subsectionsResponse, userResponsesResponse, userProgressResponse;
        
        try {
          console.log(`[DASHBOARD ${timestamp}] Fetching guide sections...`);
          sectionsResponse = await supabase.from('guide_sections').select('*').order('order_position');
          if (sectionsResponse.error) {
            console.error(`[DASHBOARD ${timestamp}] Error fetching sections:`, sectionsResponse.error);
            throw sectionsResponse.error;
          }
          console.log(`[DASHBOARD ${timestamp}] Sections fetched:`, sectionsResponse.data.length);
        } catch (err) {
          console.error(`[DASHBOARD ${timestamp}] Exception fetching sections:`, err);
          throw err;
        }
        
        try {
          console.log(`[DASHBOARD ${timestamp}] Fetching guide subsections...`);
          subsectionsResponse = await supabase.from('guide_subsections').select('*').order('order_position');
          if (subsectionsResponse.error) {
            console.error(`[DASHBOARD ${timestamp}] Error fetching subsections:`, subsectionsResponse.error);
            throw subsectionsResponse.error;
          }
          console.log(`[DASHBOARD ${timestamp}] Subsections fetched:`, subsectionsResponse.data.length);
        } catch (err) {
          console.error(`[DASHBOARD ${timestamp}] Exception fetching subsections:`, err);
          throw err;
        }
        
        try {
          console.log(`[DASHBOARD ${timestamp}] Fetching user responses...`);
          userResponsesResponse = await supabase.from('user_responses').select('*').eq('user_id', userId);
          if (userResponsesResponse.error) {
            console.error(`[DASHBOARD ${timestamp}] Error fetching user responses:`, userResponsesResponse.error);
            throw userResponsesResponse.error;
          }
          console.log(`[DASHBOARD ${timestamp}] User responses fetched:`, userResponsesResponse.data.length);
        } catch (err) {
          console.error(`[DASHBOARD ${timestamp}] Exception fetching user responses:`, err);
          throw err;
        }
        
        try {
          console.log(`[DASHBOARD ${timestamp}] Fetching user progress...`);
          userProgressResponse = await supabase.from('user_progress').select('*').eq('user_id', userId).eq('completed', true);
          if (userProgressResponse.error) {
            console.error(`[DASHBOARD ${timestamp}] Error fetching user progress:`, userProgressResponse.error);
            throw userProgressResponse.error;
          }
          console.log(`[DASHBOARD ${timestamp}] User progress fetched:`, userProgressResponse.data.length);
        } catch (err) {
          console.error(`[DASHBOARD ${timestamp}] Exception fetching user progress:`, err);
          throw err;
        }

        console.log(`[DASHBOARD ${timestamp}] Setting state with fetched data...`);
        setSections(sectionsResponse.data);
        setSubsections(subsectionsResponse.data);

        // Process user responses
        const responses: Record<string, string> = {};
        userResponsesResponse.data.forEach((response: UserResponse) => {
          responses[response.subsection_id] = response.content;
        });
        console.log(`[DASHBOARD ${timestamp}] Processed ${Object.keys(responses).length} user responses`);
        setUserResponses(responses);

        // Process committed responses
        const committed = new Set<string>();
        userProgressResponse.data.forEach((progress: UserProgress) => {
          committed.add(progress.subsection_id);
        });
        console.log(`[DASHBOARD ${timestamp}] Processed ${committed.size} committed responses`);
        setCommittedResponses(committed);

        // Set isSectionComplete
        const sectionComplete: Record<string, boolean> = {};
        sectionsResponse.data.forEach((section: Section) => {
          const sectionSubsections = subsectionsResponse.data.filter((sub: Subsection) => sub.section_id === section.id);
          sectionComplete[section.id] = sectionSubsections.every((sub: Subsection) => committed.has(sub.id));
        });
        setIsSectionComplete(sectionComplete);
        console.log(`[DASHBOARD ${timestamp}] Section completion calculated`);
        
        console.log(`[DASHBOARD ${timestamp}] Data fetch completed successfully`);
      } catch (error) {
        console.error(`[DASHBOARD ${timestamp}] Error fetching viewer data:`, error);
        if (error instanceof Error) {
          console.error(`[DASHBOARD ${timestamp}] Error details:`, {
            message: error.message,
            stack: error.stack
          });
        }
        setError('Failed to load blueprint data');
      } finally {
        console.log(`[DASHBOARD ${timestamp}] Setting loading state to false`);
        setLoading(false);
      }
    };

    fetchViewerData();
  }, []);

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

