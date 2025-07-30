import { useState } from 'react'
import PhotoUpload from './components/PhotoUpload'
import ListingPreview from './components/ListingPreview'
import DebugPanel from './components/DebugPanel'
import { analyzeImage } from './services/aiService'

function App() {
  const [uploadedImages, setUploadedImages] = useState([])
  const [listingData, setListingData] = useState(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  return (
    <div className="h-screen flex flex-col">
      {/* Glassmorphic header */}
      <header className="glass-header px-4 py-4 safe-area sticky top-0 z-40">
        <div className="max-w-md lg:max-w-7xl mx-auto">
          <div className="flex items-center justify-center space-x-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gradient">
              Photo to eBay
            </h1>
          </div>
          <p className="text-slate-300 text-center text-sm">
            AI-powered listing generator
          </p>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 px-4 py-4 max-w-7xl mx-auto flex flex-col">
        {/* Mobile Layout (default) */}
        <div className="lg:hidden space-y-6 max-w-md mx-auto">
          {/* Photo Upload Section */}
          <PhotoUpload 
            uploadedImages={uploadedImages}
            setUploadedImages={setUploadedImages}
            onAnalyze={async (imageData) => {
              setIsAnalyzing(true)
              try {
                const result = await analyzeImage(imageData.file)
                if (result.success) {
                  setListingData(result.data)
                } else {
                  console.error('AI Analysis failed:', result.error)
                  
                  // Check for specific error types
                  let errorTitle = "Analysis Failed - Edit Manually"
                  let errorDescription = "AI analysis encountered an error. Please fill in the details manually."
                  
                  if (result.error?.includes('quota') || result.error?.includes('billing')) {
                    errorTitle = "OpenAI Quota Exceeded"
                    errorDescription = "Your OpenAI account has exceeded its quota. Please check your billing settings at platform.openai.com, or the app will try Claude API if available."
                  } else if (result.error?.includes('rate limit')) {
                    errorTitle = "Rate Limited - Try Again"
                    errorDescription = "API rate limit reached. Please wait a moment and try again."
                  } else if (result.error?.includes('unauthorized') || result.error?.includes('401')) {
                    errorTitle = "API Key Issue"
                    errorDescription = "There's an issue with your API key. Please check your .env file configuration."
                  }
                  
                  setListingData({
                    title: errorTitle,
                    description: errorDescription,
                    category: "Other",
                    suggestedPrice: "$0.00"
                  })
                }
              } catch (error) {
                console.error('Analysis error:', error)
                setListingData({
                  title: "Error Occurred - Edit Manually",
                  description: "Something went wrong during analysis. Please fill in the details manually.",
                  category: "Other",
                  suggestedPrice: "$0.00"
                })
              }
              setIsAnalyzing(false)
            }}
            isAnalyzing={isAnalyzing}
          />

          {/* Listing Preview Section with Integration Buttons */}
          {(listingData || isAnalyzing) && (
            <ListingPreview 
              listingData={listingData}
              isLoading={isAnalyzing}
              onUpdate={setListingData}
              uploadedImage={uploadedImages[0]}
              uploadedImages={uploadedImages}
              showIntegrationButtons={listingData && !isAnalyzing}
            />
          )}
        </div>

        {/* Desktop Layout */}
        <div className={`hidden lg:flex flex-col flex-1 ${uploadedImages.length === 0 && !listingData && !isAnalyzing ? 'max-w-2xl mx-auto' : ''}`}>
          {/* Step Indicator - Only show when there's content */}
          {(uploadedImages.length > 0 || listingData || isAnalyzing) && (
            <div className="glass-card p-2 mb-3">
              <div className="flex items-center justify-center">
                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${uploadedImages.length > 0 ? 'bg-green-500/20 text-green-400 border border-green-400/30' : 'bg-blue-500/20 text-blue-400 border border-blue-400/30'}`}>
                      {uploadedImages.length > 0 ? '✓' : '1'}
                    </div>
                    <span className="text-white text-sm font-medium">Upload Photo</span>
                  </div>
                  <div className="w-12 h-px bg-white/20"></div>
                  <div className="flex items-center space-x-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${listingData ? 'bg-green-500/20 text-green-400 border border-green-400/30' : isAnalyzing ? 'bg-blue-500/20 text-blue-400 border border-blue-400/30' : 'bg-slate-600/20 text-slate-400 border border-slate-400/30'}`}>
                      {listingData ? '✓' : '2'}
                    </div>
                    <span className="text-white text-sm font-medium">Generate Listing</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Two Column Layout - Only when content exists */}
          <div className={`${uploadedImages.length > 0 || listingData || isAnalyzing ? 'grid grid-cols-2 gap-6 flex-1' : ''}`}>
            {/* Left Column or Centered Content */}
            <div className="flex flex-col">
            <PhotoUpload 
              uploadedImages={uploadedImages}
              setUploadedImages={setUploadedImages}
              onAnalyze={async (imageData) => {
                setIsAnalyzing(true)
                try {
                  const result = await analyzeImage(imageData.file)
                  if (result.success) {
                    setListingData(result.data)
                  } else {
                    console.error('AI Analysis failed:', result.error)
                    
                    // Check for specific error types
                    let errorTitle = "Analysis Failed - Edit Manually"
                    let errorDescription = "AI analysis encountered an error. Please fill in the details manually."
                    
                    if (result.error?.includes('quota') || result.error?.includes('billing')) {
                      errorTitle = "OpenAI Quota Exceeded"
                      errorDescription = "Your OpenAI account has exceeded its quota. Please check your billing settings at platform.openai.com, or the app will try Claude API if available."
                    } else if (result.error?.includes('rate limit')) {
                      errorTitle = "Rate Limited - Try Again"
                      errorDescription = "API rate limit reached. Please wait a moment and try again."
                    } else if (result.error?.includes('unauthorized') || result.error?.includes('401')) {
                      errorTitle = "API Key Issue"
                      errorDescription = "There's an issue with your API key. Please check your .env file configuration."
                    }
                    
                    setListingData({
                      title: errorTitle,
                      description: errorDescription,
                      category: "Other",
                      suggestedPrice: "$0.00"
                    })
                  }
                } catch (error) {
                  console.error('Analysis error:', error)
                  setListingData({
                    title: "Error Occurred - Edit Manually",
                    description: "Something went wrong during analysis. Please fill in the details manually.",
                    category: "Other",
                    suggestedPrice: "$0.00"
                  })
                }
                setIsAnalyzing(false)
              }}
              isAnalyzing={isAnalyzing}
            />
          </div>

            {/* Right Column - Only show when there's listing content */}
            {(uploadedImages.length > 0 || listingData || isAnalyzing) && (
              <div className="flex flex-col">
                {/* Listing Preview Section with Integration Buttons */}
                {(listingData || isAnalyzing) && (
                  <ListingPreview 
                    listingData={listingData}
                    isLoading={isAnalyzing}
                    onUpdate={setListingData}
                    uploadedImage={uploadedImages[0]}
                    uploadedImages={uploadedImages}
                    showIntegrationButtons={listingData && !isAnalyzing}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Debug Panel - only show in development */}
      {import.meta.env.DEV && <DebugPanel />}
    </div>
  )
}

export default App
