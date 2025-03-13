'use client';

import { createClient } from '@/utils/supabase/client';
import FeatureInteraction from './FeatureInteraction';
import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface FeatureCardProps {
  feature: {
    id: string;
    feature_title: string;
    feature_description: string;
    use_case: string;
    upvotes: number;
    likes: number;
    status?: 'Complete' | 'In Progress' | 'TBA';
  };
}

export default function FeatureCard({ feature }: FeatureCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div 
      className={`flex flex-col bg-gradient-to-b from-gray-800 to-gray-900 border border-gray-700/50 rounded-xl overflow-hidden shadow-xl transform transition-all duration-300 hover:shadow-blue-900/20 ${
        isExpanded ? 'scale-[1.03] z-10 shadow-lg' : 'hover:scale-[1.02]'
      }`}
      style={{ 
        height: isExpanded ? 'auto' : '400px',
        minHeight: '400px',
        position: 'relative'
      }}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {/* Card Header - Title (Like a baseball card top banner) */}
      <div className="bg-gradient-to-r from-blue-900/80 to-purple-900/80 px-5 py-3 border-b border-gray-700/50 flex justify-between items-center">
        <h2 className="text-lg font-bold text-white truncate">{feature.feature_title}</h2>
        {/* Status Badge */}
        <span className={`text-xs px-2 py-1 rounded-full ${
          feature.status === 'Complete' ? 'bg-green-500/20 text-green-400' : 
          feature.status === 'In Progress' ? 'bg-blue-500/20 text-blue-400' : 
          'bg-gray-500/20 text-gray-400'
        }`}>
          {feature.status || 'TBA'}
        </span>
      </div>
      
      {/* Card Body - Description (Middle section) */}
      <div className="p-5 flex-1 overflow-hidden">
        <div className="h-full">
          <div className={isExpanded ? '' : 'line-clamp-4'}>
            <p className="text-gray-300">{feature.feature_description}</p>
          </div>
          
          <div className={`bg-gray-800/50 rounded-lg p-3 mt-3 ${isExpanded ? '' : 'line-clamp-3'}`}>
            <h3 className="text-sm font-medium text-blue-400 mb-1">Use Case:</h3>
            <p className="text-gray-400 text-sm">{feature.use_case}</p>
          </div>
          
          {/* Expanded content - only visible when expanded */}
          {isExpanded && (
            <div className="mt-4 pt-4 border-t border-gray-700/30">
              <h3 className="text-sm font-medium text-blue-400 mb-2">Additional Details:</h3>
              <ul className="text-gray-400 text-sm space-y-2">
                <li className="flex items-center gap-2">
                  <span className="text-blue-400">•</span>
                  <span>Status: <span className={
                    feature.status === 'Complete' ? 'text-green-400' : 
                    feature.status === 'In Progress' ? 'text-blue-400' : 
                    'text-gray-400'
                  }>{feature.status || 'TBA'}</span></span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-blue-400">•</span>
                  <span>Likes: {feature.likes}</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-blue-400">•</span>
                  <span>Upvotes: {feature.upvotes}</span>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
      
      {/* Card Footer - Stats and Actions (Always visible at bottom) */}
      <div className="px-5 py-3 bg-gray-800/70 border-t border-gray-700/50 mt-auto">
        <div className="flex justify-between items-center">
          <FeatureInteraction 
            featureId={feature.id} 
            initialLikes={feature.likes || 0} 
            initialUpvotes={feature.upvotes || 0} 
          />
          
          {/* Expand/collapse indicator */}
          <div className="text-gray-400 text-xs flex items-center gap-1">
            {isExpanded ? (
              <>
                <span>Less</span>
                <ChevronUp className="h-3 w-3" />
              </>
            ) : (
              <>
                <span>More</span>
                <ChevronDown className="h-3 w-3" />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 