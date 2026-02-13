// Day/Night cycle — gradient sky dome, dynamic sun/moon, atmospheric scattering, clouds
// Overhaul: vertex-colored sky hemisphere with sunrise/sunset horizon colors

import * as THREE from 'three';

export class DayNightCycle {
    constructor(scene) {
        this.scene = scene;
        this.time = 0.25; // 0=midnight, 0.25=sunrise, 0.5=noon, 0.75=sunset
        this.dayLength = 600; // 10 minutes per cycle
        this.speed = 1 / this.dayLength;

        // Ambient light
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
        scene.add(this.ambientLight);

        // Directional light (sun)
        this.sunLight = new THREE.DirectionalLight(0xffffff, 0.9);
        this.sunLight.castShadow = false;
        this.sunLight.position.set(50, 100, 50);
        scene.add(this.sunLight);

        // Hemisphere light
        this.hemiLight = new THREE.HemisphereLight(0x9dc8f0, 0x665544, 0.35);
        scene.add(this.hemiLight);

        // Fog
        if (!scene.fog) {
            this.fog = new THREE.FogExp2(0x87CEEB, 0.008);
            scene.fog = this.fog;
        } else {
            this.fog = scene.fog;
        }

        // ===== SKY DOME =====
        this.skyDome = this.createSkyDome();
        scene.add(this.skyDome);

        // Stars
        this.stars = this.createStars();
        scene.add(this.stars);

        // Sun disc (flat circle facing camera)
        const sunGeo = new THREE.CircleGeometry(12, 32);
        const sunMat = new THREE.MeshBasicMaterial({
            color: 0xfff4d6,
            side: THREE.DoubleSide,
            depthWrite: false,
            fog: false,
        });
        this.sunMesh = new THREE.Mesh(sunGeo, sunMat);
        scene.add(this.sunMesh);

        // Sun glow
        const glowGeo = new THREE.CircleGeometry(24, 32);
        const glowMat = new THREE.MeshBasicMaterial({
            color: 0xffdd88,
            transparent: true,
            opacity: 0.25,
            side: THREE.DoubleSide,
            depthWrite: false,
            fog: false,
        });
        this.sunGlow = new THREE.Mesh(glowGeo, glowMat);
        scene.add(this.sunGlow);

        // Moon disc
        const moonGeo = new THREE.CircleGeometry(8, 32);
        const moonMat = new THREE.MeshBasicMaterial({
            color: 0xe0e0ee,
            side: THREE.DoubleSide,
            depthWrite: false,
            fog: false,
        });
        this.moonMesh = new THREE.Mesh(moonGeo, moonMat);
        scene.add(this.moonMesh);

        // Clouds
        this.cloudOffset = 0;
        this.clouds = this.createClouds();
        scene.add(this.clouds);

        // Pre-allocate color objects for lerping
        this._zenithColor = new THREE.Color();
        this._horizonColor = new THREE.Color();
        this._skyColor = new THREE.Color();
    }

    createSkyDome() {
        // Hemisphere with vertex colors for gradient sky
        const radius = 450;
        const widthSegs = 32;
        const heightSegs = 16;

        const geo = new THREE.SphereGeometry(radius, widthSegs, heightSegs, 0, Math.PI * 2, 0, Math.PI * 0.55);
        const mat = new THREE.MeshBasicMaterial({
            side: THREE.BackSide,
            vertexColors: true,
            depthWrite: false,
            fog: false,
        });

        // Initialize vertex colors (will be updated every frame)
        const posAttr = geo.getAttribute('position');
        const colors = new Float32Array(posAttr.count * 3);
        geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const mesh = new THREE.Mesh(geo, mat);
        mesh.renderOrder = -100; // Render behind everything
        return mesh;
    }

    updateSkyDomeColors(dayFactor, sunAngle) {
        const geo = this.skyDome.geometry;
        const posAttr = geo.getAttribute('position');
        const colorAttr = geo.getAttribute('color');

        // Define sky colors by time of day
        // Zenith colors (top of sky)
        const zenithDay = new THREE.Color(0.33, 0.58, 0.92);    // Deep sky blue
        const zenithSunset = new THREE.Color(0.25, 0.30, 0.55);  // Deep twilight blue
        const zenithNight = new THREE.Color(0.02, 0.02, 0.06);   // Near-black

        // Horizon colors
        const horizonDay = new THREE.Color(0.60, 0.78, 0.95);     // Light blue
        const horizonSunrise = new THREE.Color(0.95, 0.55, 0.25); // Orange
        const horizonSunset = new THREE.Color(0.90, 0.35, 0.30);  // Red-orange
        const horizonNight = new THREE.Color(0.04, 0.04, 0.08);   // Very dark blue

        // Compute zenith and horizon colors
        let zenith, horizon;
        if (dayFactor > 0.7) {
            zenith = zenithDay;
            horizon = horizonDay;
        } else if (dayFactor > 0.35) {
            const t = (dayFactor - 0.35) / 0.35;
            zenith = zenithSunset.clone().lerp(zenithDay, t);
            // Check if sunrise or sunset based on time
            const isSunrise = this.time > 0.15 && this.time < 0.4;
            const sunsetHorizon = isSunrise ? horizonSunrise : horizonSunset;
            horizon = sunsetHorizon.clone().lerp(horizonDay, t);
        } else {
            const t = dayFactor / 0.35;
            zenith = zenithNight.clone().lerp(zenithSunset, t);
            const isSunrise = this.time > 0.15 && this.time < 0.4;
            const sunsetHorizon = isSunrise ? horizonSunrise : horizonSunset;
            horizon = horizonNight.clone().lerp(sunsetHorizon, t);
        }

        const tempColor = new THREE.Color();
        for (let i = 0; i < posAttr.count; i++) {
            const y = posAttr.getY(i);
            // heightFactor: 0 at horizon, 1 at zenith
            const heightFactor = Math.max(0, y / 450);
            // Smooth interpolation with bias toward horizon color near edge
            const t = Math.pow(heightFactor, 0.6);

            tempColor.copy(horizon).lerp(zenith, t);

            colorAttr.setXYZ(i, tempColor.r, tempColor.g, tempColor.b);
        }

        colorAttr.needsUpdate = true;
        return horizon; // Return for fog matching
    }

    createStars() {
        const starGeo = new THREE.BufferGeometry();
        const starVerts = [];
        const starSizes = [];
        for (let i = 0; i < 3000; i++) {
            const r = 420;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            // Only upper hemisphere
            if (Math.cos(phi) < 0) continue;
            starVerts.push(
                r * Math.sin(phi) * Math.cos(theta),
                r * Math.cos(phi),
                r * Math.sin(phi) * Math.sin(theta)
            );
            starSizes.push(0.8 + Math.random() * 1.5);
        }
        starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starVerts, 3));
        const starMat = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 1.5,
            sizeAttenuation: false,
            transparent: true,
            opacity: 1,
            depthWrite: false,
            fog: false,
        });
        return new THREE.Points(starGeo, starMat);
    }

    createClouds() {
        const cloudSize = 512;
        const canvas = document.createElement('canvas');
        canvas.width = cloudSize;
        canvas.height = cloudSize;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, cloudSize, cloudSize);

        const blockScale = 8;
        const gridSize = cloudSize / blockScale;

        // Seeded random
        let seed = 91827364;
        function rand() {
            seed = (seed + 0x6D2B79F5) | 0;
            let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        }

        // Cloud clusters
        const numClusters = 14 + Math.floor(rand() * 10);
        const clusters = [];
        for (let c = 0; c < numClusters; c++) {
            clusters.push({
                cx: Math.floor(rand() * gridSize),
                cz: Math.floor(rand() * gridSize),
                radius: 3 + Math.floor(rand() * 10),
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
                cloudVal += (rand() - 0.5) * 0.15;

                if (cloudVal > 0.35) {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
                    ctx.fillRect(gx * blockScale, gz * blockScale, blockScale, blockScale);
                    // Shadow underneath
                    ctx.fillStyle = 'rgba(180, 190, 200, 0.4)';
                    ctx.fillRect(gx * blockScale, (gz + 1) * blockScale, blockScale, blockScale * 0.3);
                } else if (cloudVal > 0.2) {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
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

        const cloudGeo = new THREE.PlaneGeometry(900, 900);
        this._cloudMat = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            opacity: 0.85,
            side: THREE.DoubleSide,
            depthWrite: false,
            fog: false,
        });

        const cloudMesh = new THREE.Mesh(cloudGeo, this._cloudMat);
        cloudMesh.rotation.x = -Math.PI / 2;
        cloudMesh.position.y = 135;
        cloudMesh.renderOrder = -50;

        return cloudMesh;
    }

    update(dt, playerPos) {
        this.time = (this.time + this.speed * dt) % 1;

        const angle = this.time * Math.PI * 2;
        const sunHeight = Math.sin(angle);
        const sunDist = 300;

        // Sun position (circular orbit)
        const sunX = playerPos.x + Math.cos(angle) * sunDist;
        const sunY = sunHeight * sunDist;
        const sunZ = playerPos.z + Math.sin(angle) * sunDist * 0.3;
        this.sunMesh.position.set(sunX, sunY, sunZ);
        this.sunGlow.position.copy(this.sunMesh.position);

        // Make sun/glow face camera
        this.sunMesh.lookAt(playerPos);
        this.sunGlow.lookAt(playerPos);

        // Moon (opposite sun)
        this.moonMesh.position.set(
            playerPos.x - Math.cos(angle) * sunDist,
            -sunHeight * sunDist,
            playerPos.z - Math.sin(angle) * sunDist * 0.3
        );
        this.moonMesh.lookAt(playerPos);

        // Light direction
        this.sunLight.position.copy(this.sunMesh.position);
        this.sunLight.target.position.copy(playerPos);

        // Daytime factor (0=night, 1=day)
        const dayFactor = Math.max(0, Math.min(1, (sunHeight + 0.2) / 0.7));

        // ===== UPDATE SKY DOME =====
        this.skyDome.position.copy(playerPos);
        const horizonColor = this.updateSkyDomeColors(dayFactor, angle);

        // Background color (matches the lowest part of the sky dome)
        this.scene.background = horizonColor;

        // Fog matches horizon
        if (!window._isUnderwater) {
            this.fog.color.copy(horizonColor);
        }

        // ===== LIGHTING =====
        // Warmer light during sunrise/sunset
        const isSunrise = this.time > 0.2 && this.time < 0.35;
        const isSunset = this.time > 0.7 && this.time < 0.85;
        if (isSunrise || isSunset) {
            this.sunLight.color.setHex(0xffc480); // Warm orange-white
            this.sunLight.intensity = dayFactor * 0.7;
        } else {
            this.sunLight.color.setHex(0xffffff);
            this.sunLight.intensity = dayFactor * 0.9;
        }
        this.ambientLight.intensity = 0.15 + dayFactor * 0.35;
        this.hemiLight.intensity = 0.1 + dayFactor * 0.25;
        this.hemiLight.color.copy(horizonColor);

        // ===== STARS =====
        const starOpacity = Math.max(0, 1 - dayFactor * 2.5);
        this.stars.visible = starOpacity > 0.01;
        this.stars.material.opacity = starOpacity;
        this.stars.position.copy(playerPos);

        // ===== SUN/MOON VISIBILITY =====
        this.sunMesh.visible = dayFactor > 0.05;
        this.sunGlow.visible = dayFactor > 0.05;
        const sunGlowIntensity = dayFactor > 0.3 ? 0.25 : dayFactor * 0.8;
        this.sunGlow.material.opacity = sunGlowIntensity;
        // Pulsating sun at sunrise/sunset
        if (isSunrise || isSunset) {
            this.sunMesh.material.color.setHex(0xffbb55);
            this.sunGlow.material.opacity = 0.5;
        } else {
            this.sunMesh.material.color.setHex(0xfff4d6);
        }

        this.moonMesh.visible = dayFactor < 0.5;

        // ===== CLOUDS =====
        if (this.clouds) {
            this.clouds.position.x = playerPos.x;
            this.clouds.position.z = playerPos.z;
            this.cloudOffset += dt * 0.003;
            this.clouds.material.map.offset.x = this.cloudOffset;

            // Cloud color tinting
            const cloudOpacity = 0.3 + dayFactor * 0.6;
            this.clouds.material.opacity = cloudOpacity;

            // Tint clouds during sunrise/sunset
            if (isSunrise || isSunset) {
                this._cloudMat.color.setHex(0xffccaa);
            } else if (dayFactor < 0.3) {
                this._cloudMat.color.setHex(0x888899);
            } else {
                this._cloudMat.color.setHex(0xffffff);
            }
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
