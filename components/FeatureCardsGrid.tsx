'use client';

import FeatureCard from './FeatureCard';
import { useMemo } from 'react';

interface Feature {
  id: string;
  feature_title: string;
  feature_description: string;
  use_case: string;
  upvotes: number;
  likes: number;
  status?: 'Complete' | 'In Progress' | 'TBA';
}

interface FeatureCardsGridProps {
  features: Feature[];
}

export default function FeatureCardsGrid({ features }: FeatureCardsGridProps) {
  // Group features by status
  const groupedFeatures = useMemo(() => {
    // Define status priority (for display order)
    const statusOrder = ['In Progress', 'TBA', 'Complete'];
    
    // Group features by status
    const groups: Record<string, Feature[]> = {};
    
    // Initialize groups with empty arrays
    statusOrder.forEach(status => {
      groups[status] = [];
    });
    
    // Add features to their respective groups
    features.forEach(feature => {
      const status = feature.status || 'TBA';
      if (!groups[status]) {
        groups[status] = [];
      }
      groups[status].push(feature);
    });
    
    // Sort features within each group by likes (descending)
    Object.keys(groups).forEach(status => {
      groups[status].sort((a, b) => b.likes - a.likes);
    });
    
    return { groups, statusOrder };
  }, [features]);

  if (features.length === 0) {
    return (
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-4">No features available yet</h2>
        <p className="text-gray-400 max-w-md mx-auto">
          We're working on our feature roadmap. Check back soon to see what's coming next!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {groupedFeatures.statusOrder.map(status => {
        const featuresInGroup = groupedFeatures.groups[status];
        
        // Skip empty groups
        if (featuresInGroup.length === 0) {
          return null;
        }
        
        return (
          <div key={status} className="space-y-6">
            {/* Section header */}
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold">
                <span className={
                  status === 'Complete' ? 'text-green-400' : 
                  status === 'In Progress' ? 'text-blue-400' : 
                  'text-gray-400'
                }>
                  {status}
                </span>
              </h2>
              <div className="flex-1 h-px bg-gradient-to-r from-gray-700 to-transparent"></div>
              <span className="text-gray-400 text-sm">{featuresInGroup.length} feature{featuresInGroup.length !== 1 ? 's' : ''}</span>
            </div>
            
            {/* Feature cards grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuresInGroup.map(feature => (
                <FeatureCard key={feature.id} feature={feature} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
} 