'use client';

import { useEffect, useState } from 'react';

interface InfoBoxProps {
  label: string;
  value: string;
  show: boolean;
  startPosition?: { top: number; height: number };
}

const InfoBox = ({ label, value, show, startPosition }: InfoBoxProps) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setIsAnimating(true);
      setTimeout(() => {
        setIsVisible(true);
        setIsAnimating(false);
      }, 1500);
    }
  }, [show]);

  if (!show && !isAnimating) return null;

  const startStyle = startPosition ? {
    top: `${startPosition.top}px`,
    left: '50%',
    transform: 'translateX(-50%)'
  } : {};

  return (
    <div 
      className={`fixed left-8 top-8 transition-all duration-1500 ease-out`}
      style={isAnimating ? startStyle : undefined}
    >
      <div 
        className={`rounded-lg border-2 border-electric-teal bg-charcoal/80 px-4 py-2 shadow-glow backdrop-blur-sm
          ${isAnimating ? 'animate-float-to-corner' : ''}`}
      >
        <div className="text-sm text-electric-teal/80">{label}</div>
        <div className="text-lg font-medium text-electric-teal">{value}</div>
      </div>
    </div>
  );
};

export default InfoBox; 