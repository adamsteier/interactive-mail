'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DesignAssignment as DesignAssignmentType } from '../../services/designAssignmentService';

interface GenerationStep {
  id: string;
  phase: 'strategy' | 'design' | 'quality';
  icon: string;
  title: string;
  description: string;
  duration: number; // seconds to show this step
}

const generationSteps: GenerationStep[] = [
  // Strategy Phase (Blue)
  { id: '1', phase: 'strategy', icon: '🧠', title: 'Analyzing your business goals', description: 'Understanding your unique value proposition...', duration: 8 },
  { id: '2', phase: 'strategy', icon: '📊', title: 'Researching your target market', description: 'Studying local demographics and preferences...', duration: 7 },
  { id: '3', phase: 'strategy', icon: '✨', title: 'Consulting AI Creative Director', description: 'Tapping into thousands of successful campaigns...', duration: 9 },
  { id: '4', phase: 'strategy', icon: '📝', title: 'Crafting your creative brief', description: 'Writing compelling messaging strategies...', duration: 8 },
  { id: '5', phase: 'strategy', icon: '🎯', title: 'Optimizing for your audience', description: 'Tailoring tone and approach for maximum impact...', duration: 6 },
  
  // Design Phase (Purple)
  { id: '6', phase: 'design', icon: '🎨', title: 'Designing your postcard layout', description: 'Creating visually striking compositions...', duration: 10 },
  { id: '7', phase: 'design', icon: '🖼️', title: 'Generating custom imagery', description: 'Crafting unique visuals that tell your story...', duration: 12 },
  { id: '8', phase: 'design', icon: '🎭', title: 'Perfecting visual hierarchy', description: 'Ensuring your message stands out...', duration: 7 },
  { id: '9', phase: 'design', icon: '🌈', title: 'Applying brand colors', description: 'Harmonizing with your brand identity...', duration: 6 },
  { id: '10', phase: 'design', icon: '📐', title: 'Optimizing for print quality', description: 'Ensuring crisp, professional results...', duration: 8 },
  { id: '11', phase: 'design', icon: '🧪', title: 'Running A/B variations', description: 'Creating multiple options for comparison...', duration: 9 },
  { id: '12', phase: 'design', icon: '🎨', title: 'Fine-tuning color balance', description: 'Perfecting every shade and hue...', duration: 7 },
  { id: '13', phase: 'design', icon: '📏', title: 'Calibrating dimensions', description: 'Ensuring perfect postcard proportions...', duration: 5 },
  
  // Quality Phase (Green)
  { id: '14', phase: 'quality', icon: '🔍', title: 'Quality checking designs', description: 'Reviewing every pixel for perfection...', duration: 8 },
  { id: '15', phase: 'quality', icon: '⚡', title: 'Enhancing visual impact', description: 'Adding finishing touches for maximum appeal...', duration: 7 },
  { id: '16', phase: 'quality', icon: '📱', title: 'Testing readability', description: 'Ensuring your message is crystal clear...', duration: 6 },
  { id: '17', phase: 'quality', icon: '🎯', title: 'Maximizing conversion potential', description: 'Optimizing for response rates...', duration: 8 },
  { id: '18', phase: 'quality', icon: '🎪', title: 'Adding the wow factor', description: 'Sprinkling in that special something...', duration: 7 },
  { id: '19', phase: 'quality', icon: '🌟', title: 'Polishing to perfection', description: 'Adding those final professional touches...', duration: 6 },
  { id: '20', phase: 'quality', icon: '✅', title: 'Finalizing your masterpiece', description: 'Preparing your campaign-ready designs...', duration: 8 }
];

const phaseColors = {
  strategy: {
    primary: '#00F0FF',
    secondary: '#00F0FF/20',
    background: '#00F0FF/5',
    border: '#00F0FF/30'
  },
  design: {
    primary: '#8B5CF6',
    secondary: '#8B5CF6/20', 
    background: '#8B5CF6/5',
    border: '#8B5CF6/30'
  },
  quality: {
    primary: '#10B981',
    secondary: '#10B981/20',
    background: '#10B981/5', 
    border: '#10B981/30'
  }
};

interface EnhancedGenerationLoaderProps {
  assignments: Array<{
    designId: string;
    businessTypes: string[];
    leadCount: number;
    designName?: string;
    createdAt?: any;
  }>;
}

const EnhancedGenerationLoader = ({ assignments }: EnhancedGenerationLoaderProps) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; delay: number }>>([]);

  // Generate floating particles
  useEffect(() => {
    const newParticles = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 2
    }));
    setParticles(newParticles);
  }, []);

  // Progress through steps
  useEffect(() => {
    if (currentStepIndex >= generationSteps.length) return;

    const currentStep = generationSteps[currentStepIndex];
    const timer = setTimeout(() => {
      setCompletedSteps(prev => [...prev, currentStep.id]);
      setCurrentStepIndex(prev => prev + 1);
    }, currentStep.duration * 1000);

    return () => clearTimeout(timer);
  }, [currentStepIndex]);

  const currentStep = generationSteps[currentStepIndex];
  const currentPhase = currentStep?.phase || 'strategy';
  const colors = phaseColors[currentPhase];

  const getPhaseProgress = (phase: 'strategy' | 'design' | 'quality') => {
    const phaseSteps = generationSteps.filter(step => step.phase === phase);
    const completedPhaseSteps = phaseSteps.filter(step => completedSteps.includes(step.id));
    return (completedPhaseSteps.length / phaseSteps.length) * 100;
  };

  const overallProgress = (completedSteps.length / generationSteps.length) * 100;

  return (
    <div className="min-h-screen bg-[#1A1A1A] relative overflow-hidden">
      {/* Animated background particles */}
      <div className="absolute inset-0 pointer-events-none">
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute w-1 h-1 rounded-full opacity-30"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              backgroundColor: colors.primary
            }}
            animate={{
              y: [0, -20, 0],
              opacity: [0.3, 0.8, 0.3],
              scale: [1, 1.5, 1]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: particle.delay,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>

      {/* Gradient background */}
      <motion.div
        className="absolute inset-0 opacity-10"
        animate={{
          background: [
            `radial-gradient(600px circle at 20% 20%, ${colors.primary} 0%, transparent 50%)`,
            `radial-gradient(600px circle at 80% 80%, ${colors.primary} 0%, transparent 50%)`,
            `radial-gradient(600px circle at 20% 80%, ${colors.primary} 0%, transparent 50%)`,
            `radial-gradient(600px circle at 80% 20%, ${colors.primary} 0%, transparent 50%)`
          ]
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
      />

      <div className="relative z-10 flex items-center justify-center min-h-screen p-6">
        <div className="max-w-4xl mx-auto text-center">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-4xl font-bold text-[#EAEAEA] mb-4">
              🎨 Creating Your Campaign Designs
            </h1>
            <p className="text-[#EAEAEA]/60 text-lg mb-2">
              Our AI is crafting {assignments.length} unique postcard design{assignments.length > 1 ? 's' : ''} for your campaign
            </p>
            <p className="text-[#EAEAEA]/40 text-sm">
              This process typically takes 2-5 minutes • Grab a coffee and watch the magic happen ✨
            </p>
          </motion.div>

          {/* Phase Progress Bars */}
          <div className="mb-12 space-y-4">
            {(['strategy', 'design', 'quality'] as const).map((phase) => {
              const progress = getPhaseProgress(phase);
              const phaseColor = phaseColors[phase];
              const isActive = currentPhase === phase;
              
              return (
                <div key={phase} className="text-left">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-medium ${isActive ? 'text-[#EAEAEA]' : 'text-[#EAEAEA]/60'}`}>
                      {phase === 'strategy' && '🧠 Strategy & Brief Creation'}
                      {phase === 'design' && '🎨 Visual Design & Layout'}
                      {phase === 'quality' && '✅ Quality & Optimization'}
                    </span>
                    <span className={`text-xs ${isActive ? 'text-[#EAEAEA]/80' : 'text-[#EAEAEA]/40'}`}>
                      {Math.round(progress)}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-[#2F2F2F] rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: phaseColor.primary }}
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Current Step Display */}
          <AnimatePresence mode="wait">
            {currentStep && (
              <motion.div
                key={currentStep.id}
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.9 }}
                transition={{ duration: 0.5 }}
                className="mb-12"
              >
                <div 
                  className="inline-block p-8 rounded-2xl border-2 relative"
                  style={{ 
                    backgroundColor: colors.background,
                    borderColor: colors.border
                  }}
                >
                  {/* Pulsing glow effect */}
                  <motion.div
                    className="absolute inset-0 rounded-2xl opacity-50"
                    style={{ backgroundColor: colors.secondary }}
                    animate={{ 
                      scale: [1, 1.05, 1],
                      opacity: [0.3, 0.6, 0.3]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  
                  <div className="relative z-10">
                    <motion.div
                      className="text-6xl mb-4"
                      animate={{ 
                        rotate: [0, 10, -10, 0],
                        scale: [1, 1.1, 1]
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      {currentStep.icon}
                    </motion.div>
                    <h3 className="text-2xl font-bold text-[#EAEAEA] mb-3">
                      {currentStep.title}
                    </h3>
                    <p className="text-[#EAEAEA]/70 text-lg">
                      {currentStep.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Overall Progress */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[#EAEAEA] font-medium">Overall Progress</span>
              <span className="text-[#EAEAEA]/80">{Math.round(overallProgress)}%</span>
            </div>
            <div className="w-full h-3 bg-[#2F2F2F] rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-[#00F0FF] via-[#8B5CF6] to-[#10B981] rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${overallProgress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          {/* Campaign Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            {assignments.map((assignment, index) => (
              <div key={assignment.designId} className="bg-[#2F2F2F]/50 rounded-lg p-4 border border-[#00F0FF]/20">
                <div className="text-[#00F0FF] font-semibold mb-1">
                  Design {index + 1}
                </div>
                <div className="text-[#EAEAEA]/80 text-sm mb-1">
                  {assignment.designName || 'Custom Design'}
                </div>
                <div className="text-[#EAEAEA]/60 text-xs">
                  {assignment.leadCount} leads
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedGenerationLoader;
