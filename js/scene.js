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

    // Create the room interior
    createRoom();

    // Add furniture and objects
    createFurniture();

    // Add decorative elements
    createDecorations();

    // Add floating particles for depth perception
    createParticles();
}

/**
 * Create the room walls and floor
 */
function createRoom() {
    // Floor
    const floorGeometry = new THREE.PlaneGeometry(4, 4);
    const floorMaterial = new THREE.MeshStandardMaterial({
        color: 0x3d3d5c,
        roughness: 0.9,
        metalness: 0.1
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, -0.5, -2);
    floor.receiveShadow = true;
    scene.add(floor);

    // Back wall
    const wallGeometry = new THREE.PlaneGeometry(4, 2.5);
    const wallMaterial = new THREE.MeshStandardMaterial({
        color: 0x2a2a4a,
        roughness: 0.95,
        metalness: 0.05
    });
    const backWall = new THREE.Mesh(wallGeometry, wallMaterial);
    backWall.position.set(0, 0.75, -4);
    backWall.receiveShadow = true;
    scene.add(backWall);

    // Left wall
    const leftWall = new THREE.Mesh(wallGeometry, wallMaterial);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-2, 0.75, -2);
    leftWall.receiveShadow = true;
    scene.add(leftWall);

    // Right wall
    const rightWall = new THREE.Mesh(wallGeometry, wallMaterial);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.position.set(2, 0.75, -2);
    rightWall.receiveShadow = true;
    scene.add(rightWall);
}

/**
 * Create furniture items
 */
function createFurniture() {
    // Desk
    const deskMaterial = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.7 });

    // Desk top
    const deskTop = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.05, 0.6), deskMaterial);
    deskTop.position.set(0, -0.1, -1.5);
    deskTop.castShadow = true;
    scene.add(deskTop);

    // Desk legs
    const legGeometry = new THREE.BoxGeometry(0.05, 0.4, 0.05);
    const legPositions = [[-0.55, -0.3, -1.25], [0.55, -0.3, -1.25], [-0.55, -0.3, -1.75], [0.55, -0.3, -1.75]];
    legPositions.forEach(pos => {
        const leg = new THREE.Mesh(legGeometry, deskMaterial);
        leg.position.set(...pos);
        leg.castShadow = true;
        scene.add(leg);
    });

    // Bookshelf on left
    createBookshelf(-1.5, -2.5);

    // Lamp on desk
    createLamp(0.4, -0.07, -1.6);

    // Computer monitor on desk
    createMonitor(-0.3, 0.15, -1.65);
}

/**
 * Create a bookshelf with books
 */
function createBookshelf(x, z) {
    const shelfMaterial = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.8 });

    // Shelf frame
    const frameGroup = new THREE.Group();

    // Vertical sides
    const sideGeometry = new THREE.BoxGeometry(0.05, 1.2, 0.3);
    const leftSide = new THREE.Mesh(sideGeometry, shelfMaterial);
    leftSide.position.set(-0.3, 0.1, 0);
    frameGroup.add(leftSide);

    const rightSide = new THREE.Mesh(sideGeometry, shelfMaterial);
    rightSide.position.set(0.3, 0.1, 0);
    frameGroup.add(rightSide);

    // Shelves
    const shelfGeometry = new THREE.BoxGeometry(0.6, 0.03, 0.28);
    [-0.45, -0.05, 0.35, 0.7].forEach(y => {
        const shelf = new THREE.Mesh(shelfGeometry, shelfMaterial);
        shelf.position.set(0, y, 0);
        frameGroup.add(shelf);
    });

    // Books on shelves
    const bookColors = [0xe74c3c, 0x3498db, 0x2ecc71, 0xf39c12, 0x9b59b6, 0x1abc9c];
    [-0.35, 0.05, 0.45].forEach((shelfY, shelfIndex) => {
        const numBooks = 4 + Math.floor(Math.random() * 3);
        let bookX = -0.22;
        for (let i = 0; i < numBooks && bookX < 0.22; i++) {
            const bookWidth = 0.03 + Math.random() * 0.04;
            const bookHeight = 0.15 + Math.random() * 0.1;
            const bookGeometry = new THREE.BoxGeometry(bookWidth, bookHeight, 0.18);
            const bookMaterial = new THREE.MeshStandardMaterial({
                color: bookColors[Math.floor(Math.random() * bookColors.length)],
                roughness: 0.8
            });
            const book = new THREE.Mesh(bookGeometry, bookMaterial);
            book.position.set(bookX + bookWidth/2, shelfY + 0.03 + bookHeight/2, 0);
            book.rotation.z = (Math.random() - 0.5) * 0.1;
            frameGroup.add(book);
            bookX += bookWidth + 0.01;
        }
    });

    frameGroup.position.set(x, 0, z);
    scene.add(frameGroup);
}

/**
 * Create a desk lamp
 */
function createLamp(x, y, z) {
    const lampGroup = new THREE.Group();

    // Base
    const baseMaterial = new THREE.MeshStandardMaterial({ color: 0x2c3e50, metalness: 0.8, roughness: 0.3 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.02, 16), baseMaterial);
    lampGroup.add(base);

    // Stem
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.25, 8), baseMaterial);
    stem.position.y = 0.13;
    lampGroup.add(stem);

    // Lamp head
    const headMaterial = new THREE.MeshStandardMaterial({ color: 0xf4d03f, metalness: 0.3, roughness: 0.5 });
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.1, 16, 1, true), headMaterial);
    head.position.set(0.05, 0.22, 0);
    head.rotation.z = -0.4;
    lampGroup.add(head);

    // Light bulb glow
    const glowMaterial = new THREE.MeshBasicMaterial({ color: 0xfffacd });
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), glowMaterial);
    glow.position.set(0.07, 0.18, 0);
    lampGroup.add(glow);

    // Add point light
    const pointLight = new THREE.PointLight(0xfffacd, 0.5, 1);
    pointLight.position.set(0.07, 0.18, 0);
    lampGroup.add(pointLight);

    lampGroup.position.set(x, y, z);
    scene.add(lampGroup);
}

/**
 * Create a computer monitor
 */
function createMonitor(x, y, z) {
    const monitorGroup = new THREE.Group();

    // Screen
    const screenMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.1, metalness: 0.5 });
    const screen = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.22, 0.02), screenMaterial);
    monitorGroup.add(screen);

    // Screen content (emissive)
    const contentMaterial = new THREE.MeshBasicMaterial({ color: 0x4a9eff });
    const content = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.19), contentMaterial);
    content.position.z = 0.011;
    monitorGroup.add(content);

    // Stand
    const standMaterial = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8 });
    const stand = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.1, 0.04), standMaterial);
    stand.position.y = -0.16;
    monitorGroup.add(stand);

    // Base
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.01, 0.1), standMaterial);
    base.position.y = -0.21;
    monitorGroup.add(base);

    monitorGroup.position.set(x, y, z);
    scene.add(monitorGroup);
}

/**
 * Create decorative elements
 */
function createDecorations() {
    // Potted plant on desk
    createPlant(0.5, -0.07, -1.35);

    // Picture frames on back wall
    createPictureFrame(-0.6, 0.8, -3.95, 0.4, 0.3, 0x3498db);
    createPictureFrame(0.5, 0.9, -3.95, 0.35, 0.45, 0xe74c3c);

    // Floating geometric shapes (in front, for parallax)
    createFloatingShapes();

    // Coffee mug on desk
    createMug(-0.55, -0.05, -1.3);

    // Rug on floor
    createRug();
}

/**
 * Create a potted plant
 */
function createPlant(x, y, z) {
    const plantGroup = new THREE.Group();

    // Pot
    const potMaterial = new THREE.MeshStandardMaterial({ color: 0xb5651d, roughness: 0.9 });
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.03, 0.06, 12), potMaterial);
    plantGroup.add(pot);

    // Soil
    const soilMaterial = new THREE.MeshStandardMaterial({ color: 0x3d2817 });
    const soil = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.01, 12), soilMaterial);
    soil.position.y = 0.025;
    plantGroup.add(soil);

    // Leaves
    const leafMaterial = new THREE.MeshStandardMaterial({ color: 0x228b22, roughness: 0.8 });
    for (let i = 0; i < 5; i++) {
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), leafMaterial);
        const angle = (i / 5) * Math.PI * 2;
        leaf.position.set(Math.cos(angle) * 0.02, 0.06 + Math.random() * 0.03, Math.sin(angle) * 0.02);
        leaf.scale.y = 1.5;
        plantGroup.add(leaf);
    }

    plantGroup.position.set(x, y, z);
    scene.add(plantGroup);
}

/**
 * Create a picture frame
 */
function createPictureFrame(x, y, z, width, height, color) {
    const frameGroup = new THREE.Group();

    // Frame
    const frameMaterial = new THREE.MeshStandardMaterial({ color: 0x4a3728, roughness: 0.7 });
    const frameThickness = 0.02;

    // Picture content
    const pictureMaterial = new THREE.MeshStandardMaterial({ color: color, roughness: 0.5 });
    const picture = new THREE.Mesh(new THREE.PlaneGeometry(width - 0.04, height - 0.04), pictureMaterial);
    picture.position.z = 0.005;
    frameGroup.add(picture);

    // Frame border
    const borderGeometry = new THREE.BoxGeometry(width, height, 0.02);
    const border = new THREE.Mesh(borderGeometry, frameMaterial);
    frameGroup.add(border);

    frameGroup.position.set(x, y, z);
    scene.add(frameGroup);
}

/**
 * Create floating geometric shapes for foreground parallax
 */
function createFloatingShapes() {
    const shapes = [
        { type: 'icosahedron', position: [-0.6, 0.3, -0.2], size: 0.06, color: 0xff6b6b },
        { type: 'octahedron', position: [0.55, 0.2, -0.3], size: 0.05, color: 0x4ecdc4 },
        { type: 'tetrahedron', position: [-0.3, -0.2, -0.15], size: 0.04, color: 0xffe66d },
        { type: 'dodecahedron', position: [0.4, -0.25, -0.25], size: 0.045, color: 0xa8d8ea },
    ];

    shapes.forEach(spec => {
        let geometry;
        switch (spec.type) {
            case 'icosahedron': geometry = new THREE.IcosahedronGeometry(spec.size); break;
            case 'octahedron': geometry = new THREE.OctahedronGeometry(spec.size); break;
            case 'tetrahedron': geometry = new THREE.TetrahedronGeometry(spec.size); break;
            case 'dodecahedron': geometry = new THREE.DodecahedronGeometry(spec.size); break;
        }
        const material = new THREE.MeshStandardMaterial({
            color: spec.color,
            roughness: 0.3,
            metalness: 0.5,
            transparent: true,
            opacity: 0.85
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(...spec.position);
        mesh.userData.rotationSpeed = {
            x: (Math.random() - 0.5) * 0.8,
            y: (Math.random() - 0.5) * 0.8,
            z: (Math.random() - 0.5) * 0.5
        };
        mesh.castShadow = true;
        scene.add(mesh);
    });
}

/**
 * Create a coffee mug
 */
function createMug(x, y, z) {
    const mugGroup = new THREE.Group();

    const mugMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });

    // Mug body
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.022, 0.05, 16), mugMaterial);
    mugGroup.add(body);

    // Handle
    const handleGeometry = new THREE.TorusGeometry(0.015, 0.004, 8, 12, Math.PI);
    const handle = new THREE.Mesh(handleGeometry, mugMaterial);
    handle.rotation.y = Math.PI / 2;
    handle.rotation.x = Math.PI / 2;
    handle.position.set(0.03, 0, 0);
    mugGroup.add(handle);

    // Coffee inside
    const coffeeMaterial = new THREE.MeshStandardMaterial({ color: 0x3c2415 });
    const coffee = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.005, 16), coffeeMaterial);
    coffee.position.y = 0.02;
    mugGroup.add(coffee);

    mugGroup.position.set(x, y, z);
    scene.add(mugGroup);
}

/**
 * Create a rug on the floor
 */
function createRug() {
    const rugMaterial = new THREE.MeshStandardMaterial({
        color: 0x8e44ad,
        roughness: 0.95,
        metalness: 0
    });
    const rug = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.8), rugMaterial);
    rug.rotation.x = -Math.PI / 2;
    rug.position.set(0, -0.49, -1.2);
    scene.add(rug);
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
 * Create floating dust particles for depth perception
 */
function createParticles() {
    const particleCount = 50;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 2.5;     // x
        positions[i * 3 + 1] = (Math.random() - 0.5) * 1.5 + 0.3; // y (mostly upper area)
        positions[i * 3 + 2] = -0.5 - Math.random() * 3;    // z (throughout the room)
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
        color: 0xffffee,
        size: 0.008,
        transparent: true,
        opacity: 0.4
    });

    const particles = new THREE.Points(geometry, material);
    particles.userData.isParticles = true;
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
    // Reduced scaling for less sensitive movement
    const viewerX = headPos.x * 0.25;
    const viewerY = headPos.y * 0.18;
    const viewerZ = 0.6 + headPos.z * 0.15; // Base distance + depth variation

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
