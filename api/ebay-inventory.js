// eBay inventory item creation endpoint
// Vercel serverless function

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  )

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { token, sku, listingData, imageUrls } = req.body
    
    console.log('📦 eBay inventory request data:', {
      hasToken: !!token,
      sku: sku,
      listingData: listingData,
      imageUrls: imageUrls
    })
    
    if (!token || !sku || !listingData) {
      return res.status(400).json({ error: 'Missing required parameters' })
    }

    // Validate required fields - be more lenient and log for debugging
    if (!listingData.title || typeof listingData.title !== 'string') {
      console.error('Title validation failed:', listingData.title)
      return res.status(400).json({ error: 'Title is required and must be a string' })
    }
    
    if (!listingData.description || typeof listingData.description !== 'string') {
      console.error('Description validation failed:', listingData.description)
      return res.status(400).json({ error: 'Description is required and must be a string' })
    }

    console.log('Title:', listingData.title, 'Length:', listingData.title.length)
    console.log('Description:', listingData.description, 'Length:', listingData.description.length)

    // Ensure we have valid image URLs
    const validImageUrls = Array.isArray(imageUrls) ? imageUrls.filter(url => url && url.startsWith('https://')) : []

    const sandbox = process.env.VITE_EBAY_SANDBOX === 'true'
    const EBAY_API_BASE = sandbox 
      ? 'https://api.sandbox.ebay.com'
      : 'https://api.ebay.com'

    console.log('🔨 Creating eBay inventory item:', sku)
    
    const response = await fetch(`${EBAY_API_BASE}/sell/inventory/v1/inventory_item/${sku}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Language': 'en-US',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        product: {
          title: listingData.title.substring(0, 80), // Ensure max 80 chars
          description: listingData.description.substring(0, 4000), // Ensure max 4000 chars
          imageUrls: validImageUrls
        },
        condition: 'NEW',
        availability: {
          shipToLocationAvailability: {
            quantity: 1
          }
        }
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ eBay inventory error:', response.status, errorText)
      
      // Try to parse error details
      let errorDetails = errorText
      try {
        const errorJson = JSON.parse(errorText)
        errorDetails = errorJson
        console.error('❌ Parsed eBay error:', JSON.stringify(errorJson, null, 2))
      } catch (e) {
        console.error('❌ Raw eBay error text:', errorText)
      }
      
      return res.status(response.status).json({ 
        error: 'eBay API error',
        details: errorDetails 
      })
    }

    console.log('✅ eBay inventory item created successfully')
    res.json({ success: true })

  } catch (error) {
    console.error('❌ Inventory creation error:', error)
    res.status(500).json({ 
      error: 'Server error during inventory creation',
      message: error.message 
    })
  }
}