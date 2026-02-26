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
let isPaused = false;
let gameMode = 'survival';
let lastHealth = 20;
let gamePeaceful = false;
let gameRenderDist = 10;
let performanceController = null;
let pauseMenuEl = null;
let currentWorldSaveId = null;
let currentWorldName = '';
let currentWorldCreatedAt = null;
let autosaveTimer = 0;
let developerDebugEnabled = false;
let f3DebugEnabled = false;

const SAVE_INDEX_KEY = 'mineclone:world-index';
const SAVE_DATA_PREFIX = 'mineclone:world:';
const SAVE_VERSION = 1;
const AUTOSAVE_INTERVAL = 5;

class PerformanceController {
    constructor(renderer, world) {
        this.renderer = renderer;
        this.world = world;
        this.maxPixelRatio = Math.min(window.devicePixelRatio, 2);
        this.minPixelRatio = 0.75;
        this.pixelRatio = this.maxPixelRatio;
        this.smoothedDt = 1 / 60;
        this.lowFpsSeconds = 0;
        this.highFpsSeconds = 0;
        this.adjustCooldown = 0;
        this.lastWorldProfile = 'normal';
        this.world.setPerformanceProfile(this.lastWorldProfile);
    }

    update(dt) {
        if (!Number.isFinite(dt) || dt <= 0) return;

        this.smoothedDt += (dt - this.smoothedDt) * 0.08;
        const fps = 1 / this.smoothedDt;
        this.adjustCooldown = Math.max(0, this.adjustCooldown - dt);

        if (fps < 53) {
            this.lowFpsSeconds += dt;
            this.highFpsSeconds = Math.max(0, this.highFpsSeconds - dt);
        } else if (fps > 59) {
            this.highFpsSeconds += dt;
            this.lowFpsSeconds = Math.max(0, this.lowFpsSeconds - dt);
        } else {
            this.lowFpsSeconds = Math.max(0, this.lowFpsSeconds - dt * 0.5);
            this.highFpsSeconds = Math.max(0, this.highFpsSeconds - dt * 0.5);
        }

        if (this.adjustCooldown <= 0 && this.lowFpsSeconds > 0.5) {
            this.adjustPixelRatio(-0.1);
            this.lowFpsSeconds = 0;
            this.adjustCooldown = 0.6;
        } else if (this.adjustCooldown <= 0 && this.highFpsSeconds > 2.5) {
            this.adjustPixelRatio(0.05);
            this.highFpsSeconds = 0;
            this.adjustCooldown = 0.8;
        }

        let worldProfile = 'normal';
        if (fps < 50) {
            worldProfile = 'low';
        } else if (fps > 58 && this.pixelRatio >= this.maxPixelRatio - 0.05) {
            worldProfile = 'high';
        }
        if (worldProfile !== this.lastWorldProfile) {
            this.world.setPerformanceProfile(worldProfile);
            this.lastWorldProfile = worldProfile;
        }
    }

    adjustPixelRatio(delta) {
        const nextRatio = Math.min(this.maxPixelRatio, Math.max(this.minPixelRatio, this.pixelRatio + delta));
        if (Math.abs(nextRatio - this.pixelRatio) < 0.01) return;
        this.pixelRatio = nextRatio;
        this.renderer.setPixelRatio(this.pixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    }

    handleResize() {
        this.maxPixelRatio = Math.min(window.devicePixelRatio, 2);
        if (this.pixelRatio > this.maxPixelRatio) {
            this.pixelRatio = this.maxPixelRatio;
            this.renderer.setPixelRatio(this.pixelRatio);
        }
        this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    }
}

function getSaveStorageKey(id) {
    return `${SAVE_DATA_PREFIX}${id}`;
}

function readWorldIndex() {
    try {
        const raw = localStorage.getItem(SAVE_INDEX_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed
            .filter((entry) => entry && typeof entry.id === 'string')
            .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    } catch {
        return [];
    }
}

function writeWorldIndex(index) {
    localStorage.setItem(SAVE_INDEX_KEY, JSON.stringify(index));
}

function upsertWorldIndexEntry(record) {
    const index = readWorldIndex();
    const entry = {
        id: record.id,
        name: record.name,
        seed: record.seed,
        mode: record.mode,
        peaceful: !!record.peaceful,
        renderDistance: record.renderDistance,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
    };

    const existingIdx = index.findIndex((it) => it.id === record.id);
    if (existingIdx >= 0) {
        index[existingIdx] = entry;
    } else {
        index.push(entry);
    }
    index.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    writeWorldIndex(index);
}

function readWorldSave(id) {
    if (!id) return null;
    try {
        const raw = localStorage.getItem(getSaveStorageKey(id));
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return null;
        if (parsed.id !== id) return null;
        return parsed;
    } catch {
        return null;
    }
}

function writeWorldSave(record) {
    const normalized = {
        version: SAVE_VERSION,
        id: record.id,
        name: record.name || 'New World',
        seed: Number.isFinite(record.seed) ? record.seed : 12345,
        mode: record.mode === 'creative' ? 'creative' : 'survival',
        peaceful: !!record.peaceful,
        renderDistance: Number.isFinite(record.renderDistance) ? record.renderDistance : 10,
        createdAt: record.createdAt || Date.now(),
        updatedAt: record.updatedAt || Date.now(),
        state: record.state || { modifiedBlocks: {} },
        player: record.player || null,
    };
    localStorage.setItem(getSaveStorageKey(normalized.id), JSON.stringify(normalized));
    upsertWorldIndexEntry(normalized);
    return normalized;
}

function createWorldId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function parseSeedValue(seedValue) {
    const seedStr = String(seedValue || '').trim();
    if (!seedStr) {
        return Math.floor(Math.random() * 2147483647);
    }
    if (!isNaN(seedStr)) {
        return parseInt(seedStr, 10);
    }
    let hash = 0;
    for (let i = 0; i < seedStr.length; i++) {
        hash = ((hash << 5) - hash) + seedStr.charCodeAt(i);
        hash |= 0;
    }
    return hash;
}

function getDefaultWorldName() {
    const worldCount = readWorldIndex().length + 1;
    return `New World ${worldCount}`;
}

function formatWorldTimestamp(ts) {
    if (!ts) return 'Unknown date';
    try {
        return new Date(ts).toLocaleString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return 'Unknown date';
    }
}

function renderSavedWorldsList() {
    const listEl = document.getElementById('saved-worlds-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    const saves = readWorldIndex();
    if (saves.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'saved-world-empty';
        empty.textContent = 'No saved worlds yet.';
        listEl.appendChild(empty);
        return;
    }

    for (const save of saves) {
        const item = document.createElement('div');
        item.className = 'saved-world-item';

        const info = document.createElement('div');
        info.className = 'saved-world-info';

        const nameEl = document.createElement('div');
        nameEl.className = 'saved-world-name';
        nameEl.textContent = save.name || 'Unnamed World';

        const modeLabel = save.mode === 'creative' ? 'Creative' : 'Survival';
        const lastPlayedEl = document.createElement('div');
        lastPlayedEl.className = 'saved-world-meta';
        lastPlayedEl.textContent = `Last Played: ${formatWorldTimestamp(save.updatedAt)}`;

        const detailEl = document.createElement('div');
        detailEl.className = 'saved-world-submeta';
        detailEl.textContent = `${modeLabel} • Seed: ${save.seed ?? '-'} • Render Distance: ${save.renderDistance ?? '-'}`;

        const playBtn = document.createElement('button');
        playBtn.className = 'mc-btn saved-world-play';
        playBtn.textContent = 'Play';
        playBtn.addEventListener('click', () => {
            startGame(save.mode || 'survival', { saveId: save.id });
        });

        info.appendChild(nameEl);
        info.appendChild(lastPlayedEl);
        info.appendChild(detailEl);
        item.appendChild(info);
        item.appendChild(playBtn);
        listEl.appendChild(item);
    }
}

function saveCurrentWorldState() {
    if (!currentWorldSaveId || !world) return;

    const playerState = player ? {
        x: player.position.x,
        y: player.position.y,
        z: player.position.z,
        health: player.health,
        hunger: player.hunger,
        saturation: player.saturation,
        flying: !!player.flying,
    } : null;

    writeWorldSave({
        id: currentWorldSaveId,
        name: currentWorldName || 'New World',
        seed: world.seed,
        mode: gameMode,
        peaceful: gamePeaceful,
        renderDistance: world.renderDistance,
        createdAt: currentWorldCreatedAt || Date.now(),
        updatedAt: Date.now(),
        state: world.getSaveState ? world.getSaveState() : { modifiedBlocks: {} },
        player: playerState,
    });
}

function isDebugOverlayVisible() {
    return developerDebugEnabled || f3DebugEnabled;
}

function updateDebugToggleButton() {
    const btn = document.getElementById('debug-toggle-btn');
    if (!btn) return;
    btn.textContent = `Developer Debug: ${developerDebugEnabled ? 'ON' : 'OFF'}`;
    btn.classList.toggle('debug-on', developerDebugEnabled);
}

function refreshDebugOverlayVisibility() {
    const debugEl = ui?.debugInfo || document.getElementById('debug-info');
    if (debugEl) {
        debugEl.style.display = isDebugOverlayVisible() ? 'block' : 'none';
    }
    updateDebugToggleButton();
}

function applyDeveloperModeToPlayer() {
    if (!player) return;
    player.devMode = developerDebugEnabled;
    if (!developerDebugEnabled && !player.creative && player.flying) {
        player.flying = false;
        if (player.velocity) player.velocity.y = 0;
    }
}

function toggleDeveloperDebug() {
    developerDebugEnabled = !developerDebugEnabled;
    applyDeveloperModeToPlayer();
    refreshDebugOverlayVisibility();
}

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
    document.getElementById('debug-toggle-btn')?.addEventListener('click', toggleDeveloperDebug);
    document.getElementById('resume-btn')?.addEventListener('click', () => closePauseMenu(true));
    document.getElementById('leave-world-btn')?.addEventListener('click', leaveWorld);
    document.getElementById('survival-btn')?.addEventListener('click', () => {
        const creativeCb = document.getElementById('creative-cb');
        const mode = (creativeCb && creativeCb.checked) ? 'creative' : 'survival';
        startGame(mode);
    });
    document.getElementById('back-btn')?.addEventListener('click', () => showMainMenu());
    pauseMenuEl = document.getElementById('pause-menu');
    updateDebugToggleButton();
    renderSavedWorldsList();

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

    const worldNameInput = document.getElementById('world-name-input');
    if (worldNameInput && !worldNameInput.value.trim()) {
        worldNameInput.value = getDefaultWorldName();
    }

    window.addEventListener('beforeunload', () => {
        saveCurrentWorldState();
    });
}

function showModeSelect() {
    const mainMenu = document.getElementById('main-menu');
    if (mainMenu) mainMenu.style.display = 'none';
    const modeSelect = document.getElementById('mode-select');
    if (modeSelect) {
        modeSelect.style.display = 'flex';
        renderSavedWorldsList();
        const worldNameInput = document.getElementById('world-name-input');
        if (worldNameInput && !worldNameInput.value.trim()) {
            worldNameInput.value = getDefaultWorldName();
        }
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

async function startGame(mode, options = {}) {
    const { saveId = null } = options;
    let saveRecord = null;
    let gameSeed = 12345;

    if (saveId) {
        saveRecord = readWorldSave(saveId);
        if (!saveRecord) {
            renderSavedWorldsList();
            return;
        }

        currentWorldSaveId = saveRecord.id;
        currentWorldName = saveRecord.name || 'Unnamed World';
        currentWorldCreatedAt = saveRecord.createdAt || Date.now();
        gameMode = saveRecord.mode === 'creative' ? 'creative' : 'survival';
        gamePeaceful = !!saveRecord.peaceful;
        gameRenderDist = Number.isFinite(saveRecord.renderDistance)
            ? Math.max(2, Math.min(64, parseInt(saveRecord.renderDistance, 10)))
            : gameRenderDist;
        gameSeed = Number.isFinite(saveRecord.seed) ? saveRecord.seed : 12345;
    } else {
        gameMode = mode;
        const worldNameInput = document.getElementById('world-name-input');
        const worldName = worldNameInput?.value?.trim() || getDefaultWorldName();
        if (worldNameInput) worldNameInput.value = worldName;
        currentWorldName = worldName;
        currentWorldCreatedAt = Date.now();

        const seedInput = document.getElementById('seed-input');
        gameSeed = parseSeedValue(seedInput ? seedInput.value : '');

        saveRecord = writeWorldSave({
            id: createWorldId(),
            name: currentWorldName,
            seed: gameSeed,
            mode: gameMode,
            peaceful: gamePeaceful,
            renderDistance: gameRenderDist,
            createdAt: currentWorldCreatedAt,
            updatedAt: currentWorldCreatedAt,
            state: { modifiedBlocks: {} },
            player: null,
        });
        currentWorldSaveId = saveRecord.id;
        renderSavedWorldsList();
    }

    autosaveTimer = 0;
    isPaused = false;
    document.getElementById('title-screen').style.display = 'none';
    if (pauseMenuEl) pauseMenuEl.style.display = 'none';

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
    scene.fog = new THREE.FogExp2(0x87CEEB, 0.008);

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 2400);

    renderer = new THREE.WebGLRenderer({
        canvas: document.getElementById('game-canvas'),
        antialias: true,
        powerPreference: 'high-performance'
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = false;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Underwater overlay
    const underwaterOverlay = document.createElement('div');
    underwaterOverlay.id = 'underwater-overlay';
    underwaterOverlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(10,30,90,0.45);pointer-events:none;z-index:5;opacity:0;transition:opacity 0.3s;';
    document.body.appendChild(underwaterOverlay);
    window._underwaterOverlay = underwaterOverlay;

    // Create texture atlas
    const atlas = createTextureAtlas();
    setAtlasCanvas(atlas.image);

    // Materials
    const foliageTimeUniform = { value: 0.0 };
    window._foliageTimeUniform = foliageTimeUniform;

    const blockMaterial = new THREE.MeshLambertMaterial({
        map: atlas,
        side: THREE.FrontSide,
        alphaTest: 0.1,
    });

    // Inject foliage waving into vertex shader
    blockMaterial.onBeforeCompile = (shader) => {
        shader.uniforms.uFoliageTime = foliageTimeUniform;

        // Add attribute + uniform declarations before main()
        shader.vertexShader = shader.vertexShader.replace(
            'void main() {',
            `attribute float aFoliage;
            uniform float uFoliageTime;
            void main() {`
        );

        // Add displacement after transformed position is computed
        shader.vertexShader = shader.vertexShader.replace(
            '#include <begin_vertex>',
            `#include <begin_vertex>
            if (aFoliage > 0.5) {
                float windX = sin(uFoliageTime * 1.5 + position.x * 0.5 + position.z * 0.7) * 0.08;
                float windZ = cos(uFoliageTime * 1.2 + position.z * 0.6 + position.x * 0.4) * 0.06;
                transformed.x += windX * aFoliage;
                transformed.z += windZ * aFoliage;
            }`
        );
    };

    const waterMaterial = new THREE.MeshLambertMaterial({
        map: atlas,
        transparent: true,
        opacity: 0.7,
        side: THREE.FrontSide,
        color: 0x2070b0,
        depthWrite: false,
    });

    // Inventory
    const isCreative = gameMode === 'creative';
    inventory = new Inventory(isCreative);

    console.log('World seed:', gameSeed);
    world = new World(scene, blockMaterial, waterMaterial, gameSeed, saveRecord?.state || null);
    world.renderDistance = gameRenderDist;
    performanceController = new PerformanceController(renderer, world);

    // Player
    player = new Player(camera, world);
    player.creative = isCreative;
    player.devMode = developerDebugEnabled;
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
    // Expose world globally so item drops can check block solidity
    window._world = world;

    // UI
    ui = new UI();
    refreshDebugOverlayVisibility();

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
    spawnPlayer(saveRecord?.player || null);

    // Respawn button handler
    document.getElementById('respawn-btn').addEventListener('click', handleRespawn);

    // Start pointer lock on click
    renderer.domElement.addEventListener('click', () => {
        if (!ui.craftingOpen && !isPaused) {
            renderer.domElement.requestPointerLock();
        }
    });

    document.addEventListener('pointerlockchange', () => {
        player.mouseLocked = document.pointerLockElement === renderer.domElement;
        // Cancel mining when pointer lock is lost
        if (!player.mouseLocked) {
            player.cancelMining();
        }
    });

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        if (performanceController) {
            performanceController.handleResize();
        } else {
            renderer.setSize(window.innerWidth, window.innerHeight);
        }
    });

    isPlaying = true;
    animate();
}

function spawnPlayer(savedPlayer = null) {
    if (savedPlayer &&
        Number.isFinite(savedPlayer.x) &&
        Number.isFinite(savedPlayer.y) &&
        Number.isFinite(savedPlayer.z)) {
        player.position.set(savedPlayer.x, savedPlayer.y, savedPlayer.z);
        if (Number.isFinite(savedPlayer.health)) {
            player.health = Math.max(0, Math.min(20, savedPlayer.health));
        }
        if (Number.isFinite(savedPlayer.hunger)) {
            player.hunger = Math.max(0, Math.min(20, savedPlayer.hunger));
        }
        if (Number.isFinite(savedPlayer.saturation)) {
            player.saturation = Math.max(0, Math.min(20, savedPlayer.saturation));
        }
        player.flying = !!savedPlayer.flying && (player.creative || player.devMode);
        return;
    }

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
        if (isPaused) return;
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

    // Scroll wheel — fly speed while flying, otherwise hotbar selection
    document.addEventListener('wheel', (e) => {
        if (isPaused) return;
        if (ui.craftingOpen) return;

        if (player?.flying) {
            const increaseFlySpeed = e.deltaY < 0;
            player.adjustFlySpeed(increaseFlySpeed);
            return;
        }

        if (e.deltaY > 0) {
            inventory.selectedSlot = (inventory.selectedSlot + 1) % 9;
        } else {
            inventory.selectedSlot = (inventory.selectedSlot + 8) % 9;
        }
    });

    // Keyboard
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Escape') {
            e.preventDefault();
            if (ui.craftingOpen) {
                ui.closeCrafting(inventory);
                return;
            }
            if (isDead) return;
            if (isPaused) {
                closePauseMenu(true);
            } else {
                openPauseMenu();
            }
            return;
        }

        if (isPaused) return;

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

        // F3 — toggle debug info
        if (e.code === 'F3') {
            e.preventDefault();
            f3DebugEnabled = !f3DebugEnabled;
            refreshDebugOverlayVisibility();
        }

        // Q — toggle coordinate display
        if (e.code === 'KeyQ') {
            const coordDisplay = document.getElementById('coord-display');
            if (coordDisplay) {
                coordDisplay.style.display = coordDisplay.style.display === 'none' ? 'block' : 'none';
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

function openPauseMenu() {
    if (!isPlaying || isPaused || !pauseMenuEl) return;
    isPaused = true;
    pauseMenuEl.style.display = 'flex';
    exitPointerLock();
}

function closePauseMenu(requestPointerLock = false) {
    if (!pauseMenuEl || !isPaused) return;
    isPaused = false;
    pauseMenuEl.style.display = 'none';
    if (requestPointerLock && renderer && !isDead && !ui?.craftingOpen) {
        renderer.domElement.requestPointerLock();
    }
}

function leaveWorld() {
    saveCurrentWorldState();
    isPlaying = false;
    isPaused = false;
    location.reload();
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
        // Spawn slightly above center with small random offset
        mesh.position.set(
            x + 0.3 + Math.random() * 0.4,
            y + 0.5,
            z + 0.3 + Math.random() * 0.4
        );
        mesh.castShadow = true;
        this.scene.add(mesh);

        this.items.push({
            mesh,
            type: blockType,
            vy: 2, // small upward pop
            time: 0,
            collected: false,
            grounded: false,
        });
    }

    update(dt, playerPos, inventory) {
        const gravity = 20;

        for (let i = this.items.length - 1; i >= 0; i--) {
            const item = this.items[i];
            item.time += dt;

            // Spin
            item.mesh.rotation.y += dt * 2;

            // Gravity physics
            if (!item.grounded) {
                item.vy -= gravity * dt;
                item.mesh.position.y += item.vy * dt;

                // Check if landed on a solid block
                const bx = Math.floor(item.mesh.position.x);
                const by = Math.floor(item.mesh.position.y - 0.125);
                const bz = Math.floor(item.mesh.position.z);

                // Use world reference to check block
                const blockBelow = window._world ? window._world.getBlock(bx, by, bz) : 0;
                const belowData = BlockData[blockBelow];
                if (belowData && belowData.solid) {
                    item.mesh.position.y = by + 1 + 0.25;
                    item.vy = 0;
                    item.grounded = true;
                }

                // Despawn if falls below world
                if (item.mesh.position.y < -10) {
                    this.scene.remove(item.mesh);
                    item.mesh.geometry.dispose();
                    item.mesh.material.dispose();
                    this.items.splice(i, 1);
                    continue;
                }
            } else {
                // Check if block below was removed → fall again
                const bx = Math.floor(item.mesh.position.x);
                const by = Math.floor(item.mesh.position.y - 0.3);
                const bz = Math.floor(item.mesh.position.z);
                const blockBelow = window._world ? window._world.getBlock(bx, by, bz) : 0;
                const belowData = BlockData[blockBelow];
                if (!belowData || !belowData.solid) {
                    item.grounded = false;
                    item.vy = 0;
                }
                // Gentle bob when grounded
                item.mesh.position.y += Math.sin(item.time * 2.5) * 0.002;
            }

            // INSTANT pickup when within range — no slow attraction
            const dx = playerPos.x - item.mesh.position.x;
            const dy = playerPos.y - item.mesh.position.y;
            const dz = playerPos.z - item.mesh.position.z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

            if (dist < 2.5 && !item.collected && item.time > 0.3) {
                // Instant collect — zap!
                item.collected = true;
                inventory.addItem(item.type, 1);
                this.scene.remove(item.mesh);
                item.mesh.geometry.dispose();
                item.mesh.material.dispose();
                this.items.splice(i, 1);
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
    saveCurrentWorldState();
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
    // Load user's destroy stage PNGs and convert white/gray to black via canvas
    const loader = new THREE.TextureLoader();
    const stages = 10;
    let loadedCount = 0;

    for (let i = 0; i < stages; i++) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);

            // Convert to black/very dark with high opacity — like real MC cracks
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            for (let p = 0; p < data.length; p += 4) {
                if (data[p + 3] > 0) {
                    // Almost pure black (0-10 range)
                    const brightness = (data[p] + data[p + 1] + data[p + 2]) / 3;
                    const shade = Math.floor((brightness / 255) * 10);
                    data[p] = shade;       // R — black
                    data[p + 1] = shade;   // G
                    data[p + 2] = shade;   // B
                    // High opacity — nearly opaque black lines
                    data[p + 3] = Math.floor(data[p + 3] * 0.90);
                }
            }
            ctx.putImageData(imageData, 0, 0);

            const tex = new THREE.CanvasTexture(canvas);
            tex.magFilter = THREE.NearestFilter;
            tex.minFilter = THREE.NearestFilter;
            crackTextures[i] = tex;
            loadedCount++;
        };
        img.src = `/destroy_stage/Destroy_stage_${i}.png`;
        // Placeholder until loaded
        crackTextures[i] = new THREE.Texture();
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
    if (performanceController) {
        performanceController.update(dt);
    }

    // Update foliage wave time
    if (window._foliageTimeUniform) {
        window._foliageTimeUniform.value += dt;
    }

    // Update systems
    if (isDead) {
        renderer.render(scene, camera);
        return;
    }

    if (isPaused) {
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

    // Void death — fell below the world
    if (player.position.y < -10 && !isDead) {
        player.health = 0;
        showDeathScreen();
    }

    // Check for damage flash
    if (player.health < lastHealth) {
        ui.flashDamage();
    }
    lastHealth = player.health;

    // Update UI
    const debugContext = isDebugOverlayVisible() ? {
        developerMode: developerDebugEnabled,
        frameMs: dt * 1000,
        renderer: renderer ? {
            calls: renderer.info.render.calls,
            triangles: renderer.info.render.triangles,
            lines: renderer.info.render.lines,
            points: renderer.info.render.points,
            geometries: renderer.info.memory.geometries,
            textures: renderer.info.memory.textures,
            pixelRatio: renderer.getPixelRatio(),
        } : null,
        performanceProfile: world?.performanceProfile || 'normal',
        modifiedBlocks: world?.modifiedBlocks ? world.modifiedBlocks.size : 0,
        autosaveIn: currentWorldSaveId ? Math.max(0, AUTOSAVE_INTERVAL - autosaveTimer) : null,
    } : null;
    ui.update(player, inventory, world, dt, debugContext);

    // Underwater detection — check if player's eyes are inside a water block
    const eyeX = Math.floor(player.position.x);
    const eyeY = Math.floor(player.position.y + 1.6); // eye level
    const eyeZ = Math.floor(player.position.z);
    const headBlock = world.getBlock(eyeX, eyeY, eyeZ);
    const isUnderwater = (headBlock === BlockType.WATER);
    window._isUnderwater = isUnderwater;

    if (window._underwaterOverlay) {
        window._underwaterOverlay.style.opacity = isUnderwater ? '1' : '0';
    }

    // Update fog & sky to match day/night or underwater
    if (scene.fog) {
        if (isUnderwater) {
            scene.fog.color.set(0x0a1e5a);
            scene.fog.density = 0.15;
        } else {
            // DayNight cycle sets fog color; we adjust density for render distance
            scene.fog.density = 1.2 / (world.renderDistance * 16);
        }
    }

    if (currentWorldSaveId) {
        autosaveTimer += dt;
        if (autosaveTimer >= AUTOSAVE_INTERVAL) {
            saveCurrentWorldState();
            autosaveTimer = 0;
        }
    }

    // Render
    renderer.render(scene, camera);
}

// ===== START =====
document.addEventListener('DOMContentLoaded', init);
