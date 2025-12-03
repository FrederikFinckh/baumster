import './style.css';
import { isAuthenticated, getStoredToken, logout } from './auth';

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

async function fetchPlaylistData(playlistId: string, accessToken: string): Promise<any> {
    const response = await fetch(
        `https://api.spotify.com/v1/playlists/${playlistId}?fields=name,tracks.items(track(name,artists(name),album(name,release_date)))`,
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
            throw new Error(`Failed to fetch playlist: ${response.statusText}`);
        }
    }

    return await response.json();
}

function extractReleaseYear(releaseDate: string): string {
    if (!releaseDate) return 'Unknown';
    const year = releaseDate.split('-')[0];
    return year;
}

function displayPlaylistData(data: any): void {
    playlistName.textContent = data.name || 'Unknown Playlist';
    tracksTableBody.innerHTML = '';

    if (!data.tracks || !data.tracks.items || data.tracks.items.length === 0) {
        const row = tracksTableBody.insertRow();
        const cell = row.insertCell();
        cell.colSpan = 4;
        cell.textContent = 'No tracks found in this playlist.';
        cell.style.textAlign = 'center';
        return;
    }

    data.tracks.items.forEach((item: any, index: number) => {
        const track = item.track;
        if (!track) return;

        const row = tracksTableBody.insertRow();

        const numberCell = row.insertCell();
        numberCell.textContent = (index + 1).toString();

        const artistCell = row.insertCell();
        const artists = track.artists?.map((artist: any) => artist.name).join(', ') || 'Unknown Artist';
        artistCell.textContent = artists;

        const nameCell = row.insertCell();
        nameCell.textContent = track.name || 'Unknown Track';

        const yearCell = row.insertCell();
        const releaseYear = extractReleaseYear(track.album?.release_date);
        yearCell.textContent = releaseYear;
    });

    playlistResults.style.display = 'block';
    errorMessage.style.display = 'none';
}

function showError(message: string): void {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    playlistResults.style.display = 'none';
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

        const data = await fetchPlaylistData(playlistId, accessToken);
        displayPlaylistData(data);
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