# eBay Account Setup Guide

This guide will help you resolve the category and shipping service errors you're encountering.

## Issues You're Experiencing

1. **Category Error**: "The category selected is not a leaf category"
2. **Shipping Service Error**: "Please add at least one valid shipping service option to your listing"

## Step-by-Step Resolution

### 1. Fix Category Issues

The error occurs because eBay requires **leaf categories** (specific subcategories) for listings. We've updated the code to use proper leaf categories:

- **Electronics**: `15032` (Cell Phone Accessories)
- **Clothing**: `15724` (Men's Shirts)  
- **Home & Garden**: `159912` (Plants, Seeds & Bulbs)
- **Sports**: `888` (Sports Memorabilia)
- **Toys**: `220` (Toys & Hobbies)
- **Books**: `267` (Books & Magazines)
- **Other**: `99` (Collectibles)

### 2. Fix Shipping Service Issues

The shipping service error occurs because your fulfillment policies don't have shipping services configured. Here's how to fix it:

#### Option A: Configure Fulfillment Policies (Recommended)

1. **Log into your eBay Developer Account**
   - Go to https://developer.ebay.com
   - Navigate to "My Account" > "Application Keys"

2. **Set up Business Policies**
   - In your eBay seller account, go to "Account" > "Site Preferences"
   - Look for "Business Policies" or "Shipping Policies"
   - Create a new fulfillment policy with shipping services

3. **Add Shipping Services to Your Policy**
   - Choose shipping services like:
     - USPS First Class Mail
     - USPS Priority Mail
     - UPS Ground
     - FedEx Ground

#### Option B: Use Trading API (Fallback)

The code now includes a fallback to the Trading API which handles shipping services differently. This should work even without configured fulfillment policies.

### 3. Test Your Setup

1. **Check Your eBay Account Status**
   ```bash
   # Test your token and account access
   curl -H "Authorization: Bearer YOUR_TOKEN" \
        "https://api.sandbox.ebay.com/sell/account/v1/fulfillment_policy?marketplace_id=EBAY_US"
   ```

2. **Verify Shipping Services**
   ```bash
   # Check available shipping services
   curl -H "Authorization: Bearer YOUR_TOKEN" \
        "https://api.sandbox.ebay.com/sell/account/v1/shipping_service?marketplace_id=EBAY_US"
   ```

### 4. Environment Variables

Make sure these are set in your `.env` file:

```env
VITE_EBAY_SANDBOX=true
VITE_EBAY_APP_ID=your_app_id
EBAY_DEV_ID=your_dev_id
EBAY_CERT_ID=your_cert_id
EBAY_CLIENT_SECRET=your_client_secret
```

### 5. Common Solutions

#### If you're still getting category errors:

1. **Use the Trading API approach** - The code now tries this first
2. **Check category IDs** - Make sure you're using the updated category mapping
3. **Test with a simple category** - Try "Other" (category 99) first

#### If you're still getting shipping service errors:

1. **Create a fulfillment policy** with shipping services in your eBay account
2. **Use the Trading API** - It handles shipping differently
3. **Check your eBay account permissions** - Make sure you have selling privileges

### 6. Debugging

The updated code includes better error logging. Check your browser console for:

- ✅ Successful image uploads
- ✅ Inventory item creation
- ✅ Offer creation
- ✅ Trading API fallback attempts
- ❌ Specific error messages

### 7. Alternative Approach

If you continue having issues with the Inventory API, the code now automatically falls back to the Trading API, which should work more reliably for basic listings.

## Next Steps

1. Try creating a listing again with the updated code
2. Check the browser console for detailed error messages
3. If issues persist, try the Trading API approach (it should happen automatically)
4. Consider setting up proper business policies in your eBay account for production use

## Support

If you're still experiencing issues:

1. Check the browser console for specific error messages
2. Verify your eBay account has proper selling permissions
3. Ensure your API credentials are correct
4. Try with a simple test listing first

The updated code should handle most common issues automatically, but proper eBay account configuration will provide the best experience.