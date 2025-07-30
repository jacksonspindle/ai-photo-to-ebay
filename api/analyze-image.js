// Vercel serverless function to handle Claude Vision API requests
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { imageData, mediaType } = req.body;
    
    if (!imageData) {
      return res.status(400).json({ error: 'No image data provided' });
    }

    const apiKey = process.env.VITE_ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Anthropic API key not configured on server' });
    }

    console.log('🤖 Proxying request to Claude Vision API...');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 800,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `You are an expert eBay listing creator. Analyze this image and create a compelling eBay listing.

IMPORTANT: Respond ONLY with a valid JSON object in this exact format:
{
  "title": "SEO-optimized product title (max 80 chars)",
  "description": "Detailed product description highlighting key features, condition, and selling points (2-4 sentences)",
  "category": "Electronics|Clothing|Home & Garden|Sports|Toys|Books|Other",
  "suggestedPrice": "$XX.XX",
  "condition": "New|Used - Like New|Used - Good|Used - Fair|For Parts",
  "keywords": ["brand", "model", "type", "key", "features"]
}

Guidelines:
- Be specific about brand, model, size, color when visible
- Include condition assessment based on visual appearance
- Price should reflect current market value
- Title should be searchable and compelling
- Keywords should help with eBay search visibility
- If unsure about something, make reasonable estimates based on what you can see`
              },
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType,
                  data: imageData
                }
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Claude API Error:', error);
      return res.status(response.status).json({ 
        error: error.error?.message || 'Claude API error',
        details: error 
      });
    }

    const data = await response.json();
    const content = data.content[0]?.text;

    if (!content) {
      return res.status(500).json({ error: 'No response from Claude' });
    }

    // Try to parse JSON response
    try {
      const parsed = JSON.parse(content);
      console.log('✅ Successfully analyzed image with Claude');
      res.json({ success: true, data: parsed });
    } catch (parseError) {
      console.log('⚠️ JSON parsing failed, using fallback');
      res.json({
        success: true,
        data: {
          title: "AI-Identified Product",
          description: content.substring(0, 200) + "...",
          category: "Other",
          suggestedPrice: "$25.00",
          condition: "Used - Good",
          keywords: ["item", "product"]
        }
      });
    }

  } catch (error) {
    console.error('Server Error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}