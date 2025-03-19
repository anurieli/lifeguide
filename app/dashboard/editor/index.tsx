'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit, HelpCircle, ChevronRight, Bookmark, ChevronDown, ChevronUp, Info, Lock, Check, Trash2, Lightbulb, ChevronLeft, RotateCcw, Eye } from 'lucide-react';
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
import FirstTimeEditorWindow from '@/components/FirstTimeEditorWindow';
import RichTextInput from "@/components/RichTextInput";
import ReactMarkdown from 'react-markdown';
import ProgressBar from "@/app/components/ProgressBar";
import FocusMode from '@/components/FocusMode';
import { ArrowUp, ArrowDown } from 'lucide-react';
import SectionIndicator from '@/components/SectionIndicator';
import CongratsPopup from '@/components/CongratulationsPopup';

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
  content: string;
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

interface CommittedResponse {
  subsectionId: string;
  isCommitted: boolean;
}

interface ProTip {
  id: string;
  title: string;
  description: string;
}

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

const TOOLTIP_CLASSES = {
  content: "bg-gray-900/95 backdrop-blur-sm border border-gray-800 text-white p-3 rounded-lg shadow-xl",
  arrow: "border-gray-800"
};

export default function EditorMode({ onClose }: { onClose: () => void }) {
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
    const [isFocusMode, setIsFocusMode] = useState(true);
    const [showProgressInFocusMode, setShowProgressInFocusMode] = useState(false);
    const [currentRegularSubsectionId, setCurrentRegularSubsectionId] = useState<string>('');
    const [currentRegularSubsectionIndex, setCurrentRegularSubsectionIndex] = useState(0);
    const [isFirstTimeUser, setIsFirstTimeUser] = useState(false);
    const [hasAgreedToRules, setHasAgreedToRules] = useState(false);
    const [showCongratsPopup, setShowCongratsPopup] = useState(false);
    const [allSectionsJustCompleted, setAllSectionsJustCompleted] = useState(false);
    
    // Current version of the editor rules
    const EDITOR_RULES_VERSION = "1.1";
  
    // Function to check if rules need to be shown again
    const checkRulesAgreement = () => {
      const agreedToRulesVersion = localStorage.getItem('agreedToEditorRulesVersion');
      
      // If no version or different version, show rules
      if (!agreedToRulesVersion || agreedToRulesVersion !== EDITOR_RULES_VERSION) {
        setIsFirstTimeUser(true);
        return false;
      }
      
      // User has agreed to current version
      setHasAgreedToRules(true);
      return true;
    };
  
    useEffect(() => {
      // Check if user has agreed to the current version of the editor rules
      checkRulesAgreement();
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
      const timestamp = new Date().toISOString();
      console.log(`[EDITOR ${timestamp}] Starting to fetch blueprint data...`);
      setLoading(true);
      setError(null);
      
      try {
        console.log(`[EDITOR ${timestamp}] Creating Supabase client...`);
        const supabase = createClient();
  
        // Get session
        console.log(`[EDITOR ${timestamp}] Getting session...`);
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.error(`[EDITOR ${timestamp}] Session error:`, sessionError);
          console.error(`[EDITOR ${timestamp}] Session error details:`, {
            message: sessionError.message,
            status: sessionError.status || 'unknown'
          });
          setError('Authentication error');
          setLoading(false);
          return;
        }
        if (!session) {
          console.error(`[EDITOR ${timestamp}] No active session found`);
          setError('No active session');
          setLoading(false);
          return;
        }
  
        const userId = session.user.id;
        console.log(`[EDITOR ${timestamp}] Active session found, user ID:`, userId);
        console.log(`[EDITOR ${timestamp}] Session expires:`, session.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'unknown');
        
        console.log(`[EDITOR ${timestamp}] Fetching blueprint data for user ${userId}...`);
        
        // Wrap each query in a try/catch to get better error reporting
        let sectionsResponse, subsectionsResponse, userResponsesResponse, userProgressResponse;
        
        try {
          console.log(`[EDITOR ${timestamp}] Fetching guide sections...`);
          sectionsResponse = await supabase.from('guide_sections').select('*').order('order_position');
          if (sectionsResponse.error) {
            console.error(`[EDITOR ${timestamp}] Error fetching sections:`, sectionsResponse.error);
            throw sectionsResponse.error;
          }
          console.log(`[EDITOR ${timestamp}] Sections fetched:`, sectionsResponse.data.length);
        } catch (err) {
          console.error(`[EDITOR ${timestamp}] Exception fetching sections:`, err);
          throw err;
        }
        
        try {
          console.log(`[EDITOR ${timestamp}] Fetching guide subsections...`);
          subsectionsResponse = await supabase.from('guide_subsections').select('*').order('order_position');
          if (subsectionsResponse.error) {
            console.error(`[EDITOR ${timestamp}] Error fetching subsections:`, subsectionsResponse.error);
            throw subsectionsResponse.error;
          }
          console.log(`[EDITOR ${timestamp}] Subsections fetched:`, subsectionsResponse.data.length);
        } catch (err) {
          console.error(`[EDITOR ${timestamp}] Exception fetching subsections:`, err);
          throw err;
        }
        
        try {
          console.log(`[EDITOR ${timestamp}] Fetching user responses...`);
          userResponsesResponse = await supabase.from('user_responses').select('*').eq('user_id', userId);
          if (userResponsesResponse.error) {
            console.error(`[EDITOR ${timestamp}] Error fetching user responses:`, userResponsesResponse.error);
            throw userResponsesResponse.error;
          }
          console.log(`[EDITOR ${timestamp}] User responses fetched:`, userResponsesResponse.data.length);
        } catch (err) {
          console.error(`[EDITOR ${timestamp}] Exception fetching user responses:`, err);
          throw err;
        }
        
        try {
          console.log(`[EDITOR ${timestamp}] Fetching user progress...`);
          userProgressResponse = await supabase.from('user_progress').select('*').eq('user_id', userId);
          if (userProgressResponse.error) {
            console.error(`[EDITOR ${timestamp}] Error fetching user progress:`, userProgressResponse.error);
            throw userProgressResponse.error;
          }
          console.log(`[EDITOR ${timestamp}] User progress fetched:`, userProgressResponse.data.length);
        } catch (err) {
          console.error(`[EDITOR ${timestamp}] Exception fetching user progress:`, err);
          throw err;
        }
  
        console.log(`[EDITOR ${timestamp}] Setting state with fetched data...`);
        setSections(sectionsResponse.data);
        setSubsections(subsectionsResponse.data);
        
        // Set user responses
        const responses: Record<string, string> = {};
        userResponsesResponse.data.forEach((response: UserResponse) => {
          responses[response.subsection_id] = response.content;
        });
        console.log(`[EDITOR ${timestamp}] Processed ${Object.keys(responses).length} user responses`);
        setUserResponses(responses);
  
        // Set committed responses and bookmarks
        const committed: CommittedResponse[] = userProgressResponse.data
          .filter((progress: UserProgress) => progress.completed)
          .map((progress: UserProgress) => ({
            subsectionId: progress.subsection_id,
            isCommitted: true
          }));
        console.log(`[EDITOR ${timestamp}] Processed ${committed.length} committed responses`);
        setCommittedResponses(committed);
  
        // Set bookmarks from flagged items
        const bookmarked = new Set<string>(
          userProgressResponse.data
            .filter((progress: UserProgress) => progress.flagged)
            .map((progress: UserProgress) => progress.subsection_id)
        );
        console.log(`[EDITOR ${timestamp}] Processed ${bookmarked.size} bookmarked subsections`);
        setBookmarkedSubsections(bookmarked);
        
        console.log(`[EDITOR ${timestamp}] Data fetch completed successfully`);
      } catch (error) {
        console.error('Error fetching blueprint data:', error);
        setError('Failed to load blueprint data');
      } finally {
        console.log(`[EDITOR ${timestamp}] Setting loading state to false`);
        setLoading(false);
      }
    };
  
    // Add back the saveUserProgress function with enhanced logging
    const saveUserProgress = async (subsectionId: string, completed: boolean) => {
      const timestamp = new Date().toISOString();
      console.log(`[PROGRESS ${timestamp}] Attempting to save progress for subsection: ${subsectionId.substring(0, 8)}...`);
      try {
        console.log(`[PROGRESS ${timestamp}] Creating Supabase client...`);
        const supabase = createClient();
        
        // First verify we have an active session
        console.log(`[PROGRESS ${timestamp}] Verifying active session...`);
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.error(`[PROGRESS ${timestamp}] Session error:`, sessionError);
          console.error(`[PROGRESS ${timestamp}] Session error details:`, {
            message: sessionError.message,
            status: sessionError.status || 'unknown'
          });
          return;
        }
        if (!session) {
          console.error(`[PROGRESS ${timestamp}] No active session found`);
          return;
        }
        
        const userId = session.user.id;
        console.log(`[PROGRESS ${timestamp}] Active session found for user: ${userId}`);
        console.log(`[PROGRESS ${timestamp}] Session expires: ${session.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'unknown'}`);
        console.log(`[PROGRESS ${timestamp}] Saving progress for user: ${userId}, subsection: ${subsectionId.substring(0, 8)}, completed: ${completed}`);
  
        try {
          // First check if a record exists
          console.log(`[PROGRESS ${timestamp}] Checking for existing progress...`);
          const { data: existingProgress, error: fetchError } = await supabase
            .from('user_progress')
            .select('*')
            .eq('user_id', userId)
            .eq('subsection_id', subsectionId)
            .maybeSingle();  // Use maybeSingle instead of single to avoid 406
  
          if (fetchError) {
            console.error(`[PROGRESS ${timestamp}] Error checking existing progress:`, fetchError);
            console.error(`[PROGRESS ${timestamp}] Error details:`, {
              message: fetchError.message,
              code: fetchError.code,
              details: fetchError.details
            });
            throw fetchError;
          }
  
          console.log(`[PROGRESS ${timestamp}] Existing progress:`, existingProgress ? `Found with ID ${existingProgress.id}` : 'None found');
  
          if (existingProgress) {
            // Update existing record
            console.log(`[PROGRESS ${timestamp}] Updating existing progress with ID: ${existingProgress.id}`);
            const { error: updateError } = await supabase
              .from('user_progress')
              .update({
                completed: completed,
                updated_at: new Date().toISOString()
              })
              .eq('id', existingProgress.id)
              .select();  // Add select() to ensure proper response format
  
            if (updateError) {
              console.error(`[PROGRESS ${timestamp}] Error updating progress:`, updateError);
              console.error(`[PROGRESS ${timestamp}] Error details:`, {
                message: updateError.message,
                code: updateError.code,
                details: updateError.details
              });
              throw updateError;
            }
            console.log(`[PROGRESS ${timestamp}] Progress updated successfully`);
          } else {
            // Insert new record
            console.log(`[PROGRESS ${timestamp}] Creating new progress for user: ${userId}, subsection: ${subsectionId.substring(0, 8)}`);
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
              console.error(`[PROGRESS ${timestamp}] Error inserting progress:`, insertError);
              console.error(`[PROGRESS ${timestamp}] Error details:`, {
                message: insertError.message,
                code: insertError.code,
                details: insertError.details
              });
              throw insertError;
            }
            console.log(`[PROGRESS ${timestamp}] New progress created successfully`);
          }
        } catch (dbError) {
          console.error(`[PROGRESS ${timestamp}] Database operation error:`, dbError);
          if (dbError instanceof Error) {
            console.error(`[PROGRESS ${timestamp}] Error details:`, {
              message: dbError.message,
              stack: dbError.stack
            });
          }
          throw dbError;
        }
  
        console.log(`[PROGRESS ${timestamp}] Successfully saved progress`);
      } catch (error) {
        console.error(`[PROGRESS ${timestamp}] Error saving progress:`, error);
        if (error instanceof Error) {
          console.error(`[PROGRESS ${timestamp}] Error details:`, {
            message: error.message,
            stack: error.stack
          });
        }
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
        
        // Check if this was the last remaining subsection to complete the blueprint
        setCommittedResponses(newCommittedResponses);
        const wasComplete = checkCompletionStatus();
        
        // If the blueprint is now complete after this commit, show the popup
        if (wasComplete) {
          // Check sessionStorage instead of localStorage so it resets when the browser session ends
          const userId = await getUserId();
          if (userId) {
            const key = `blueprint_congrats_shown_${userId}`;
            const hasShownBefore = sessionStorage.getItem(key);
            
            if (!hasShownBefore) {
              setAllSectionsJustCompleted(true);
              setShowCongratsPopup(true);
              sessionStorage.setItem(key, Date.now().toString());
            }
          }
        }
      } else {
        await saveUserProgress(subsectionId, false);
        setCommittedResponses(newCommittedResponses);
      }
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
  
    const isSubsectionCommitted = (subsectionId: string): boolean => {
      return committedResponses.some(response => response.subsectionId === subsectionId && response.isCommitted);
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
  
    // Add the saveUserResponse function with enhanced logging
    const saveUserResponse = async (subsectionId: string, content: string) => {
      const timestamp = new Date().toISOString();
      console.log(`[EDITOR ${timestamp}] Attempting to save response for subsection: ${subsectionId.substring(0, 8)}...`);
      try {
        console.log(`[EDITOR ${timestamp}] Creating Supabase client...`);
        const supabase = createClient();
        
        // First verify we have an active session
        console.log(`[EDITOR ${timestamp}] Verifying active session...`);
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.error(`[EDITOR ${timestamp}] Session error:`, sessionError);
          console.error(`[EDITOR ${timestamp}] Session error details:`, {
            message: sessionError.message,
            status: sessionError.status || 'unknown'
          });
          return;
        }
        if (!session) {
          console.error(`[EDITOR ${timestamp}] No active session found`);
          return;
        }
        
        const userId = session.user.id;
        console.log(`[EDITOR ${timestamp}] Active session found for user: ${userId}`);
        console.log(`[EDITOR ${timestamp}] Session expires: ${session.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'unknown'}`);
        
        // First, check if a response exists
        console.log(`[EDITOR ${timestamp}] Checking for existing response...`);
        try {
          const { data: existingResponses, error: fetchError } = await supabase
            .from('user_responses')
            .select('id')
            .eq('user_id', userId)
            .eq('subsection_id', subsectionId);
  
          if (fetchError) {
            console.error(`[EDITOR ${timestamp}] Error fetching existing response:`, fetchError);
            throw fetchError;
          }
  
          const existingResponse = existingResponses?.[0];
          console.log(`[EDITOR ${timestamp}] Existing response:`, existingResponse ? `Found with ID ${existingResponse.id}` : 'None found');
  
          if (existingResponse) {
            console.log(`[EDITOR ${timestamp}] Updating existing response with ID: ${existingResponse.id}`);
            const { error: updateError } = await supabase
              .from('user_responses')
              .update({
                content: content,
                updated_at: new Date().toISOString()
              })
              .eq('id', existingResponse.id);
              
            if (updateError) {
              console.error(`[EDITOR ${timestamp}] Error updating response:`, updateError);
              console.error(`[EDITOR ${timestamp}] Error details:`, {
                message: updateError.message,
                code: updateError.code,
                details: updateError.details
              });
              throw updateError;
            }
            console.log(`[EDITOR ${timestamp}] Response updated successfully`);
          } else {
            console.log(`[EDITOR ${timestamp}] Creating new response for user: ${userId}, subsection: ${subsectionId.substring(0, 8)}`);
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
              console.error(`[EDITOR ${timestamp}] Error inserting response:`, insertError);
              console.error(`[EDITOR ${timestamp}] Error details:`, {
                message: insertError.message,
                code: insertError.code,
                details: insertError.details
              });
              throw insertError;
            }
            console.log(`[EDITOR ${timestamp}] New response created successfully`);
          }
        } catch (dbError) {
          console.error(`[EDITOR ${timestamp}] Database operation error:`, dbError);
          if (dbError instanceof Error) {
            console.error(`[EDITOR ${timestamp}] Error details:`, {
              message: dbError.message,
              stack: dbError.stack
            });
          }
          throw dbError;
        }
        
        console.log(`[EDITOR ${timestamp}] Successfully saved response`);
      } catch (error) {
        console.error(`[EDITOR ${timestamp}] Error saving response:`, error);
        if (error instanceof Error) {
          console.error(`[EDITOR ${timestamp}] Error details:`, {
            message: error.message,
            stack: error.stack
          });
        }
      }
    };
  
    const updateCurrentSubsection = () => {
      if (!isFocusMode) {
        // Get all subsection elements
        const subsectionElements = Object.entries(subsectionRefs.current);
        if (subsectionElements.length === 0) return;
        
        // Find the one most in view
        let mostVisibleSubsection = { id: '', visibility: 0 };
        
        subsectionElements.forEach(([id, element]) => {
          if (!element) return;
          
          const rect = element.getBoundingClientRect();
          const windowHeight = window.innerHeight;
          
          // Calculate how much of the element is visible
          const visibleTop = Math.max(0, rect.top);
          const visibleBottom = Math.min(windowHeight, rect.bottom);
          const visibleHeight = Math.max(0, visibleBottom - visibleTop);
          const visibility = visibleHeight / rect.height;
          
          if (visibility > mostVisibleSubsection.visibility) {
            mostVisibleSubsection = { id, visibility };
          }
        });
        
        if (mostVisibleSubsection.id && mostVisibleSubsection.id !== currentRegularSubsectionId) {
          setCurrentRegularSubsectionId(mostVisibleSubsection.id);
          
          // Find the index of this subsection in the flattened list
          const allSubsections = sections.flatMap(section => 
            subsections
              .filter(sub => sub.section_id === section.id)
              .sort((a, b) => a.order_position - b.order_position)
          );
          
          const index = allSubsections.findIndex(sub => sub.id === mostVisibleSubsection.id);
          if (index !== -1) {
            setCurrentRegularSubsectionIndex(index);
          }
        }
      }
    };
  
    useEffect(() => {
      if (!isFocusMode) {
        const handleScroll = () => {
          updateCurrentSubsection();
        };
        
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
      }
    }, [isFocusMode, currentRegularSubsectionId]);
  
    // Function to force showing the rules again (for testing or manual triggering)
    const forceShowRules = () => {
      setIsFirstTimeUser(true);
      setHasAgreedToRules(false);
    };
  
    const handleFirstTimeComplete = () => {
      setIsFirstTimeUser(false);
      setHasAgreedToRules(true);
      
      // Store agreement details
      const timestamp = new Date().toISOString();
      localStorage.setItem('hasSeenEditor', 'true');
      localStorage.setItem('agreedToEditorRules', 'true');
      localStorage.setItem('agreedToEditorRulesVersion', EDITOR_RULES_VERSION);
      localStorage.setItem('agreedToEditorRulesTimestamp', timestamp);
      
      // Log for debugging
      console.log(`User agreed to editor rules v${EDITOR_RULES_VERSION} at ${timestamp}`);
    };
  
    // Check if all sections have 100% progress
    const checkCompletionStatus = () => {
      // Only run if we have sections loaded
      if (sections.length === 0) return false;
      
      const allSectionsComplete = sections.every(section => {
        const sectionSubsections = subsections.filter(sub => sub.section_id === section.id);
        // Only consider sections that have subsections
        if (sectionSubsections.length === 0) return true;
        
        // Check if all subsections in this section are committed
        const completedSubsections = sectionSubsections.filter(sub => isSubsectionCommitted(sub.id));
        const progress = (completedSubsections.length / sectionSubsections.length) * 100;
        
        // Section is complete when progress is 100%
        return progress >= 99.99;
      });
      
      return allSectionsComplete;
    };
  
    // Add helper function to get user ID
    const getUserId = async (): Promise<string | null> => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      return session?.user?.id || null;
    };
  
    // Add handler for closing the popup
    const handleCloseCongratsPopup = () => {
      setShowCongratsPopup(false);
      
      // If the user just completed all sections, navigate them away from the editor
      if (allSectionsJustCompleted) {
        setAllSectionsJustCompleted(false);
        onClose(); // Navigate back to dashboard
      }
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
        {isFirstTimeUser && (
          <FirstTimeEditorWindow onComplete={handleFirstTimeComplete} />
        )}
        <div className="h-full flex flex-col">
          {/* Editor Header - Fixed at the top */}
          <div className={cn(
            "border-b border-white/10 bg-gray-900/90 backdrop-blur-sm sticky top-0 z-10 p-4",
            isFocusMode && "bg-gray-950/95"
          )}>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text">
                  Blueprint Editor {isFocusMode && <span className="text-sm font-normal text-yellow-400 ml-2">(Focus Mode)</span>}
                </h1>
                {/* Custom Guide Instructions button that controls the dialog state */}
                <button
                  onClick={() => {
                    setIsHelpOpen(!isHelpOpen);
                  }}
                  className="px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors text-sm flex items-center gap-1.5 w-auto max-[800px]:w-9 max-[800px]:px-0 max-[800px]:justify-center"
                >
                  <HelpCircle className="h-4 w-4" />
                  <span className="max-[800px]:hidden">Guide Instructions</span>
                </button>
                {!isFocusMode && (
                  <>
                    <button
                      onClick={() => setExpandedProTips(!expandedProTips)}
                      className="px-3 py-1.5 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors text-sm flex items-center gap-1.5 w-auto max-[800px]:w-9 max-[800px]:px-0 max-[800px]:justify-center"
                    >
                      <Lightbulb className="h-4 w-4" />
                      <span className="max-[800px]:hidden">Tips</span>
                    </button>
                  </>
                )}
                <button
                  onClick={() => setIsFocusMode(!isFocusMode)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg transition-colors text-sm flex items-center gap-1.5 w-auto max-[800px]:w-9 max-[800px]:px-0 max-[800px]:justify-center",
                    isFocusMode 
                      ? "bg-gradient-to-r from-yellow-400 to-amber-500 text-gray-900 font-medium shadow-lg hover:shadow-xl" 
                      : "bg-gradient-to-r from-yellow-400/20 to-amber-500/20 text-yellow-400 hover:from-yellow-400/30 hover:to-amber-500/30"
                  )}
                >
                  <Eye className="h-4 w-4" />
                  <span className="max-[800px]:hidden">{isFocusMode ? "Exit Focus" : "Focus Mode"}</span>
                </button>
              </div>
              <div className="flex items-center gap-4">
                {!isFocusMode && (
                  <button
                    onClick={() => setIsRestartDialogOpen(true)}
                    className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors text-sm flex items-center gap-1.5 w-auto max-[800px]:w-9 max-[800px]:px-0 max-[800px]:justify-center"
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span className="max-[800px]:hidden">Restart</span>
                  </button>
                )}
                
                
                <button
                  onClick={handleClose}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>

            {/* Pro Tips Gallery - Expands underneath the header */}
            {!isFocusMode && (
              <AnimatePresence>
                {expandedProTips && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4"
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
            )}
          </div>

          {/* Main Content Area - Flexible layout with sidebar */}
          <div className="flex flex-1 overflow-hidden">
            {/* Main Editor Content - Takes remaining space */}
            <div className={cn(
              "flex-1 overflow-auto transition-all duration-300",
              isFocusMode ? "bg-gray-950" : ""
            )}>
              {isFocusMode ? (
                <FocusMode
                  sections={sections}
                  subsections={subsections}
                  userResponses={userResponses}
                  bookmarkedSubsections={bookmarkedSubsections}
                  committedResponses={committedResponses}
                  expandedExamples={expandedExamples}
                  onToggleExample={toggleExample}
                  onToggleBookmark={toggleBookmark}
                  onToggleCommit={toggleCommit}
                  onResponseChange={(subsectionId, content) => {
                    setUserResponses(prev => ({
                      ...prev,
                      [subsectionId]: content
                    }));
                    const timeoutId = setTimeout(() => {
                      saveUserResponse(subsectionId, content);
                    }, 500);
                    return () => clearTimeout(timeoutId);
                  }}
                  isSubsectionCommitted={isSubsectionCommitted}
                  canCommitSubsection={canCommitSubsection}
                  canEditSection={canEditSection}
                  TOOLTIP_CLASSES={TOOLTIP_CLASSES}
                  clearBookmarks={clearBookmarks}
                  onExitFocusMode={() => setIsFocusMode(false)}
                  onToggleProgress={() => setShowProgressInFocusMode(!showProgressInFocusMode)}
                />
              ) : (
                <div className="space-y-8 max-w-5xl mx-auto p-6">
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
                              <ReactMarkdown components={{
                                p: ({node, ...props}) => <p className="text-gray-400 mt-1" {...props} />
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
                                      {subsection.subdescription && (
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
                                      )}
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
                                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                                        subsection.malleability_level === 'green' ? 'bg-green-500/20 text-green-400' :
                                        subsection.malleability_level === 'yellow' ? 'bg-yellow-500/20 text-yellow-400' :
                                        'bg-red-500/20 text-red-400'
                                      }`}>
                                        {subsection.malleability_level === 'green' ? 'flexible' :
                                         subsection.malleability_level === 'yellow' ? 'stiff' :
                                         'static'}
                                      </span>
                                      {subsection.malleability_details && (
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger>
                                              <HelpCircle className="h-3 w-3 text-gray-400" />
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
                                      )}
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
                                            : "Start typing here ... "
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
              )}
            </div>

            {/* Progress Sidebar - Show in regular mode or when explicitly toggled in focus mode */}
            {(!isFocusMode || (isFocusMode && showProgressInFocusMode)) && (
              <div className="relative border-l border-white/10 transition-all duration-300 h-full flex">
                <ProgressBar 
                  sections={sections}
                  subsections={subsections}
                  isSubsectionCommitted={isSubsectionCommitted}
                  bookmarkedSubsections={bookmarkedSubsections}
                  clearBookmarks={clearBookmarks}
                  scrollToSubsection={scrollToSubsection}
                />
              </div>
            )}
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

        {/* Direct implementation of guide dialog */}
        {isHelpOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center"
            onClick={() => setIsHelpOpen(false)}
          >
            <div 
              className="bg-gray-900 border border-gray-700 rounded-lg shadow-2xl w-[90vw] max-w-2xl max-h-[90vh] overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-700">
                <h2 className="text-xl font-semibold text-white">Guide Instructions</h2>
                <button 
                  onClick={() => setIsHelpOpen(false)}
                  className="p-1 text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <div className="p-6">
                <div className="prose prose-invert max-w-none">
                  <ReactMarkdown components={{
                    ol: ({node, ...props}) => <ol className="list-decimal pl-6 space-y-2" {...props} />,
                    ul: ({node, ...props}) => <ul className="list-disc pl-6 space-y-2" {...props} />,
                    li: ({node, ...props}) => <li className="text-white" {...props} />,
                    h1: ({node, ...props}) => <h1 className="text-2xl font-bold mb-4" {...props} />,
                    p: ({node, ...props}) => <p className="mb-4" {...props} />,
                    strong: ({node, ...props}) => <strong className="font-bold text-white" {...props} />,
                    em: ({node, ...props}) => <em className="italic text-gray-300" {...props} />
                  }}>
                    {`# Welcome to Your Guide

1. **Build this in order.** First Persona Building (defining who you are)… then goal setting (where most people fail)… etc.

2. **Finish this in a week or less,** and for the best results in the same day. Complete section by section in order. When you return to do the next session, start from the very first section by re-reading all your previous completions, and making any changes you feel necessary.

3. **If you're stuck on a section** and aren't capable of providing a genuine response, then stop. Remember, the next time you get back to the document, start from the top, as these things build on each other.

4. **Until completion, read every day** (morning and night) no matter, and once completed, continue doing so for 5 days straight. Engage with it as much as possible when first starting.

5. **This can change,** its dynamic (the goals portion should be less dynamic). Read this every day if you can, morning and night. The more you become one with it the better you can get it to be exactly what you need to succeed (you can cut out fluff, hone in on what really matters as you slowly remove things that don't feed your purpose). (Rules for changing below)

6. **Malleability Level:** How often can I alter my answer?  
   - 🟢 *Flexible, dynamic, designed to be changed and altered as fast as you change.* Hell, it's even advised that you engage with these sections as often as possible.  
   - 🟡 *Don't rush to change.* These sections are subject to change, as we are not robots, but don't make it a habit to alter these sections once set in stone. Before submitting these sections, review them and question them before moving onto the next section.  
   - 🔴 *This should be a constant,* as it's much harder to run towards a moving goal. Each section's description will define its own rules for alteration. Before submitting these sections, review them before moving onto the next section, and be sure to get back to them once more before submitting the entire sheet.

   *Hover over a flag for more details.*

7. **Before submitting,** go over the whole thing again (I know it's tedious), but as we work on this sheet, our brains are becoming increasingly accustomed to this introspectiveness. Leverage the state you will be in to thoroughly review your sheet, remembering that there are certain sections that are temporarily "permanent" (as per #6).

8. **No one is reading this,** so speak the fucking truth.`}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          </div>
        )}

        {showCongratsPopup && (
          <CongratsPopup isOpen={showCongratsPopup} onClose={handleCloseCongratsPopup} />
        )}
      </div>
    );
  } 