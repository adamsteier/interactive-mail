'use client';

import { useEffect, useState } from 'react';

interface InfoBoxProps {
  label: string;
  value: string;
  show: boolean;
}

const InfoBox = ({ label, value, show }: InfoBoxProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
    }
  }, [show]);

  if (!show) return null;

  return (
    <div 
      className={`fixed left-8 top-8 transform transition-all duration-700 ease-out
        ${!isVisible 
          ? '-translate-x-full opacity-0' 
          : 'translate-x-0 opacity-100 animate-info-box-glow'
        }
      `}
    >
      <div className="rounded-lg border-2 border-electric-teal bg-charcoal/80 px-4 py-2 shadow-glow backdrop-blur-sm">
        <div className="text-sm text-electric-teal/80">{label}</div>
        <div className="text-lg font-medium text-electric-teal">{value}</div>
      </div>
    </div>
  );
};

export default InfoBox; 