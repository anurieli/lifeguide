'use client';

import dynamic from 'next/dynamic';

// Import the carousel with SSR disabled to prevent hydration mismatches
const OverviewCarousel = dynamic(() => import('./OverviewCarousel'), {
  ssr: false,
  loading: () => (
    <div className="mx-auto w-full relative">
      <div className="overflow-hidden rounded-xl bg-gray-800/50 p-3 md:p-4 h-48 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Loading...</p>
      </div>
    </div>
  )
});

export default function ClientOverviewCarousel() {
  return <OverviewCarousel />;
} 