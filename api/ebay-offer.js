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
        'Electronics': '15032', // Electronics & Accessories > Cell Phones & Accessories > Cell Phone Accessories
        'Clothing': '15724',    // Clothing, Shoes & Accessories > Men's Clothing > Shirts
        'Home & Garden': '159912', // Home & Garden > Yard, Garden & Outdoor Items > Plants, Seeds & Bulbs
        'Sports': '888',        // Sports Memorabilia, Cards & Fan Shop
        'Toys': '220',          // Toys & Hobbies
        'Books': '267',         // Books & Magazines
        'Other': '99'           // Collectibles
      }
      return categoryMap[category] || '99'
    }

    // Helper function to extract price
    const extractPrice = (priceString) => {
      const cleaned = priceString.replace(/[$,]/g, '')
      return parseFloat(cleaned).toFixed(2)
    }

    // First, get the user's business policies
    console.log('📋 Fetching business policies...')
    
    let policies = {}
    
    // Get fulfillment policies
    try {
      const fulfillmentResponse = await fetch(`${EBAY_API_BASE}/sell/account/v1/fulfillment_policy?marketplace_id=EBAY_US`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Accept-Language': 'en-US'
        }
      })

      if (fulfillmentResponse.ok) {
        const data = await fulfillmentResponse.json()
        if (data.fulfillmentPolicies && data.fulfillmentPolicies.length > 0) {
          // Find a policy with shipping services configured
          const policyWithShipping = data.fulfillmentPolicies.find(policy => 
            policy.shippingOptions && policy.shippingOptions.length > 0
          )
          policies.fulfillmentPolicyId = policyWithShipping?.fulfillmentPolicyId || data.fulfillmentPolicies[0].fulfillmentPolicyId
          console.log('✅ Found fulfillment policy:', policies.fulfillmentPolicyId)
        }
      }
    } catch (error) {
      console.log('⚠️ Fulfillment policy fetch failed:', error.message)
    }

    // Get payment policies
    try {
      const paymentResponse = await fetch(`${EBAY_API_BASE}/sell/account/v1/payment_policy?marketplace_id=EBAY_US`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Accept-Language': 'en-US'
        }
      })

      if (paymentResponse.ok) {
        const data = await paymentResponse.json()
        if (data.paymentPolicies && data.paymentPolicies.length > 0) {
          policies.paymentPolicyId = data.paymentPolicies[0].paymentPolicyId
          console.log('✅ Found payment policy:', policies.paymentPolicyId)
        }
      }
    } catch (error) {
      console.log('⚠️ Payment policy fetch failed:', error.message)
    }

    // Get return policies
    try {
      const returnResponse = await fetch(`${EBAY_API_BASE}/sell/account/v1/return_policy?marketplace_id=EBAY_US`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Accept-Language': 'en-US'
        }
      })

      if (returnResponse.ok) {
        const data = await returnResponse.json()
        if (data.returnPolicies && data.returnPolicies.length > 0) {
          policies.returnPolicyId = data.returnPolicies[0].returnPolicyId
          console.log('✅ Found return policy:', policies.returnPolicyId)
        }
      }
    } catch (error) {
      console.log('⚠️ Return policy fetch failed:', error.message)
    }

    // Build the offer request body
    const offerBody = {
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
      }
    }

    // Add listing policies if we have them
    if (policies.fulfillmentPolicyId || policies.paymentPolicyId || policies.returnPolicyId) {
      offerBody.listingPolicies = {}
      
      if (policies.fulfillmentPolicyId) {
        offerBody.listingPolicies.fulfillmentPolicyId = policies.fulfillmentPolicyId
        console.log('📋 Adding fulfillment policy to offer:', policies.fulfillmentPolicyId)
      }
      
      if (policies.paymentPolicyId) {
        offerBody.listingPolicies.paymentPolicyId = policies.paymentPolicyId
        console.log('💳 Adding payment policy to offer:', policies.paymentPolicyId)
      }
      
      if (policies.returnPolicyId) {
        offerBody.listingPolicies.returnPolicyId = policies.returnPolicyId
        console.log('🔄 Adding return policy to offer:', policies.returnPolicyId)
      }
    } else {
      console.log('⚠️ No business policies found - this may cause issues during publish')
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
      body: JSON.stringify(offerBody)
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