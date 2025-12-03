import './style.css';
import { isAuthenticated, getStoredToken, logout } from './auth';

// Check if authenticated
if (!isAuthenticated()) {
    window.location.href = '/';
} else {
    // Display token status
    const token = getStoredToken();
    const tokenStatus = document.getElementById('tokenStatus');
    if (tokenStatus) {
        tokenStatus.textContent = `Token received: ${token?.substring(0, 20)}...`;
    }

    // Setup logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            logout();
            window.location.href = '/';
        });
    }
}