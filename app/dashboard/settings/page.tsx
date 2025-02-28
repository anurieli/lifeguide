'use client';

import Link from 'next/link';
import { Settings, ArrowLeft, Clock } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="border-b border-white/10 pb-4 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings className="h-6 w-6 text-blue-400" />
            <h1 className="text-2xl font-bold text-white">Settings</h1>
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
        <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 p-8 rounded-xl border border-white/10 max-w-2xl w-full backdrop-blur-sm">
          <Clock className="h-16 w-16 text-blue-400 mx-auto mb-6" />
          
          <h2 className="text-3xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
            Settings Coming Soon
          </h2>
          
          <p className="text-gray-300 mb-8 max-w-md mx-auto">
            We&apos;re working on advanced settings to help you customize your LifeGuide experience. 
            This section will include profile customization, notification preferences, and more.
          </p>
          
          <div className="grid gap-6 md:grid-cols-2 mb-8">
            <div className="bg-gray-800/50 p-4 rounded-lg border border-white/10">
              <h3 className="font-medium text-white mb-2">Profile Settings</h3>
              <p className="text-sm text-gray-400">Customize your profile, update personal information, and manage your account</p>
            </div>
            <div className="bg-gray-800/50 p-4 rounded-lg border border-white/10">
              <h3 className="font-medium text-white mb-2">Appearance</h3>
              <p className="text-sm text-gray-400">Choose between light and dark mode, adjust text size, and customize your dashboard</p>
            </div>
            <div className="bg-gray-800/50 p-4 rounded-lg border border-white/10">
              <h3 className="font-medium text-white mb-2">Notifications</h3>
              <p className="text-sm text-gray-400">Set up email notifications for reminders, updates, and important milestones</p>
            </div>
            <div className="bg-gray-800/50 p-4 rounded-lg border border-white/10">
              <h3 className="font-medium text-white mb-2">Privacy & Security</h3>
              <p className="text-sm text-gray-400">Manage data sharing preferences and enhance your account security</p>
            </div>
          </div>
          
          <Link 
            href="/dashboard" 
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
} 