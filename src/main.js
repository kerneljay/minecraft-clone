// Main entry point — sets up Three.js renderer, game loop, and ties all systems together
// FIX: Right arm attached to camera, crafting hotkeys, creative mode toggle, proper block interaction

import * as THREE from 'three';
import { World } from './world.js';
import { Player } from './player.js';
import { Inventory } from './inventory.js';
import { DayNightCycle } from './daynight.js';
import { MobManager } from './mobs.js';
import { UI } from './ui.js';
import { createTextureAtlas, setAtlasCanvas, ATLAS_TILES } from './textures.js';
import { BlockType, BlockData, isItem } from './blocks.js';
import { CHUNK_SIZE } from './chunk.js';

// ===== GAME STATE =====
let renderer, scene, camera;
let world, player, inventory, dayNight, mobs, ui;
let clock;
let isPlaying = false;
let gameMode = 'survival'; // 'survival' or 'creative'
let lastHealth = 20;

// ===== INIT =====
function init() {
    // Title screen buttons
    document.getElementById('play-btn').addEventListener('click', () => showModeSelect());
    document.getElementById('survival-btn')?.addEventListener('click', () => startGame('survival'));
    document.getElementById('creative-btn')?.addEventListener('click', () => startGame('creative'));

    // Try to start with mode select hidden
    const modeSelect = document.getElementById('mode-select');
    if (modeSelect) modeSelect.style.display = 'none';
}

function showModeSelect() {
    document.getElementById('title-screen').querySelector('.title-content').style.display = 'none';
    const modeSelect = document.getElementById('mode-select');
    if (modeSelect) {
        modeSelect.style.display = 'flex';
    } else {
        // Fallback: just start survival
        startGame('survival');
    }
}

function startGame(mode) {
    gameMode = mode;
    document.getElementById('title-screen').style.display = 'none';

    // Setup Three.js
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.Fog(0x87CEEB, 80, 200);

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 500);

    renderer = new THREE.WebGLRenderer({
        canvas: document.getElementById('game-canvas'),
        antialias: false,
        powerPreference: 'high-performance'
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Create texture atlas
    const atlas = createTextureAtlas();
    setAtlasCanvas(atlas.image);

    // Materials
    const blockMaterial = new THREE.MeshLambertMaterial({
        map: atlas,
        side: THREE.FrontSide,
        alphaTest: 0.1,
    });

    const waterMaterial = new THREE.MeshLambertMaterial({
        map: atlas,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide,
        color: 0x4477dd,
    });

    // Inventory
    const isCreative = mode === 'creative';
    inventory = new Inventory(isCreative);

    // World
    world = new World(scene, blockMaterial, waterMaterial);

    // Player
    player = new Player(camera, world);
    player.creative = isCreative;
    if (isCreative) {
        player.flying = true; // Start flying in creative
    }

    // Add block highlight to scene
    scene.add(player.highlightBox);

    // Add right arm to camera
    camera.add(player.rightArm);
    scene.add(camera);

    // Day/Night cycle
    dayNight = new DayNightCycle(scene);

    // Mobs
    mobs = new MobManager(world, scene);

    // UI
    ui = new UI();

    // Clock
    clock = new THREE.Clock();
    lastHealth = player.health;

    // Show HUD
    document.getElementById('hud').style.display = 'block';
    document.getElementById('crosshair').style.display = 'block';

    // Hide health/hunger in creative
    if (isCreative) {
        const healthBar = document.getElementById('health-bar');
        const hungerBar = document.getElementById('hunger-bar');
        if (healthBar) healthBar.style.display = 'none';
        if (hungerBar) hungerBar.style.display = 'none';
    }

    // Input handlers
    setupGameInput();

    // Initial world gen
    world.update(player.position, true);

    // Find a safe spawn
    spawnPlayer();

    // Start pointer lock on click
    renderer.domElement.addEventListener('click', () => {
        if (!ui.craftingOpen) {
            renderer.domElement.requestPointerLock();
        }
    });

    document.addEventListener('pointerlockchange', () => {
        player.mouseLocked = document.pointerLockElement === renderer.domElement;
    });

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    isPlaying = true;
    animate();
}

function spawnPlayer() {
    // Find a solid block under x=8, z=8
    for (let y = CHUNK_SIZE * 7; y > 30; y--) {
        const block = world.getBlock(8, y, 8);
        const above = world.getBlock(8, y + 1, 8);
        const above2 = world.getBlock(8, y + 2, 8);
        if (block !== BlockType.AIR && block !== BlockType.WATER &&
            above === BlockType.AIR && above2 === BlockType.AIR) {
            player.position.set(8.5, y + 1.5, 8.5);
            return;
        }
    }
    player.position.set(8.5, 80, 8.5);
}

function setupGameInput() {
    // Mouse buttons: left = break, right = place
    document.addEventListener('mousedown', (e) => {
        if (!player.mouseLocked) return;
        if (ui.craftingOpen) return;

        if (e.button === 0) {
            // Left click — break block
            const broke = player.breakBlock(world, inventory);
            if (!broke) player.swingArm(); // Still swing arm on miss
        } else if (e.button === 2) {
            // Right click — place block or interact
            const hit = player.raycast();
            if (hit) {
                const blockType = hit.block;
                // Check for interactive blocks
                if (blockType === BlockType.CRAFTING_TABLE) {
                    exitPointerLock();
                    ui.openCrafting('table', inventory);
                    return;
                }
                if (blockType === BlockType.FURNACE) {
                    exitPointerLock();
                    ui.openCrafting('furnace', inventory);
                    return;
                }
            }
            // Otherwise place block
            player.placeBlock(world, inventory);
        }
    });

    // Prevent context menu
    document.addEventListener('contextmenu', (e) => e.preventDefault());

    // Scroll wheel — hotbar slot selection
    document.addEventListener('wheel', (e) => {
        if (ui.craftingOpen) return;
        if (e.deltaY > 0) {
            inventory.selectedSlot = (inventory.selectedSlot + 1) % 9;
        } else {
            inventory.selectedSlot = (inventory.selectedSlot + 8) % 9;
        }
    });

    // Keyboard
    document.addEventListener('keydown', (e) => {
        // Number keys — select hotbar slot
        if (e.code >= 'Digit1' && e.code <= 'Digit9') {
            const slot = parseInt(e.code.replace('Digit', '')) - 1;
            inventory.selectedSlot = slot;
        }

        // E — open/close inventory crafting (2x2)
        if (e.code === 'KeyE') {
            if (ui.craftingOpen) {
                ui.closeCrafting(inventory);
                renderer.domElement.requestPointerLock();
            } else {
                exitPointerLock();
                ui.openCrafting('inventory', inventory);
            }
        }

        // Escape — close any open UI
        if (e.code === 'Escape') {
            if (ui.craftingOpen) {
                ui.closeCrafting(inventory);
            }
        }

        // F3 — toggle debug info
        if (e.code === 'F3') {
            e.preventDefault();
            const debug = document.getElementById('debug-info');
            if (debug) {
                debug.style.display = debug.style.display === 'none' ? 'block' : 'none';
            }
        }

        // Q — drop item
        if (e.code === 'KeyQ') {
            const held = inventory.getHeldItem();
            if (held) {
                inventory.removeFromSlot(inventory.selectedSlot, 1);
            }
        }

        // Right-click food: eat if holding food
        // (Actually handled via a key since right-click places blocks)
        // F — eat held item if it's food
        if (e.code === 'KeyF') {
            const held = inventory.getHeldItem();
            if (held) {
                if (held.type === BlockType.COOKED_PORK) {
                    player.eat(8, 12);
                    inventory.removeFromSlot(inventory.selectedSlot, 1);
                } else if (held.type === BlockType.RAW_PORK) {
                    player.eat(3, 2);
                    inventory.removeFromSlot(inventory.selectedSlot, 1);
                }
            }
        }
    });
}

function exitPointerLock() {
    document.exitPointerLock();
    player.mouseLocked = false;
}

// ===== GAME LOOP =====
function animate() {
    if (!isPlaying) return;
    requestAnimationFrame(animate);

    const dt = Math.min(clock.getDelta(), 0.1);

    // Update systems
    player.update(dt, inventory);
    world.update(player.position);
    dayNight.update(dt);
    mobs.update(dt, player.position, world);

    // Check for damage flash
    if (player.health < lastHealth) {
        ui.flashDamage();
    }
    lastHealth = player.health;

    // Update UI
    ui.update(player, inventory, world);

    // Update fog & sky to match day/night
    const skyColor = scene.background;
    if (scene.fog) {
        scene.fog.color.copy(skyColor);
    }

    // Render
    renderer.render(scene, camera);
}

// ===== START =====
document.addEventListener('DOMContentLoaded', init);
