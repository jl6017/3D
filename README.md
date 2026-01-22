# 3D Magic Window

A parallax "magic window" effect that creates the illusion of looking through your screen into a 3D world. The scene perspective adjusts based on your head position, tracked via webcam.

## Features

- **Head tracking**: Uses MediaPipe FaceLandmarker to track eye position via webcam
- **Off-axis projection**: True perspective correction based on viewer position
- **Mouse fallback**: Automatically falls back to mouse control if webcam unavailable
- **No build tools**: Pure ES modules, works directly with static hosting

## Usage

### Local Development
```bash
# Serve with any static server
npx serve .
# or
python -m http.server 8000
```

Then open `http://localhost:8000` (or appropriate port) in your browser.

### GitHub Pages
Push to a GitHub repository and enable GitHub Pages in settings.

## Browser Compatibility

| Browser | Support |
|---------|---------|
| Chrome | Full support |
| Edge | Full support |
| Safari 15.4+ | Partial (may need permission tweaks) |
| Firefox | Limited (MediaPipe may have issues) |

## How It Works

1. **Face Detection**: MediaPipe FaceLandmarker detects face landmarks in real-time
2. **Eye Tracking**: Iris landmarks (468, 473) are used to calculate eye center position
3. **Position Mapping**: Eye position is normalized to [-1, 1] range with smoothing
4. **Off-axis Projection**: Camera frustum is adjusted to create proper parallax effect

## File Structure

```
/
├── index.html          # Entry point with CDN imports
├── css/
│   └── style.css       # Styling
├── js/
│   ├── main.js         # App initialization & render loop
│   ├── scene.js        # Three.js scene setup
│   └── tracker.js      # Head tracking via MediaPipe
└── README.md
```

## Technologies

- [Three.js](https://threejs.org/) - 3D rendering
- [MediaPipe Vision](https://developers.google.com/mediapipe/solutions/vision/face_landmarker) - Face landmark detection
