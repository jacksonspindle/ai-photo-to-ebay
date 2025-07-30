import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { exchangeCodeForToken } from '../services/ebayAuthService'

export default function EbayCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState('processing')
  const [error, setError] = useState(null)

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code')
      const error = searchParams.get('error')

      if (error) {
        setStatus('error')
        setError(`eBay authorization failed: ${error}`)
        return
      }

      if (!code) {
        setStatus('error')
        setError('No authorization code received from eBay')
        return
      }

      try {
        console.log('🔐 Exchanging code for token...')
        const result = await exchangeCodeForToken(code)

        if (result.success) {
          setStatus('success')
          console.log('✅ Successfully authenticated with eBay!')
          
          // Redirect back to main app after a short delay
          setTimeout(() => {
            navigate('/')
          }, 2000)
        } else {
          setStatus('error')
          setError(result.error || 'Failed to authenticate with eBay')
        }
      } catch (err) {
        setStatus('error')
        setError(err.message || 'An unexpected error occurred')
      }
    }

    handleCallback()
  }, [searchParams, navigate])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 flex items-center justify-center p-4">
      <div className="glass-card p-8 max-w-md w-full text-center">
        {status === 'processing' && (
          <>
            <div className="mb-6">
              <svg className="animate-spin w-16 h-16 mx-auto text-blue-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Connecting to eBay...</h2>
            <p className="text-slate-300">Please wait while we complete the authentication</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="mb-6">
              <div className="w-16 h-16 mx-auto rounded-full bg-green-500/20 flex items-center justify-center">
                <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Success!</h2>
            <p className="text-slate-300">Your eBay account has been connected</p>
            <p className="text-sm text-slate-400 mt-2">Redirecting you back to the app...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="mb-6">
              <div className="w-16 h-16 mx-auto rounded-full bg-red-500/20 flex items-center justify-center">
                <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Authentication Failed</h2>
            <p className="text-red-300 mb-4">{error}</p>
            <button
              onClick={() => navigate('/')}
              className="btn btn-primary"
            >
              Return to App
            </button>
          </>
        )}
      </div>
    </div>
  )
}