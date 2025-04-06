'use client';

import React, { useState, useEffect, ChangeEvent } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import type { BrandingData, CampaignDesignData } from '@/types/firestoreTypes';

// Add local type definition matching the one in firestoreTypes.ts
type CampaignStatus = 'draft' | 'saving' | 'processing' | 'ready' | 'failed' | 'submitted' | 'completed';

const UserDesignsPage = () => {
    const params = useParams();
    const searchParams = useSearchParams();
    const userId = params.userId as string;
    const highlightedCampaignId = searchParams.get('campaignId');

    const [brandData, setBrandData] = useState<BrandingData | null>(null); 
    const [campaignDesigns, setCampaignDesigns] = useState<CampaignDesignData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // --- NEW: State for Final Design Uploads ---
    const [selectedFileMap, setSelectedFileMap] = useState<Map<string, File>>(new Map());
    const [uploadProgressMap, setUploadProgressMap] = useState<Map<string, number>>(new Map());
    const [uploadErrorMap, setUploadErrorMap] = useState<Map<string, string>>(new Map());
    const [isUploadingMap, setIsUploadingMap] = useState<Map<string, boolean>>(new Map());
    // Ref for file inputs if needed, maybe manage via button click instead
    // const fileInputRefs = useRef<Map<string, HTMLInputElement | null>>(new Map()); 
    // --- END: Upload State ---

    useEffect(() => {
        if (!userId) {
            setError("User ID is missing from the URL.");
            setIsLoading(false);
            return;
        }

        const fetchData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                // Fetch Brand Data (assuming only one brand document per user for now)
                const brandQuerySnapshot = await getDocs(collection(db, 'users', userId, 'branding'));
                if (!brandQuerySnapshot.empty) {
                    // Get the first brand document found
                    const brandDoc = brandQuerySnapshot.docs[0];
                    setBrandData({ id: brandDoc.id, ...brandDoc.data() } as BrandingData);
                } else {
                    console.warn(`No branding data found for user: ${userId}`);
                    // Handle case where brand data might be missing but campaigns exist
                }

                // Fetch Campaign Designs
                const campaignsQuerySnapshot = await getDocs(collection(db, 'users', userId, 'campaignDesignData'));
                const designs = campaignsQuerySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CampaignDesignData));
                setCampaignDesigns(designs);

            } catch (err) {
                console.error("Error fetching user design data:", err);
                const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
                setError(`Failed to load data: ${errorMessage}`);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [userId]);

    // --- NEW: Handlers for File Selection and Upload ---
    const handleFileSelect = (event: ChangeEvent<HTMLInputElement>, campaignId: string) => {
        if (event.target.files && event.target.files[0]) {
            const file = event.target.files[0];
            // Basic validation (e.g., size limit)
            if (file.size > 10 * 1024 * 1024) { // 10MB limit
                setUploadErrorMap(prev => new Map(prev).set(campaignId, "File size exceeds 10MB limit."));
                setSelectedFileMap(prev => { const map = new Map(prev); map.delete(campaignId); return map; });
                event.target.value = ""; // Clear the input
                return;
            }
            setSelectedFileMap(prev => new Map(prev).set(campaignId, file));
            setUploadErrorMap(prev => { const map = new Map(prev); map.delete(campaignId); return map; }); // Clear previous error on new selection
        } else {
            // Clear if no file selected
            setSelectedFileMap(prev => { const map = new Map(prev); map.delete(campaignId); return map; });
        }
    };

    const handleUploadFinalDesign = async (campaignId: string) => {
        const file = selectedFileMap.get(campaignId);
        if (!userId || !file) {
            setUploadErrorMap(prev => new Map(prev).set(campaignId, "No file selected or user ID missing."));
            return;
        }

        setIsUploadingMap(prev => new Map(prev).set(campaignId, true));
        setUploadProgressMap(prev => new Map(prev).set(campaignId, 0));
        setUploadErrorMap(prev => { const map = new Map(prev); map.delete(campaignId); return map; });

        const storageRef = ref(storage, `finalDesigns/${userId}/${campaignId}/${file.name}`);
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on('state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                setUploadProgressMap(prev => new Map(prev).set(campaignId, progress));
            },
            (error) => {
                console.error("Upload failed:", error);
                setUploadErrorMap(prev => new Map(prev).set(campaignId, `Upload failed: ${error.code}`));
                setIsUploadingMap(prev => new Map(prev).set(campaignId, false));
                setUploadProgressMap(prev => { const map = new Map(prev); map.delete(campaignId); return map; });
            },
            async () => {
                // Upload completed successfully
                try {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    console.log('File available at', downloadURL);

                    // Update Firestore document
                    const campaignDocRef = doc(db, 'users', userId, 'campaignDesignData', campaignId);
                    await updateDoc(campaignDocRef, {
                        finalDesignUrl: downloadURL,
                        status: 'completed' as CampaignStatus
                    });

                    // Update local state to reflect change immediately
                    setCampaignDesigns(prevDesigns => 
                        prevDesigns.map((design): CampaignDesignData =>
                            design.id === campaignId 
                                ? { ...design, finalDesignUrl: downloadURL, status: 'completed' as CampaignStatus }
                                : design
                        )
                    );
                    
                    // Clear upload state for this campaign
                    setSelectedFileMap(prev => { const map = new Map(prev); map.delete(campaignId); return map; });
                    setIsUploadingMap(prev => new Map(prev).set(campaignId, false));
                    
                } catch (updateError) {
                    console.error("Failed to get download URL or update Firestore:", updateError);
                    setUploadErrorMap(prev => new Map(prev).set(campaignId, 'Upload succeeded but failed to update record.'));
                    setIsUploadingMap(prev => new Map(prev).set(campaignId, false));
                     setUploadProgressMap(prev => { const map = new Map(prev); map.delete(campaignId); return map; });
                }
            }
        );
    };
    // --- END: Upload Handlers ---

    return (
        <div className="container mx-auto p-4 sm:p-6 bg-gray-900 text-white min-h-screen">
            <h1 className="text-2xl sm:text-3xl font-bold text-electric-teal mb-6">
                Admin View: Designs for User <span className="text-gray-400 font-mono">{userId}</span>
            </h1>

            {isLoading && <p className="text-gray-400">Loading data...</p>}
            {error && <p className="text-red-400 bg-red-900/20 p-3 rounded">Error: {error}</p>}

            {!isLoading && !error && (
                <div className="space-y-8">
                    {/* Brand Information Section */}
                    <section className="bg-gray-800 p-4 rounded-lg shadow">
                        <h2 className="text-xl font-semibold text-electric-teal/90 mb-3">Brand Profile</h2>
                        {brandData ? (
                            <div className="space-y-2 text-sm">
                                <p><span className="font-medium text-gray-400">Brand Name:</span> {brandData.businessName}</p>
                                <p><span className="font-medium text-gray-400">Email:</span> {brandData.email || 'N/A'}</p>
                                <p><span className="font-medium text-gray-400">Website:</span> {brandData.website || 'N/A'}</p>
                                <p><span className="font-medium text-gray-400">Primary Color:</span> 
                                    <span style={{ backgroundColor: brandData.styleComponents?.primaryColor, padding: '2px 8px', marginLeft: '5px', borderRadius: '3px', border: '1px solid gray' }}>
                                        {brandData.styleComponents?.primaryColor}
                                    </span>
                                </p>
                                <p><span className="font-medium text-gray-400">Secondary Color:</span> 
                                     <span style={{ backgroundColor: brandData.styleComponents?.secondaryColor, padding: '2px 8px', marginLeft: '5px', borderRadius: '3px', border: '1px solid gray' }}>
                                         {brandData.styleComponents?.secondaryColor}
                                    </span>
                                </p>
                                {brandData.logoUrl && (
                                    <div>
                                        <span className="font-medium text-gray-400">Logo:</span> 
                                        <img src={brandData.logoUrl} alt="Brand Logo" className="mt-2 h-16 w-auto rounded bg-white p-1" />
                                    </div>
                                )}
                                <p><span className="font-medium text-gray-400">Brand Identity Notes:</span> {brandData.brandIdentity || 'N/A'}</p>
                                {/* Add more brand fields as needed */} 
                            </div>
                        ) : (
                            <p className="text-gray-500">No brand profile found for this user.</p>
                        )}
                    </section>

                    {/* Campaign Designs Section */}
                    <section>
                        <h2 className="text-xl font-semibold text-electric-teal/90 mb-3">Campaign Designs ({campaignDesigns.length})</h2>
                        {campaignDesigns.length > 0 ? (
                            <div className="space-y-4">
                                {campaignDesigns.map((design) => {
                                    // Get state for this specific design
                                    const isUploading = isUploadingMap.get(design.id || '');
                                    const progress = uploadProgressMap.get(design.id || '');
                                    const uploadError = uploadErrorMap.get(design.id || '');
                                    const selectedFile = selectedFileMap.get(design.id || '');

                                    return (
                                        <div 
                                            key={design.id} 
                                            className={`bg-gray-800 p-4 rounded-lg shadow border-2 ${design.id === highlightedCampaignId ? 'border-electric-teal' : 'border-transparent'}`}
                                            id={`campaign-${design.id}`}
                                        >
                                            <h3 className="text-lg font-semibold text-white mb-2">{design.designName}</h3>
                                            <p className="text-xs text-gray-500 mb-2 font-mono">ID: {design.id}</p>
                                            <p><span className="font-medium text-gray-400">Status:</span> 
                                                <span className={`ml-2 px-2 py-0.5 rounded text-xs font-semibold 
                                                    ${design.status === 'ready' ? 'bg-green-700 text-green-100' : 
                                                      design.status === 'processing' ? 'bg-blue-700 text-blue-100' : 
                                                      design.status === 'failed' ? 'bg-red-700 text-red-100' : 
                                                      'bg-gray-600 text-gray-200'}
                                                `}>
                                                    {design.status?.toUpperCase() || 'DRAFT'}
                                                </span>
                                            </p>
                                            <p><span className="font-medium text-gray-400">Goal:</span> {design.primaryGoal || 'N/A'}</p>
                                            <p><span className="font-medium text-gray-400">CTA:</span> {design.callToAction || 'N/A'}</p>
                                            <p><span className="font-medium text-gray-400">Target Audience:</span> {design.targetAudience || 'N/A'}</p>
                                            <p><span className="font-medium text-gray-400">Tone:</span> {design.tone || 'N/A'}</p>
                                            <p><span className="font-medium text-gray-400">Visual Style:</span> {design.visualStyle || 'N/A'}</p>
                                            <p><span className="font-medium text-gray-400">Imagery Notes:</span> {design.imageryDescription || 'N/A'}</p>
                                            
                                            {/* Display Generated Prompt */}
                                            <div className="mt-3 pt-3 border-t border-gray-700">
                                                <h4 className="text-sm font-semibold text-gray-300 mb-1">Generated Prompt:</h4>
                                                {design.status === 'failed' ? (
                                                    <pre className="text-xs text-red-300 bg-red-900/30 p-2 rounded whitespace-pre-wrap font-mono break-words">
                                                        {design.generatedPrompt || 'Error occurred, but no specific message saved.'}
                                                    </pre>
                                                ) : design.generatedPrompt ? (
                                                    <pre className="text-xs text-gray-300 bg-gray-700 p-2 rounded whitespace-pre-wrap font-mono break-words">
                                                        {design.generatedPrompt}
                                                    </pre>
                                                ) : (
                                                    <p className="text-xs text-gray-500 italic">(Prompt not generated yet or status is not &apos;ready&apos;/&apos;failed&apos;)</p>
                                                )}
                                            </div>
                                            
                                            {/* --- NEW: Final Design Upload Section --- */}
                                            <div className="mt-4 pt-4 border-t border-gray-700">
                                                <h4 className="text-sm font-semibold text-gray-300 mb-2">Final Design</h4>
                                                {design.finalDesignUrl ? (
                                                    // Display existing final design
                                                    <div className="mt-2">
                                                        <img 
                                                            src={design.finalDesignUrl} 
                                                            alt={`${design.designName} - Final Design`} 
                                                            className="max-w-xs max-h-60 rounded border border-gray-600" 
                                                        />
                                                        <p className="text-xs text-gray-400 mt-1">Status: Completed</p>
                                                        {/* Optional: Button to replace? */}
                                                    </div>
                                                ) : (
                                                    // Show upload controls if no final design exists yet
                                                    <div className="space-y-2">
                                                        <input 
                                                            type="file" 
                                                            accept="image/*,application/pdf" // Accept images and PDFs
                                                            onChange={(e) => handleFileSelect(e, design.id!)}
                                                            disabled={isUploading}
                                                            className="text-sm text-gray-300 file:mr-4 file:py-1 file:px-2 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-electric-teal/20 file:text-electric-teal hover:file:bg-electric-teal/30 disabled:opacity-50"
                                                        />
                                                        {selectedFile && !isUploading && (
                                                            <p className="text-xs text-gray-400">Selected: {selectedFile.name}</p>
                                                        )}
                                                        
                                                        <button
                                                            onClick={() => handleUploadFinalDesign(design.id!)}
                                                            disabled={!selectedFile || isUploading}
                                                            className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            {isUploading ? `Uploading (${progress?.toFixed(0) ?? 0}%)` : 'Upload Design'}
                                                        </button>

                                                        {/* Progress Bar */}
                                                        {isUploading && progress !== undefined && (
                                                             <div className="w-full h-2 bg-gray-600 rounded-full overflow-hidden mt-1">
                                                                <div className="bg-blue-500 h-full rounded-full" style={{width: `${progress}%`}}></div>
                                                             </div>
                                                        )}
                                                        
                                                        {/* Error Message */}
                                                        {uploadError && <p className="text-xs text-red-400 mt-1">{uploadError}</p>}
                                                    </div>
                                                )}
                                            </div>
                                            {/* --- END: Upload Section --- */}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-gray-500">No campaign designs found for this user.</p>
                        )}
                    </section>
                </div>
            )}
        </div>
    );
};

export default UserDesignsPage; 