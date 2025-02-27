'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Heart, ArrowUp } from 'lucide-react';

// Metadata needs to be in a separate file for Next.js App Router
// See metadata.ts in this directory

interface FeatureCard {
  id: string;
  feature_title: string;
  feature_description: string;
  use_case: string;
  upvotes: number;
  likes: number;
  created_at: string;
  updated_at: string;
}

export default function ComingSoonPage() {
  const [featureCards, setFeatureCards] = useState<FeatureCard[]>([]);
  const [userUpvote, setUserUpvote] = useState<string | null>(null);
  const [userLikes, setUserLikes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');

  useEffect(() => {
    // Load user preferences from localStorage
    const storedUpvote = localStorage.getItem('userUpvote');
    const storedLikes = JSON.parse(localStorage.getItem('userLikes') || '[]');
    
    if (storedUpvote) setUserUpvote(storedUpvote);
    if (storedLikes) setUserLikes(storedLikes);
    
    // Fetch feature cards from Supabase
    const fetchFeatureCards = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('coming_soon')
        .select('*')
        .order('upvotes', { ascending: false });
      
      if (error) {
        console.error('Error fetching feature cards:', error);
      } else if (data) {
        setFeatureCards(data);
      }
      
      setLoading(false);
    };
    
    fetchFeatureCards();
  }, []);

  const handleUpvote = async (cardId: string) => {
    const supabase = createClient();
    
    // If user already upvoted this card, do nothing
    if (userUpvote === cardId) return;
    
    // Start a transaction to update the database
    // First, remove upvote from previously upvoted card if any
    if (userUpvote) {
      const { error: decrementError } = await supabase.rpc('decrement_upvotes', {
        feature_id: userUpvote
      });
      
      if (decrementError) {
        console.error('Error removing previous upvote:', decrementError);
        return;
      }
    }
    
    // Then, add upvote to the new card
    const { error: incrementError } = await supabase.rpc('increment_upvotes', {
      feature_id: cardId
    });
    
    if (incrementError) {
      console.error('Error adding upvote:', incrementError);
      return;
    }
    
    // Update local state
    setUserUpvote(cardId);
    localStorage.setItem('userUpvote', cardId);
    
    // Refresh the feature cards
    const { data } = await supabase
      .from('coming_soon')
      .select('*')
      .order('upvotes', { ascending: false });
    
    if (data) {
      setFeatureCards(data);
    }
  };

  const handleLike = async (cardId: string) => {
    const supabase = createClient();
    
    // Toggle like status
    const isLiked = userLikes.includes(cardId);
    let newUserLikes: string[];
    
    if (isLiked) {
      // Remove like
      const { error } = await supabase.rpc('decrement_likes', {
        feature_id: cardId
      });
      
      if (error) {
        console.error('Error removing like:', error);
        return;
      }
      
      newUserLikes = userLikes.filter(id => id !== cardId);
    } else {
      // Add like
      const { error } = await supabase.rpc('increment_likes', {
        feature_id: cardId
      });
      
      if (error) {
        console.error('Error adding like:', error);
        return;
      }
      
      newUserLikes = [...userLikes, cardId];
    }
    
    // Update local state
    setUserLikes(newUserLikes);
    localStorage.setItem('userLikes', JSON.stringify(newUserLikes));
    
    // Refresh the feature cards
    const { data } = await supabase
      .from('coming_soon')
      .select('*')
      .order('upvotes', { ascending: false });
    
    if (data) {
      setFeatureCards(data);
    }
  };

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    // Here you would typically send the email to your backend or email service
    alert(`Thank you for subscribing with ${email}! We'll notify you when new features launch.`);
    setEmail('');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-12 bg-gradient-to-b from-gray-900 to-black text-white">
      <div className="max-w-4xl w-full mx-auto">
        {/* Email Subscription Form at the top */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-white/10 rounded-xl p-6 mb-12 shadow-xl">
          <div className="text-center mb-4">
            <h2 className="text-xl font-semibold text-white">Stay Updated</h2>
            <p className="text-gray-300 text-sm mt-1">
              Be the first to know when we launch new features.
            </p>
          </div>
          <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-2">
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email" 
              className="flex-grow px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            <button 
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Notify Me
            </button>
          </form>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
            Coming Soon
          </h1>
          <p className="text-xl text-gray-300 mb-8">
            We're working on something exciting for you.
          </p>
          
          <div className="bg-gray-800/50 backdrop-blur-sm border border-white/10 rounded-xl p-6 mb-8 shadow-xl">
            <h2 className="text-2xl font-semibold mb-4">What to Expect</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
              <div className="flex items-start">
                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center mr-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-white">Enhanced Analytics</h3>
                  <p className="mt-1 text-gray-400">Track your progress with detailed insights and visualizations.</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-purple-500/20 flex items-center justify-center mr-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-400" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-white">Community Features</h3>
                  <p className="mt-1 text-gray-400">Connect with others on similar journeys and share experiences.</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center mr-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-white">Advanced Customization</h3>
                  <p className="mt-1 text-gray-400">Tailor your experience with personalized settings and preferences.</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-red-500/20 flex items-center justify-center mr-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5 3a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2H5zm0 2h10v7h-2l-1 2H8l-1-2H5V5z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-white">Notification System</h3>
                  <p className="mt-1 text-gray-400">Stay updated with timely reminders and progress alerts.</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Disclaimer Section */}
          <div className="bg-blue-900/30 backdrop-blur-sm border border-blue-500/20 rounded-xl p-6 mb-8 shadow-xl">
            <h2 className="text-2xl font-semibold mb-4 text-blue-300">Community-Driven Development</h2>
            <p className="text-gray-300 mb-4">
              LifeGuide is growing and evolving based on your feedback. We're committed to building features that truly help you become better.
            </p>
            <p className="text-gray-300 mb-4">
              Below you'll find features we're considering for development. You can influence what gets built next:
            </p>
            <ul className="list-disc list-inside text-gray-300 mb-4 space-y-1">
              <li><span className="text-blue-300 font-medium">Like</span> features you find interesting</li>
              <li><span className="text-blue-300 font-medium">Upvote</span> one feature you think should be prioritized (you get one upvote total)</li>
            </ul>
            <p className="text-gray-300">
              Your input directly shapes the future of LifeGuide. Help us build the platform you need!
            </p>
          </div>
        </div>
        
        {/* Feature Cards */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-6 text-center">Upcoming Features</h2>
          
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
              <p className="mt-4 text-gray-400">Loading features...</p>
            </div>
          ) : featureCards.length === 0 ? (
            <div className="text-center py-12 bg-gray-800/30 rounded-xl">
              <p className="text-gray-400">No upcoming features available yet. Check back soon!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featureCards.map((card) => (
                <div 
                  key={card.id} 
                  className="bg-gray-800/50 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden shadow-xl transition-transform hover:scale-[1.02]"
                >
                  {/* Card Header */}
                  <div className="bg-gradient-to-r from-blue-600/30 to-purple-600/30 p-4 border-b border-white/10">
                    <h3 className="text-lg font-bold text-white truncate">{card.feature_title}</h3>
                  </div>
                  
                  
                  {/* Card Description */}
                  <div className="p-4 border-b border-white/10">
                    <p className="text-gray-300 text-sm mb-3">{card.feature_description}</p>
                    <div className="bg-gray-700/30 rounded p-2 mt-2">
                      <p className="text-xs text-gray-400 italic">
                        <span className="font-medium text-gray-300">Use case:</span> {card.use_case}
                      </p>
                    </div>
                  </div>
                  
                  {/* Card Footer with Interactions */}
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {/* Like Button */}
                      <button 
                        onClick={() => handleLike(card.id)}
                        className="flex items-center space-x-1 group"
                      >
                        <Heart 
                          className={`h-5 w-5 ${userLikes.includes(card.id) ? 'text-red-500 fill-red-500' : 'text-gray-400 group-hover:text-red-400'}`} 
                        />
                        <span className="text-sm text-gray-400">{card.likes}</span>
                      </button>
                      
                      {/* Upvote Button */}
                      <button 
                        onClick={() => handleUpvote(card.id)}
                        className="flex items-center space-x-1 group"
                        disabled={userUpvote !== null && userUpvote !== card.id}
                      >
                        <ArrowUp 
                          className={`h-5 w-5 ${
                            userUpvote === card.id 
                              ? 'text-blue-500 fill-blue-500' 
                              : userUpvote !== null 
                                ? 'text-gray-600' 
                                : 'text-gray-400 group-hover:text-blue-400'
                          }`} 
                        />
                        <span className="text-sm text-gray-400">{card.upvotes}</span>
                      </button>
                    </div>
                    
                    {/* Status Badge */}
                    <div className="bg-blue-900/30 text-blue-300 text-xs px-2 py-1 rounded">
                      In Development
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
          <Link 
            href="/" 
            className="px-6 py-3 bg-white text-gray-900 rounded-lg font-medium hover:bg-gray-100 transition-colors"
          >
            Return Home
          </Link>
          <Link 
            href="/dashboard" 
            className="px-6 py-3 bg-transparent border border-white/30 text-white rounded-lg font-medium hover:bg-white/10 transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
} 