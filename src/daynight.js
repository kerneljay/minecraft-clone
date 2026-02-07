// Day/Night cycle — dynamic lighting, sky color, sun/moon position

import * as THREE from 'three';

export class DayNightCycle {
    constructor(scene) {
        this.scene = scene;
        this.time = 0.25; // Start at morning (0 = midnight, 0.25 = sunrise, 0.5 = noon, 0.75 = sunset)
        this.dayLength = 600; // 10 minutes per full day cycle (Minecraft is 20 min, this is faster)
        this.speed = 1 / this.dayLength;

        // Ambient light
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        scene.add(this.ambientLight);

        // Directional light (sun)
        this.sunLight = new THREE.DirectionalLight(0xffffff, 1.0);
        this.sunLight.castShadow = false; // Perf optimization
        this.sunLight.position.set(50, 100, 50);
        scene.add(this.sunLight);

        // Hemisphere light for ambient sky color
        this.hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x444444, 0.3);
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
        // Minecraft-style flat blocky clouds — large canvas texture on a plane
        const cloudSize = 512; // texture resolution
        const canvas = document.createElement('canvas');
        canvas.width = cloudSize;
        canvas.height = cloudSize;
        const ctx = canvas.getContext('2d');

        // Clear to fully transparent
        ctx.clearRect(0, 0, cloudSize, cloudSize);

        // Generate blocky cloud patches using simple noise
        const blockScale = 8; // each "cloud pixel" is 8x8 on the canvas
        const gridSize = cloudSize / blockScale;

        // Simple hash-based noise for cloud shapes
        for (let gx = 0; gx < gridSize; gx++) {
            for (let gz = 0; gz < gridSize; gz++) {
                // Multi-octave hash noise for natural cloud shapes
                const nx = gx / gridSize;
                const nz = gz / gridSize;
                const n1 = Math.abs(Math.sin(nx * 6.2831 * 3 + nz * 4.1234) * Math.cos(nz * 6.2831 * 2 + nx * 3.7891));
                const n2 = Math.abs(Math.sin(nx * 6.2831 * 7 + 1.234) * Math.cos(nz * 6.2831 * 5 + 2.567)) * 0.5;
                const noise = n1 + n2;

                // Only draw cloud where noise is above threshold
                if (noise > 0.65) {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                    ctx.fillRect(gx * blockScale, gz * blockScale, blockScale, blockScale);
                } else if (noise > 0.55) {
                    // Softer edges
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                    ctx.fillRect(gx * blockScale, gz * blockScale, blockScale, blockScale);
                }
            }
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(3, 3); // Tile the cloud pattern
        texture.magFilter = THREE.NearestFilter; // Blocky Minecraft look
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
        cloudMesh.rotation.x = -Math.PI / 2; // Flat horizontal
        cloudMesh.position.y = 128; // High up like Minecraft
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
        this.sunLight.intensity = dayFactor * 1.2;
        this.ambientLight.intensity = 0.1 + dayFactor * 0.4;
        this.hemiLight.intensity = 0.1 + dayFactor * 0.3;
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
