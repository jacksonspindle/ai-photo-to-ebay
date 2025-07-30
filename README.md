# 📸 Photo to eBay - AI Listing Generator

A mobile-first web app that uses AI vision models to automatically generate eBay listings from uploaded photos.

## Features

- **Mobile-Optimized**: Designed for smartphone use with touch-friendly interfaces
- **AI-Powered**: Uses OpenAI GPT-4o or Anthropic Claude Vision APIs
- **Camera Integration**: Direct camera capture or photo upload
- **Smart Analysis**: Generates title, description, category, and price estimates
- **Editable Results**: Edit AI-generated content before posting
- **Multiple Platforms**: Placeholder integrations for eBay, Facebook, Instagram
- **PWA Ready**: Install as a mobile app

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure AI APIs:**
   ```bash
   cp .env.example .env
   # Edit .env and add your API keys
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

4. **Open in browser:**
   Navigate to `http://localhost:5173`

## AI API Configuration

Choose one or both AI providers:

### OpenAI GPT-4o Vision
- Get API key: https://platform.openai.com/api-keys
- Add to `.env`: `VITE_OPENAI_API_KEY=your_key_here`

### Anthropic Claude Vision
- Get API key: https://console.anthropic.com/
- Add to `.env`: `VITE_ANTHROPIC_API_KEY=your_key_here`

## Usage

1. **Upload Photo**: Take a photo or select from gallery
2. **AI Analysis**: Click "Generate Listing" to analyze with AI
3. **Review & Edit**: Modify the generated listing details
4. **Export**: Use integration buttons or copy/share listing

## Tech Stack

- **Frontend**: React 18 + Vite
- **Styling**: Tailwind CSS with mobile-first design
- **Upload**: React Dropzone with camera support
- **AI Integration**: OpenAI + Anthropic APIs
- **PWA**: Manifest and mobile app features

## Project Structure

```
src/
├── components/          # React components
│   ├── PhotoUpload.jsx     # Camera/upload interface
│   ├── ListingPreview.jsx  # Generated listing display
│   └── IntegrationButtons.jsx # Export/share buttons
├── services/
│   └── aiService.js        # AI API integrations
└── App.jsx             # Main app component
```

## Mobile Features

- Touch-optimized UI (44px+ touch targets)
- Camera access with front/back toggle
- Haptic feedback simulation
- PWA installation support
- Safe area handling for notched devices
- Responsive design (mobile → tablet → desktop)

## Roadmap

- [ ] Real eBay API integration
- [ ] Facebook Marketplace API
- [ ] Instagram Shopping integration  
- [ ] Batch photo processing
- [ ] Price history and trends
- [ ] OCR for text detection
- [ ] Multi-language support

## License

MIT
