import { getAccessToken, storeToken } from './auth';
import { registerServiceWorker } from './pwa';

async function handleCallback() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const error = params.get('error');

    if (error) {
        console.error('Authentication error:', error);
        alert('Authentication failed. Please try again.');
        window.location.href = '/';
        return;
    }

    if (!code) {
        console.error('No authorization code found');
        window.location.href = '/';
        return;
    }

    try {
        // Exchange code for access token
        const accessToken = await getAccessToken(code);

        // Store the token
        storeToken(accessToken);

        // Redirect to scanner
        window.location.href = '/';
    } catch (error) {
        console.error('Error getting access token:', error);
        alert('Failed to complete authentication. Please try again.');
        window.location.href = '/';
    }
}

// Run the callback handler
handleCallback();

// Register service worker for PWA
registerServiceWorker();