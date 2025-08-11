'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CreativeBrief, BriefGenerationRequest } from '@/v2/types/design';
import { useAuth } from '@/contexts/AuthContext';

interface CreativeBriefSelectorProps {
  campaignId: string;
  brandId: string;
  generationRequest: BriefGenerationRequest;
  onBriefSelected: (brief: CreativeBrief) => void;
  onBack: () => void;
}

interface GenerationResponse {
  success: boolean;
  jobId: string;
  briefs: CreativeBrief[];
  totalGenerated: number;
  errors?: string[];
}

const CreativeBriefSelector = ({
  // campaignId,
  // brandId, 
  generationRequest,
  onBriefSelected,
  onBack
}: CreativeBriefSelectorProps) => {
  const { user } = useAuth();
  const [briefs, setBriefs] = useState<CreativeBrief[]>([]);
  const [generating, setGenerating] = useState(false);
  const [editingBrief, setEditingBrief] = useState<string | null>(null);
  const [editedTexts, setEditedTexts] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<string[]>([]);
  const [completedCount, setCompletedCount] = useState(0);
  const totalBriefs = 4;

  const generateBriefs = useCallback(async () => {
    if (!user) return;

    try {
      setGenerating(true);
      setErrors([]);
      setBriefs([]);
      setCompletedCount(0);

      const token = await user.getIdToken();
      
      const response = await fetch('/api/v2/generate-creative-briefs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(generationRequest)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate briefs');
      }

      const result: GenerationResponse = await response.json();
      
      if (result.success) {
        setBriefs(result.briefs);
        setCompletedCount(result.totalGenerated);
        
        if (result.errors && result.errors.length > 0) {
          setErrors(result.errors);
        }
      } else {
        throw new Error('Failed to generate briefs');
      }

    } catch (error) {
      console.error('Error generating briefs:', error);
      setErrors([error instanceof Error ? error.message : 'Unknown error occurred']);
    } finally {
      setGenerating(false);
    }
  }, [user, generationRequest]);

  const handleEditBrief = useCallback((briefId: string) => {
    const brief = briefs.find(b => b.id === briefId);
    if (brief) {
      setEditedTexts(prev => ({
        ...prev,
        [briefId]: prev[briefId] || brief.briefText
      }));
      setEditingBrief(briefId);
    }
  }, [briefs]);

  // Generate briefs on mount
  useEffect(() => {
    generateBriefs();
  }, [generateBriefs]);

  const handleSaveEdit = useCallback((briefId: string) => {
    const editedText = editedTexts[briefId];
    if (!editedText) return;

    setBriefs(prev => prev.map(brief => 
      brief.id === briefId 
        ? { 
            ...brief, 
            briefText: editedText, 
            edited: true,
            originalBriefText: brief.originalBriefText || brief.briefText 
          }
        : brief
    ));
    setEditingBrief(null);
  }, [editedTexts]);

  const handleCancelEdit = useCallback((briefId: string) => {
    setEditedTexts(prev => {
      const updated = { ...prev };
      delete updated[briefId];
      return updated;
    });
    setEditingBrief(null);
  }, []);

  const handleSelectBrief = useCallback((brief: CreativeBrief) => {
    const finalBrief = {
      ...brief,
      briefText: editedTexts[brief.id] || brief.briefText,
      edited: !!editedTexts[brief.id],
      selected: true
    };
    onBriefSelected(finalBrief);
  }, [editedTexts, onBriefSelected]);

  const getTemperatureLabel = (temp: number): { label: string; color: string; description: string } => {
    if (temp <= 0.5) return { 
      label: 'Conservative', 
      color: 'text-blue-400', 
      description: 'Safe, proven approach' 
    };
    if (temp <= 0.7) return { 
      label: 'Balanced', 
      color: 'text-green-400', 
      description: 'Good mix of creativity and reliability' 
    };
    if (temp <= 0.9) return { 
      label: 'Creative', 
      color: 'text-yellow-400', 
      description: 'More adventurous and unique' 
    };
    return { 
      label: 'Experimental', 
      color: 'text-red-400', 
      description: 'Highly creative and bold' 
    };
  };

  const getModelIcon = (model: string) => {
    return model === 'gpt-4.1' ? '⚡' : '🎯';
  };

  return (
    <div className="max-w-6xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-[#EAEAEA] mb-2">
            Creative Briefs
          </h2>
          <p className="text-[#EAEAEA]/60 mb-4">
            Choose or edit a creative brief to generate your postcard design
          </p>
        </div>

        {/* Generation Status */}
        {generating && (
          <div className="bg-[#2F2F2F]/50 rounded-lg p-6 border border-[#00F0FF]/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[#EAEAEA] font-medium">Generating Creative Briefs</h3>
              <div className="text-[#00F0FF] text-sm">
                {completedCount} / {totalBriefs} complete
              </div>
            </div>
            
            <div className="w-full bg-[#1A1A1A] rounded-full h-2 mb-4">
              <motion.div
                className="bg-[#00F0FF] h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${(completedCount / totalBriefs) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            
            <p className="text-[#EAEAEA]/60 text-sm">
              Generating your creative briefs to create your postcard imagery...
            </p>
          </div>
        )}

        {/* Error Display */}
        {errors.length > 0 && (
          <div className="bg-[#FF00B8]/10 rounded-lg p-4 border border-[#FF00B8]/30">
            <h4 className="text-[#FF00B8] font-medium mb-2">Generation Errors</h4>
            <ul className="text-[#FF00B8]/80 text-sm space-y-1">
              {errors.map((error, index) => (
                <li key={index}>• {error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Generated Briefs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AnimatePresence>
            {briefs.map((brief, index) => {
              const tempInfo = getTemperatureLabel(brief.temperature);
              const isEditing = editingBrief === brief.id;
              const editedText = editedTexts[brief.id];
              const currentText = editedText || brief.briefText;
              
              return (
                <motion.div
                  key={brief.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-[#2F2F2F]/50 rounded-lg border border-[#00F0FF]/20 overflow-hidden"
                >
                  {/* Brief Header */}
                  <div className="p-4 border-b border-[#00F0FF]/10">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getModelIcon(brief.model)}</span>
                        <span className="text-[#EAEAEA] font-medium">
                          Brief {index + 1}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full bg-[#1A1A1A] ${tempInfo.color}`}>
                          {tempInfo.label}
                        </span>
                      </div>
                      {brief.edited && (
                        <span className="text-xs text-[#00F0FF] bg-[#00F0FF]/20 px-2 py-1 rounded">
                          Edited
                        </span>
                      )}
                    </div>
                    
                    <p className="text-[#EAEAEA]/60 text-xs">
                      {brief.model} • Temperature: {brief.temperature} • {tempInfo.description}
                    </p>
                  </div>

                  {/* Brief Content */}
                  <div className="p-4">
                    {isEditing ? (
                      <div className="space-y-4">
                        <textarea
                          value={currentText}
                          onChange={(e) => setEditedTexts(prev => ({
                            ...prev,
                            [brief.id]: e.target.value
                          }))}
                          className="w-full h-80 px-3 py-2 bg-[#1A1A1A] border border-[#00F0FF]/30 rounded-lg text-[#EAEAEA] text-sm placeholder-[#EAEAEA]/60 focus:outline-none focus:ring-2 focus:ring-[#00F0FF] resize-none"
                          placeholder="Edit your creative brief..."
                        />
                        
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSaveEdit(brief.id)}
                            className="px-4 py-2 bg-[#00F0FF] text-[#1A1A1A] rounded-lg font-medium hover:bg-[#00F0FF]/90 transition-colors text-sm"
                          >
                            Save Changes
                          </button>
                          <button
                            onClick={() => handleCancelEdit(brief.id)}
                            className="px-4 py-2 bg-[#2F2F2F] text-[#EAEAEA] rounded-lg font-medium hover:bg-[#2F2F2F]/80 transition-colors text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="max-h-80 overflow-y-auto">
                          <pre className="text-[#EAEAEA]/80 text-sm whitespace-pre-wrap font-sans leading-relaxed">
                            {currentText}
                          </pre>
                        </div>
                        
                        <div className="flex gap-2 pt-2 border-t border-[#00F0FF]/10">
                          <button
                            onClick={() => handleEditBrief(brief.id)}
                            className="px-3 py-2 bg-[#2F2F2F] text-[#EAEAEA] rounded-lg font-medium hover:bg-[#2F2F2F]/80 transition-colors text-sm"
                          >
                            Edit Brief
                          </button>
                          <button
                            onClick={() => handleSelectBrief(brief)}
                            className="px-4 py-2 bg-[#00F0FF] text-[#1A1A1A] rounded-lg font-medium hover:bg-[#FF00B8] transition-colors text-sm"
                          >
                            Use This Brief
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-6">
          <button
            onClick={onBack}
            className="px-6 py-3 bg-[#2F2F2F] text-[#EAEAEA] rounded-lg font-medium hover:bg-[#2F2F2F]/80 transition-colors"
          >
            Back to Form
          </button>
          
          {briefs.length > 0 && (
            <button
              onClick={generateBriefs}
              disabled={generating}
              className="px-6 py-3 bg-[#00F0FF]/20 text-[#00F0FF] rounded-lg font-medium hover:bg-[#00F0FF]/30 transition-colors border border-[#00F0FF]/30 disabled:opacity-50"
            >
              {generating ? 'Generating...' : 'Generate New Briefs'}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default CreativeBriefSelector; 