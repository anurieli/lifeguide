import { createClient } from '@/utils/supabase/server'
import EmailSubscriptionForm from '../../components/EmailSubscriptionForm';
import FeatureCardDialog from '../../components/FeatureCardDialog';
import FeatureInteraction from '@/components/FeatureInteraction';

interface FeatureCard {
  id: string;
  feature_title: string;
  feature_description: string;
  use_case: string;
  upvotes: number;
  likes: number;
}

export default async function ComingSoonPage() {
  const supabase = await createClient();
  
  // Set 10 second timeout for fetch
  const timeout = new Promise<never>((_, reject) => 
    setTimeout(() => reject(new Error('Feature cards fetch timeout')), 10000)
  );
  
  try {
    console.log('Fetching feature cards');
    
    // Create promise for fetching feature cards
    const featureCardsPromise = supabase
      .from('coming_soon')
      .select('*')
      .order('likes', { ascending: false });
    
    // Use Promise.race with timeout
    const featureCardsResponse = await Promise.race([
      featureCardsPromise,
      timeout
    ]);
    
    if (featureCardsResponse.error) {
      throw new Error(`Error fetching feature cards: ${featureCardsResponse.error.message}`);
    }
    
    const featureCards: FeatureCard[] = featureCardsResponse.data || [];
    
    console.log(`Feature cards fetched successfully: ${featureCards.length} cards`);
    
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white pt-16">
        <div className="max-w-6xl mx-auto px-4 pb-16 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">Coming Soon</h1>
            <p className="text-gray-300 text-lg max-w-2xl mx-auto">
              Here&apos;s a preview of features we&apos;re actively developing for LifeGuide.
              We&apos;d love to hear what excites you most!
            </p>
          </div>
          
          {/* Email Subscription Form */}
          <div className="max-w-3xl mx-auto bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 mb-12">
            <h2 className="text-xl font-semibold mb-3 text-blue-300">Subscribe for Updates</h2>
            <p className="text-gray-300 mb-4">
              Be the first to know when new features are released. Subscribe to our newsletter for exclusive updates.
            </p>
            <div className="mt-6">
              <EmailSubscriptionForm />
            </div>
          </div>
          
          <div className="max-w-3xl mx-auto bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 mb-12">
            <h2 className="text-xl font-semibold mb-3 text-blue-300">Help Shape the Future of LifeGuide</h2>
            <p className="text-gray-300 mb-4">
              LifeGuide is growing and evolving based on your feedback. We&apos;re committed to building features that truly enhance your journey toward personal growth and self-improvement.
            </p>
            <p className="text-gray-300 mb-4">
              Below are features we&apos;re considering for future updates. Show your support by:
            </p>
            <ul className="list-disc list-inside text-gray-300 mb-4 space-y-1">
              <li><span className="text-pink-400 font-medium">Liking</span> features you find interesting</li>
            </ul>
            <p className="text-gray-400 text-sm italic">
              Your feedback helps us prioritize new feature development!
            </p>
          </div>
          
          {featureCards.length === 0 ? (
            <div className="text-center">
              <h2 className="text-2xl font-semibold mb-4">No features available yet</h2>
              <p className="text-gray-400 max-w-md mx-auto">
                We&apos;re working on our feature roadmap. Check back soon to see what&apos;s coming next!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featureCards.map((feature) => (
                <div 
                  key={feature.id} 
                  className="flex flex-col bg-gradient-to-b from-gray-800 to-gray-900 border border-gray-700/50 rounded-xl overflow-hidden shadow-xl transform transition-all duration-300 hover:scale-[1.02] hover:shadow-blue-900/20 h-[400px]"
                >
                  {/* Card Header - Title (Like a baseball card top banner) */}
                  <div className="bg-gradient-to-r from-blue-900/80 to-purple-900/80 px-5 py-3 border-b border-gray-700/50">
                    <h2 className="text-lg font-bold text-white truncate">{feature.feature_title}</h2>
                  </div>
                  
                  {/* Card Body - Description (Middle section) */}
                  <div className="p-5 flex-1 overflow-hidden">
                    {/* Clickable area for opening dialog */}
                    <div 
                      className="cursor-pointer h-full"
                      id={`feature-card-clickable-${feature.id}`}
                    >
                      <div className="line-clamp-4 mb-3">
                        <p className="text-gray-300">{feature.feature_description}</p>
                      </div>
                      <div className="bg-gray-800/50 rounded-lg p-3">
                        <h3 className="text-sm font-medium text-blue-400 mb-1">Use Case:</h3>
                        <p className="text-gray-400 text-sm line-clamp-3">{feature.use_case}</p>
                      </div>
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
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <div className="mt-12 text-center">
            <p className="text-gray-400 text-sm">
              Anonymous users can like features.
            </p>
          </div>
        </div>
        
        {/* This is a client component to handle the clicked feature card dialog */}
        <FeatureCardDialog />
        
        {/* Script to add click handlers to card bodies to open dialogs */}
        <script dangerouslySetInnerHTML={{ __html: `
          document.addEventListener('DOMContentLoaded', () => {
            document.querySelectorAll('[id^="feature-card-clickable-"]').forEach(card => {
              card.addEventListener('click', () => {
                const featureId = card.id.replace('feature-card-clickable-', '');
                document.dispatchEvent(new CustomEvent('openFeatureDialog', { detail: { featureId } }));
              });
            });
          });
        `}} />
      </div>
    );
  } catch (error) {
    console.error('Error fetching feature cards:', error);
    
    // Return an error state
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white pt-16">
        <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text mb-8 text-center">
            Coming Soon Features
          </h1>
          <div className="bg-red-900/30 border border-red-800/50 rounded-xl p-8 text-center">
            <p className="text-xl text-red-300 mb-2">Error Loading Features</p>
            <p className="text-gray-300">We&apos;re having trouble loading the upcoming features. Please try again later.</p>
            <button 
              className="mt-4 px-4 py-2 bg-red-800/50 hover:bg-red-800/70 rounded-md transition-colors"
              onClick={() => window.location.reload()}
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }
} 