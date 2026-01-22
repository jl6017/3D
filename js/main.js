// Main application entry point
import { initScene, updateCameraFromHead, render } from './scene.js';
import { initTracker, getHeadPosition, getTrackingMode } from './tracker.js';

// DOM Elements
let canvasContainer;
let statusOverlay;
let statusText;
let debugInfo;

// Application state
let isInitialized = false;

/**
 * Initialize the application
 */
async function init() {
    // Get DOM elements
    canvasContainer = document.getElementById('canvas-container');
    statusOverlay = document.getElementById('status-overlay');
    statusText = document.getElementById('status-text');
    debugInfo = document.getElementById('debug-info');

    try {
        // Initialize 3D scene
        updateStatus('Initializing 3D scene...');
        initScene(canvasContainer);

        // Initialize head tracker
        updateStatus('Initializing head tracking...');
        const webcamElement = document.getElementById('webcam');

        await initTracker({
            videoElement: webcamElement,
            onPositionUpdate: handlePositionUpdate,
            onStatusChange: updateStatus
        });

        // Hide status overlay after successful init
        setTimeout(() => {
            statusOverlay.classList.add('hidden');
        }, 1000);

        isInitialized = true;

        // Start render loop
        animate();

    } catch (error) {
        console.error('Initialization error:', error);
        showError(`Failed to initialize: ${error.message}`);
    }
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
