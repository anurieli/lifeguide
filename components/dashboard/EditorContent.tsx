'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit, HelpCircle, ChevronRight, Bookmark, ChevronDown, ChevronUp, Info, Lock, Check, Trash2, Lightbulb, ChevronLeft, RotateCcw } from 'lucide-react';
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
import ReactMarkdown from 'react-markdown';
import { useDashboard } from '@/context/DashboardContext';

// Import interfaces from a shared types file
import { 
  Section, 
  Subsection, 
  UserResponse, 
  UserProgress,
  CommittedResponse,
  ProTip
} from '@/types/blueprint';

// Pro tips that could be moved to database later
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

export default function EditorContent({ onClose }: { onClose: () => void }) {
  const { user } = useDashboard();
  const [sections, setSections] = useState<Section[]>([]);
  const [subsections, setSubsections] = useState<Subsection[]>([]);
  const [userResponses, setUserResponses] = useState<Record<string, string>>({});
  const [committedResponses, setCommittedResponses] = useState<CommittedResponse[]>([]);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [expandedExamples, setExpandedExamples] = useState<Set<string>>(new Set());
  const [expandedSectionDetails, setExpandedSectionDetails] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Additional state variables from original editor
  const [userProgress, setUserProgress] = useState<UserProgress[]>([]);
  const [bookmarkedSubsections, setBookmarkedSubsections] = useState<Set<string>>(new Set());
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [showEmptyFieldsWarning, setShowEmptyFieldsWarning] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [commitSectionId, setCommitSectionId] = useState<string | null>(null);
  const [showCommitDialog, setShowCommitDialog] = useState(false);

  // Load data on component mount
  useEffect(() => {
    if (user) {
      fetchBlueprintData();
    }
  }, [user]);

  // Fetch blueprint data from the database
  const fetchBlueprintData = async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      
      // Fetch sections using guide_sections
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('guide_sections')
        .select('*')
        .order('order_position', { ascending: true });
      
      if (sectionsError) throw sectionsError;
      
      // Fetch subsections using guide_subsections
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
        .eq('user_id', user?.id);
      
      if (progressError) throw progressError;
      
      // Process the data
      setSections(sectionsData || []);
      setSubsections(subsectionsData || []);
      
      // Create responses map
      const responsesMap: Record<string, string> = {};
      responsesData?.forEach((response: UserResponse) => {
        responsesMap[response.subsection_id] = response.content;
      });
      setUserResponses(responsesMap);
      
      // Set user progress
      setUserProgress(progressData || []);
      
      // Set bookmarked subsections
      const bookmarked = new Set<string>();
      progressData?.forEach((progress: UserProgress) => {
        if (progress.flagged) {
          bookmarked.add(progress.subsection_id);
        }
      });
      setBookmarkedSubsections(bookmarked);
      
      // Initialize with first section expanded if no section is yet expanded
      if (sectionsData && sectionsData.length > 0 && !expandedSection) {
        setExpandedSection(sectionsData[0].id);
      }
      
      // Set committed responses
      const committedResponsesList: CommittedResponse[] = [];
      progressData?.forEach((progress: UserProgress) => {
        if (progress.completed) {
          committedResponsesList.push({
            subsectionId: progress.subsection_id,
            isCommitted: true
          });
        }
      });
      setCommittedResponses(committedResponsesList);
      
    } catch (error) {
      console.error('Error fetching blueprint data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Your existing editor functions would go here
  // For brevity, I'm providing only essential function shells
  // that would be filled with the logic from app/dashboard/editor/index.tsx

  const saveUserResponse = async (subsectionId: string, content: string) => {
    // Implementation
  };

  const saveUserProgress = async (subsectionId: string, completed: boolean) => {
    // Implementation
  };

  const toggleBookmark = async (subsectionId: string) => {
    // Implementation
  };

  const clearBookmarks = async () => {
    // Implementation
  };

  const toggleCommit = async (subsectionId: string) => {
    // Implementation
  };

  const toggleExample = (subsectionId: string) => {
    // Implementation
  };

  const scrollToSubsection = (subsectionId: string) => {
    // Implementation
  };

  const isSubsectionCommitted = (subsectionId: string) => {
    // Implementation
    return false;
  };

  const canCommitSubsection = (subsectionId: string) => {
    // Implementation
    return true;
  };

  const isSectionComplete = (sectionId: string) => {
    // Implementation
    return false;
  };

  const canEditSection = (sectionId: string) => {
    // Implementation
    return true;
  };

  const clearSection = (sectionId: string) => {
    // Implementation
  };

  const restartBlueprint = async () => {
    // Implementation
  };

  const getSectionStatus = (sectionId: string) => {
    // Implementation
    return { 
      isComplete: false, 
      canEdit: true, 
      canCommit: false 
    };
  };

  const canCommitSection = (sectionId: string) => {
    // Implementation
    return false;
  };

  const commitSection = (sectionId: string) => {
    // Implementation
  };

  const toggleSectionDetails = (sectionId: string) => {
    // Implementation
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-900 text-white">
      {/* Editor header */}
      <div className="flex items-center justify-between bg-gray-800/50 backdrop-blur-sm border-b border-white/10 p-4 sticky top-0 z-10">
        <h1 className="text-xl font-bold">Blueprint Editor</h1>
        <div className="flex gap-2">
          <button 
            onClick={() => setIsHelpOpen(true)}
            className="p-2 text-gray-400 hover:text-white bg-gray-800/60 rounded-lg"
            aria-label="Help"
          >
            <HelpCircle size={18} />
          </button>
          <button 
            onClick={onClose}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>

      {/* Main editor content */}
      <div className="flex-1 p-4">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            <p className="ml-3 text-lg text-gray-400">Loading your blueprint...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Sections would be rendered here */}
            <p>Your editor content will be rendered here.</p>
          </div>
        )}
      </div>

      {/* Help dialog */}
      <HowToGuide
        isOpen={isHelpOpen}
        onOpenChange={setIsHelpOpen}
        showButton={false}
        displayMode="dialog"
      />
    </div>
  );
} 