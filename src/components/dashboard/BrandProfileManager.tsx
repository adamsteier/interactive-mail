// src/components/dashboard/BrandProfileManager.tsx
'use client';

import React, { useState, useEffect, useRef, ChangeEvent, FormEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { BrandingData } from '@/types/firestoreTypes';
import { addBrandData, updateBrandData, deleteBrandData } from '@/lib/brandingService'; // Import add, update, and delete functions
// TODO: Import deleteBrandData when implementing delete
import { collection, query, onSnapshot, orderBy, Timestamp } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
// Import storage functions for logo upload
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

// Initial empty form data for a new brand
const initialBrandFormData: Partial<Omit<BrandingData, 'id' | 'createdAt' | 'updatedAt'>> = {
    businessName: '',
    address: '',
    email: '',
    website: '',
    logoUrl: '',
    socialMediaHandles: {
        instagram: '',
        facebook: '',
        twitter: '',
        linkedin: ''
    },
    brandIdentity: '',
    styleComponents: {
        primaryColor: '#00c2a8', // Default color
        secondaryColor: '#00858a', // Default color
    }
};

const BrandProfileManager: React.FC = () => {
    const { user } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null); // Ref for logo file input

    const [brands, setBrands] = useState<BrandingData[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // --- State for Add/Edit Modal & Form ---
    const [showModal, setShowModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [modalError, setModalError] = useState<string | null>(null);
    const [editingBrandId, setEditingBrandId] = useState<string | null>(null); // State for editing
    const [formData, setFormData] = useState<Partial<BrandingData>>(initialBrandFormData);

    // --- State for Logo Upload ---
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
    const [logoUploadProgress, setLogoUploadProgress] = useState<number | null>(null);
    const [logoUploadError, setLogoUploadError] = useState<string | null>(null);
    const [isUploadingLogo, setIsUploadingLogo] = useState(false);
    // --- End Modal & Form State ---

    // Helper to validate hex color
    const isValidHex = (hex: string): boolean => {
      return /^#([0-9A-F]{3}){1,2}$/i.test(hex);
    };

    useEffect(() => {
        if (!user) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);
        const brandsQuery = query(
            collection(db, 'users', user.uid, 'branding'),
            orderBy('createdAt', 'desc')
        );
        const unsubscribe = onSnapshot(brandsQuery, (querySnapshot) => {
            const fetchedBrands: BrandingData[] = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                const createdAtDate = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : undefined;
                const updatedAtDate = data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : undefined;
                
                // Construct the object ensuring type compatibility
                const brandData: Partial<BrandingData> = { // Use Partial temporarily for construction
                    ...(data as Omit<BrandingData, 'id' | 'createdAt' | 'updatedAt'>),
                    id: doc.id,
                    createdAt: createdAtDate, // Assign converted Date
                    updatedAt: updatedAtDate,
                };

                 // Type check refinement: Ensure required fields are present after construction
                 // Cast back to BrandingData after checking required fields
                if (!brandData.businessName || !brandData.createdAt || !brandData.updatedAt) {
                    console.warn("Skipping document due to missing required fields:", doc.id, data);
                    return; // Skip this document if essential data is missing
                }

                fetchedBrands.push(brandData as BrandingData); // Now assert as BrandingData
            });
            setBrands(fetchedBrands);
            setIsLoading(false);
        }, (err) => {
            console.error("Error fetching brand profiles:", err);
            setError("Failed to load brand profiles.");
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [user]);

    // Cleanup effect for logo preview URL
    useEffect(() => {
      return () => {
        if (logoPreviewUrl) {
          URL.revokeObjectURL(logoPreviewUrl);
        }
      };
    }, [logoPreviewUrl]);

    // --- Brand Form Handlers (Adapted from AIHumanWizard) ---
    const handleAddNew = () => {
        setEditingBrandId(null); // Ensure not in edit mode
        setFormData(initialBrandFormData); // Reset form
        setLogoFile(null);
        if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
        setLogoPreviewUrl(null);
        setLogoUploadError(null);
        setLogoUploadProgress(null);
        setIsUploadingLogo(false);
        setModalError(null);
        setShowModal(true);
    };

    const handleEdit = (brand: BrandingData) => {
        setEditingBrandId(brand.id!); // Set editing ID
        // Ensure all fields exist, provide defaults if needed from initial state
        setFormData({
            ...initialBrandFormData, // Start with defaults
            ...brand, // Spread actual brand data over defaults
            // Ensure nested objects are also handled correctly if they might be missing
            styleComponents: { 
                ...initialBrandFormData.styleComponents, 
                ...brand.styleComponents 
            },
            socialMediaHandles: { 
                ...initialBrandFormData.socialMediaHandles, 
                ...brand.socialMediaHandles 
            },
        });
        setLogoFile(null); // Clear any selected file
        if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl); // Clear old preview
        setLogoPreviewUrl(brand.logoUrl || null); // Set preview to existing logo if available
        setLogoUploadError(null);
        setLogoUploadProgress(null);
        setIsUploadingLogo(false);
        setModalError(null);
        setShowModal(true);
    };

    const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setModalError(null); // Clear error on input

        if (name === 'logoUrl') return; // Handled by upload logic

        if (name === 'primaryColor' || name === 'secondaryColor') {
            setFormData(prev => ({
                ...prev,
                styleComponents: { ...prev.styleComponents, [name]: value }
            }));
        } else if (['instagram', 'facebook', 'twitter', 'linkedin'].includes(name)) {
             setFormData(prev => ({
                ...prev,
                socialMediaHandles: { ...prev.socialMediaHandles, [name]: value }
            }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleLogoSelect = (event: ChangeEvent<HTMLInputElement>) => {
      if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
      setLogoFile(null);
      setLogoPreviewUrl(null);
      setLogoUploadError(null);
      setLogoUploadProgress(null);
      setIsUploadingLogo(false);
      // Clear logoUrl in form data when a new file is selected (or selection cancelled)
      // Upload will repopulate if successful
      setFormData(prev => ({...prev, logoUrl: ''}));

      if (event.target.files && event.target.files[0]) {
        const file = event.target.files[0];
        if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) {
          setLogoUploadError(!file.type.startsWith('image/') ? 'Please select an image file.' : 'File size must be under 5MB.');
          if (fileInputRef.current) fileInputRef.current.value = "";
          return;
        }
        const previewUrl = URL.createObjectURL(file);
        setLogoFile(file);
        setLogoPreviewUrl(previewUrl);
        handleUploadLogo(file);
      }
    };

    const handleUploadLogo = async (fileToUpload: File) => {
      if (!user) {
        setLogoUploadError('User not logged in.');
        return;
      }
      setIsUploadingLogo(true);
      setLogoUploadProgress(0);
      setLogoUploadError(null);

      const storageRef = ref(storage, `logos/${user.uid}/${Date.now()}_${fileToUpload.name}`);
      const uploadTask = uploadBytesResumable(storageRef, fileToUpload);

      uploadTask.on('state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setLogoUploadProgress(progress);
        },
        (error) => {
          console.error("Logo upload failed:", error);
          setLogoUploadError(`Upload failed: ${error.code}`);
          setIsUploadingLogo(false);
          setLogoUploadProgress(null);
          setLogoFile(null);
          if (fileInputRef.current) fileInputRef.current.value = "";
        },
        () => {
          getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
            setFormData(prev => ({ ...prev, logoUrl: downloadURL }));
            setLogoUploadProgress(100);
            setIsUploadingLogo(false);
            setLogoFile(null);
          }).catch((error) => {
            console.error("Failed to get download URL:", error);
            setLogoUploadError('Upload succeeded but failed to get URL.');
            setIsUploadingLogo(false);
            setLogoUploadProgress(null);
            setLogoFile(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
          });
        }
      );
    };

    const handleFormSubmit = async (e: FormEvent) => {
      e.preventDefault();
      if (!user) { setModalError("You must be logged in."); return; }
      if (!formData.businessName) { setModalError("Business Name is required."); return; }

      setIsSaving(true);
      setModalError(null);
      setLogoUploadError(null);

      try {
        // Prepare data for saving (same as before, ensuring clean object)
        const dataToSave: Partial<Omit<BrandingData, 'id' | 'createdAt' | 'updatedAt'>> = {
          businessName: formData.businessName,
          ...(formData.address && { address: formData.address }),
          ...(formData.email && { email: formData.email }),
          ...(formData.website && { website: formData.website }),
          ...(formData.logoUrl && { logoUrl: formData.logoUrl }), // Use potentially updated logoUrl from state
          ...(formData.brandIdentity && { brandIdentity: formData.brandIdentity }),
        };
        const styleComponentsToSave: { [key: string]: string | undefined } = {};
        if (formData.styleComponents?.primaryColor) styleComponentsToSave.primaryColor = formData.styleComponents.primaryColor;
        if (formData.styleComponents?.secondaryColor) styleComponentsToSave.secondaryColor = formData.styleComponents.secondaryColor;
        if (Object.keys(styleComponentsToSave).length > 0) dataToSave.styleComponents = styleComponentsToSave;
        const socialHandlesToSave: { [key: string]: string } = {};
        for (const [key, value] of Object.entries(formData.socialMediaHandles || {})) {
            if (value && typeof value === 'string' && value.trim() !== '') {
                socialHandlesToSave[key] = value.trim();
            }
        }
        if (Object.keys(socialHandlesToSave).length > 0) dataToSave.socialMediaHandles = socialHandlesToSave;

        // Call update or add based on editingBrandId
        if (editingBrandId) {
            console.log("Updating Brand Data:", editingBrandId, dataToSave);
            await updateBrandData(user.uid, editingBrandId, dataToSave);
        } else {
            console.log("Adding New Brand Data:", dataToSave);
            await addBrandData(user.uid, dataToSave as Omit<BrandingData, 'id' | 'createdAt' | 'updatedAt'>);
        }

        setShowModal(false); // Close modal on success
      } catch (error) {
          console.error("Error saving brand:", error);
          const message = error instanceof Error ? error.message : "Unknown error";
          setModalError(`Failed to save brand profile: ${message}`);
      } finally {
          setIsSaving(false);
      }
    };

    // Delete Handler
    const handleDelete = async (brandId: string) => {
        if (!user || !brandId) return;
        if (!confirm("Are you sure you want to delete this brand profile? This cannot be undone.&apos;")) return;
        
        // Clear previous general errors
        setError(null); 

        try {
            console.log("Deleting brand:", brandId);
            await deleteBrandData(user.uid, brandId);
            // No need to update local state, Firestore listener will handle it.
            console.log("Brand deleted successfully");
        } catch (err) {
            console.error("Error deleting brand:", err);
            const message = err instanceof Error ? err.message : "Unknown error";
            // Show error at the component level, not modal level
            setError(`Failed to delete brand profile: ${message}. Please try again.`);
        }
    };

    // --- Render Logic ---
    if (isLoading) {
        return <div className="p-4 text-gray-400">Loading brand profiles...</div>;
    }

    if (error) {
        return <div className="p-4 text-red-400 bg-red-900/20 border border-red-700 rounded">{error}</div>;
    }

    const placeholderStyle = "placeholder-muted-pink"; // Define or import this style if needed

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-electric-teal">Your Brand Profiles</h2>
                <button
                    onClick={handleAddNew}
                    className="px-4 py-1.5 rounded bg-electric-teal hover:bg-electric-teal/80 text-charcoal text-sm font-semibold shadow-glow transition-all"
                >
                    + Add New Brand
                </button>
            </div>

            {brands.length === 0 ? (
                <p className="text-gray-400 italic">You haven&apos;t created any brand profiles yet.</p>
            ) : (
                <div className="space-y-3">
                    {brands.map((brand) => (
                        <div key={brand.id} className="flex justify-between items-center p-4 bg-charcoal/60 rounded-lg border border-gray-700 hover:border-electric-teal/40 transition-colors">
                            <div>
                                <h3 className="font-medium text-white">{brand.businessName}</h3>
                                {brand.styleComponents?.primaryColor && (
                                    <span className="text-xs text-gray-400 mr-2">Primary:
                                        <span style={{ backgroundColor: brand.styleComponents.primaryColor }} className="inline-block w-3 h-3 rounded-full ml-1 border border-gray-500"></span>
                                    </span>
                                )}
                            </div>
                            <div className="space-x-2">
                                <button onClick={() => handleEdit(brand)} className="text-xs text-blue-400 hover:underline">Edit</button>
                                <button onClick={() => handleDelete(brand.id!)} className="text-xs text-red-400 hover:underline">Delete</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add/Edit Modal */} 
            {showModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-40 p-4">
                   <form 
                      onSubmit={handleFormSubmit} // Use renamed handler
                      className="bg-charcoal p-6 rounded-lg shadow-xl border border-electric-teal/30 w-full max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-electric-teal/30 scrollbar-track-transparent"
                      onClick={e => e.stopPropagation()}
                    >
                       {/* Update title based on edit state */} 
                       <h3 className="text-lg font-semibold text-electric-teal mb-4">
                           {editingBrandId ? 'Edit Brand Profile' : 'Add New Brand Profile'}
                       </h3>
                       
                       {modalError && <p className="text-red-400 mb-4 text-sm">{modalError}</p>}
                       
                       <div className="space-y-5">
                            <div>
                                <label htmlFor="businessName" className="block text-sm font-medium text-electric-teal mb-1">Business Name *</label>
                                <input
                                    type="text" id="businessName" name="businessName"
                                    value={formData.businessName || ''} onChange={handleInputChange} required
                                    className={`w-full p-2 rounded-md bg-charcoal/80 border border-gray-600 focus:border-electric-teal focus:ring-electric-teal focus:shadow-glow-input transition-shadow duration-200 ${placeholderStyle}`}
                                />
                            </div>
                            <div>
                                <label htmlFor="address" className="block text-sm font-medium text-electric-teal mb-1">Address</label>
                                <textarea
                                    id="address" name="address" rows={2}
                                    value={typeof formData.address === 'string' ? formData.address : ''}
                                    onChange={handleInputChange}
                                    className={`w-full p-2 rounded-md bg-charcoal/80 border border-gray-600 focus:border-electric-teal focus:ring-electric-teal focus:shadow-glow-input transition-shadow duration-200 ${placeholderStyle}`}
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-electric-teal mb-1">Contact Email</label>
                                    <input
                                        type="email" id="email" name="email"
                                        value={formData.email || ''} onChange={handleInputChange}
                                        className={`w-full p-2 rounded-md bg-charcoal/80 border border-gray-600 focus:border-electric-teal focus:ring-electric-teal focus:shadow-glow-input transition-shadow duration-200 ${placeholderStyle}`}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="website" className="block text-sm font-medium text-electric-teal mb-1">Website</label>
                                    <input
                                        type="text" id="website" name="website"
                                        value={formData.website || ''} onChange={handleInputChange}
                                        placeholder="example.com"
                                        className={`w-full p-2 rounded-md bg-charcoal/80 border border-gray-600 focus:border-electric-teal focus:ring-electric-teal focus:shadow-glow-input transition-shadow duration-200 ${placeholderStyle}`}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                   <label htmlFor="primaryColorHex" className="block text-sm font-medium text-electric-teal mb-1">Primary Brand Color</label>
                                   <div className="flex items-center gap-2">
                                       <input
                                            type="text"
                                            id="primaryColorHex" name="primaryColorHex"
                                            value={formData.styleComponents?.primaryColor || '#00c2a8'}
                                            onChange={(e) => {
                                                const hexValue = e.target.value;
                                                setFormData(prev => ({ ...prev, styleComponents: { ...prev.styleComponents, primaryColor: hexValue } }));
                                            }}
                                            onBlur={(e) => {
                                                if (!isValidHex(e.target.value)) {
                                                  setFormData(prev => ({ ...prev, styleComponents: { ...prev.styleComponents, primaryColor: '#00c2a8' } }));
                                                }
                                            }}
                                            className="flex-grow p-2 rounded-md bg-charcoal/80 border border-gray-600 focus:border-electric-teal focus:ring-electric-teal focus:shadow-glow-input transition-shadow duration-200"
                                        />
                                        <input
                                            type="color"
                                            id="primaryColor" name="primaryColor"
                                            value={formData.styleComponents?.primaryColor || '#00c2a8'}
                                            onChange={handleInputChange}
                                            className="h-10 w-10 p-1 rounded-md bg-charcoal/80 border border-gray-600 cursor-pointer focus:border-electric-teal focus:ring-electric-teal focus:shadow-glow-input transition-shadow duration-200"
                                        />
                                    </div>
                                </div>
                                 <div>
                                    <label htmlFor="secondaryColorHex" className="block text-sm font-medium text-electric-teal mb-1">Secondary Brand Color</label>
                                    <div className="flex items-center gap-2">
                                       <input
                                            type="text"
                                            id="secondaryColorHex" name="secondaryColorHex"
                                            value={formData.styleComponents?.secondaryColor || '#00858a'}
                                            onChange={(e) => {
                                                const hexValue = e.target.value;
                                                setFormData(prev => ({ ...prev, styleComponents: { ...prev.styleComponents, secondaryColor: hexValue } }));
                                            }}
                                            onBlur={(e) => {
                                                 if (!isValidHex(e.target.value)) {
                                                    setFormData(prev => ({ ...prev, styleComponents: { ...prev.styleComponents, secondaryColor: '#00858a' } }));
                                                 }
                                            }}
                                            className="flex-grow p-2 rounded-md bg-charcoal/80 border border-gray-600 focus:border-electric-teal focus:ring-electric-teal focus:shadow-glow-input transition-shadow duration-200"
                                        />
                                        <input
                                            type="color"
                                            id="secondaryColor" name="secondaryColor"
                                            value={formData.styleComponents?.secondaryColor || '#00858a'}
                                            onChange={handleInputChange}
                                            className="h-10 w-10 p-1 rounded-md bg-charcoal/80 border border-gray-600 cursor-pointer focus:border-electric-teal focus:ring-electric-teal focus:shadow-glow-input transition-shadow duration-200"
                                        />
                                    </div>
                                </div>
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-electric-teal mb-1">Logo (Optional)</label>
                                <div className="mt-1 flex items-center gap-4 flex-wrap">
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isUploadingLogo}
                                        className="px-3 py-2 rounded-md border-2 border-electric-teal/60 text-electric-teal hover:border-electric-teal hover:bg-electric-teal/10 hover:shadow-glow-sm text-sm transition-all disabled:opacity-50 shrink-0"
                                    >
                                        {formData.logoUrl || logoPreviewUrl || logoFile ? 'Change Logo' : 'Select Logo'}
                                    </button>
                                    <input
                                        type="file" accept="image/*" ref={fileInputRef}
                                        onChange={handleLogoSelect} className="hidden" disabled={isUploadingLogo}
                                    />
                                    {logoPreviewUrl && <img src={logoPreviewUrl} alt="Logo Preview" className="h-10 w-auto rounded-md border border-gray-600 shrink-0" />}
                                    {!logoPreviewUrl && formData.logoUrl && <img src={formData.logoUrl} alt="Uploaded Logo" className="h-10 w-auto rounded-md border border-green-500 shrink-0" />}
                                    {isUploadingLogo && logoUploadProgress !== null && (
                                        <div className="flex items-center gap-2 text-sm text-gray-400 shrink-0">
                                            <span>Uploading...</span>
                                             <div className="w-20 h-2 bg-gray-600 rounded-full overflow-hidden">
                                                 <div className="bg-electric-teal h-full rounded-full" style={{width: `${logoUploadProgress}%`}}></div>
                                             </div>
                                             <span>{(logoUploadProgress).toFixed(0)}%</span>
                                         </div>
                                    )}
                                    {logoUploadProgress === 100 && !isUploadingLogo && formData.logoUrl && (
                                         <span className="text-sm text-green-400 shrink-0">✓ Upload Successful</span>
                                    )}
                                </div>
                                 {logoUploadError && <p className="text-xs text-red-400 mt-1">{logoUploadError}</p>}
                                 <p className="text-xs text-gray-400 mt-1">Max 5MB. PNG, JPG, SVG recommended.</p>
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-electric-teal mb-2">Social Media Handles (Optional)</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                   <div>
                                      <label htmlFor="instagram" className="block text-xs font-medium text-gray-300 mb-1">Instagram</label>
                                      <input type="text" id="instagram" name="instagram" placeholder="your_handle" value={formData.socialMediaHandles?.instagram || ''} onChange={handleInputChange} className={`w-full p-2 rounded-md bg-charcoal/80 border border-gray-600 text-sm focus:border-electric-teal focus:ring-electric-teal focus:shadow-glow-input transition-shadow duration-200 ${placeholderStyle}`}/>
                                   </div>
                                   <div>
                                      <label htmlFor="facebook" className="block text-xs font-medium text-gray-300 mb-1">Facebook</label>
                                      <input type="text" id="facebook" name="facebook" placeholder="YourPageName" value={formData.socialMediaHandles?.facebook || ''} onChange={handleInputChange} className={`w-full p-2 rounded-md bg-charcoal/80 border border-gray-600 text-sm focus:border-electric-teal focus:ring-electric-teal focus:shadow-glow-input transition-shadow duration-200 ${placeholderStyle}`}/>
                                   </div>
                                   <div>
                                      <label htmlFor="twitter" className="block text-xs font-medium text-gray-300 mb-1">Twitter (X)</label>
                                      <input type="text" id="twitter" name="twitter" placeholder="YourHandle" value={formData.socialMediaHandles?.twitter || ''} onChange={handleInputChange} className={`w-full p-2 rounded-md bg-charcoal/80 border border-gray-600 text-sm focus:border-electric-teal focus:ring-electric-teal focus:shadow-glow-input transition-shadow duration-200 ${placeholderStyle}`}/>
                                   </div>
                                   <div>
                                      <label htmlFor="linkedin" className="block text-xs font-medium text-gray-300 mb-1">LinkedIn</label>
                                      <input type="text" id="linkedin" name="linkedin" placeholder="company/your-company" value={formData.socialMediaHandles?.linkedin || ''} onChange={handleInputChange} className={`w-full p-2 rounded-md bg-charcoal/80 border border-gray-600 text-sm focus:border-electric-teal focus:ring-electric-teal focus:shadow-glow-input transition-shadow duration-200 ${placeholderStyle}`}/>
                                   </div>
                                </div>
                             </div>
                             <div>
                                <label htmlFor="brandIdentity" className="block text-sm font-medium text-gray-300 mb-1">Brand Identity/Overall Notes</label>
                                <textarea
                                  id="brandIdentity" name="brandIdentity" rows={3}
                                  value={formData.brandIdentity || ''} onChange={handleInputChange}
                                  placeholder="e.g., Modern tech firm. Friendly tone. Clean style."
                                  className={`w-full p-2 rounded-md bg-charcoal/80 border border-gray-600 focus:border-electric-teal focus:ring-electric-teal focus:shadow-glow-input transition-shadow duration-200 ${placeholderStyle}`}
                                />
                             </div>
                       </div>
                       
                       <div className="mt-6 pt-4 border-t border-gray-700 flex justify-end gap-3">
                           <button 
                              type="button" 
                              onClick={() => setShowModal(false)} 
                              className="px-4 py-2 rounded-md border border-gray-600 text-gray-300 hover:border-gray-400 hover:text-white text-sm transition-colors"
                           >
                               Cancel
                           </button>
                           <button 
                              type="submit" 
                              disabled={isSaving || isUploadingLogo}
                              className="px-4 py-2 rounded-md bg-electric-teal text-charcoal shadow-glow hover:shadow-glow-strong disabled:bg-gray-500 disabled:cursor-not-allowed transition-all duration-300 text-sm font-semibold"
                           >
                               {isSaving ? 'Saving...' : (editingBrandId ? 'Update Brand' : 'Save Brand')}
                           </button>
                       </div>
                   </form>
                </div>
            )} 
        </div>
    );
};

export default BrandProfileManager;