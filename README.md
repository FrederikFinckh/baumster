# 🎵 Baumster - QR Music Player

A Progressive Web App (PWA) that allows users to scan QR codes containing Spotify track links and play them instantly.

## 🚀 Current Progress

### ✅ Completed
- **Architecture Design**: Full system architecture documented in ARCHITECTURE.md
- **Authentication System**: OAuth PKCE flow implementation for seamless Spotify login
- **Welcome Screen**: Responsive landing page with Baumster branding
- **Token Management**: Secure token storage and retrieval
- **Project Setup**: Vite + TypeScript + pnpm configuration

### 🔄 In Progress
- QR Scanner page with camera access
- Spotify Web Playback SDK integration
- PWA manifest and service worker

## 📋 Setup Instructions

### 1. Create Spotify Application

1. Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Log in with your Spotify account
3. Click "Create app"
4. Fill in the app details:
   - **App name**: Baumster
   - **App description**: QR code music player
   - **Redirect URI**: `http://127.0.0.1:5173/login.html` ⚠️ **IMPORTANT: Must use `127.0.0.1`, not `localhost`**
   - **Website**: (optional)
   - **API/SDKs**: Check "Web API" and "Web Playback SDK"
5. Save the app
6. Copy your **Client ID** from the app settings

### 2. Configure the Application

1. Open `src/config.ts`
2. Replace `YOUR_CLIENT_ID_HERE` with your actual Spotify Client ID

### 3. Install Dependencies

```bash
pnpm install
```

### 4. Run Development Server

```bash
pnpm run dev
```

The app will be available at `http://127.0.0.1:5173`

⚠️ **IMPORTANT**: Spotify requires the redirect URI to use `127.0.0.1`, not `localhost`. The Vite dev server is configured in [`vite.config.ts`](vite.config.ts) to bind specifically to `127.0.0.1:5173` to match Spotify's requirements.

## 🏗️ Architecture Overview

### Authentication Flow
1. User clicks "Connect with Spotify" on welcome screen
2. App redirects to Spotify authorization page with PKCE challenge
3. User authorizes the app
4. Spotify redirects back to `/login.html` with authorization code
5. App exchanges code for access token using PKCE verifier
6. Token is stored in localStorage
7. User is redirected to scanner page

### Tech Stack
- **Frontend**: TypeScript + Vite
- **UI**: Vanilla JS with modern CSS (Spotify-themed)
- **QR Scanner**: html5-qrcode library
- **Playback**: Spotify Web Playback SDK
- **PWA**: Service Worker + Web App Manifest

## 📁 Project Structure

```
├── src/
│   ├── auth.ts           # Authentication & PKCE functions
│   ├── config.ts         # Spotify app configuration
│   ├── login.ts          # OAuth callback handler
│   ├── main.ts           # Welcome screen logic
│   └── style.css         # Global styles
├── index.html            # Welcome screen
├── login.html            # OAuth callback page
├── ARCHITECTURE.md       # Detailed architecture docs
└── package.json          # Dependencies
```

## 🔐 Authentication Details

### Required Spotify Scopes
- `user-read-private` - Access user profile data
- `user-read-email` - Access user email
- `streaming` - Control Spotify playback
- `user-read-playback-state` - Read playback state
- `user-modify-playback-state` - Modify playback state

### Security
- Uses OAuth 2.0 Authorization Code Flow with PKCE
- No client secret required (public client pattern)
- Tokens stored in localStorage
- PKCE verifier ensures request authenticity

## 🎯 Next Steps

1. **Create QR Scanner Page**
   - Implement camera access
   - Integrate html5-qrcode library
   - Parse Spotify URLs from QR codes

2. **Integrate Spotify Playback**
   - Load Web Playback SDK
   - Initialize Spotify Player
   - Implement playback controls

3. **Create PWA Assets**
   - Generate manifest.json
   - Create service worker
   - Add app icons

4. **Error Handling**
   - Handle authentication errors
   - Handle playback errors
   - Add user feedback

## 🔧 Development Notes

### Important URLs
- **Authorization Endpoint**: `https://accounts.spotify.com/authorize`
- **Token Endpoint**: `https://accounts.spotify.com/api/token`
- **Web Playback SDK**: `https://sdk.scdn.co/spotify-player.js`

### Redirect URI
⚠️ **CRITICAL**: Spotify requires the redirect URI to use `127.0.0.1`, not `localhost`.

Make sure this exact URL is added to your Spotify app settings:
```
http://127.0.0.1:5173/login.html
```

The Vite dev server is configured in [`vite.config.ts`](vite.config.ts) to bind to `127.0.0.1` specifically for this reason. Do not change this to `localhost` or the OAuth callback will fail.

### Browser Requirements
- Modern browser with ES2022 support
- Camera access for QR scanning
- LocalStorage enabled
- Active internet connection

## 📱 Requirements for Users

- Spotify Premium account (required for Web Playback SDK)
- Active Spotify app on the device
- Camera access permission for QR scanning

## 🤝 Contributing

This is currently in active development. See ARCHITECTURE.md for the complete technical specification.

## 📄 License

MIT

---

**Status**: Initial implementation complete. Ready for Spotify app configuration and testing.