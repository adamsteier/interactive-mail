import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs,
  DocumentData
} from 'firebase/firestore';
import { 
  ref, 
  uploadString, 
  getDownloadURL,
  listAll
} from 'firebase/storage';
import { db, storage } from '@/lib/firebase';

interface GenerateImagesRequest {
  prompt: string;
  numImages?: number;
  templateId?: string; // Optional ID to link the image to a specific template
}

// Custom interface for extended generation config that includes responseModalities
interface ExtendedGenerationConfig {
  responseModalities?: string[];
  temperature?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;
}

/**
 * Saves the generated image to Firebase Storage and stores the URL in Firestore
 */
const saveImageToFirestore = async (
  imageUrl: string, 
  prompt: string, 
  templateId: string | null = null
) => {
  try {
    // Extract base64 data (remove the data:image/png;base64, part)
    const base64Data = imageUrl.split(',')[1];
    
    // Generate a unique filename
    const timestamp = Date.now();
    const filename = `postcard_images/${timestamp}_${Math.random().toString(36).substring(2, 15)}.png`;
    
    // Create storage reference
    const storageRef = ref(storage, filename);
    
    // Upload the image to Firebase Storage
    await uploadString(storageRef, base64Data, 'base64');
    
    // Get the public URL
    const publicUrl = await getDownloadURL(storageRef);
    
    // Save metadata to Firestore
    const docRef = await addDoc(collection(db, 'postcard_images'), {
      imageUrl: publicUrl,
      storageRef: filename,
      prompt,
      templateId,
      createdAt: serverTimestamp(),
      // Also save a thumbnail version of the base64 data for quick preview
      // This creates a smaller version for quick loading in the UI
      thumbnailData: imageUrl.length > 10000 ? imageUrl.substring(0, 10000) : imageUrl
    });
    
    console.log('Image saved to Storage and Firestore with ID:', docRef.id);
    return { id: docRef.id, url: publicUrl };
  } catch (error) {
    console.error('Error saving image to Storage/Firestore:', error);
    // Return original data URL as fallback
    return { id: null, url: imageUrl };
  }
};

export async function POST(request: Request) {
  // Add timestamp to track request processing time
  const startTime = Date.now();
  
  try {
    const data = await request.json() as GenerateImagesRequest;
    const prompt = data.prompt;
    const numImages = data.numImages || 3;
    const templateId = data.templateId || null;
    
    console.log(`[${new Date().toISOString()}] Processing image generation request:`, {
      promptLength: prompt.length,
      numImages,
      templateId
    });
    
    // Initialize the Gemini API client
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      console.error('Missing Google AI API key in environment variables');
      return NextResponse.json({
        success: false,
        images: [],
        error: 'Google AI API key not configured'
      }, { status: 500 });
    }
    
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Create an array of promises to generate images in parallel
    const generateImagePromises = Array.from({ length: numImages }).map(async (_, i) => {
      try {
        // Create a very explicit image generation prompt
        const adjustedPrompt = i === 0 
          ? `Create a detailed image of: ${prompt}. This should be a high-quality, detailed image that would work well as a postcard background.`
          : `Create a detailed image of: ${prompt} (Variation ${i+1}: Make this slightly different while keeping the same style). This should be a high-quality, detailed image that would work well as a postcard background.`;
        
        // Get the model with experimental features
        const model = genAI.getGenerativeModel({
          model: "gemini-2.0-flash-exp",
          // Use our extended config type to properly type the responseModalities
          generationConfig: {
            // The TypeScript definitions may not be up to date with the API
            responseModalities: ["Image", "Text"] 
          } as ExtendedGenerationConfig
        });
        
        console.log(`[${new Date().toISOString()}] Sending prompt to Gemini for image ${i+1}`);
        
        // Generate content with the custom prompt
        const result = await model.generateContent(adjustedPrompt);
        const response = result.response;
        
        // Add more detailed logging to debug the response structure
        console.log(`[${new Date().toISOString()}] Gemini response structure for image ${i+1}:`, JSON.stringify({
          hasCandidates: !!response.candidates,
          candidatesLength: response.candidates?.length || 0,
          firstCandidateHasContent: !!response.candidates?.[0]?.content,
          partsLength: response.candidates?.[0]?.content?.parts?.length || 0
        }));
        
        // Process response to extract images
        if (response.candidates && response.candidates[0]?.content?.parts) {
          const parts = response.candidates[0].content.parts;
          console.log(`[${new Date().toISOString()}] Got response with ${parts.length} parts for image ${i+1}`);
          
          for (const part of parts) {
            if (part.inlineData?.data) {
              console.log(`[${new Date().toISOString()}] Found inline data with mimeType: ${part.inlineData.mimeType} for image ${i+1}`);
              
              // Add the base64 data URL to our collection
              const mimeType = part.inlineData.mimeType || 'image/jpeg';
              const dataUrl = `data:${mimeType};base64,${part.inlineData.data}`;
              
              try {
                // Save the image to Firebase Storage and Firestore
                console.log(`[${new Date().toISOString()}] Saving image ${i+1} to Firebase Storage...`);
                const savedImage = await saveImageToFirestore(dataUrl, adjustedPrompt, templateId);
                
                console.log(`[${new Date().toISOString()}] Successfully saved image ${i+1} to Firebase:`, {
                  hasId: !!savedImage.id,
                  urlLength: savedImage.url.length,
                  isStorageUrl: savedImage.url.includes('firebasestorage.googleapis.com')
                });
                
                // Return the image URL and ID
                return { 
                  imageUrl: savedImage.url, 
                  imageId: savedImage.id,
                  // Include original data URL for immediate display while storage URL is processing
                  originalDataUrl: dataUrl
                };
              } catch (saveError) {
                console.error(`[${new Date().toISOString()}] Error saving image ${i+1} to Firebase:`, saveError);
                // Still return the original data URL as a fallback
                return {
                  imageUrl: dataUrl,
                  imageId: null,
                  originalDataUrl: dataUrl
                };
              }
            }
          }
          
          // If we get here, we found no inline data in any parts
          console.log(`[${new Date().toISOString()}] No inline data found in any parts for image ${i+1}. Part types:`, 
            parts.map(p => p.inlineData ? 'inlineData' : (p.text ? 'text' : 'unknown')).join(', '));
        } else {
          console.log(`[${new Date().toISOString()}] No candidates or parts found in response for image ${i+1}`);
        }
        
        // Return null if no image was found
        return null;
      } catch (err) {
        console.error(`[${new Date().toISOString()}] Error generating image ${i+1}:`, err);
        console.error('Error details:', err instanceof Error ? err.message : err);
        return null;
      }
    });
    
    console.log(`[${new Date().toISOString()}] Waiting for all ${numImages} image generation promises to resolve...`);
    
    // Wait for all images to be generated in parallel
    const results = await Promise.all(generateImagePromises);
    
    // Extract image URLs and IDs, filtering out null results
    const imageUrls: string[] = [];
    const imageIds: string[] = [];
    const originalDataUrls: string[] = [];
    
    results.forEach((result, index) => {
      if (result) {
        console.log(`[${new Date().toISOString()}] Processing result for image ${index+1}:`, {
          hasImageUrl: !!result.imageUrl,
          hasImageId: !!result.imageId,
          hasOriginalDataUrl: !!result.originalDataUrl,
          imageUrlType: result.imageUrl?.substring(0, 20) + '...'
        });
        
        imageUrls.push(result.imageUrl);
        if (result.imageId) {
          imageIds.push(result.imageId);
        }
        if (result.originalDataUrl) {
          originalDataUrls.push(result.originalDataUrl);
        }
      } else {
        console.log(`[${new Date().toISOString()}] No result for image ${index+1}`);
      }
    });
    
    console.log(`[${new Date().toISOString()}] Generated ${imageUrls.length} images out of ${numImages} requested. Processing time: ${Date.now() - startTime}ms`);
    
    // If we have images, return them right away
    if (imageUrls.length > 0) {
      console.log(`[${new Date().toISOString()}] Returning ${imageUrls.length} successfully generated images`);
      return NextResponse.json({
        success: true,
        images: imageUrls,
        imageIds: imageIds,
        originalDataUrls: originalDataUrls.length > 0 ? originalDataUrls : undefined,
        prompt: prompt
      });
    }
    
    // Only check Firestore if we didn't generate any images
    console.log(`[${new Date().toISOString()}] No images generated directly. Checking Firestore for existing images...`);
    
    try {
      // Query the most recent images from Firestore
      const imagesQuery = query(
        collection(db, 'postcard_images'),
        where('prompt', '==', prompt),
        orderBy('createdAt', 'desc'),
        limit(numImages)
      );
      
      console.log(`[${new Date().toISOString()}] Executing Firestore query for prompt: ${prompt.substring(0, 30)}...`);
      const querySnapshot = await getDocs(imagesQuery);
      
      console.log(`[${new Date().toISOString()}] Firestore query returned ${querySnapshot.docs.length} documents`);
      
      if (!querySnapshot.empty) {
        // Extract images from Firestore
        querySnapshot.docs.forEach((doc, index) => {
          try {
            const data = doc.data() as DocumentData;
            console.log(`[${new Date().toISOString()}] Processing Firestore doc ${index+1}:`, {
              id: doc.id,
              hasImageUrl: !!data.imageUrl,
              hasThumbnailData: !!data.thumbnailData,
              imageUrlType: data.imageUrl?.substring(0, 20) + '...'
            });
            
            if (data.imageUrl) {
              imageUrls.push(data.imageUrl);
              imageIds.push(doc.id);
              // If there's thumbnail data, use it for faster loading
              if (data.thumbnailData) {
                originalDataUrls.push(data.thumbnailData);
              }
            }
          } catch (docError) {
            console.error(`[${new Date().toISOString()}] Error processing Firestore document:`, docError);
          }
        });
        
        // If we found images in Firestore, return them
        if (imageUrls.length > 0) {
          console.log(`[${new Date().toISOString()}] Returning ${imageUrls.length} images from Firestore. Total processing time: ${Date.now() - startTime}ms`);
          return NextResponse.json({
            success: true,
            images: imageUrls,
            imageIds: imageIds,
            originalDataUrls: originalDataUrls.length > 0 ? originalDataUrls : undefined,
            prompt: prompt,
            note: 'Images retrieved from Firestore instead of direct generation'
          });
        }
      }
      
      console.log(`[${new Date().toISOString()}] No matching images found in Firestore`);
    } catch (firestoreErr) {
      console.error(`[${new Date().toISOString()}] Error trying to retrieve images from Firestore:`, firestoreErr);
    }
    
    // Manual check for images in Storage as a last resort
    try {
      console.log(`[${new Date().toISOString()}] Attempting direct Storage check...`);
      
      // Try to list all files in the postcard_images directory
      const storageRef = ref(storage, 'postcard_images');
      const { items } = await listAll(storageRef);
      
      console.log(`[${new Date().toISOString()}] Found ${items.length} total items in Storage`);
      
      // Get the 3 most recent files (by name, which includes timestamp)
      const sortedItems = items.sort((a, b) => {
        // Extract timestamp from filename
        const getTimestamp = (name: string) => {
          const match = name.match(/^(\d+)_/);
          return match ? parseInt(match[1]) : 0;
        };
        
        return getTimestamp(b.name) - getTimestamp(a.name);
      }).slice(0, numImages);
      
      console.log(`[${new Date().toISOString()}] Selected ${sortedItems.length} most recent items from Storage`);
      
      // Get download URLs for each file
      const storageUrls = await Promise.all(
        sortedItems.map(async (item) => {
          try {
            const url = await getDownloadURL(item);
            console.log(`[${new Date().toISOString()}] Got download URL for ${item.name}: ${url.substring(0, 30)}...`);
            return url;
          } catch (urlErr) {
            console.error(`[${new Date().toISOString()}] Error getting download URL for ${item.name}:`, urlErr);
            return null;
          }
        })
      );
      
      // Filter out any nulls and add to our list
      const validUrls = storageUrls.filter(url => url !== null) as string[];
      
      if (validUrls.length > 0) {
        console.log(`[${new Date().toISOString()}] Returning ${validUrls.length} images from direct Storage check`);
        return NextResponse.json({
          success: true,
          images: validUrls,
          imageIds: [],
          prompt: prompt,
          note: 'Images retrieved directly from Storage'
        });
      }
    } catch (storageErr) {
      console.error(`[${new Date().toISOString()}] Error checking Storage directly:`, storageErr);
    }
    
    // Fallback to placeholder images if generation fails and all retrieval attempts fail
    console.log(`[${new Date().toISOString()}] No images were found anywhere. Returning fallback images. Total processing time: ${Date.now() - startTime}ms`);
    return NextResponse.json({
      success: false,
      images: [
        'https://placehold.co/1872x1271/e83e8c/FFFFFF?text=Image+Generation+Failed',
        'https://placehold.co/1872x1271/e83e8c/FFFFFF?text=Please+Try+Again',
        'https://placehold.co/1872x1271/e83e8c/FFFFFF?text=Or+Use+Different+Prompt',
      ],
      imageIds: [],
      error: 'Failed to generate any images with Gemini'
    });
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error processing Gemini image generation request:`, error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
    
    return NextResponse.json({
      success: false,
      images: [],
      imageIds: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 