'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { LoaderCircle, CheckCircle, AlertCircle } from 'lucide-react';
import Script from 'next/script';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ContactForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
    contactType: '',
  });

  // Reset success message after 5 seconds
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (isSuccess) {
      timeout = setTimeout(() => {
        setIsSuccess(false);
      }, 5000);
    }
    return () => clearTimeout(timeout);
  }, [isSuccess]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (value: string) => {
    setFormData((prev) => ({ ...prev, contactType: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Check if contact type is selected
    if (!formData.contactType) {
      setError("Please select a contact type");
      setIsSubmitting(false);
      return;
    }

    // Check if hCaptcha is filled
    const hCaptchaResponse = document.querySelector('textarea[name=h-captcha-response]') as HTMLTextAreaElement;
    if (!hCaptchaResponse?.value) {
      setError("Please complete the captcha verification");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          access_key: "Y3c95f3cd-5bfe-429e-b32a-54ac4e510253",
          name: formData.name,
          email: formData.email,
          message: formData.message,
          contactType: formData.contactType,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setIsSuccess(true);
        // Reset form fields
        setFormData({
          name: '',
          email: '',
          message: '',
          contactType: '',
        });
        
        // Reset hCaptcha (if possible)
        try {
          // @ts-expect-error - hcaptcha is loaded by the script and not defined in typescript
          if (window.hcaptcha) {
            // @ts-expect-error - hcaptcha is loaded by the script and not defined in typescript
            window.hcaptcha.reset();
          }
        } catch (e) {
          console.error("Error resetting hCaptcha:", e);
        }
      } else {
        throw new Error(result.message || "Failed to submit form");
      }
    } catch (err) {
      console.error("Form submission error:", err);
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <form id="contactForm" onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="name" className="block text-sm font-medium text-gray-200">
            Name
          </label>
          <Input
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            placeholder="Your name"
            className="bg-gray-800/70 border-gray-700 text-white placeholder:text-gray-500"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-medium text-gray-200">
            Email
          </label>
          <Input
            id="email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            placeholder="email@example.com"
            className="bg-gray-800/70 border-gray-700 text-white placeholder:text-gray-500"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="contactType" className="block text-sm font-medium text-gray-200">
            Contact Type
          </label>
          <Select value={formData.contactType} onValueChange={handleSelectChange} required>
            <SelectTrigger className="bg-gray-800/70 border-gray-700 text-white">
              <SelectValue placeholder="Select a reason for contact" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700 text-white">
              <SelectItem value="general">General Inquiry</SelectItem>
              <SelectItem value="support">Customer Support</SelectItem>
              <SelectItem value="bug">Bug Report</SelectItem>
              <SelectItem value="feature">Feature Request</SelectItem>
              <SelectItem value="feedback">Feedback</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label htmlFor="message" className="block text-sm font-medium text-gray-200">
            Message
          </label>
          <Textarea
            id="message"
            name="message"
            value={formData.message}
            onChange={handleChange}
            required
            rows={4}
            placeholder="Enter your message here..."
            className="bg-gray-800/70 border-gray-700 text-white placeholder:text-gray-500 min-h-24"
          />
        </div>

        {/* hCaptcha */}
        <div className="h-captcha" data-captcha="true"></div>

        {error && (
          <div className="bg-red-900/30 border border-red-800/50 rounded-md p-3 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        <Button
          type="submit"
          disabled={isSubmitting || isSuccess}
          className={`w-full ${
            isSuccess
              ? 'bg-green-600 hover:bg-green-700'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              <span>Sending...</span>
            </span>
          ) : isSuccess ? (
            <span className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              <span>Message Sent!</span>
            </span>
          ) : (
            'Send Message'
          )}
        </Button>
      </form>

      {/* hCaptcha Script */}
      <Script src="https://web3forms.com/client/script.js" async defer />
      
      {/* hCaptcha Validation Script */}
      <Script id="hcaptcha-validation">
        {`
          document.addEventListener('DOMContentLoaded', function() {
            const form = document.getElementById('contactForm');
            
            form.addEventListener('submit', function(e) {
              const hCaptcha = form.querySelector('textarea[name=h-captcha-response]')?.value;
              
              if (!hCaptcha) {
                e.preventDefault();
                alert("Please complete the captcha verification");
                return false;
              }
            });
          });
        `}
      </Script>
    </>
  );
} 