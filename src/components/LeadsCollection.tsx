'use client';

import { useState, useEffect, useRef } from 'react';
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

interface SearchResultItem {
  Title?: string;
  Information?: string;
  Link?: string;
  Rating?: string;
  Review?: string;
}

interface BrowseAIResult {
  status: string;
  capturedLists: {
    'Search Results'?: SearchResultItem[];
  };
  userFriendlyError?: string;
}

const processLeadsFromResponse = (result: BrowseAIResult): Lead[] => {
  if (!result.capturedLists || !result.capturedLists['Search Results']) {
    console.log('No search results found in response');
    return [];
  }

  return result.capturedLists['Search Results'].map((item: SearchResultItem) => {
    // Parse the Information field which contains address and other details
    const info = item.Information || '';
    const infoLines = info.split('\n');
    const businessType = infoLines[0] || '';
    const address = infoLines[1] || '';
    const phone = info.match(/[+]1 \d{3}[-]\d{3}[-]\d{4}|[(]\d{3}[)] \d{3}[-]\d{4}/)?.[0] || '';

    return {
      name: item.Title || '',
      address: address.replace(/^· /, '').trim(),
      phone: phone,
      website: item.Link || '',
      rating: item.Rating || '',
      reviews: item.Review ? parseInt(item.Review) : undefined,
      businessType: businessType.replace(/ · $/, '').trim()
    };
  });
};

const LeadsCollection = ({ selectedBusinessTypes, allBusinessTypes, taskIds, onClose }: LeadsCollectionProps) => {
  const [progress, setProgress] = useState(0);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activeBusinessType, setActiveBusinessType] = useState<string>(selectedBusinessTypes[0]?.type);
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());
  const [loadingMessage, setLoadingMessage] = useState<string>('Starting search...');
  const [isPolling, setIsPolling] = useState(true);
  
  const leadsCountRef = useRef(0);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    leadsCountRef.current = leads.length;

    const pollTasks = async () => {
      const totalTasks = taskIds.length;
      
      console.log('Polling tasks:', taskIds, 'Completed:', completedTasks.size, 'Total:', totalTasks);
      
      for (const taskId of taskIds) {
        if (completedTasks.has(taskId)) {
          console.log('Task already completed:', taskId);
          continue;
        }

        try {
          console.log('Checking task:', taskId);
          const response = await fetch(`/api/browse-ai/task/${taskId}`);
          
          if (!response.ok) {
            console.error(`Error response from task ${taskId}:`, response.status);
            continue;
          }

          const data = await response.json();
          console.log('Task response:', data);

          if (data.result?.status === 'successful' || data.result?.status === 'completed') {
            console.log('Task completed:', taskId);
            const newLeads = processLeadsFromResponse(data.result);
            console.log('New leads found:', newLeads.length);
            
            setLeads(current => {
              const existingAddresses = new Set(current.map(lead => lead.address));
              const uniqueNewLeads = newLeads.filter(lead => !existingAddresses.has(lead.address));
              const updatedLeads = [...current, ...uniqueNewLeads];
              console.log('Total leads after update:', updatedLeads.length);
              leadsCountRef.current = updatedLeads.length;
              return updatedLeads;
            });
            
            setCompletedTasks(prev => {
              const updated = new Set(prev).add(taskId);
              console.log('Updated completed tasks:', updated.size, 'of', taskIds.length);
              return updated;
            });

            // Update progress after state updates
            const completed = completedTasks.size + 1;
            const progress = (completed / taskIds.length) * 100;
            setProgress(progress);
            setLoadingMessage(`Found ${leadsCountRef.current} leads (${completed}/${taskIds.length} areas searched)`);
          } else if (data.result?.status === 'failed') {
            console.error(`Task ${taskId} failed:`, data.result?.userFriendlyError || 'No error message');
            setCompletedTasks(prev => new Set(prev).add(taskId));
          } else {
            console.log(`Task ${taskId} still processing:`, data.result?.status);
          }
        } catch (error) {
          console.error('Error polling task:', taskId, error);
        }
      }

      // Update progress and message after all tasks are checked
      const completed = completedTasks.size;
      setProgress((completed / totalTasks) * 100);
      
      if (completed === totalTasks) {
        console.log('All tasks completed');
        setIsPolling(false);
        setLoadingMessage(`Search complete! Found ${leadsCountRef.current} leads`);
      } else {
        setLoadingMessage(`Found ${leadsCountRef.current} leads (${completed}/${totalTasks} areas searched)`);
        if (isPolling) {
          console.log('Scheduling next poll in 10 seconds');
          timeoutId = setTimeout(pollTasks, 10000);
        }
      }
    };

    if (isPolling && taskIds.length > 0) {
      console.log('Starting polling with task IDs:', taskIds);
      pollTasks();
    }

    return () => {
      if (timeoutId) {
        console.log('Cleaning up polling timeout');
        clearTimeout(timeoutId);
      }
    };
  }, [taskIds, completedTasks, isPolling, leads.length]);

  // Add debug output for leads
  console.log('Current leads:', leads.length, 'Active type:', activeBusinessType);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-charcoal">
      {/* Progress Bar and Loading Message */}
      <div className="fixed top-0 left-0 right-0">
        <div className="h-2 bg-electric-teal/20">
          <div 
            className="h-full bg-electric-teal transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between items-center px-4 py-2">
          <div className="text-electric-teal/60 text-sm">
            {loadingMessage}
          </div>
          <button
            onClick={onClose}
            className="text-electric-teal hover:text-electric-teal/80 transition-colors"
          >
            Close
          </button>
        </div>
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
            .filter(lead => {
              const matches = lead.businessType.toLowerCase().includes(activeBusinessType.toLowerCase());
              console.log('Filtering lead:', lead.businessType, activeBusinessType, matches);
              return matches;
            })
            .map((lead, index) => (
              <div 
                key={`${lead.name}-${lead.address}-${index}`}
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
                    className="text-electric-teal/60 text-sm hover:text-electric-teal block"
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