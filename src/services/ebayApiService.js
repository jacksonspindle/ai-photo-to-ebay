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

    // Step 5: Publish offer
    console.log('📢 Step 5: Publishing listing...')
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
    // Use a default location key
    const locationKey = 'DEFAULT_LOCATION'
    
    // Try to get existing location
    const response = await fetch(`${EBAY_API_BASE}/sell/inventory/v1/location/${locationKey}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    if (response.status === 404) {
      // Create new location
      console.log('Creating new inventory location...')
      const createResponse = await fetch(`${EBAY_API_BASE}/sell/inventory/v1/location/${locationKey}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          location: {
            address: {
              addressLine1: '123 Main St',
              city: 'San Francisco',
              stateOrProvince: 'CA',
              postalCode: '94105',
              country: 'US'
            }
          },
          merchantLocationStatus: 'ENABLED',
          name: 'Default Location',
          merchantLocationKey: locationKey
        })
      })

      if (!createResponse.ok) {
        const error = await createResponse.json()
        throw new Error(error.message || 'Failed to create location')
      }
    }

    return locationKey

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
    const response = await fetch(`${EBAY_API_BASE}/sell/inventory/v1/inventory_item/${sku}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Language': 'en-US'
      },
      body: JSON.stringify({
        sku: sku,
        product: {
          title: listingData.title,
          description: listingData.description,
          aspects: getProductAspects(listingData),
          imageUrls: imageUrls,
          condition: mapConditionToEbay(listingData.condition)
        },
        availability: {
          shipToLocationAvailability: {
            quantity: 1
          }
        }
      })
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('Inventory item error:', error)
      return { success: false, error: error.message || 'Failed to create inventory item' }
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
    const response = await fetch(`${EBAY_API_BASE}/sell/inventory/v1/offer`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Language': 'en-US'
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
          fulfillmentPolicyId: '0000000000',  // Default policy
          paymentPolicyId: '0000000000',      // Default policy
          returnPolicyId: '0000000000'        // Default policy
        }
      })
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('Offer creation error:', error)
      return { success: false, error: error.message || 'Failed to create offer' }
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
    const response = await fetch(`${EBAY_API_BASE}/sell/inventory/v1/offer/${offerId}/publish`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('Publish error:', error)
      return { success: false, error: error.message || 'Failed to publish offer' }
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