'use client';

import React, { useEffect, useState } from 'react';
import { collection, getDocs, orderBy, query, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { motion } from 'framer-motion';
import Link from 'next/link';
import LucideIconProvider from '@/components/LucideIconProvider';

// Define PostcardTemplate interface based on the data structure in Firebase
interface PostcardTemplate {
  id: string;
  designStyle: string;
  brandName: string;
  code: string;
  usedFallback: boolean;
  createdAt: Timestamp;
  primaryColor: string;
  accentColor: string;
}

// Define props interface for the postcard component
interface PostcardProps {
  imageUrl: string;
  isSelected: boolean;
  onSelect: () => void;
  brandName: string;
  tagline: string;
  contactInfo: {
    phone?: string;
    email?: string;
    website?: string;
    address?: string;
  };
  callToAction: string;
  extraInfo: string;
  [key: string]: unknown; // Allow for additional props
}

// This component will render a single postcard using the stored code
const DynamicPostcard: React.FC<{ template: PostcardTemplate }> = ({ template }) => {
  const [Component, setComponent] = useState<React.ComponentType<PostcardProps> | null>(null);

  useEffect(() => {
    try {
      // Convert the stored code string to a function
      const constructorFunction = new Function('React', `return ${template.code}`);
      const PostcardComponent = constructorFunction(React);
      setComponent(() => PostcardComponent);
    } catch (error) {
      console.error('Error creating component from code:', error);
    }
  }, [template.code]);

  if (!Component) {
    return (
      <div className="w-full h-64 flex items-center justify-center bg-charcoal-light rounded-lg border border-electric-teal/30">
        <p className="text-electric-teal">Loading postcard...</p>
      </div>
    );
  }

  // Create a container to properly size and display the postcard
  return (
    <div className="postcard-container relative w-full overflow-hidden rounded-lg border border-electric-teal/30">
      {/* Create an aspect ratio container matching the postcard dimensions */}
      <div className="relative" style={{ paddingBottom: '67.9%' }}> {/* 1271/1872 = ~0.679 aspect ratio */}
        {/* Scale the full-size postcard down to fit */}
        <div className="absolute inset-0 overflow-hidden scale-[0.15] origin-top-left transform-gpu">
          <LucideIconProvider>
            <Component 
              imageUrl="/images/placeholder-image.png" 
              isSelected={false}
              onSelect={() => {}}
              brandName={template.brandName || "Brand Name"}
              tagline="Your brand tagline"
              contactInfo={{
                phone: "555-123-4567",
                email: "example@example.com",
                website: "www.example.com",
                address: "123 Main St, Anytown, USA"
              }}
              callToAction="Visit our website"
              extraInfo=""
            />
          </LucideIconProvider>
        </div>
      </div>
    </div>
  );
};

export default function PostcardPreviewPage() {
  const [postcards, setPostcards] = useState<PostcardTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPostcards() {
      try {
        // Create a query to fetch postcards sorted by creation date (newest first)
        const postcardQuery = query(
          collection(db, 'postcard_template'),
          orderBy('createdAt', 'desc')
        );
        
        const querySnapshot = await getDocs(postcardQuery);
        const postcardData: PostcardTemplate[] = [];
        
        querySnapshot.forEach((doc) => {
          postcardData.push({
            id: doc.id,
            ...doc.data()
          } as PostcardTemplate);
        });
        
        setPostcards(postcardData);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching postcards:', err);
        setError('Failed to load postcards. Please try again later.');
        setLoading(false);
      }
    }

    fetchPostcards();
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-charcoal rounded-lg shadow-lg p-6"
      >
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-electric-teal">Saved Postcard Designs</h1>
          <Link href="/" className="px-4 py-2 bg-electric-teal text-charcoal rounded-md hover:bg-electric-teal/80 transition">
            Back to Home
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-electric-teal"></div>
          </div>
        ) : error ? (
          <div className="bg-red-900/20 border border-red-500 text-red-500 p-4 rounded-md">
            {error}
          </div>
        ) : postcards.length === 0 ? (
          <div className="text-center py-12 text-electric-teal/80">
            <p className="text-xl mb-4">No postcards found</p>
            <p>Create some designs from the home page to see them here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {postcards.map((postcard) => (
              <motion.div
                key={postcard.id}
                whileHover={{ scale: 1.02 }}
                className="bg-charcoal-light rounded-lg overflow-hidden shadow"
              >
                <DynamicPostcard template={postcard} />
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-electric-teal truncate">{postcard.brandName}</h3>
                    <span className="text-xs px-2 py-1 bg-charcoal rounded-full text-electric-teal">
                      {postcard.designStyle}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2 mb-2">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: postcard.primaryColor || '#cccccc' }}
                      title="Primary Color"
                    />
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: postcard.accentColor || '#cccccc' }}
                      title="Accent Color"
                    />
                    <div className="text-xs text-electric-teal/70 ml-auto">
                      {postcard.createdAt?.toDate().toLocaleDateString() || 'Unknown date'}
                    </div>
                  </div>
                  
                  {postcard.usedFallback && (
                    <div className="text-xs text-amber-500 mt-2">
                      <span>⚠️ Fallback design</span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
} 