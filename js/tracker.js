// Head tracking module using MediaPipe FaceLandmarker

// MediaPipe modules (loaded dynamically)
let FaceLandmarker = null;
let FilesetResolver = null;

const CONFIG = {
    // Webcam settings
    videoWidth: 640,
    videoHeight: 480,

    // Smoothing factor (0 = no smoothing, 1 = infinite smoothing)
    smoothing: 0.3,

    // Detection settings
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,

    // Position scaling
    scaleX: 2.0,  // How much to amplify horizontal movement
    scaleY: 1.5,  // How much to amplify vertical movement
    scaleZ: 1.0,  // How much to amplify depth movement
};

// Module state
let faceLandmarker = null;
let videoElement = null;
let isRunning = false;
let lastVideoTime = -1;

// Current head position (normalized to [-1, 1])
let headPosition = { x: 0, y: 0, z: 0 };
let smoothedPosition = { x: 0, y: 0, z: 0 };

// Callbacks
let onPositionUpdate = null;
let onStatusChange = null;

// Tracking mode
let trackingMode = 'none'; // 'face', 'mouse', 'none'

/**
 * Initialize mouse-based tracking
 * @param {Object} options - Configuration options
 */
export function initMouseMode(options = {}) {
    onPositionUpdate = options.onPositionUpdate || (() => {});

    trackingMode = 'mouse';
    isRunning = true;

    document.addEventListener('mousemove', handleMouseMove);

    console.log('Mouse mode initialized');
}

/**
 * Initialize face tracking mode
 * @param {Object} options - Configuration options
 * @returns {Promise<boolean>} - Success status
 */
export async function initFaceMode(options = {}) {
    videoElement = options.videoElement || document.getElementById('webcam');
    onPositionUpdate = options.onPositionUpdate || (() => {});
    onStatusChange = options.onStatusChange || (() => {});

    await initFaceTracking();
    return true;
}

/**
 * Legacy function for backward compatibility
 */
export async function initTracker(options = {}) {
    videoElement = options.videoElement || document.getElementById('webcam');
    onPositionUpdate = options.onPositionUpdate || (() => {});
    onStatusChange = options.onStatusChange || (() => {});

    try {
        await initFaceTracking();
        return true;
    } catch (error) {
        console.warn('Face tracking unavailable:', error.message);
        initMouseMode({ onPositionUpdate });
        return false;
    }
}

/**
 * Initialize MediaPipe FaceLandmarker
 */
async function initFaceTracking() {
    onStatusChange('Loading MediaPipe library...');

    // Dynamically import MediaPipe
    try {
        const vision = await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/vision_bundle.mjs');
        // Handle both default export and named exports
        const visionModule = vision.default || vision;
        FaceLandmarker = visionModule.FaceLandmarker;
        FilesetResolver = visionModule.FilesetResolver;
    } catch (e) {
        console.error('MediaPipe import error:', e);
        throw new Error('Failed to load MediaPipe: ' + e.message);
    }

    onStatusChange('Loading face detection model...');

    // Load the model
    const filesetResolver = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm'
    );

    faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'GPU'
        },
        runningMode: 'VIDEO',
        numFaces: 1,
        minFaceDetectionConfidence: CONFIG.minDetectionConfidence,
        minTrackingConfidence: CONFIG.minTrackingConfidence,
        outputFacialTransformationMatrixes: true,
    });

    onStatusChange('Requesting camera access...');

    // Request webcam
    const stream = await navigator.mediaDevices.getUserMedia({
        video: {
            width: { ideal: CONFIG.videoWidth },
            height: { ideal: CONFIG.videoHeight },
            facingMode: 'user'
        }
    });

    videoElement.srcObject = stream;
    videoElement.classList.remove('hidden');

    // Wait for video to be ready
    await new Promise((resolve) => {
        videoElement.onloadedmetadata = () => {
            videoElement.play();
            resolve();
        };
    });

    trackingMode = 'face';
    isRunning = true;
    onStatusChange('Face tracking active');

    // Start detection loop
    detectFace();
}

/**
 * Main face detection loop
 */
function detectFace() {
    if (!isRunning || !faceLandmarker) return;

    const currentTime = videoElement.currentTime;

    // Only process new frames
    if (currentTime !== lastVideoTime) {
        lastVideoTime = currentTime;

        try {
            const results = faceLandmarker.detectForVideo(videoElement, performance.now());

            if (results.faceLandmarks && results.faceLandmarks.length > 0) {
                const landmarks = results.faceLandmarks[0];
                extractHeadPosition(landmarks);
            }
        } catch (error) {
            console.error('Face detection error:', error);
        }
    }

    requestAnimationFrame(detectFace);
}

/**
 * Extract head position from face landmarks
 * Uses iris landmarks for accurate eye center detection
 */
function extractHeadPosition(landmarks) {
    // Iris landmark indices in MediaPipe FaceMesh
    // Left iris center: 468, Right iris center: 473
    const leftIrisIndex = 468;
    const rightIrisIndex = 473;

    // Get iris positions (or fall back to eye corners if iris not detected)
    let leftEye, rightEye;

    if (landmarks.length > rightIrisIndex) {
        // Use iris landmarks for more accuracy
        leftEye = landmarks[leftIrisIndex];
        rightEye = landmarks[rightIrisIndex];
    } else {
        // Fallback to eye corner landmarks
        leftEye = landmarks[33];  // Left eye outer corner
        rightEye = landmarks[263]; // Right eye outer corner
    }

    // Calculate eye center
    const eyeCenter = {
        x: (leftEye.x + rightEye.x) / 2,
        y: (leftEye.y + rightEye.y) / 2,
        z: (leftEye.z + rightEye.z) / 2
    };

    // Normalize to [-1, 1] range
    // Note: x is flipped because webcam is mirrored
    headPosition.x = -(eyeCenter.x - 0.5) * 2 * CONFIG.scaleX;
    headPosition.y = (eyeCenter.y - 0.5) * 2 * CONFIG.scaleY;
    headPosition.z = -eyeCenter.z * CONFIG.scaleZ; // z is depth

    // Clamp values
    headPosition.x = Math.max(-1, Math.min(1, headPosition.x));
    headPosition.y = Math.max(-1, Math.min(1, headPosition.y));
    headPosition.z = Math.max(-1, Math.min(1, headPosition.z));

    // Apply smoothing
    applySmoothing();

    // Notify callback
    onPositionUpdate(smoothedPosition);
}

/**
 * Apply exponential smoothing to reduce jitter
 */
function applySmoothing() {
    const alpha = CONFIG.smoothing;

    smoothedPosition.x = smoothedPosition.x + (headPosition.x - smoothedPosition.x) * (1 - alpha);
    smoothedPosition.y = smoothedPosition.y + (headPosition.y - smoothedPosition.y) * (1 - alpha);
    smoothedPosition.z = smoothedPosition.z + (headPosition.z - smoothedPosition.z) * (1 - alpha);
}

/**
 * Handle mouse movement for fallback tracking
 */
function handleMouseMove(event) {
    // Convert mouse position to [-1, 1] range
    // For intuitive control: mouse up = look up (see top of scene)
    headPosition.x = (event.clientX / window.innerWidth - 0.5) * 2;
    headPosition.y = (event.clientY / window.innerHeight - 0.5) * 2;
    headPosition.z = 0;

    // Apply smoothing
    applySmoothing();

    // Notify callback
    onPositionUpdate(smoothedPosition);
}

/**
 * Stop tracking
 */
export function stopTracker() {
    isRunning = false;

    if (trackingMode === 'face') {
        if (videoElement && videoElement.srcObject) {
            videoElement.srcObject.getTracks().forEach(track => track.stop());
        }
    } else if (trackingMode === 'mouse') {
        document.removeEventListener('mousemove', handleMouseMove);
    }

    trackingMode = 'none';
}

/**
 * Get current head position
 * @returns {Object} - {x, y, z} position
 */
export function getHeadPosition() {
    return { ...smoothedPosition };
}

/**
 * Get tracking mode
 * @returns {string} - 'face', 'mouse', or 'none'
 */
export function getTrackingMode() {
    return trackingMode;
}

/**
 * Check if tracker is running
 * @returns {boolean}
 */
export function isTrackerRunning() {
    return isRunning;
}

/**
 * Update smoothing factor
 * @param {number} value - Smoothing factor (0-1)
 */
export function setSmoothing(value) {
    CONFIG.smoothing = Math.max(0, Math.min(1, value));
}
