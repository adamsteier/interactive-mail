'use client';

import { KeyboardEvent, useEffect, useRef } from 'react';

interface InputFieldProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  disabled?: boolean;
  onPositionChange?: (position: { top: number; height: number }) => void;
  placeholder?: string;
}

const InputField = ({ 
  value, 
  onChange, 
  onSubmit, 
  disabled = false, 
  onPositionChange,
  placeholder = "Type your response here..." 
}: InputFieldProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current && onPositionChange) {
      const rect = inputRef.current.getBoundingClientRect();
      onPositionChange({ 
        top: rect.top,
        height: rect.height
      });
    }
  }, [onPositionChange]); // Added onPositionChange to dependency array

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && value.trim() && !disabled) {
      onSubmit(value);
      // Strong effect for Enter key
      window.dispatchEvent(new CustomEvent('waveInteraction', { 
        detail: { x: window.innerWidth / 2, intensity: 2.0 }
      }));
    }
  };

  const handleSubmitClick = () => {
    if (value.trim() && !disabled) {
      onSubmit(value);
      // Strong effect for button click
      window.dispatchEvent(new CustomEvent('waveInteraction', { 
        detail: { x: window.innerWidth / 2, intensity: 2.0 }
      }));
    }
  };

  return (
    <div className="relative w-full max-w-2xl">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          // Medium effect for typing
          window.dispatchEvent(new CustomEvent('waveInteraction', { 
            detail: { x: window.innerWidth / 2, intensity: 0.8 }
          }));
        }}
        onKeyPress={handleKeyPress}
        onClick={() => {
          // Strong effect for clicking
          window.dispatchEvent(new CustomEvent('waveInteraction', { 
            detail: { x: window.innerWidth / 2, intensity: 1.5 }
          }));
        }}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full rounded-lg border-2 border-electric-teal bg-charcoal px-6 py-5 pr-16 text-lg text-white placeholder-gray-400 shadow-glow focus:border-neon-magenta focus:outline-none disabled:opacity-50 md:text-xl lg:text-2xl"
      />
      <button
        onClick={handleSubmitClick}
        disabled={disabled || !value.trim()}
        className="absolute right-3 top-1/2 -translate-y-1/2 transform"
      >
        <div 
          className={`group relative h-10 w-10 transition-all duration-200
            ${value.trim() && !disabled 
              ? 'opacity-100 hover:scale-110' 
              : 'opacity-50'}`}
        >
          <svg
            className="h-full w-full"
            viewBox="0 0 32 32"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g transform="translate(-192 -192)">
              <path
                className={`transition-colors ${
                  value.trim() && !disabled 
                    ? 'fill-electric-teal' 
                    : 'fill-gray-600'
                }`}
                d="m219 197c.796 0 1.559.316 2.121.879.563.562.879 1.325.879 2.121v16c0 .796-.316 1.559-.879 2.121-.562.563-1.325.879-2.121.879h-22c-.796 0-1.559-.316-2.121-.879-.563-.562-.879-1.325-.879-2.121v-16c0-.796.316-1.559.879-2.121.562-.563 1.325-.879 2.121-.879zm-23 3.414v15.436l6.675-8.761zm22.586-1.414h-21.172s7.297 7.297 7.304 7.304l2.575 2.575c.39.39 1.024.39 1.414 0 0 0 2.588-2.589 2.595-2.595zm1.414 16.85v-15.436l-6.675 6.675zm-22.362 1.15h20.724l-6.464-8.484-1.777 1.777c-1.171 1.171-3.071 1.171-4.242 0l-1.777-1.777z"
              />
            </g>
          </svg>
        </div>
      </button>
    </div>
  );
};

export default InputField; 