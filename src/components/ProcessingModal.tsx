'use client';

import { useState, useEffect } from 'react';

interface BusinessResult {
  name: string;
  address: string;
  phone?: string;
  website?: string;
  rating?: string;
  reviews?: number;
}

interface BusinessProgress {
  name: string;
  status: 'waiting' | 'processing' | 'complete' | 'error';
  message: string;
  progress: number;
  results?: BusinessResult[];
}

interface ProcessingModalProps {
  selectedBusinesses: Array<{ name: string; count: number }>;
  targetArea: string;
  onComplete: () => void;
  onClose: () => void;
}

const ProcessingModal = ({ selectedBusinesses, targetArea, onComplete, onClose }: ProcessingModalProps) => {
  const [businessProgress, setBusinessProgress] = useState<BusinessProgress[]>(() =>
    selectedBusinesses.map(business => ({
      name: business.name,
      status: 'waiting',
      message: 'Waiting to process...',
      progress: 0
    }))
  );

  const [showResults, setShowResults] = useState(false);

  const pollTaskStatus = async (taskId: string) => {
    while (true) {
      const response = await fetch(`/api/browse-ai/task/${taskId}`);
      const data = await response.json();
      
      if (data.status === 'complete') {
        return data.results;
      } else if (data.status === 'error') {
        throw new Error('Task failed');
      }
      
      // Wait 5 seconds before checking again
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  };

  useEffect(() => {
    const processBusinesses = async () => {
      for (let i = 0; i < selectedBusinesses.length; i++) {
        const business = selectedBusinesses[i];
        
        try {
          // Update to analyzing
          setBusinessProgress(prev => prev.map((b, idx) => 
            idx === i ? { 
              ...b, 
              status: 'processing', 
              message: 'Analyzing target area and determining search regions...',
              progress: 25
            } : b
          ));

          // Process with LLM and Browse.ai
          const response = await fetch('/api/process-business-types', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              businessTypes: [business],
              location: targetArea
            })
          });

          if (!response.ok) throw new Error('Failed to process business');
          
          const data = await response.json();

          // Update for task creation
          setBusinessProgress(prev => prev.map((b, idx) => 
            idx === i ? {
              ...b,
              message: `Created ${data.squares.length} search tasks, gathering results...`,
              progress: 50
            } : b
          ));

          // Wait for all tasks to complete and gather results
          const results = await Promise.all(
            data.taskIds.map(taskId => pollTaskStatus(taskId))
          );

          // Combine and deduplicate results
          const combinedResults = results.flat().filter((result, index, self) =>
            index === self.findIndex(r => r.address === result.address)
          );

          // Final update with results
          setBusinessProgress(prev => prev.map((b, idx) => 
            idx === i ? {
              ...b,
              status: 'complete',
              message: `Found ${combinedResults.length} businesses`,
              progress: 100,
              results: combinedResults
            } : b
          ));

        } catch (error) {
          setBusinessProgress(prev => prev.map((b, idx) => 
            idx === i ? {
              ...b,
              status: 'error',
              message: 'Failed to process business data',
              progress: 0
            } : b
          ));
        }
      }
      
      onComplete();
    };

    processBusinesses();
  }, [selectedBusinesses, targetArea, onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl rounded-lg border-2 border-electric-teal bg-charcoal p-8 shadow-glow">
        <h2 className="text-2xl font-semibold text-electric-teal mb-6">
          {showResults ? 'Business Results' : 'Processing Selected Businesses'}
        </h2>
        
        {!showResults ? (
          <div className="space-y-6">
            {businessProgress.map((business, index) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg text-electric-teal">{business.name}</h3>
                  <span className="text-sm text-electric-teal/60">
                    {business.status === 'complete' ? '✓ Complete' : 
                     business.status === 'error' ? '✗ Error' :
                     business.status === 'processing' ? 'Processing...' : 'Waiting...'}
                  </span>
                </div>
                
                <div className="relative h-2 w-full rounded-full bg-charcoal border border-electric-teal/30">
                  <div 
                    className={`absolute left-0 top-0 h-full rounded-full transition-all duration-500
                      ${business.status === 'complete' ? 'bg-electric-teal' : 
                        business.status === 'error' ? 'bg-red-500' : 
                        'bg-electric-teal/50'}`}
                    style={{ width: `${business.progress}%` }}
                  />
                </div>
                
                <p className="text-sm text-electric-teal/80">{business.message}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-8">
            {businessProgress.map((business, index) => (
              business.results && (
                <div key={index} className="space-y-4">
                  <h3 className="text-xl text-electric-teal border-b border-electric-teal/20 pb-2">
                    {business.name} ({business.results.length} found)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {business.results.map((result, idx) => (
                      <div 
                        key={idx}
                        className="p-4 rounded-lg border border-electric-teal/30 hover:bg-electric-teal/5"
                      >
                        <h4 className="font-medium text-electric-teal">{result.name}</h4>
                        <p className="text-electric-teal/80 text-sm mt-1">{result.address}</p>
                        {result.phone && (
                          <p className="text-electric-teal/60 text-sm mt-1">{result.phone}</p>
                        )}
                        {result.website && (
                          <a 
                            href={result.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-electric-teal/60 text-sm mt-1 hover:text-electric-teal block"
                          >
                            {result.website}
                          </a>
                        )}
                        {result.rating && (
                          <p className="text-electric-teal/60 text-sm mt-1">
                            Rating: {result.rating} ({result.reviews} reviews)
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            ))}
          </div>
        )}

        <div className="mt-8 flex justify-end gap-4">
          {businessProgress.every(b => b.status === 'complete') && !showResults && (
            <button
              onClick={() => setShowResults(true)}
              className="rounded-lg border-2 border-electric-teal bg-electric-teal/10 px-6 py-2 
                text-base font-medium text-electric-teal shadow-glow animate-pulse-glow"
            >
              View Results
            </button>
          )}
          <button
            onClick={onClose}
            className="rounded px-4 py-2 text-electric-teal hover:bg-electric-teal/10"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProcessingModal; 