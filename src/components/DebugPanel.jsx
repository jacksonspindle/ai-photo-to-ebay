import { useState, useEffect } from 'react'
import { testAIConnection } from '../services/aiService'

export default function DebugPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const [apiStatus, setApiStatus] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  const checkAPIStatus = async () => {
    setIsLoading(true)
    try {
      const status = await testAIConnection()
      setApiStatus(status)
    } catch (error) {
      console.error('Failed to check API status:', error)
    }
    setIsLoading(false)
  }

  useEffect(() => {
    if (isOpen && !apiStatus) {
      checkAPIStatus()
    }
  }, [isOpen])

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 left-6 bg-white/10 backdrop-blur-md text-white p-3 rounded-2xl shadow-lg z-50 opacity-50 hover:opacity-100 transition-all duration-300 border border-white/20 hover:border-white/40"
        title="Debug Panel"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.349 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.349a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.349 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.349a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>
    )
  }

  return (
    <div className="fixed bottom-6 left-6 glass-card p-5 max-w-sm z-50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-white">Debug Panel</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-slate-400 hover:text-white transition-colors duration-200"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">AI API Status</h4>
          {isLoading ? (
            <div className="flex items-center text-sm text-gray-500">
              <svg className="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Checking...
            </div>
          ) : apiStatus ? (
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span>OpenAI:</span>
                <span className={`px-2 py-1 rounded text-xs ${
                  apiStatus.openai.configured 
                    ? 'bg-green-100 text-green-800' 
                    : apiStatus.openai.available 
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                }`}>
                  {apiStatus.openai.configured 
                    ? 'Configured' 
                    : apiStatus.openai.available 
                      ? 'Key Present' 
                      : 'Not Set'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Claude:</span>
                <span className={`px-2 py-1 rounded text-xs ${
                  apiStatus.claude.configured 
                    ? 'bg-green-100 text-green-800' 
                    : apiStatus.claude.available 
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                }`}>
                  {apiStatus.claude.configured 
                    ? 'Configured' 
                    : apiStatus.claude.available 
                      ? 'Key Present' 
                      : 'Not Set'}
                </span>
              </div>
            </div>
          ) : (
            <button
              onClick={checkAPIStatus}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Check API Status
            </button>
          )}
        </div>

        <div className="border-t pt-3">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Quick Setup</h4>
          <div className="text-xs text-gray-600 space-y-1">
            <p>1. Get API key from:</p>
            <ul className="ml-2 space-y-1">
              <li>• <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">OpenAI Platform</a></li>
              <li>• <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Anthropic Console</a></li>
            </ul>
            <p className="mt-2">2. Add to .env file:</p>
            <code className="block bg-gray-100 p-2 rounded text-xs mt-1">
              VITE_OPENAI_API_KEY=sk-...{'\n'}
              VITE_ANTHROPIC_API_KEY=sk-ant-...
            </code>
            <p className="mt-2">3. Restart dev server</p>
          </div>
        </div>

        <button
          onClick={checkAPIStatus}
          className="w-full btn btn-primary text-sm py-2"
          disabled={isLoading}
        >
          {isLoading ? 'Checking...' : 'Refresh Status'}
        </button>
      </div>
    </div>
  )
}