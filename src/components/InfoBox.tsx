'use client';

import { useEffect, useState } from 'react';

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
}

const InfoBox = ({ 
  label, 
  value, 
  show, 
  onClick, 
  position = 'first',
  subInfo
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
    first: 'left-4 md:left-8',
    inline: 'left-4 md:left-[280px] lg:left-[320px]',
    below: 'left-4 md:left-8 top-24 md:top-32'
  }[position];

  return (
    <div 
      className={`fixed top-8 z-20 transform transition-all duration-700 ease-out
        ${positionClasses}
        ${!isVisible 
          ? '-translate-x-full opacity-0' 
          : 'translate-x-0 opacity-100 animate-info-box-glow'
        }
        ${position === 'below' ? 'w-[calc(100%-2rem)] md:w-[600px]' : ''}
      `}
    >
      <button
        onClick={onClick}
        className={`w-full cursor-pointer rounded-lg border-2 border-electric-teal bg-charcoal/80 px-4 md:px-6 py-3 shadow-glow backdrop-blur-sm 
          transition-all duration-300 hover:bg-electric-teal/10 hover:shadow-glow-strong active:scale-95
          ${position === 'below' ? 'text-left' : ''}`}
      >
        <div className="text-sm text-electric-teal/80 mb-1">{label}</div>
        <div className="text-lg font-medium text-electric-teal">{value}</div>
        {subInfo && (
          <div className="mt-3 border-t border-electric-teal/20 pt-3">
            <div className="text-sm text-electric-teal/80">Industry</div>
            <div className="text-base font-semibold text-electric-teal mb-3">{subInfo.industry}</div>
            <div className="text-sm text-electric-teal/80">Business Description</div>
            <div className="text-base text-electric-teal">{subInfo.description}</div>
          </div>
        )}
      </button>
    </div>
  );
};

export default InfoBox; 