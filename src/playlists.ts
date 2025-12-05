import './style.css';
import { isAuthenticated, getStoredToken, logout } from './auth';
import { PDFGenerator, convertToCardData } from './pdf-generator';
import { registerServiceWorker } from './pwa';

if (!isAuthenticated()) {
    window.location.href = '/';
}

// Interface for track data structure
interface TrackData {
    number: string;
    artist: string;
    songName: string;
    releaseYear: string;
    url: string;
}

// Global variable to store editable playlist data
let playlistData: TrackData[] = [];

// Function to get current playlist data
export function getPlaylistData(): TrackData[] {
    return playlistData;
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

// Make table columns resizable
function makeColumnsResizable() {
    const table = tracksTable;
    const cols = table.querySelectorAll('th');

    cols.forEach((col) => {
        const resizer = document.createElement('div');
        resizer.className = 'column-resizer';
        col.appendChild(resizer);

        let startX: number;
        let startWidth: number;

        resizer.addEventListener('mousedown', (e: MouseEvent) => {
            e.preventDefault();
            startX = e.pageX;
            startWidth = col.offsetWidth;

            const mouseMoveHandler = (e: MouseEvent) => {
                const width = startWidth + (e.pageX - startX);
                col.style.width = `${width}px`;
                col.style.minWidth = `${width}px`;
            };

            const mouseUpHandler = () => {
                document.removeEventListener('mousemove', mouseMoveHandler);
                document.removeEventListener('mouseup', mouseUpHandler);
            };

            document.addEventListener('mousemove', mouseMoveHandler);
            document.addEventListener('mouseup', mouseUpHandler);
        });
    });
}

// Check if artist field contains multiple artists (has comma)
function hasMultipleArtists(artistValue: string): boolean {
    return artistValue.includes(',');
}

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
        `https://api.spotify.com/v1/playlists/${playlistId}?fields=name,tracks.items(track(id,name,artists(name),album(name,release_date)))`,
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

    // Reset and populate the playlistData array
    playlistData = [];

    data.tracks.items.forEach((item: any, index: number) => {
        const track = item.track;
        if (!track) return;

        const row = tracksTableBody.insertRow();

        // Extract initial values
        const number = (index + 1).toString();
        const artists = track.artists?.map((artist: any) => artist.name).join(', ') || 'Unknown Artist';
        const songName = track.name || 'Unknown Track';
        const releaseYear = extractReleaseYear(track.album?.release_date);
        const trackUrl = `https://open.spotify.com/track/${track.id}`;

        // Add to playlistData array
        playlistData.push({
            number,
            artist: artists,
            songName,
            releaseYear,
            url: trackUrl
        });

        // Create editable input fields for each cell

        // Number cell - editable
        const numberCell = row.insertCell();
        const numberInput = document.createElement('input');
        numberInput.type = 'text';
        numberInput.value = number;
        numberInput.className = 'editable-cell';
        numberInput.dataset.index = index.toString();
        numberInput.dataset.field = 'number';
        numberInput.addEventListener('input', (e) => {
            const target = e.target as HTMLInputElement;
            const idx = parseInt(target.dataset.index || '0');
            playlistData[idx].number = target.value;
        });
        numberCell.appendChild(numberInput);

        // Artist cell - editable with multi-artist highlighting
        const artistCell = row.insertCell();
        const artistInput = document.createElement('input');
        artistInput.type = 'text';
        artistInput.value = artists;
        artistInput.className = 'editable-cell';
        artistInput.dataset.index = index.toString();
        artistInput.dataset.field = 'artist';

        // Highlight if multiple artists
        if (hasMultipleArtists(artists)) {
            artistInput.classList.add('multi-artist');
        }

        artistInput.addEventListener('input', (e) => {
            const target = e.target as HTMLInputElement;
            const idx = parseInt(target.dataset.index || '0');
            playlistData[idx].artist = target.value;

            // Update highlight based on whether there are multiple artists
            if (hasMultipleArtists(target.value)) {
                target.classList.add('multi-artist');
            } else {
                target.classList.remove('multi-artist');
            }
        });
        artistCell.appendChild(artistInput);

        // Song Name cell - editable
        const nameCell = row.insertCell();
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.value = songName;
        nameInput.className = 'editable-cell';
        nameInput.dataset.index = index.toString();
        nameInput.dataset.field = 'songName';
        nameInput.addEventListener('input', (e) => {
            const target = e.target as HTMLInputElement;
            const idx = parseInt(target.dataset.index || '0');
            playlistData[idx].songName = target.value;
        });
        nameCell.appendChild(nameInput);

        // Release Year cell - editable
        const yearCell = row.insertCell();
        const yearInput = document.createElement('input');
        yearInput.type = 'text';
        yearInput.value = releaseYear;
        yearInput.className = 'editable-cell';
        yearInput.dataset.index = index.toString();
        yearInput.dataset.field = 'releaseYear';
        yearInput.addEventListener('input', (e) => {
            const target = e.target as HTMLInputElement;
            const idx = parseInt(target.dataset.index || '0');
            playlistData[idx].releaseYear = target.value;
        });
        yearCell.appendChild(yearInput);
    });

    playlistResults.style.display = 'block';
    errorMessage.style.display = 'none';

    // Make columns resizable after table is rendered
    makeColumnsResizable();
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

createPdfBtn.addEventListener('click', async () => {
    try {
        createPdfBtn.disabled = true;
        createPdfBtn.textContent = 'Generating PDF...';

        const cardData = convertToCardData(playlistData);
        const generator = new PDFGenerator();
        await generator.generatePDF(cardData);

        createPdfBtn.textContent = 'Create PDF';
    } catch (error) {
        console.error('PDF generation failed:', error);
        alert('Failed to generate PDF. Please try again.');
    } finally {
        createPdfBtn.disabled = false;
        createPdfBtn.textContent = 'Create PDF';
    }
});

// Register service worker for PWA
registerServiceWorker();