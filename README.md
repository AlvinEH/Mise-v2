<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/440135db-da11-4166-aee8-bfb9df4e6c52

## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies:
   `npm install`
2. Run the app:
   `npm run dev`

## GitHub Pages Deployment

This project is configured for GitHub Pages deployment with automated CI/CD.

### Automatic Deployment
- Pushes to `main` or `master` branch automatically trigger deployment
- GitHub Actions builds and deploys to GitHub Pages
- Live site available at: `https://[username].github.io/Mise/`

### Manual Deployment
```bash
npm run deploy
```

### Setup Requirements
1. Enable GitHub Pages in your repository settings
2. Set source to "GitHub Actions"
3. Ensure you have the necessary repository permissions

## Using Recipe URL Extraction

To use the AI-powered recipe extraction feature:

1. **Get a free Gemini API key:**
   - Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
   - Click "Create API Key" 
   - Copy your API key

2. **Add the API key to Mise:**
   - Open the app and go to Settings
   - Find "API Configuration" section
   - Paste your API key and click "Save"
   - You can now extract recipes from URLs!
