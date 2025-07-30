// Vercel serverless function for Cloudinary image uploads
import { v2 as cloudinary } from 'cloudinary'

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
})

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  )

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { image, fileName } = req.body
    
    if (!image) {
      return res.status(400).json({ error: 'No image data provided' })
    }

    // Check if Cloudinary is configured
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      console.error('❌ Cloudinary credentials not configured')
      return res.status(500).json({ 
        error: 'Image hosting service not configured. Please set up Cloudinary credentials.' 
      })
    }

    console.log('📤 Uploading image to Cloudinary...')

    // Upload image to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(image, {
      folder: 'ai-photo-to-ebay', // Organize images in a folder
      resource_type: 'auto',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      transformation: [
        { quality: 'auto:best' }, // Optimize quality
        { fetch_format: 'auto' }, // Auto format for best compression
        { width: 1200, height: 1200, crop: 'limit' } // Max dimensions
      ]
    })

    console.log('✅ Image uploaded successfully:', uploadResult.secure_url)

    // Return the secure URL
    res.json({
      success: true,
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      width: uploadResult.width,
      height: uploadResult.height,
      format: uploadResult.format
    })

  } catch (error) {
    console.error('❌ Cloudinary upload error:', error)
    res.status(500).json({ 
      error: 'Failed to upload image',
      message: error.message 
    })
  }
}