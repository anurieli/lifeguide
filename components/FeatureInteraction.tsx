'use client';

import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';

interface FeatureInteractionProps {
  featureId: string; // This remains a string in props, but we'll handle as UUID in database calls
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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const supabase = createClient();
  
  // Check auth state and previous interactions on mount
  useEffect(() => {
    async function checkAuthAndInteractions() {
      try {
        // Check authentication status
        const { data: { session } } = await supabase.auth.getSession();
        const isLoggedIn = !!session;
        setIsAuthenticated(isLoggedIn);
        
        // Check if user has liked this feature
        if (isLoggedIn) {
          const userId = session.user.id;
          
          // Get user's interaction record
          const { data: interactionData, error: interactionError } = await supabase
            .from('user_feature_interactions')
            .select('has_liked')
            .eq('user_id', userId)
            .eq('feature_id', featureId)
            .single();
          
          if (interactionError && interactionError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
            console.error('Error fetching user interaction:', interactionError);
          }
          
          // Set liked state
          if (interactionData) {
            setHasLiked(interactionData.has_liked || false);
          }
        } else {
          // Check localStorage for anonymous likes
          const anonymousLikes = localStorage.getItem('anonymousLikes');
          if (anonymousLikes) {
            const likedFeatures = JSON.parse(anonymousLikes);
            setHasLiked(likedFeatures.includes(featureId));
          }
        }
      } catch (error) {
        console.error('Error checking auth state:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    checkAuthAndInteractions();
  }, [featureId, supabase]);
  
  const handleLike = async () => {
    try {
      // Check if authenticated
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // Handle authenticated user like
        const userId = session.user.id;
        
        if (hasLiked) {
          // Unlike
          const newLikes = likes - 1;
          setLikes(newLikes);
          
          // Call RPC to decrement likes
          const { error } = await supabase.rpc('decrement_feature_likes', {
            feature_id: featureId
          });
          
          if (error) throw error;
          
          // Update user interaction record
          await supabase
            .from('user_feature_interactions')
            .upsert({
              user_id: userId,
              feature_id: featureId,
              has_liked: false,
              updated_at: new Date().toISOString()
            }, { onConflict: 'user_id,feature_id' });
          
          setHasLiked(false);
        } else {
          // Like
          const newLikes = likes + 1;
          setLikes(newLikes);
          
          // Call RPC to increment likes
          const { error } = await supabase.rpc('increment_feature_likes', {
            feature_id: featureId
          });
          
          if (error) throw error;
          
          // Update user interaction record
          await supabase
            .from('user_feature_interactions')
            .upsert({
              user_id: userId,
              feature_id: featureId,
              has_liked: true,
              updated_at: new Date().toISOString()
            }, { onConflict: 'user_id,feature_id' });
          
          setHasLiked(true);
        }
      } else {
        // Handle anonymous user like
        if (hasLiked) {
          // Unlike
          const newLikes = likes - 1;
          setLikes(newLikes);
          
          // Call RPC to decrement likes
          const { error } = await supabase.rpc('decrement_feature_likes', {
            feature_id: featureId
          });
          
          if (error) throw error;
          
          // Update localStorage
          const anonymousLikes = localStorage.getItem('anonymousLikes');
          if (anonymousLikes) {
            const likedFeatures = JSON.parse(anonymousLikes);
            localStorage.setItem('anonymousLikes', JSON.stringify(
              likedFeatures.filter((id: string) => id !== featureId)
            ));
          }
          
          setHasLiked(false);
        } else {
          // Like
          const newLikes = likes + 1;
          setLikes(newLikes);
          
          // Call RPC to increment likes
          const { error } = await supabase.rpc('increment_feature_likes', {
            feature_id: featureId
          });
          
          if (error) throw error;
          
          // Update localStorage
          const anonymousLikes = localStorage.getItem('anonymousLikes');
          let likedFeatures = anonymousLikes ? JSON.parse(anonymousLikes) : [];
          likedFeatures.push(featureId);
          localStorage.setItem('anonymousLikes', JSON.stringify(likedFeatures));
          
          setHasLiked(true);
        }
      }
    } catch (error) {
      console.error('Error updating like:', error);
      // Revert UI state on error
      setLikes(initialLikes);
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