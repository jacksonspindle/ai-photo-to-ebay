// eBay Trading API - Create listing directly
// Vercel serverless function - Alternative to Inventory API

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
    const { token, listingData, imageUrls } = req.body
    
    if (!token || !listingData || !imageUrls) {
      return res.status(400).json({ error: 'Missing required parameters' })
    }

    const sandbox = process.env.VITE_EBAY_SANDBOX === 'true'
    const EBAY_TRADING_API_BASE = sandbox 
      ? 'https://api.sandbox.ebay.com/ws/api.dll'
      : 'https://api.ebay.com/ws/api.dll'

    // Helper functions - define BEFORE using them
    const getCategoryId = (category) => {
      if (sandbox) {
        // For sandbox, use a known working category
        return '11450' // Clothing category that should work
      } else {
        const categoryMap = {
          'Electronics': '15032',
          'Clothing': '15724',
          'Home & Garden': '159912',
          'Sports': '888',
          'Toys': '220',
          'Books': '267',
          'Other': '99'
        }
        return categoryMap[category] || '99'
      }
    }

    const extractPrice = (priceString) => {
      const cleaned = priceString.replace(/[$,]/g, '')
      return parseFloat(cleaned).toFixed(2)
    }

    const truncateTitle = (title) => {
      return title.length > 80 ? title.substring(0, 77) + '...' : title
    }

    console.log('🛒 Creating eBay listing via Trading API...')
    console.log('📋 Selected category:', listingData.category, '-> Category ID:', getCategoryId(listingData.category))
    console.log('🔧 Sandbox mode:', sandbox)

    // Build XML request for AddFixedPriceItem
    const xmlRequest = `<?xml version="1.0" encoding="utf-8"?>
<AddFixedPriceItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <RequesterCredentials>
    <eBayAuthToken>${token}</eBayAuthToken>
  </RequesterCredentials>
  <Item>
    <Title>${truncateTitle(listingData.title)}</Title>
    <Description><![CDATA[${listingData.description}]]></Description>
    <PrimaryCategory>
      <CategoryID>${getCategoryId(listingData.category)}</CategoryID>
    </PrimaryCategory>
    <StartPrice>${extractPrice(listingData.suggestedPrice)}</StartPrice>
    <CategoryMappingAllowed>true</CategoryMappingAllowed>
    <Country>US</Country>
    <Currency>USD</Currency>
    <DispatchTimeMax>1</DispatchTimeMax>
    <ListingDuration>GTC</ListingDuration>
    <ListingType>FixedPriceItem</ListingType>
    <PictureDetails>
      <PictureURL>${imageUrls[0]}</PictureURL>
    </PictureDetails>
    <PostalCode>95125</PostalCode>
    <Quantity>1</Quantity>
    <ReturnPolicy>
      <ReturnsAcceptedOption>ReturnsAccepted</ReturnsAcceptedOption>
      <RefundOption>MoneyBack</RefundOption>
      <ReturnsWithinOption>Days_30</ReturnsWithinOption>
      <ShippingCostPaidByOption>Buyer</ShippingCostPaidByOption>
    </ReturnPolicy>
    <ShippingDetails>
      <ShippingType>Flat</ShippingType>
      <ShippingServiceOptions>
        <ShippingServicePriority>1</ShippingServicePriority>
        <ShippingService>USPSFirstClass</ShippingService>
        <ShippingServiceCost>4.99</ShippingServiceCost>
      </ShippingServiceOptions>
      <ShippingServiceOptions>
        <ShippingServicePriority>2</ShippingServicePriority>
        <ShippingService>USPSPriority</ShippingService>
        <ShippingServiceCost>7.99</ShippingServiceCost>
      </ShippingServiceOptions>
    </ShippingDetails>
    <Site>US</Site>
  </Item>
  <Version>1193</Version>
</AddFixedPriceItemRequest>`

    const response = await fetch(EBAY_TRADING_API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml',
        'X-EBAY-API-COMPATIBILITY-LEVEL': '1193',
        'X-EBAY-API-DEV-NAME': process.env.EBAY_DEV_ID,
        'X-EBAY-API-APP-NAME': process.env.EBAY_APP_ID,
        'X-EBAY-API-CERT-NAME': process.env.EBAY_CERT_ID,
        'X-EBAY-API-CALL-NAME': 'AddFixedPriceItem',
        'X-EBAY-API-SITEID': '0' // US site
      },
      body: xmlRequest
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Trading API error:', response.status, errorText)
      
      // Log the XML request for debugging
      console.error('📤 XML Request sent:', xmlRequest)
      
      return res.status(response.status).json({ 
        error: 'eBay Trading API error',
        details: errorText,
        xmlRequest: xmlRequest // Include the request for debugging
      })
    }

    const xmlResponse = await response.text()
    console.log('✅ Trading API response received')
    
    // Simple XML parsing to extract item ID
    const itemIdMatch = xmlResponse.match(/<ItemID>(\d+)<\/ItemID>/)
    const ackMatch = xmlResponse.match(/<Ack>(\w+)<\/Ack>/)
    
    if (ackMatch && ackMatch[1] === 'Success' && itemIdMatch) {
      const itemId = itemIdMatch[1]
      const listingUrl = sandbox 
        ? `https://sandbox.ebay.com/itm/${itemId}`
        : `https://www.ebay.com/itm/${itemId}`
      
      console.log('🎉 eBay listing created successfully via Trading API:', itemId)
      
      res.json({
        success: true,
        listingId: itemId,
        listingUrl: listingUrl,
        method: 'trading_api'
      })
    } else {
      // Extract error message from XML
      const errorMatch = xmlResponse.match(/<LongMessage>(.*?)<\/LongMessage>/)
      const errorMessage = errorMatch ? errorMatch[1] : 'Unknown error'
      
      console.error('❌ Trading API listing failed:', errorMessage)
      
      res.status(400).json({
        error: 'eBay listing creation failed',
        details: errorMessage,
        xmlResponse: xmlResponse
      })
    }

  } catch (error) {
    console.error('❌ Trading API listing error:', error)
    res.status(500).json({ 
      error: 'Server error during Trading API listing creation',
      message: error.message 
    })
  }
}