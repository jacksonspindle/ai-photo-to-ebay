// eBay offer creation endpoint
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
    const { token, sku, listingData, locationKey } = req.body
    
    if (!token || !sku || !listingData || !locationKey) {
      return res.status(400).json({ error: 'Missing required parameters' })
    }

    const sandbox = process.env.VITE_EBAY_SANDBOX === 'true'
    const EBAY_API_BASE = sandbox 
      ? 'https://api.sandbox.ebay.com'
      : 'https://api.ebay.com'

    console.log('💰 Creating eBay offer for SKU:', sku)

    // Helper function to get category ID
    const getCategoryId = (category) => {
      const categoryMap = {
        'Electronics': '58058',
        'Clothing': '11450',
        'Home & Garden': '11700',
        'Sports': '888',
        'Toys': '220',
        'Books': '267',
        'Other': '99'
      }
      return categoryMap[category] || '99'
    }

    // Helper function to extract price
    const extractPrice = (priceString) => {
      const cleaned = priceString.replace(/[$,]/g, '')
      return parseFloat(cleaned).toFixed(2)
    }

    // Get business policy IDs
    console.log('📋 Retrieving business policy IDs...')
    let policyIds = {
      fulfillmentPolicyId: null,
      paymentPolicyId: null,
      returnPolicyId: null
    }

    try {
      // Use relative URL for internal serverless function calls
      const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://ai-photo-to-ebay.vercel.app'
      const policiesResponse = await fetch(`${baseUrl}/api/ebay-policies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token })
      })

      if (policiesResponse.ok) {
        const policiesData = await policiesResponse.json()
        policyIds = policiesData.policies
        console.log('✅ Retrieved policy IDs:', policyIds)
      } else {
        console.log('❌ Failed to retrieve policies, using defaults')
      }
    } catch (error) {
      console.log('❌ Policy retrieval error:', error.message)
    }
    
    const response = await fetch(`${EBAY_API_BASE}/sell/inventory/v1/offer`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Language': 'en-US',
        'Accept-Language': 'en-US',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        sku: sku,
        marketplaceId: 'EBAY_US',
        format: 'FIXED_PRICE',
        availableQuantity: 1,
        categoryId: getCategoryId(listingData.category),
        merchantLocationKey: locationKey,
        pricingSummary: {
          price: {
            value: extractPrice(listingData.suggestedPrice),
            currency: 'USD'
          }
        },
        listingPolicies: {
          fulfillmentPolicyId: policyIds.fulfillmentPolicyId || '0000000000',
          paymentPolicyId: policyIds.paymentPolicyId || '0000000000',
          returnPolicyId: policyIds.returnPolicyId || '0000000000'
        }
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ eBay offer error:', response.status, errorText)
      
      // Try to parse error details
      let errorDetails = errorText
      try {
        const errorJson = JSON.parse(errorText)
        errorDetails = errorJson
        console.error('❌ Parsed eBay offer error:', JSON.stringify(errorJson, null, 2))
      } catch (e) {
        console.error('❌ Raw eBay offer error text:', errorText)
      }
      
      return res.status(response.status).json({ 
        error: 'eBay API error',
        details: errorDetails 
      })
    }

    const data = await response.json()
    console.log('✅ eBay offer created successfully:', data.offerId)
    
    res.json({ 
      success: true,
      offerId: data.offerId
    })

  } catch (error) {
    console.error('❌ Offer creation error:', error)
    res.status(500).json({ 
      error: 'Server error during offer creation',
      message: error.message 
    })
  }
}