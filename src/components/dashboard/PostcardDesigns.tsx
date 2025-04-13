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

// --- Skeleton Loader Component ---
const SkeletonCard: React.FC = () => (
  <div className="border border-gray-700/50 rounded-lg p-4 bg-charcoal/40 animate-pulse flex flex-col">
      <div className="h-4 bg-gray-600/50 rounded w-3/4 mb-3"></div>
      <div className="flex-grow mb-2 flex items-center justify-center bg-gray-700/40 rounded aspect-video"></div> {/* Thumbnail placeholder */}
      <div className="h-3 bg-gray-600/50 rounded w-1/2 mb-2"></div> {/* Status/Lead placeholder */}
      <div className="h-3 bg-gray-600/50 rounded w-1/3 mb-3"></div> {/* Date placeholder */}
      <div className="h-8 bg-gray-700/40 rounded"></div> {/* Button placeholder */}
  </div>
);

const PostcardDesigns: React.FC = () => {
  const { user } = useAuth();
  const [designs, setDesigns] = useState<CampaignDesignData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedImageUrl, setExpandedImageUrl] = useState<string | null>(null); // State for modal

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
    // Render skeleton grid
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-electric-teal">Your Postcard Designs</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* Render multiple skeleton cards */} 
          {[...Array(4)].map((_, index) => <SkeletonCard key={index} />)}
        </div>
      </div>
    );
  }

  if (error) {
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
          <div key={design.id} className="border border-gray-700 rounded-lg p-4 bg-charcoal/60 hover:border-electric-teal/50 hover:shadow-glow-sm transition-all duration-200 flex flex-col">
            <h3 className="font-medium text-white mb-2 truncate">{design.designName}</h3>
            {/* Display thumbnail if available */}
            <div className="relative flex-grow mb-2 flex items-center justify-center bg-gray-700/50 rounded aspect-video overflow-hidden">
               {/* Conditional Content: Spinner, Image, or Placeholder Text */}
               {(design.status === 'processing' || (design.status as string) === 'processing_ai') ? (
                   <svg className="animate-spin h-8 w-8 text-electric-teal/70" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                   </svg>
               ) : design.finalDesignUrl ? (
                    <img
                        src={design.finalDesignUrl}
                        alt={`Design: ${design.designName}`}
                        className="w-full h-full object-contain cursor-pointer transition-transform hover:scale-105"
                        onClick={() => setExpandedImageUrl(design.finalDesignUrl!)}
                    />
                ) : (
                    <span className="text-xs text-gray-500 italic">
                        {/* Removed processing check here as it's handled above */}
                        {design.status === 'failed' || (design.status as string) === 'ai_failed' ? 'Failed' :
                        'No preview'}
                    </span>
                )}
             </div>
            <p className="text-xs text-gray-400 mb-1">Status: <span className={`font-medium ${ 
                // No longer need animate-pulse here for processing status
                design.status === 'completed' ? 'text-green-400' :
                design.status === 'processing' || (design.status as string) === 'processing_ai' ? 'text-yellow-400' :
                design.status === 'failed' || (design.status as string) === 'ai_failed' ? 'text-red-400' :
                'text-gray-300'
            }`}>{design.status || 'Unknown'}</span></p>
            {/* Placeholder for Design Request Status (if applicable) */}
            <div className="text-xs text-gray-500 italic mt-1">
                {/* TODO: Fetch and display status from related design_requests document if using that flow */}
                {/* (Design Request Status: Placeholder) */}
            </div>
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
      </div>

      {/* Image Expansion Modal */}
      {expandedImageUrl && (
          <div
              className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 cursor-pointer"
              onClick={() => setExpandedImageUrl(null)}
          >
              <img
                  src={expandedImageUrl}
                  alt="Expanded design"
                  className="max-w-full max-h-full object-contain"
                  onClick={(e) => e.stopPropagation()}
              />
               <button
                  className="absolute top-4 right-4 text-white text-3xl font-bold hover:text-electric-teal"
                  onClick={() => setExpandedImageUrl(null)}
                  aria-label="Close expanded image"
              >
                  &times;
              </button>
          </div>
      )}
    </div>
  );
};

export default PostcardDesigns;