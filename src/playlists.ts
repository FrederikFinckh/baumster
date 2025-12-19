import './style.css';
import { isAuthenticated, getStoredToken, logout } from './auth';
import { PDFGenerator } from './pdf-generator';
import { registerServiceWorker } from './pwa';
import { TableManager } from './table-manager';
import type { TrackData } from './table-manager';

if (!isAuthenticated()) {
    window.location.href = '/';
}

const playlistUrlInput = document.getElementById('playlistUrl') as HTMLInputElement;
const loadPlaylistBtn = document.getElementById('loadPlaylistBtn') as HTMLButtonElement;
const errorMessage = document.getElementById('errorMessage') as HTMLDivElement;
const playlistResults = document.getElementById('playlistResults') as HTMLDivElement;
const playlistName = document.getElementById('playlistName') as HTMLHeadingElement;
const tracksTableBody = document.getElementById('tracksTableBody') as HTMLTableSectionElement;
const backBtn = document.getElementById('backBtn') as HTMLButtonElement;
const logoutBtn = document.getElementById('logoutBtn') as HTMLButtonElement;
const tracksTable = document.getElementById('tracksTable') as HTMLTableElement;
const createPdfBtn = document.getElementById('createPdfBtn') as HTMLButtonElement;
const exportJsonBtn = document.getElementById('exportJsonBtn') as HTMLButtonElement;

// Create table manager instance
const tableManager = new TableManager({
    tableBody: tracksTableBody,
    table: tracksTable,
    title: playlistName,
    resultsContainer: playlistResults,
    errorMessage: errorMessage
});

function extractPlaylistId(input: string): string | null {
    const trimmed = input.trim();

    const urlMatch = trimmed.match(/spotify\.com\/playlist\/([a-zA-Z0-9]+)/);
    if (urlMatch) {
        return urlMatch[1];
    }

    const uriMatch = trimmed.match(/spotify:playlist:([a-zA-Z0-9]+)/);
    if (uriMatch) {
        return uriMatch[1];
    }

    if (/^[a-zA-Z0-9]+$/.test(trimmed)) {
        return trimmed;
    }

    return null;
}

async function fetchPlaylist(playlistId: string, accessToken: string): Promise<TrackData[]> {
    let chunkData = await fetchChunk(`https://api.spotify.com/v1/playlists/${playlistId}/tracks?fields=next,items(track(id,name,artists(name),external_urls(spotify),album(release_date))&limit=50&offset=0`, accessToken);
    let tracks: TrackData[] = parseChunk(chunkData)
    while (chunkData.next) {
        chunkData = await fetchChunk(chunkData.next, accessToken);
        tracks = [...tracks, ...parseChunk(chunkData)];
    }
    return tracks
}

async function fetchChunk(url: string, accessToken: string): Promise<any> {
    const response = await fetch(
        url,
        {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        }
    );

    if (!response.ok) {
        if (response.status === 404) {
            throw new Error('Playlist not found. Please check the URL or ID.');
        } else if (response.status === 401) {
            throw new Error('Authentication expired. Please log in again.');
        } else {
            throw new Error(`Failed to fetch playlist: ${response.status} - ${response.statusText}`);
        }
    }
    return await response.json();
}


function parseChunk(data: any): TrackData[] {
    return data.items.map((i: any) => ({
        artist: i.track.artists.map((a: any) => a.name).join(","),
        songName: i.track.name,
        releaseYear: i.track.album.release_date.split('-')[0],
        url: i.track.external_urls.spotify
    }))
}

function displayPlaylistData(data: TrackData[]): void {
    const playlistTitle = ''; // todo remove or get metainfo

    if (!data?.length) {
        tableManager.showError('No tracks found in this playlist.');
        return;
    }

    // Display data using table manager
    tableManager.displayData(data, playlistTitle);
}

function showError(message: string): void {
    tableManager.showError(message);
}

loadPlaylistBtn.addEventListener('click', async () => {
    const input = playlistUrlInput.value;

    if (!input) {
        showError('Please enter a playlist URL or ID.');
        return;
    }

    const playlistId = extractPlaylistId(input);

    if (!playlistId) {
        showError('Invalid playlist URL or ID. Please check and try again.');
        return;
    }

    const accessToken = getStoredToken();

    if (!accessToken) {
        showError('Not authenticated. Redirecting to home...');
        setTimeout(() => window.location.href = '/', 2000);
        return;
    }

    try {
        loadPlaylistBtn.disabled = true;
        loadPlaylistBtn.textContent = 'Loading...';

        const playlistData = await fetchPlaylist(playlistId, accessToken);
        displayPlaylistData(playlistData);
    } catch (error) {
        if (error instanceof Error) {
            showError(error.message);
        } else {
            showError('An unexpected error occurred. Please try again.');
        }
    } finally {
        loadPlaylistBtn.disabled = false;
        loadPlaylistBtn.textContent = 'Load Playlist';
    }
});

playlistUrlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        loadPlaylistBtn.click();
    }
});

backBtn.addEventListener('click', () => {
    window.location.href = '/';
});

logoutBtn.addEventListener('click', () => {
    logout();
    window.location.href = '/';
});

createPdfBtn.addEventListener('click', async () => {
    try {
        createPdfBtn.disabled = true;
        createPdfBtn.textContent = 'Generating PDF...';

        await new PDFGenerator().generatePDF(tableManager.getPlaylistData());

        createPdfBtn.textContent = 'Create PDF';
    } catch (error) {
        console.error('PDF generation failed:', error);
        alert('Failed to generate PDF. Please try again.');
    } finally {
        createPdfBtn.disabled = false;
        createPdfBtn.textContent = 'Create PDF';
    }
});

exportJsonBtn.addEventListener('click', () => {
    try {
        exportJsonBtn.disabled = true;
        exportJsonBtn.textContent = 'Exporting...';

        // Get the current playlist data
        const data = tableManager.getPlaylistData();
        const playlistTitle = playlistName.textContent || 'playlist';

        // Create a sanitized filename
        const fileName = `${playlistTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_tracks.json`;

        // Convert data to JSON string
        const jsonData = JSON.stringify(data, null, 2);

        // Create blob and download
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();

        // Clean up
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        exportJsonBtn.textContent = 'Export JSON';
    } catch (error) {
        console.error('JSON export failed:', error);
        alert('Failed to export JSON. Please try again.');
        exportJsonBtn.textContent = 'Export JSON';
    } finally {
        exportJsonBtn.disabled = false;
    }
});

// Register service worker for PWA
registerServiceWorker();