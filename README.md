# VoiceForge AI 🎙️

**An offline mobile AI voice generator for content creators**

## 🎯 Quick Start

VoiceForge AI is a free, offline text-to-speech studio app that lets you:

- ✅ Convert text to natural voice instantly
- ✅ Choose from 10 diverse AI voices
- ✅ Work completely offline (no internet needed)
- ✅ Export ready-to-use audio files
- ✅ Perfect for YouTube creators, podcasters, and content producers

## 📋 Features

### Core Features (MVP - Phase 1)

- 🎤 **10 Selectable Voices** - Male, female, and diverse character voices
- 📝 **Text Input** - Up to 2,000 characters
- ⚙️ **Voice Controls** - Speed and pitch adjustment
- 🎵 **Audio Playback** - Built-in player with controls
- ⬇️ **Download Audio** - Export as WAV files
- 📤 **Share Audio** - Share to messaging apps
- 💾 **Generation History** - Track recent generations

### Upcoming Features (Phase 2-3)

- 🎨 **AI Voice Models** - Integrate Piper TTS for high-quality voices
- 🎵 **Background Music** - Add background tracks
- 📊 **Advanced Controls** - Emphasis, emotional tone
- 🌐 **Multi-language** - Support for multiple languages
- 📱 **Android APK** - Standalone mobile app

## 🛠 Tech Stack

### Frontend

- **HTML5** - Semantic markup
- **CSS3** - Modern styling with dark mode support
- **JavaScript (ES6+)** - Vanilla JS (no frameworks for minimal footprint)
- **Web Audio API** - Audio processing and synthesis
- **Web Speech API** - Native TTS engine

### Mobile

- **Capacitor** - Convert web app to Android/iOS APK
- **Cordova** - Mobile platform abstraction

### Future Audio Engine

- **Piper TTS** - Offline AI voice synthesis (WASM)
- **ONNX Runtime** - ML model execution
- **FFmpeg.wasm** - Audio format conversion

## 📁 Project Structure

```
VoiceMaster/
├── src/
│   ├── index.html           # Main HTML
│   ├── js/
│   │   ├── app.js           # Main app controller
│   │   ├── audio-engine.js  # Audio processing
│   │   ├── ui-controller.js # UI logic
│   │   └── utils.js         # Utilities
│   └── styles/
│       ├── main.css         # Core styles
│       ├── components.css   # Component styles
│       └── responsive.css   # Responsive design
├── package.json             # Dependencies
├── capacitor.config.json    # Capacitor config
└── README.md               # This file
```

## 🚀 Getting Started

### Prerequisites

- Node.js 16+
- npm or yarn
- (Optional) Android Studio for APK building

### Installation

```bash
# Clone or navigate to project
cd VoiceMaster

# Install dependencies
npm install

# Note: Android platform is already configured for Ionic Appflow builds
# ONNX voice models (*.onnx files) are not tracked in git due to size
# They are available locally in src/public/tts-web/onnx/ for development
```

### Development

```bash
# Start local dev server
npm run dev

# Open in browser at http://localhost:8000
```

### Build APK

```bash
# Sync web files to native project
npm run sync

# Build for Android
npm run build

# Open Android Studio
npm run open:android
```

## 📖 Usage

1. **Enter Text** - Type or paste your text in the input box (up to 2,000 chars)
2. **Select Voice** - Choose from 10 voices by clicking voice cards
3. **Adjust Settings** - Use speed and pitch sliders
4. **Generate** - Click "Generate Voice" button
5. **Listen** - Play audio with built-in player
6. **Download** - Export as WAV file
7. **Share** - Share to social media or messaging apps

## 🎨 Design Theme

### Colors

- **Dark Mode** (Default) - #0F1117 background, studio feel
- **Light Mode** - Optional toggle, #F9FAFB background
- **Accent Colors** - Blue (#2563EB) & Purple (#7C3AED) gradients

### Responsive Design

- ✅ Mobile-first approach
- ✅ Works on all screen sizes (320px+)
- ✅ Touch-optimized buttons (44px min)
- ✅ Landscape support

## 🔧 Configuration

### Voice Settings

Edit `src/js/utils.js` `VOICES` array to customize voices:

```javascript
{
  id: 'voice_id',
  name: 'Display Name',
  type: 'Male/Female',
  icon: '👨',
  description: 'Voice description',
  lang: 'en-US'
}
```

### Audio Settings

Adjust in `audio-engine.js`:

- Sample rate: 44100 Hz (standard)
- Bit depth: 16-bit PCM
- Duration estimation algorithm

## 📊 Performance

- **App Size**: ~2-5MB (web only, no models)
- **First Load**: <2 seconds
- **Audio Generation**: <3 seconds (native TTS)
- **Memory Usage**: ~50MB average

## 🔐 Privacy & Security

- ✅ **100% Offline** - No data sent to servers
- ✅ **No Tracking** - No analytics or cookies
- ✅ **Local Storage** - Only browser storage used
- ✅ **Open Source** - Code transparency

## 🐛 Troubleshooting

### Audio not playing

- Check browser speaker settings
- Ensure Web Audio API is enabled
- Try refreshing the page

### Slow generation

- Reduce text length
- Close other browser tabs
- Restart the app

### Theme not saving

- Enable localStorage in browser settings
- Check browser privacy mode

## 🚧 Roadmap

### Phase 1 (MVP - Current) ✅

- Web UI with 10 voices
- Text-to-speech generation
- Audio playback and download
- Responsive design
- Dark/light theme toggle

### Phase 2 (AI Voices)

- Integrate Piper TTS WASM
- High-quality voice synthesis
- Downloadable voice packs
- Language support

### Phase 3 (Advanced)

- Pitch/emphasis control
- Background music mixing
- Multi-file batch processing
- Cloud sync (optional)
- Monetization (voice packs)

### Phase 4 (Platform)

- Android APK release
- iOS app release
- Desktop apps
- Browser extension

## 💰 Monetization Strategy

- **Free Tier** - Basic TTS with system voices
- **Pro Tier** - Premium AI voices ($2.99/month or one-time)
- **Voice Packs** - Additional voices ($0.99 each)
- **No Ads** - Ad-free experience for all users

## 🤝 Contributing

Contributions are welcome! Areas to contribute:

- New voice models
- Language support
- UI/UX improvements
- Performance optimizations
- Documentation

## 📄 License

MIT License - Free for personal and commercial use

## 📞 Support

- 🐛 **Report Issues** - GitHub Issues
- 💬 **Discuss** - GitHub Discussions
- 📧 **Email** - support@voiceforge.ai (future)

## 👨‍💻 Development Notes

### Adding New Features

1. **UI Changes** - Edit `src/styles/*.css`
2. **Logic Changes** - Edit `src/js/*.js`
3. **Dependencies** - Add to `package.json`
4. **Testing** - Reload browser dev server

### Debugging

```javascript
// Check app status
console.log(window.voiceforgeApp.getStatus());

// Access audio engine
window.voiceforgeApp.audioEngine;

// Access UI controller
window.voiceforgeApp.uiController;
```

### Building for Production

```bash
# Minify and optimize
npm run build:prod

# Generate APK for release
npm run build -- --release
```

## 🎓 Learning Resources

- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [Capacitor Docs](https://capacitorjs.com/)
- [Piper TTS](https://github.com/rhasspy/piper)

## 📈 Analytics Goals

- Target: 10,000+ downloads in Year 1
- Focus: Content creators in emerging markets
- Revenue: $5,000+ MRR

## ✨ Credits

Built with ❤️ for content creators by VoiceForge Team

---

**Version**: 0.1.0 (MVP)  
**Last Updated**: January 2026  
**Status**: Active Development
