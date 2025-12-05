/**
 * PWA Service Worker Registration
 * Registers the minimal pass-through service worker for Baumster
 */

export function registerServiceWorker(): void {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker
                .register('/sw.js')
                .then((registration) => {
                    console.log('✅ Service Worker registered successfully');
                    console.log('   Scope:', registration.scope);

                    // Log when updates are available
                    registration.addEventListener('updatefound', () => {
                        console.log('🔄 Service Worker update found');
                    });
                })
                .catch((error) => {
                    console.error('❌ Service Worker registration failed:', error);
                });
        });
    } else {
        console.log('⚠️ Service Workers not supported in this browser');
    }
}