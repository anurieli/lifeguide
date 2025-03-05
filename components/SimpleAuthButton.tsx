'use client';

import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useEffect, useState, useTransition } from 'react';
import { signOutAction } from '@/utils/supabase/actions';

export default function SimpleAuthButton() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
      setLoading(false);
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase.auth]);

  const handleSignOut = async () => {
    startTransition(() => {
      signOutAction();
    });
  };

  if (loading) {
    return (
      <Button 
        disabled
        className="bg-gradient-to-r from-blue-600/50 to-purple-600/50 text-white border-none px-5 sm:px-6 py-2.5 sm:py-3 h-auto rounded-lg"
      >
        Loading...
      </Button>
    );
  }

  if (user) {
    return (
      <div className="flex items-center gap-4">
        <p className="text-sm text-white font-medium">
          Welcome, <span className="bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text">{user.user_metadata?.display_name || user.email?.split('@')[0] || 'User'}</span>
        </p>
        <Button 
          onClick={handleSignOut} 
          disabled={isPending}
          variant="outline"
          className="text-white border-white/20 hover:bg-white/10 hover:text-white hover:border-white/40 transition-all"
        >
          {isPending ? 'Signing out...' : 'Sign out'}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button 
        onClick={() => router.push('/auth/login')}
        variant="outline"
        className="text-white border-white/20 hover:bg-white/10 hover:text-white hover:border-white/40 transition-all"
      >
        Sign in
      </Button>
      <Button 
        onClick={() => router.push('/auth/signup')}
        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-none px-5 sm:px-6 py-2.5 sm:py-3 h-auto rounded-lg"
      >
        Sign up
      </Button>
    </div>
  );
} 