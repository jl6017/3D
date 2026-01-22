// Main application entry point
import { initScene, updateCameraFromHead, render } from './scene.js';
import { initTracker, initMouseMode, initFaceMode, getHeadPosition, getTrackingMode, stopTracker } from './tracker.js';

// DOM Elements
let canvasContainer;
let modeOverlay;
let statusOverlay;
let statusText;
let debugInfo;
let btnBack;

// Application state
let isInitialized = false;

/**
 * Initialize the application
 */
async function init() {
    // Get DOM elements
    canvasContainer = document.getElementById('canvas-container');
    modeOverlay = document.getElementById('mode-overlay');
    statusOverlay = document.getElementById('status-overlay');
    statusText = document.getElementById('status-text');
    debugInfo = document.getElementById('debug-info');
    btnBack = document.getElementById('btn-back');

    // Initialize 3D scene first (runs in background)
    initScene(canvasContainer);

    // Apply initial off-axis projection
    updateCameraFromHead({ x: 0, y: 0, z: 0 });

    // Setup mode selection buttons
    document.getElementById('btn-mouse').addEventListener('click', () => startWithMode('mouse'));
    document.getElementById('btn-webcam').addEventListener('click', () => startWithMode('face'));

    // Setup back button
    btnBack.addEventListener('click', goBackToModeSelection);

    // Start render loop
    isInitialized = true;
    animate();
}

/**
 * Start the experience with selected mode
 * @param {string} mode - 'mouse' or 'face'
 */
async function startWithMode(mode) {
    // Hide mode selection, show back button
    modeOverlay.classList.add('hidden');
    btnBack.classList.remove('hidden');

    if (mode === 'mouse') {
        // Start mouse tracking immediately
        initMouseMode({
            onPositionUpdate: handlePositionUpdate
        });
        updateDebugInfo({ x: 0, y: 0, z: 0 });
    } else {
        // Show loading status for face tracking
        statusOverlay.classList.remove('hidden');
        updateStatus('Loading face detection model...');

        try {
            await initFaceMode({
                videoElement: document.getElementById('webcam'),
                onPositionUpdate: handlePositionUpdate,
                onStatusChange: updateStatus
            });

            // Hide status overlay on success
            setTimeout(() => {
                statusOverlay.classList.add('hidden');
            }, 500);
        } catch (error) {
            console.error('Face tracking error:', error);
            showError(`Face tracking failed: ${error.message}`);

            // Offer fallback to mouse mode
            setTimeout(() => {
                if (confirm('Face tracking failed. Use mouse mode instead?')) {
                    statusOverlay.classList.add('hidden');
                    initMouseMode({
                        onPositionUpdate: handlePositionUpdate
                    });
                }
            }, 100);
        }
    }
}

/**
 * Go back to mode selection screen
 */
function goBackToModeSelection() {
    // Stop current tracking
    stopTracker();

    // Hide back button and debug info
    btnBack.classList.add('hidden');
    debugInfo.innerHTML = '';

    // Reset camera position
    updateCameraFromHead({ x: 0, y: 0, z: 0 });

    // Show mode selection
    modeOverlay.classList.remove('hidden');
}

/**
 * Handle head position updates from tracker
 * @param {Object} position - {x, y, z} normalized position
 */
function handlePositionUpdate(position) {
    // Update camera based on head position
    updateCameraFromHead(position);

    // Update debug display
    updateDebugInfo(position);
}

/**
 * Update debug information display
 * @param {Object} position - Current head position
 */
function updateDebugInfo(position) {
    const mode = getTrackingMode();
    const modeLabel = mode === 'face' ? 'Face Tracking' : 'Mouse Mode';

    debugInfo.innerHTML = `
        Mode: ${modeLabel}<br>
        X: ${position.x.toFixed(3)}<br>
        Y: ${position.y.toFixed(3)}<br>
        Z: ${position.z.toFixed(3)}
    `;
}

/**
 * Main animation loop
 */
function animate() {
    requestAnimationFrame(animate);

    if (isInitialized) {
        render();
    }
}

/**
 * Update status message
 * @param {string} message - Status message to display
 */
function updateStatus(message) {
    if (statusText) {
        statusText.textContent = message;
    }
    console.log('Status:', message);
}

/**
 * Show error message
 * @param {string} message - Error message
 */
function showError(message) {
    if (statusText) {
        statusText.innerHTML = `
            <span class="status-error">${message}</span>
            <br><br>
            <button class="permission-button" onclick="location.reload()">
                Retry
            </button>
        `;
    }
}

// Start application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
