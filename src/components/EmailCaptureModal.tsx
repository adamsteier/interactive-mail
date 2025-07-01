'use client';

import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface EmailCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  campaignId?: string;
}

const EmailCaptureModal: React.FC<EmailCaptureModalProps> = ({
  isOpen,
  onClose,
  onComplete,
  campaignId
}) => {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email && !phone) {
      setError('Please provide either an email or phone number');
      return;
    }

    setIsSubmitting(true);

    try {
      // Save contact info to the campaign
      if (campaignId) {
        const campaignRef = doc(db, 'campaigns', campaignId);
        await updateDoc(campaignRef, {
          contactInfo: {
            email: email || null,
            phone: phone || null,
            capturedAt: new Date()
          }
        });
      }

      // Save to session for tracking
      const sessionId = localStorage.getItem('interactive_mail_session_id');
      if (sessionId) {
        const sessionRef = doc(db, 'sessions', sessionId);
        await updateDoc(sessionRef, {
          contactInfo: {
            email: email || null,
            phone: phone || null
          }
        });
      }

      onComplete();
    } catch (err) {
      console.error('Failed to save contact info:', err);
      setError('Failed to save your information. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-charcoal border-2 border-electric-teal rounded-lg p-6 max-w-md w-full mx-4 shadow-glow">
        <h2 className="text-xl font-semibold text-electric-teal mb-4">
          Get Your Campaign Link
        </h2>
        
        <p className="text-electric-teal/80 mb-6">
          We&apos;ll send you a link to access your campaign anytime. 
          No password needed!
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-electric-teal/80 mb-1">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-charcoal-dark border border-electric-teal/50 
                rounded-lg text-electric-teal focus:border-electric-teal focus:outline-none"
              placeholder="your@email.com"
            />
          </div>

          <div className="text-center text-electric-teal/60 text-sm">
            — OR —
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-electric-teal/80 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 bg-charcoal-dark border border-electric-teal/50 
                rounded-lg text-electric-teal focus:border-electric-teal focus:outline-none"
              placeholder="(555) 123-4567"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-electric-teal/50 text-electric-teal px-4 py-2 
                rounded-lg hover:bg-electric-teal/10 transition-colors"
              disabled={isSubmitting}
            >
              Skip
            </button>
            <button
              type="submit"
              className="flex-1 bg-electric-teal text-charcoal px-4 py-2 rounded-lg 
                font-medium hover:bg-electric-teal/90 transition-colors disabled:opacity-50"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Get My Link'}
            </button>
          </div>
        </form>

        <p className="text-xs text-electric-teal/50 mt-4 text-center">
          We&apos;ll only use this to send you your campaign link. No spam!
        </p>
      </div>
    </div>
  );
};

export default EmailCaptureModal; 