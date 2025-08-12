import { NextRequest, NextResponse } from 'next/server';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    const imageFile = formData.get('image') as File;
    const userId = formData.get('userId') as string;
    const campaignId = formData.get('campaignId') as string;
    const designId = formData.get('designId') as string;
    const optionLabel = formData.get('optionLabel') as string;
    
    if (!imageFile || !userId || !campaignId || !designId || !optionLabel) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }
    
    // Validate file type
    if (!imageFile.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Invalid file type' },
        { status: 400 }
      );
    }
    
    // Create storage path for composited image
    const timestamp = Date.now();
    const fileName = `${designId}-${optionLabel}-composited-${timestamp}.jpg`;
    const storagePath = `v2/${userId}/campaigns/${campaignId}/composited/${fileName}`;
    
    // Upload to Firebase Storage
    const storageRef = ref(storage, storagePath);
    const uploadResult = await uploadBytes(storageRef, imageFile, {
      contentType: 'image/jpeg',
      customMetadata: {
        userId,
        campaignId,
        designId,
        optionLabel,
        type: 'composited',
        uploadedAt: new Date().toISOString()
      }
    });
    
    // Get download URL
    const downloadUrl = await getDownloadURL(uploadResult.ref);
    
    return NextResponse.json({
      success: true,
      imageUrl: downloadUrl,
      storagePath,
      fileName
    });
    
  } catch (error) {
    console.error('Error uploading composited image:', error);
    return NextResponse.json(
      { 
        error: 'Failed to upload image',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
