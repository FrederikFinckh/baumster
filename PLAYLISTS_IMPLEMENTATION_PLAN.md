# Playlists Feature Implementation Plan

## Overview
Add a playlists page to the Baumster app where users can input a Spotify playlist URL and view a table with track information.

## Requirements Analysis

Based on the Spotify API documentation ([`playlists_api.html`](playlists_api.html)), the GET /playlists/{playlist_id} endpoint returns:
- Playlist metadata (name, description, owner, etc.)
- Tracks array with pagination
- Each track contains: artists, name, album (with release_date), track_number

## Design Decisions

1. **Number Column**: Use track position in playlist (1, 2, 3...)
2. **Artist Display**: Show all artists separated by commas
3. **URL Input**: Accept both full URLs and playlist IDs
4. **Release Year**: Extract year from album.release_date

## Files to Modify/Create

### 1. [`index.html`](index.html:1) - Add Playlists Button
**Changes:**
- Add a new "Go to Playlists" button in the auth-section (only visible when authenticated)
- Position it between Scanner and Logout buttons

**Add after line 28:**
```html
<button id="playlistsBtn" class="btn-primary" style="display: none;">Go to Playlists</button>
```

### 2. [`src/main.ts`](src/main.ts:1) - Handle Playlists Button
**Changes:**
- Get reference to playlistsBtn
- Show/hide based on authentication status
- Add click handler to navigate to playlists.html

**Add to main.ts:**
```typescript
const playlistsBtn = document.getElementById('playlistsBtn') as HTMLButtonElement;

if (isAuthenticated()) {
  if (playlistsBtn) {
    playlistsBtn.style.display = 'block';
    playlistsBtn.addEventListener('click', () => {
      window.location.href = '/playlists.html';
    });
  }
} else {
  if (playlistsBtn) {
    playlistsBtn.style.display = 'none';
  }
}
```

### 3. `playlists.html` - New File
**Structure:**
- Header with app name and back button
- Input field for playlist URL
- Load button to fetch data
- Results section with table
- Error message display area

**Complete file content:**
```html
<!doctype html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Baumster - Playlists</title>
</head>
<body>
    <div id="app">
        <div class="container">
            <h1>🎵 Baumster</h1>
            <h2>Playlist Viewer</h2>
            
            <div class="playlist-input-section">
                <label for="playlistUrl">Enter Spotify Playlist URL or ID:</label>
                <input 
                    type="text" 
                    id="playlistUrl" 
                    placeholder="https://open.spotify.com/playlist/... or playlist ID"
                    class="playlist-input"
                />
                <button id="loadPlaylistBtn" class="btn-primary">Load Playlist</button>
            </div>

            <div id="errorMessage" class="error-message" style="display: none;"></div>
            
            <div id="playlistResults" style="display: none;">
                <h3 id="playlistName"></h3>
                <div class="table-container">
                    <table id="tracksTable">
                        <thead>
                            <tr>
                                <th>Number</th>
                                <th>Artist</th>
                                <th>Song Name</th>
                                <th>Release Year</th>
                            </tr>
                        </thead>
                        <tbody id="tracksTableBody">
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="navigation">
                <button id="backBtn" class="btn-secondary">Back to Home</button>
                <button id="logoutBtn" class="btn-secondary">Logout</button>
            </div>
        </div>
    </div>
    <script type="module" src="/src/playlists.ts"></script>
</body>
</html>
```

### 4. `src/playlists.ts` - New File

**Complete implementation with all functions:**

```typescript
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
```

### 5. [`src/style.css`](src/style.css:1) - Add Playlist Styles

**Styles to add at the end of the file:**
```css
.playlist-input-section {
    margin: 2rem 0;
}

.playlist-input-section label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
}

.playlist-input {
    width: 100%;
    padding: 0.75rem;
    font-size: 1rem;
    border: 2px solid #ccc;
    border-radius: 4px;
    margin-bottom: 1rem;
    box-sizing: border-box;
}

.playlist-input:focus {
    outline: none;
    border-color: #1DB954;
}

.error-message {
    background-color: #f8d7da;
    color: #721c24;
    padding: 1rem;
    border-radius: 4px;
    margin: 1rem 0;
    border: 1px solid #f5c6cb;
}

.table-container {
    overflow-x: auto;
    margin: 1rem 0;
}

#tracksTable {
    width: 100%;
    border-collapse: collapse;
    background: white;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

#tracksTable th {
    background-color: #1DB954;
    color: white;
    padding: 1rem;
    text-align: left;
    font-weight: 600;
}

#tracksTable td {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid #eee;
}

#tracksTable tbody tr:hover {
    background-color: #f5f5f5;
}

#tracksTable tbody tr:last-child td {
    border-bottom: none;
}

.navigation {
    display: flex;
    gap: 1rem;
    margin-top: 2rem;
}

.navigation button {
    flex: 1;
}
```

### 6. Update [`src/config.ts`](src/config.ts:1) - Add Playlist Scope

**Add to scopes array:**
```typescript
'playlist-read-private',
'playlist-read-collaborative'
```

## Implementation Steps

1. ✅ Analyze Spotify API documentation
2. Update [`src/config.ts`](src/config.ts:1) to add playlist scopes
3. Update [`index.html`](index.html:1) to add Playlists button
4. Update [`src/main.ts`](src/main.ts:1) to handle Playlists button
5. Create `playlists.html` with input field and table structure
6. Create `src/playlists.ts` with all playlist functionality
7. Update [`src/style.css`](src/style.css:1) with playlist page styles
8. Test the complete flow

## Key Functions in playlists.ts

**extractPlaylistId(input: string): string | null**
- Handles full URLs, URI format, and raw IDs
- Regex patterns match various Spotify playlist formats

**fetchPlaylistData(playlistId: string, accessToken: string): Promise<any>**
- Makes GET request to Spotify API
- Uses fields parameter to optimize response size
- Handles 404 (not found) and 401 (unauthorized) errors

**extractReleaseYear(releaseDate: string): string**
- Parses YYYY, YYYY-MM, or YYYY-MM-DD formats
- Returns first 4 characters (year)

**displayPlaylistData(data: any): void**
- Sets playlist name
- Iterates through tracks and creates table rows
- Handles missing or null tracks

**showError(message: string): void**
- Displays user-friendly error messages
- Hides results table

## Testing Checklist

- [ ] Playlists button appears when logged in
- [ ] Playlists button is hidden when not logged in
- [ ] Clicking Playlists button navigates to playlists page
- [ ] Playlists page redirects to home if not authenticated
- [ ] Can paste full Spotify playlist URL
- [ ] Can paste just playlist ID
- [ ] Table displays correct data in all columns
- [ ] Multiple artists are comma-separated
- [ ] Error messages display for invalid URLs
- [ ] Error messages display for network errors
- [ ] Back button returns to home page
- [ ] Logout button works from playlists page

## API Response Structure

The Spotify API returns this structure:
```json
{
  "name": "My Awesome Playlist",
  "tracks": {
    "items": [
      {
        "track": {
          "name": "Song Title",
          "artists": [
            {"name": "Artist 1"},
            {"name": "Artist 2"}
          ],
          "album": {
            "name": "Album Name",
            "release_date": "2023-05-15"
          }
        }
      }
    ]
  }
}
```

## Edge Cases Handled

1. **Null tracks**: Skip removed/unavailable tracks
2. **Multiple artists**: Join with comma and space
3. **Missing release date**: Display "Unknown"
4. **Various date formats**: Handle YYYY, YYYY-MM, YYYY-MM-DD
5. **Invalid URL**: Show clear error message
6. **Network errors**: Catch and display user-friendly messages
7. **Expired token**: Detect 401 and redirect to login
8. **Empty playlists**: Show "No tracks found" message

## Ready for Implementation

This plan is complete and ready for implementation in Code mode.