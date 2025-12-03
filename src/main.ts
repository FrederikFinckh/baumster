import './style.css';
import { redirectToAuthCodeFlow, isAuthenticated, logout } from './auth';

// Check if already authenticated and update UI
const loginBtn = document.getElementById('loginBtn') as HTMLButtonElement;
const logoutBtn = document.getElementById('logoutBtn') as HTMLButtonElement;

if (isAuthenticated()) {
  // User is authenticated - show "Go to Scanner" button
  if (loginBtn) {
    loginBtn.textContent = 'Go to Scanner';
    loginBtn.addEventListener('click', () => {
      window.location.href = '/scanner.html';
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
  
  // Hide logout button
  if (logoutBtn) {
    logoutBtn.style.display = 'none';
  }
}
