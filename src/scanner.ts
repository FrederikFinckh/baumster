import './style.css';
import { isAuthenticated, getStoredToken, logout } from './auth';
import { Html5Qrcode } from 'html5-qrcode';

// Check if authenticated
if (!isAuthenticated()) {
    window.location.href = '/';
}

// Global variables
let html5QrCode: Html5Qrcode | null = null;
let spotifyPlayer: Spotify.Player | null = null;
let deviceId: string | null = null;
let currentTrackUri: string | null = null;
let isPlaying = false;

// Spotify URL patterns
const SPOTIFY_URL_PATTERNS = {
    track: /spotify\.com\/track\/([a-zA-Z0-9]+)/,
    album: /spotify\.com\/album\/([a-zA-Z0-9]+)/,
    playlist: /spotify\.com\/playlist\/([a-zA-Z0-9]+)/,
    trackUri: /spotify:track:([a-zA-Z0-9]+)/,
};

// Parse Spotify URL
function parseSpotifyUrl(url: string): { type: string; id: string } | null {
    for (const [type, pattern] of Object.entries(SPOTIFY_URL_PATTERNS)) {
        const match = url.match(pattern);
        if (match) {
            return { type: type.replace('Uri', ''), id: match[1] };
        }
    }
    return null;
}

// Initialize QR Code Scanner
async function initializeScanner() {
    const scannerStatus = document.getElementById('scannerStatus');

    try {
        html5QrCode = new Html5Qrcode('reader');

        if (scannerStatus) {
            scannerStatus.textContent = 'Requesting camera access...';
        }

        // Start scanning
        await html5QrCode.start(
            { facingMode: 'environment' },
            {
                fps: 10,
                qrbox: { width: 250, height: 250 },
            },
            onScanSuccess,
            onScanError
        );

        if (scannerStatus) {
            scannerStatus.textContent = '📷 Point camera at Spotify QR code';
            scannerStatus.classList.add('ready');
        }
    } catch (err) {
        console.error('Error starting scanner:', err);
        if (scannerStatus) {
            scannerStatus.textContent = '❌ Camera access denied or unavailable';
            scannerStatus.classList.add('error');
        }
    }
}

// Handle successful QR code scan
function onScanSuccess(decodedText: string) {
    console.log('QR Code detected:', decodedText);

    const spotifyData = parseSpotifyUrl(decodedText);

    if (spotifyData) {
        // Stop scanner temporarily to avoid multiple scans
        if (html5QrCode?.isScanning) {
            html5QrCode.pause(true);
        }

        handleSpotifyUrl(spotifyData);
    } else {
        const scannerStatus = document.getElementById('scannerStatus');
        if (scannerStatus) {
            scannerStatus.textContent = '⚠️ Not a valid Spotify URL. Try again.';
            setTimeout(() => {
                scannerStatus.textContent = '📷 Point camera at Spotify QR code';
            }, 3000);
        }
    }
}

// Handle scan errors (silent - these happen constantly during scanning)
function onScanError(errorMessage: string) {
    // Only log unexpected errors, not "No QR code found" messages
    if (!errorMessage.includes('NotFoundException')) {
        console.debug('Scan error:', errorMessage);
    }
}

// Handle Spotify URL detection
async function handleSpotifyUrl(spotifyData: { type: string; id: string }) {
    const { type, id } = spotifyData;
    const scannerStatus = document.getElementById('scannerStatus');

    if (scannerStatus) {
        scannerStatus.textContent = `✅ Detected Spotify ${type}!`;
    }

    // For now, we'll handle tracks. Albums and playlists can play first track
    if (type === 'track') {
        const trackUri = `spotify:track:${id}`;
        await playTrack(trackUri);
    } else if (type === 'album') {
        // Get first track from album and play it
        await playAlbum(id);
    } else if (type === 'playlist') {
        // Get first track from playlist and play it
        await playPlaylist(id);
    }
}

// Play a track using the Spotify Web Playback SDK
async function playTrack(trackUri: string) {
    const token = getStoredToken();
    if (!token || !deviceId) {
        console.error('No token or device ID available');
        return;
    }

    currentTrackUri = trackUri;

    try {
        const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
            method: 'PUT',
            body: JSON.stringify({ uris: [trackUri] }),
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
        });

        if (!response.ok) {
            throw new Error('Failed to play track');
        }

        // Show player box
        showPlayerBox();

        // Resume scanner after a delay
        setTimeout(() => {
            if (html5QrCode?.isScanning) {
                html5QrCode.resume();
            }
        }, 2000);
    } catch (error) {
        console.error('Error playing track:', error);
        alert('Failed to play track. Make sure Spotify is active on this device.');
    }
}

// Play first track from album
async function playAlbum(albumId: string) {
    const token = getStoredToken();
    if (!token) return;

    try {
        const response = await fetch(`https://api.spotify.com/v1/albums/${albumId}/tracks?limit=1`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (data.items && data.items.length > 0) {
            await playTrack(data.items[0].uri);
        }
    } catch (error) {
        console.error('Error playing album:', error);
    }
}

// Play first track from playlist
async function playPlaylist(playlistId: string) {
    const token = getStoredToken();
    if (!token) return;

    try {
        const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=1`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (data.items && data.items.length > 0) {
            await playTrack(data.items[0].track.uri);
        }
    } catch (error) {
        console.error('Error playing playlist:', error);
    }
}

// Show player box
function showPlayerBox() {
    const playerBox = document.getElementById('playerBox');
    if (playerBox) {
        playerBox.style.display = 'block';
    }
}

// Hide player box
function hidePlayerBox() {
    const playerBox = document.getElementById('playerBox');
    if (playerBox) {
        playerBox.style.display = 'none';
    }
}

// Update track info in UI
function updateTrackInfo(track: Spotify.Track) {
    const trackImage = document.getElementById('trackImage') as HTMLImageElement;
    const trackName = document.getElementById('trackName');
    const trackArtist = document.getElementById('trackArtist');

    if (trackImage && track.album.images.length > 0) {
        trackImage.src = track.album.images[0].url;
    }
    if (trackName) {
        trackName.textContent = track.name;
    }
    if (trackArtist) {
        trackArtist.textContent = track.artists.map(a => a.name).join(', ');
    }
}

// Format time (milliseconds to MM:SS)
function formatTime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Update progress bar
function updateProgress(position: number, duration: number) {
    const progressBar = document.getElementById('progressBar');
    const currentTime = document.getElementById('currentTime');
    const durationEl = document.getElementById('duration');

    if (progressBar) {
        const percentage = (position / duration) * 100;
        progressBar.style.width = `${percentage}%`;
    }
    if (currentTime) {
        currentTime.textContent = formatTime(position);
    }
    if (durationEl) {
        durationEl.textContent = formatTime(duration);
    }
}

// Initialize Spotify Web Playback SDK
function initializeSpotifyPlayer() {
    const token = getStoredToken();
    if (!token) {
        console.error('No access token available');
        return;
    }

    if (!window.Spotify) {
        console.error('Spotify SDK not loaded');
        return;
    }

    spotifyPlayer = new window.Spotify.Player({
        name: 'Baumster Web Player',
        getOAuthToken: cb => { cb(token); },
        volume: 0.8
    });

    // Ready
    spotifyPlayer.addListener('ready', ({ device_id }) => {
        console.log('Ready with Device ID', device_id);
        deviceId = device_id;
    });

    // Not Ready
    spotifyPlayer.addListener('not_ready', ({ device_id }) => {
        console.log('Device ID has gone offline', device_id);
    });

    // Player state changed
    spotifyPlayer.addListener('player_state_changed', (state) => {
        if (!state) return;

        const track = state.track_window.current_track;
        updateTrackInfo(track);
        updateProgress(state.position, state.duration);

        isPlaying = !state.paused;
        updatePlayPauseButton();
    });

    // Errors
    spotifyPlayer.addListener('initialization_error', ({ message }) => {
        console.error('Initialization Error:', message);
    });

    spotifyPlayer.addListener('authentication_error', ({ message }) => {
        console.error('Authentication Error:', message);
        alert('Authentication error. Please log in again.');
        logout();
        window.location.href = '/';
    });

    spotifyPlayer.addListener('account_error', ({ message }) => {
        console.error('Account Error:', message);
        alert('Account error: ' + message);
    });

    spotifyPlayer.addListener('playback_error', ({ message }) => {
        console.error('Playback Error:', message);
    });

    // Connect to the player
    spotifyPlayer.connect();
}

// Update play/pause button
function updatePlayPauseButton() {
    const playPauseBtn = document.getElementById('playPauseBtn');
    if (playPauseBtn) {
        playPauseBtn.textContent = isPlaying ? '⏸' : '▶';
    }
}

// Player controls
function setupPlayerControls() {
    const playPauseBtn = document.getElementById('playPauseBtn');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const closePlayer = document.getElementById('closePlayer');

    if (playPauseBtn) {
        playPauseBtn.addEventListener('click', () => {
            if (spotifyPlayer) {
                spotifyPlayer.togglePlay();
            }
        });
    }

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (spotifyPlayer) {
                spotifyPlayer.previousTrack();
            }
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (spotifyPlayer) {
                spotifyPlayer.nextTrack();
            }
        });
    }

    if (closePlayer) {
        closePlayer.addEventListener('click', () => {
            hidePlayerBox();
            if (html5QrCode?.isScanning) {
                html5QrCode.resume();
            }
        });
    }
}

// Setup logout button
function setupLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            // Cleanup
            if (html5QrCode) {
                html5QrCode.stop();
            }
            if (spotifyPlayer) {
                spotifyPlayer.disconnect();
            }

            logout();
            window.location.href = '/';
        });
    }
}

// Wait for Spotify SDK to load
window.onSpotifyWebPlaybackSDKReady = () => {
    console.log('Spotify SDK Ready');
    initializeSpotifyPlayer();
};

// Initialize everything
async function init() {
    await initializeScanner();
    setupPlayerControls();
    setupLogout();

    // If SDK is already loaded, initialize player
    if (window.Spotify) {
        initializeSpotifyPlayer();
    }
}

// Start the app
init();