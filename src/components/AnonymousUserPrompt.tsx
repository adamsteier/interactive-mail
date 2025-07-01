'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface AnonymousUserPromptProps {
  stage: 'soft' | 'medium' | 'hard';
  onContinueAnonymous?: () => void;
  onCreateAccount?: () => void;
  customMessage?: string;
}

const AnonymousUserPrompt: React.FC<AnonymousUserPromptProps> = ({
  stage,
  onContinueAnonymous,
  onCreateAccount,
  customMessage
}) => {
  const { isAnonymous } = useAuth();

  if (!isAnonymous) return null;

  const messages = {
    soft: {
      title: "💡 Save your progress!",
      subtitle: "Create a free account to save your leads and come back anytime.",
      continueText: "I'll browse a bit more",
      benefits: [
        "Save unlimited campaigns",
        "Access from any device", 
        "Get email updates on your campaigns"
      ]
    },
    medium: {
      title: "🎯 You're almost there!",
      subtitle: "Create an account to save your selected leads and campaign.",
      continueText: "Continue as guest",
      benefits: [
        "Never lose your selected leads",
        "Edit campaigns later",
        "Track your mailings"
      ]
    },
    hard: {
      title: "🔒 Account Required",
      subtitle: "To proceed with payment and mailing, you'll need to create an account.",
      continueText: null,
      benefits: [
        "Secure payment processing",
        "Order tracking and history",
        "Customer support access"
      ]
    }
  };

  const config = messages[stage];

  return (
    <div className="bg-charcoal-dark border-2 border-electric-teal rounded-lg p-6 shadow-glow">
      <h3 className="text-xl font-semibold text-electric-teal mb-2">
        {config.title}
      </h3>
      <p className="text-electric-teal/80 mb-4">
        {customMessage || config.subtitle}
      </p>

      <div className="mb-6">
        <p className="text-sm text-electric-teal/60 mb-2">Benefits of creating an account:</p>
        <ul className="space-y-1">
          {config.benefits.map((benefit, idx) => (
            <li key={idx} className="flex items-start">
              <span className="text-neon-magenta mr-2">✓</span>
              <span className="text-electric-teal/80 text-sm">{benefit}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onCreateAccount}
          className="flex-1 bg-electric-teal text-charcoal px-4 py-2 rounded-lg 
            font-medium hover:bg-electric-teal/90 transition-colors"
        >
          Create Free Account
        </button>
        
        {config.continueText && onContinueAnonymous && (
          <button
            onClick={onContinueAnonymous}
            className="flex-1 border border-electric-teal/50 text-electric-teal px-4 py-2 
              rounded-lg hover:bg-electric-teal/10 transition-colors"
          >
            {config.continueText}
          </button>
        )}
      </div>

      {stage === 'medium' && (
        <p className="text-xs text-electric-teal/50 mt-4 text-center">
          We&apos;ll save your email to send you a link to your campaign
        </p>
      )}
    </div>
  );
};

export default AnonymousUserPrompt; 