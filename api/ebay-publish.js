// eBay offer publishing endpoint
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
    const { token, offerId } = req.body
    
    if (!token || !offerId) {
      return res.status(400).json({ error: 'Missing required parameters' })
    }

    const sandbox = process.env.VITE_EBAY_SANDBOX === 'true'
    const EBAY_API_BASE = sandbox 
      ? 'https://api.sandbox.ebay.com'
      : 'https://api.ebay.com'

    console.log('📢 Publishing eBay offer:', offerId)
    
    const response = await fetch(`${EBAY_API_BASE}/sell/inventory/v1/offer/${offerId}/publish`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Language': 'en-US',
        'Accept-Language': 'en-US',
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ eBay publish error:', response.status, errorText)
      
      // Try to parse error details
      let errorDetails = errorText
      try {
        const errorJson = JSON.parse(errorText)
        errorDetails = errorJson
        console.error('❌ Parsed eBay publish error:', JSON.stringify(errorJson, null, 2))
      } catch (e) {
        console.error('❌ Raw eBay publish error text:', errorText)
      }
      
      return res.status(response.status).json({ 
        error: 'eBay API error',
        details: errorDetails 
      })
    }

    const data = await response.json()
    console.log('✅ eBay offer published successfully:', data.listingId)
    
    res.json({ 
      success: true,
      listingId: data.listingId
    })

  } catch (error) {
    console.error('❌ Offer publishing error:', error)
    res.status(500).json({ 
      error: 'Server error during offer publishing',
      message: error.message 
    })
  }
}