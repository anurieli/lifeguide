'use client';

import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';

interface FeatureInteractionProps {
  featureId: string;
  initialLikes: number;
  initialUpvotes: number;
}

export default function FeatureInteraction({ 
  featureId, 
  initialLikes,
  initialUpvotes // keeping this to avoid changing function signature
}: FeatureInteractionProps) {
  const [likes, setLikes] = useState(initialLikes);
  const [hasLiked, setHasLiked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const supabase = createClient();

  // Load liked state from localStorage only
  useEffect(() => {
    function checkLocalLikedState() {
      try {
        // Check localStorage for likes
        const anonymousLikes = localStorage.getItem('anonymousLikes');
        if (anonymousLikes) {
          const likedFeatures = JSON.parse(anonymousLikes);
          setHasLiked(likedFeatures.includes(featureId));
        }
      } catch (error) {
        console.error('Error checking like state:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    checkLocalLikedState();
  }, [featureId]);
  
  const handleLike = async () => {
    try {
      // Get current likes from the database to ensure accuracy
      const { data: currentData, error: fetchError } = await supabase
        .from('coming_soon')
        .select('likes')
        .eq('id', featureId)
        .single();
        
      if (fetchError) {
        throw fetchError;
      }
      
      // Use database value as source of truth
      const currentLikes = currentData?.likes || initialLikes;
      
      if (hasLiked) {
        // Unlike - decrement the likes
        const newLikes = Math.max(0, currentLikes - 1); // Prevent negative likes
        
        // Update database
        const { error } = await supabase
          .from('coming_soon')
          .update({ likes: newLikes })
          .eq('id', featureId);
          
        if (error) throw error;
        
        // Update UI state
        setLikes(newLikes);
        setHasLiked(false);
        
        // Update localStorage
        const anonymousLikes = localStorage.getItem('anonymousLikes');
        if (anonymousLikes) {
          const likedFeatures = JSON.parse(anonymousLikes);
          localStorage.setItem('anonymousLikes', JSON.stringify(
            likedFeatures.filter((id: string) => id !== featureId)
          ));
        }
        
        toast.success('Like removed!');
      } else {
        // Like - increment the likes
        const newLikes = currentLikes + 1;
        
        // Update database
        const { error } = await supabase
          .from('coming_soon')
          .update({ likes: newLikes })
          .eq('id', featureId);
          
        if (error) throw error;
        
        // Update UI state
        setLikes(newLikes);
        setHasLiked(true);
        
        // Update localStorage
        const anonymousLikes = localStorage.getItem('anonymousLikes');
        const likedFeatures = anonymousLikes ? JSON.parse(anonymousLikes) : [];
        likedFeatures.push(featureId);
        localStorage.setItem('anonymousLikes', JSON.stringify(likedFeatures));
        
        toast.success('Feature liked!');
      }
    } catch (error) {
      console.error('Error updating like:', error);
      // Revert UI state on error
      setHasLiked(!hasLiked);
      
      // Provide more descriptive error message
      if (error instanceof Error) {
        toast.error(`Failed to update like: ${error.message}`);
      } else {
        toast.error("Failed to update like. Please try again.");
      }
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center gap-4 opacity-50">
        <div className="flex items-center gap-1.5">
          <Heart className="h-5 w-5 text-gray-400" />
          <span className="text-gray-400 text-sm">{initialLikes}</span>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex items-center gap-4">
      {/* Likes - available to all users */}
      <div className="flex items-center gap-1.5">
        <button 
          className={`transition-colors ${hasLiked ? 'text-pink-500' : 'text-gray-400 hover:text-pink-500'}`}
          aria-label={hasLiked ? "Unlike this feature" : "Like this feature"}
          onClick={handleLike}
        >
          <Heart className="h-5 w-5" fill={hasLiked ? "currentColor" : "none"} />
        </button>
        <span className="text-gray-400 text-sm">{likes}</span>
      </div>
    </div>
  );
} 