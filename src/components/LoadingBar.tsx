'use client';

interface LoadingBarProps {
  progress?: number;
  height?: string;
  className?: string;
}

const LoadingBar = ({ progress, height = '2px', className = '' }: LoadingBarProps) => {
  if (progress !== undefined) {
    // Progress bar mode
    return (
      <div className="h-1 bg-electric-teal/20">
        <div 
          className="h-full bg-electric-teal transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    );
  }

  // Static loading bar mode
  return (
    <div 
      className={`w-full overflow-hidden rounded-full bg-electric-teal/20 ${className}`} 
      style={{ height }}
    >
      <div 
        className="h-full w-full bg-electric-teal animate-loading-progress rounded-full"
      />
    </div>
  );
};

export type { LoadingBarProps };
export default LoadingBar; 