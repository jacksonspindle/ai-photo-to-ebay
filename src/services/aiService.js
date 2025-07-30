const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

// Convert image file to base64
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => {
      // Remove the data:image/...;base64, prefix
      const base64 = reader.result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = error => reject(error)
  })
}

// OpenAI GPT-4 Vision API integration
export const analyzeImageWithOpenAI = async (imageFile) => {
  try {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY
    console.log('OpenAI API key check:', { hasKey: !!apiKey, keyPrefix: apiKey?.substring(0, 15) })
    
    if (!apiKey) {
      throw new Error('OpenAI API key not configured')
    }

    console.log('Converting image to base64...', { fileName: imageFile.name, size: imageFile.size })
    const base64Image = await fileToBase64(imageFile)
    console.log('Image converted, making API call...', { base64Length: base64Image.length })
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // More accessible model
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
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        max_tokens: 500,
        temperature: 0.3
      })
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('OpenAI API Error Details:', {
        status: response.status,
        statusText: response.statusText,
        error: error
      })
      throw new Error(error.error?.message || `OpenAI API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content

    if (!content) {
      throw new Error('No response from OpenAI')
    }

    // Try to parse JSON response
    try {
      const parsed = JSON.parse(content)
      return {
        success: true,
        data: parsed
      }
    } catch (parseError) {
      // If JSON parsing fails, extract info manually
      return {
        success: true,
        data: {
          title: "AI-Identified Product",
          description: content.substring(0, 200) + "...",
          category: "Other",
          suggestedPrice: "$25.00",
          condition: "Used - Good",
          keywords: ["item", "product"]
        }
      }
    }

  } catch (error) {
    console.error('OpenAI API Error:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// Anthropic Claude Vision API integration via backend proxy
export const analyzeImageWithClaude = async (imageFile) => {
  try {
    console.log('Converting image to base64...', { fileName: imageFile.name, size: imageFile.size })
    const base64Image = await fileToBase64(imageFile)
    const mediaType = imageFile.type
    console.log('Image converted, calling backend proxy...', { mediaType, base64Length: base64Image.length })

    const response = await fetch('http://localhost:3001/api/analyze-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageData: base64Image,
        mediaType: mediaType
      })
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('Backend API Error Details:', {
        status: response.status,
        statusText: response.statusText,
        error: error
      })
      throw new Error(error.error || `Backend API error: ${response.status} ${response.statusText}`)
    }

    const result = await response.json()
    console.log('✅ Backend proxy response:', result)
    
    return result

  } catch (error) {
    console.error('Claude API Error:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// Main function - using Claude via backend proxy
export const analyzeImage = async (imageFile) => {
  console.log('🔍 Analyzing image with Claude via backend proxy...')

  // Try Claude via backend proxy
  console.log('🤖 Using Claude Vision API via backend...')
  const result = await analyzeImageWithClaude(imageFile)
  console.log('Claude result:', result)
  
  if (result.success) {
    return result
  } else {
    console.log('❌ Claude failed:', result.error)
  }

  // If no API keys or all failed, return demo data
  console.log('No AI API keys configured, using demo data...')
  
  // Generate different demo data based on image file name or random selection
  const demoProducts = [
    {
      title: "Apple iPhone - Demo Mode (Configure API Keys)",
      description: "This is demo data showing how AI would analyze your photo. The real AI would identify the specific model, condition, and generate accurate pricing. Add your API keys to enable real analysis.",
      category: "Electronics",
      suggestedPrice: "$299.99",
      condition: "Used - Good",
      keywords: ["iphone", "apple", "smartphone", "demo", "unlocked"]
    },
    {
      title: "Nike Running Shoes - Demo Mode (Configure API Keys)", 
      description: "Demo listing showing AI capabilities. Real analysis would identify brand, size, model, and condition from your photo. Set up OpenAI or Claude API keys for actual functionality.",
      category: "Clothing",
      suggestedPrice: "$45.00",
      condition: "Used - Like New",
      keywords: ["nike", "running", "shoes", "demo", "athletic"]
    },
    {
      title: "Vintage Book Collection - Demo Mode (Configure API Keys)",
      description: "Sample AI-generated listing. The actual service would read book titles, assess condition, and suggest competitive pricing based on your uploaded photo.",
      category: "Books", 
      suggestedPrice: "$25.00",
      condition: "Used - Good",
      keywords: ["books", "vintage", "collection", "demo", "literature"]
    }
  ]
  
  // Randomly select a demo product
  const randomProduct = demoProducts[Math.floor(Math.random() * demoProducts.length)]
  
  return {
    success: true,
    data: randomProduct
  }
}

// Test function to validate API connectivity
export const testAIConnection = async () => {
  const claudeKey = import.meta.env.VITE_ANTHROPIC_API_KEY
  const openaiKey = import.meta.env.VITE_OPENAI_API_KEY
  
  console.log('🔍 Environment check:', {
    claudeKey: claudeKey ? `${claudeKey.substring(0, 15)}...` : 'NOT SET',
    openaiKey: openaiKey ? `${openaiKey.substring(0, 15)}...` : 'NOT SET'
  })
  
  const results = {
    claude: {
      available: !!claudeKey,
      configured: claudeKey ? claudeKey.startsWith('sk-ant-') : false,
      keyLength: claudeKey?.length || 0
    },
    openai: {
      available: !!openaiKey,
      configured: openaiKey ? openaiKey.startsWith('sk-') : false,
      keyLength: openaiKey?.length || 0
    }
  }
  
  console.log('AI API Configuration:', results)
  return results
}

// Simple test function to check API connectivity without vision
export const testBasicAI = async () => {
  const openaiKey = import.meta.env.VITE_OPENAI_API_KEY
  
  if (!openaiKey) {
    return { success: false, error: 'No OpenAI key' }
  }
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Say "API test successful"' }],
        max_tokens: 10
      })
    })
    
    if (!response.ok) {
      const error = await response.json()
      return { success: false, error: error.error?.message || 'API error', status: response.status }
    }
    
    const data = await response.json()
    return { success: true, response: data.choices[0]?.message?.content }
    
  } catch (error) {
    return { success: false, error: error.message }
  }
}