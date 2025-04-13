// src/components/dashboard/PostcardDesigns.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { CampaignDesignData } from '@/types/firestoreTypes';
// Import necessary Firestore functions (removed unused 'where')
import { collection, query, onSnapshot, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase'; // Assuming db instance is exported from here

// Temporary type assertion helper until CampaignDesignData includes leadCount REMOVED
// type DesignWithLeadCount = CampaignDesignData & { leadCount?: number }; 

const PostcardDesigns: React.FC = () => {
  const { user } = useAuth();
  const [designs, setDesigns] = useState<CampaignDesignData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      // Optionally set an error or handle the case where the user isn't logged in
      // This might be redundant if the parent page already handles auth checks
      return;
    }

    setIsLoading(true);
    setError(null);

    // --- Firestore Real-time Listener Setup ---
    // Define the correct Firestore query
    const designsQuery = query(
      collection(db, 'users', user.uid, 'campaignDesigns'), // Confirmed path based on AIHumanWizard
      orderBy('createdAt', 'desc') // Order by creation date, newest first
    );

    const unsubscribe = onSnapshot(designsQuery, (querySnapshot) => {
      const fetchedDesigns: CampaignDesignData[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Ensure createdAt is handled correctly (assuming it's a Firestore Timestamp)
        // Convert Firestore Timestamp to JS Date object for easier handling in the component
        const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : undefined;
        // You might need to handle updatedAt similarly if you use it
        const updatedAt = data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : undefined;

        fetchedDesigns.push({
             ...data,
             id: doc.id,
             createdAt: createdAt, // Use the converted JS Date
             updatedAt: updatedAt, // Use the converted JS Date
             // Ensure other potential Timestamps are handled if necessary
        } as CampaignDesignData);
      });
      setDesigns(fetchedDesigns);
      setIsLoading(false);
    }, (err) => {
      console.error("Error fetching postcard designs:", err);
      setError("Failed to load designs. Please try again later.");
      setIsLoading(false);
    });

    // Cleanup listener on component unmount
    return () => unsubscribe();

  }, [user]); // Re-run effect if user changes

  // --- Render Logic ---

  if (isLoading) {
    // TODO: Use a branded loading component/spinner
    return <div className="text-center p-6 text-gray-400">Loading designs...</div>;
  }

  if (error) {
    // TODO: Use a branded error component
    return <div className="text-center p-6 text-red-400 bg-red-900/20 border border-red-700 rounded-md">{error}</div>;
  }

  if (designs.length === 0) {
    return (
      <div className="text-center p-6 bg-charcoal/50 rounded-md border border-electric-teal/20">
        <h3 className="text-lg font-semibold text-electric-teal mb-2">No Designs Yet!</h3>
        <p className="text-gray-300">You haven&apos;t created any postcard designs.</p>
        {/* TODO: Add a button/link to start the AIHumanWizard or design process */}
        {/* <button className="mt-4 px-4 py-2 rounded-md bg-electric-teal text-charcoal ...">Start Designing</button> */}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-electric-teal">Your Postcard Designs</h2>
      {/* TODO: Implement grid or list layout for designs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {designs.map((design) => (
          <div key={design.id} className="border border-gray-700 rounded-lg p-4 bg-charcoal/60 hover:border-electric-teal/50 hover:shadow-glow-sm transition-all duration-200">
            <h3 className="font-medium text-white mb-2 truncate">{design.designName}</h3>
            {/* TODO: Display thumbnail if available */}
            {/* {design.finalDesignUrl && <img src={design.finalDesignUrl} alt={design.designName} className="aspect-video object-cover rounded mb-2"/>} */}
            <p className="text-xs text-gray-400 mb-1">Status: <span className={`font-medium ${
              // TODO: Ensure CampaignDesignData type includes 'processing_ai' and 'ai_failed' statuses
              design.status === 'completed' ? 'text-green-400' :
              // Use type assertion (as string) to handle statuses potentially not yet in the type definition
              design.status === 'processing' || (design.status as string) === 'processing_ai' ? 'text-yellow-400 animate-pulse' :
              design.status === 'failed' || (design.status as string) === 'ai_failed' ? 'text-red-400' :
              'text-gray-300' // Default for other statuses like 'draft', 'review_ready', etc.
            }`}>{design.status || 'Unknown'}</span></p>
            {/* Display Lead Count */} 
            <div 
                className="text-xs text-gray-400 mt-1 cursor-pointer hover:text-electric-teal transition-colors" 
                title="Click to view associated leads (coming soon)"
                // TODO: Implement onClick to show leads (modal or navigate)
            >
                {/* Use temporary extended type assertion REMOVED */}
                Sending to: <span className="font-medium text-white">{design.leadCount ?? <span className="italic text-gray-500">N/A</span>}</span> leads
                {/* TODO: Ensure design.leadCount is populated in Firestore */}
            </div>
            {/* Ensure createdAt is a Date object before calling toLocaleDateString */}
            <p className="text-xs text-gray-400">Created: {design.createdAt instanceof Date ? design.createdAt.toLocaleDateString() : 'N/A'}</p>
            {/* Action Buttons Area */}
            <div className="mt-3 pt-3 border-t border-gray-700/50">
                {/* Conditionally show Payment Button */} 
                {design.status === 'completed' && ( 
                    <button 
                        // TODO: Add onClick handler for payment/sending logic
                        className="w-full px-3 py-1.5 rounded bg-green-600 hover:bg-green-500 text-white text-xs font-semibold shadow-glow hover:shadow-glow-strong transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                    >
                        Proceed to Payment & Send
                    </button>
                )}
                {/* TODO: Add other buttons like View Details, Delete Draft? */} 
            </div>
          </div>
        ))}
         {/* Placeholder card for demonstration */}
         <div className="border border-gray-700 rounded-lg p-4 bg-charcoal/60 hover:border-electric-teal/50 hover:shadow-glow-sm transition-all duration-200 animate-pulse">
             <div className="h-4 bg-gray-600 rounded w-3/4 mb-3"></div>
             <div className="h-20 bg-gray-600 rounded mb-2"></div> {/* Thumbnail placeholder */}
             <div className="h-3 bg-gray-600 rounded w-1/2 mb-2"></div> {/* Status placeholder */}
             <div className="h-3 bg-gray-600 rounded w-1/3"></div> {/* Date placeholder */}
         </div>
      </div>
    </div>
  );
};

export default PostcardDesigns;