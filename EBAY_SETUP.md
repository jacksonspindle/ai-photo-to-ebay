# eBay Developer Setup Guide

This guide will help you configure your eBay developer credentials to enable real eBay listing creation.

## 1. Get eBay Developer Credentials

1. **Visit eBay Developer Program**: Go to [https://developer.ebay.com/](https://developer.ebay.com/)

2. **Create Developer Account**: Sign up or log in with your eBay account

3. **Create an Application**:
   - Go to "My Account" → "Keys"
   - Click "Create New Keyset" 
   - Choose "Production" for live listings or "Sandbox" for testing
   - Fill in application details:
     - **Application Title**: "AI Photo to eBay Listing Generator"
     - **Application Description**: "Web app that uses AI to generate eBay listings from photos"

4. **Configure OAuth Settings**:
   - **Redirect URL**: `http://localhost:5174/ebay-callback` (for development)
   - **Redirect URL**: `https://your-vercel-app.vercel.app/ebay-callback` (for production)
   - **Scopes**: Select these required scopes:
     - `https://api.ebay.com/oauth/api_scope`
     - `https://api.ebay.com/oauth/api_scope/sell.inventory`
     - `https://api.ebay.com/oauth/api_scope/sell.account`
     - `https://api.ebay.com/oauth/api_scope/sell.fulfillment`

5. **Get Your Credentials**: After approval, you'll receive:
   - **Client ID** (App ID)
   - **Client Secret** (Dev ID) 
   - **Redirect URI**

## 2. Configure Environment Variables

Add your eBay credentials to your `.env` file:

```bash
# eBay Developer Credentials
VITE_EBAY_CLIENT_ID=your_actual_client_id_here
VITE_EBAY_CLIENT_SECRET=your_actual_client_secret_here
VITE_EBAY_SANDBOX=true  # Set to false for production

# For Vercel deployment, also add:
VITE_API_BASE_URL=https://your-vercel-app.vercel.app
```

## 3. Vercel Environment Variables

When deploying to Vercel, add these environment variables in your Vercel dashboard:

1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add these variables:

```
VITE_EBAY_CLIENT_ID=your_actual_client_id_here
VITE_EBAY_CLIENT_SECRET=your_actual_client_secret_here  
VITE_EBAY_SANDBOX=true
VITE_ANTHROPIC_API_KEY=your_claude_api_key
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

## 4. Test the Integration

### Development Testing:
1. Start your development servers:
   ```bash
   npm run dev        # Frontend (port 5174)
   node server.js     # Backend (port 3001)
   ```

2. Upload a photo and generate a listing
3. Click "Connect eBay Account" - should redirect to eBay
4. After authentication, click "Create eBay Listing"
5. Should create a real listing in eBay sandbox

### Production Testing:
1. Deploy to Vercel with environment variables set
2. Test the full flow on your live URL
3. Switch `VITE_EBAY_SANDBOX=false` when ready for production

## 5. eBay Sandbox vs Production

### Sandbox Mode (`VITE_EBAY_SANDBOX=true`):
- Safe testing environment
- No real listings created
- Use sandbox.ebay.com for testing
- Perfect for development and testing

### Production Mode (`VITE_EBAY_SANDBOX=false`):
- Creates real eBay listings
- Charges eBay fees
- Use only when fully tested
- Requires production eBay developer approval

## 6. Troubleshooting

### Common Issues:

**"eBay credentials not configured"**
- Ensure environment variables are set correctly
- Restart your development server after adding variables
- Check Vercel environment variables for production

**"Invalid redirect URI"**
- Make sure redirect URI in eBay developer console matches exactly
- Development: `http://localhost:5174/ebay-callback`
- Production: `https://your-app.vercel.app/ebay-callback`

**"Insufficient scope"**
- Ensure all required scopes are selected in eBay developer console
- Request new token if scopes were added after initial setup

**Token expired**
- The app handles token refresh automatically
- If issues persist, clear localStorage and re-authenticate

### Debug Tips:
- Check browser console for detailed error messages
- Monitor Network tab for API call failures
- Verify environment variables are loaded correctly

## 7. Going Live Checklist

Before switching to production:

- [ ] Test complete flow in sandbox mode
- [ ] Verify all listing data appears correctly on eBay
- [ ] Test image uploads and display
- [ ] Confirm pricing and category mapping
- [ ] Set up error monitoring
- [ ] Switch `VITE_EBAY_SANDBOX=false`
- [ ] Update redirect URI to production URL
- [ ] Test production authentication flow

## 8. Security Notes

- Never commit API keys to version control
- Use environment variables for all credentials
- Keep client secret secure on server-side only
- Regularly rotate API keys for security
- Monitor API usage for unusual activity

## Support

If you need help:
- eBay Developer Support: [https://developer.ebay.com/support](https://developer.ebay.com/support)
- eBay Developer Documentation: [https://developer.ebay.com/api-docs](https://developer.ebay.com/api-docs)