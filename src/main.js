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
let gamePeaceful = false;
let gameRenderDist = 6;

// ===== INIT =====
function init() {
    // Title screen buttons
    document.getElementById('play-btn').addEventListener('click', () => showModeSelect());
    document.getElementById('survival-btn')?.addEventListener('click', () => startGame('survival'));
    document.getElementById('creative-btn')?.addEventListener('click', () => startGame('creative'));

    // Settings controls
    const peacefulCb = document.getElementById('peaceful-cb');
    if (peacefulCb) peacefulCb.addEventListener('change', (e) => { gamePeaceful = e.target.checked; });
    const rdSlider = document.getElementById('render-dist');
    const rdLabel = document.getElementById('rd-label');
    if (rdSlider) {
        rdSlider.addEventListener('input', (e) => {
            gameRenderDist = parseInt(e.target.value);
            if (rdLabel) rdLabel.textContent = gameRenderDist;
        });
    }

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
        startGame('survival');
    }
}

function startGame(mode) {
    gameMode = mode;
    document.getElementById('title-screen').style.display = 'none';

    // Setup Three.js
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    const fogDist = gameRenderDist * 16;
    scene.fog = new THREE.Fog(0x87CEEB, fogDist * 0.6, fogDist * 1.2);

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 500);

    renderer = new THREE.WebGLRenderer({
        canvas: document.getElementById('game-canvas'),
        antialias: true,
        powerPreference: 'high-performance'
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = false;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

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

    // World (with seed)
    const seedInput = document.getElementById('seed-input');
    let gameSeed = 12345;
    if (seedInput && seedInput.value.trim()) {
        const seedStr = seedInput.value.trim();
        // If it's a number, use it directly; otherwise hash the string
        if (!isNaN(seedStr)) {
            gameSeed = parseInt(seedStr, 10);
        } else {
            // Simple string hash
            gameSeed = 0;
            for (let i = 0; i < seedStr.length; i++) {
                gameSeed = ((gameSeed << 5) - gameSeed) + seedStr.charCodeAt(i);
                gameSeed |= 0; // Convert to 32-bit integer
            }
        }
    } else {
        // Random seed
        gameSeed = Math.floor(Math.random() * 2147483647);
    }
    console.log('World seed:', gameSeed);
    world = new World(scene, blockMaterial, waterMaterial, gameSeed);
    world.renderDistance = gameRenderDist;

    // Player
    player = new Player(camera, world);
    player.creative = isCreative;
    player.peaceful = gamePeaceful;
    if (isCreative) {
        player.flying = true;
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
    // Track left mouse hold state
    let leftMouseHeld = false;

    // Mouse buttons: left = mine (hold), right = place/interact
    document.addEventListener('mousedown', (e) => {
        if (!player.mouseLocked) return;
        if (ui.craftingOpen) return;

        if (e.button === 0) {
            leftMouseHeld = true;
            if (player.creative) {
                // Creative — instant break
                const broke = player.breakBlock(world, inventory);
                if (!broke) player.swingArm();
            } else {
                // Survival — start mining (hold to break)
                player.startMining(world, inventory);
            }
        } else if (e.button === 2) {
            // Right click — place block or interact
            const hit = player.raycast();
            if (hit) {
                const blockType = hit.block;
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
            player.placeBlock(world, inventory);
        }
    });

    document.addEventListener('mouseup', (e) => {
        if (e.button === 0) {
            leftMouseHeld = false;
            player.cancelMining();
        }
    });

    // Continuous mining: re-check each frame if holding left mouse
    window._leftMouseHeld = () => leftMouseHeld;

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

// ===== 3D MINING CRACK ON BLOCK =====
let crackMesh = null;
let crackTextures = [];

function initMiningCrack() {
    // GRID-BASED mining cracks: only horizontal/vertical lines
    // Each stage adds MORE lines on top of the previous stage (additive)
    const stages = 8;
    const size = 64;

    // Pre-define all crack line segments [x1,y1,x2,y2]
    // These are the total set of cracks — each stage reveals more of them
    // Lines are all perfectly horizontal or vertical
    const allCracks = [
        // Stage 1: tiny center cross
        [30, 32, 34, 32],  // short horizontal center
        [32, 30, 32, 34],  // short vertical center

        // Stage 2: extend center cracks
        [25, 32, 39, 32],  // longer horizontal
        [32, 25, 32, 39],  // longer vertical

        // Stage 3: first branches (H/V only)
        [25, 32, 25, 22],  // branch up-left
        [39, 32, 39, 42],  // branch down-right
        [32, 25, 22, 25],  // branch left from top
        [32, 39, 42, 39],  // branch right from bottom

        // Stage 4: more branches + new cracks from edges
        [10, 20, 25, 20],  // top-left horizontal
        [39, 44, 52, 44],  // bottom-right horizontal
        [22, 25, 22, 10],  // extend up-left vertical
        [42, 39, 42, 52],  // extend down-right vertical

        // Stage 5: dense cross-hatching starts
        [15, 30, 15, 45],  // left side vertical
        [48, 15, 48, 35],  // right side vertical
        [10, 20, 10, 30],  // far left vertical
        [10, 45, 30, 45],  // bottom horizontal

        // Stage 6: spreading further
        [5, 12, 22, 12],   // top horizontal
        [40, 50, 58, 50],  // bottom-right horizontal
        [48, 35, 58, 35],  // mid-right horizontal
        [5, 45, 5, 55],    // far left lower vertical

        // Stage 7: near full coverage
        [5, 55, 20, 55],   // bottom left horizontal
        [35, 8, 55, 8],    // top right horizontal
        [55, 8, 55, 25],   // right edge vertical
        [5, 12, 5, 30],    // left edge vertical

        // Stage 8: final cracks
        [20, 55, 20, 62],  // bottom drip
        [55, 25, 60, 25],  // right extension
        [3, 3, 15, 3],     // top-left corner
        [50, 58, 62, 58],  // bottom-right corner
        [3, 3, 3, 12],     // top-left vertical
        [60, 50, 60, 62],  // right-side vertical
    ];

    // Assign crack lines to stages (additive: earlier stages include fewer lines)
    const stageLineCounts = [2, 4, 8, 12, 16, 20, 24, 30];

    // Build cumulative canvases — each stage draws on top of previous
    let cumulativeCanvas = null;
    let cumulativeCtx = null;

    for (let s = 0; s < stages; s++) {
        // Create fresh canvas for each stage by copying the previous
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        // Copy cumulative state from previous stage
        if (cumulativeCanvas) {
            ctx.drawImage(cumulativeCanvas, 0, 0);
        }

        const progress = (s + 1) / stages;

        // Darken the face progressively
        ctx.fillStyle = `rgba(0, 0, 0, ${progress * 0.25})`;
        ctx.fillRect(0, 0, size, size);

        // Draw new lines for this stage
        const prevCount = s > 0 ? stageLineCounts[s - 1] : 0;
        const currCount = Math.min(stageLineCounts[s], allCracks.length);

        ctx.strokeStyle = `rgba(0, 0, 0, ${0.6 + progress * 0.4})`;
        ctx.lineWidth = 1 + progress;
        ctx.lineCap = 'square';

        for (let i = prevCount; i < currCount; i++) {
            const [x1, y1, x2, y2] = allCracks[i];
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }

        // Save this as cumulative for next stage
        cumulativeCanvas = canvas;
        cumulativeCtx = ctx;

        const tex = new THREE.CanvasTexture(canvas);
        tex.magFilter = THREE.NearestFilter;
        tex.minFilter = THREE.NearestFilter;
        crackTextures.push(tex);
    }

    // Create the crack mesh — slightly larger than a block to avoid z-fighting
    const geo = new THREE.BoxGeometry(1.005, 1.005, 1.005);
    const mat = new THREE.MeshBasicMaterial({
        map: crackTextures[0],
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
    });
    crackMesh = new THREE.Mesh(geo, mat);
    crackMesh.visible = false;
    crackMesh.renderOrder = 998;
    scene.add(crackMesh);
}

function updateMiningCrack() {
    if (!crackMesh) initMiningCrack();

    if (player.isMining && player.mineProgress > 0 && player.mineTarget) {
        // Get break time for this block
        const block = world.getBlock(player.mineTarget.x, player.mineTarget.y, player.mineTarget.z);
        const data = BlockData[block];
        const hardness = data ? data.hardness : 1.0;
        const breakTime = Math.max(0.2, hardness * 1.5);
        const progress = Math.min(player.mineProgress / breakTime, 1);

        // Pick crack stage texture
        const stageIndex = Math.min(Math.floor(progress * crackTextures.length), crackTextures.length - 1);
        crackMesh.material.map = crackTextures[stageIndex];
        crackMesh.material.needsUpdate = true;

        // Position on the block being mined
        crackMesh.position.set(
            player.mineTarget.x + 0.5,
            player.mineTarget.y + 0.5,
            player.mineTarget.z + 0.5
        );
        crackMesh.visible = true;
    } else {
        crackMesh.visible = false;
    }
}

// ===== GAME LOOP =====
function animate() {
    if (!isPlaying) return;
    requestAnimationFrame(animate);

    const dt = Math.min(clock.getDelta(), 0.1);

    // Update systems
    player.update(dt, inventory);

    // Survival mining: continuous hold-to-break
    if (!player.creative && window._leftMouseHeld && window._leftMouseHeld()) {
        player.startMining(world, inventory);
    }
    player.updateMining(dt, world, inventory);
    updateMiningCrack();

    world.update(player.position);
    dayNight.update(dt, player.position);
    const mobResult = mobs.update(dt, player.position, dayNight.isNight());
    if (mobResult && mobResult.type === 'damage' && !player.creative) {
        player.health = Math.max(0, player.health - mobResult.amount);
    }

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
