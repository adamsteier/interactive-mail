'use client';

import { useEffect, useState, ChangeEvent } from 'react';
import { useParams } from 'next/navigation';
import { doc, getDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase'; // Ensure storage is imported
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

// --- Define specific types for User Input Data ---
// TODO: Consider moving these to a shared types file
interface BrandData {
  brandName: string;
  logoUrl: string; 
  primaryColor: string;
  accentColor: string;
  stylePreferences: string[];
  // Add other potential fields from BrandIdentity if needed
}

interface MarketingData {
  objectives: string[];
  callToAction: string;
  // Add other potential fields from MarketingGoals if needed
}

interface AudienceData {
  industry: string;
  targetDescription: string;
  // Add other potential fields from TargetAudience if needed
}

interface BusinessData {
  tagline: string;
  contactInfo: {
    phone: string;
    email: string;
    website: string;
    address: string;
  };
  // Add other potential fields from BusinessDetails if needed
}

interface VisualData {
  imageStyle: string[]; 
  imageSource: string; 
  layoutStyle: string; 
  imagePrimarySubject: string;
  // Add other potential fields from VisualElements if needed
}

interface UserInputData {
  brandData: BrandData;
  marketingData: MarketingData;
  audienceData: AudienceData;
  businessData: BusinessData;
  visualData: VisualData;
}
// --- End User Input Data Types ---

// --- Define type for a single Campaign within the request --- 
interface RequestCampaign {
  businessType: string;
  userInputData: UserInputData; // Keep original user input per campaign if needed for display
  marketingData: MarketingData; // Or flatten userInputData if preferred
  audienceData: AudienceData;
  businessData: BusinessData;
  visualData: VisualData;
  finalDesigns?: string[]; // Array of final design URLs for this campaign
}

// --- Define type for the overall Request Data --- 
interface DesignRequestData {
  userId: string;
  status: string;
  designScope: 'single' | 'multiple'; // Add designScope
  globalBrandData?: BrandData; // Add global brand data
  campaigns: RequestCampaign[]; // Array of campaigns
  logoUrl: string; // Still global logo
  aiGeneratedPrompt?: string;
  aiSummary?: string;
  notifiedAdmin?: boolean;
  // finalImageUrls removed - now per-campaign
  completedAt?: Timestamp;
  // Add other fields as needed
}

export default function AdminRequestPage() {
  const params = useParams();
  const requestId = params?.id as string; 
  const [requestData, setRequestData] = useState<DesignRequestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- State for Admin Actions --- 
  // Store selected files per campaign (key: businessType or index)
  const [filesToUpload, setFilesToUpload] = useState<Record<string, FileList | null>>({}); 
  // Store upload progress per file within a campaign
  const [uploadProgress, setUploadProgress] = useState<Record<string, Record<string, number>>>({}); // { campaignKey: { fileName: progress } }
  // No longer need global uploadedUrls - fetched from requestData.campaigns[...].finalDesigns
  // const [uploadedUrls, setUploadedUrls] = useState<string[]>([]); 
  const [isUploading, setIsUploading] = useState<Record<string, boolean>>({}); // { campaignKey: boolean }
  const [isCompleting, setIsCompleting] = useState(false); // Global completion state
  const [actionError, setActionError] = useState<Record<string, string | null>>({}); // { campaignKey or 'global': error }
  const [actionSuccess, setActionSuccess] = useState<Record<string, string | null>>({});// { campaignKey or 'global': success }
  // --- End Admin Actions State --- 

  useEffect(() => {
    if (!requestId) return;
    // Reset states
    setFilesToUpload({});
    setUploadProgress({});
    setIsUploading({});
    setIsCompleting(false);
    setActionError({});
    setActionSuccess({});
    
    const fetchRequestData = async () => {
      setLoading(true);
      setError(null);
      try {
        console.log(`Admin fetching request data for ID: ${requestId}`);
        const docRef = doc(db, 'design_requests', requestId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          console.log("Request data found:", docSnap.data());
          setRequestData(docSnap.data() as DesignRequestData);
          // No need to setUploadedUrls here anymore
        } else {
          console.error('No such document!');
          setError('Design request not found.');
        }
      } catch (err) {
        console.error('Error fetching document:', err);
        setError('Failed to load request data.');
      } finally {
        setLoading(false);
      }
    };

    fetchRequestData();
  }, [requestId]);

  // --- Modified Admin Action Handlers --- 
  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>, campaignKey: string) => {
    setFilesToUpload(prev => ({ ...prev, [campaignKey]: event.target.files }));
    setActionError(prev => ({ ...prev, [campaignKey]: null })); // Clear error on new selection
    setActionSuccess(prev => ({ ...prev, [campaignKey]: null }));
  };

  const handleUploadFinalDesigns = async (campaignKey: string, campaignIndex: number) => {
    const files = filesToUpload[campaignKey];
    if (!files || files.length === 0 || !requestId) {
      setActionError(prev => ({...prev, [campaignKey]: "Please select files to upload for this campaign."}));
      return;
    }
    // No global completion check here, just upload

    setIsUploading(prev => ({...prev, [campaignKey]: true}));
    setActionError(prev => ({...prev, [campaignKey]: null}));
    setActionSuccess(prev => ({...prev, [campaignKey]: null}));
    setUploadProgress(prev => ({...prev, [campaignKey]: {} })); // Reset progress for this campaign

    const uploadPromises = Array.from(files).map((file) => {
      // Include campaignKey (businessType) in storage path for organization
      const storageRef = ref(storage, `final_designs/${requestId}/${campaignKey}/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      return new Promise<string>((resolve, reject) => {
        uploadTask.on('state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            // Update progress for the specific file within the specific campaign
            setUploadProgress(prev => ({
               ...prev,
               [campaignKey]: { ...prev[campaignKey], [file.name]: progress }
            }));
          },
          (error) => {
            // Set error for the specific campaign
            setActionError(prev => ({...prev, [campaignKey]: `Upload failed for ${file.name}.`}));
            reject(error);
          },
          async () => {
            try {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(downloadURL);
            } catch (getUrlError) {
              setActionError(prev => ({...prev, [campaignKey]: `Failed get URL for ${file.name}.`}));
              reject(getUrlError);
            }
          }
        );
      });
    });

    try {
      const newUrls = await Promise.all(uploadPromises);
      
      // Update Firestore document: add URLs to the specific campaign's finalDesigns array
      const docRef = doc(db, 'design_requests', requestId);
      // Get current finalDesigns array or default to empty array
      const currentDesigns = requestData?.campaigns[campaignIndex]?.finalDesigns || []; 
      const updatedDesigns = [...currentDesigns, ...newUrls];
      
      // Update using dot notation
      await updateDoc(docRef, {
          [`campaigns.${campaignIndex}.finalDesigns`]: updatedDesigns
      });

      // Update local state to reflect the change immediately
      setRequestData(prev => {
          if (!prev) return null;
          const updatedCampaigns = [...prev.campaigns];
          updatedCampaigns[campaignIndex] = { ...updatedCampaigns[campaignIndex], finalDesigns: updatedDesigns };
          return { ...prev, campaigns: updatedCampaigns };
      });

      setActionSuccess(prev => ({...prev, [campaignKey]: `${newUrls.length} file(s) uploaded successfully!`}));
      setFilesToUpload(prev => ({ ...prev, [campaignKey]: null })); // Clear selected files
    } catch (uploadError) {
      console.error(`Error uploading files for campaign ${campaignKey}:`, uploadError);
      setActionError(prev => ({...prev, [campaignKey]: "One or more file uploads failed."}));
    } finally {
      setIsUploading(prev => ({...prev, [campaignKey]: false}));
      // Don't clear progress immediately, let it show 100%
    }
  };

  // Check if all campaigns (in multi-design mode) have designs
  const canMarkComplete = requestData?.designScope === 'multiple' 
     ? requestData.campaigns.every(c => c.finalDesigns && c.finalDesigns.length > 0)
     : (requestData?.campaigns[0]?.finalDesigns && requestData.campaigns[0].finalDesigns.length > 0); // Check first campaign for single

  const handleMarkComplete = async () => {
    if (!requestId || !canMarkComplete) {
      setActionError(prev => ({...prev, global: "Designs must be uploaded for all campaigns before completing."}));
      return;
    }
     if (requestData?.status === 'completed') {
      setActionError(prev => ({...prev, global: "This request is already completed."}));
      return;
    }

    setIsCompleting(true);
    setActionError(prev => ({...prev, global: null}));
    setActionSuccess(prev => ({...prev, global: null}));

    try {
      const docRef = doc(db, 'design_requests', requestId);
      await updateDoc(docRef, {
        status: 'completed',
        // No need to update finalImageUrls here, they are already in campaigns
        completedAt: serverTimestamp(), 
      });
      
      setRequestData(prev => prev ? ({ ...prev, status: 'completed' }) : null);
      setActionSuccess(prev => ({...prev, global: "Request marked as complete!"}));
      
    } catch (updateError) {
      console.error("Error marking request as complete:", updateError);
      setActionError(prev => ({...prev, global: "Failed to update request status."}));
    } finally {
      setIsCompleting(false);
    }
  };
  // --- End Admin Action Handlers --- 

  if (loading) {
    return <div className="container mx-auto p-4 text-[#EAEAEA]">Loading request details...</div>;
  }

  if (error) {
    return <div className="container mx-auto p-4 text-red-400">Error: {error}</div>;
  }

  if (!requestData) {
    return <div className="container mx-auto p-4 text-[#EAEAEA]">Request not found.</div>;
  }

  const isCompleted = requestData.status === 'completed';

  return (
    <div className="container mx-auto p-4 space-y-6 bg-[#1A1A1A] text-[#EAEAEA]">
      <h1 className="text-3xl font-bold text-[#00F0FF]">Review Design Request</h1>
      {actionSuccess.global && <div className="p-3 bg-green-800 border border-green-500 text-green-300 rounded-md">{actionSuccess.global}</div>}
      {actionError.global && <div className="p-3 bg-red-900 border border-red-600 text-red-300 rounded-md">{actionError.global}</div>}
      <p><span className="font-semibold text-[#EAEAEA]">Request ID:</span> {requestId}</p>
      <p><span className="font-semibold text-[#EAEAEA]">User ID:</span> {requestData.userId}</p>
      <p><span className="font-semibold text-[#EAEAEA]">Status:</span> <span className={`${isCompleted ? 'text-green-400' : 'text-yellow-400'}`}>{requestData.status}</span></p>
      <p><span className="font-semibold">Scope:</span> {requestData.designScope}</p>

      {/* Display Global Brand Data */} 
      {requestData.globalBrandData && (
          <div className="bg-[#2F2F2F] p-4 rounded-lg border border-gray-700">
              <h2 className="text-xl font-semibold mb-2">Global Brand Data</h2>
              <pre className="text-sm whitespace-pre-wrap break-words bg-[#1A1A1A] p-3 rounded">
                  {JSON.stringify(requestData.globalBrandData, null, 2)}
              </pre>
          </div>
      )}

      {/* Display Logo */} 
      <div className="bg-[#2F2F2F] p-4 rounded-lg border border-gray-700">
          <h2 className="text-xl font-semibold mb-2">Logo</h2>
          {requestData.logoUrl ? (
            <img src={requestData.logoUrl} alt="User Logo" className="max-w-xs max-h-32 object-contain border border-gray-600 bg-white p-1 rounded" />
          ) : (
            <p className="text-gray-400">No logo uploaded.</p>
          )}
      </div>

      {/* Display AI Content */} 
      <div className="bg-[#2F2F2F] p-4 rounded-lg border border-gray-700">
          <h2 className="text-xl font-semibold mb-2">AI Generated Content</h2>
          <div>
            <h3 className="font-semibold text-[#EAEAEA]">Image Prompt:</h3>
            <p className="text-sm whitespace-pre-wrap break-words text-gray-300">{requestData.aiGeneratedPrompt || 'Not generated yet.'}</p>
          </div>
          <div className="mt-2">
            <h3 className="font-semibold text-[#EAEAEA]">Admin Summary:</h3>
            <p className="text-sm whitespace-pre-wrap break-words text-gray-300">{requestData.aiSummary || 'Not generated yet.'}</p>
          </div>
      </div>

      {/* --- Campaign Sections --- */} 
      <div className="space-y-6">
          <h2 className="text-2xl font-semibold border-b border-gray-600 pb-2">Campaign Details & Final Designs</h2>
          {requestData.campaigns && requestData.campaigns.length > 0 ? requestData.campaigns.map((campaign, index) => {
              console.log(`Rendering campaign at index ${index}:`, campaign);
              
              if (!campaign || !campaign.businessType) { 
                  console.warn(`Skipping rendering for invalid campaign object at index ${index}:`, campaign);
                  return null;
              }
              const campaignKey = campaign.businessType; 
              const campaignFiles = filesToUpload[campaignKey];
              const campaignIsUploading = isUploading[campaignKey];
              const campaignActionError = actionError[campaignKey];
              const campaignActionSuccess = actionSuccess[campaignKey];
              const campaignUploadProgress = uploadProgress[campaignKey] || {};
              
              return (
                  <div key={index} className="bg-[#2F2F2F] p-4 rounded-lg border border-gray-700 space-y-4">
                      <h3 className="text-xl font-bold text-[#00F0FF]">Campaign: {campaign.businessType === '__all__' ? 'General Design' : campaign.businessType}</h3>
                      
                      {/* Optional: Display campaign-specific user input summary */} 
                      {/* <details><summary>User Input Summary</summary>...</details> */} 
                      
                      {/* Display existing uploaded designs for this campaign */} 
                      <div>
                          <h4 className="text-lg font-semibold mb-2">Uploaded Final Designs</h4>
                          {campaign.finalDesigns && campaign.finalDesigns.length > 0 ? (
                              <ul className="list-disc list-inside text-sm space-y-1">
                                  {campaign.finalDesigns.map((url, i) => (
                                      <li key={i}>
                                          <a href={url} target="_blank" rel="noopener noreferrer" className="text-[#00F0FF] hover:underline hover:text-[#FF00B8]">
                                              Final Design {i + 1}
                                          </a>
                                      </li>
                                  ))}
                              </ul>
                          ) : (
                              <p className="text-gray-400 text-sm">No designs uploaded for this campaign yet.</p>
                          )}
                      </div>
                      
                      {/* Per-Campaign Admin Actions (Upload) */} 
                      {!isCompleted && (
                          <div className="border-t border-gray-600 pt-4 space-y-3">
                              <h4 className="text-lg font-semibold">Upload Final Designs for {campaign.businessType}</h4>
                              {campaignActionSuccess && <div className="p-2 text-sm bg-green-800 border border-green-500 text-green-300 rounded-md">{campaignActionSuccess}</div>}
                              {campaignActionError && <div className="p-2 text-sm bg-red-900 border border-red-600 text-red-300 rounded-md">{campaignActionError}</div>}
                              <div>
                                  <label htmlFor={`finalDesignUpload-${campaignKey}`} className="sr-only">Upload files</label>
                                  <input
                                      type="file"
                                      id={`finalDesignUpload-${campaignKey}`}
                                      multiple
                                      onChange={(e) => handleFileSelect(e, campaignKey)}
                                      className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#00F0FF] file:text-[#1A1A1A] hover:file:bg-[#FF00B8] hover:file:text-white disabled:opacity-50"
                                      disabled={campaignIsUploading || isCompleting}
                                  />
                                  {campaignFiles && campaignFiles.length > 0 && (
                                      <p className="text-xs text-gray-400 mt-1">{campaignFiles.length} file(s) selected.</p>
                                  )}
                                  <button
                                      onClick={() => handleUploadFinalDesigns(campaignKey, index)}
                                      disabled={!campaignFiles || campaignFiles.length === 0 || campaignIsUploading || isCompleting}
                                      className="mt-2 px-4 py-2 bg-[#00F0FF] text-[#1A1A1A] rounded-md shadow-sm hover:bg-[#FF00B8] hover:text-white disabled:bg-gray-500 disabled:text-gray-300 disabled:cursor-not-allowed flex items-center justify-center min-w-[100px] font-semibold"
                                  >
                                      {/* Upload button state ... */} 
                                      {campaignIsUploading ? 'Uploading...' : 'Upload'}
                                  </button>
                                  {campaignIsUploading && Object.keys(campaignUploadProgress).length > 0 && (
                                     <div className="mt-2 space-y-1">
                                      {Object.entries(campaignUploadProgress).map(([fileName, progress]) => (
                                        <div key={fileName} className="text-xs text-gray-400">
                                           {/* Progress bar rendering ... */} 
                                           <span>{fileName}: {progress.toFixed(0)}%</span>
                                         </div>
                                      ))}
                                     </div>
                                  )}
                              </div>
                          </div>
                      )}
                  </div>
              );
          }) : <p className="text-gray-400">No campaign data found in this request.</p> }
      </div>
      {/* --- End Campaign Sections --- */} 

      {/* --- Global Completion Action --- */} 
      <div className={`mt-6 p-4 rounded-lg ${isCompleted ? 'bg-[#1a3a1a]' : 'bg-[#1a2a3a]'} border ${isCompleted ? 'border-[#00F0FF]' : 'border-gray-600'}`}>
        <h2 className="text-xl font-semibold mb-3">Complete Request</h2>
        {isCompleted ? (
          <p className="text-[#00F0FF] font-medium">This request has been completed.</p>
        ) : (
          <div>
            <button
              onClick={handleMarkComplete}
              disabled={!canMarkComplete || isCompleting || Object.values(isUploading).some(v => v)}
              className="px-4 py-2 bg-green-600 text-white rounded-md shadow-sm hover:bg-green-700 disabled:bg-gray-500 disabled:text-gray-300 disabled:cursor-not-allowed flex items-center justify-center min-w-[150px] font-semibold"
            >
              {isCompleting ? 'Completing...' : 'Mark Request as Complete'}
            </button>
            {!canMarkComplete && <p className="text-xs text-yellow-400 mt-1">Requires final designs to be uploaded for all campaigns.</p>}
          </div>
        )}
      </div>
      {/* --- End Global Completion Action --- */} 

    </div>
  );
} 