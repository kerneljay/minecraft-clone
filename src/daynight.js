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

        // Fog
        this.fog = new THREE.FogExp2(0x87CEEB, 0.008);
        scene.fog = this.fog;

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
