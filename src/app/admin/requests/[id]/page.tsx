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

// Define a type for the request data (adjust based on actual structure)
interface DesignRequestData {
  userId: string;
  status: string;
  userInputData: UserInputData; // Use the specific type instead of any
  logoUrl: string;
  aiGeneratedPrompt?: string;
  aiSummary?: string;
  notifiedAdmin?: boolean;
  finalImageUrls?: string[]; // Add field for final images
  completedAt?: Timestamp; // Use Timestamp type instead of any
  // Add other fields as needed
}

export default function AdminRequestPage() {
  const params = useParams();
  const requestId = params?.id as string; // Get ID from dynamic route
  const [requestData, setRequestData] = useState<DesignRequestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- State for Admin Actions ---
  const [finalFiles, setFinalFiles] = useState<FileList | null>(null);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  // --- End Admin Actions State ---

  useEffect(() => {
    if (!requestId) return;
    // Reset action states if requestId changes
    setFinalFiles(null);
    setUploadProgress({});
    setUploadedUrls([]);
    setIsUploading(false);
    setIsCompleting(false);
    setActionError(null);
    setActionSuccess(null);
    
    const fetchRequestData = async () => {
      setLoading(true);
      setError(null);
      try {
        console.log(`Admin fetching request data for ID: ${requestId}`);
        const docRef = doc(db, 'design_requests', requestId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          console.log("Request data found:", docSnap.data());
          const data = docSnap.data() as DesignRequestData;
          setRequestData(data);
          if (data.finalImageUrls) {
            setUploadedUrls(data.finalImageUrls);
          }
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

  // --- Admin Action Handlers ---
  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    setFinalFiles(event.target.files);
  };

  const handleUploadFinalDesigns = async () => {
    if (!finalFiles || finalFiles.length === 0 || !requestId) {
      setActionError("Please select files to upload.");
      return;
    }
    if (requestData?.status === 'completed') {
      setActionError("This request is already completed.");
      return;
    }

    setIsUploading(true);
    setActionError(null);
    setActionSuccess(null);
    setUploadProgress({});

    const uploadPromises = Array.from(finalFiles).map((file) => {
      const storageRef = ref(storage, `final_designs/${requestId}/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      return new Promise<string>((resolve, reject) => {
        uploadTask.on('state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(prev => ({ ...prev, [file.name]: progress }));
            console.log(`Upload is ${progress}% done for ${file.name}`);
          },
          (error) => {
            console.error(`Upload failed for ${file.name}:`, error);
            setActionError(`Upload failed for ${file.name}.`);
            reject(error);
          },
          async () => {
            try {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              console.log(`File ${file.name} available at`, downloadURL);
              resolve(downloadURL);
            } catch (getUrlError) {
              console.error(`Failed to get download URL for ${file.name}:`, getUrlError);
              setActionError(`Failed get URL for ${file.name}.`);
              reject(getUrlError);
            }
          }
        );
      });
    });

    try {
      const urls = await Promise.all(uploadPromises);
      setUploadedUrls(prev => [...prev, ...urls]); // Append new URLs
      setActionSuccess(`${urls.length} file(s) uploaded successfully!`);
      setFinalFiles(null); // Clear selected files after upload
    } catch (uploadError) {
      console.error("Error uploading files:", uploadError);
      setActionError("One or more file uploads failed. Please check console.");
    } finally {
      setIsUploading(false);
      setUploadProgress({});
    }
  };

  const handleMarkComplete = async () => {
    if (!requestId || uploadedUrls.length === 0) {
      setActionError("No final designs have been uploaded yet.");
      return;
    }
     if (requestData?.status === 'completed') {
      setActionError("This request is already completed.");
      return;
    }

    setIsCompleting(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const docRef = doc(db, 'design_requests', requestId);
      await updateDoc(docRef, {
        status: 'completed',
        finalImageUrls: uploadedUrls,
        completedAt: serverTimestamp(), // Use server timestamp
      });
      
      // Refresh local state to reflect completion
      setRequestData(prev => prev ? ({ ...prev, status: 'completed', finalImageUrls: uploadedUrls }) : null);
      setActionSuccess("Request marked as complete!");
      
    } catch (updateError) {
      console.error("Error marking request as complete:", updateError);
      setActionError("Failed to update request status. Please try again.");
    } finally {
      setIsCompleting(false);
    }
  };
  // --- End Admin Action Handlers ---

  if (loading) {
    return <div className="container mx-auto p-4">Loading request details...</div>;
  }

  if (error) {
    return <div className="container mx-auto p-4 text-red-500">Error: {error}</div>;
  }

  if (!requestData) {
    return <div className="container mx-auto p-4">Request not found.</div>;
  }

  const isCompleted = requestData.status === 'completed';

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold">Review Design Request</h1>
      {actionSuccess && <div className="p-3 bg-green-100 border border-green-300 text-green-700 rounded-md">{actionSuccess}</div>}
      {actionError && <div className="p-3 bg-red-100 border border-red-300 text-red-700 rounded-md">{actionError}</div>}
      <p><span className="font-semibold">Request ID:</span> {requestId}</p>
      <p><span className="font-semibold">User ID:</span> {requestData.userId}</p>
      <p><span className="font-semibold">Status:</span> {requestData.status}</p>

      <div className="bg-gray-100 p-4 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">User Input Data</h2>
        {/* TODO: Display user input data nicely - potentially reuse wizard components in read-only mode? */}
        <pre className="text-sm whitespace-pre-wrap break-words">
          {JSON.stringify(requestData.userInputData, null, 2)}
        </pre>
      </div>

      <div className="bg-gray-100 p-4 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Logo</h2>
        {requestData.logoUrl ? (
          <img src={requestData.logoUrl} alt="User Logo" className="max-w-xs max-h-32 object-contain border" />
        ) : (
          <p>No logo uploaded.</p>
        )}
      </div>

      <div className="bg-gray-100 p-4 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">AI Generated Content</h2>
        <div>
          <h3 className="font-semibold">Image Prompt:</h3>
          <p className="text-sm whitespace-pre-wrap break-words">{requestData.aiGeneratedPrompt || 'Not generated yet.'}</p>
        </div>
        <div className="mt-2">
          <h3 className="font-semibold">Admin Summary:</h3>
          <p className="text-sm whitespace-pre-wrap break-words">{requestData.aiSummary || 'Not generated yet.'}</p>
        </div>
      </div>

      {/* --- Admin Actions Section --- */}
      <div className={`p-4 rounded-lg ${isCompleted ? 'bg-green-50' : 'bg-blue-50'} border ${isCompleted ? 'border-green-200' : 'border-blue-200'}`}>
        <h2 className="text-xl font-semibold mb-3">Admin Actions</h2>
        
        {isCompleted ? (
          <p className="text-green-700 font-medium">This request has been completed.</p>
        ) : (
          <div className="space-y-4">
            {/* File Upload */}
            <div>
              <label htmlFor="finalDesignUpload" className="block text-sm font-medium text-gray-700 mb-1">
                Upload Final Postcard Design(s)
              </label>
              <input
                type="file"
                id="finalDesignUpload"
                multiple
                onChange={handleFileSelect}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
                disabled={isUploading || isCompleting}
              />
              {finalFiles && finalFiles.length > 0 && (
                <p className="text-xs text-gray-500 mt-1">{finalFiles.length} file(s) selected.</p>
              )}
              <button
                onClick={handleUploadFinalDesigns}
                disabled={!finalFiles || finalFiles.length === 0 || isUploading || isCompleting}
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center min-w-[100px]"
              >
                {isUploading ? (
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  'Upload Files'
                )}
              </button>
              {isUploading && Object.keys(uploadProgress).length > 0 && (
                <div className="mt-2 space-y-1">
                  {Object.entries(uploadProgress).map(([fileName, progress]) => (
                    <div key={fileName} className="text-xs">
                      <span>{fileName}:</span>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${progress}%` }}></div>
                      </div>
                      <span>{progress.toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Uploaded Files Display */}
            {uploadedUrls.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700">Uploaded Designs:</h3>
                <ul className="list-disc list-inside text-sm text-blue-600">
                  {uploadedUrls.map((url, index) => (
                    <li key={index}>
                      <a href={url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        Final Design {index + 1}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Mark Complete Button */}
            <div>
              <button
                onClick={handleMarkComplete}
                disabled={uploadedUrls.length === 0 || isUploading || isCompleting}
                className="px-4 py-2 bg-green-600 text-white rounded-md shadow-sm hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center min-w-[150px]"
              >
                {isCompleting ? (
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  'Mark as Complete'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 