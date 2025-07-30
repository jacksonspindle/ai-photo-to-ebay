// eBay Account Setup Helper
// Vercel serverless function to set up required business policies and inventory location

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

    console.log('🔧 Setting up eBay account requirements...')
    
    const setupResults = {
      inventoryLocation: null,
      paymentPolicy: null,
      fulfillmentPolicy: null,
      returnPolicy: null,
      errors: []
    }

    // Step 1: Create inventory location
    try {
      console.log('📍 Creating inventory location...')
      const locationResponse = await fetch(`${EBAY_API_BASE}/sell/inventory/v1/location/default_location`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Content-Language': 'en-US'
        },
        body: JSON.stringify({
          merchantLocationKey: 'default_location',
          name: 'Default Store Location',
          location: {
            address: {
              addressLine1: '123 Main St',
              city: 'San Jose',
              stateOrProvince: 'CA',
              postalCode: '95125',
              country: 'US'
            }
          },
          locationTypes: ['STORE']
        })
      })

      if (locationResponse.ok || locationResponse.status === 409) {
        // 409 means it already exists, which is fine
        setupResults.inventoryLocation = 'default_location'
        console.log('✅ Inventory location ready')
      } else {
        const error = await locationResponse.text()
        setupResults.errors.push(`Inventory location: ${error}`)
        console.log('❌ Inventory location failed:', error)
      }
    } catch (error) {
      setupResults.errors.push(`Inventory location error: ${error.message}`)
    }

    // Step 2: Create payment policy
    try {
      console.log('💳 Creating payment policy...')
      const paymentResponse = await fetch(`${EBAY_API_BASE}/sell/account/v1/payment_policy`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Content-Language': 'en-US'
        },
        body: JSON.stringify({
          name: 'Default Payment Policy',
          description: 'Default payment policy for listings',
          marketplaceId: 'EBAY_US',
          paymentMethods: [
            {
              paymentMethodType: 'PAYPAL',
              recipientAccountReference: {
                referenceId: 'test@example.com',
                referenceType: 'PAYPAL_EMAIL'
              }
            }
          ]
        })
      })

      if (paymentResponse.ok || paymentResponse.status === 409) {
        const paymentData = paymentResponse.ok ? await paymentResponse.json() : null
        setupResults.paymentPolicy = paymentData?.paymentPolicyId || 'existing'
        console.log('✅ Payment policy ready')
      } else {
        const error = await paymentResponse.text()
        setupResults.errors.push(`Payment policy: ${error}`)
        console.log('❌ Payment policy failed:', error)
      }
    } catch (error) {
      setupResults.errors.push(`Payment policy error: ${error.message}`)
    }

    // Step 3: Create fulfillment policy (delete existing first to ensure clean state)
    try {
      console.log('📦 Creating fulfillment policy...')
      
      // Use 'Other' as a universal shipping service code
      console.log('📦 Using "Other" as shipping service code for maximum compatibility')
      
      // Then, try to get existing policies and delete them
      try {
        const existingResponse = await fetch(`${EBAY_API_BASE}/sell/account/v1/fulfillment_policy?marketplace_id=EBAY_US`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'Accept-Language': 'en-US'
          }
        })
        
        if (existingResponse.ok) {
          const existingData = await existingResponse.json()
          if (existingData.fulfillmentPolicies && existingData.fulfillmentPolicies.length > 0) {
            for (const policy of existingData.fulfillmentPolicies) {
              try {
                await fetch(`${EBAY_API_BASE}/sell/account/v1/fulfillment_policy/${policy.fulfillmentPolicyId}`, {
                  method: 'DELETE',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                  }
                })
                console.log('🗑️ Deleted existing fulfillment policy:', policy.fulfillmentPolicyId)
              } catch (e) {
                console.log('⚠️ Could not delete policy:', e.message)
              }
            }
          }
        }
      } catch (e) {
        console.log('⚠️ Could not check existing policies:', e.message)
      }
      
      const fulfillmentResponse = await fetch(`${EBAY_API_BASE}/sell/account/v1/fulfillment_policy`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Content-Language': 'en-US'
        },
        body: JSON.stringify({
          name: 'Basic Fulfillment Policy',
          marketplaceId: 'EBAY_US',
          categoryTypes: [
            {
              name: 'ALL_EXCLUDING_MOTORS_VEHICLES'
            }
          ],
          handlingTime: {
            value: 1,
            unit: 'DAY'
          },
          shippingOptions: [
            {
              optionType: 'DOMESTIC',
              costType: 'FLAT_RATE',
              shippingServices: [
                {
                  shippingServiceCode: 'US_StandardShipping',
                  shippingCost: {
                    currency: 'USD',
                    value: '5.99'
                  },
                  freeShipping: false,
                  sortOrder: 1
                }
              ]
            }
          ]
        })
      })

      if (fulfillmentResponse.ok || fulfillmentResponse.status === 409) {
        const fulfillmentData = fulfillmentResponse.ok ? await fulfillmentResponse.json() : null
        setupResults.fulfillmentPolicy = fulfillmentData?.fulfillmentPolicyId || 'existing'
        console.log('✅ Fulfillment policy ready')
      } else {
        const error = await fulfillmentResponse.text()
        setupResults.errors.push(`Fulfillment policy: ${error}`)
        console.log('❌ Fulfillment policy failed:', error)
      }
    } catch (error) {
      setupResults.errors.push(`Fulfillment policy error: ${error.message}`)
    }

    // Step 4: Create return policy
    try {
      console.log('↩️ Creating return policy...')
      const returnResponse = await fetch(`${EBAY_API_BASE}/sell/account/v1/return_policy`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Content-Language': 'en-US'
        },
        body: JSON.stringify({
          name: 'Default Return Policy',
          description: 'Default return policy for listings',
          marketplaceId: 'EBAY_US',
          returnsAccepted: true,
          returnPeriod: {
            value: 30,
            unit: 'DAY'
          },
          returnShippingCostPayer: 'BUYER',
          returnMethod: 'MONEY_BACK'
        })
      })

      if (returnResponse.ok || returnResponse.status === 409) {
        const returnData = returnResponse.ok ? await returnResponse.json() : null
        setupResults.returnPolicy = returnData?.returnPolicyId || 'existing'
        console.log('✅ Return policy ready')
      } else {
        const error = await returnResponse.text()
        setupResults.errors.push(`Return policy: ${error}`)
        console.log('❌ Return policy failed:', error)
      }
    } catch (error) {
      setupResults.errors.push(`Return policy error: ${error.message}`)
    }

    console.log('🎯 eBay account setup complete')
    
    res.json({
      success: true,
      message: 'eBay account setup completed',
      results: setupResults
    })

  } catch (error) {
    console.error('❌ Account setup error:', error)
    res.status(500).json({ 
      error: 'Server error during account setup',
      message: error.message 
    })
  }
}