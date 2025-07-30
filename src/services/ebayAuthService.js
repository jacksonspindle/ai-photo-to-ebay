// eBay OAuth Authentication Service
// Handles user authentication and token management

const EBAY_AUTH_BASE = import.meta.env.VITE_EBAY_SANDBOX === 'true' 
  ? 'https://auth.sandbox.ebay.com' 
  : 'https://auth.ebay.com'

const EBAY_API_BASE = import.meta.env.VITE_EBAY_SANDBOX === 'true'
  ? 'https://api.sandbox.ebay.com'
  : 'https://api.ebay.com'

// Required scopes for listing items
const EBAY_SCOPES = 'https://api.ebay.com/oauth/api_scope'

/**
 * Get eBay OAuth URL for user authorization
 */
export const getEbayAuthUrl = () => {
  const clientId = import.meta.env.VITE_EBAY_CLIENT_ID
  const redirectUri = encodeURIComponent('http://localhost:5173/callback')
  
  if (!clientId) {
    throw new Error('eBay Client ID not configured')
  }
  
  const authUrl = `${EBAY_AUTH_BASE}/oauth2/authorize?` +
    `client_id=${clientId}&` +
    `redirect_uri=${redirectUri}&` +
    `response_type=code&` +
    `scope=${encodeURIComponent(EBAY_SCOPES)}&` +
    `prompt=login`
  
  console.log('🔐 eBay Auth URL:', authUrl)
  console.log('🔗 Redirect URI:', redirectUri)
  console.log('🆔 Client ID:', clientId)
  return authUrl
}

/**
 * Exchange authorization code for access token
 */
export const exchangeCodeForToken = async (authCode) => {
  try {
    const response = await fetch(`${getApiBaseUrl()}/api/ebay-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        code: authCode,
        redirectUri: 'http://localhost:5173/callback'
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to exchange code for token')
    }

    const data = await response.json()
    
    // Store tokens securely
    storeEbayTokens(data)
    
    return {
      success: true,
      accessToken: data.access_token,
      expiresIn: data.expires_in
    }
    
  } catch (error) {
    console.error('❌ Token exchange failed:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Store eBay tokens in localStorage
 */
const storeEbayTokens = (tokenData) => {
  const expiryTime = Date.now() + (tokenData.expires_in * 1000)
  
  localStorage.setItem('ebay_access_token', tokenData.access_token)
  localStorage.setItem('ebay_token_expiry', expiryTime.toString())
  
  if (tokenData.refresh_token) {
    localStorage.setItem('ebay_refresh_token', tokenData.refresh_token)
  }
}

/**
 * Get stored access token
 */
export const getStoredToken = () => {
  const token = localStorage.getItem('ebay_access_token')
  const expiry = localStorage.getItem('ebay_token_expiry')
  
  if (!token || !expiry) {
    return null
  }
  
  // Check if token is expired
  if (Date.now() > parseInt(expiry)) {
    console.log('⏰ Token expired')
    clearEbayTokens()
    return null
  }
  
  return token
}

/**
 * Clear stored tokens
 */
export const clearEbayTokens = () => {
  localStorage.removeItem('ebay_access_token')
  localStorage.removeItem('ebay_token_expiry')
  localStorage.removeItem('ebay_refresh_token')
}

/**
 * Check if user is authenticated with eBay
 */
export const isEbayAuthenticated = () => {
  return getStoredToken() !== null
}

/**
 * Get API base URL
 */
const getApiBaseUrl = () => {
  return import.meta.env.VITE_API_BASE_URL || 
    (import.meta.env.DEV ? 'http://localhost:3001' : '')
}