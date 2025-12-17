// Interface for track data structure
export interface TrackData {
  number: string;
  artist: string;
  songName: string;
  releaseYear: string;
  url: string;
}

// Table manager configuration
export interface TableConfig {
  tableBody: HTMLTableSectionElement;
  table: HTMLTableElement;
  title?: HTMLHeadingElement;
  resultsContainer?: HTMLElement;
  errorMessage?: HTMLDivElement;
}

export class TableManager {
  private playlistData: TrackData[] = [];
  private config: TableConfig;
  private currentEditingIndex: number | null = null;
  private modalOverlay: HTMLElement | null = null;

  constructor(config: TableConfig) {
    this.config = config;
  }

  // Function to get current playlist data
  public getPlaylistData(): TrackData[] {
    return this.playlistData;
  }

  // Set playlist data
  public setPlaylistData(data: TrackData[]): void {
    this.playlistData = [...data];
  }

  // Make table columns resizable
  public makeColumnsResizable(): void {
    const table = this.config.table;
    const cols = table.querySelectorAll('th');

    cols.forEach((col) => {
      // Remove existing resizers to avoid duplicates
      const existingResizer = col.querySelector('.column-resizer');
      if (existingResizer) {
        existingResizer.remove();
      }

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
  public hasMultipleArtists(artistValue: string): boolean {
    return artistValue.includes(',');
  }

  // Display data in table (non-editable cells)
  public displayData(data: TrackData[], title?: string): void {
    // Update title if provided
    if (this.config.title && title) {
      this.config.title.textContent = title;
    }

    // Clear table body
    this.config.tableBody.innerHTML = '';

    if (data.length === 0) {
      const row = this.config.tableBody.insertRow();
      const cell = row.insertCell();
      cell.colSpan = 4;
      cell.textContent = 'No tracks found.';
      cell.style.textAlign = 'center';
      return;
    }

    // Reset and populate the playlistData array
    this.setPlaylistData(data);

    data.forEach((track: TrackData, index: number) => {
      const row = this.config.tableBody.insertRow();

      // Make row clickable for card preview
      row.style.cursor = 'pointer';
      row.addEventListener('click', () => {
        this.openCardPreview(index);
      });

      // Create non-editable display cells
      const numberCell = row.insertCell();
      numberCell.textContent = track.number;
      numberCell.className = 'table-cell';
      numberCell.style.width = '50px'; // Minimal width for up to 3 digits
      numberCell.style.textAlign = 'center';

      const artistCell = row.insertCell();
      artistCell.textContent = track.artist;
      artistCell.className = 'table-cell';

      // Highlight if multiple artists
      if (this.hasMultipleArtists(track.artist)) {
        artistCell.classList.add('multi-artist');
      }

      // Highlight if text is too long
      if (track.artist.length > 50) {
        row.style.backgroundColor = '#ffff99'; // Light yellow
      }

      const nameCell = row.insertCell();
      nameCell.textContent = track.songName;
      nameCell.className = 'table-cell';

      // Highlight row if song name is too long
      if (track.songName.length > 50) {
        row.style.backgroundColor = '#ffff99'; // Light yellow
      }

      const yearCell = row.insertCell();
      yearCell.textContent = track.releaseYear;
      yearCell.className = 'table-cell';
    });

    // Show results container if provided
    if (this.config.resultsContainer) {
      this.config.resultsContainer.style.display = 'block';
    }

    // Hide error message if provided
    if (this.config.errorMessage) {
      this.config.errorMessage.style.display = 'none';
    }

    // Make columns resizable after table is rendered
    this.makeColumnsResizable();
  }

  // Show error message
  public showError(message: string): void {
    if (this.config.errorMessage) {
      this.config.errorMessage.textContent = message;
      this.config.errorMessage.style.display = 'block';
    }

    if (this.config.resultsContainer) {
      this.config.resultsContainer.style.display = 'none';
    }
  }

  // Validate JSON data structure
  public static validateTrackData(data: any[]): boolean {
    if (!Array.isArray(data)) {
      return false;
    }

    return data.every((item: any) => {
      return (
        typeof item === 'object' &&
        item !== null &&
        typeof item.number === 'string' &&
        typeof item.artist === 'string' &&
        typeof item.songName === 'string' &&
        typeof item.releaseYear === 'string' &&
        typeof item.url === 'string'
      );
    });
  }

  // Open card preview modal
  private openCardPreview(index: number): void {
    this.currentEditingIndex = index;
    const track = this.playlistData[index];

    // Create modal overlay if it doesn't exist
    if (!this.modalOverlay) {
      this.createModalOverlay();
    }

    // Update modal content
    this.updateModalContent(track);

    // Show modal
    if (this.modalOverlay) {
      this.modalOverlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  // Create modal overlay
  private createModalOverlay(): void {
    this.modalOverlay = document.createElement('div');
    this.modalOverlay.className = 'modal-overlay';

    this.modalOverlay.innerHTML = `
            <div class="card-preview-modal">
                <button class="close-modal-btn">&times;</button>
                <div class="card-preview-container">
                    <div class="card-preview">
                        <div class="card-artist-display"></div>
                        <div class="card-year-display"></div>
                        <div class="card-song-display"></div>
                    </div>
                    <div class="card-preview-actions">
                        <button class="btn-edit">Edit</button>
                        <button class="btn-close">Close</button>
                    </div>
                </div>
            </div>
        `;

    document.body.appendChild(this.modalOverlay);

    // Add event listeners
    const closeBtn = this.modalOverlay.querySelector('.close-modal-btn');
    const editBtn = this.modalOverlay.querySelector('.btn-edit');
    const closeActionBtn = this.modalOverlay.querySelector('.btn-close');

    closeBtn?.addEventListener('click', () => {
      this.closeModal();
    });

    editBtn?.addEventListener('click', () => {
      this.toggleEditMode();
    });

    closeActionBtn?.addEventListener('click', () => {
      // In edit mode, this acts as cancel
      // In view mode, this acts as close
      if (editBtn?.textContent === 'Save') {
        this.cancelEdit();
      } else {
        this.closeModal();
      }
    });

    // Close modal when clicking outside
    this.modalOverlay.addEventListener('click', (e) => {
      if (e.target === this.modalOverlay) {
        this.closeModal();
      }
    });

    // Close modal with ESC key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modalOverlay?.classList.contains('active')) {
        this.closeModal();
      }
    });
  }

  // Update modal content with track data
  private updateModalContent(track: TrackData): void {
    if (!this.modalOverlay) return;

    // Update display elements
    const artistDisplay = this.modalOverlay.querySelector('.card-artist-display') as HTMLDivElement;
    const yearDisplay = this.modalOverlay.querySelector('.card-year-display') as HTMLDivElement;
    const songDisplay = this.modalOverlay.querySelector('.card-song-display') as HTMLDivElement;

    if (artistDisplay && yearDisplay && songDisplay) {
      artistDisplay.textContent = track.artist;
      yearDisplay.textContent = track.releaseYear;
      songDisplay.textContent = track.songName;
    }

    // Ensure we're in view mode
    this.ensureViewMode();
  }

  // Ensure we're in view mode (for initial load)
  private ensureViewMode(): void {
    if (!this.modalOverlay) return;

    // Get buttons
    const editBtn = this.modalOverlay.querySelector('.btn-edit') as HTMLButtonElement;
    const closeBtn = this.modalOverlay.querySelector('.btn-close') as HTMLButtonElement;

    // Update button texts if needed
    if (editBtn && closeBtn) {
      editBtn.textContent = 'Edit';
      closeBtn.textContent = 'Close';
    }
  }

  // Toggle between view and edit modes
  private toggleEditMode(): void {
    if (!this.modalOverlay) return;

    const editBtn = this.modalOverlay.querySelector('.btn-edit') as HTMLButtonElement;
    const closeBtn = this.modalOverlay.querySelector('.btn-close') as HTMLButtonElement;

    if (editBtn && closeBtn) {
      if (editBtn.textContent === 'Edit') {
        // Switch to edit mode
        this.setEditMode();
      } else {
        // Switch to view mode (save changes)
        this.saveCardChanges();
      }
    }
  }

  // Set view mode (read-only display)
  private setViewMode(): void {
    if (!this.modalOverlay || this.currentEditingIndex === null) return;

    const track = this.playlistData[this.currentEditingIndex];

    // Get display elements
    const artistDisplay = this.modalOverlay.querySelector('.card-artist-display') as HTMLDivElement;
    const yearDisplay = this.modalOverlay.querySelector('.card-year-display') as HTMLDivElement;
    const songDisplay = this.modalOverlay.querySelector('.card-song-display') as HTMLDivElement;

    // Get input elements (if they exist from edit mode)
    const artistInput = this.modalOverlay.querySelector('.card-artist-input') as HTMLTextAreaElement;
    const yearInput = this.modalOverlay.querySelector('.card-year-input') as HTMLInputElement;
    const songInput = this.modalOverlay.querySelector('.card-song-input') as HTMLTextAreaElement;

    // Get buttons
    const editBtn = this.modalOverlay.querySelector('.btn-edit') as HTMLButtonElement;
    const closeBtn = this.modalOverlay.querySelector('.btn-close') as HTMLButtonElement;

    // Replace inputs with display elements if needed
    if (artistInput && yearInput && songInput) {
      // Replace artist input with display
      const newArtistDisplay = document.createElement('div');
      newArtistDisplay.className = 'card-artist-display';
      newArtistDisplay.textContent = artistInput.value;
      artistInput.replaceWith(newArtistDisplay);

      // Replace year input with display
      const newYearDisplay = document.createElement('div');
      newYearDisplay.className = 'card-year-display';
      newYearDisplay.textContent = yearInput.value;
      yearInput.replaceWith(newYearDisplay);

      // Replace song input with display
      const newSongDisplay = document.createElement('div');
      newSongDisplay.className = 'card-song-display';
      newSongDisplay.textContent = songInput.value;
      songInput.replaceWith(newSongDisplay);
    }

    // Update display content if we have the elements
    const updatedArtistDisplay = this.modalOverlay.querySelector('.card-artist-display') as HTMLDivElement;
    const updatedYearDisplay = this.modalOverlay.querySelector('.card-year-display') as HTMLDivElement;
    const updatedSongDisplay = this.modalOverlay.querySelector('.card-song-display') as HTMLDivElement;

    if (updatedArtistDisplay && updatedYearDisplay && updatedSongDisplay) {
      updatedArtistDisplay.textContent = track.artist;
      updatedYearDisplay.textContent = track.releaseYear;
      updatedSongDisplay.textContent = track.songName;
    }

    // Update button texts
    if (editBtn && closeBtn) {
      editBtn.textContent = 'Edit';
      closeBtn.textContent = 'Close';
    }
  }

  // Set edit mode (with input fields)
  private setEditMode(): void {
    if (!this.modalOverlay || this.currentEditingIndex === null) return;

    const track = this.playlistData[this.currentEditingIndex];

    // Get display elements
    const artistDisplay = this.modalOverlay.querySelector('.card-artist-display') as HTMLDivElement;
    const yearDisplay = this.modalOverlay.querySelector('.card-year-display') as HTMLDivElement;
    const songDisplay = this.modalOverlay.querySelector('.card-song-display') as HTMLDivElement;

    // Get buttons
    const editBtn = this.modalOverlay.querySelector('.btn-edit') as HTMLButtonElement;
    const closeBtn = this.modalOverlay.querySelector('.btn-close') as HTMLButtonElement;

    // Replace display elements with inputs
    if (artistDisplay && yearDisplay && songDisplay) {
      // Replace artist display with input
      const artistInput = document.createElement('textarea');
      artistInput.className = 'card-artist-input';
      artistInput.value = artistDisplay.textContent || '';
      artistDisplay.replaceWith(artistInput);

      // Replace year display with input
      const yearInput = document.createElement('input');
      yearInput.type = 'text';
      yearInput.className = 'card-year-input';
      yearInput.value = yearDisplay.textContent || '';
      yearDisplay.replaceWith(yearInput);

      // Replace song display with input
      const songInput = document.createElement('textarea');
      songInput.className = 'card-song-input';
      songInput.value = songDisplay.textContent || '';
      songDisplay.replaceWith(songInput);
    }

    // Update button texts
    if (editBtn && closeBtn) {
      editBtn.textContent = 'Save';
      closeBtn.textContent = 'Cancel';
    }
  }

  // Cancel edit mode
  private cancelEdit(): void {
    this.setViewMode();
  }

  // Save card changes
  private saveCardChanges(): void {
    if (this.currentEditingIndex === null || !this.modalOverlay) return;

    const artistInput = this.modalOverlay.querySelector('.card-artist-input') as HTMLTextAreaElement;
    const yearInput = this.modalOverlay.querySelector('.card-year-input') as HTMLInputElement;
    const songInput = this.modalOverlay.querySelector('.card-song-input') as HTMLTextAreaElement;

    if (artistInput && yearInput && songInput) {
      // Update the data
      this.playlistData[this.currentEditingIndex].artist = artistInput.value;
      this.playlistData[this.currentEditingIndex].releaseYear = yearInput.value;
      this.playlistData[this.currentEditingIndex].songName = songInput.value;

      // Update the table display
      this.refreshTableDisplay();

      // Switch back to view mode
      this.setViewMode();
    }
  }

  // Close modal
  private closeModal(): void {
    if (this.modalOverlay) {
      this.modalOverlay.classList.remove('active');
      document.body.style.overflow = '';
    }
    this.currentEditingIndex = null;
  }

  // Refresh table display
  private refreshTableDisplay(): void {
    // Re-display the data to update the table
    const title = this.config.title?.textContent || undefined;
    this.displayData(this.playlistData, title);
  }
}
