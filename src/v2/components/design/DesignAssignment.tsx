'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AssignmentStrategy, 
  type DesignAssignment, 
  getAssignmentStrategies,
  validateAssignments,
  AssignmentSummary
} from '../../services/designAssignmentService';

interface DesignAssignmentProps {
  businessTypes: Array<{ type: string; count: number }>;
  totalLeads: number;
  onAssignmentComplete: (assignments: DesignAssignment[], strategy: AssignmentStrategy['type']) => void;
  initialStrategy?: AssignmentStrategy['type'];
  loading?: boolean;
}

const DesignAssignment = ({ 
  businessTypes, 
  totalLeads, 
  onAssignmentComplete,
  initialStrategy,
  loading = false
}: DesignAssignmentProps) => {
  const [selectedStrategy, setSelectedStrategy] = useState<AssignmentStrategy['type'] | null>(
    initialStrategy || null
  );
  const [customAssignments, setCustomAssignments] = useState<DesignAssignment[]>([]);
  const [showCustomInterface, setShowCustomInterface] = useState(false);

  const strategies = getAssignmentStrategies(
    businessTypes.map(bt => bt.type), 
    totalLeads
  );

  // Handle completion
  const handleComplete = useCallback((strategy: AssignmentStrategy['type'], assignments?: DesignAssignment[]) => {
    let finalAssignments: DesignAssignment[] = [];

    switch (strategy) {
      case 'unified':
        finalAssignments = [{
          designId: 'design_1',
          businessTypes: businessTypes.map(bt => bt.type),
          leadCount: totalLeads,
          designName: 'Universal Design'
        }];
        break;
      
      case 'per-type':
        finalAssignments = businessTypes.map((bt, index) => ({
          designId: `design_${index + 1}`,
          businessTypes: [bt.type],
          leadCount: bt.count,
          designName: `${bt.type.charAt(0).toUpperCase() + bt.type.slice(1)} Design`
        }));
        break;
      
      case 'custom':
        finalAssignments = assignments || customAssignments;
        break;
    }

    onAssignmentComplete(finalAssignments, strategy);
  }, [businessTypes, totalLeads, customAssignments, onAssignmentComplete]);

  // Handle strategy selection
  const handleStrategySelect = useCallback((strategy: AssignmentStrategy['type']) => {
    setSelectedStrategy(strategy);
    
    if (strategy === 'custom') {
      setShowCustomInterface(true);
      // Initialize with per-type assignments as starting point
      const initialAssignments: DesignAssignment[] = businessTypes.map((bt, index) => ({
        designId: `design_${index + 1}`,
        businessTypes: [bt.type],
        leadCount: bt.count,
        designName: `${bt.type.charAt(0).toUpperCase() + bt.type.slice(1)} Design`
      }));
      setCustomAssignments(initialAssignments);
    } else {
      setShowCustomInterface(false);
      handleComplete(strategy);
    }
  }, [businessTypes, handleComplete]);

  // Custom assignment management
  const handleCustomAssignmentChange = useCallback((updatedAssignments: DesignAssignment[]) => {
    setCustomAssignments(updatedAssignments);
  }, []);

  const handleCustomComplete = useCallback(() => {
    const summary: AssignmentSummary = {
      totalLeads,
      totalDesigns: customAssignments.length,
      assignments: customAssignments,
      businessTypes: businessTypes.map(bt => ({
        type: bt.type,
        count: bt.count,
        assignedDesignId: customAssignments.find(a => a.businessTypes.includes(bt.type))?.designId
      })),
      strategy: 'custom'
    };

    const validation = validateAssignments(summary);
    if (validation.isValid) {
      handleComplete('custom', customAssignments);
    }
  }, [customAssignments, businessTypes, totalLeads, handleComplete]);

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <motion.div
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="flex space-x-1 mb-4">
            {[0, 1, 2, 3, 4].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-8 bg-[#00F0FF] rounded-full"
                animate={{
                  scaleY: [0.5, 1.5, 0.5],
                  opacity: [0.5, 1, 0.5]
                }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  delay: i * 0.1,
                  ease: "easeInOut"
                }}
              />
            ))}
          </div>
          <p className="text-[#00F0FF] text-lg font-medium">Analyzing business types...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Strategy Selection */}
      {!showCustomInterface && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-[#EAEAEA] mb-2">
              Design Assignment Strategy
            </h2>
            <p className="text-[#EAEAEA]/60">
              Choose how to assign designs to your {businessTypes.length} business types
            </p>
          </div>

          {/* Business Types Summary */}
          <div className="bg-[#2F2F2F]/50 rounded-lg p-4 border border-[#00F0FF]/20 mb-6">
            <h3 className="text-[#EAEAEA] font-medium mb-3">Your Business Types</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {businessTypes.map((bt) => (
                <div
                  key={bt.type}
                  className="flex items-center justify-between bg-[#1A1A1A] rounded-lg p-3 border border-[#2F2F2F]"
                >
                  <span className="text-[#EAEAEA] capitalize">
                    {bt.type.replace(/_/g, ' ')}
                  </span>
                  <span className="text-[#00F0FF] font-semibold">
                    {bt.count} leads
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Strategy Options */}
          <div className="grid gap-4">
            {strategies.map((strategy, index) => (
              <motion.div
                key={strategy.type}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`
                  relative cursor-pointer rounded-lg border-2 transition-all duration-200 p-6
                  ${selectedStrategy === strategy.type
                    ? 'border-[#00F0FF] bg-[#00F0FF]/10 shadow-[0_0_20px_rgba(0,240,255,0.3)]'
                    : 'border-[#2F2F2F] bg-[#2F2F2F]/30 hover:border-[#00F0FF]/50 hover:bg-[#00F0FF]/5'
                  }
                `}
                onClick={() => handleStrategySelect(strategy.type)}
              >
                <div className="flex items-start gap-4">
                  {/* Radio Button */}
                  <div className={`
                    w-6 h-6 rounded-full border-2 flex items-center justify-center mt-1 transition-all
                    ${selectedStrategy === strategy.type
                      ? 'border-[#00F0FF] bg-[#00F0FF]'
                      : 'border-[#2F2F2F] bg-transparent'
                    }
                  `}>
                    {selectedStrategy === strategy.type && (
                      <div className="w-2 h-2 bg-[#1A1A1A] rounded-full" />
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold text-[#EAEAEA]">
                        {strategy.label}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-[#EAEAEA]/60">
                        {strategy.designCount > 0 && (
                          <span>{strategy.designCount} design{strategy.designCount > 1 ? 's' : ''}</span>
                        )}
                        <span>{strategy.estimatedTime}</span>
                      </div>
                    </div>
                    <p className="text-[#EAEAEA]/80 mb-3">
                      {strategy.description}
                    </p>

                    {/* Strategy Preview */}
                    {strategy.type === 'unified' && (
                      <div className="bg-[#1A1A1A] rounded-lg p-3 border border-[#2F2F2F]">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-[#00F0FF] rounded-full"></div>
                          <span className="text-[#EAEAEA] text-sm">Single design for all business types</span>
                        </div>
                      </div>
                    )}

                    {strategy.type === 'per-type' && (
                      <div className="bg-[#1A1A1A] rounded-lg p-3 border border-[#2F2F2F]">
                        <div className="space-y-1">
                          {businessTypes.slice(0, 3).map((bt, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <div className="w-3 h-3 bg-[#00F0FF] rounded-full"></div>
                              <span className="text-[#EAEAEA] text-sm capitalize">
                                {bt.type.replace(/_/g, ' ')} → Dedicated design
                              </span>
                            </div>
                          ))}
                          {businessTypes.length > 3 && (
                            <div className="text-[#EAEAEA]/60 text-xs ml-5">
                              +{businessTypes.length - 3} more designs
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {strategy.type === 'custom' && (
                      <div className="bg-[#1A1A1A] rounded-lg p-3 border border-[#2F2F2F]">
                        <div className="text-[#EAEAEA] text-sm">
                          Create multiple designs and assign business types manually
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Selection Indicator */}
                {selectedStrategy === strategy.type && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-4 right-4 w-6 h-6 bg-[#00F0FF] rounded-full flex items-center justify-center"
                  >
                    <svg className="w-4 h-4 text-[#1A1A1A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>

          {/* Continue Button */}
          {selectedStrategy && selectedStrategy !== 'custom' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-center pt-6"
            >
              <button
                onClick={() => handleComplete(selectedStrategy)}
                className="bg-[#00F0FF] text-[#1A1A1A] px-8 py-3 rounded-lg font-semibold hover:bg-[#FF00B8] transition-all duration-200 hover:shadow-[0_0_20px_rgba(255,0,184,0.4)] flex items-center gap-2"
              >
                Continue with {strategies.find(s => s.type === selectedStrategy)?.label}
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Custom Assignment Interface */}
      <AnimatePresence>
        {showCustomInterface && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-[#EAEAEA] mb-2">
                  Custom Design Assignment
                </h2>
                <p className="text-[#EAEAEA]/60">
                  Create and assign designs to specific business types
                </p>
              </div>
              <button
                onClick={() => {
                  setShowCustomInterface(false);
                  setSelectedStrategy(null);
                }}
                className="text-[#EAEAEA]/60 hover:text-[#FF00B8] transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <CustomAssignmentInterface
              businessTypes={businessTypes}
              assignments={customAssignments}
              onAssignmentsChange={handleCustomAssignmentChange}
              onComplete={handleCustomComplete}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface CustomAssignmentInterfaceProps {
  businessTypes: Array<{ type: string; count: number }>;
  assignments: DesignAssignment[];
  onAssignmentsChange: (assignments: DesignAssignment[]) => void;
  onComplete: () => void;
}

const CustomAssignmentInterface = ({
  businessTypes,
  assignments,
  onAssignmentsChange,
  onComplete
}: CustomAssignmentInterfaceProps) => {
  const [draggedType, setDraggedType] = useState<string | null>(null);

  const addNewDesign = () => {
    const newDesign: DesignAssignment = {
      designId: `design_${assignments.length + 1}`,
      businessTypes: [],
      leadCount: 0,
      designName: `Design ${assignments.length + 1}`
    };
    onAssignmentsChange([...assignments, newDesign]);
  };

  const updateAssignment = (designId: string, businessType: string, action: 'add' | 'remove') => {
    const updatedAssignments = assignments.map(assignment => {
      if (assignment.designId === designId) {
        if (action === 'add' && !assignment.businessTypes.includes(businessType)) {
          const typeData = businessTypes.find(bt => bt.type === businessType);
          return {
            ...assignment,
            businessTypes: [...assignment.businessTypes, businessType],
            leadCount: assignment.leadCount + (typeData?.count || 0)
          };
        } else if (action === 'remove') {
          const typeData = businessTypes.find(bt => bt.type === businessType);
          return {
            ...assignment,
            businessTypes: assignment.businessTypes.filter(bt => bt !== businessType),
            leadCount: assignment.leadCount - (typeData?.count || 0)
          };
        }
      }
      return assignment;
    });

    onAssignmentsChange(updatedAssignments);
  };

  // Validation
  const summary: AssignmentSummary = {
    totalLeads: businessTypes.reduce((sum, bt) => sum + bt.count, 0),
    totalDesigns: assignments.length,
    assignments,
    businessTypes: businessTypes.map(bt => ({
      type: bt.type,
      count: bt.count,
      assignedDesignId: assignments.find(a => a.businessTypes.includes(bt.type))?.designId
    })),
    strategy: 'custom'
  };

  const validation = validateAssignments(summary);

  return (
    <div className="space-y-6">
      {/* Unassigned Business Types */}
      <div className="bg-[#2F2F2F]/50 rounded-lg p-4 border border-[#00F0FF]/20">
        <h3 className="text-[#EAEAEA] font-medium mb-3">Unassigned Business Types</h3>
        <div className="flex flex-wrap gap-2">
          {businessTypes
            .filter(bt => !assignments.some(a => a.businessTypes.includes(bt.type)))
            .map(bt => (
              <div
                key={bt.type}
                draggable
                onDragStart={() => setDraggedType(bt.type)}
                onDragEnd={() => setDraggedType(null)}
                className="bg-[#1A1A1A] border border-[#2F2F2F] rounded-lg px-3 py-2 cursor-move hover:border-[#00F0FF]/50 transition-colors"
              >
                <span className="text-[#EAEAEA] capitalize">
                  {bt.type.replace(/_/g, ' ')}
                </span>
                <span className="text-[#00F0FF] ml-2 text-sm">
                  ({bt.count} leads)
                </span>
              </div>
            ))}
        </div>
      </div>

      {/* Design Assignments */}
      <div className="space-y-4">
        {assignments.map((assignment) => (
          <div
            key={assignment.designId}
            className="bg-[#2F2F2F]/50 rounded-lg p-4 border border-[#2F2F2F] hover:border-[#00F0FF]/30 transition-colors"
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (draggedType) {
                updateAssignment(assignment.designId, draggedType, 'add');
                setDraggedType(null);
              }
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-[#EAEAEA] font-medium">
                {assignment.designName}
              </h4>
              <div className="text-[#00F0FF] text-sm">
                {assignment.leadCount} leads
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {assignment.businessTypes.map(type => (
                <div
                  key={type}
                  className="bg-[#00F0FF]/20 border border-[#00F0FF]/40 rounded-lg px-3 py-1 flex items-center gap-2"
                >
                  <span className="text-[#00F0FF] capitalize">
                    {type.replace(/_/g, ' ')}
                  </span>
                  <button
                    onClick={() => updateAssignment(assignment.designId, type, 'remove')}
                    className="text-[#FF00B8] hover:text-[#FF00B8]/80 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Add Design Button */}
        <button
          onClick={addNewDesign}
          className="w-full p-4 border-2 border-dashed border-[#2F2F2F] rounded-lg hover:border-[#00F0FF]/50 transition-colors text-[#EAEAEA]/60 hover:text-[#00F0FF]"
        >
          + Add New Design
        </button>
      </div>

      {/* Validation Messages */}
      {validation.errors.length > 0 && (
        <div className="bg-[#FF00B8]/20 border border-[#FF00B8]/40 rounded-lg p-4">
          <h4 className="text-[#FF00B8] font-medium mb-2">Issues to resolve:</h4>
          <ul className="text-[#FF00B8] text-sm space-y-1">
            {validation.errors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Complete Button */}
      <div className="flex justify-center pt-6">
        <button
          onClick={onComplete}
          disabled={!validation.isValid}
          className="bg-[#00F0FF] text-[#1A1A1A] px-8 py-3 rounded-lg font-semibold hover:bg-[#FF00B8] transition-all duration-200 hover:shadow-[0_0_20px_rgba(255,0,184,0.4)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          Complete Assignment
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default DesignAssignment; 