import './style.css';
import { PDFGenerator } from './pdf-generator';
import { registerServiceWorker } from './pwa';
import { TableManager } from './table-manager';
import type { TrackData } from './table-manager';

const jsonInput = document.getElementById('jsonInput') as HTMLTextAreaElement;
const loadJsonBtn = document.getElementById('loadJsonBtn') as HTMLButtonElement;
const errorMessage = document.getElementById('errorMessage') as HTMLDivElement;
const jsonResults = document.getElementById('jsonResults') as HTMLDivElement;
const jsonTitle = document.getElementById('jsonTitle') as HTMLHeadingElement;
const tracksTableBody = document.getElementById('tracksTableBody') as HTMLTableSectionElement;
const backBtn = document.getElementById('backBtn') as HTMLButtonElement;
const tracksTable = document.getElementById('tracksTable') as HTMLTableElement;
const createPdfBtn = document.getElementById('createPdfBtn') as HTMLButtonElement;

// Create table manager instance
const tableManager = new TableManager({
  tableBody: tracksTableBody,
  table: tracksTable,
  title: jsonTitle,
  resultsContainer: jsonResults,
  errorMessage: errorMessage
});

// Display JSON data in table
function displayJsonData(data: TrackData[]): void {
  // Display data using table manager
  tableManager.displayData(data, 'Imported Data');
}

function showError(message: string): void {
  tableManager.showError(message);
}

loadJsonBtn.addEventListener('click', () => {
  const input = jsonInput.value.trim();

  if (!input) {
    showError('Please paste JSON data.');
    return;
  }

  try {
    loadJsonBtn.disabled = true;
    loadJsonBtn.textContent = 'Loading...';

    const data = JSON.parse(input);

    if (!TableManager.validateTrackData(data)) {
      showError('Invalid JSON format. Please ensure your data matches the expected structure with number, artist, songName, releaseYear, and url fields.');
      return;
    }

    displayJsonData(data);
  } catch (error) {
    if (error instanceof SyntaxError) {
      showError('Invalid JSON syntax. Please check your data and try again.');
    } else {
      showError('An error occurred while processing the JSON data. Please try again.');
    }
  } finally {
    loadJsonBtn.disabled = false;
    loadJsonBtn.textContent = 'Load JSON';
  }
});

jsonInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    loadJsonBtn.click();
  }
});

backBtn.addEventListener('click', () => {
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

// Register service worker for PWA
registerServiceWorker();