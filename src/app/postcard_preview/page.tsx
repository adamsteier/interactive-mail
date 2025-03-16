'use client';

import React, { useEffect, useState } from 'react';
import { collection, getDocs, orderBy, query, Timestamp, limit, startAfter, DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { motion } from 'framer-motion';
import Link from 'next/link';
import LucideIconProvider from '@/components/LucideIconProvider';
import ZoomablePostcard from '@/components/ZoomablePostcard';

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
      // First, log the code for debugging
      console.log("Code snippet from database:", template.code.substring(0, 100) + "...");
      
      // Clean the code by removing imports and language identifiers
      const cleanedCode = template.code
        .replace(/import\s+.*?from\s+['"].*?['"];?/g, '')
        .replace(/import\s+{.*?}\s+from\s+['"].*?['"];?/g, '')
        .replace(/^(javascript|typescript|jsx|js|ts)\b\s*/i, '')
        .trim();
      
      console.log("Cleaned code (first 100 chars):", cleanedCode.substring(0, 100) + "...");
        
      // Use Function constructor to evaluate the component code
      const ComponentFunction = new Function(
        'React', 'motion', 'postcardProps',
        `
        try {
          // Find the PostcardDesign component declaration
          ${cleanedCode}
          
          // Safety check - make sure PostcardDesign exists
          if (typeof PostcardDesign !== 'function') {
            console.error('PostcardDesign component not found in generated code');
            return null;
          }
          
          return React.createElement(PostcardDesign, postcardProps);
        } catch (err) {
          console.error("Error in dynamic component:", err);
          return null;
        }
        `
      );
      
      // Create a wrapper component that calls the generated component
      const WrappedComponent = (props: PostcardProps) => {
        try {
          return (
            <LucideIconProvider>
              {ComponentFunction(React, { motion }, props)}
            </LucideIconProvider>
          );
        } catch (err) {
          console.error('Error rendering generated component:', err);
          return (
            <div className="w-full h-64 flex items-center justify-center bg-charcoal-light rounded-lg border border-red-500/50">
              <div className="text-red-500 p-4 text-center">
                <p className="font-semibold mb-2">Error rendering postcard</p>
                <p className="text-sm">{err instanceof Error ? err.message : 'Unknown error'}</p>
              </div>
            </div>
          );
        }
      };
        
      setComponent(() => WrappedComponent);
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
      <ZoomablePostcard>
        <div id="postcard-renderer" style={{ 
          width: '1872px', 
          height: '1271px', 
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: 'white'
        }}>
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
            imagePosition={{ x: 0, y: 0 }}
            onDragEnd={() => {}}
            onDragStart={() => {}}
            onDrag={() => {}}
            onImageChange={() => {}}
            imageScale={1}
            onScaleChange={() => {}}
            colors={{
              primary: template.primaryColor || "#1a1a1a",
              accent: template.accentColor || "#4fc3f7",
              text: "#ffffff",
              background: "#ffffff"
            }}
            fonts={{
              heading: "Arial, sans-serif",
              body: "Arial, sans-serif",
              accent: "Arial, sans-serif"
            }}
            layout="standard"
            textOptions={{
              brandName: { fontSize: '28px', fontWeight: 'bold' },
              tagline: { fontSize: '18px' },
              contact: { fontSize: '14px' }
            }}
            designStyle={template.designStyle || "modern"}
            customOptions={{}}
            brandData={{
              stylePreferences: [template.designStyle || "professional"],
              name: template.brandName || "Brand Name",
              colors: {
                primary: template.primaryColor || "#1a1a1a",
                accent: template.accentColor || "#4fc3f7"
              }
            }}
            marketingData={{}}
            audienceData={{}}
            businessData={{}}
            visualData={{}}
            creativityLevel="template"
          />
        </div>
      </ZoomablePostcard>
    </div>
  );
};

export default function PostcardPreviewPage() {
  const [postcards, setPostcards] = useState<PostcardTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [selectedPostcardIndex, setSelectedPostcardIndex] = useState(0);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [firstVisible, setFirstVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPrevPage, setHasPrevPage] = useState(false);
  const [pageHistory, setPageHistory] = useState<Array<QueryDocumentSnapshot<DocumentData> | null>>([null]);

  // Function to fetch postcards with pagination
  const fetchPostcards = async (pageAction: 'first' | 'next' | 'prev' = 'first') => {
    setLoading(true);
    try {
      let postcardQuery;
      
      if (pageAction === 'first') {
        // First page query
        postcardQuery = query(
          collection(db, 'postcard_template'),
          orderBy('createdAt', 'desc'),
          limit(pageSize + 1) // Get one extra to check if there's a next page
        );
        setPageHistory([null]);
      } else if (pageAction === 'next' && lastVisible) {
        // Next page query
        postcardQuery = query(
          collection(db, 'postcard_template'),
          orderBy('createdAt', 'desc'),
          startAfter(lastVisible),
          limit(pageSize + 1)
        );
        // Add current first document to history for back navigation
        setPageHistory([...pageHistory, firstVisible]);
      } else if (pageAction === 'prev') {
        // Previous page query - use the document from history
        const prevPageStart = pageHistory[pageHistory.length - 2]; // Get previous page's start
        
        postcardQuery = query(
          collection(db, 'postcard_template'),
          orderBy('createdAt', 'desc'),
          startAfter(prevPageStart),
          limit(pageSize + 1)
        );
        
        // Remove the last item from history
        setPageHistory(pageHistory.slice(0, -1));
      } else {
        // Fallback to first page if something goes wrong
        postcardQuery = query(
          collection(db, 'postcard_template'),
          orderBy('createdAt', 'desc'),
          limit(pageSize + 1)
        );
      }
      
      const querySnapshot = await getDocs(postcardQuery);
      const postcardData: PostcardTemplate[] = [];
      
      // Set pagination metadata
      if (!querySnapshot.empty) {
        // Store first and last visible documents for pagination
        setFirstVisible(querySnapshot.docs[0]);
        
        // Check if we have more pages
        const hasNext = querySnapshot.docs.length > pageSize;
        setHasNextPage(hasNext);
        
        // Process only pageSize documents (discard the extra one we used to check for next page)
        const docsToProcess = hasNext ? querySnapshot.docs.slice(0, pageSize) : querySnapshot.docs;
        
        // Set last visible for next page
        setLastVisible(docsToProcess[docsToProcess.length - 1]);
        
        // Convert documents to data
        docsToProcess.forEach((doc) => {
          postcardData.push({
            id: doc.id,
            ...doc.data()
          } as PostcardTemplate);
        });
      } else {
        setHasNextPage(false);
      }
      
      // Update previous page state
      setHasPrevPage(currentPage > 1);
      
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
  };

  // Handle pagination
  const handleNextPage = () => {
    if (hasNextPage) {
      setCurrentPage(currentPage + 1);
      fetchPostcards('next');
    }
  };
  
  const handlePrevPage = () => {
    if (hasPrevPage && currentPage > 1) {
      setCurrentPage(currentPage - 1);
      fetchPostcards('prev');
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchPostcards('first');
  }, []);

  // Debug panel component for development mode
  const DebugPanel = () => {
    if (process.env.NODE_ENV !== 'development' || !showDebugPanel || postcards.length === 0) return null;
    
    const currentPostcard = postcards[selectedPostcardIndex];
    
    // Function to prettify code for display
    const formatCode = (code: string) => {
      return code
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>')
        .replace(/\s{2}/g, '&nbsp;&nbsp;');
    };
    
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[1000] overflow-auto flex">
        <div className="bg-charcoal-dark m-auto w-full max-w-4xl rounded-lg shadow-2xl p-6 max-h-[90vh] overflow-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-electric-teal">Debug Panel</h2>
            <button 
              onClick={() => setShowDebugPanel(false)}
              className="text-electric-teal hover:text-white"
            >
              Close
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-charcoal rounded p-3">
              <h3 className="font-semibold text-electric-teal mb-2">Postcard Info</h3>
              <p className="text-sm text-electric-teal/80 mb-1">
                <span className="font-medium">ID:</span> {currentPostcard.id}
              </p>
              <p className="text-sm text-electric-teal/80 mb-1">
                <span className="font-medium">Brand:</span> {currentPostcard.brandName}
              </p>
              <p className="text-sm text-electric-teal/80 mb-1">
                <span className="font-medium">Style:</span> {currentPostcard.designStyle}
              </p>
              <p className="text-sm text-electric-teal/80 mb-1">
                <span className="font-medium">Created:</span> {currentPostcard.createdAt?.toDate().toLocaleDateString()}
              </p>
              <div className="flex items-center mt-2">
                <span className="text-sm text-electric-teal/80 mr-2">Colors:</span>
                <div 
                  className="w-4 h-4 rounded-full mr-1" 
                  style={{ backgroundColor: currentPostcard.primaryColor || '#cccccc' }}
                  title="Primary Color"
                />
                <div 
                  className="w-4 h-4 rounded-full" 
                  style={{ backgroundColor: currentPostcard.accentColor || '#cccccc' }}
                  title="Accent Color"
                />
              </div>
            </div>
            
            <div className="bg-charcoal rounded p-3">
              <h3 className="font-semibold text-electric-teal mb-2">View Options</h3>
              
              <div className="flex items-center mb-2">
                <span className="text-sm text-electric-teal/80 mr-2">Select Postcard:</span>
                <select 
                  value={selectedPostcardIndex}
                  onChange={(e) => setSelectedPostcardIndex(Number(e.target.value))}
                  className="bg-charcoal-light text-electric-teal border border-electric-teal/30 rounded px-2 py-1 text-sm"
                >
                  {postcards.map((postcard, index) => (
                    <option key={postcard.id} value={index}>
                      {index + 1}: {postcard.brandName}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="space-y-2">
                <button 
                  onClick={() => {
                    const cleanedCode = currentPostcard.code
                      .replace(/\/\/.*$/gm, '')
                      .replace(/\/\*[\s\S]*?\*\//g, '')
                      .trim();
                    console.log("Cleaned code (no comments):", cleanedCode);
                  }}
                  className="w-full text-xs bg-charcoal-light hover:bg-electric-teal/20 text-electric-teal px-2 py-1 rounded"
                >
                  Log Cleaned Code
                </button>
                
                <button 
                  onClick={() => {
                    const codeWithoutConst = currentPostcard.code.replace(/const\s+PostcardDesign\s*=\s*/, '');
                    console.log("Code without const declaration:", codeWithoutConst);
                  }}
                  className="w-full text-xs bg-charcoal-light hover:bg-electric-teal/20 text-electric-teal px-2 py-1 rounded"
                >
                  Log Without Const
                </button>
                
                <button 
                  onClick={() => {
                    const debugInfo = {
                      codeLength: currentPostcard.code?.length || 0,
                      codeStart: currentPostcard.code?.substring(0, 150),
                      codeEnd: currentPostcard.code?.substring(currentPostcard.code.length - 150),
                      hasReactCreateElement: currentPostcard.code.includes('React.createElement'),
                      hasJSX: currentPostcard.code.includes('<') && currentPostcard.code.includes('/>'),
                      includesComments: currentPostcard.code.includes('//') || currentPostcard.code.includes('/*'),
                    };
                    console.table(debugInfo);
                  }}
                  className="w-full text-xs bg-charcoal-light hover:bg-electric-teal/20 text-electric-teal px-2 py-1 rounded"
                >
                  Analyze Code
                </button>
              </div>
            </div>
            
            <div className="bg-charcoal rounded p-3">
              <h3 className="font-semibold text-electric-teal mb-2">Rendering Test</h3>
              
              <button 
                onClick={() => {
                  try {
                    // Try to run the non-const code
                    const codeWithoutConst = currentPostcard.code.replace(/const\s+PostcardDesign\s*=\s*/, '');
                    const evalFunction = new Function('React', `
                      try {
                        const fn = ${codeWithoutConst};
                        return fn;
                      } catch (err) {
                        console.error("Evaluation error:", err);
                        return null;
                      }
                    `);
                    const result = evalFunction(React);
                    console.log("Evaluation result:", result);
                    if (typeof result === 'function') {
                      console.log("Successfully evaluated as function!");
                    }
                  } catch (error) {
                    console.error("Test evaluation failed:", error);
                  }
                }}
                className="w-full text-xs bg-charcoal-light hover:bg-electric-teal/20 text-electric-teal px-2 py-1 rounded mb-2"
              >
                Test Evaluation
              </button>
              
              <div className="text-xs text-electric-teal/80 mt-2">
                <p>Code length: {currentPostcard.code?.length || 0} characters</p>
                <p>Has fallback: {currentPostcard.usedFallback ? "Yes" : "No"}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-charcoal-light rounded-lg p-3 mb-4">
            <h3 className="font-semibold text-electric-teal mb-2">Code Preview (First 300 chars)</h3>
            <pre className="p-3 bg-charcoal overflow-auto text-xs text-electric-teal/90 rounded max-h-40">
              <code dangerouslySetInnerHTML={{ __html: formatCode(currentPostcard.code.substring(0, 300) + '...') }} />
            </pre>
          </div>
          
          <div className="text-center mt-4">
            <button 
              onClick={() => setShowDebugPanel(false)}
              className="px-4 py-2 bg-electric-teal text-charcoal rounded-md hover:bg-electric-teal/80 transition"
            >
              Close Debug Panel
            </button>
          </div>
        </div>
      </div>
    );
  };

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
                onClick={() => setShowDebugPanel(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition"
              >
                Debug Panel
              </button>
            )}
            <Link href="/" className="px-4 py-2 bg-electric-teal text-charcoal rounded-md hover:bg-electric-teal/80 transition">
              Back to Home
            </Link>
          </div>
        </div>
        
        {/* Show debug panel if enabled */}
        {showDebugPanel && <DebugPanel />}

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
          <>
            <div className="grid grid-cols-1 gap-8">
              {postcards.map((postcard) => (
                <motion.div
                  key={postcard.id}
                  whileHover={{ scale: 1.01 }}
                  className="bg-charcoal-light rounded-lg overflow-hidden shadow p-4"
                >
                  <div className="mb-4 flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-electric-teal text-xl truncate">{postcard.brandName}</h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs px-2 py-1 bg-charcoal rounded-full text-electric-teal">
                          {postcard.designStyle}
                        </span>
                        <span className="text-xs text-electric-teal/70">
                          {postcard.createdAt?.toDate().toLocaleDateString() || 'Unknown date'}
                        </span>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <div 
                        className="w-5 h-5 rounded-full" 
                        style={{ backgroundColor: postcard.primaryColor || '#cccccc' }} 
                        title="Primary Color"
                      />
                      <div 
                        className="w-5 h-5 rounded-full" 
                        style={{ backgroundColor: postcard.accentColor || '#cccccc' }} 
                        title="Accent Color"
                      />
                    </div>
                  </div>
                  
                  <DynamicPostcard template={postcard} />
                  
                  {postcard.usedFallback && (
                    <div className="text-xs text-amber-500 mt-2">
                      <span>⚠️ Fallback design</span>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
            
            {/* Pagination Controls */}
            <div className="flex justify-center items-center mt-8 space-x-4">
              <button
                onClick={handlePrevPage}
                disabled={!hasPrevPage}
                className={`px-4 py-2 rounded-md transition ${
                  hasPrevPage 
                    ? 'bg-electric-teal text-charcoal hover:bg-electric-teal/80' 
                    : 'bg-charcoal-light text-electric-teal/50 cursor-not-allowed'
                }`}
              >
                Previous
              </button>
              
              <span className="text-electric-teal">Page {currentPage}</span>
              
              <button
                onClick={handleNextPage}
                disabled={!hasNextPage}
                className={`px-4 py-2 rounded-md transition ${
                  hasNextPage 
                    ? 'bg-electric-teal text-charcoal hover:bg-electric-teal/80' 
                    : 'bg-charcoal-light text-electric-teal/50 cursor-not-allowed'
                }`}
              >
                Next
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
} 