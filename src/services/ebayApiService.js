// eBay API Service
// Handles all eBay API operations for creating listings

import { getStoredToken } from './ebayAuthService'
import { uploadMultipleImages } from './cloudinaryService'

const EBAY_API_BASE = import.meta.env.VITE_EBAY_SANDBOX === 'true'
  ? 'https://api.sandbox.ebay.com'
  : 'https://api.ebay.com'

/**
 * Create a complete eBay listing
 * This orchestrates the entire process from inventory to published listing
 */
export const createEbayListing = async (listingData, imageFiles) => {
  try {
    const token = getStoredToken()
    if (!token) {
      throw new Error('Not authenticated with eBay')
    }


    console.log('🚀 Starting eBay listing creation process...')

    // Step 1: Upload images to Cloudinary
    console.log('📤 Step 1: Uploading images...')
    const imageUploadResult = await uploadMultipleImages(imageFiles)
    
    if (!imageUploadResult.success || imageUploadResult.urls.length === 0) {
      throw new Error('Failed to upload images')
    }

    const imageUrls = imageUploadResult.urls
    console.log(`✅ Uploaded ${imageUrls.length} images`)

    // Step 2: Create or get inventory location
    console.log('📍 Step 2: Setting inventory location...')
    const locationKey = await getOrCreateInventoryLocation(token)

    // Step 3: Create inventory item
    console.log('📦 Step 3: Creating inventory item...')
    const sku = generateSKU(listingData.title)
    const inventoryResult = await createInventoryItem(token, sku, listingData, imageUrls)
    
    if (!inventoryResult.success) {
      throw new Error(`Failed to create inventory item: ${inventoryResult.error}`)
    }

    // Step 4: Create offer
    console.log('💰 Step 4: Creating offer...')
    const offerResult = await createOffer(token, sku, listingData, locationKey)
    
    if (!offerResult.success) {
      throw new Error(`Failed to create offer: ${offerResult.error}`)
    }

    // Alternative: Try Trading API instead of Inventory API
    console.log('📢 Step 5: Trying Trading API as fallback...')
    
    try {
      const tradingResult = await createTradingApiListing(token, listingData, imageUrls)
      
      if (tradingResult.success) {
        console.log('🎉 eBay listing created successfully via Trading API!')
        return {
          success: true,
          listingId: tradingResult.listingId,
          listingUrl: tradingResult.listingUrl,
          method: 'trading_api'
        }
      }
    } catch (tradingError) {
      console.log('⚠️ Trading API also failed, trying original publish...')
    }

    // Original publish approach
    const publishResult = await publishOffer(token, offerResult.offerId)
    
    if (!publishResult.success) {
      throw new Error(`Failed to publish listing: ${publishResult.error}`)
    }

    console.log('🎉 eBay listing created successfully!')
    
    return {
      success: true,
      listingId: publishResult.listingId,
      sku: sku,
      offerId: offerResult.offerId,
      listingUrl: getListingUrl(publishResult.listingId)
    }

  } catch (error) {
    console.error('❌ eBay listing creation failed:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Get or create inventory location
 */
const getOrCreateInventoryLocation = async (token) => {
  try {
    // For sandbox, we'll skip location creation and use a simple approach
    // Many eBay listing APIs don't require explicit location setup in sandbox
    console.log('📍 Skipping inventory location for sandbox...')
    return 'default_location'

  } catch (error) {
    console.error('Location error:', error)
    throw error
  }
}

/**
 * Create inventory item
 */
const createInventoryItem = async (token, sku, listingData, imageUrls) => {
  try {
    // Make the request through our backend to avoid CORS issues
    const response = await fetch(`${getApiBaseUrl()}/api/ebay-inventory`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        token: token,
        sku: sku,
        listingData: listingData,
        imageUrls: imageUrls
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Inventory item error:', response.status, errorText)
      let errorMessage = 'Failed to create inventory item'
      try {
        const errorJson = JSON.parse(errorText)
        errorMessage = errorJson.errors?.[0]?.message || errorJson.message || errorMessage
      } catch (e) {
        // Use errorText if JSON parsing fails
        errorMessage = errorText || errorMessage
      }
      return { success: false, error: errorMessage }
    }

    return { success: true }

  } catch (error) {
    console.error('Inventory creation error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Create offer
 */
const createOffer = async (token, sku, listingData, locationKey) => {
  try {
    // Make the request through our backend to avoid CORS issues
    const response = await fetch(`${getApiBaseUrl()}/api/ebay-offer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        token: token,
        sku: sku,
        listingData: listingData,
        locationKey: locationKey
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Offer creation error:', response.status, errorText)
      let errorMessage = 'Failed to create offer'
      try {
        const errorJson = JSON.parse(errorText)
        errorMessage = errorJson.error || errorMessage
      } catch (e) {
        errorMessage = errorText || errorMessage
      }
      return { success: false, error: errorMessage }
    }

    const data = await response.json()
    return { success: true, offerId: data.offerId }

  } catch (error) {
    console.error('Offer creation error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Publish offer
 */
const publishOffer = async (token, offerId) => {
  try {
    // Make the request through our backend to avoid CORS issues
    const response = await fetch(`${getApiBaseUrl()}/api/ebay-publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        token: token,
        offerId: offerId
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Publish error:', response.status, errorText)
      let errorMessage = 'Failed to publish offer'
      try {
        const errorJson = JSON.parse(errorText)
        errorMessage = errorJson.error || errorMessage
      } catch (e) {
        errorMessage = errorText || errorMessage
      }
      return { success: false, error: errorMessage }
    }

    const data = await response.json()
    return { success: true, listingId: data.listingId }

  } catch (error) {
    console.error('Publish error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Helper functions
 */

const generateSKU = (title) => {
  // Generate a unique SKU from title and timestamp
  const cleanTitle = title.replace(/[^a-zA-Z0-9]/g, '').substring(0, 20).toUpperCase()
  const timestamp = Date.now().toString().slice(-6)
  return `${cleanTitle}_${timestamp}`
}

const mapConditionToEbay = (condition) => {
  const conditionMap = {
    'New': 'NEW',
    'Used - Like New': 'LIKE_NEW',
    'Used - Good': 'USED_EXCELLENT',
    'Used - Fair': 'USED_GOOD',
    'For Parts': 'FOR_PARTS_OR_NOT_WORKING'
  }
  return conditionMap[condition] || 'USED_GOOD'
}

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

const extractPrice = (priceString) => {
  const cleaned = priceString.replace(/[$,]/g, '')
  return parseFloat(cleaned).toFixed(2)
}

const getProductAspects = (listingData) => {
  // Extract key aspects from keywords or description
  const aspects = {}
  
  if (listingData.keywords && listingData.keywords.length > 0) {
    if (listingData.keywords.some(k => k.toLowerCase().includes('brand'))) {
      aspects['Brand'] = [listingData.keywords.find(k => k.toLowerCase().includes('brand')) || 'Unbranded']
    }
  }
  
  return aspects
}

const getListingUrl = (listingId) => {
  const base = import.meta.env.VITE_EBAY_SANDBOX === 'true'
    ? 'https://sandbox.ebay.com'
    : 'https://www.ebay.com'
  return `${base}/itm/${listingId}`
}

/**
 * Create listing via Trading API (alternative to Inventory API)
 */
const createTradingApiListing = async (token, listingData, imageUrls) => {
  try {
    const response = await fetch(`${getApiBaseUrl()}/api/ebay-trading-listing`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        token: token,
        listingData: listingData,
        imageUrls: imageUrls
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Trading API error:', response.status, errorText)
      return { success: false, error: errorText }
    }

    const data = await response.json()
    return data

  } catch (error) {
    console.error('Trading API request error:', error)
    return { success: false, error: error.message }
  }
}

const getApiBaseUrl = () => {
  return import.meta.env.VITE_API_BASE_URL || 
    (import.meta.env.DEV ? 'http://localhost:3001' : '')
}