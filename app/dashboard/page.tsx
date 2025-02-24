'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface Blueprint {
  id: string;
  title: string;
  description: string;
  progress: number;
}

export default function DashboardPage() {
  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBlueprints = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('user_blueprints')
        .select('*')
        .order('created_at', { ascending: false });

      if (data) {
        setBlueprints(data);
      }
      setLoading(false);
    };

    fetchBlueprints();
  }, []);

  return (
    <div className="min-h-screen pt-24 px-4 md:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text">
            Your Dashboard
          </h1>
          <Link
            href="/guide"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            View Guide
          </Link>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/5 rounded-xl p-6 backdrop-blur-sm border border-white/10">
            <h3 className="text-lg font-medium text-white mb-2">Active Blueprints</h3>
            <p className="text-3xl font-bold text-blue-400">{blueprints.length}</p>
          </div>
          <div className="bg-white/5 rounded-xl p-6 backdrop-blur-sm border border-white/10">
            <h3 className="text-lg font-medium text-white mb-2">Average Progress</h3>
            <p className="text-3xl font-bold text-green-400">
              {blueprints.length > 0
                ? Math.round(
                    blueprints.reduce((acc, bp) => acc + bp.progress, 0) / blueprints.length
                  )
                : 0}%
            </p>
          </div>
          <div className="bg-white/5 rounded-xl p-6 backdrop-blur-sm border border-white/10">
            <h3 className="text-lg font-medium text-white mb-2">Last Updated</h3>
            <p className="text-gray-400">Today</p>
          </div>
        </div>

        {/* Blueprints */}
        <div className="bg-white/5 rounded-xl backdrop-blur-sm border border-white/10">
          <div className="p-6">
            <h2 className="text-2xl font-semibold text-white mb-6">Your Blueprints</h2>
            {loading ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-gray-400 mt-4">Loading your blueprints...</p>
              </div>
            ) : blueprints.length > 0 ? (
              <div className="space-y-4">
                {blueprints.map((blueprint) => (
                  <div
                    key={blueprint.id}
                    className="bg-gray-800/50 rounded-lg p-4 hover:bg-gray-800/70 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-white font-medium">{blueprint.title}</h3>
                        <p className="text-gray-400 mt-1">{blueprint.description}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm text-gray-400">Progress</p>
                          <p className="text-lg font-medium text-white">{blueprint.progress}%</p>
                        </div>
                        <div className="h-2 w-24 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${blueprint.progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-400">No blueprints found. Start by creating one!</p>
                <Link
                  href="/guide"
                  className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Blueprint
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mt-8 bg-white/5 rounded-xl backdrop-blur-sm border border-white/10">
          <div className="p-6">
            <h2 className="text-2xl font-semibold text-white mb-6">Recent Activity</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <p className="text-gray-400">You created a new blueprint</p>
                <p className="text-sm text-gray-500">2 hours ago</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <p className="text-gray-400">Updated progress on "Career Goals"</p>
                <p className="text-sm text-gray-500">Yesterday</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 