import { useState, useEffect } from 'react'
import { postToEbay } from '../services/ebayService'
import { isEbayAuthenticated, getEbayAuthUrl } from '../services/ebayAuthService'

export default function ListingPreview({ listingData, isLoading, onUpdate, uploadedImage, uploadedImages = [], showIntegrationButtons = false }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState(listingData || {})
  const [isPostingToEbay, setIsPostingToEbay] = useState(false)
  const [isEbayConnected, setIsEbayConnected] = useState(false)

  useEffect(() => {
    // Check eBay authentication status
    setIsEbayConnected(isEbayAuthenticated())
  }, [])

  const handleEdit = () => {
    setEditData(listingData)
    setIsEditing(true)
  }

  const handleSave = () => {
    onUpdate(editData)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditData(listingData)
    setIsEditing(false)
  }

  const handlePostToEbay = async () => {
    try {
      // Check if authenticated first
      if (!isEbayConnected) {
        alert('Please connect your eBay account first by clicking "Connect eBay Account"')
        return
      }
      
      setIsPostingToEbay(true)
      
      // Use the current listing data (either original or edited)
      const dataToPost = isEditing ? editData : listingData
      
      // Post to eBay with images
      const result = await postToEbay(dataToPost, uploadedImages)
      
      console.log('✅ Successfully posted to eBay:', result)
      
      // Show different messages based on method used
      if (result.method === 'api') {
        // Successfully created via API
        const message = `🎉 eBay listing created successfully!\n\n` +
          `Your listing is now live on eBay.\n` +
          `Listing ID: ${result.listingId}\n\n` +
          `The listing page will open in a new tab.`
        
        alert(message)
        
        // Open the listing
        if (result.listingUrl) {
          window.open(result.listingUrl, '_blank')
        }
      } else if (result.instructions && result.data) {
        // URL method - suggest connecting eBay account
        const message = `✅ eBay opened! Title copied to clipboard.\n\n` +
          `📋 Quick Copy Guide:\n` +
          `1. Title is already in your clipboard - just paste!\n` +
          `2. Price: ${result.data.price}\n` +
          `3. Description: ${result.data.description.substring(0, 100)}...\n\n` +
          `💡 Connect your eBay account for automatic listing creation!`
        
        alert(message)
      }
      
    } catch (error) {
      console.error('❌ Failed to post to eBay:', error)
      
      // Show error message to user
      alert(`Failed to post to eBay: ${error.message}`)
      
    } finally {
      setIsPostingToEbay(false)
    }
  }

  const handleConnectEbay = () => {
    try {
      const authUrl = getEbayAuthUrl()
      // Real eBay OAuth flow
      window.location.href = authUrl
    } catch (error) {
      console.error('Failed to get eBay auth URL:', error)
      alert('Failed to connect to eBay. Please check configuration.')
    }
  }

  const handleSetupEbayAccount = async () => {
    try {
      const token = localStorage.getItem('ebay_access_token')
      if (!token) {
        alert('Please connect to eBay first')
        return
      }

      // Get API base URL
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
        (import.meta.env.DEV ? 'http://localhost:3001' : '')

      const response = await fetch(`${API_BASE_URL}/api/setup-ebay-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token })
      })

      if (response.ok) {
        const result = await response.json()
        console.log('eBay account setup result:', result)
        
        const setupSummary = []
        if (result.results.inventoryLocation) setupSummary.push('✅ Inventory Location')
        if (result.results.paymentPolicy) setupSummary.push('✅ Payment Policy')
        if (result.results.fulfillmentPolicy) setupSummary.push('✅ Fulfillment Policy')
        if (result.results.returnPolicy) setupSummary.push('✅ Return Policy')
        
        const errorCount = result.results.errors.length
        const message = `eBay Account Setup Complete!\n\n${setupSummary.join('\n')}\n\n` +
          (errorCount > 0 ? `⚠️ ${errorCount} warnings (check console)` : '🎉 All policies configured!')
        
        alert(message)
      } else {
        const error = await response.json()
        alert(`Setup failed: ${error.message}`)
      }
    } catch (error) {
      console.error('Setup error:', error)
      alert(`Setup failed: ${error.message}`)
    }
  }

  if (isLoading) {
    return (
      <div className="glass-card p-4 flex flex-col h-full justify-center">
        <div className="flex items-center justify-center py-4">
          <div className="text-center">
            <div className="mb-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-r from-blue-500/20 to-purple-600/20 flex items-center justify-center">
                <svg className="animate-spin w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">
              AI is analyzing your photo...
            </h3>
            <p className="text-slate-300">
              Identifying item and generating listing details
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (!listingData) return null

  return (
    <div className="glass-card p-4 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gradient">
          Generated Listing
        </h2>
        {!isEditing && (
          <button
            onClick={handleEdit}
            className="p-3 text-blue-400 hover:bg-blue-500/10 rounded-xl transition-all duration-300 haptic-light border border-blue-400/20 hover:border-blue-400/40"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-4">
          {/* Edit Title */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Title
            </label>
            <input
              type="text"
              value={editData.title || ''}
              onChange={(e) => setEditData({...editData, title: e.target.value})}
              className="input-field w-full"
              placeholder="Product title..."
            />
          </div>

          {/* Edit Category */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Category
            </label>
            <select
              value={editData.category || ''}
              onChange={(e) => setEditData({...editData, category: e.target.value})}
              className="input-field w-full"
            >
              <option value="">Select category...</option>
              <option value="Electronics">Electronics</option>
              <option value="Clothing">Clothing</option>
              <option value="Home & Garden">Home & Garden</option>
              <option value="Sports">Sports</option>
              <option value="Toys">Toys</option>
              <option value="Books">Books</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Edit Price */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Suggested Price
            </label>
            <input
              type="text"
              value={editData.suggestedPrice || ''}
              onChange={(e) => setEditData({...editData, suggestedPrice: e.target.value})}
              className="input-field w-full"
              placeholder="$0.00"
            />
          </div>

          {/* Edit Description */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Description
            </label>
            <textarea
              value={editData.description || ''}
              onChange={(e) => setEditData({...editData, description: e.target.value})}
              rows={4}
              className="input-field w-full resize-none"
              placeholder="Product description..."
            />
            <p className="text-xs text-slate-400 mt-2">
              {editData.description?.length || 0}/500 characters
            </p>
          </div>

          {/* Edit Buttons */}
          <div className="flex space-x-4 pt-4">
            <button
              onClick={handleSave}
              className="flex-1 btn btn-primary haptic-medium"
            >
              <span className="font-semibold">Save Changes</span>
            </button>
            <button
              onClick={handleCancel}
              className="flex-1 btn btn-secondary haptic-light"
            >
              <span className="font-semibold">Cancel</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4 flex-1 flex flex-col">
          {/* Listing Display with Darker Background */}
          <div className="bg-black/30 backdrop-blur-sm border border-white/10 rounded-2xl p-4 flex-1">
            {/* Image Thumbnail and Title */}
            <div className="flex space-x-4 mb-4">
              {/* Product Image Thumbnail */}
              {uploadedImage && (
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 rounded-lg border border-white/10 bg-white/5 p-1">
                    <img
                      src={uploadedImage.preview}
                      alt="Product thumbnail"
                      className="w-full h-full object-contain rounded-md"
                    />
                  </div>
                </div>
              )}
              
              {/* Title and Details */}
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-white mb-2 leading-tight">
                  {listingData.title}
                </h3>
                <div className="flex items-center space-x-3">
                  <span className="bg-gradient-to-r from-blue-500/20 to-purple-600/20 text-blue-300 px-2 py-1 rounded-full text-xs font-medium border border-blue-400/30">
                    {listingData.category}
                  </span>
                  <span className="text-lg font-bold text-gradient-accent">
                    {listingData.suggestedPrice}
                  </span>
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <h4 className="text-xs font-semibold text-slate-300 mb-2">Description</h4>
              <p className="text-slate-200 text-sm leading-relaxed">
                {listingData.description}
              </p>
            </div>
          </div>

          {/* Marketplace Buttons - Only show when requested */}
          {showIntegrationButtons && (
            <div>
              <h3 className="text-sm font-semibold text-gradient mb-3">
                Post to Marketplace
              </h3>
              
              <div className="grid grid-cols-1 gap-2">
                {/* eBay Connect Button (when not authenticated) */}
                {!isEbayConnected && (
                  <button
                    onClick={handleConnectEbay}
                    className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-medium rounded-xl haptic-medium flex items-center justify-center space-x-2 transition-all duration-200"
                  >
                    <span>🔗</span>
                    <span>Connect eBay Account</span>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </button>
                )}

                {/* eBay Account Setup Button - shown when connected but getting permission errors */}
                {isEbayConnected && (
                  <button
                    onClick={handleSetupEbayAccount}
                    className="w-full py-2 px-4 bg-yellow-600 hover:bg-yellow-700 active:bg-yellow-800 text-white text-xs font-medium rounded-xl haptic-medium flex items-center justify-center space-x-2 transition-all duration-200"
                  >
                    <span>⚙️</span>
                    <span>Setup eBay Account</span>
                  </button>
                )}

                {/* eBay Post Button */}
                <button
                  onClick={handlePostToEbay}
                  disabled={isPostingToEbay || !isEbayConnected}
                  className={`w-full py-2.5 px-4 text-sm font-medium rounded-xl haptic-medium flex items-center justify-center space-x-2 transition-all duration-200 ${
                    isEbayConnected
                      ? isPostingToEbay 
                        ? 'bg-yellow-300 cursor-not-allowed text-black' 
                        : 'bg-yellow-400 hover:bg-yellow-500 active:bg-yellow-600 text-black'
                      : 'bg-gray-300 cursor-not-allowed text-gray-600 opacity-50'
                  }`}
                >
                  {isPostingToEbay ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>{isEbayConnected ? 'Creating listing...' : 'Opening eBay...'}</span>
                    </>
                  ) : (
                    <>
                      <span>🛒</span>
                      <span>{isEbayConnected ? 'Create eBay Listing' : 'Post to eBay (Manual)'}</span>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </>
                  )}
                </button>

                {/* Facebook Marketplace Button */}
                <button
                  onClick={() => {
                    alert(`Facebook Marketplace Integration Coming Soon!\n\nListing Data:\n${JSON.stringify(listingData, null, 2)}`)
                  }}
                  className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-medium rounded-xl haptic-medium flex items-center justify-center space-x-2 transition-all duration-200"
                >
                  <span>📘</span>
                  <span>Post to Facebook</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </button>

                {/* Instagram Shop Button */}
                <button
                  onClick={() => {
                    alert(`Instagram Shop Integration Coming Soon!\n\nListing Data:\n${JSON.stringify(listingData, null, 2)}`)
                  }}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-sm font-medium rounded-xl haptic-medium flex items-center justify-center space-x-2 transition-all duration-200"
                >
                  <span>📷</span>
                  <span>Post to Instagram</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </button>
              </div>

              {/* eBay Connection Status */}
              <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start">
                  <svg className="w-4 h-4 text-amber-600 mt-0.5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs text-amber-700">
                    {isEbayConnected 
                      ? '✨ eBay account connected! Click "Create eBay Listing" to publish.'
                      : '📋 Connect your eBay account to enable automatic listing creation.'
                    }
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* AI Confidence Indicator */}
          {!showIntegrationButtons && (
            <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-400/30 rounded-2xl p-3 backdrop-blur-sm">
              <div className="flex items-center mb-2">
                <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center mr-3">
                  <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-sm font-semibold text-green-300">
                  AI Analysis Complete
                </span>
              </div>
              <p className="text-xs text-green-200/80 ml-9">
                Review the details above and edit if needed before posting
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}