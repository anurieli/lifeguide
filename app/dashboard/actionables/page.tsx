'use client';

import Link from 'next/link';
import { CheckSquare, ArrowLeft, Clock, ListTodo, Calendar, Bell, Target } from 'lucide-react';

export default function ActionablesPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="border-b border-white/10 pb-4 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckSquare className="h-6 w-6 text-green-400" />
            <h1 className="text-2xl font-bold text-white">Actionables</h1>
          </div>
          <Link 
            href="/dashboard" 
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>

      {/* Coming Soon Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 text-center">
        <div className="bg-gradient-to-r from-green-600/20 to-blue-600/20 p-8 rounded-xl border border-white/10 max-w-2xl w-full backdrop-blur-sm">
          <Clock className="h-16 w-16 text-green-400 mx-auto mb-6" />
          
          <h2 className="text-3xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-blue-400">
            Actionables Coming Soon
          </h2>
          
          <p className="text-gray-300 mb-8 max-w-md mx-auto">
            We&apos;re developing a powerful task management system to help you turn your blueprint into concrete actions.
            Track your progress, set deadlines, and achieve your goals step by step.
          </p>
          
          <div className="grid gap-6 md:grid-cols-2 mb-8">
            <div className="bg-gray-800/50 p-4 rounded-lg border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <ListTodo className="h-5 w-5 text-green-400" />
                <h3 className="font-medium text-white">Task Management</h3>
              </div>
              <p className="text-sm text-gray-400">Create, organize, and prioritize tasks derived from your blueprint</p>
            </div>
            <div className="bg-gray-800/50 p-4 rounded-lg border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-5 w-5 text-green-400" />
                <h3 className="font-medium text-white">Scheduling</h3>
              </div>
              <p className="text-sm text-gray-400">Set deadlines, create recurring tasks, and manage your calendar</p>
            </div>
            <div className="bg-gray-800/50 p-4 rounded-lg border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <Bell className="h-5 w-5 text-green-400" />
                <h3 className="font-medium text-white">Reminders</h3>
              </div>
              <p className="text-sm text-gray-400">Get notified about upcoming deadlines and important tasks</p>
            </div>
            <div className="bg-gray-800/50 p-4 rounded-lg border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-5 w-5 text-green-400" />
                <h3 className="font-medium text-white">Progress Tracking</h3>
              </div>
              <p className="text-sm text-gray-400">Visualize your progress and celebrate your achievements</p>
            </div>
          </div>
          
          <Link 
            href="/dashboard" 
            className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>

      <div className="flex-1 p-8">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-6">Your Actionables</h1>
          <p className="text-gray-300 mb-8">
            This is where you&apos;ll find personalized recommendations and actions based on your Blueprint.
          </p>
        </div>
      </div>
    </div>
  );
} 