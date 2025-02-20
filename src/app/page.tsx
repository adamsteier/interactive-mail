'use client';

import { useState } from 'react';
import AnimatedBackground from '@/components/AnimatedBackground';
import TypewriterPrompt from '@/components/TypewriterPrompt';
import InputField from '@/components/InputField';

export default function Home() {
  const [userInput, setUserInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (input: string) => {
    setIsProcessing(true);
    try {
      // API call logic will go here later
      console.log('Processing:', input);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-charcoal">
      <AnimatedBackground />
      <div className="relative z-10 flex h-full flex-col items-center justify-center px-4">
        <TypewriterPrompt />
        <InputField 
          value={userInput}
          onChange={setUserInput}
          onSubmit={handleSubmit}
          disabled={isProcessing}
        />
      </div>
    </main>
  );
}
