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

interface BusinessAnalysis {
  industry: string;
  description: string;
  customerTypes: string[];
}

interface DisplayInfo {
  label: string;
  value: string;
  type: 'answer' | 'analysis';
  position?: 'first' | 'inline' | 'below';
  subInfo?: {
    industry: string;
    description: string;
  };
}

export default function Home() {
  const [userInput, setUserInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [inputPosition, setInputPosition] = useState<{ top: number; height: number }>();
  const [step, setStep] = useState(0);
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [businessAnalysis, setBusinessAnalysis] = useState<BusinessAnalysis | null>(null);
  const [displayInfos, setDisplayInfos] = useState<DisplayInfo[]>([]);

  const labels = [
    "Target Area",
    "Your Business Name",
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

  useEffect(() => {
    // Update display infos whenever answers or business analysis change
    const newDisplayInfos: DisplayInfo[] = [
      ...answers.map((answer, index) => ({
        ...answer,
        type: 'answer' as const,
        position: index === 0 ? 'first' as const : 'inline' as const,
        ...(answer.label === "Your Business Name" && businessAnalysis ? {
          subInfo: {
            industry: businessAnalysis.industry,
            description: businessAnalysis.description
          }
        } : {})
      }))
    ];
    setDisplayInfos(newDisplayInfos);
  }, [answers, businessAnalysis]);

  const welcomeText = "Let's find you some new business. Tell me a little bit about your customers or who you're trying to reach.";
  
  const prompts = [
    {
      text: `${welcomeText}\nWhere do you want to target? You can be descriptive and use terms like North ${locationData?.city || 'Toronto'}.`,
      placeholder: "Type City, Province, Area, Neighbourhood"
    },
    {
      text: "What's the name of your business?",
      placeholder: "Enter your business name"
    },
    {
      text: "What type of business are you in?",
      placeholder: "Describe your business or industry"
    }
  ];

  const handleSubmit = async (input: string) => {
    setIsProcessing(true);
    try {
      const newAnswer: Answer = {
        label: labels[step],
        value: input
      };
      setAnswers(prev => [...prev, newAnswer]);
      
      // Make API call after business name is entered (step 1)
      if (step === 1) {
        const allAnswers = [...answers, newAnswer];
        const targetArea = allAnswers.find(a => a.label === "Target Area")?.value || "";
        const businessName = allAnswers.find(a => a.label === "Your Business Name")?.value || "";

        const response = await fetch('/api/openai', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            targetArea,
            businessName,
            businessType: "", // Empty at this point
            userLocation: locationData?.city || 'Toronto',
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to get AI response');
        }

        const data = await response.json();
        if (data.analysis) {
          setBusinessAnalysis(data.analysis);
        }
      }

      if (step < prompts.length - 1) {
        setStep(step + 1);
        setUserInput('');
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePositionChange = useCallback((position: { top: number; height: number }) => {
    setInputPosition(position);
  }, []);

  const handleInfoBoxClick = (index: number) => {
    setStep(index);
    setUserInput(answers[index].value);
  };

  return (
    <main className="relative min-h-screen w-full">
      <AnimatedBackground inputPosition={inputPosition} />
      <div className="fixed left-0 top-0 w-full">
        <div className="relative mx-auto max-w-7xl px-4">
          <div className="flex flex-col md:flex-row md:items-start md:gap-4">
            {displayInfos.map((info, index) => (
              <InfoBox
                key={`${info.label}-${index}`}
                label={info.label}
                value={info.value}
                show={true}
                onClick={info.type === 'answer' ? () => handleInfoBoxClick(index) : undefined}
                position={info.position}
                subInfo={info.subInfo}
              />
            ))}
          </div>
        </div>
      </div>
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
