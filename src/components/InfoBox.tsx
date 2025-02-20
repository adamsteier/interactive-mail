'use client';

import { useEffect, useState } from 'react';
import LoadingBar from './LoadingBar';

interface InfoBoxProps {
  label: string;
  value: string;
  show: boolean;
  onClick?: () => void;
  position?: 'first' | 'inline' | 'below';
  subInfo?: {
    industry: string;
    description: string;
  };
  isLoading?: boolean;
}

const InfoBox = ({ 
  label, 
  value, 
  show, 
  onClick, 
  position = 'first',
  subInfo,
  isLoading = false,
}: InfoBoxProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
    }
  }, [show]);

  if (!show) return null;

  // Define position classes based on screen size
  const positionClasses = {
    first: 'left-0',
    inline: 'left-0 md:left-auto',
    below: 'left-0'
  }[position];

  return (
    <div 
      className={`transform transition-all duration-700 ease-out
        ${position === 'below' ? 'w-full' : 'w-auto'}
        ${positionClasses}
        ${!isVisible 
          ? '-translate-x-full opacity-0' 
          : 'translate-x-0 opacity-100 animate-info-box-glow'
        }
      `}
    >
      <button
        onClick={onClick}
        className={`w-full text-left group relative rounded-lg border-2 border-electric-teal bg-charcoal/80 px-4 md:px-6 py-3 shadow-glow backdrop-blur-sm 
          ${onClick ? 'cursor-pointer hover:bg-electric-teal/10 hover:shadow-glow-strong' : ''}
          transition-all duration-300
          ${position === 'below' ? 'text-left' : ''}`}
      >
        {subInfo ? (
          <>
            <div className="text-sm text-electric-teal/80 mb-2">Industry</div>
            {isLoading ? (
              <LoadingBar height="28px" />
            ) : (
              <div className="text-lg font-semibold text-electric-teal mb-4">{subInfo.industry}</div>
            )}
            <div className="text-sm text-electric-teal/80 mb-2">Business Description</div>
            {isLoading ? (
              <LoadingBar height="24px" />
            ) : (
              <div className="text-base text-electric-teal">{subInfo.description}</div>
            )}
          </>
        ) : (
          <>
            <div className="text-sm text-electric-teal/80 mb-1">{label}</div>
            {isLoading ? (
              <LoadingBar height="28px" />
            ) : (
              <div className="text-lg font-medium text-electric-teal">{value}</div>
            )}
          </>
        )}
      </button>
    </div>
  );
};

export default InfoBox; 