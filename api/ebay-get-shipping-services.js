// eBay Trading API - Get valid shipping service codes
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
    const { token } = req.body
    
    if (!token) {
      return res.status(400).json({ error: 'eBay access token required' })
    }

    const sandbox = process.env.VITE_EBAY_SANDBOX === 'true'
    const EBAY_TRADING_API_BASE = sandbox 
      ? 'https://api.sandbox.ebay.com/ws/api.dll'
      : 'https://api.ebay.com/ws/api.dll'

    console.log('📦 Getting valid shipping service codes from eBay Trading API...')

    // Build XML request for GeteBayDetails
    const xmlRequest = `<?xml version="1.0" encoding="utf-8"?>
<GeteBayDetailsRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <RequesterCredentials>
    <eBayAuthToken>${token}</eBayAuthToken>
  </RequesterCredentials>
  <DetailName>ShippingServiceDetails</DetailName>
  <Version>1193</Version>
</GeteBayDetailsRequest>`

    const response = await fetch(EBAY_TRADING_API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml',
        'X-EBAY-API-COMPATIBILITY-LEVEL': '1193',
        'X-EBAY-API-DEV-NAME': process.env.EBAY_DEV_ID,
        'X-EBAY-API-APP-NAME': process.env.EBAY_APP_ID,
        'X-EBAY-API-CERT-NAME': process.env.EBAY_CERT_ID,
        'X-EBAY-API-CALL-NAME': 'GeteBayDetails',
        'X-EBAY-API-SITEID': '0' // US site
      },
      body: xmlRequest
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Trading API error:', response.status, errorText)
      return res.status(response.status).json({ 
        error: 'eBay Trading API error',
        details: errorText 
      })
    }

    const xmlResponse = await response.text()
    console.log('✅ Got shipping services XML response')
    
    // Simple XML parsing to extract shipping service codes
    const shippingServices = []
    
    // Look for ShippingService elements that are valid for selling
    const serviceRegex = /<ShippingService>([^<]+)<\/ShippingService>/g
    const validForSellingRegex = /<ValidForSellingFlow>true<\/ValidForSellingFlow>/g
    
    let match
    const allServices = []
    while ((match = serviceRegex.exec(xmlResponse)) !== null) {
      allServices.push(match[1])
    }
    
    // For simplicity, take the first few services that should work
    const commonServices = allServices.filter(service => 
      service.includes('USPS') || 
      service.includes('Standard') || 
      service.includes('Ground') ||
      service.includes('Priority')
    ).slice(0, 5)
    
    console.log('🎯 Found shipping services:', commonServices)
    
    res.json({
      success: true,
      shippingServices: commonServices.length > 0 ? commonServices : allServices.slice(0, 5),
      totalServices: allServices.length,
      message: 'Retrieved valid shipping service codes'
    })

  } catch (error) {
    console.error('❌ Get shipping services error:', error)
    res.status(500).json({ 
      error: 'Server error during shipping services retrieval',
      message: error.message 
    })
  }
}