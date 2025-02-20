'use client';

import { useEffect, useState } from 'react';

const TypewriterPrompt = () => {
  const [text, setText] = useState('');
  const fullText = "Let's find you some new business. Tell me a little bit about your customers or who you're trying to reach.";
  
  useEffect(() => {
    let currentIndex = 0;
    const intervalId = setInterval(() => {
      if (currentIndex <= fullText.length) {
        setText(fullText.slice(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(intervalId);
      }
    }, 50);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <h1 className="mb-8 text-center text-3xl font-bold text-electric-teal">
      {text}
      <span className="animate-blink">|</span>
    </h1>
  );
};

export default TypewriterPrompt; 