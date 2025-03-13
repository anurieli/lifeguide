'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { X, Heart } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface FeatureDetails {
  id: string;
  feature_title: string;
  feature_description: string;
  use_case: string;
  upvotes: number;
  likes: number;
  status?: 'Complete' | 'In Progress' | 'TBA';
}

// This dialog will be shown when a feature card is clicked
export default function FeatureCardDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [featureData, setFeatureData] = useState<FeatureDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const supabase = createClient();
  
  // Listen for a custom event emitted when a feature card is clicked
  const handleOpenDialog = useCallback(async (event: CustomEvent<{ featureId: string }>) => {
    const { featureId } = event.detail;
    console.log('Opening dialog for feature:', featureId);
    
    setIsOpen(true);
    
    try {
      // Fetch the feature data from Supabase
      console.log('Fetching feature data from Supabase...');
      const { data, error } = await supabase
        .from('coming_soon')
        .select('*')
        .eq('id', featureId)
        .single();
        
      if (error) {
        console.error('Error fetching feature data:', error);
        setError('Failed to load feature details. Please try again later.');
        return;
      }
      
      if (!data) {
        console.error('No data returned for feature ID:', featureId);
        setError('Feature not found.');
        return;
      }
      
      console.log('Feature data loaded:', data);
      setFeatureData(data);
    } catch (err) {
      console.error('Error in dialog:', err);
      setError('An unexpected error occurred. Please try again later.');
    }
  }, [supabase]);
  
  // Close the dialog
  const closeDialog = () => {
    console.log('Closing dialog');
    setIsOpen(false);
    
    // Add a small delay before resetting the data to allow for close animation
    setTimeout(() => {
      setFeatureData(null);
      setError(null);
    }, 300);
  };
  
  useEffect(() => {
    // Register the event listener with a more explicit type
    const handleCustomEvent = (e: Event) => {
      console.log('Received event:', e.type);
      if (e instanceof CustomEvent && e.detail && e.detail.featureId) {
        console.log('Received openFeatureDialog event:', e.detail);
        handleOpenDialog(e as CustomEvent<{ featureId: string }>);
      } else {
        console.error('Invalid event format:', e);
      }
    };
    
    console.log('Setting up openFeatureDialog event listener');
    window.addEventListener('openFeatureDialog', handleCustomEvent);
    
    // Clean up event listener on unmount
    return () => {
      console.log('Removing openFeatureDialog event listener');
      window.removeEventListener('openFeatureDialog', handleCustomEvent);
    };
  }, [handleOpenDialog]);
  
  // For debugging - log when component mounts
  useEffect(() => {
    console.log('FeatureCardDialog component mounted');
    return () => console.log('FeatureCardDialog component unmounted');
  }, []);
  
  // Debug when isOpen changes
  useEffect(() => {
    console.log('Dialog isOpen state changed to:', isOpen);
    if (isOpen) {
      console.log('Dialog should be visible now');
    }
  }, [isOpen]);
  
  // Debug when featureData changes
  useEffect(() => {
    console.log('featureData changed:', featureData);
  }, [featureData]);
  
  if (!isOpen) {
    return null;
  }
  
  console.log('Rendering dialog with isOpen:', isOpen);
  
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-black/75 backdrop-blur animate-in fade-in duration-300">
      <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="border-b border-gray-700 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-semibold text-white">
              {featureData?.feature_title || 'Feature Details'}
            </h3>
            {featureData?.status && (
              <span className={`text-xs px-2 py-1 rounded-full ${
                featureData.status === 'Complete' ? 'bg-green-500/20 text-green-400' : 
                featureData.status === 'In Progress' ? 'bg-blue-500/20 text-blue-400' : 
                'bg-gray-500/20 text-gray-400'
              }`}>
                {featureData.status}
              </span>
            )}
          </div>
          <button 
            onClick={closeDialog} 
            className="text-gray-400 hover:text-white"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {error ? (
            <div className="text-red-400">{error}</div>
          ) : !featureData ? (
            <div className="text-gray-400">Loading...</div>
          ) : (
            <div className="space-y-6">
              <div>
                <h4 className="text-blue-400 font-medium mb-2">Description</h4>
                <div className="prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown>{featureData.feature_description}</ReactMarkdown>
                </div>
              </div>
              
              <div className="bg-gray-800/50 rounded-lg p-4">
                <h4 className="text-blue-400 font-medium mb-2">Use Case</h4>
                <div className="prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown>{featureData.use_case}</ReactMarkdown>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        {featureData && (
          <div className="border-t border-gray-700 px-6 py-4 bg-gray-800/50 flex justify-between items-center">
            <div className="flex items-center gap-6">
              {/* Likes */}
              <div className="flex items-center gap-2">
                <button className="text-gray-400 hover:text-pink-500 transition-colors">
                  <Heart className="h-5 w-5" />
                </button>
                <span className="text-gray-300">{featureData.likes || 0} likes</span>
              </div>
            </div>
            
            <button 
              onClick={closeDialog}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors text-white"
            >
              Close
            </button>
          </div>
        )}
      </div>
      
      {/* Backdrop click to close */}
      <div 
        className="absolute inset-0 z-[-1]" 
        onClick={closeDialog}
        aria-hidden="true"
      />
    </div>
  );
} 