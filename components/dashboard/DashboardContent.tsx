'use client';

import { useDashboard } from '@/context/DashboardContext';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Section, UserProgress } from '@/types/blueprint';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export function DashboardContent() {
  const { user, isMobile } = useDashboard();
  const [sections, setSections] = useState<Section[]>([]);
  const [completedSections, setCompletedSections] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string>('');
  
  useEffect(() => {
    if (user) {
      fetchDashboardData();
      // Extract first name from user metadata
      const fullName = user.user_metadata?.name || '';
      const firstName = fullName ? fullName.split(' ')[0] : user.email?.split('@')[0] || '';
      setUserName(firstName);
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      
      // Fetch sections
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('guide_sections')
        .select('*')
        .order('order_position', { ascending: true });
      
      if (sectionsError) throw sectionsError;
      
      // Fetch user progress to determine completed sections
      const { data: progressData, error: progressError } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', user?.id)
        .eq('completed', true);
      
      if (progressError) throw progressError;
      
      setSections(sectionsData || []);
      
      // Calculate unique completed sections
      if (progressData) {
        const subsectionsBySection = new Map<string, Set<string>>();
        const completedSubsectionIds = new Set<string>();
        
        progressData.forEach((progress: UserProgress) => {
          completedSubsectionIds.add(progress.subsection_id);
        });
        
        // Count completed sections
        const { data: subsectionsData } = await supabase
          .from('guide_subsections')
          .select('*');
          
        if (subsectionsData) {
          // Group subsections by section
          subsectionsData.forEach(subsection => {
            if (!subsectionsBySection.has(subsection.section_id)) {
              subsectionsBySection.set(subsection.section_id, new Set());
            }
            subsectionsBySection.get(subsection.section_id)?.add(subsection.id);
          });
          
          // Count fully completed sections
          let completedCount = 0;
          subsectionsBySection.forEach((subsectionIds, sectionId) => {
            const allSubsectionsCompleted = Array.from(subsectionIds).every(id => 
              completedSubsectionIds.has(id)
            );
            if (allSubsectionsCompleted && subsectionIds.size > 0) {
              completedCount++;
            }
          });
          
          setCompletedSections(completedCount);
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className={isMobile ? "" : ""}>
        <h1 className="text-2xl md:text-3xl font-bold text-white">Welcome back{userName ? <span className="bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text">, {userName}</span> : ''}</h1>
        <p className="text-muted-foreground">Here&apos;s your personal Life Blueprint dashboard.</p>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {/* Blueprint Panel */}
        <div className={`p-5 bg-card rounded-lg border ${isMobile ? "" : "col-span-2"}`}>
          <h2 className="text-xl font-semibold mb-4">Your Blueprint</h2>
          {loading ? (
            <div className="animate-pulse flex space-x-4">
              <div className="flex-1 space-y-4 py-1">
                <div className="h-4 bg-gray-200/20 rounded w-3/4"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200/20 rounded"></div>
                  <div className="h-4 bg-gray-200/20 rounded w-5/6"></div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className={`flex ${isMobile ? "flex-col space-y-2" : "items-center justify-between"}`}>
                <p className="text-muted-foreground">
                  {completedSections} of {sections.length} sections completed
                </p>
                <div className={`bg-gray-800 rounded-full h-2 ${isMobile ? "w-full" : "w-48"}`}>
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full" 
                    style={{ width: `${sections.length ? (completedSections / sections.length) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="flex flex-col gap-2">
                <Link 
                  href="/dashboard/blueprint"
                  className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                >
                  View full blueprint <ChevronRight className="h-4 w-4" />
                </Link>
                <Link 
                  href="/dashboard/editor"
                  className="text-purple-400 hover:text-purple-300 flex items-center gap-1"
                >
                  Continue editing <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Quick Insights */}
        <div className="p-5 bg-card rounded-lg border">
          <h2 className="text-xl font-semibold mb-4">Quick Insights</h2>
          <p className="text-muted-foreground">Your journey insights will appear here as you build your blueprint.</p>
        </div>
      </div>
    </div>
  );
} 