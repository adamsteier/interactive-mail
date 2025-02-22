'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';

interface LeadsCollectionProps {
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

  console.log('Processing raw results:', result.capturedLists['Search Results']);
  
  const processed = result.capturedLists['Search Results'].map((item: SearchResultItem) => {
    const info = item.Information || '';
    
    // Keep the full information string for display
    const lead = {
      name: item.Title || '',
      address: info, // Keep the full information string
      phone: info.match(/[+]1 \d{3}[-]\d{3}[-]\d{4}|[(]\d{3}[)] \d{3}[-]\d{4}/)?.[0] || '',
      website: item.Link || '',
      rating: item.Rating || '',
      reviews: item.Review ? parseInt(item.Review) : undefined,
      businessType: info.split('\n')[0] || '' // First line is business type
    };
    
    console.log('Processed lead:', lead);
    return lead;
  });

  console.log('Total processed leads:', processed.length);
  return processed;
};

const LeadsCollection = ({ taskIds, onClose }: LeadsCollectionProps) => {
  const [progress, setProgress] = useState(0);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [businessTypes, setBusinessTypes] = useState<Map<string, number>>(new Map());
  const [loadingMessage, setLoadingMessage] = useState<string>('Starting search...');
  const [isPolling, setIsPolling] = useState(true);
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());
  
  const leadsCountRef = useRef(0);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    leadsCountRef.current = leads.length;

    const pollTasks = async () => {
      const totalTasks = taskIds.length;
      
      // Check if all tasks are already completed
      if (completedTasks.size === totalTasks) {
        setIsPolling(false);
        setLoadingMessage(`Search complete! Found ${leadsCountRef.current} leads`);
        return;
      }
      
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
              console.log('Current leads before update:', current.length);
              const existingAddresses = new Set(current.map(lead => lead.address));
              const uniqueNewLeads = newLeads.filter(lead => !existingAddresses.has(lead.address));
              console.log('Unique new leads:', uniqueNewLeads.length);
              const updatedLeads = [...current, ...uniqueNewLeads];
              console.log('Total leads after update:', updatedLeads.length);
              leadsCountRef.current = updatedLeads.length;
              return updatedLeads;
            });
            
            setCompletedTasks(prev => new Set([...prev, taskId]));
          } else if (data.result?.status === 'failed') {
            console.error(`Task ${taskId} failed:`, data.result?.userFriendlyError || 'No error message');
            setCompletedTasks(prev => new Set([...prev, taskId]));
          } else {
            console.log(`Task ${taskId} still processing:`, data.result?.status);
          }
        } catch (error) {
          console.error('Error polling task:', taskId, error);
        }
      }

      // Update progress based on completed tasks
      const progress = (completedTasks.size / totalTasks) * 100;
      setProgress(progress);
      
      // Check if all tasks are completed after this run
      if (completedTasks.size === totalTasks) {
        console.log('All tasks completed');
        setIsPolling(false);
        setLoadingMessage(`Search complete! Found ${leadsCountRef.current} leads`);
      } else {
        setLoadingMessage(`Found ${leadsCountRef.current} leads (${completedTasks.size}/${totalTasks} areas searched)`);
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

  // Add debug logging for leads updates
  useEffect(() => {
    console.log('Total leads:', leads.length);
  }, [leads.length]);

  // Add debug output for leads
  console.log('Current leads:', leads.length);

  // Update business type counts when leads change
  useEffect(() => {
    const typeCounts = new Map<string, number>();
    leads.forEach(lead => {
      const type = lead.businessType;
      typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
    });
    setBusinessTypes(typeCounts);
  }, [leads]);

  // Filter leads based on active filter
  const filteredLeads = useMemo(() => {
    if (activeFilter === 'all') return leads;
    return leads.filter(lead => lead.businessType === activeFilter);
  }, [leads, activeFilter]);

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

      {/* Business Type Filters */}
      <div className="flex gap-2 p-4 mt-12 flex-wrap">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-4 py-2 rounded-lg transition-all duration-300 ${
            activeFilter === 'all'
              ? 'bg-electric-teal text-charcoal'
              : 'bg-electric-teal/20 text-electric-teal hover:bg-electric-teal/30'
          }`}
        >
          All Leads ({leads.length})
        </button>
        {Array.from(businessTypes).map(([type, count]) => (
          <motion.button
            key={type}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={() => setActiveFilter(type)}
            className={`px-4 py-2 rounded-lg transition-all duration-300 ${
              type === activeFilter
                ? 'bg-electric-teal text-charcoal'
                : 'bg-electric-teal/20 text-electric-teal hover:bg-electric-teal/30'
            }`}
          >
            {type} ({count})
          </motion.button>
        ))}
      </div>

      {/* Leads Table Container */}
      <div className="flex-1 overflow-hidden p-4">
        <div className="h-full overflow-auto">
          <table className="w-full min-w-[1024px] border-collapse">
            <thead className="sticky top-0 bg-charcoal z-10">
              <tr className="text-electric-teal/60 text-left">
                <th className="p-2 w-[20%]">Business Name</th>
                <th className="p-2 w-[15%]">Type</th>
                <th className="p-2 w-[25%]">Address</th>
                <th className="p-2 w-[10%]">Phone</th>
                <th className="p-2 w-[5%]">Rating</th>
                <th className="p-2 w-[5%]">Reviews</th>
                <th className="p-2 w-[10%]">Status</th>
                <th className="p-2 w-[10%]">Website</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map((lead, index) => (
                <motion.tr
                  key={`${lead.name}-${lead.address}-${index}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="border-b border-electric-teal/10 text-electric-teal/80 hover:bg-electric-teal/5"
                >
                  <td className="p-2 truncate">{lead.name}</td>
                  <td className="p-2 truncate">{lead.businessType}</td>
                  <td className="p-2">
                    <div className="max-h-20 overflow-y-auto whitespace-pre-line">
                      {lead.address}
                    </div>
                  </td>
                  <td className="p-2 truncate">{lead.phone}</td>
                  <td className="p-2">{lead.rating}</td>
                  <td className="p-2">{lead.reviews}</td>
                  <td className="p-2 truncate">
                    {lead.address.match(/Open|Closed[^·]*/)?.[0] || ''}
                  </td>
                  <td className="p-2">
                    {lead.website && (
                      <a
                        href={lead.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-electric-teal hover:text-electric-teal/80"
                      >
                        Visit
                      </a>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default LeadsCollection; 