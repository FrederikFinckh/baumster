import { SPOTIFY_CONFIG } from './config';

// Generate a random code verifier for PKCE
export function generateCodeVerifier(length: number): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

// Generate code challenge from verifier
export async function generateCodeChallenge(codeVerifier: string): Promise<string> {
    const data = new TextEncoder().encode(codeVerifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

// Redirect to Spotify authorization page
export async function redirectToAuthCodeFlow(): Promise<void> {
    const verifier = generateCodeVerifier(128);
    const challenge = await generateCodeChallenge(verifier);

    localStorage.setItem('verifier', verifier);

    const params = new URLSearchParams({
        client_id: SPOTIFY_CONFIG.clientId,
        response_type: 'code',
        redirect_uri: SPOTIFY_CONFIG.redirectUri,
        scope: SPOTIFY_CONFIG.scopes.join(' '),
        code_challenge_method: 'S256',
        code_challenge: challenge
    });

    window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

// Exchange authorization code for access token
export async function getAccessToken(code: string): Promise<string> {
    const verifier = localStorage.getItem('verifier');

    if (!verifier) {
        throw new Error('No verifier found');
    }

    const params = new URLSearchParams({
        client_id: SPOTIFY_CONFIG.clientId,
        grant_type: 'authorization_code',
        code,
        redirect_uri: SPOTIFY_CONFIG.redirectUri,
        code_verifier: verifier
    });

    const result = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params
    });

    const { access_token } = await result.json();
    return access_token;
}

// Store token in localStorage
export function storeToken(token: string): void {
    localStorage.setItem('access_token', token);
    localStorage.setItem('token_timestamp', Date.now().toString());
}

// Retrieve token from localStorage
export function getStoredToken(): string | null {
    return localStorage.getItem('access_token');
}

// Check if user is authenticated
export function isAuthenticated(): boolean {
    return !!getStoredToken();
}

// Logout (clear tokens)
export function logout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('token_timestamp');
    localStorage.removeItem('verifier');
}