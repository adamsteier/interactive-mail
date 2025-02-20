'use client';

import { useState, useEffect, useCallback } from 'react';
import AnimatedBackground from '@/components/AnimatedBackground';
import TypewriterPrompt from '@/components/TypewriterPrompt';
import InputField from '@/components/InputField';
import InfoBox from '@/components/InfoBox';

interface LocationData {
  city: string;
  region: string;
  country: string;
}

interface Answer {
  label: string;
  value: string;
}

export default function Home() {
  const [userInput, setUserInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [inputPosition, setInputPosition] = useState<{ top: number; height: number }>();
  const [step, setStep] = useState(0);
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);

  const labels = [
    "Target Area",
    "Target Audience",
    "Business Type"
  ];

  useEffect(() => {
    const fetchLocation = async () => {
      try {
        const response = await fetch('/api/location');
        const data = await response.json();
        setLocationData({
          city: data.city,
          region: data.region,
          country: data.country
        });
      } catch (error) {
        console.error('Failed to fetch location:', error);
      }
    };

    fetchLocation();
  }, []);

  const welcomeText = "Let's find you some new business. Tell me a little bit about your customers or who you're trying to reach.";
  
  const prompts = [
    {
      text: `${welcomeText}\nWhere do you want to target? You can be descriptive and use terms like North ${locationData?.city || 'Toronto'}.`,
      placeholder: "Type City, Province, Area, Neighbourhood"
    },
    {
      text: "Tell me about your ideal customers. Who are you trying to reach?",
      placeholder: "Describe your target audience"
    },
    {
      text: "What type of business are you in?",
      placeholder: "Describe your business or industry"
    }
  ];

  const handleSubmit = async (input: string) => {
    setIsProcessing(true);
    try {
      // Store the answer
      const newAnswer: Answer = {
        label: labels[step],
        value: input
      };
      setAnswers(prev => [...prev, newAnswer]);
      
      // Move to next step or finish
      if (step < prompts.length - 1) {
        setStep(step + 1);
        setUserInput('');
      } else {
        // Handle final submission
        console.log('All answers collected');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePositionChange = useCallback((position: { top: number; height: number }) => {
    setInputPosition(position);
  }, []);

  return (
    <main className="relative min-h-screen w-full">
      <AnimatedBackground inputPosition={inputPosition} />
      {answers.map(answer => (
        <InfoBox
          key={answer.label}
          label={answer.label}
          value={answer.value}
          show={true}
          startPosition={inputPosition}
        />
      ))}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-8">
        <div className="max-w-4xl">
          <TypewriterPrompt 
            text={prompts[step].text}
            key={step}
          />
          <InputField 
            value={userInput}
            onChange={setUserInput}
            onSubmit={handleSubmit}
            disabled={isProcessing}
            onPositionChange={handlePositionChange}
            placeholder={prompts[step].placeholder}
          />
        </div>
      </div>
    </main>
  );
}
