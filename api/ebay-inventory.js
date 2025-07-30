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
    
    if (!token || !sku || !listingData) {
      return res.status(400).json({ error: 'Missing required parameters' })
    }

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
        'Content-Language': 'en-US'
      },
      body: JSON.stringify({
        product: {
          title: listingData.title,
          description: listingData.description,
          imageUrls: imageUrls,
          condition: 'NEW'
        },
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
      return res.status(response.status).json({ 
        error: 'eBay API error',
        details: errorText 
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