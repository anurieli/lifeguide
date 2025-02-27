'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

type ContactType = 'feature' | 'bug' | 'partnership' | 'other';

export default function ContactForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [type, setType] = useState<ContactType>('feature');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');

    try {
      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          access_key: "Y3c95f3cd-5bfe-429e-b32a-54ac4e510253",
          name,
          email,
          subject: `${type.charAt(0).toUpperCase() + type.slice(1)} Request`,
          message,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setStatus('success');
        setName('');
        setEmail('');
        setType('feature');
        setMessage('');
      } else {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setStatus('error');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-lg mx-auto space-y-6">
      <div>
        <label htmlFor="name" className="block text-sm font-medium mb-2 text-white">
          Name
        </label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-white"
          required
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-2 text-white">
          Email
        </label>
        <input
          type="email"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-white"
          required
        />
      </div>

      <div>
        <label htmlFor="type" className="block text-sm font-medium mb-2 text-white">
          Contact Type
        </label>
        <select
          id="type"
          value={type}
          onChange={(e) => setType(e.target.value as ContactType)}
          className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-white"
        >
          <option value="feature">Feature Request</option>
          <option value="bug">Bug Report</option>
          <option value="partnership">Partnership</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div>
        <label htmlFor="message" className="block text-sm font-medium mb-2 text-white">
          Message
        </label>
        <textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-white"
          required
        />
      </div>

      <motion.button
        type="submit"
        disabled={status === 'submitting'}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`w-full py-3 rounded-lg font-medium ${
          status === 'submitting'
            ? 'bg-gray-700 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        {status === 'submitting' ? 'Sending...' : 'Send Message'}
      </motion.button>

      {status === 'success' && (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-green-500 text-center"
        >
          Message sent successfully!
        </motion.p>
      )}

      {status === 'error' && (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-red-500 text-center"
        >
          Failed to send message. Please try again.
        </motion.p>
      )}
    </form>
  );
} 