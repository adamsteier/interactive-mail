import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface AnalysisStep {
  message: string;
  duration: number; // in milliseconds
  progress: number; // cumulative progress percentage
}

const ProgressiveAnalysisLoader = () => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepProgress, setStepProgress] = useState(0);

  const analysisSteps: AnalysisStep[] = [
    { message: "Searching the internet for business information...", duration: 3000, progress: 8 },
    { message: "Gathering business data from multiple sources...", duration: 2500, progress: 16 },
    { message: "Analyzing business industry and category...", duration: 2000, progress: 25 },
    { message: "Identifying target market and customer base...", duration: 2200, progress: 35 },
    { message: "Evaluating competitive landscape...", duration: 2800, progress: 45 },
    { message: "Finding potential partner businesses...", duration: 3200, progress: 58 },
    { message: "Mapping service area and demographics...", duration: 2600, progress: 68 },
    { message: "Calculating market opportunity metrics...", duration: 2400, progress: 77 },
    { message: "Generating marketing strategy insights...", duration: 3000, progress: 87 },
    { message: "Optimizing business type recommendations...", duration: 2200, progress: 94 },
    { message: "Finalizing analysis and recommendations...", duration: 2000, progress: 100 }
  ];

  const currentStep = analysisSteps[currentStepIndex];

  useEffect(() => {
    if (currentStepIndex >= analysisSteps.length - 1) return;

    const timer = setTimeout(() => {
      setCurrentStepIndex(prev => Math.min(prev + 1, analysisSteps.length - 1));
      setStepProgress(0);
    }, currentStep.duration);

    return () => clearTimeout(timer);
  }, [currentStepIndex, currentStep.duration, analysisSteps.length]);

  // Animate progress within each step
  useEffect(() => {
    setStepProgress(0);
    const progressTimer = setInterval(() => {
      setStepProgress(prev => {
        const increment = 100 / (currentStep.duration / 100);
        return Math.min(prev + increment, 100);
      });
    }, 100);

    return () => clearInterval(progressTimer);
  }, [currentStepIndex, currentStep.duration]);

  return (
    <div className="w-full rounded-lg border-2 border-electric-teal bg-charcoal/80 px-4 md:px-6 py-6 shadow-glow backdrop-blur-sm">
      {/* Overall Progress */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <div className="text-sm text-electric-teal/80">Business Analysis Progress</div>
          <div className="text-sm text-electric-teal/60">
            {Math.round(currentStep.progress)}%
          </div>
        </div>
        <div className="relative h-3 w-full rounded-full bg-charcoal border border-electric-teal/30">
          <motion.div
            className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-electric-teal to-electric-teal/70"
            initial={{ width: 0 }}
            animate={{ width: `${currentStep.progress}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
          {/* Shimmer effect */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-full"
            animate={{ x: [-100, 300] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          />
        </div>
      </div>

      {/* Current Step Status */}
      <div className="mb-4">
        <motion.div
          key={currentStepIndex}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center space-x-3"
        >
          {/* Animated Icon */}
          <div className="flex space-x-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-6 bg-electric-teal rounded-full"
                animate={{
                  scaleY: [0.5, 1.2, 0.5],
                  opacity: [0.5, 1, 0.5]
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.2,
                  ease: "easeInOut"
                }}
              />
            ))}
          </div>
          
          {/* Status Message */}
          <motion.p 
            className="text-electric-teal font-medium"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {currentStep.message}
          </motion.p>
        </motion.div>

        {/* Step Progress Bar */}
        <div className="mt-3 ml-8">
          <div className="h-2 w-full rounded-full bg-electric-teal/20">
            <motion.div
              className="h-full rounded-full bg-electric-teal/60"
              animate={{ width: `${stepProgress}%` }}
              transition={{ duration: 0.1 }}
            />
          </div>
        </div>
      </div>

      {/* Step Counter */}
      <div className="text-center">
        <motion.div
          className="text-sm text-electric-teal/60"
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          Step {currentStepIndex + 1} of {analysisSteps.length}
        </motion.div>
      </div>

      {/* Completed Steps List */}
      <div className="mt-4 max-h-32 overflow-y-auto">
        {analysisSteps.slice(0, currentStepIndex).map((step, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 0.5, x: 0 }}
            className="flex items-center text-xs text-electric-teal/40 py-1"
          >
            <span className="mr-2">✓</span>
            <span>{step.message}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default ProgressiveAnalysisLoader; 