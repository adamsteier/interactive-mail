'use client';

import { useRouter } from 'next/navigation';

interface ProgressStep {
  step: number;
  label: string;
  route?: string;
  active: boolean;
  completed: boolean;
  disabled?: boolean;
}

interface CampaignProgressProps {
  currentStep: number;
  campaignId: string;
  steps?: ProgressStep[];
}

export default function CampaignProgress({ currentStep, campaignId, steps }: CampaignProgressProps) {
  const router = useRouter();
  
  const defaultSteps: ProgressStep[] = [
    { 
      step: 1, 
      label: 'Select Leads', 
      route: `/v2/build/${campaignId}/leads`,
      active: currentStep === 1,
      completed: currentStep > 1
    },
    { 
      step: 2, 
      label: 'Brand', 
      route: `/v2/build/${campaignId}/brand`,
      active: currentStep === 2,
      completed: currentStep > 2
    },
    { 
      step: 3, 
      label: 'Design', 
      route: `/v2/build/${campaignId}/design`,
      active: currentStep === 3,
      completed: currentStep > 3
    },
    { 
      step: 4, 
      label: 'Review', 
      route: `/v2/build/${campaignId}/review`,
      active: currentStep === 4,
      completed: currentStep > 4
    },
    { 
      step: 5, 
      label: 'Payment', 
      route: `/v2/build/${campaignId}/payment`,
      active: currentStep === 5,
      completed: currentStep > 5
    }
  ];

  const stepsToShow = steps || defaultSteps;

  const handleStepClick = (step: ProgressStep) => {
    // Only allow navigation to completed steps or the current step
    if (step.route && (step.completed || step.active) && !step.disabled) {
      router.push(step.route);
    }
  };

  return (
    <div className="bg-[#1A1A1A]/90 backdrop-blur-sm border-b border-[#2F2F2F]">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-center space-x-4 overflow-x-auto">
          {stepsToShow.map((item, index) => (
            <div key={item.step} className="flex items-center">
              <button
                onClick={() => handleStepClick(item)}
                disabled={!item.completed && !item.active}
                className={`
                  flex items-center space-x-2 px-3 py-2 rounded-lg transition-all
                  ${item.active 
                    ? 'bg-[#00F0FF]/20 cursor-default' 
                    : item.completed && item.route
                    ? 'hover:bg-[#00F0FF]/10 cursor-pointer'
                    : 'cursor-not-allowed opacity-50'
                  }
                `}
              >
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all
                  ${item.active 
                    ? 'bg-[#00F0FF] text-[#1A1A1A] shadow-[0_0_20px_rgba(0,240,255,0.4)]' 
                    : item.completed
                    ? 'bg-[#00F0FF]/30 text-[#00F0FF] border-2 border-[#00F0FF]'
                    : 'bg-[#2F2F2F] text-[#EAEAEA]/60'
                  }
                `}>
                  {item.completed ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    item.step
                  )}
                </div>
                <span className={`text-sm font-medium ${
                  item.active ? 'text-[#00F0FF]' : item.completed ? 'text-[#EAEAEA]' : 'text-[#EAEAEA]/60'
                }`}>
                  {item.label}
                </span>
              </button>
              {index < stepsToShow.length - 1 && (
                <div className={`w-8 h-px mx-2 transition-all ${
                  item.completed ? 'bg-[#00F0FF]' : 'bg-[#2F2F2F]'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 