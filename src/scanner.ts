import './style.css';
import { isAuthenticated, getStoredToken, logout } from './auth';
import { Html5Qrcode } from 'html5-qrcode';
import QRCode from 'qrcode';

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
let deviceReady = false;

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

// Hide scanner and show start scanner button
function hideScannerShowButton() {
    const scannerSection = document.getElementById('scannerSection');
    const startScannerSection = document.getElementById('startScannerSection');

    if (scannerSection) {
        scannerSection.style.display = 'none';
    }
    if (startScannerSection) {
        startScannerSection.style.display = 'block';
    }
}

// Show scanner and hide start scanner button
function showScannerHideButton() {
    const scannerSection = document.getElementById('scannerSection');
    const startScannerSection = document.getElementById('startScannerSection');

    if (scannerSection) {
        scannerSection.style.display = 'block';
    }
    if (startScannerSection) {
        startScannerSection.style.display = 'none';
    }
}

// Restart scanner
async function restartScanner() {
    console.log('🔄 Restarting scanner...');

    // Show scanner section
    showScannerHideButton();

    // If scanner is already running, resume it
    if (html5QrCode?.isScanning) {
        console.log('Scanner already running, resuming...');
        html5QrCode.resume();
    } else {
        // Otherwise, reinitialize
        console.log('Reinitializing scanner...');
        await initializeScanner();
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

// Get available Spotify devices
async function getAvailableDevices() {
    const token = getStoredToken();
    if (!token) {
        console.error('No token available');
        return null;
    }

    try {
        const response = await fetch('https://api.spotify.com/v1/me/player/devices', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            console.error('Failed to fetch devices:', response.status);
            return null;
        }

        const data = await response.json();
        console.log('📱 Available Spotify devices:', data.devices.length, 'device(s)');

        // Log ALL device IDs for comparison
        console.log('🔍 Current deviceId we\'re looking for:', deviceId);
        data.devices.forEach((d: any, index: number) => {
            console.log(`Device ${index + 1}:`, {
                id: d.id,
                name: d.name,
                type: d.type,
                is_active: d.is_active,
                volume_percent: d.volume_percent,
                matches: d.id === deviceId ? '✅ MATCH' : '❌ no match'
            });
        });

        // Check if our device is in the list
        const ourDevice = data.devices.find((d: any) => d.id === deviceId);
        if (ourDevice) {
            console.log('✅ Our device found and matched!');
            console.log('  - Name:', ourDevice.name);
            console.log('  - Type:', ourDevice.type);
            console.log('  - Active:', ourDevice.is_active);
            console.log('  - Volume:', ourDevice.volume_percent);
        } else {
            console.warn('⚠️ Our device NOT found in available devices list!');
            console.log('Looking for device ID:', deviceId);
            console.log('💡 This might indicate a device ID mismatch issue');
        }

        return data.devices;
    } catch (error) {
        console.error('Error fetching devices:', error);
        return null;
    }
}

// Activate/transfer playback to our device
async function activateDevice(deviceIdToActivate: string) {
    const token = getStoredToken();
    if (!token) {
        console.error('No token available for device activation');
        return false;
    }

    console.log('🔄 Activating device:', deviceIdToActivate);

    try {
        const response = await fetch('https://api.spotify.com/v1/me/player', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                device_ids: [deviceIdToActivate],
                play: false // Don't start playing yet
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Device activation failed:', response.status, errorText);
            return false;
        }

        console.log('✅ Device activated successfully');

        // Wait a moment for activation to register
        await new Promise(resolve => setTimeout(resolve, 500));

        return true;
    } catch (error) {
        console.error('Error activating device:', error);
        return false;
    }
}

// Update device status UI
function updateDeviceStatus(status: 'initializing' | 'connecting' | 'ready' | 'active' | 'error', message: string, showRetry = false) {
    const statusEl = document.getElementById('deviceStatus');
    const statusTextEl = document.getElementById('deviceStatusText');
    const retryBtn = document.getElementById('retryDeviceBtn');

    if (statusEl && statusTextEl) {
        statusEl.className = `device-status status-${status}`;
        statusTextEl.textContent = message;
        console.log(`📱 Device Status: ${status} - ${message}`);
    }

    if (retryBtn) {
        retryBtn.style.display = showRetry ? 'block' : 'none';
    }
}

// Verify device is ready for playback with retries
async function verifyDeviceReady(retryCount = 0): Promise<boolean> {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 2000; // 2 seconds

    if (!deviceId) {
        console.error('❌ No device ID available');
        updateDeviceStatus('error', 'No device ID');
        return false;
    }

    console.log(`🔍 Verifying device readiness... (attempt ${retryCount + 1}/${MAX_RETRIES + 1})`);
    updateDeviceStatus('connecting', `Verifying device... (${retryCount + 1}/${MAX_RETRIES + 1})`);

    // Get available devices
    const devices = await getAvailableDevices();
    if (!devices) {
        console.error('❌ Could not fetch devices');
        if (retryCount < MAX_RETRIES) {
            console.log(`⏳ Retrying in ${RETRY_DELAY / 1000} seconds...`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
            return verifyDeviceReady(retryCount + 1);
        }
        updateDeviceStatus('error', 'Could not fetch devices');
        return false;
    }

    // Check if our device is in the list
    let ourDevice = devices.find((d: any) => d.id === deviceId);

    // If exact match not found, but we have Baumster devices, use any of them
    if (!ourDevice) {
        console.warn('⚠️ Exact device ID match not found');
        const baumsterDevices = devices.filter((d: any) =>
            d.name && d.name.includes('Baumster')
        );

        if (baumsterDevices.length > 0) {
            console.log(`💡 Found ${baumsterDevices.length} Baumster device(s), using the first active or any`);
            // Prefer active device
            ourDevice = baumsterDevices.find((d: any) => d.is_active) || baumsterDevices[0];
            const oldDeviceId = deviceId;
            deviceId = ourDevice.id; // Update our deviceId to match
            console.log(`✅ Switched from device ${oldDeviceId} to ${deviceId}`);
            console.log('New device:', {
                name: ourDevice.name,
                id: ourDevice.id,
                is_active: ourDevice.is_active
            });
        } else {
            console.error('❌ No Baumster devices found at all');

            if (retryCount < MAX_RETRIES) {
                console.log(`⏳ Waiting ${RETRY_DELAY / 1000} seconds and retrying...`);
                updateDeviceStatus('connecting', `Waiting for registration... (${retryCount + 1}/${MAX_RETRIES + 1})`);
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
                return verifyDeviceReady(retryCount + 1);
            }

            updateDeviceStatus('error', 'Device not registered', true);
            return false;
        }
    }

    // If device is not active, activate it
    if (!ourDevice.is_active) {
        console.log('📱 Device exists but not active, activating...');
        updateDeviceStatus('connecting', 'Activating device...');
        if (!deviceId) {
            console.error('❌ Device ID became null');
            updateDeviceStatus('error', 'Device ID lost');
            return false;
        }
        const activated = await activateDevice(deviceId);
        if (!activated) {
            console.error('❌ Failed to activate device');
            updateDeviceStatus('error', 'Activation failed');
            return false;
        }
    }

    console.log('✅ Device is ready for playback');
    updateDeviceStatus('ready', 'Ready ✓');
    deviceReady = true;
    return true;
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
        console.error('❌ No token or device ID available');
        alert('Playback error: No authentication token or device ID');
        return;
    }

    console.log('🎵 Attempting to play track:', trackUri);
    console.log('Using device ID:', deviceId);

    // Verify device is ready before attempting playback
    if (!deviceReady) {
        console.log('⏳ Device not verified yet, verifying now...');
        const ready = await verifyDeviceReady();
        if (!ready) {
            alert('Device not ready. Please wait a moment and try again.');
            return;
        }
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
            // Enhanced error logging
            const errorData = await response.json().catch(() => null);
            console.error('❌ Playback failed:', {
                status: response.status,
                statusText: response.statusText,
                error: errorData
            });

            let errorMessage = 'Failed to play track';
            if (errorData?.error?.message) {
                errorMessage += ': ' + errorData.error.message;
            }
            if (response.status === 404) {
                errorMessage = 'Device not found. The device may have disconnected.';
                deviceReady = false; // Reset device ready flag
            } else if (response.status === 403) {
                errorMessage = 'Playback forbidden. Check if you have Spotify Premium.';
            }

            throw new Error(errorMessage);
        }

        console.log('✅ Playback started successfully');

        // Show player box with QR code
        await showPlayerBox();

        // Hide scanner and show "Start Scanner" button
        hideScannerShowButton();
    } catch (error) {
        console.error('Error playing track:', error);
        alert(`Failed to play track. ${error instanceof Error ? error.message : 'Unknown error'}`);
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

// Generate QR code from track URI
async function generateTrackQrCode(trackUri: string): Promise<string> {
    // Convert URI to URL format
    const trackId = trackUri.replace('spotify:track:', '');
    const url = `https://open.spotify.com/track/${trackId}`;

    // Generate QR code
    return await QRCode.toDataURL(url, {
        errorCorrectionLevel: 'H',
        width: 400,
        margin: 2
    });
}

// Show QR view
function showQrView() {
    const qrView = document.getElementById('qrView');
    const trackInfoView = document.getElementById('trackInfoView');

    if (qrView) qrView.style.display = '';
    if (trackInfoView) trackInfoView.style.display = 'none';
}

// Show track info view
function showTrackInfoView() {
    const qrView = document.getElementById('qrView');
    const trackInfoView = document.getElementById('trackInfoView');

    if (qrView) qrView.style.display = 'none';
    if (trackInfoView) trackInfoView.style.display = '';
}

// Show player box
async function showPlayerBox() {
    const playerBox = document.getElementById('playerBox');
    if (playerBox) {
        playerBox.style.display = 'block';
    }

    // Generate and display QR code
    if (currentTrackUri) {
        try {
            const qrDataUrl = await generateTrackQrCode(currentTrackUri);
            const qrImage = document.getElementById('trackQrCode') as HTMLImageElement;
            if (qrImage) {
                qrImage.src = qrDataUrl;
            }
        } catch (error) {
            console.error('Error generating QR code:', error);
        }
    }

    // Ensure QR view is shown and track info is hidden
    showQrView();
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
        updateDeviceStatus('error', 'No access token');
        return;
    }

    if (!window.Spotify) {
        console.error('Spotify SDK not loaded');
        updateDeviceStatus('error', 'SDK not loaded');
        return;
    }

    console.log('🎵 Initializing Spotify Web Playback SDK...');
    updateDeviceStatus('connecting', 'Connecting to Spotify...');

    spotifyPlayer = new window.Spotify.Player({
        name: 'Baumster Web Player',
        getOAuthToken: cb => { cb(token); },
        volume: 0.8
    });

    // Ready
    spotifyPlayer.addListener('ready', async ({ device_id }) => {
        console.log('🎉 Spotify Player Ready with Device ID:', device_id);
        deviceId = device_id;
        updateDeviceStatus('connecting', 'Device created, verifying...');

        // Verify device is registered and ready
        console.log('🔍 Verifying device registration...');
        await verifyDeviceReady();
    });

    // Not Ready
    spotifyPlayer.addListener('not_ready', ({ device_id }) => {
        console.log('Device ID has gone offline', device_id);
        updateDeviceStatus('error', 'Device offline');
        deviceReady = false;
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
        updateDeviceStatus('error', 'Init error');
    });

    spotifyPlayer.addListener('authentication_error', ({ message }) => {
        console.error('Authentication Error:', message);
        updateDeviceStatus('error', 'Auth error');
        alert('Authentication error. Please log in again.');
        logout();
        window.location.href = '/';
    });

    spotifyPlayer.addListener('account_error', ({ message }) => {
        console.error('Account Error:', message);
        updateDeviceStatus('error', 'Account error');
        alert('Account error: ' + message);
    });

    spotifyPlayer.addListener('playback_error', ({ message }) => {
        console.error('Playback Error:', message);
    });

    // Connect to the player
    console.log('🔌 Connecting to Spotify Player...');
    spotifyPlayer.connect().then(success => {
        if (success) {
            console.log('✅ Connected to Spotify Player successfully');
        } else {
            console.error('❌ Failed to connect to Spotify Player');
            updateDeviceStatus('error', 'Connection failed');
        }
    });
}

// Update play/pause button
function updatePlayPauseButton() {
    const playPauseBtn = document.getElementById('playPauseBtn');
    const qrPlayPauseBtn = document.getElementById('qrPlayPauseBtn');
    const icon = isPlaying ? '⏸' : '▶';

    if (playPauseBtn) {
        playPauseBtn.textContent = icon;
    }
    if (qrPlayPauseBtn) {
        qrPlayPauseBtn.textContent = icon;
    }
}

// Setup view toggle
function setupViewToggle() {
    const qrView = document.getElementById('qrView');
    const showQrBtn = document.getElementById('showQrBtn');

    if (qrView) {
        qrView.addEventListener('click', () => {
            showTrackInfoView();
        });
    }

    if (showQrBtn) {
        showQrBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showQrView();
        });
    }
}

// Player controls
function setupPlayerControls() {
    const playPauseBtn = document.getElementById('playPauseBtn');
    const qrPlayPauseBtn = document.getElementById('qrPlayPauseBtn');
    const closePlayer = document.getElementById('closePlayer');

    if (playPauseBtn) {
        playPauseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (spotifyPlayer) {
                spotifyPlayer.togglePlay();
            }
        });
    }

    if (qrPlayPauseBtn) {
        qrPlayPauseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (spotifyPlayer) {
                spotifyPlayer.togglePlay();
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
const backBtn = document.getElementById('backBtn') as HTMLButtonElement;
backBtn.addEventListener('click', () => {
    window.location.href = '/';
});


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

// Setup retry device button
function setupRetryDevice() {
    const retryBtn = document.getElementById('retryDeviceBtn');
    if (retryBtn) {
        retryBtn.addEventListener('click', async () => {
            console.log('🔄 Manual device verification retry requested');
            deviceReady = false;
            await verifyDeviceReady();
        });
    }
}

// Setup start scanner button
function setupStartScanner() {
    const startScannerBtn = document.getElementById('startScannerBtn');
    if (startScannerBtn) {
        startScannerBtn.addEventListener('click', async () => {
            await restartScanner();
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
    updateDeviceStatus('initializing', 'Initializing...');
    await initializeScanner();
    setupPlayerControls();
    setupViewToggle();
    setupLogout();
    setupRetryDevice();
    setupStartScanner();

    // If SDK is already loaded, initialize player
    if (window.Spotify) {
        initializeSpotifyPlayer();
    } else {
        updateDeviceStatus('connecting', 'Loading Spotify SDK...');
    }
}

// Start the app
init();