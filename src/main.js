// Main entry point — sets up Three.js renderer, game loop, and ties all systems together

import * as THREE from 'three';
import { World } from './world.js';
import { Player } from './player.js';
import { Inventory } from './inventory.js';
import { DayNightCycle } from './daynight.js';
import { MobManager } from './mobs.js';
import { UI } from './ui.js';
import { createTextureAtlas, ATLAS_TILES } from './textures.js';
import { BlockType, BlockData } from './blocks.js';
import { CHUNK_SIZE } from './chunk.js';

// ===== GAME STATE =====
let gameState = 'title'; // title, playing, paused, dead
let isCreative = false;

// ===== RENDERER SETUP =====
const canvas = document.getElementById('game-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = false;
renderer.outputColorSpace = THREE.SRGBColorSpace;

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);

// Camera
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 500);

// Handle resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// ===== TEXTURE ATLAS =====
const atlasTexture = createTextureAtlas();

// Materials
const blockMaterial = new THREE.MeshLambertMaterial({
    map: atlasTexture,
    side: THREE.FrontSide
});

const waterMaterial = new THREE.MeshLambertMaterial({
    map: atlasTexture,
    transparent: true,
    opacity: 0.6,
    side: THREE.DoubleSide
});

// ===== GAME OBJECTS =====
let world, player, inventory, dayNight, mobManager, ui;

// ===== BLOCK HIGHLIGHT (wireframe on targeted block) =====
const highlightGeo = new THREE.BoxGeometry(1.005, 1.005, 1.005);
const highlightMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    wireframe: true,
    transparent: true,
    opacity: 0.5
});
const blockHighlight = new THREE.Mesh(highlightGeo, highlightMat);
blockHighlight.visible = false;
scene.add(blockHighlight);

// ===== BREAK OVERLAY =====
const breakGeo = new THREE.BoxGeometry(1.01, 1.01, 1.01);
const breakMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.3,
    side: THREE.FrontSide,
    depthTest: true
});
const breakOverlay = new THREE.Mesh(breakGeo, breakMat);
breakOverlay.visible = false;
scene.add(breakOverlay);

// ===== PERFORMANCE TRACKING =====
let fps = 0;
let frameCount = 0;
let fpsTimer = 0;
let lastTime = performance.now() / 1000;

// ===== INIT GAME =====
function initGame(seed, creative = false) {
    isCreative = creative;

    // Clear old world
    while (scene.children.length > 0) {
        const child = scene.children[0];
        scene.remove(child);
    }
    scene.add(blockHighlight);
    scene.add(breakOverlay);

    // Parse seed
    let seedNum;
    if (seed && seed.length > 0) {
        seedNum = 0;
        for (let i = 0; i < seed.length; i++) {
            seedNum = ((seedNum << 5) - seedNum + seed.charCodeAt(i)) | 0;
        }
    } else {
        seedNum = Math.floor(Math.random() * 100000);
    }

    // Create world
    world = new World(scene, blockMaterial, waterMaterial, seedNum);

    // Create player
    player = new Player(camera, world);
    if (creative) {
        player.isFlying = true;
        player.health = Infinity;
        player.hunger = 20;
    }

    // Create inventory
    inventory = new Inventory();

    // If creative, give all blocks
    if (creative) {
        let slot = 0;
        for (const typeStr in BlockType) {
            const type = BlockType[typeStr];
            if (type !== BlockType.AIR && type !== BlockType.WATER && type !== BlockType.BEDROCK && slot < 36) {
                inventory.slots[slot] = { type, count: 64 };
                slot++;
            }
        }
    }

    // Day/Night cycle
    dayNight = new DayNightCycle(scene);

    // Mob manager
    mobManager = new MobManager(scene, world);

    // UI
    ui = new UI();

    // Generate initial chunks
    world.update(8, 8);

    // Set spawn position
    setTimeout(() => {
        const spawnY = world.getSpawnHeight(8, 8);
        player.position.set(8, spawnY + 2, 8);
        player.fallStartY = player.position.y;
    }, 100);

    // Show HUD
    document.getElementById('hud').style.display = 'block';
    document.getElementById('title-screen').style.display = 'none';

    gameState = 'playing';

    // Request pointer lock
    canvas.requestPointerLock();
}

// ===== TITLE SCREEN =====
document.getElementById('play-btn').addEventListener('click', () => {
    const seed = document.getElementById('seed').value;
    initGame(seed, false);
});

document.getElementById('creative-btn').addEventListener('click', () => {
    const seed = document.getElementById('seed').value;
    initGame(seed, true);
});

// ===== PAUSE / RESUME =====
document.addEventListener('keydown', (e) => {
    if (e.code === 'Escape') {
        if (gameState === 'playing') {
            if (ui && ui.inventoryOpen) {
                ui.toggleInventory(inventory);
                canvas.requestPointerLock();
                return;
            }
            gameState = 'paused';
            ui.showPauseMenu();
            document.exitPointerLock();
        } else if (gameState === 'paused') {
            gameState = 'playing';
            ui.hidePauseMenu();
            canvas.requestPointerLock();
        }
    }

    // Toggle inventory
    if (e.code === 'KeyE' && gameState === 'playing') {
        if (ui) {
            ui.toggleInventory(inventory);
            if (ui.inventoryOpen) {
                document.exitPointerLock();
            } else {
                canvas.requestPointerLock();
            }
        }
    }

    // Toggle debug (F3)
    if (e.code === 'F3') {
        e.preventDefault();
        const debug = document.getElementById('debug-info');
        debug.style.display = debug.style.display === 'none' ? 'block' : '';
    }

    // Double tap space for creative fly toggle
    if (e.code === 'Space' && isCreative && gameState === 'playing') {
        if (player) {
            if (this._lastSpace && Date.now() - this._lastSpace < 300) {
                player.isFlying = !player.isFlying;
            }
            this._lastSpace = Date.now();
        }
    }

    // Attack mob with left click on key F
    if (e.code === 'KeyF' && gameState === 'playing' && player && mobManager) {
        const dir = player.getForwardDir();
        mobManager.attackMob(camera.position, dir);
    }
});

document.getElementById('resume-btn')?.addEventListener('click', () => {
    gameState = 'playing';
    ui.hidePauseMenu();
    canvas.requestPointerLock();
});

document.getElementById('quit-btn')?.addEventListener('click', () => {
    gameState = 'title';
    ui.hidePauseMenu();
    document.getElementById('hud').style.display = 'none';
    document.getElementById('title-screen').style.display = 'flex';
    document.exitPointerLock();
});

// Death screen
document.getElementById('respawn-btn')?.addEventListener('click', () => {
    if (player) {
        player.respawn();
        inventory = new Inventory();
        ui.hideDeathScreen();
        gameState = 'playing';
        canvas.requestPointerLock();
    }
});

document.getElementById('death-quit-btn')?.addEventListener('click', () => {
    gameState = 'title';
    ui.hideDeathScreen();
    document.getElementById('hud').style.display = 'none';
    document.getElementById('title-screen').style.display = 'flex';
    document.exitPointerLock();
});

// Pointer lock change handler
document.addEventListener('pointerlockchange', () => {
    if (!document.pointerLockElement && gameState === 'playing' && (!ui || !ui.inventoryOpen)) {
        // Don't auto-pause, just let the user re-click
    }
});

// Left click for mob attack
canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0 && gameState === 'playing' && player && mobManager) {
        const dir = player.getForwardDir();
        mobManager.attackMob(camera.position, dir);
    }

    // Request pointer lock on click if not locked
    if (gameState === 'playing' && !document.pointerLockElement && (!ui || !ui.inventoryOpen)) {
        canvas.requestPointerLock();
    }
});

// ===== GAME LOOP =====
function gameLoop() {
    requestAnimationFrame(gameLoop);

    const now = performance.now() / 1000;
    const dt = now - lastTime;
    lastTime = now;

    // FPS counter
    frameCount++;
    fpsTimer += dt;
    if (fpsTimer >= 1) {
        fps = frameCount;
        frameCount = 0;
        fpsTimer = 0;
    }

    if (gameState !== 'playing') {
        renderer.render(scene, camera);
        return;
    }

    if (!world || !player) return;

    // Update player
    player.selectedSlot = player.selectedSlot;
    player.update(dt, inventory);

    // Update world chunks
    world.update(player.position.x, player.position.z);

    // Update day/night
    dayNight.update(dt, player.position);

    // Update mobs
    const mobResult = mobManager.update(dt, player.position, dayNight.isNight());
    if (mobResult && mobResult.type === 'damage' && !isCreative) {
        player.takeDamage(mobResult.amount);
    }

    // Block highlight
    const lookAt = player.getLookingAt();
    if (lookAt) {
        blockHighlight.position.set(
            lookAt.position.x + 0.5,
            lookAt.position.y + 0.5,
            lookAt.position.z + 0.5
        );
        blockHighlight.visible = true;

        // Break overlay
        if (player.breakProgress > 0 && player.breakingBlock) {
            const blockData = BlockData[lookAt.block];
            const breakTime = blockData.hardness < 0 ? Infinity : (blockData.hardness * 1.5);
            const progress = Math.min(1, player.breakProgress / breakTime);

            breakOverlay.position.copy(blockHighlight.position);
            breakOverlay.visible = true;
            breakMat.opacity = progress * 0.5;

            // Crack effect color
            const crackColor = new THREE.Color().lerpColors(
                new THREE.Color(0xffffff),
                new THREE.Color(0x333333),
                progress
            );
            breakMat.color = crackColor;
        } else {
            breakOverlay.visible = false;
        }
    } else {
        blockHighlight.visible = false;
        breakOverlay.visible = false;
    }

    // Update UI
    ui.updateHotbar(inventory, player.selectedSlot);
    ui.updateHealth(player.health, player.maxHealth);
    ui.updateHunger(player.hunger);
    ui.updateXP(player.xp);

    ui.updateDebugInfo({
        fps,
        x: player.position.x,
        y: player.position.y,
        z: player.position.z,
        chunkX: Math.floor(player.position.x / CHUNK_SIZE),
        chunkZ: Math.floor(player.position.z / CHUNK_SIZE),
        chunksLoaded: world.chunks.size,
        time: dayNight.getTimeString(),
        lookingAt: lookAt ? BlockData[lookAt.block]?.name : null,
        biome: getBiomeName(player.position.x, player.position.z, world.noise)
    });

    // Death check
    if (player.isDead && !isCreative) {
        gameState = 'dead';
        ui.showDeathScreen(player.xpLevel * 100 + player.xp);
        document.exitPointerLock();
    }

    // Render
    renderer.render(scene, camera);
}

function getBiomeName(x, z, noise) {
    if (!noise) return 'Unknown';
    const temp = noise.fbm2D(x * 0.003 + 1000, z * 0.003 + 1000, 3);
    const moist = noise.fbm2D(x * 0.003 + 5000, z * 0.003 + 5000, 3);

    if (temp > 0.3 && moist < -0.1) return 'Desert';
    if (temp < -0.3) return 'Snowy Tundra';
    if (moist > 0.3) return 'Forest';
    if (temp > 0.1) return 'Savanna';
    return 'Plains';
}

// Start the game loop
gameLoop();
