import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import BusinessTypeAnalysisLoader from './BusinessTypeAnalysisLoader';

interface AddBusinessTypesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (businessTypes: string[]) => Promise<void>;
  existingTypes: string[];
}

const AddBusinessTypesModal = ({ isOpen, onClose, onAdd, existingTypes }: AddBusinessTypesModalProps) => {
  const [businessTypes, setBusinessTypes] = useState<string[]>(['']);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [duplicateWarnings, setDuplicateWarnings] = useState<Set<number>>(new Set());

  const addBusinessTypeField = () => {
    setBusinessTypes([...businessTypes, '']);
  };

  const removeBusinessTypeField = (index: number) => {
    if (businessTypes.length > 1) {
      const newTypes = businessTypes.filter((_, i) => i !== index);
      setBusinessTypes(newTypes);
      // Remove warning for this index
      const newWarnings = new Set(duplicateWarnings);
      newWarnings.delete(index);
      setDuplicateWarnings(newWarnings);
    }
  };

  const updateBusinessType = (index: number, value: string) => {
    const newTypes = [...businessTypes];
    newTypes[index] = value;
    setBusinessTypes(newTypes);

    // Check for duplicates
    const newWarnings = new Set(duplicateWarnings);
    const trimmedValue = value.trim().toLowerCase();
    
    if (trimmedValue && existingTypes.some(type => type.toLowerCase() === trimmedValue)) {
      newWarnings.add(index);
    } else {
      newWarnings.delete(index);
    }
    
    setDuplicateWarnings(newWarnings);
  };

  const handleSubmit = async () => {
    const validTypes = businessTypes
      .map(type => type.trim())
      .filter(type => type.length > 0);

    if (validTypes.length === 0) {
      return;
    }

    // Check if all types are duplicates
    const hasDuplicates = validTypes.some(type => 
      existingTypes.some(existing => existing.toLowerCase() === type.toLowerCase())
    );

    if (hasDuplicates && duplicateWarnings.size > 0) {
      // Don't proceed if there are duplicate warnings
      return;
    }

    try {
      setIsAnalyzing(true);
      await onAdd(validTypes);
      // Reset form
      setBusinessTypes(['']);
      setDuplicateWarnings(new Set());
      onClose();
    } catch (error) {
      console.error('Failed to add business types:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleClose = () => {
    if (!isAnalyzing) {
      setBusinessTypes(['']);
      setDuplicateWarnings(new Set());
      onClose();
    }
  };

  const canSubmit = businessTypes.some(type => type.trim().length > 0) && 
                   duplicateWarnings.size === 0 && 
                   !isAnalyzing;

  if (isAnalyzing) {
    return (
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md mx-4"
            >
              <BusinessTypeAnalysisLoader businessTypes={businessTypes.filter(type => type.trim())} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && handleClose()}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-md bg-charcoal rounded-lg border-2 border-electric-teal shadow-glow mx-4"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-electric-teal/20">
              <h2 className="text-xl font-semibold text-electric-teal">Add Business Types</h2>
              <button
                onClick={handleClose}
                className="text-electric-teal/60 hover:text-electric-teal transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-electric-teal/80 text-sm mb-4">
                Add specific business types you'd like to target with direct mail.
              </p>

              {/* Business Type Input Fields */}
              <div className="space-y-3 mb-6">
                {businessTypes.map((type, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center space-x-2"
                  >
                    <div className="flex-1">
                      <input
                        type="text"
                        value={type}
                        onChange={(e) => updateBusinessType(index, e.target.value)}
                        placeholder="e.g., Hair Salons, Auto Repair Shops"
                        className={`w-full px-3 py-2 bg-charcoal border rounded-lg text-electric-teal placeholder-electric-teal/50 focus:outline-none focus:ring-2 transition-colors ${
                          duplicateWarnings.has(index)
                            ? 'border-red-500 focus:ring-red-500/50'
                            : 'border-electric-teal/30 focus:ring-electric-teal/50'
                        }`}
                      />
                      {duplicateWarnings.has(index) && (
                        <motion.p
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="text-red-400 text-xs mt-1"
                        >
                          This business type already exists in your target list
                        </motion.p>
                      )}
                    </div>
                    
                    {businessTypes.length > 1 && (
                      <button
                        onClick={() => removeBusinessTypeField(index)}
                        className="text-electric-teal/60 hover:text-red-400 transition-colors p-1"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </motion.div>
                ))}

                {/* Add More Button */}
                <motion.button
                  onClick={addBusinessTypeField}
                  className="flex items-center space-x-2 text-electric-teal/70 hover:text-electric-teal transition-colors py-2"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>Add another business type</span>
                </motion.button>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={handleClose}
                  className="flex-1 px-4 py-2 border border-electric-teal/30 text-electric-teal/80 rounded-lg hover:bg-electric-teal/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                    canSubmit
                      ? 'bg-electric-teal text-charcoal hover:bg-electric-teal/90'
                      : 'bg-electric-teal/20 text-electric-teal/50 cursor-not-allowed'
                  }`}
                >
                  Analyze & Add
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AddBusinessTypesModal;