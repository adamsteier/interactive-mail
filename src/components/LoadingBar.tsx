'use client';

interface LoadingBarProps {
  height?: string;
}

const LoadingBar = ({ height = '2px' }: LoadingBarProps) => {
  return (
    <div className={`w-full overflow-hidden rounded-full bg-electric-teal/20`} style={{ height }}>
      <div 
        className="h-full w-full bg-electric-teal animate-loading-progress rounded-full"
      />
    </div>
  );
};

export default LoadingBar; 