# Baumster PWA - Architecture Document

## Project Overview

Baumster is a Progressive Web App that allows users to scan QR codes containing Spotify URLs and play songs directly in the browser using the Spotify Web Playback SDK.

## Tech Stack

- Vite - Development server and build tool
- TypeScript - Type safety without framework overhead  
- Vanilla HTML/CSS/TS - No framework, maximum control
- Spotify Web API - Track information and authentication
- Spotify Web Playback SDK - In-browser audio playback (Premium required)
- html5-qrcode - QR code scanning functionality
- PWA - manifest.json and Service Worker for installability

## Architecture Decisions

### Multi-Page Application (MPA)

We chose separate HTML files for different pages rather than a single-page app:
- No routing library needed
- True low-level implementation  
- Clear separation of concerns
- Each page loads independently

Pages:
- index.html - Welcome screen with login button
- login.html - OAuth callback handler
- scan.html - QR code scanner interface

### State Management

Minimal state stored in localStorage containing access token, refresh token, and expiry timestamp. No application state management - each page is stateless and loads what it needs from localStorage, URL parameters, or Spotify API.

### Authentication Flow

1. User opens index.html and checks localStorage for valid tokens
2. If authenticated, redirects to scan.html, otherwise shows login button
3. User clicks Login with Spotify button
4. Generate PKCE verifier and challenge, store verifier in localStorage
5. Redirect to Spotify authorize endpoint
6. Spotify redirects to login.html with authorization code
7. Exchange code for tokens using stored verifier
8. Store tokens in localStorage and redirect to scan.html
9. Auto-refresh tokens before expiry (5 minutes threshold)

**CRITICAL OAuth Flow Requirement:**

The development server MUST bind to `127.0.0.1` (not `localhost`) because:
- Spotify OAuth requires exact redirect URI matching
- The redirect URI is configured as `http://127.0.0.1:5173/login.html`
- Even though `localhost` and `127.0.0.1` resolve to the same address, Spotify treats them as different origins
- Vite is configured in [`vite.config.ts`](vite.config.ts:8) to bind specifically to `127.0.0.1:5173`

If the dev server binds to `localhost` instead, the OAuth callback will fail with a redirect error.

### QR Code Content

QR codes contain Spotify URLs like:
- https://open.spotify.com/track/3n3Ppam7vgaVa1iaRUc9Lp
- https://open.spotify.com/track/3n3Ppam7vgaVa1iaRUc9Lp?si=xxx

The app extracts the track ID from the URL and converts it to Spotify URI format (spotify:track:ID).

### Spotify Integration

Required OAuth scopes:
- user-read-private
- user-read-email
- streaming (required for Web Playback SDK)
- user-read-playback-state
- user-modify-playback-state

Web Playback SDK loaded via CDN, requires Spotify Premium account to play full tracks in browser.

Token Manager handles storing tokens, retrieving valid access tokens with auto-refresh, checking authentication status, refreshing expired tokens, and clearing tokens on logout.

## File Structure

Project directory structure:

baumster/
- index.html
- login.html
- scan.html
- src/
  - main.ts
  - auth/
    - spotify-auth.ts
    - token-manager.ts
  - scanner/
    - qr-scanner.ts
    - url-parser.ts
  - player/
    - spotify-player.ts
  - types.d.ts
  - config.ts
- public/
  - manifest.json
  - sw.js
  - icons/
  - styles/
    - global.css
- package.json
- tsconfig.json
- vite.config.ts

## Component Responsibilities

### index.html - Welcome Screen

Entry point that checks authentication status. If authenticated, redirects to scan.html. If not, shows welcome message with Baumster title and login button. Login button triggers OAuth PKCE flow.

### login.html - OAuth Callback

Handles Spotify OAuth redirect. Extracts authorization code from URL parameters, retrieves PKCE verifier from localStorage, exchanges code and verifier for access and refresh tokens, stores tokens in localStorage, clears URL parameters for security, and redirects to scan.html.

### scan.html - QR Scanner & Player

Main application page. Checks authentication and redirects if needed. Initializes QR scanner with camera access. When QR code detected, parses Spotify URL and extracts track URI. Initializes Web Playback SDK and plays the track. Shows basic player controls.

## Spotify Developer Configuration

Required settings in Spotify Developer Dashboard:
- App Name: Baumster
- Redirect URI: http://127.0.0.1:5173/login.html
- Quota Mode: Development (initially)

Configuration stored in src/config.ts with clientId, redirectUri, and required scopes array.

## PWA Configuration

### manifest.json

PWA manifest with name Baumster, standalone display mode, Spotify green theme color #1DB954, and icon definitions for 192x192 and 512x512 sizes.

### Service Worker

Minimal service worker for PWA installability. Caches core assets on install (index.html, scan.html, manifest.json). Implements cache-first strategy with network fallback for fetch events.

## Security Considerations

1. Token Storage in localStorage (acceptable for client-only app)
2. PKCE Flow protects against authorization code interception
3. No Client Secret exposed in client-side code
4. HTTPS required in production (localhost OK for dev)
5. Auto token refresh before expiry
6. **Dev Server Binding**: Must use `127.0.0.1` (not `localhost`) to match Spotify's OAuth redirect URI requirements

## Development Workflow

### Initial Setup

Commands to run:
- npm create vite@latest baumster -- --template vanilla-ts
- cd baumster
- npm install
- npm install html5-qrcode

### Configuration Steps

1. Update src/config.ts with your Spotify Client ID
2. Update Spotify Developer Dashboard with redirect URI
3. Add manifest.json and service worker

### Development Server

Run: npm run dev

Server runs on http://127.0.0.1:5173

### Build for Production

Run: npm run build

Output goes to dist/ directory

## Testing Strategy

### Test Cases

- Fresh user login flow works correctly
- Returning user auto-redirects to scanner
- Token expiry triggers auto-refresh
- Invalid QR code shows error message
- Valid Spotify URL successfully plays track
- Camera permission denied shows error
- Offline behavior shows appropriate message  
- PWA installation works on mobile devices

## Deployment Considerations

### Hosting Options

- Netlify or Vercel - Easy deployment with free tier
- GitHub Pages - Simple but may need routing config
- Custom server - More control over configuration

### Production Checklist

- Update redirect URI to production domain
- Enable HTTPS
- Update manifest.json URLs to production
- Test on multiple devices and browsers
- Submit to Spotify for quota extension if needed

## Future Enhancements (Phase 2)

- Playlist creation from scanned tracks
- Track history and favorites
- Share scanned tracks with others
- Offline queue functionality
- Custom QR code generator
- Support for album and playlist QR codes
- User profile display
- Recently played tracks

## Summary

Baumster demonstrates a minimal, low-level PWA implementation:
- Vanilla TypeScript without frameworks
- Multi-page architecture without SPA routing
- Minimal state management using localStorage only
- Spotify OAuth PKCE flow for secure authentication
- Web Playback SDK integration for in-browser playback
- QR code scanning for track discovery
- PWA features for installability and offline support

The architecture prioritizes simplicity and maintainability while providing a seamless user experience for scanning and playing Spotify tracks.