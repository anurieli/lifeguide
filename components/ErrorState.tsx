'use client';

export default function ErrorState() {
  return (
    <div className="bg-red-900/30 border border-red-800/50 rounded-xl p-8 text-center">
      <p className="text-xl text-red-300 mb-2">Error Loading Features</p>
      <p className="text-gray-300">We're having trouble loading the upcoming features. Please try again later.</p>
      <button 
        className="mt-4 px-4 py-2 bg-red-800/50 hover:bg-red-800/70 rounded-md transition-colors"
        onClick={() => window.location.reload()}
      >
        Try Again
      </button>
    </div>
  );
}