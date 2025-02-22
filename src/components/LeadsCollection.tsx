'use client';

import { useState, useEffect } from 'react';
import { BusinessTarget } from '@/types/marketing';

interface LeadsCollectionProps {
  selectedBusinessTypes: BusinessTarget[];
  allBusinessTypes: BusinessTarget[];
  taskIds: string[];
  onClose: () => void;
}

interface Lead {
  name: string;
  address: string;
  phone?: string;
  website?: string;
  rating?: string;
  reviews?: number;
  businessType: string;
}

const LeadsCollection = ({ selectedBusinessTypes, allBusinessTypes, taskIds, onClose }: LeadsCollectionProps) => {
  const [progress, setProgress] = useState(0);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activeBusinessType, setActiveBusinessType] = useState<string>(selectedBusinessTypes[0]?.type);
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());

  useEffect(() => {
    const pollTasks = async () => {
      const totalTasks = taskIds.length;
      
      for (const taskId of taskIds) {
        if (!completedTasks.has(taskId)) {
          try {
            const response = await fetch(`/api/browse-ai/task/${taskId}`);
            const data = await response.json();

            if (data.result.status === 'completed') {
              // Add new leads
              const newLeads = processLeadsFromResponse(data.result);
              setLeads(current => [...current, ...newLeads]);
              
              // Mark task as completed
              setCompletedTasks(current => new Set([...current, taskId]));
              
              // Update progress
              setProgress(completedTasks.size / totalTasks * 100);
            }
          } catch (error) {
            console.error('Error polling task:', error);
          }
        }
      }

      // If not all tasks are complete, continue polling
      if (completedTasks.size < totalTasks) {
        setTimeout(pollTasks, 5000);
      }
    };

    pollTasks();
  }, [taskIds, completedTasks]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-charcoal">
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-2 bg-electric-teal/20">
        <div 
          className="h-full bg-electric-teal transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Business Type Selector */}
      <div className="flex gap-2 p-4 mt-4">
        {allBusinessTypes.map(business => (
          <button
            key={business.type}
            onClick={() => setActiveBusinessType(business.type)}
            className={`px-4 py-2 rounded-lg transition-all duration-300 ${
              selectedBusinessTypes.some(b => b.type === business.type)
                ? business.type === activeBusinessType
                  ? 'bg-electric-teal text-charcoal'
                  : 'bg-electric-teal/20 text-electric-teal'
                : 'bg-charcoal/20 text-electric-teal/40 cursor-not-allowed'
            }`}
            disabled={!selectedBusinessTypes.some(b => b.type === business.type)}
          >
            {business.type}
          </button>
        ))}
      </div>

      {/* Leads Display */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {leads
            .filter(lead => lead.businessType === activeBusinessType)
            .map((lead, index) => (
              <div 
                key={index}
                className="p-4 rounded-lg border border-electric-teal/30 bg-charcoal/50"
              >
                <h3 className="text-electric-teal font-medium">{lead.name}</h3>
                <p className="text-electric-teal/80 text-sm">{lead.address}</p>
                {lead.phone && (
                  <p className="text-electric-teal/60 text-sm">{lead.phone}</p>
                )}
                {lead.website && (
                  <a 
                    href={lead.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-electric-teal/60 text-sm hover:text-electric-teal"
                  >
                    {lead.website}
                  </a>
                )}
                {lead.rating && (
                  <p className="text-electric-teal/60 text-sm">
                    Rating: {lead.rating} ({lead.reviews} reviews)
                  </p>
                )}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default LeadsCollection; 