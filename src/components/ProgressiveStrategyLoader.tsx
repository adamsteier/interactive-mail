import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface StrategyStep {
  message: string;
  duration: number; // in milliseconds
  progress: number; // cumulative progress percentage
}

const ProgressiveStrategyLoader = () => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepProgress, setStepProgress] = useState(0);

  const strategySteps: StrategyStep[] = [
    { message: "Processing business analysis data...", duration: 2000, progress: 12 },
    { message: "Identifying ideal target business types...", duration: 2800, progress: 25 },
    { message: "Calculating market reach and opportunity...", duration: 2400, progress: 40 },
    { message: "Evaluating direct mail effectiveness...", duration: 2200, progress: 52 },
    { message: "Analyzing database targeting options...", duration: 2600, progress: 65 },
    { message: "Optimizing campaign cost estimates...", duration: 2000, progress: 78 },
    { message: "Generating personalized recommendations...", duration: 2400, progress: 90 },
    { message: "Finalizing marketing strategy...", duration: 1800, progress: 100 }
  ];

  const currentStep = strategySteps[currentStepIndex];

  useEffect(() => {
    if (currentStepIndex >= strategySteps.length - 1) return;

    const timer = setTimeout(() => {
      setCurrentStepIndex(prev => Math.min(prev + 1, strategySteps.length - 1));
      setStepProgress(0);
    }, currentStep.duration);

    return () => clearTimeout(timer);
  }, [currentStepIndex, currentStep.duration, strategySteps.length]);

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
    <div className="w-full rounded-lg border-2 border-electric-teal bg-charcoal/80 px-4 md:px-6 py-5 shadow-glow backdrop-blur-sm">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-electric-teal mb-1">
          Generating Marketing Strategy
        </h3>
        <p className="text-sm text-electric-teal/60">
          Creating personalized recommendations for your business
        </p>
      </div>

      {/* Overall Progress */}
      <div className="mb-5">
        <div className="flex justify-between items-center mb-2">
          <div className="text-sm text-electric-teal/80">Strategy Progress</div>
          <div className="text-sm text-electric-teal/60">
            {Math.round(currentStep.progress)}%
          </div>
        </div>
        <div className="relative h-3 w-full rounded-full bg-charcoal border border-electric-teal/30">
          <motion.div
            className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-neon-magenta to-electric-teal"
            initial={{ width: 0 }}
            animate={{ width: `${currentStep.progress}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
          {/* Shimmer effect */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent rounded-full"
            animate={{ x: [-100, 300] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
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
          {/* Animated Strategy Icon */}
          <motion.div
            className="relative"
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          >
            <div className="w-8 h-8 border-2 border-electric-teal rounded-full flex items-center justify-center">
              <motion.div
                className="w-2 h-2 bg-neon-magenta rounded-full"
                animate={{ scale: [1, 1.5, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
            </div>
          </motion.div>
          
          {/* Status Message */}
          <motion.p 
            className="text-electric-teal font-medium flex-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {currentStep.message}
          </motion.p>
        </motion.div>

        {/* Step Progress Bar */}
        <div className="mt-3 ml-11">
          <div className="h-2 w-full rounded-full bg-electric-teal/20">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-electric-teal/60 to-neon-magenta/60"
              animate={{ width: `${stepProgress}%` }}
              transition={{ duration: 0.1 }}
            />
          </div>
        </div>
      </div>

      {/* Step Counter and ETA */}
      <div className="flex justify-between items-center text-sm">
        <motion.div
          className="text-electric-teal/60"
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          Step {currentStepIndex + 1} of {strategySteps.length}
        </motion.div>
        
        <motion.div
          className="text-neon-magenta/60"
          animate={{ opacity: [0.8, 1, 0.8] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          {currentStepIndex < strategySteps.length - 1 
            ? `~${Math.round((strategySteps.length - currentStepIndex - 1) * 2.3)}s remaining`
            : 'Almost done!'
          }
        </motion.div>
      </div>
    </div>
  );
};

export default ProgressiveStrategyLoader; 