// eBay Fulfillment Policies API endpoint
// Vercel serverless function - Get fulfillment policies with shipping services

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

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { token } = req.query
    
    if (!token) {
      return res.status(400).json({ error: 'Missing token parameter' })
    }

    const sandbox = process.env.VITE_EBAY_SANDBOX === 'true'
    const EBAY_API_BASE = sandbox 
      ? 'https://api.sandbox.ebay.com'
      : 'https://api.ebay.com'

    console.log('📋 Fetching fulfillment policies...')
    
    const response = await fetch(`${EBAY_API_BASE}/sell/account/v1/fulfillment_policy?marketplace_id=EBAY_US`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Accept-Language': 'en-US'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ eBay fulfillment policies error:', response.status, errorText)
      
      // Try to parse error details
      let errorDetails = errorText
      try {
        const errorJson = JSON.parse(errorText)
        errorDetails = errorJson
        console.error('❌ Parsed eBay fulfillment policies error:', JSON.stringify(errorJson, null, 2))
      } catch (e) {
        console.error('❌ Raw eBay fulfillment policies error text:', errorText)
      }
      
      return res.status(response.status).json({ 
        error: 'eBay API error',
        details: errorDetails 
      })
    }

    const data = await response.json()
    console.log('✅ eBay fulfillment policies fetched successfully')
    
    // Filter policies that have shipping services configured
    const policiesWithShipping = data.fulfillmentPolicies?.filter(policy => 
      policy.shippingOptions && policy.shippingOptions.length > 0
    ) || []
    
    // If no policies with shipping, return all policies with a warning
    const policiesToReturn = policiesWithShipping.length > 0 ? policiesWithShipping : data.fulfillmentPolicies || []
    
    res.json({ 
      success: true,
      fulfillmentPolicies: policiesToReturn,
      hasShippingServices: policiesWithShipping.length > 0,
      totalPolicies: data.fulfillmentPolicies?.length || 0,
      policiesWithShipping: policiesWithShipping.length
    })

  } catch (error) {
    console.error('❌ Fulfillment policies fetch error:', error)
    res.status(500).json({ 
      error: 'Server error during fulfillment policies fetch',
      message: error.message 
    })
  }
}