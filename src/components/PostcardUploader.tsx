import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  uploadPostcardImage, 
  createPostcardDesign,
  getCampaignPostcardDesigns,
  deletePostcardDesign,
  PostcardDesign
} from '@/lib/postcardStore';
import Image from 'next/image';

interface PostcardUploaderProps {
  campaignId: string;
  businessId: string;
}

const PostcardUploader = ({ campaignId, businessId }: PostcardUploaderProps) => {
  const { user } = useAuth();
  const [designName, setDesignName] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [designs, setDesigns] = useState<PostcardDesign[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Load existing designs when component mounts
  useEffect(() => {
    if (campaignId) {
      loadDesigns();
    }
  }, [campaignId]);

  // Load existing designs
  const loadDesigns = async () => {
    try {
      setIsLoading(true);
      const designsList = await getCampaignPostcardDesigns(campaignId);
      setDesigns(designsList);
      setError(null);
    } catch (err) {
      console.error('Error loading designs:', err);
      setError('Failed to load existing designs');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    
    // Generate preview
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl(null);
    }
  };

  // Handle file upload and design creation
  const handleUpload = async () => {
    if (!user || !selectedFile || !designName.trim() || !campaignId || !businessId) {
      setError('Missing required information');
      return;
    }

    try {
      setIsUploading(true);
      setError(null);

      // Generate a temporary ID for the design
      const tempId = `temp_${Date.now()}`;
      
      // Upload the image to Storage
      const imageUrl = await uploadPostcardImage(user.uid, tempId, selectedFile);
      
      // Create the design document in Firestore
      await createPostcardDesign(businessId, campaignId, designName, imageUrl);
      
      // Reset form
      setDesignName('');
      setSelectedFile(null);
      setPreviewUrl(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Reload designs
      await loadDesigns();
      
    } catch (err) {
      console.error('Error uploading design:', err);
      setError('Failed to upload postcard design');
    } finally {
      setIsUploading(false);
    }
  };

  // Handle design deletion
  const handleDelete = async (designId: string) => {
    if (!user || !designId) return;
    
    if (!confirm('Are you sure you want to delete this design?')) {
      return;
    }

    try {
      await deletePostcardDesign(user.uid, designId);
      // Remove from local state
      setDesigns(designs.filter(design => design.id !== designId));
    } catch (err) {
      console.error('Error deleting design:', err);
      setError('Failed to delete design');
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Postcard Designs</h2>
      
      {/* Upload Form */}
      <div className="bg-white p-4 rounded shadow">
        <h3 className="text-lg font-semibold mb-4">Upload New Design</h3>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}
        
        <div className="space-y-4">
          <div>
            <label htmlFor="designName" className="block text-sm font-medium text-gray-700 mb-1">
              Design Name
            </label>
            <input
              type="text"
              id="designName"
              value={designName}
              onChange={(e) => setDesignName(e.target.value)}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Summer Promotion"
            />
          </div>
          
          <div>
            <label htmlFor="postcardImage" className="block text-sm font-medium text-gray-700 mb-1">
              Postcard Image
            </label>
            <input
              type="file"
              id="postcardImage"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          {previewUrl && (
            <div className="mt-2">
              <p className="text-sm font-medium text-gray-700 mb-1">Preview:</p>
              <Image 
                src={previewUrl} 
                alt="Preview" 
                width={192}
                height={192}
                className="max-h-48 max-w-full object-contain border rounded"
              />
            </div>
          )}
          
          <button
            onClick={handleUpload}
            disabled={!selectedFile || !designName.trim() || isUploading}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-blue-300 disabled:cursor-not-allowed"
          >
            {isUploading ? 'Uploading...' : 'Upload Design'}
          </button>
        </div>
      </div>
      
      {/* Existing Designs */}
      <div className="bg-white p-4 rounded shadow">
        <h3 className="text-lg font-semibold mb-4">Your Designs</h3>
        
        {isLoading ? (
          <p>Loading designs...</p>
        ) : designs.length === 0 ? (
          <p>No designs yet. Upload your first postcard design above.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {designs.map(design => (
              <div key={design.id} className="border rounded overflow-hidden">
                <div className="relative h-48">
                  <Image 
                    src={design.imageUrl} 
                    alt={design.name} 
                    width={192}
                    height={192}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-3">
                  <h4 className="font-medium">{design.name}</h4>
                  <p className="text-sm text-gray-500">
                    {design.createdAt 
                      ? new Date(design.createdAt.seconds * 1000).toLocaleDateString() 
                      : 'Date unknown'}
                  </p>
                  <div className="mt-2 flex justify-between">
                    <button
                      onClick={() => window.open(design.imageUrl, '_blank')}
                      className="text-blue-600 text-sm hover:underline"
                    >
                      View Full Size
                    </button>
                    <button
                      onClick={() => design.id && handleDelete(design.id)}
                      className="text-red-600 text-sm hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PostcardUploader; 