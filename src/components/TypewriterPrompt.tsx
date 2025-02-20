'use client';

import { useEffect, useState } from 'react';

interface TypewriterPromptProps {
  text: string;
}

const TypewriterPrompt = ({ text }: TypewriterPromptProps) => {
  const [displayText, setDisplayText] = useState('');
  
  useEffect(() => {
    let currentIndex = 0;
    const intervalId = setInterval(() => {
      if (currentIndex <= text.length) {
        setDisplayText(text.slice(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(intervalId);
      }
    }, 50);

    return () => clearInterval(intervalId);
  }, [text]);

  return (
    <div className="mb-12 h-[180px] w-full md:h-[200px] lg:h-[220px]">
      <h1 className="max-w-[500px] whitespace-pre-line text-left text-xl font-normal text-electric-teal md:text-2xl lg:text-3xl">
        {displayText}
        <span className="animate-blink">|</span>
      </h1>
    </div>
  );
};

export default TypewriterPrompt; 