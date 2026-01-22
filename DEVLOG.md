# Development Log - 3D Magic Window

## Libraries Used

| Library | Version | CDN Source | Purpose |
|---------|---------|------------|---------|
| Three.js | 0.160.0 | jsdelivr (ES modules) | 3D rendering, WebGL |
| MediaPipe Vision Tasks | 0.10.8 | jsdelivr | Face landmark detection |

### CDN URLs
```html
<!-- Three.js -->
<script type="importmap">
{
    "imports": {
        "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
        "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"
    }
}
</script>

<!-- MediaPipe -->
<script src="https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/vision_bundle.min.js"></script>
```

---

## Development Timeline

### 2026-01-22 12:30 - Initial Implementation

**Completed Steps:**
1. Created project structure:
   ```
   /
   ├── index.html
   ├── css/style.css
   ├── js/main.js
   ├── js/scene.js
   └── js/tracker.js
   ```

2. Implemented Phase 1 (3D Scene):
   - WebGLRenderer with antialiasing
   - PerspectiveCamera
   - Ambient + directional lighting
   - Demo objects at varying depths (boxes, spheres, torus, cylinder, cone)
   - Grid floor
   - Floating particles
   - Window frame effect

3. Implemented Phase 2 (Head Tracking):
   - MediaPipe FaceLandmarker integration
   - Webcam access (640x480)
   - Iris landmark extraction (indices 468, 473)
   - Exponential smoothing for jitter reduction
   - Mouse fallback when webcam unavailable

4. Implemented Phase 3 (Integration):
   - Off-axis perspective projection
   - Camera position tied to head/mouse position

**Commit:** `d62cbce` - Add 3D parallax magic window with head tracking

---

### 2026-01-22 12:35 - Started Local Server

```bash
python -m http.server 8000
```

Server running at http://localhost:8000

---

### 2026-01-22 12:40 - GitHub Pages Deployment

- Pushed to GitHub: https://github.com/jl6017/3D.git
- Enabled GitHub Pages (main branch, root folder)
- Live URL: https://jl6017.github.io/3D/

---

### 2026-01-22 12:45 - Bug #1: View Inverted

**Symptoms:**
- On initial load, projection appeared correct
- Once mouse moved, the view inverted (up/down flipped)
- Grid appeared at top of screen instead of bottom

**Initial Debug Attempts:**

1. **First fix attempt** - Removed `camera.lookAt()` call:
   - Hypothesis: lookAt was overriding the projection matrix
   - Result: Did not fix the issue
   - Commit: `2bf6432`

2. **Second fix attempt** - Flipped Y in scene.js:
   - Changed `viewerY = headPos.y * 0.3` to `viewerY = -headPos.y * 0.3`
   - Result: Did not fix (double negation issue identified)

3. **Third fix attempt** - Removed Y negation in tracker.js mouse handler:
   - Changed from `-(event.clientY / window.innerHeight - 0.5) * 2`
   - To `(event.clientY / window.innerHeight - 0.5) * 2`
   - Result: Still not working

**Root Cause Found:**

The issue was the **parameter order** in Three.js `Matrix4.makePerspective()`:

```javascript
// WRONG (what was implemented):
camera.projectionMatrix.makePerspective(left, right, bottom, top, near, far);

// CORRECT (Three.js expects):
camera.projectionMatrix.makePerspective(left, right, top, bottom, near, far);
```

Three.js expects `(left, right, TOP, BOTTOM, near, far)` - with top before bottom. Swapping these inverted the Y-axis.

**Final Fix:**
- Fixed parameter order in `scene.js`
- Kept Y non-negated in mouse handler for intuitive control
- Added initial `updateCameraFromHead({x:0, y:0, z:0})` call to prevent jump on first mouse move

**Commit:** `1141bb3` - Fix off-axis projection parameter order and mouse input

---

## Technical Notes

### Off-Axis Projection Math

For a screen at z=0 with camera at (viewerX, viewerY, viewerZ):

```javascript
const scale = near / viewerZ;
const left = (-halfWidth - viewerX) * scale;
const right = (halfWidth - viewerX) * scale;
const bottom = (-halfHeight - viewerY) * scale;
const top = (halfHeight - viewerY) * scale;
```

### Coordinate System
- Three.js uses right-handed coordinate system
- Y-axis points UP
- Camera looks down -Z axis
- Screen plane at z=0, objects at negative Z (behind screen)

### Mouse Input Mapping
- Mouse X: left=-1, center=0, right=1
- Mouse Y: top=negative, center=0, bottom=positive (for intuitive control)

---

## References

- [Three.js Documentation](https://threejs.org/docs/)
- [MediaPipe Face Landmarker](https://developers.google.com/mediapipe/solutions/vision/face_landmarker)
- [Three.js makePerspective PR #10375](https://github.com/mrdoob/three.js/pull/10375/files)
- [MindDock/off-axis-demo](https://github.com/MindDock/off-axis-demo) - Reference implementation
