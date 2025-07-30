import { useEffect, useState } from 'react'
import { exchangeCodeForToken } from '../services/ebayAuthService'

export default function EbayCallback() {
  const [status, setStatus] = useState('processing')
  const [message, setMessage] = useState('Processing eBay authentication...')

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the authorization code from URL
        const urlParams = new URLSearchParams(window.location.search)
        const code = urlParams.get('code')
        const error = urlParams.get('error')

        if (error) {
          setStatus('error')
          setMessage(`Authentication failed: ${error}`)
          return
        }

        if (!code) {
          setStatus('error')
          setMessage('No authorization code received from eBay')
          return
        }

        console.log('🔐 Exchanging eBay authorization code for token...')
        setMessage('Exchanging authorization code for access token...')

        // Exchange code for token
        const result = await exchangeCodeForToken(code)

        if (result.success) {
          setStatus('success')
          setMessage('✅ Successfully connected to eBay! Redirecting back to the app...')
          
          // Redirect back to main app after a short delay
          setTimeout(() => {
            window.location.href = '/'
          }, 2000)
        } else {
          setStatus('error')
          setMessage(`Authentication failed: ${result.error}`)
        }

      } catch (error) {
        console.error('Callback error:', error)
        setStatus('error')
        setMessage(`Unexpected error: ${error.message}`)
      }
    }

    handleCallback()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="glass-card p-8 max-w-md w-full text-center">
        <div className="mb-6">
          {status === 'processing' && (
            <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-r from-blue-500/20 to-purple-600/20 flex items-center justify-center mb-4">
              <svg className="animate-spin w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          )}
          
          {status === 'success' && (
            <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-r from-green-500/20 to-emerald-600/20 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
          
          {status === 'error' && (
            <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-r from-red-500/20 to-red-600/20 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          )}
        </div>

        <h1 className="text-xl font-semibold text-white mb-4">
          {status === 'processing' && 'Connecting to eBay...'}
          {status === 'success' && 'Connected Successfully!'}
          {status === 'error' && 'Connection Failed'}
        </h1>

        <p className="text-slate-300 text-sm leading-relaxed mb-6">
          {message}
        </p>

        {status === 'error' && (
          <button
            onClick={() => window.location.href = '/'}
            className="btn btn-primary w-full"
          >
            Return to App
          </button>
        )}
      </div>
    </div>
  )
}