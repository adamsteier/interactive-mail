'use client';

import { KeyboardEvent } from 'react';

interface InputFieldProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  disabled?: boolean;
}

const InputField = ({ value, onChange, onSubmit, disabled = false }: InputFieldProps) => {
  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && value.trim() && !disabled) {
      onSubmit(value);
    }
  };

  return (
    <div className="w-full max-w-2xl">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder="Type your response here..."
        disabled={disabled}
        className="w-full rounded-lg border-2 border-electric-teal bg-transparent px-6 py-4 text-xl text-white placeholder-gray-400 shadow-glow focus:border-neon-magenta focus:outline-none disabled:opacity-50"
      />
    </div>
  );
};

export default InputField; 