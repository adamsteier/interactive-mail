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
  getDownloadURL
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
  try {
    const data = await request.json() as GenerateImagesRequest;
    const prompt = data.prompt;
    const numImages = data.numImages || 3;
    const templateId = data.templateId || null;
    
    // Initialize the Gemini API client
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
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
        
        console.log('Sending prompt to Gemini:', adjustedPrompt);
        
        // Generate content with the custom prompt
        const result = await model.generateContent(adjustedPrompt);
        const response = result.response;
        
        // Add more detailed logging to debug the response structure
        console.log('Gemini response structure:', JSON.stringify({
          hasCandidates: !!response.candidates,
          candidatesLength: response.candidates?.length || 0,
          firstCandidateHasContent: !!response.candidates?.[0]?.content,
          partsLength: response.candidates?.[0]?.content?.parts?.length || 0
        }));
        
        // Process response to extract images
        if (response.candidates && response.candidates[0]?.content?.parts) {
          const parts = response.candidates[0].content.parts;
          console.log('Got response with parts:', parts.length);
          
          for (const part of parts) {
            if (part.inlineData?.data) {
              console.log('Found inline data with mimeType:', part.inlineData.mimeType);
              
              // Add the base64 data URL to our collection
              const mimeType = part.inlineData.mimeType || 'image/jpeg';
              const dataUrl = `data:${mimeType};base64,${part.inlineData.data}`;
              
              // Save the image to Firebase Storage and Firestore
              const savedImage = await saveImageToFirestore(dataUrl, adjustedPrompt, templateId);
              
              // Return the image URL and ID
              return { 
                imageUrl: savedImage.url, 
                imageId: savedImage.id,
                // Include original data URL for immediate display while storage URL is processing
                originalDataUrl: dataUrl
              };
            }
          }
          
          // If we get here, we found no inline data in any parts
          console.log('No inline data found in any parts. Part types:', 
            parts.map(p => p.inlineData ? 'inlineData' : (p.text ? 'text' : 'unknown')).join(', '));
        } else {
          console.log('No candidates or parts found in response');
        }
        
        // Return null if no image was found
        return null;
      } catch (err) {
        console.error(`Error generating image ${i+1}:`, err);
        console.error('Error details:', err instanceof Error ? err.message : err);
        return null;
      }
    });
    
    // Wait for all images to be generated in parallel
    const results = await Promise.all(generateImagePromises);
    
    // Extract image URLs and IDs, filtering out null results
    const imageUrls: string[] = [];
    const imageIds: string[] = [];
    const originalDataUrls: string[] = [];
    
    results.forEach(result => {
      if (result) {
        imageUrls.push(result.imageUrl);
        if (result.imageId) {
          imageIds.push(result.imageId);
        }
        if (result.originalDataUrl) {
          originalDataUrls.push(result.originalDataUrl);
        }
      }
    });
    
    console.log(`Generated ${imageUrls.length} images out of ${numImages} requested`);
    
    // Check if we have any images in Firestore even if generation seemingly failed
    if (imageUrls.length === 0) {
      try {
        // Query the most recent images from Firestore
        const imagesQuery = query(
          collection(db, 'postcard_images'),
          where('prompt', '==', prompt),
          orderBy('createdAt', 'desc'),
          limit(numImages)
        );
        
        const querySnapshot = await getDocs(imagesQuery);
        
        if (!querySnapshot.empty) {
          console.log(`Found ${querySnapshot.docs.length} recent images in Firestore with matching prompt`);
          
          // Extract images from Firestore
          querySnapshot.docs.forEach((doc) => {
            const data = doc.data() as DocumentData;
            if (data.imageUrl) {
              imageUrls.push(data.imageUrl);
              imageIds.push(doc.id);
              // If there's thumbnail data, use it for faster loading
              if (data.thumbnailData) {
                originalDataUrls.push(data.thumbnailData);
              }
            }
          });
          
          // If we found images in Firestore, return them
          if (imageUrls.length > 0) {
            console.log(`Returning ${imageUrls.length} images from Firestore`);
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
      } catch (firestoreErr) {
        console.error('Error trying to retrieve images from Firestore:', firestoreErr);
      }
      
      // Fallback to placeholder images if generation fails and Firestore retrieval fails
      console.log('No images were generated or found in Firestore, returning fallback images');
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
    }
    
    console.log(`Successfully generated ${imageUrls.length} images`);
    return NextResponse.json({
      success: true,
      images: imageUrls,
      imageIds: imageIds,
      originalDataUrls: originalDataUrls.length > 0 ? originalDataUrls : undefined,
      prompt: prompt
    });
    
  } catch (error) {
    console.error('Error processing Gemini image generation request:', error);
    return NextResponse.json({
      success: false,
      images: [],
      imageIds: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 