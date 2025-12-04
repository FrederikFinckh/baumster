# PDF QR Card Generation Implementation Plan

## Goal
Add a button to the playlists page that generates a printable PDF with double-sided QR code cards, matching the layout from PdfOutput_EXAMPLE.tsx.example.

## Example Analysis

The example component creates:
- Double-sided printable cards (metadata on front, QR code on back)
- 3x4 grid layout (12 cards per A4 page)
- Card size: 6.2cm x 6.2cm
- Cut lines for precision cutting
- QR codes: 4cm size, centered
- Front displays: Artist name, Year (large and bold), Song name

## Current Implementation Gap

The playlists.ts file currently has a TrackData interface with number, artist, songName, and releaseYear fields. It lacks the url field needed for QR code generation.

The Spotify API call fetches track name, artists, and release date but not track IDs.

## Required Changes

### 1. Data Model Updates
Add url field to TrackData interface in src/playlists.ts

### 2. API Changes
Modify the Spotify API fields parameter in fetchPlaylistData function to include track ID

### 3. URL Storage
Generate Spotify URLs from track IDs and store them in the playlistData array

### 4. Dependencies
Install jspdf and qrcode npm packages plus TypeScript types

### 5. PDF Generation Module
Create new file src/pdf-generator.ts with:
- PDFGenerator class
- Methods for creating front and back pages
- QR code generation function
- Cut line drawing logic
- Helper function to convert TrackData to CardData format

### 6. UI Button
Add "Create PDF" button to playlists.html in the playlistResults section

### 7. Event Handler
Wire up button click event in src/playlists.ts to trigger PDF generation

### 8. Styling
Add CSS for the PDF button section to src/style.css

## Technical Details

### PDF Layout Calculations
- Page format: A4 portrait (210mm x 297mm)
- Page padding: 30mm on all sides
- Card dimensions: 62mm x 62mm
- Cards per row: 3
- Cards per column: 4
- Total per page: 12

### QR Code Specifications
- Size: 40mm x 40mm
- Error correction level: H (highest)
- Output format: PNG data URL
- Render resolution: 400px

### Double-Sided Printing
Critical implementation detail: The back page must have cards in REVERSE order for proper alignment when printing double-sided with flip on short edge.

Front page order: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12
Back page order: 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1

### Cut Lines
Draw border guidelines:
- Corner markers (small L-shapes)
- Vertical lines between columns
- Horizontal lines between rows
- Outer page border

## Implementation Workflow

### Phase 1: Data Structure
1. Update TrackData interface with url field
2. Modify fetchPlaylistData to request track IDs
3. Update displayPlaylistData to generate and store URLs

### Phase 2: Setup Dependencies
1. Run: pnpm add jspdf qrcode
2. Run: pnpm add -D @types/qrcode

### Phase 3: Create PDF Module
1. Create src/pdf-generator.ts
2. Implement PDFGenerator class with all required methods
3. Export convertToCardData helper function

### Phase 4: UI Integration
1. Add button element to playlists.html
2. Import PDF generator in src/playlists.ts
3. Add button reference and click handler
4. Implement loading state during generation

### Phase 5: Styling
1. Add css for pdf-action-section
2. Style button for consistent appearance

### Phase 6: Testing
1. Test with small playlist (under 12 tracks)
2. Test with large playlist (over 12 tracks)
3. Verify QR codes scan correctly
4. Test double-sided printing alignment
5. Verify cut lines are accurate

## Testing Checklist

Functional Tests:
- Button appears after loading playlist
- Button disables during PDF generation
- PDF file downloads successfully
- Filename is descriptive
- Works with 1 track
- Works with exactly 12 tracks
- Works with 13+ tracks (multiple pages)
- User edits to table data are included

Visual Tests:
- Front pages display all metadata
- Text is properly sized
- Text is centered in cards
- Year is large and bold
- No text overflow
- Cut lines are visible
- Cut lines align with measurements

QR Code Tests:
- QR codes are centered
- QR codes are 4cm size
- QR codes scan successfully
- URLs open correct Spotify tracks
- High contrast for scanning

Print Tests:
- 12 cards fit on A4 page
- Cut lines align with actual edges
- Double-sided alignment works
- Multiple pages print correctly

## Files to Create/Modify

New Files:
- src/pdf-generator.ts

Modified Files:
- src/playlists.ts (data model, API call, button handler)
- playlists.html (add button)
- src/style.css (button styles)
- package.json (dependencies)

## Success Criteria

The implementation is successful when:
1. Clicking the button generates and downloads a PDF
2. PDF contains front pages with artist, year, song name
3. PDF contains back pages with QR codes
4. QR codes scan to correct Spotify track URLs
5. Layout matches the 3x4 grid specification
6. Cut lines are accurate for cutting cards
7. User table edits are reflected in the PDF
8. Generation is fast (under 3 seconds for 50 tracks)

## Migration Notes

The example uses React and @react-pdf/renderer. We are implementing with vanilla TypeScript and jsPDF instead.

Key differences:
- React uses JSX components, we use imperative drawing calls
- React uses flexbox layout, we calculate positions manually
- React has declarative styling, we use imperative methods
- React auto-wraps text, we specify maxWidth manually

Benefits of jsPDF approach:
- No React dependency (maintains vanilla TS architecture)
- Smaller bundle size
- Direct control over rendering
- More predictable output

## Ready for Implementation

This plan provides all necessary specifications for implementing the PDF QR card generation feature. All modifications are clearly defined with file locations and implementation details. Ready to switch to Code mode for implementation.