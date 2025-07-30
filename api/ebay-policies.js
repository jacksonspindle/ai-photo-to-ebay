// eBay business policies retrieval endpoint
// Vercel serverless function to get existing policy IDs

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
    const EBAY_API_BASE = sandbox 
      ? 'https://api.sandbox.ebay.com'
      : 'https://api.ebay.com'

    console.log('📋 Retrieving eBay business policies...')
    
    const policies = {
      fulfillmentPolicies: [],
      paymentPolicies: [],
      returnPolicies: []
    }

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
        policies.fulfillmentPolicies = data.fulfillmentPolicies || []
        console.log(`✅ Found ${policies.fulfillmentPolicies.length} fulfillment policies`)
      } else {
        console.log('❌ Failed to get fulfillment policies:', fulfillmentResponse.status)
      }
    } catch (error) {
      console.log('❌ Fulfillment policies error:', error.message)
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
        policies.paymentPolicies = data.paymentPolicies || []
        console.log(`✅ Found ${policies.paymentPolicies.length} payment policies`)
      } else {
        console.log('❌ Failed to get payment policies:', paymentResponse.status)
      }
    } catch (error) {
      console.log('❌ Payment policies error:', error.message)
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
        policies.returnPolicies = data.returnPolicies || []
        console.log(`✅ Found ${policies.returnPolicies.length} return policies`)
      } else {
        console.log('❌ Failed to get return policies:', returnResponse.status)
      }
    } catch (error) {
      console.log('❌ Return policies error:', error.message)
    }

    // Extract first policy ID of each type
    const result = {
      fulfillmentPolicyId: policies.fulfillmentPolicies[0]?.fulfillmentPolicyId || null,
      paymentPolicyId: policies.paymentPolicies[0]?.paymentPolicyId || null,
      returnPolicyId: policies.returnPolicies[0]?.returnPolicyId || null
    }

    console.log('📋 Policy IDs retrieved:', result)
    
    res.json({
      success: true,
      policies: result,
      details: policies
    })

  } catch (error) {
    console.error('❌ Policy retrieval error:', error)
    res.status(500).json({ 
      error: 'Server error during policy retrieval',
      message: error.message 
    })
  }
}