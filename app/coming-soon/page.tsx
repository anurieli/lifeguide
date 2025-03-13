import { createClient } from '@/utils/supabase/server'
import EmailSubscriptionForm from '../../components/EmailSubscriptionForm';
import FeatureCardsGrid from '../../components/FeatureCardsGrid';

interface FeatureCard {
  id: string;
  feature_title: string;
  feature_description: string;
  use_case: string;
  upvotes: number;
  likes: number;
  status: 'Complete' | 'In Progress' | 'TBA';
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
      .order('upvotes', { ascending: false });
    
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
              {/* <li><span className="text-blue-400 font-medium">Upvoting</span> the ONE feature you want to see developed next</li> */}
            </ul>
            <p className="text-gray-400 text-sm italic">
              Note: You can only cast one upvote across all features, so choose wisely!
            </p>
          </div>
        
          {/* Use the client component for feature cards */}
          <FeatureCardsGrid features={featureCards} />
          
          <div className="mt-12 text-center">
            <p className="text-gray-400 text-sm">
              Anonymous users can like features.
            </p>
          </div>
        </div>
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
            <p className="text-gray-300">We're having trouble loading the upcoming features. Please try again later.</p>
            {/* Note: This button won't work in a Server Component, users will need to manually refresh */}
            <p className="mt-4 text-gray-400 text-sm">Please refresh the page to try again.</p>
          </div>
        </div>
      </div>
    );
  }
}