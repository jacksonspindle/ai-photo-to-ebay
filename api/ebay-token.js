// Vercel serverless function for eBay OAuth token exchange

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  )

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { code, redirectUri } = req.body
    
    if (!code) {
      return res.status(400).json({ error: 'Authorization code required' })
    }

    const clientId = process.env.VITE_EBAY_CLIENT_ID
    const clientSecret = process.env.VITE_EBAY_CLIENT_SECRET
    const isSandbox = process.env.VITE_EBAY_SANDBOX === 'true'
    
    if (!clientId || !clientSecret) {
      return res.status(500).json({ error: 'eBay credentials not configured' })
    }

    const tokenUrl = isSandbox
      ? 'https://api.sandbox.ebay.com/identity/v1/oauth2/token'
      : 'https://api.ebay.com/identity/v1/oauth2/token'

    // Create base64 encoded credentials
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

    console.log('🔐 Exchanging code for eBay access token...')

    // Exchange code for token
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
      const error = await response.text()
      console.error('eBay token error:', error)
      return res.status(response.status).json({ 
        error: 'Failed to exchange code for token',
        details: error 
      })
    }

    const tokenData = await response.json()
    console.log('✅ Successfully obtained eBay access token')

    // Return token data
    res.json({
      access_token: tokenData.access_token,
      expires_in: tokenData.expires_in,
      refresh_token: tokenData.refresh_token,
      token_type: tokenData.token_type
    })

  } catch (error) {
    console.error('❌ eBay token exchange error:', error)
    res.status(500).json({ 
      error: 'Failed to exchange authorization code',
      message: error.message 
    })
  }
}