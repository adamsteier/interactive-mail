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
  const [error, setError] = useState<string | null>(null);
  const [useFallback, setUseFallback] = useState(false);

  useEffect(() => {
    try {
      // The code in the database starts with "const PostcardDesign = (props) => {...}"
      // We need to extract just the function part without the const declaration
      
      // First, log the code for debugging
      console.log("Code snippet from database:", template.code.substring(0, 100) + "...");
      
      // Try different approaches to extract the function
      let codeToEvaluate = "";
      let success = false;
      
      // Approach 1: Try to directly evaluate the code as-is
      try {
        const directEval = new Function('React', `return ${template.code}`);
        const testComponent = directEval(React);
        if (typeof testComponent === 'function') {
          codeToEvaluate = template.code;
          success = true;
          console.log("Direct evaluation successful");
        }
      } catch (directError: unknown) {
        console.log("Direct evaluation failed:", directError instanceof Error ? directError.message : String(directError));
      }
      
      // Approach 2: If direct eval failed, try to extract function from const declaration
      if (!success) {
        // Remove the "const PostcardDesign = " part if it exists
        let extractedCode = template.code;
        if (extractedCode.includes("const PostcardDesign = ")) {
          extractedCode = extractedCode.replace("const PostcardDesign = ", "");
          success = true;
          codeToEvaluate = extractedCode;
          console.log("Extracted function after removing const PostcardDesign =");
        } else if (extractedCode.startsWith("const ")) {
          // Find the position of the first equals sign and arrow function start
          const equalsPos = extractedCode.indexOf("=");
          const arrowPos = extractedCode.indexOf("=>", equalsPos);
          
          if (equalsPos > 0 && arrowPos > equalsPos) {
            extractedCode = extractedCode.substring(equalsPos + 1).trim();
            success = true;
            codeToEvaluate = extractedCode;
            console.log("Extracted function after removing const declaration");
          }
        }
      }
      
      // Approach 3: Try to extract just the function body for simpler cases
      if (!success) {
        const arrowPos = template.code.indexOf("=>");
        const openBracePos = template.code.indexOf("{", arrowPos);
        
        if (arrowPos > 0 && openBracePos > arrowPos) {
          // Create a simple wrapper function
          codeToEvaluate = `(props) => ${template.code.substring(openBracePos)}`;
          success = true;
          console.log("Created wrapper function with body extraction");
        }
      }
      
      // If all attempts failed, use a simple fallback function
      if (!success) {
        codeToEvaluate = `(props) => {
          return React.createElement('div', { 
            style: { 
              padding: '20px', 
              backgroundColor: '${template.primaryColor || "#ccc"}',
              color: 'white',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              textAlign: 'center'
            } 
          }, [
            React.createElement('h2', { key: 'title' }, '${template.brandName || "Brand Name"}'),
            React.createElement('p', { key: 'style' }, 'Style: ${template.designStyle || "modern"}')
          ]);
        }`;
        console.log("Using simple fallback function");
      }
      
      // Now we should have a usable function representation
      console.log("Code to evaluate:", codeToEvaluate.substring(0, 100) + "...");
      
      // Convert the function string to a function
      const constructorFunction = new Function('React', `return ${codeToEvaluate}`);
      const PostcardComponent = constructorFunction(React);
      setComponent(() => PostcardComponent);
    } catch (error) {
      console.error('Error creating component from code:', error);
      setError(`Failed to render component: ${error instanceof Error ? error.message : String(error)}`);
      setUseFallback(true);
    }
  }, [template.code]);

  // Render a fallback card if dynamic rendering fails
  if (useFallback) {
    return (
      <div className="w-full h-64 relative overflow-hidden bg-charcoal-light rounded-lg">
        <div className="absolute inset-0 p-4 flex flex-col">
          <div className="w-full flex justify-between items-start mb-2">
            <div>
              <h3 className="font-bold text-electric-teal">{template.brandName || "Brand Name"}</h3>
              <p className="text-xs text-electric-teal/70">Style: {template.designStyle || "modern"}</p>
            </div>
            <div className="flex space-x-2">
              <div 
                className="w-5 h-5 rounded-full" 
                style={{ backgroundColor: template.primaryColor || '#cccccc' }} 
              />
              <div 
                className="w-5 h-5 rounded-full" 
                style={{ backgroundColor: template.accentColor || '#cccccc' }} 
              />
            </div>
          </div>
          
          <div className="mt-auto flex justify-between items-end">
            <div className="text-xs text-electric-teal/70">
              {template.createdAt?.toDate().toLocaleDateString() || "No date"}
            </div>
            <div className="text-xs bg-electric-teal/20 px-2 py-1 rounded text-electric-teal">
              {template.usedFallback ? "Fallback Design" : "Custom Design"}
            </div>
          </div>
        </div>
        <div 
          className="absolute inset-0 flex items-center justify-center border-2 border-dashed border-electric-teal/30 m-2 rounded bg-charcoal-dark/30"
        >
          <p className="text-electric-teal text-center px-4">
            Dynamic rendering unavailable<br />
            <span className="text-xs opacity-70">See console for details</span>
          </p>
        </div>
      </div>
    );
  }

  if (error && !useFallback) {
    return (
      <div className="w-full h-64 flex items-center justify-center bg-charcoal-light rounded-lg border border-red-500/50">
        <div className="text-red-500 p-4 text-center">
          <p className="font-semibold mb-2">Error rendering postcard</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

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
        
        // Debug: Log the first postcard's code format
        if (postcardData.length > 0) {
          console.log("First postcard data:", {
            id: postcardData[0].id,
            designStyle: postcardData[0].designStyle,
            brandName: postcardData[0].brandName,
            codeLength: postcardData[0].code?.length || 0,
            codeStart: postcardData[0].code?.substring(0, 100) + "..." || "No code"
          });
        } else {
          console.log("No postcards found in database");
        }
        
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
          <div className="flex space-x-4">
            {process.env.NODE_ENV === 'development' && (
              <button 
                onClick={() => {
                  if (postcards.length > 0) {
                    console.log("Raw code from first postcard:", postcards[0].code);
                  }
                }}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition"
              >
                Debug Code
              </button>
            )}
            <Link href="/" className="px-4 py-2 bg-electric-teal text-charcoal rounded-md hover:bg-electric-teal/80 transition">
              Back to Home
            </Link>
          </div>
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