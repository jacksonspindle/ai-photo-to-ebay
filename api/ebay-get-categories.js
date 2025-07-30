// eBay Get Categories API endpoint
// Vercel serverless function - Get leaf categories from eBay

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
    const EBAY_TRADING_API_BASE = sandbox 
      ? 'https://api.sandbox.ebay.com/ws/api.dll'
      : 'https://api.ebay.com/ws/api.dll'

    console.log('📋 Fetching eBay categories...')
    
    // Build XML request for GetCategories
    const xmlRequest = `<?xml version="1.0" encoding="utf-8"?>
<GetCategoriesRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <RequesterCredentials>
    <eBayAuthToken>${token}</eBayAuthToken>
  </RequesterCredentials>
  <CategorySiteID>0</CategorySiteID>
  <DetailLevel>ReturnAll</DetailLevel>
  <LevelLimit>3</LevelLimit>
  <ViewAllNodes>true</ViewAllNodes>
  <Version>1193</Version>
</GetCategoriesRequest>`

    const response = await fetch(EBAY_TRADING_API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml',
        'X-EBAY-API-COMPATIBILITY-LEVEL': '1193',
        'X-EBAY-API-DEV-NAME': process.env.EBAY_DEV_ID,
        'X-EBAY-API-APP-NAME': process.env.EBAY_APP_ID,
        'X-EBAY-API-CERT-NAME': process.env.EBAY_CERT_ID,
        'X-EBAY-API-CALL-NAME': 'GetCategories',
        'X-EBAY-API-SITEID': '0' // US site
      },
      body: xmlRequest
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ eBay GetCategories error:', response.status, errorText)
      return res.status(response.status).json({ 
        error: 'eBay API error',
        details: errorText 
      })
    }

    const xmlResponse = await response.text()
    console.log('✅ eBay categories fetched successfully')
    
    // Parse XML to find leaf categories
    const leafCategories = parseLeafCategories(xmlResponse)
    
    res.json({ 
      success: true,
      leafCategories: leafCategories,
      totalCategories: leafCategories.length
    })

  } catch (error) {
    console.error('❌ Get categories error:', error)
    res.status(500).json({ 
      error: 'Server error during categories fetch',
      message: error.message 
    })
  }
}

// Helper function to parse XML and find leaf categories
function parseLeafCategories(xmlResponse) {
  const leafCategories = []
  
  // Extract category information using regex
  const categoryMatches = xmlResponse.match(/<Category>(.*?)<\/Category>/gs)
  
  if (categoryMatches) {
    categoryMatches.forEach(match => {
      const categoryIdMatch = match.match(/<CategoryID>(\d+)<\/CategoryID>/)
      const categoryNameMatch = match.match(/<CategoryName>(.*?)<\/CategoryName>/)
      const leafCategoryMatch = match.match(/<LeafCategory>(true|false)<\/LeafCategory>/)
      
      if (categoryIdMatch && categoryNameMatch) {
        const categoryId = categoryIdMatch[1]
        const categoryName = categoryNameMatch[1]
        const isLeaf = leafCategoryMatch ? leafCategoryMatch[1] === 'true' : false
        
        if (isLeaf) {
          leafCategories.push({
            categoryId: categoryId,
            categoryName: categoryName,
            isLeaf: true
          })
        }
      }
    })
  }
  
  // Return a subset of leaf categories for common items
  const commonCategories = leafCategories.filter(cat => 
    cat.categoryName.toLowerCase().includes('collectibles') ||
    cat.categoryName.toLowerCase().includes('antiques') ||
    cat.categoryName.toLowerCase().includes('art') ||
    cat.categoryName.toLowerCase().includes('books') ||
    cat.categoryName.toLowerCase().includes('toys') ||
    cat.categoryName.toLowerCase().includes('sports') ||
    cat.categoryName.toLowerCase().includes('electronics') ||
    cat.categoryName.toLowerCase().includes('clothing')
  )
  
  return commonCategories.length > 0 ? commonCategories : leafCategories.slice(0, 10)
} 