import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';
import { ParticleShapeGenerator } from './particles.js';

// --- Global Variables ---
let scene, camera, renderer;
let particleSystem, geometry, material;
let particleCount = 20000;
let currentPositions, targetPositions;
let shapeGenerator;
let clock;
let isMorphing = false;
let morphAlpha = 0;
const morphSpeed = 2.0;

// Interaction State
let handState = {
    detected: false,
    scale: 1.0,
    diffusion: 0.0,
    x: 0,
    y: 0
};

// UI Elements
const uiPanel = document.getElementById('ui-panel');
const statusIndicator = document.getElementById('status-indicator');
const colorPicker = document.getElementById('color-picker');
const modelButtons = document.querySelectorAll('.model-btn');
const fullscreenBtn = document.getElementById('fullscreen-btn');

// --- Initialization ---
function init() {
    // 1. Scene Setup
    scene = new THREE.Scene();
    // Add some fog for depth
    scene.fog = new THREE.FogExp2(0x000000, 0.02);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 10;
    camera.position.y = 2;
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    document.getElementById('container').appendChild(renderer.domElement);

    // 2. Particle System
    shapeGenerator = new ParticleShapeGenerator(particleCount);
    
    // Initial Shape (Heart)
    targetPositions = shapeGenerator.createHeart();
    currentPositions = new Float32Array(targetPositions); // Copy

    geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(currentPositions, 3));
    
    // Add an extra attribute for original positions to handle noise/diffusion without losing shape
    geometry.setAttribute('targetPos', new THREE.BufferAttribute(new Float32Array(targetPositions), 3));

    // Generate a simple circle texture programmatically
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const context = canvas.getContext('2d');
    context.beginPath();
    context.arc(16, 16, 16, 0, 2 * Math.PI);
    context.fillStyle = '#ffffff';
    context.fill();
    const sprite = new THREE.CanvasTexture(canvas);

    material = new THREE.PointsMaterial({
        color: 0xff0055,
        size: 0.15,
        map: sprite,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    particleSystem = new THREE.Points(geometry, material);
    scene.add(particleSystem);

    clock = new THREE.Clock();

    // 3. Event Listeners
    window.addEventListener('resize', onWindowResize, false);
    setupUI();
    setupMediaPipe();
    
    // 4. Animation Loop
    animate();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function setupUI() {
    // Model Selection
    modelButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Update active state
            modelButtons.forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active'); // Use currentTarget to get the button, not icon

            const model = e.currentTarget.getAttribute('data-model');
            changeModel(model);
        });
    });

    // Color Picker
    colorPicker.addEventListener('input', (e) => {
        material.color.set(e.target.value);
    });

    // Fullscreen
    fullscreenBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    });
}

function changeModel(modelName) {
    let newPos;
    switch(modelName) {
        case 'heart': newPos = shapeGenerator.createHeart(); break;
        case 'flower': newPos = shapeGenerator.createFlower(); break;
        case 'saturn': newPos = shapeGenerator.createSaturn(); break;
        case 'fireworks': newPos = shapeGenerator.createFireworks(); break;
        case 'tree': newPos = shapeGenerator.createTree(); break;
        default: newPos = shapeGenerator.createHeart();
    }

    // Start morphing
    geometry.attributes.targetPos.array.set(newPos);
    geometry.attributes.targetPos.needsUpdate = true;
    
    // Reset morph alpha
    morphAlpha = 0;
    isMorphing = true;
}

// --- MediaPipe Hands ---
function setupMediaPipe() {
    const videoElement = document.getElementById('input_video');

    const hands = new Hands({locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
    }});

    hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });

    hands.onResults(onHandsResults);

    const camera = new Camera(videoElement, {
        onFrame: async () => {
            await hands.send({image: videoElement});
        },
        width: 640,
        height: 480
    });
    
    camera.start()
        .then(() => {
            statusIndicator.textContent = "Camera Active - Show Hand";
            statusIndicator.classList.add('active');
        })
        .catch(err => {
            console.error("Camera error:", err);
            statusIndicator.textContent = "Camera Error";
        });
}

function onHandsResults(results) {
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        handState.detected = true;
        const landmarks = results.multiHandLandmarks[0];

        // 1. Calculate Hand Center (Palm) for rotation/position
        // Wrist (0), Middle Finger MCP (9)
        const wrist = landmarks[0];
        const middle = landmarks[9];
        
        // Map 0..1 to -1..1 for screen space control
        // Note: MediaPipe x is 0(left) to 1(right), y is 0(top) to 1(bottom)
        // Three.js x is -ve(left) to +ve(right), y is +ve(top) to -ve(bottom)
        const handX = (middle.x - 0.5) * 2; 
        const handY = -(middle.y - 0.5) * 2;
        
        // Smooth interpolation for rotation
        handState.x += (handX - handState.x) * 0.1;
        handState.y += (handY - handState.y) * 0.1;

        // 2. Calculate Pinch/Open (Thumb tip 4 and Index tip 8)
        const thumbTip = landmarks[4];
        const indexTip = landmarks[8];
        
        // Distance
        const dx = thumbTip.x - indexTip.x;
        const dy = thumbTip.y - indexTip.y;
        const dz = thumbTip.z - indexTip.z; // Z is relative depth
        const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);

        // Normalize distance (approx 0.02 is closed, 0.2 is open)
        // Map to scale/diffusion
        // Closed (pinch) -> Scale down / Concentrate
        // Open -> Scale up / Diffuse
        
        let targetScale = THREE.MathUtils.mapLinear(dist, 0.02, 0.15, 0.5, 2.0);
        targetScale = THREE.MathUtils.clamp(targetScale, 0.5, 3.0);
        
        handState.scale += (targetScale - handState.scale) * 0.1;
        
        // Use hand openness for diffusion too
        // If hand is very wide open, diffuse
        // Pinky tip (20) to Thumb tip (4)
        const pinkyTip = landmarks[20];
        const dOpen = Math.sqrt(Math.pow(pinkyTip.x - thumbTip.x, 2) + Math.pow(pinkyTip.y - thumbTip.y, 2));
        
        let targetDiffusion = THREE.MathUtils.mapLinear(dOpen, 0.1, 0.3, 0.0, 1.0);
        targetDiffusion = THREE.MathUtils.clamp(targetDiffusion, 0, 2.0);
        
        handState.diffusion += (targetDiffusion - handState.diffusion) * 0.1;

    } else {
        handState.detected = false;
        // Reset slowly
        handState.scale += (1.0 - handState.scale) * 0.05;
        handState.diffusion += (0.0 - handState.diffusion) * 0.05;
        handState.x += (0 - handState.x) * 0.05;
        handState.y += (0 - handState.y) * 0.05;
    }
}

// --- Animation ---
function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    const time = clock.getElapsedTime();

    // 1. Handle Morphing
    const positions = geometry.attributes.position.array;
    const targets = geometry.attributes.targetPos.array;

    if (isMorphing) {
        morphAlpha += delta * morphSpeed;
        if (morphAlpha >= 1) {
            morphAlpha = 1;
            isMorphing = false;
        }
        
        // Ease function
        const t = morphAlpha < .5 ? 2 * morphAlpha * morphAlpha : -1 + (4 - 2 * morphAlpha) * morphAlpha;

        // We update particles in the loop below to combine with hand effects
    }

    // 2. Update Particles
    for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        
        // Base Position (interpolated if morphing)
        let tx = targets[i3];
        let ty = targets[i3+1];
        let tz = targets[i3+2];

        if (isMorphing) {
            // Linear interpolation from current visual pos to target is complex because current visual pos includes scale/diffusion
            // So we assume 'currentPositions' buffer holds the OLD shape state if we wanted true morph from shape A to B
            // But to simplify: We just interpolate the "Base Shape" coordinates here.
            // However, geometry.attributes.position is being modified every frame by hand effects.
            // So we need a persistent "Source Shape" and "Dest Shape".
            // For simplicity in this demo: We just move the particles towards the 'targetPos' attribute value.
            // The 'position' attribute is transient (display only).
            
            // Actually, a better way for morphing:
            // Store `basePosition` attribute (current shape static state).
            // When changing model, animate `basePosition` from OldShape to NewShape.
            // Then apply hand transforms on top of `basePosition` to get `position`.
        }
    }
    
    // Improved Morph Logic:
    // We really need a persistent "Base Position" for the current shape.
    // Let's assume `targetPos` IS the base position we want to be at.
    // If we are morphing, we might just want to lerp the "Base" positions.
    // But since we don't store "Previous Base", we'll just drift `currentBase` towards `targetPos`.
    
    // Let's use a temporary array for the "current base shape" if we want smooth transitions
    // But for performance, let's just use a "Lerp Factor" approach on the display positions relative to target
    // Wait, if I overwrite position with target, I lose the previous frame's position.
    
    // CORRECT APPROACH:
    // 1. `targetPos` holds the ideal shape coordinates.
    // 2. `currentBasePos` holds the interpolated shape coordinates (between old shape and new shape).
    // 3. `position` (render) = `currentBasePos` * scale + noise.
    
    // Let's initialize a `currentBasePos` in init if not exists
    if (!geometry.attributes.currentBasePos) {
        geometry.setAttribute('currentBasePos', new THREE.BufferAttribute(new Float32Array(targets), 3));
    }
    
    const currentBase = geometry.attributes.currentBasePos.array;

    for(let i=0; i < particleCount; i++) {
        const i3 = i * 3;
        
        // Morph the Base Shape
        if (isMorphing || true) { // Always drift towards target (handles morphing implicitly)
             // If isMorphing, we move faster? No, just standard lerp is fine for "organic" feel
             const lerpFactor = 0.05; 
             currentBase[i3] += (targets[i3] - currentBase[i3]) * lerpFactor;
             currentBase[i3+1] += (targets[i3+1] - currentBase[i3+1]) * lerpFactor;
             currentBase[i3+2] += (targets[i3+2] - currentBase[i3+2]) * lerpFactor;
        }
        
        // Apply Hand Effects to get Final Render Position
        const x = currentBase[i3];
        const y = currentBase[i3+1];
        const z = currentBase[i3+2];
        
        // Scale
        const s = handState.scale;
        
        // Diffusion (Noise) based on original position direction or random
        // Let's use simple explosion from center
        const dist = Math.sqrt(x*x + y*y + z*z);
        const dirX = x / (dist || 1);
        const dirY = y / (dist || 1);
        const dirZ = z / (dist || 1);
        
        const diff = handState.diffusion * 2.0 * (Math.random() * 0.5 + 0.5); // Add some flicker

        positions[i3] = x * s + dirX * diff;
        positions[i3+1] = y * s + dirY * diff;
        positions[i3+2] = z * s + dirZ * diff;
    }

    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.currentBasePos.needsUpdate = true;

    // 3. Global Rotation (Interact with hand position)
    // Rotate the whole system based on hand X/Y
    particleSystem.rotation.y += 0.002; // Auto rotate slowly
    
    // Add hand influence
    particleSystem.rotation.x = -handState.y * 0.5;
    particleSystem.rotation.y += handState.x * 0.05;

    renderer.render(scene, camera);
}

// Start
init();
