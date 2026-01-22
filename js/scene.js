import * as THREE from 'three';

// Scene configuration
const CONFIG = {
    // Virtual screen dimensions (the "window" we're looking through)
    screenWidth: 1.6,  // meters
    screenHeight: 0.9, // meters (16:9 aspect ratio)

    // Camera settings
    nearPlane: 0.1,
    farPlane: 100,

    // Scene depth
    roomDepth: 3, // How deep the virtual room extends behind the screen
};

// Scene elements
let scene, camera, renderer;
let container;

// For off-axis projection
let screenCorners = {
    bottomLeft: new THREE.Vector3(-CONFIG.screenWidth / 2, -CONFIG.screenHeight / 2, 0),
    bottomRight: new THREE.Vector3(CONFIG.screenWidth / 2, -CONFIG.screenHeight / 2, 0),
    topLeft: new THREE.Vector3(-CONFIG.screenWidth / 2, CONFIG.screenHeight / 2, 0),
};

/**
 * Initialize the Three.js scene
 * @param {HTMLElement} containerElement - DOM element to render into
 * @returns {Object} - Scene, camera, and renderer
 */
export function initScene(containerElement) {
    container = containerElement;

    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);

    // Create camera
    const aspect = window.innerWidth / window.innerHeight;
    camera = new THREE.PerspectiveCamera(60, aspect, CONFIG.nearPlane, CONFIG.farPlane);
    camera.position.set(0, 0, 1); // Start 1m in front of "screen"

    // Create renderer
    renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Setup lighting
    setupLighting();

    // Create demo scene
    createDemoScene();

    // Handle resize
    window.addEventListener('resize', onWindowResize);

    return { scene, camera, renderer };
}

/**
 * Setup scene lighting
 */
function setupLighting() {
    // Ambient light for general illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    // Main directional light (sun-like)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(2, 3, 1);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 20;
    directionalLight.shadow.camera.left = -5;
    directionalLight.shadow.camera.right = 5;
    directionalLight.shadow.camera.top = 5;
    directionalLight.shadow.camera.bottom = -5;
    scene.add(directionalLight);

    // Fill light from the opposite side
    const fillLight = new THREE.DirectionalLight(0x8888ff, 0.3);
    fillLight.position.set(-2, 1, -1);
    scene.add(fillLight);
}

/**
 * Create demo scene with objects at varying depths
 */
function createDemoScene() {
    // Create a "room" frame to emphasize the window effect
    createRoomFrame();

    // Grid floor
    const gridHelper = new THREE.GridHelper(10, 20, 0x444466, 0x333355);
    gridHelper.position.y = -0.5;
    gridHelper.position.z = -CONFIG.roomDepth / 2;
    scene.add(gridHelper);

    // Create objects at different depths
    const objects = [
        // Near objects (close to the "window")
        { type: 'box', position: [-0.5, 0, -0.3], size: [0.15, 0.15, 0.15], color: 0xff6b6b },
        { type: 'sphere', position: [0.4, -0.1, -0.4], size: 0.1, color: 0x4ecdc4 },

        // Mid-distance objects
        { type: 'box', position: [-0.3, 0.2, -1], size: [0.2, 0.2, 0.2], color: 0xffe66d },
        { type: 'torus', position: [0.5, 0, -1.2], size: [0.15, 0.05], color: 0x95e1d3 },
        { type: 'cylinder', position: [0, -0.3, -1.5], size: [0.1, 0.3], color: 0xf38181 },

        // Far objects
        { type: 'box', position: [-0.6, 0.1, -2], size: [0.25, 0.25, 0.25], color: 0xaa96da },
        { type: 'sphere', position: [0.7, 0.3, -2.2], size: 0.15, color: 0xfcbad3 },
        { type: 'cone', position: [0, 0.2, -2.5], size: [0.15, 0.3], color: 0xa8d8ea },

        // Background object
        { type: 'box', position: [0, 0, -3], size: [0.4, 0.4, 0.1], color: 0x6c5ce7 },
    ];

    objects.forEach(obj => createObject(obj));

    // Add floating particles for depth perception
    createParticles();
}

/**
 * Create a frame around the "window" to enhance the parallax effect
 */
function createRoomFrame() {
    const frameMaterial = new THREE.MeshStandardMaterial({
        color: 0x2d2d44,
        roughness: 0.8,
        metalness: 0.2
    });

    const frameDepth = 0.1;
    const frameWidth = 0.08;

    const w = CONFIG.screenWidth / 2 + frameWidth;
    const h = CONFIG.screenHeight / 2 + frameWidth;

    // Create frame pieces
    const frameGeometry = new THREE.BoxGeometry(frameWidth, CONFIG.screenHeight + frameWidth * 2, frameDepth);

    // Left frame
    const leftFrame = new THREE.Mesh(frameGeometry, frameMaterial);
    leftFrame.position.set(-w, 0, 0);
    scene.add(leftFrame);

    // Right frame
    const rightFrame = new THREE.Mesh(frameGeometry, frameMaterial);
    rightFrame.position.set(w, 0, 0);
    scene.add(rightFrame);

    // Top frame
    const topBottomGeometry = new THREE.BoxGeometry(CONFIG.screenWidth + frameWidth * 2, frameWidth, frameDepth);
    const topFrame = new THREE.Mesh(topBottomGeometry, frameMaterial);
    topFrame.position.set(0, h, 0);
    scene.add(topFrame);

    // Bottom frame
    const bottomFrame = new THREE.Mesh(topBottomGeometry, frameMaterial);
    bottomFrame.position.set(0, -h, 0);
    scene.add(bottomFrame);
}

/**
 * Create a 3D object based on specification
 */
function createObject(spec) {
    let geometry;

    switch (spec.type) {
        case 'box':
            geometry = new THREE.BoxGeometry(...spec.size);
            break;
        case 'sphere':
            geometry = new THREE.SphereGeometry(spec.size, 32, 32);
            break;
        case 'torus':
            geometry = new THREE.TorusGeometry(spec.size[0], spec.size[1], 16, 48);
            break;
        case 'cylinder':
            geometry = new THREE.CylinderGeometry(spec.size[0], spec.size[0], spec.size[1], 32);
            break;
        case 'cone':
            geometry = new THREE.ConeGeometry(spec.size[0], spec.size[1], 32);
            break;
        default:
            geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    }

    const material = new THREE.MeshStandardMaterial({
        color: spec.color,
        roughness: 0.5,
        metalness: 0.1
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...spec.position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    // Store for animation
    mesh.userData.originalPosition = [...spec.position];
    mesh.userData.rotationSpeed = {
        x: (Math.random() - 0.5) * 0.5,
        y: (Math.random() - 0.5) * 0.5,
        z: (Math.random() - 0.5) * 0.3
    };

    scene.add(mesh);
    return mesh;
}

/**
 * Create floating particles for depth perception
 */
function createParticles() {
    const particleCount = 100;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 3;     // x
        positions[i * 3 + 1] = (Math.random() - 0.5) * 2; // y
        positions[i * 3 + 2] = -Math.random() * 3;        // z (all behind screen)
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.02,
        transparent: true,
        opacity: 0.6
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);
}

/**
 * Handle window resize
 */
function onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);
}

/**
 * Update camera based on head position for off-axis projection
 * @param {Object} headPos - {x, y, z} normalized head position
 */
export function updateCameraFromHead(headPos) {
    if (!camera) return;

    // Convert normalized [-1, 1] to physical position
    // Assume viewer is ~0.5m from screen and moves +/- 0.3m side to side
    // Note: Y is already flipped in tracker.js (positive Y = up)
    const viewerX = headPos.x * 0.4;
    const viewerY = headPos.y * 0.3;
    const viewerZ = 0.6 + headPos.z * 0.2; // Base distance + depth variation

    // Update camera position
    camera.position.set(viewerX, viewerY, viewerZ);

    // Reset camera rotation to look straight ahead (down -Z axis)
    camera.rotation.set(0, 0, 0);

    // Create off-axis perspective projection
    // The screen plane is at z=0, camera is at z=viewerZ (positive)
    const near = CONFIG.nearPlane;
    const far = CONFIG.farPlane;

    // Screen half-dimensions
    const halfWidth = CONFIG.screenWidth / 2;
    const halfHeight = CONFIG.screenHeight / 2;

    // Calculate frustum edges at near plane
    // Using similar triangles: nearEdge / near = screenEdge / viewerZ
    const scale = near / viewerZ;

    const left = (-halfWidth - viewerX) * scale;
    const right = (halfWidth - viewerX) * scale;
    const bottom = (-halfHeight - viewerY) * scale;
    const top = (halfHeight - viewerY) * scale;

    // Apply off-axis projection matrix
    // Note: makePerspective parameter order is (left, right, TOP, BOTTOM, near, far)
    camera.projectionMatrix.makePerspective(left, right, top, bottom, near, far);
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
}

/**
 * Render one frame
 */
export function render() {
    // Animate objects slightly
    scene.traverse((child) => {
        if (child.isMesh && child.userData.rotationSpeed) {
            child.rotation.x += child.userData.rotationSpeed.x * 0.01;
            child.rotation.y += child.userData.rotationSpeed.y * 0.01;
        }
    });

    renderer.render(scene, camera);
}

/**
 * Get current camera
 */
export function getCamera() {
    return camera;
}

/**
 * Get scene
 */
export function getScene() {
    return scene;
}
