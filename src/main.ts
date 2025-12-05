import './style.css';
import { redirectToAuthCodeFlow, isAuthenticated, logout } from './auth';
import { registerServiceWorker } from './pwa';

// Check if already authenticated and update UI
const loginBtn = document.getElementById('loginBtn') as HTMLButtonElement;
const playlistsBtn = document.getElementById('playlistsBtn') as HTMLButtonElement;
const logoutBtn = document.getElementById('logoutBtn') as HTMLButtonElement;

if (isAuthenticated()) {
  // User is authenticated - show "Go to Scanner" button
  if (loginBtn) {
    loginBtn.textContent = 'Go to Scanner';
    loginBtn.addEventListener('click', () => {
      window.location.href = '/scanner.html';
    });
  }
  
  // Show playlists button
  if (playlistsBtn) {
    playlistsBtn.style.display = 'block';
    playlistsBtn.addEventListener('click', () => {
      window.location.href = '/playlists.html';
    });
  }
  
  // Show logout button
  if (logoutBtn) {
    logoutBtn.style.display = 'block';
    logoutBtn.addEventListener('click', () => {
      logout();
      window.location.reload();
    });
  }
} else {
  // User is not authenticated - show "Connect with Spotify" button
  if (loginBtn) {
    loginBtn.addEventListener('click', () => {
      redirectToAuthCodeFlow();
    });
  }
  
  // Hide playlists button
  if (playlistsBtn) {
    playlistsBtn.style.display = 'none';
  }
  
  // Hide logout button
  if (logoutBtn) {
    logoutBtn.style.display = 'none';
  }
}

// Register service worker for PWA
registerServiceWorker();
