'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, AlertCircle } from 'lucide-react';

export default function EmailSubscriptionForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset states
    setError(null);
    setSuccess(false);
    setLoading(true);
    
    // Simple validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }
    
    try {
      // In a real implementation, you would save this to your database
      const supabase = createClient();
      
      // Example: saving to a 'newsletter_subscribers' table 
      // You'd need to create this table in your Supabase database
      const { error: saveError } = await supabase
        .from('newsletter_subscribers')
        .upsert(
          { email, subscribed_at: new Date().toISOString() },
          { onConflict: 'email' }
        );
      
      if (saveError) throw saveError;
      
      // Show success and clear the form
      setSuccess(true);
      setEmail('');
      
      // Reset success message after 5 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 5000);
    } catch (err) {
      console.error('Subscription error:', err);
      setError('Failed to subscribe. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <form onSubmit={handleSubscribe} className="w-full max-w-md mx-auto">
      <div className="relative">
        <div className="flex gap-2">
          <Input
            type="email"
            placeholder="Your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 bg-gray-800/70 border-gray-700 text-white placeholder:text-gray-500 focus-visible:ring-blue-500"
            disabled={loading}
            aria-label="Email address for newsletter"
            required
          />
          <Button 
            type="submit" 
            disabled={loading || success}
            className={`${success ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 border-2 border-current border-r-transparent rounded-full inline-block animate-spin" />
                <span>Subscribing...</span>
              </span>
            ) : success ? (
              <span className="flex items-center gap-2">
                <Check className="h-4 w-4" />
                <span>Subscribed!</span>
              </span>
            ) : (
              'Subscribe'
            )}
          </Button>
        </div>
        
        {error && (
          <div className="absolute -bottom-7 left-0 text-red-400 text-sm flex items-center gap-1">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </form>
  );
} 