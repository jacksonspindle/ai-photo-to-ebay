// Cloudinary Image Hosting Service
// Handles image uploads for eBay integration

/**
 * Upload image to Cloudinary
 * Returns the secure URL for the uploaded image
 */
export const uploadToCloudinary = async (imageFile) => {
  try {
    console.log('📤 Uploading image to Cloudinary...')
    
    // Convert file to base64 for upload
    const base64Image = await fileToBase64(imageFile)
    
    // Use the backend API to upload to Cloudinary
    const response = await fetch(`${getApiBaseUrl()}/api/upload-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: `data:${imageFile.type};base64,${base64Image}`,
        fileName: imageFile.name
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to upload image')
    }

    const data = await response.json()
    console.log('✅ Image uploaded successfully:', data.url)
    
    return {
      success: true,
      url: data.url,
      publicId: data.publicId
    }
    
  } catch (error) {
    console.error('❌ Cloudinary upload failed:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Upload multiple images to Cloudinary
 */
export const uploadMultipleImages = async (imageFiles) => {
  try {
    console.log(`📤 Uploading ${imageFiles.length} images to Cloudinary...`)
    
    // Upload all images in parallel
    const uploadPromises = imageFiles.map(file => uploadToCloudinary(file))
    const results = await Promise.all(uploadPromises)
    
    // Check if all uploads succeeded
    const allSuccessful = results.every(result => result.success)
    const uploadedUrls = results
      .filter(result => result.success)
      .map(result => result.url)
    
    if (!allSuccessful) {
      console.warn('⚠️ Some images failed to upload')
    }
    
    return {
      success: allSuccessful,
      urls: uploadedUrls,
      results: results
    }
    
  } catch (error) {
    console.error('❌ Multiple upload failed:', error)
    return {
      success: false,
      error: error.message,
      urls: []
    }
  }
}

/**
 * Convert file to base64
 */
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => {
      // Remove the data URL prefix to get just the base64 string
      const base64 = reader.result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = error => reject(error)
  })
}

/**
 * Get API base URL
 */
const getApiBaseUrl = () => {
  return import.meta.env.VITE_API_BASE_URL || 
    (import.meta.env.DEV ? 'http://localhost:3001' : '')
}