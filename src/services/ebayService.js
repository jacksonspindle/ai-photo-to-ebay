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
 * Using a more reliable approach with encoded data
 */
export const buildEbayListingUrl = (listingData, images = []) => {
  if (!listingData) {
    throw new Error('Listing data is required')
  }

  // eBay's sell hub URL - this is the most reliable entry point
  const baseUrl = 'https://www.ebay.com/sl/sell'
  
  // Create a session data object that eBay can parse
  const sessionData = {
    title: '',
    description: '',
    price: '',
    categoryId: '',
    condition: ''
  }
  
  // Title (max 80 characters on eBay)
  if (listingData.title) {
    const truncatedTitle = truncateText(listingData.title, 80)
    if (truncatedTitle !== listingData.title) {
      console.log('⚠️ Title truncated from', listingData.title.length, 'to 80 characters')
      console.log('Original:', listingData.title)
      console.log('Truncated:', truncatedTitle)
    }
    sessionData.title = truncatedTitle
  }
  
  // Category
  if (listingData.category && EBAY_CATEGORY_MAP[listingData.category]) {
    sessionData.categoryId = EBAY_CATEGORY_MAP[listingData.category]
  }
  
  // Description
  if (listingData.description) {
    sessionData.description = formatDescription(listingData.description)
  }
  
  // Price
  if (listingData.suggestedPrice) {
    sessionData.price = formatPrice(listingData.suggestedPrice)
  }
  
  // Condition
  if (listingData.condition && EBAY_CONDITION_MAP[listingData.condition]) {
    sessionData.condition = EBAY_CONDITION_MAP[listingData.condition]
  }

  // For now, we'll use the basic sell hub URL
  // eBay requires authentication to pre-fill forms, so we'll provide
  // instructions to the user on how to use the data
  const finalUrl = baseUrl
  
  // Store the data in a format the user can easily copy
  console.log('🛒 eBay Listing Data:', sessionData)
  console.log('📋 Ready to paste into eBay listing form')
  
  // We'll enhance the UI to show copy-paste instructions
  return {
    url: finalUrl,
    data: sessionData,
    instructions: true
  }
}

/**
 * Validate listing data for eBay requirements
 * Note: We auto-truncate long titles rather than reject them
 */
export const validateEbayListing = (listingData) => {
  const errors = []
  
  if (!listingData.title || listingData.title.trim().length < 5) {
    errors.push('Title must be at least 5 characters long')
  }
  
  // Remove the check for title being too long - we'll auto-truncate instead
  // This provides better UX than throwing an error
  
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
 * Now uses full API integration if authenticated, falls back to URL method
 */
export const postToEbay = async (listingData, images = []) => {
  console.log('🚀 Starting eBay integration process...')
  
  // Import auth check dynamically to avoid circular dependencies
  const { isEbayAuthenticated } = await import('./ebayAuthService')
  const isAuthenticated = isEbayAuthenticated()
  
  // Validate the listing data
  const validation = validateEbayListing(listingData)
  if (!validation.isValid) {
    console.error('❌ Validation failed:', validation.errors)
    throw new Error(`Listing validation failed: ${validation.errors.join(', ')}`)
  }
  
  try {
    // Check if user is authenticated with eBay
    if (isAuthenticated && images.length > 0) {
      console.log('🔐 User authenticated, using API integration...')
      
      // Use the full API integration
      const { createEbayListing } = await import('./ebayApiService')
      const result = await createEbayListing(listingData, images.map(img => img.file))
      
      if (result.success) {
        // Only open real listings in a new tab, not demo ones
        if (!result.isDemo) {
          window.open(result.listingUrl, '_blank', 'noopener,noreferrer')
        }
        
        return {
          success: true,
          listingId: result.listingId,
          url: result.listingUrl,
          message: 'eBay listing created successfully!',
          method: 'api'
        }
      } else {
        throw new Error(result.error || 'Failed to create eBay listing')
      }
    } else {
      console.log('📋 Using URL method (not authenticated)...')
      
      // Fall back to URL method
      const ebayResult = buildEbayListingUrl(listingData, images)
      
      if (ebayResult.instructions) {
        // Copy the title to clipboard for easy pasting
        if (navigator.clipboard && ebayResult.data.title) {
          navigator.clipboard.writeText(ebayResult.data.title)
            .then(() => console.log('✅ Title copied to clipboard'))
            .catch(err => console.log('❌ Failed to copy title:', err))
        }
        
        // Open eBay in a new tab/window
        window.open(ebayResult.url, '_blank', 'noopener,noreferrer')
        
        return {
          success: true,
          url: ebayResult.url,
          data: ebayResult.data,
          message: 'Please authenticate with eBay for automatic listing creation',
          instructions: true,
          method: 'url'
        }
      }
    }
    
  } catch (error) {
    console.error('❌ eBay integration failed:', error)
    throw error
  }
}

// Export category and condition maps for reference
export { EBAY_CATEGORY_MAP, EBAY_CONDITION_MAP }