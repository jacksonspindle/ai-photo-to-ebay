import express from 'express'
import cors from 'cors'
import { v2 as cloudinary } from 'cloudinary'
import 'dotenv/config'

const app = express()
const PORT = 3001

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
})

// Middleware
app.use(cors())
app.use(express.json({ limit: '10mb' }))

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'Server is running', timestamp: new Date().toISOString() })
})

// Claude Vision API proxy endpoint
app.post('/api/analyze-image', async (req, res) => {
  try {
    const { imageData, mediaType } = req.body
    
    if (!imageData) {
      return res.status(400).json({ error: 'No image data provided' })
    }

    const apiKey = process.env.VITE_ANTHROPIC_API_KEY
    if (!apiKey) {
      return res.status(500).json({ error: 'Anthropic API key not configured on server' })
    }

    console.log('🤖 Proxying request to Claude Vision API...')

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 800,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `You are an expert eBay listing creator. Analyze this image and create a compelling eBay listing.

IMPORTANT: Respond ONLY with a valid JSON object in this exact format:
{
  "title": "SEO-optimized product title (max 80 chars)",
  "description": "Detailed product description highlighting key features, condition, and selling points (2-4 sentences)",
  "category": "Electronics|Clothing|Home & Garden|Sports|Toys|Books|Other",
  "suggestedPrice": "$XX.XX",
  "condition": "New|Used - Like New|Used - Good|Used - Fair|For Parts",
  "keywords": ["brand", "model", "type", "key", "features"]
}

Guidelines:
- Be specific about brand, model, size, color when visible
- Include condition assessment based on visual appearance
- Price should reflect current market value
- Title should be searchable and compelling
- Keywords should help with eBay search visibility
- If unsure about something, make reasonable estimates based on what you can see`
              },
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType,
                  data: imageData
                }
              }
            ]
          }
        ]
      })
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('Claude API Error:', error)
      return res.status(response.status).json({ 
        error: error.error?.message || 'Claude API error',
        details: error 
      })
    }

    const data = await response.json()
    const content = data.content[0]?.text

    if (!content) {
      return res.status(500).json({ error: 'No response from Claude' })
    }

    // Try to parse JSON response
    try {
      const parsed = JSON.parse(content)
      console.log('✅ Successfully analyzed image with Claude')
      res.json({ success: true, data: parsed })
    } catch (parseError) {
      console.log('⚠️ JSON parsing failed, using fallback')
      res.json({
        success: true,
        data: {
          title: "AI-Identified Product",
          description: content.substring(0, 200) + "...",
          category: "Other",
          suggestedPrice: "$25.00",
          condition: "Used - Good",
          keywords: ["item", "product"]
        }
      })
    }

  } catch (error) {
    console.error('Server Error:', error)
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    })
  }
})

// Cloudinary image upload endpoint
app.post('/api/upload-image', async (req, res) => {
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
})

// eBay OAuth token exchange endpoint
app.post('/api/ebay/token', async (req, res) => {
  try {
    const { code, redirectUri } = req.body
    
    if (!code || !redirectUri) {
      return res.status(400).json({ error: 'Missing authorization code or redirect URI' })
    }

    const clientId = process.env.VITE_EBAY_CLIENT_ID
    const clientSecret = process.env.VITE_EBAY_CLIENT_SECRET
    const sandbox = process.env.VITE_EBAY_SANDBOX === 'true'
    
    if (!clientId || !clientSecret) {
      return res.status(500).json({ error: 'eBay credentials not configured on server' })
    }

    const tokenUrl = sandbox 
      ? 'https://api.sandbox.ebay.com/identity/v1/oauth2/token'
      : 'https://api.ebay.com/identity/v1/oauth2/token'

    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
    
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri
      })
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('eBay token exchange failed:', error)
      return res.status(response.status).json({ 
        error: error.error_description || 'Token exchange failed',
        details: error 
      })
    }

    const tokenData = await response.json()
    console.log('✅ eBay token exchange successful')
    
    res.json(tokenData)

  } catch (error) {
    console.error('❌ Token exchange error:', error)
    res.status(500).json({ 
      error: 'Server error during token exchange',
      message: error.message 
    })
  }
})

app.listen(PORT, () => {
  console.log(`🚀 AI Photo to eBay server running on http://localhost:${PORT}`)
  console.log(`🔍 Health check: http://localhost:${PORT}/health`)
  console.log(`🤖 API endpoint: http://localhost:${PORT}/api/analyze-image`)
  console.log(`📤 Image upload: http://localhost:${PORT}/api/upload-image`)
})