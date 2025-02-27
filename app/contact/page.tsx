'use client';

import ContactForm from '@/components/ContactForm';
import { motion } from 'framer-motion';

export default function ContactPage() {
  return (
    <div className="min-h-screen flex items-center justify-center py-20 px-4">
      <div className="w-full max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text mb-6">
            Get in Touch
          </h1>
          <p className="text-white/90 max-w-2xl mx-auto mb-8">
            LifeGuide is a new platform, and we're constantly working to improve it. We welcome all suggestions, 
            feedback, and bug reports. Your input is invaluable in helping us create the best possible experience.
          </p>
        </motion.div>

        <div className="bg-gray-800/50 rounded-xl backdrop-blur-sm shadow-2xl p-8">
          <ContactForm />
        </div>
      </div>
    </div>
  );
} 