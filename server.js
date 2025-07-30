import express from 'express'
import cors from 'cors'
import 'dotenv/config'

const app = express()
const PORT = 3001

// Middleware
app.use(cors())
app.use(express.json({ limit: '10mb' }))

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'Server is running', timestamp: new Date().toISOString() })
})

// Claude Vision API proxy endpoint
app.post('/api/analyze-image', async (req, res) => {
  try {
    const { imageData, mediaType } = req.body
    
    if (!imageData) {
      return res.status(400).json({ error: 'No image data provided' })
    }

    const apiKey = process.env.VITE_ANTHROPIC_API_KEY
    if (!apiKey) {
      return res.status(500).json({ error: 'Anthropic API key not configured on server' })
    }

    console.log('🤖 Proxying request to Claude Vision API...')

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
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('Claude API Error:', error)
      return res.status(response.status).json({ 
        error: error.error?.message || 'Claude API error',
        details: error 
      })
    }

    const data = await response.json()
    const content = data.content[0]?.text

    if (!content) {
      return res.status(500).json({ error: 'No response from Claude' })
    }

    // Try to parse JSON response
    try {
      const parsed = JSON.parse(content)
      console.log('✅ Successfully analyzed image with Claude')
      res.json({ success: true, data: parsed })
    } catch (parseError) {
      console.log('⚠️ JSON parsing failed, using fallback')
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
      })
    }

  } catch (error) {
    console.error('Server Error:', error)
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    })
  }
})

app.listen(PORT, () => {
  console.log(`🚀 AI Photo to eBay server running on http://localhost:${PORT}`)
  console.log(`🔍 Health check: http://localhost:${PORT}/health`)
  console.log(`🤖 API endpoint: http://localhost:${PORT}/api/analyze-image`)
})