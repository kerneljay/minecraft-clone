// Day/Night cycle — dynamic lighting, sky color, sun/moon position

import * as THREE from 'three';

export class DayNightCycle {
    constructor(scene) {
        this.scene = scene;
        this.time = 0.25; // Start at morning (0 = midnight, 0.25 = sunrise, 0.5 = noon, 0.75 = sunset)
        this.dayLength = 600; // 10 minutes per full day cycle (Minecraft is 20 min, this is faster)
        this.speed = 1 / this.dayLength;

        // Ambient light
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
        scene.add(this.ambientLight);

        // Directional light (sun)
        this.sunLight = new THREE.DirectionalLight(0xffffff, 0.9);
        this.sunLight.castShadow = false; // Perf optimization
        this.sunLight.position.set(50, 100, 50);
        scene.add(this.sunLight);

        // Hemisphere light for ambient sky color
        this.hemiLight = new THREE.HemisphereLight(0x9dc8f0, 0x665544, 0.35);
        scene.add(this.hemiLight);

        // Fog — use scene fog if set, otherwise create one
        if (!scene.fog) {
            this.fog = new THREE.FogExp2(0x87CEEB, 0.008);
            scene.fog = this.fog;
        } else {
            this.fog = scene.fog;
        }

        // Stars
        this.stars = this.createStars();
        scene.add(this.stars);

        // Sun sphere
        const sunGeo = new THREE.SphereGeometry(5, 8, 8);
        const sunMat = new THREE.MeshBasicMaterial({ color: 0xffee88 });
        this.sunMesh = new THREE.Mesh(sunGeo, sunMat);
        scene.add(this.sunMesh);

        // Moon sphere
        const moonGeo = new THREE.SphereGeometry(4, 8, 8);
        const moonMat = new THREE.MeshBasicMaterial({ color: 0xccccdd });
        this.moonMesh = new THREE.Mesh(moonGeo, moonMat);
        scene.add(this.moonMesh);

        // ===== MINECRAFT-STYLE CLOUDS =====
        this.cloudOffset = 0;
        this.clouds = this.createClouds();
        scene.add(this.clouds);
    }

    createStars() {
        const starGeo = new THREE.BufferGeometry();
        const starVerts = [];
        for (let i = 0; i < 2000; i++) {
            const r = 400;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            starVerts.push(
                r * Math.sin(phi) * Math.cos(theta),
                r * Math.sin(phi) * Math.sin(theta),
                r * Math.cos(phi)
            );
        }
        starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starVerts, 3));
        const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.5, sizeAttenuation: false });
        return new THREE.Points(starGeo, starMat);
    }

    createClouds() {
        // Minecraft-style flat blocky clouds with proper scattered randomness
        const cloudSize = 512;
        const canvas = document.createElement('canvas');
        canvas.width = cloudSize;
        canvas.height = cloudSize;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, cloudSize, cloudSize);

        const blockScale = 8; // each cloud "pixel" is 8x8
        const gridSize = cloudSize / blockScale;

        // Seeded pseudo-random (mulberry32)
        let seed = 91827364;
        function rand() {
            seed = (seed + 0x6D2B79F5) | 0;
            let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        }

        // Generate cloud blobs: random cluster centers + fill around them
        const numClusters = 12 + Math.floor(rand() * 8);
        const clusters = [];
        for (let c = 0; c < numClusters; c++) {
            clusters.push({
                cx: Math.floor(rand() * gridSize),
                cz: Math.floor(rand() * gridSize),
                radius: 3 + Math.floor(rand() * 8),
                density: 0.3 + rand() * 0.5,
            });
        }

        for (let gx = 0; gx < gridSize; gx++) {
            for (let gz = 0; gz < gridSize; gz++) {
                let cloudVal = 0;
                for (const cl of clusters) {
                    const dx = gx - cl.cx;
                    const dz = gz - cl.cz;
                    const dist = Math.sqrt(dx * dx + dz * dz);
                    if (dist < cl.radius) {
                        const falloff = 1 - (dist / cl.radius);
                        cloudVal += falloff * cl.density;
                    }
                }
                // Add some per-pixel jitter
                cloudVal += (rand() - 0.5) * 0.15;

                if (cloudVal > 0.35) {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
                    ctx.fillRect(gx * blockScale, gz * blockScale, blockScale, blockScale);
                } else if (cloudVal > 0.2) {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                    ctx.fillRect(gx * blockScale, gz * blockScale, blockScale, blockScale);
                }
            }
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(2, 2);
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;

        const cloudGeo = new THREE.PlaneGeometry(800, 800);
        const cloudMat = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            opacity: 0.85,
            side: THREE.DoubleSide,
            depthWrite: false,
        });

        const cloudMesh = new THREE.Mesh(cloudGeo, cloudMat);
        cloudMesh.rotation.x = -Math.PI / 2;
        cloudMesh.position.y = 128;
        cloudMesh.renderOrder = 1;

        return cloudMesh;
    }

    update(dt, playerPos) {
        this.time = (this.time + this.speed * dt) % 1;

        const angle = this.time * Math.PI * 2;
        const sunHeight = Math.sin(angle);
        const sunDist = 200;

        // Sun position
        this.sunMesh.position.set(
            playerPos.x + Math.cos(angle) * sunDist,
            sunHeight * sunDist,
            playerPos.z + Math.sin(angle) * sunDist * 0.3
        );

        // Moon position (opposite sun)
        this.moonMesh.position.set(
            playerPos.x - Math.cos(angle) * sunDist,
            -sunHeight * sunDist,
            playerPos.z - Math.sin(angle) * sunDist * 0.3
        );

        // Light direction follows sun
        this.sunLight.position.copy(this.sunMesh.position);
        this.sunLight.target.position.copy(playerPos);

        // Daytime factor (0 = night, 1 = day)
        const dayFactor = Math.max(0, Math.min(1, (sunHeight + 0.2) / 0.7));

        // Sky colors
        const dayColor = new THREE.Color(0x87CEEB);    // Sky blue
        const sunsetColor = new THREE.Color(0xFF7744);  // Orange sunset
        const nightColor = new THREE.Color(0x0a0a1a);   // Dark night

        let skyColor;
        if (dayFactor > 0.7) {
            skyColor = dayColor;
        } else if (dayFactor > 0.3) {
            const t = (dayFactor - 0.3) / 0.4;
            skyColor = sunsetColor.clone().lerp(dayColor, t);
        } else {
            const t = dayFactor / 0.3;
            skyColor = nightColor.clone().lerp(sunsetColor, t);
        }

        this.scene.background = skyColor;
        this.fog.color = skyColor;

        // Light intensity
        this.sunLight.intensity = dayFactor * 0.9;
        this.ambientLight.intensity = 0.15 + dayFactor * 0.35;
        this.hemiLight.intensity = 0.1 + dayFactor * 0.25;
        this.hemiLight.color = skyColor;

        // Stars visibility
        this.stars.visible = dayFactor < 0.4;
        this.stars.material.opacity = Math.max(0, 1 - dayFactor * 3);
        this.stars.position.copy(playerPos);

        // Sun/moon visibility
        this.sunMesh.visible = dayFactor > 0.1;
        this.moonMesh.visible = dayFactor < 0.5;

        // ===== CLOUD UPDATE =====
        if (this.clouds) {
            // Clouds follow player horizontally
            this.clouds.position.x = playerPos.x;
            this.clouds.position.z = playerPos.z;

            // Slow drift eastward via texture offset
            this.cloudOffset += dt * 0.003;
            this.clouds.material.map.offset.x = this.cloudOffset;

            // Slightly dimmer at night
            this.clouds.material.opacity = 0.3 + dayFactor * 0.6;
            this.clouds.visible = true;
        }
    }

    isNight() {
        const angle = this.time * Math.PI * 2;
        return Math.sin(angle) < -0.1;
    }

    getTimeString() {
        const hours = Math.floor(this.time * 24);
        const minutes = Math.floor((this.time * 24 - hours) * 60);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
}
