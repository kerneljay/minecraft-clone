// Main entry point — sets up Three.js renderer, game loop, and ties all systems together
// FIX: Right arm attached to camera, crafting hotkeys, creative mode toggle, proper block interaction

import * as THREE from 'three';
import { inject } from '@vercel/analytics';
import { World } from './world.js';
import { Player } from './player.js';
import { Inventory } from './inventory.js';
import { DayNightCycle } from './daynight.js';
import { MobManager } from './mobs.js';
import { UI } from './ui.js';
import { createTextureAtlas, setAtlasCanvas, ATLAS_TILES } from './textures.js';
import { BlockType, BlockData, isItem } from './blocks.js';
import { CHUNK_SIZE } from './chunk.js';

// Vercel analytics
inject();

// ===== GAME STATE =====
let renderer, scene, camera;
let world, player, inventory, dayNight, mobs, ui;
let clock;
let isPlaying = false;
let gameMode = 'survival'; // Only survival for now
let lastHealth = 20;
let gamePeaceful = false;
let gameRenderDist = 6;

// ===== VIDEO BACKGROUND =====
function initVideoBackground() {
    const vid1 = document.getElementById('bg-vid-1');
    const vid2 = document.getElementById('bg-vid-2');
    if (!vid1 || !vid2) return;

    let currentVid = vid1;
    let nextVid = vid2;

    function playNext() {
        // Fade out current, fade in next
        currentVid.classList.remove('active');
        nextVid.classList.add('active');
        nextVid.currentTime = 0;
        nextVid.play().catch(() => { });

        // Swap references
        const temp = currentVid;
        currentVid = nextVid;
        nextVid = temp;
    }

    // Start first video
    vid1.classList.add('active');
    vid1.play().catch(() => { });

    // When a video ends, crossfade to the other
    vid1.addEventListener('ended', playNext);
    vid2.addEventListener('ended', playNext);
}

// ===== INIT =====
function init() {
    // Video background
    initVideoBackground();

    // Title screen buttons
    document.getElementById('play-btn').addEventListener('click', () => showModeSelect());
    document.getElementById('survival-btn')?.addEventListener('click', () => startGame('survival'));
    document.getElementById('back-btn')?.addEventListener('click', () => showMainMenu());

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
    const mainMenu = document.getElementById('main-menu');
    if (mainMenu) mainMenu.style.display = 'none';
    const modeSelect = document.getElementById('mode-select');
    if (modeSelect) {
        modeSelect.style.display = 'flex';
    } else {
        startGame('survival');
    }
}

function showMainMenu() {
    const mainMenu = document.getElementById('main-menu');
    if (mainMenu) mainMenu.style.display = 'flex';
    const modeSelect = document.getElementById('mode-select');
    if (modeSelect) modeSelect.style.display = 'none';
}

async function startGame(mode) {
    gameMode = mode;
    document.getElementById('title-screen').style.display = 'none';

    // Show loading screen
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) loadingScreen.style.display = 'flex';
    const loadingText = document.getElementById('loading-text');
    if (loadingText) loadingText.textContent = 'Building Terrain...';

    // Let the loading screen render before heavy work
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

    // Setup Three.js
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    const fogDist = gameRenderDist * 16;
    scene.fog = new THREE.Fog(0x87CEEB, fogDist * 0.75, fogDist * 1.4);

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

    // Item drops
    droppedItems = new DroppedItems(scene);
    // Expose droppedItems globally so player mining can use it
    window._droppedItems = droppedItems;

    // UI
    ui = new UI();

    // Clock
    clock = new THREE.Clock();
    lastHealth = player.health;

    // Hide loading screen, show HUD
    if (loadingScreen) loadingScreen.style.display = 'none';
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

    // Respawn button handler
    document.getElementById('respawn-btn').addEventListener('click', handleRespawn);

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

// ===== ITEM DROPS =====
class DroppedItems {
    constructor(scene) {
        this.scene = scene;
        this.items = [];
    }

    spawnDrop(x, y, z, blockType) {
        const color = this.getColor(blockType);
        const geo = new THREE.BoxGeometry(0.25, 0.25, 0.25);
        const mat = new THREE.MeshLambertMaterial({ color });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x + 0.5, y + 0.3, z + 0.5);
        mesh.castShadow = true;
        this.scene.add(mesh);

        this.items.push({
            mesh,
            type: blockType,
            baseY: y + 0.3,
            time: 0,
            collected: false,
        });
    }

    update(dt, playerPos, inventory) {
        for (let i = this.items.length - 1; i >= 0; i--) {
            const item = this.items[i];
            item.time += dt;

            // Gentle bob and spin
            item.mesh.position.y = item.baseY + Math.sin(item.time * 2.5) * 0.1;
            item.mesh.rotation.y += dt * 2;

            // Check pickup distance
            const dx = playerPos.x - item.mesh.position.x;
            const dy = playerPos.y - item.mesh.position.y;
            const dz = playerPos.z - item.mesh.position.z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

            if (dist < 2.0 && !item.collected) {
                // Suck toward player
                const speed = Math.max(8, 12 / dist);
                item.mesh.position.x += (dx / dist) * speed * dt;
                item.mesh.position.y += (dy / dist) * speed * dt;
                item.mesh.position.z += (dz / dist) * speed * dt;

                if (dist < 0.8) {
                    // Collect
                    item.collected = true;
                    inventory.addItem(item.type, 1);
                    this.scene.remove(item.mesh);
                    item.mesh.geometry.dispose();
                    item.mesh.material.dispose();
                    this.items.splice(i, 1);
                }
            }
        }
    }

    getColor(type) {
        const colors = {
            [BlockType.GRASS]: 0x5F9F35,
            [BlockType.DIRT]: 0x866049,
            [BlockType.STONE]: 0x7D7D7D,
            [BlockType.SAND]: 0xDCD3A0,
            [BlockType.WOOD]: 0x674E31,
            [BlockType.LEAVES]: 0x348228,
            [BlockType.PLANKS]: 0xC29D62,
            [BlockType.COBBLESTONE]: 0x7A7A7A,
            [BlockType.COAL_ORE]: 0x333333,
            [BlockType.IRON_ORE]: 0xC4A88F,
            [BlockType.GOLD_ORE]: 0xFFD700,
            [BlockType.DIAMOND_ORE]: 0x22DDDD,
            [BlockType.GRAVEL]: 0x887E7E,
            [BlockType.SNOW]: 0xF5F5FF,
            [BlockType.ICE]: 0x94BCFF,
            [BlockType.CACTUS]: 0x377826,
            [BlockType.CLAY]: 0x9EA4B0,
            [BlockType.GLASS]: 0xC8DCFF,
            [BlockType.BRICK]: 0x964A36,
            [BlockType.BOOKSHELF]: 0x8B3A3A,
            [BlockType.CRAFTING_TABLE]: 0xC29D62,
            [BlockType.FURNACE]: 0x828282,
            [BlockType.TNT]: 0xC81E1E,
        };
        return colors[type] || 0x888888;
    }
}

let droppedItems = null;

// ===== DEATH / RESPAWN =====
let isDead = false;

function showDeathScreen() {
    isDead = true;
    const deathScreen = document.getElementById('death-screen');
    deathScreen.style.display = 'flex';
    document.exitPointerLock();
    player.mouseLocked = false;
    // Score = number of items in inventory
    let score = 0;
    for (const slot of inventory.slots) {
        if (slot) score += slot.count;
    }
    document.getElementById('death-score').textContent = score;
}

function handleRespawn() {
    isDead = false;
    document.getElementById('death-screen').style.display = 'none';
    player.health = 20;
    player.hunger = 20;
    player.saturation = 5;
    // Clear inventory on death
    for (let i = 0; i < inventory.slots.length; i++) {
        inventory.slots[i] = null;
    }
    spawnPlayer();
    lastHealth = 20;
}

// ===== 3D MINING CRACK ON BLOCK =====
let crackMesh = null;
let crackTextures = [];

function initMiningCrack() {
    // Minecraft-style destroy stages: scattered cracks across the face
    // Each stage adds more lines, making the block look increasingly damaged
    const stages = 5;
    const size = 64;

    // Scattered cracks — NOT from center, just random segments across the face
    // Each line is [x1, y1, x2, y2] — all horizontal or vertical
    const stageCracks = [
        // Stage 1: a few small scattered cracks
        [
            [10, 18, 28, 18],  // horizontal top-left area
            [40, 44, 40, 58],  // vertical bottom-right area
        ],
        // Stage 2: more cracks appearing in different areas
        [
            [36, 10, 56, 10],  // horizontal top-right
            [8, 38, 8, 54],    // vertical left side
            [44, 30, 58, 30],  // horizontal mid-right
        ],
        // Stage 3: filling in, getting denser
        [
            [14, 48, 34, 48],  // horizontal bottom-left
            [52, 16, 52, 36],  // vertical right side
            [4, 8, 22, 8],     // horizontal top-left corner
            [28, 24, 28, 42],  // vertical center-left
        ],
        // Stage 4: heavy damage
        [
            [16, 32, 40, 32],  // horizontal mid
            [8, 58, 30, 58],   // horizontal bottom
            [48, 48, 60, 48],  // horizontal bottom-right
            [20, 4, 20, 18],   // vertical top
            [56, 40, 56, 58],  // vertical right-bottom
        ],
        // Stage 5: nearly broken — dense cracks everywhere
        [
            [4, 24, 18, 24],   // horizontal
            [32, 56, 54, 56],  // horizontal bottom
            [36, 4, 36, 20],   // vertical top-center
            [12, 12, 12, 28],  // vertical left-upper
            [46, 22, 60, 22],  // horizontal right
            [24, 40, 24, 56],  // vertical center
        ],
    ];

    let cumulativeCanvas = null;

    for (let s = 0; s < stages; s++) {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        if (cumulativeCanvas) {
            ctx.drawImage(cumulativeCanvas, 0, 0);
        }

        // Dark crack lines
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.lineWidth = 2;
        ctx.lineCap = 'square';

        for (const [x1, y1, x2, y2] of stageCracks[s]) {
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }

        cumulativeCanvas = canvas;

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
    if (isDead) {
        renderer.render(scene, camera);
        return;
    }

    player.update(dt, inventory);

    // Survival mining: continuous hold-to-break
    if (!player.creative && window._leftMouseHeld && window._leftMouseHeld()) {
        player.startMining(world, inventory);
    }
    player.updateMining(dt, world, inventory);
    updateMiningCrack();

    // Item drops
    if (droppedItems) droppedItems.update(dt, player.position, inventory);

    world.update(player.position);
    dayNight.update(dt, player.position);
    const mobResult = mobs.update(dt, player.position, dayNight.isNight());
    if (mobResult && mobResult.type === 'damage' && !player.creative) {
        player.health = Math.max(0, player.health - mobResult.amount);
    }

    // Check death
    if (player.health <= 0 && !isDead) {
        showDeathScreen();
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
