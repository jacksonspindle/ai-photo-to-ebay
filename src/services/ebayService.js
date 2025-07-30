// eBay Integration Service
// Handles URL construction and data formatting for eBay listing pre-population

/**
 * eBay Category Mapping
 * Maps our generic categories to eBay category IDs
 */
const EBAY_CATEGORY_MAP = {
  'Electronics': '58058', // Consumer Electronics
  'Clothing': '11450', // Clothing, Shoes & Accessories  
  'Home & Garden': '11700', // Home & Garden
  'Sports': '888', // Sporting Goods
  'Toys': '220', // Toys & Hobbies
  'Books': '267', // Books, Movies & Music
  'Other': '99', // Everything Else
}

/**
 * eBay Condition Mapping
 * Maps our condition strings to eBay condition IDs
 */
const EBAY_CONDITION_MAP = {
  'New': '1000', // New
  'Used - Like New': '1500', // New other (see details)
  'Used - Good': '3000', // Used
  'Used - Fair': '4000', // Very Good
  'For Parts': '7000', // For parts or not working
}

/**
 * Format price for eBay (remove $ sign, ensure decimal format)
 */
const formatPrice = (priceString) => {
  if (!priceString) return '0.00'
  
  // Remove currency symbols and clean up
  const cleaned = priceString.replace(/[$,]/g, '')
  const price = parseFloat(cleaned)
  
  if (isNaN(price)) return '0.00'
  return price.toFixed(2)
}

/**
 * Truncate text to eBay's character limits
 */
const truncateText = (text, maxLength) => {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength - 3) + '...'
}

/**
 * Clean and format description for eBay
 */
const formatDescription = (description) => {
  if (!description) return ''
  
  // eBay descriptions can be quite long, but we'll limit to reasonable length
  const cleaned = description
    .replace(/[<>]/g, '') // Remove potential HTML brackets
    .trim()
  
  return truncateText(cleaned, 1000) // eBay allows much more, but keep reasonable
}

/**
 * Build eBay listing URL with pre-populated data
 */
export const buildEbayListingUrl = (listingData, images = []) => {
  if (!listingData) {
    throw new Error('Listing data is required')
  }

  // Base eBay sell page URL
  const baseUrl = 'https://www.ebay.com/sl/sell'
  
  // Build URL parameters
  const params = new URLSearchParams()
  
  // Title (max 80 characters on eBay)
  if (listingData.title) {
    params.append('title', truncateText(listingData.title, 80))
  }
  
  // Category
  if (listingData.category && EBAY_CATEGORY_MAP[listingData.category]) {
    params.append('catId', EBAY_CATEGORY_MAP[listingData.category])
  }
  
  // Description
  if (listingData.description) {
    params.append('description', formatDescription(listingData.description))
  }
  
  // Price
  if (listingData.suggestedPrice) {
    const price = formatPrice(listingData.suggestedPrice)
    params.append('price', price)
    params.append('format', 'FixedPrice') // Fixed price listing
  }
  
  // Condition
  if (listingData.condition && EBAY_CONDITION_MAP[listingData.condition]) {
    params.append('conditionId', EBAY_CONDITION_MAP[listingData.condition])
  }
  
  // Keywords (if available)
  if (listingData.keywords && Array.isArray(listingData.keywords)) {
    const keywordString = listingData.keywords.slice(0, 5).join(', ') // Limit keywords
    params.append('keywords', keywordString)
  }
  
  // Add some default settings for better user experience
  params.append('duration', '7') // 7 day listing
  params.append('shippingType', 'Flat') // Flat rate shipping (user can change)
  
  // Construct final URL
  const finalUrl = `${baseUrl}?${params.toString()}`
  
  console.log('🛒 Generated eBay listing URL:', finalUrl)
  return finalUrl
}

/**
 * Validate listing data for eBay requirements
 */
export const validateEbayListing = (listingData) => {
  const errors = []
  
  if (!listingData.title || listingData.title.trim().length < 5) {
    errors.push('Title must be at least 5 characters long')
  }
  
  if (listingData.title && listingData.title.length > 80) {
    errors.push('Title must be 80 characters or less')
  }
  
  if (!listingData.description || listingData.description.trim().length < 10) {
    errors.push('Description must be at least 10 characters long')
  }
  
  if (!listingData.suggestedPrice) {
    errors.push('Price is required')
  } else {
    const price = parseFloat(formatPrice(listingData.suggestedPrice))
    if (price <= 0) {
      errors.push('Price must be greater than $0.00')
    }
  }
  
  if (!listingData.category) {
    errors.push('Category is required')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Main function to handle eBay integration
 */
export const postToEbay = (listingData, images = []) => {
  console.log('🚀 Starting eBay integration process...')
  
  // Validate the listing data
  const validation = validateEbayListing(listingData)
  if (!validation.isValid) {
    console.error('❌ Validation failed:', validation.errors)
    throw new Error(`Listing validation failed: ${validation.errors.join(', ')}`)
  }
  
  try {
    // Build the eBay listing URL
    const ebayUrl = buildEbayListingUrl(listingData, images)
    
    // Open eBay in a new tab/window
    window.open(ebayUrl, '_blank', 'noopener,noreferrer')
    
    console.log('✅ Successfully redirected to eBay')
    
    // Return success info
    return {
      success: true,
      url: ebayUrl,
      message: 'Redirected to eBay with pre-filled listing data'
    }
    
  } catch (error) {
    console.error('❌ eBay integration failed:', error)
    throw error
  }
}

// Export category and condition maps for reference
export { EBAY_CATEGORY_MAP, EBAY_CONDITION_MAP }