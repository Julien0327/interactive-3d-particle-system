import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';

export class ParticleShapeGenerator {
    constructor(particleCount = 15000) {
        this.particleCount = particleCount;
    }

    createHeart() {
        const positions = new Float32Array(this.particleCount * 3);
        for (let i = 0; i < this.particleCount; i++) {
            // Heart shape parametric equation
            // x = 16sin^3(t)
            // y = 13cos(t) - 5cos(2t) - 2cos(3t) - cos(4t)
            // z = varies to give depth
            
            const t = Math.random() * Math.PI * 2;
            // Add some randomness/volume
            const r = Math.random();
            const vol = 1 - Math.pow(r, 3); // distribution

            const x = 16 * Math.pow(Math.sin(t), 3);
            const y = 13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t);
            const z = (Math.random() - 0.5) * 5; // Thickness

            // Scale down
            const scale = 0.15;
            
            // Randomize slightly to fill volume
            const jitter = 0.5;
            
            positions[i * 3] = (x + (Math.random()-0.5)*jitter) * scale;
            positions[i * 3 + 1] = (y + (Math.random()-0.5)*jitter) * scale;
            positions[i * 3 + 2] = (z + (Math.random()-0.5)*jitter) * scale;
        }
        return positions;
    }

    createFlower() {
        const positions = new Float32Array(this.particleCount * 3);
        for (let i = 0; i < this.particleCount; i++) {
            // Rose curve in 3D (spherical)
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            
            // k = 5/2 gives a nice star/flower shape
            const k = 4; 
            const r = Math.sin(k * theta) * Math.sin(phi) + 1.5; // +1.5 base radius

            const x = r * Math.sin(phi) * Math.cos(theta);
            const y = r * Math.sin(phi) * Math.sin(theta);
            const z = r * Math.cos(phi);

            const scale = 1.2;
            positions[i * 3] = x * scale;
            positions[i * 3 + 1] = y * scale;
            positions[i * 3 + 2] = z * scale;
        }
        return positions;
    }

    createSaturn() {
        const positions = new Float32Array(this.particleCount * 3);
        const sphereCount = Math.floor(this.particleCount * 0.4);
        const ringCount = this.particleCount - sphereCount;

        // Planet Sphere
        for (let i = 0; i < sphereCount; i++) {
            const r = 2;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            
            const x = r * Math.sin(phi) * Math.cos(theta);
            const y = r * Math.sin(phi) * Math.sin(theta);
            const z = r * Math.cos(phi);

            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;
        }

        // Rings
        for (let i = sphereCount; i < this.particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            // Ring radius between 3 and 6
            const dist = 3 + Math.random() * 3;
            
            const x = Math.cos(angle) * dist;
            const z = Math.sin(angle) * dist;
            const y = (Math.random() - 0.5) * 0.2; // Thin ring

            // Tilt the ring
            const tilt = 0.4;
            const yt = y * Math.cos(tilt) - z * Math.sin(tilt);
            const zt = y * Math.sin(tilt) + z * Math.cos(tilt);

            positions[i * 3] = x;
            positions[i * 3 + 1] = yt;
            positions[i * 3 + 2] = zt;
        }
        return positions;
    }

    createFireworks() {
        const positions = new Float32Array(this.particleCount * 3);
        for (let i = 0; i < this.particleCount; i++) {
            // Explosion sphere
            const r = Math.pow(Math.random(), 1/3) * 5; // Uniform distribution in sphere
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);

            const x = r * Math.sin(phi) * Math.cos(theta);
            const y = r * Math.sin(phi) * Math.sin(theta);
            const z = r * Math.cos(phi);

            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;
        }
        return positions;
    }

    createBuddha() {
        // Abstract Meditating Figure (Point Cloud)
        const positions = new Float32Array(this.particleCount * 3);
        let idx = 0;

        const addPoint = (x, y, z) => {
            if (idx >= positions.length) return;
            positions[idx++] = x;
            positions[idx++] = y;
            positions[idx++] = z;
        };

        const randomPointInSphere = (cx, cy, cz, radius, count) => {
            for(let i=0; i<count; i++) {
                const r = Math.pow(Math.random(), 1/3) * radius;
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos(2 * Math.random() - 1);
                addPoint(
                    cx + r * Math.sin(phi) * Math.cos(theta),
                    cy + r * Math.sin(phi) * Math.sin(theta),
                    cz + r * Math.cos(phi)
                );
            }
        };

        const randomPointInCylinder = (bx, by, bz, h, r, count, tiltX=0, tiltZ=0) => {
             for(let i=0; i<count; i++) {
                const angle = Math.random() * Math.PI * 2;
                const rad = Math.sqrt(Math.random()) * r;
                const height = (Math.random() - 0.5) * h;
                
                let x = rad * Math.cos(angle);
                let y = height;
                let z = rad * Math.sin(angle);

                // Rotate
                if (tiltX) {
                    const tempY = y * Math.cos(tiltX) - z * Math.sin(tiltX);
                    const tempZ = y * Math.sin(tiltX) + z * Math.cos(tiltX);
                    y = tempY;
                    z = tempZ;
                }
                if (tiltZ) {
                    const tempX = x * Math.cos(tiltZ) - y * Math.sin(tiltZ);
                    const tempY = x * Math.sin(tiltZ) + y * Math.cos(tiltZ);
                    x = tempX;
                    y = tempY;
                }

                addPoint(bx + x, by + y, bz + z);
             }
        }

        // Head
        randomPointInSphere(0, 2.5, 0, 0.8, this.particleCount * 0.15);
        // Body (Torso)
        randomPointInCylinder(0, 0.5, 0, 3.5, 1.0, this.particleCount * 0.35);
        // Legs (Crossed - approximated by two tilted cylinders)
        randomPointInCylinder(-1.0, -1.5, 0.5, 2.5, 0.6, this.particleCount * 0.2, 0, Math.PI/4); // Left Leg
        randomPointInCylinder(1.0, -1.5, 0.5, 2.5, 0.6, this.particleCount * 0.2, 0, -Math.PI/4); // Right Leg
        // Arms (Resting)
        randomPointInCylinder(-1.5, 0.5, 0, 2.0, 0.4, this.particleCount * 0.05, 0, Math.PI/6);
        randomPointInCylinder(1.5, 0.5, 0, 2.0, 0.4, this.particleCount * 0.05, 0, -Math.PI/6);

        // Fill remaining with aura
        while(idx < positions.length) {
            const r = 4 + Math.random();
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            addPoint(
                r * Math.sin(phi) * Math.cos(theta),
                r * Math.sin(phi) * Math.sin(theta),
                r * Math.cos(phi)
            );
        }

        return positions;
    }
}
