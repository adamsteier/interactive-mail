'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';

interface LeadsCollectionProps {
  taskInfos: TaskInfo[];
  onClose: () => void;
}

interface Lead {
  name: string;
  businessType: string; // The business type we searched for
  rawBusinessType: string; // The business type from the result
  address: string;
  status: string;
  hours: string;
  phone?: string;
  website?: string;
  rating?: string;
  reviews?: number;
  fullInfo: string; // Keep the full info for reference
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

interface TaskInfo {
  id: string;
  businessType: string;
}

const processLeadsFromResponse = (result: BrowseAIResult, taskBusinessType: string): Lead[] => {
  if (!result.capturedLists || !result.capturedLists['Search Results']) {
    console.log('No search results found in response');
    return [];
  }

  console.log('Processing raw results:', result.capturedLists['Search Results']);
  
  const processed = result.capturedLists['Search Results'].map((item: SearchResultItem) => {
    const info = item.Information || '';
    const infoLines = info.split('\n');
    
    // Parse first line which contains business type and address
    const [typeAndAddress = '', ...otherLines] = infoLines;
    const [rawType = '', rawAddress = ''] = typeAndAddress.split(' · ').map(s => s.trim());
    
    // Parse second line which contains status, hours, and phone
    const statusLine = otherLines.join(' ');
    const status = statusLine.match(/^(Open|Closed)[^·]*/)?.[0]?.trim() || '';
    const hours = statusLine.match(/·([^·]+)·/)?.[1]?.trim() || '';
    const phone = statusLine.match(/[+]1 \d{3}[-]\d{3}[-]\d{4}|[(]\d{3}[)] \d{3}[-]\d{4}/)?.[0] || '';

    const lead = {
      name: item.Title || '',
      businessType: taskBusinessType, // Use the business type from the task
      rawBusinessType: rawType, // Store the raw business type from the result
      address: rawAddress || typeAndAddress, // Use full line if no address parsed
      status,
      hours,
      phone,
      website: item.Link || '',
      rating: item.Rating || '',
      reviews: item.Review ? parseInt(item.Review) : undefined,
      fullInfo: info // Keep the full info for reference
    };
    
    console.log('Processed lead:', lead);
    return lead;
  });

  console.log('Total processed leads:', processed.length);
  return processed;
};

const LeadsCollection = ({ taskInfos, onClose }: LeadsCollectionProps) => {
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
      const totalTasks = taskInfos.length;
      
      if (completedTasks.size === totalTasks) {
        setIsPolling(false);
        setLoadingMessage(`Search complete! Found ${leadsCountRef.current} leads`);
        return;
      }
      
      for (const taskInfo of taskInfos) {
        if (completedTasks.has(taskInfo.id)) {
          continue;
        }

        try {
          const response = await fetch(`/api/browse-ai/task/${taskInfo.id}`);
          
          if (!response.ok) continue;

          const data = await response.json();

          if (data.result?.status === 'successful' || data.result?.status === 'completed') {
            const newLeads = processLeadsFromResponse(data.result, taskInfo.businessType);
            
            setLeads(current => {
              const existingAddresses = new Set(current.map(lead => lead.address));
              const uniqueNewLeads = newLeads.filter(lead => !existingAddresses.has(lead.address));
              return [...current, ...uniqueNewLeads];
            });
            
            setCompletedTasks(prev => new Set([...prev, taskInfo.id]));
          } else if (data.result?.status === 'failed') {
            setCompletedTasks(prev => new Set([...prev, taskInfo.id]));
          }
        } catch (error) {
          console.error('Error polling task:', taskInfo.id, error);
        }
      }

      const progress = (completedTasks.size / totalTasks) * 100;
      setProgress(progress);
      
      if (completedTasks.size === totalTasks) {
        setIsPolling(false);
        setLoadingMessage(`Search complete! Found ${leadsCountRef.current} leads`);
      } else {
        setLoadingMessage(`Found ${leadsCountRef.current} leads (${completedTasks.size}/${totalTasks} areas searched)`);
        if (isPolling) {
          timeoutId = setTimeout(pollTasks, 10000);
        }
      }
    };

    if (isPolling && taskInfos.length > 0) {
      pollTasks();
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [taskInfos, completedTasks, isPolling, leads.length]);

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
                <th className="p-2 w-[15%]">Business Name</th>
                <th className="p-2 w-[12%]">Listed As</th>
                <th className="p-2 w-[12%]">Category</th>
                <th className="p-2 w-[20%]">Address</th>
                <th className="p-2 w-[8%]">Status</th>
                <th className="p-2 w-[12%]">Hours</th>
                <th className="p-2 w-[10%]">Phone</th>
                <th className="p-2 w-[6%]">Rating</th>
                <th className="p-2 w-[5%]">Website</th>
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
                  <td className="p-2 truncate">{lead.rawBusinessType}</td>
                  <td className="p-2 truncate">{lead.businessType}</td>
                  <td className="p-2">
                    <div className="max-h-20 overflow-y-auto whitespace-pre-line">
                      {lead.address}
                    </div>
                  </td>
                  <td className="p-2 truncate">{lead.status}</td>
                  <td className="p-2 truncate">{lead.hours}</td>
                  <td className="p-2 truncate">{lead.phone}</td>
                  <td className="p-2">
                    {lead.rating} {lead.reviews && `(${lead.reviews})`}
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