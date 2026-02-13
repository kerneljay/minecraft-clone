// Canvas-generated Minecraft-style texture atlas
// Each texture is 16x16 pixels, arranged in an atlas
// CRITICAL FIX: All 256 atlas tiles are initialized to a visible default to prevent black blocks

import * as THREE from 'three';
import { BlockType } from './blocks.js';

const TILE_SIZE = 16;
const ATLAS_TILES = 16; // 16x16 grid
const ATLAS_SIZE = TILE_SIZE * ATLAS_TILES;

// Color palettes for each block
const COLORS = {
    grass_top: { base: [95, 159, 53], variants: [[87, 147, 45], [102, 168, 58], [80, 140, 40]] },
    grass_side: { base: [134, 96, 67], top: [95, 159, 53] },
    dirt: { base: [134, 96, 67], variants: [[121, 85, 58], [145, 107, 78], [115, 82, 54]] },
    stone: { base: [125, 125, 125], variants: [[115, 115, 115], [135, 135, 135], [105, 105, 105]] },
    sand: { base: [219, 211, 160], variants: [[210, 200, 148], [228, 220, 172], [200, 192, 140]] },
    water: { base: [63, 118, 228], opacity: 0.7 },
    wood_side: { base: [103, 82, 49], bark: [83, 62, 29] },
    wood_top: { base: [166, 136, 73], rings: [133, 103, 53] },
    leaves: { base: [52, 130, 40], variants: [[45, 120, 35], [60, 140, 48], [40, 110, 30]] },
    planks: { base: [194, 157, 98], variants: [[180, 143, 84], [208, 171, 112]] },
    cobblestone: { base: [122, 122, 122], variants: [[105, 105, 105], [140, 140, 140], [95, 95, 95]] },
    bedrock: { base: [85, 85, 85], variants: [[65, 65, 65], [100, 100, 100], [50, 50, 50]] },
    coal_ore: { base: [115, 115, 115], ore: [35, 35, 35] },
    iron_ore: { base: [115, 115, 115], ore: [196, 168, 143] },
    gold_ore: { base: [115, 115, 115], ore: [255, 215, 0] },
    diamond_ore: { base: [115, 115, 115], ore: [45, 220, 220] },
    gravel: { base: [136, 126, 126], variants: [[120, 110, 110], [152, 142, 142], [108, 98, 98]] },
    snow: { base: [245, 245, 255], variants: [[240, 240, 252], [250, 250, 255]] },
    ice: { base: [148, 188, 255], opacity: 0.85 },
    cactus_side: { base: [55, 120, 38], stripe: [38, 90, 25] },
    cactus_top: { base: [70, 138, 50] },
    clay: { base: [158, 164, 176], variants: [[148, 154, 166], [168, 174, 186]] },
    glass: { base: [200, 220, 255], opacity: 0.3, border: [180, 200, 240] },
    brick: { base: [150, 74, 54], mortar: [180, 175, 165] },
    bookshelf: { base: [194, 157, 98], books: [[139, 58, 58], [58, 58, 139], [58, 100, 58]] },
    crafting_top: { base: [194, 157, 98], grid: [150, 113, 60] },
    crafting_side: { base: [194, 157, 98], tools: true },
    furnace_side: { base: [130, 130, 130] },
    furnace_front: { base: [130, 130, 130], opening: [50, 30, 20] },
    tnt_side: { base: [200, 30, 30], band: [180, 170, 140] },
    tnt_top: { base: [200, 170, 140], fuse: [60, 60, 60] },
};

// Texture face mapping: [top, bottom, front, back, right, left]
// Each face index points to a tile in the atlas
const FACE_TEXTURES = {};

let nextTile = 0;
function allocTile() { return nextTile++; }

// Pre-allocate tile indices for each block face
FACE_TEXTURES[BlockType.GRASS] = {
    top: allocTile(), bottom: allocTile(), side: allocTile()
};
FACE_TEXTURES[BlockType.DIRT] = { all: allocTile() };
FACE_TEXTURES[BlockType.STONE] = { all: allocTile() };
FACE_TEXTURES[BlockType.SAND] = { all: allocTile() };
FACE_TEXTURES[BlockType.WATER] = { all: allocTile() };
FACE_TEXTURES[BlockType.WOOD] = { top: allocTile(), side: allocTile() };
FACE_TEXTURES[BlockType.LEAVES] = { all: allocTile() };
FACE_TEXTURES[BlockType.PLANKS] = { all: allocTile() };
FACE_TEXTURES[BlockType.COBBLESTONE] = { all: allocTile() };
FACE_TEXTURES[BlockType.BEDROCK] = { all: allocTile() };
FACE_TEXTURES[BlockType.COAL_ORE] = { all: allocTile() };
FACE_TEXTURES[BlockType.IRON_ORE] = { all: allocTile() };
FACE_TEXTURES[BlockType.GOLD_ORE] = { all: allocTile() };
FACE_TEXTURES[BlockType.DIAMOND_ORE] = { all: allocTile() };
FACE_TEXTURES[BlockType.GRAVEL] = { all: allocTile() };
FACE_TEXTURES[BlockType.SNOW] = { all: allocTile() };
FACE_TEXTURES[BlockType.ICE] = { all: allocTile() };
FACE_TEXTURES[BlockType.CACTUS] = { top: allocTile(), side: allocTile() };
FACE_TEXTURES[BlockType.CLAY] = { all: allocTile() };
FACE_TEXTURES[BlockType.GLASS] = { all: allocTile() };
FACE_TEXTURES[BlockType.BRICK] = { all: allocTile() };
FACE_TEXTURES[BlockType.BOOKSHELF] = { top: allocTile(), side: allocTile() };
FACE_TEXTURES[BlockType.CRAFTING_TABLE] = { top: allocTile(), side: allocTile() };
FACE_TEXTURES[BlockType.FURNACE] = { top: allocTile(), front: allocTile(), side: allocTile() };
FACE_TEXTURES[BlockType.TNT] = { top: allocTile(), side: allocTile() };
FACE_TEXTURES[BlockType.TORCH] = { all: allocTile() };
FACE_TEXTURES[BlockType.FLOWER_RED] = { all: allocTile() };
FACE_TEXTURES[BlockType.FLOWER_YELLOW] = { all: allocTile() };
FACE_TEXTURES[BlockType.TALL_GRASS] = { all: allocTile() };
FACE_TEXTURES[BlockType.MUSHROOM_RED] = { all: allocTile() };
FACE_TEXTURES[BlockType.MUSHROOM_BROWN] = { all: allocTile() };

// Items — reuse torch-like tile or unique
FACE_TEXTURES[BlockType.STICK] = { all: allocTile() };
FACE_TEXTURES[BlockType.RAW_PORK] = { all: allocTile() };
FACE_TEXTURES[BlockType.COOKED_PORK] = { all: allocTile() };
FACE_TEXTURES[BlockType.WOODEN_PICKAXE] = { all: allocTile() };
FACE_TEXTURES[BlockType.STONE_PICKAXE] = { all: allocTile() };
FACE_TEXTURES[BlockType.WOODEN_SWORD] = { all: allocTile() };
FACE_TEXTURES[BlockType.STONE_SWORD] = { all: allocTile() };
FACE_TEXTURES[BlockType.WOODEN_AXE] = { all: allocTile() };

export { ATLAS_TILES };

// Get tile index for a given block face
// face: 0=top, 1=bottom, 2=front, 3=back, 4=right, 5=left
export function getTileForFace(blockType, face) {
    const ft = FACE_TEXTURES[blockType];
    if (!ft) return 0; // Default to first tile (dirt-like)

    if (ft.all !== undefined) return ft.all;

    switch (face) {
        case 0: return ft.top !== undefined ? ft.top : (ft.all || 0);
        case 1: return ft.bottom !== undefined ? ft.bottom : (ft.top || ft.all || 0);
        case 2: return ft.front !== undefined ? ft.front : (ft.side || ft.all || 0);
        case 3: return ft.side || ft.all || 0;
        case 4: return ft.side || ft.all || 0;
        case 5: return ft.side || ft.all || 0;
        default: return ft.all || ft.side || 0;
    }
}

// Get UV coordinates for a face
export function getUVsForFace(blockType, face) {
    const tile = getTileForFace(blockType, face);
    const tx = (tile % ATLAS_TILES) / ATLAS_TILES;
    const ty = 1 - Math.floor(tile / ATLAS_TILES) / ATLAS_TILES - 1 / ATLAS_TILES;
    const s = 1 / ATLAS_TILES;
    // Slight inset to prevent texture bleeding
    const p = 0.001;
    return [
        tx + p, ty + p,
        tx + s - p, ty + p,
        tx + s - p, ty + s - p,
        tx + p, ty + s - p
    ];
}

// Fill a tile on the canvas
function fillTile(ctx, tileIndex, fillFn) {
    const tx = (tileIndex % ATLAS_TILES) * TILE_SIZE;
    const ty = Math.floor(tileIndex / ATLAS_TILES) * TILE_SIZE;

    // Create a temp canvas for drawing
    const imageData = ctx.createImageData(TILE_SIZE, TILE_SIZE);
    const data = imageData.data;

    for (let py = 0; py < TILE_SIZE; py++) {
        for (let px = 0; px < TILE_SIZE; px++) {
            const [r, g, b, a] = fillFn(px, py);
            const i = (py * TILE_SIZE + px) * 4;
            data[i] = r;
            data[i + 1] = g;
            data[i + 2] = b;
            data[i + 3] = a !== undefined ? a : 255;
        }
    }

    ctx.putImageData(imageData, tx, ty);
}

// Noise helper for textures
function txNoise(x, y, seed) {
    const n = Math.sin(x * 127.1 + y * 311.7 + seed * 43758.5453) * 43758.5453;
    return n - Math.floor(n);
}

function variantColor(base, variants, x, y, seed = 0) {
    const n = txNoise(x, y, seed);
    if (n < 0.15 && variants.length > 0) return variants[0];
    if (n < 0.3 && variants.length > 1) return variants[1];
    if (n < 0.45 && variants.length > 2) return variants[2];
    return base;
}

function jitter(c, amt = 8, x = 0, y = 0) {
    const n = txNoise(x + 100, y + 200, 42);
    const j = Math.floor((n - 0.5) * amt * 2);
    return [
        Math.max(0, Math.min(255, c[0] + j)),
        Math.max(0, Math.min(255, c[1] + j)),
        Math.max(0, Math.min(255, c[2] + j))
    ];
}

// ===== CREATE TEXTURE ATLAS =====
export function createTextureAtlas() {
    const canvas = document.createElement('canvas');
    canvas.width = ATLAS_SIZE;
    canvas.height = ATLAS_SIZE;
    const ctx = canvas.getContext('2d');

    // CRITICAL FIX: Fill entire atlas with magenta so any unmapped tile is obviously wrong
    // This prevents "black blocks" from uninitialized tiles
    ctx.fillStyle = '#FF00FF';
    ctx.fillRect(0, 0, ATLAS_SIZE, ATLAS_SIZE);

    // Actually, fill with a neutral dirt color instead (less jarring)
    ctx.fillStyle = '#866049';
    ctx.fillRect(0, 0, ATLAS_SIZE, ATLAS_SIZE);

    // ---- HELPER: hash-based per-pixel color picker from a palette ----
    function pickColor(palette, x, y, seed) {
        const h = Math.abs(Math.sin(x * 127.1 + y * 311.7 + seed * 43758.5453) * 43758.5453);
        const idx = Math.floor((h - Math.floor(h)) * palette.length);
        return palette[Math.min(idx, palette.length - 1)].slice();
    }

    // ===== GRASS BLOCK with user's exact colors =====
    const gt = FACE_TEXTURES[BlockType.GRASS];
    // 5 grass greens — darker, more saturated
    const grassPalette = [
        [64, 89, 38], [48, 68, 28], [58, 78, 33], [55, 76, 32], [72, 100, 42],
    ];
    // 4 dirt browns: darkest→lightest (all lightened)
    const dirtDarkest = [86, 65, 47];   // darkest — only under grass
    const dirtBrowns = [
        [115, 88, 65], [140, 108, 80], [165, 128, 96],  // medium, mid-light, light
    ];
    // Stone specks: #505050, #656565 — exactly 6 per side
    const specks = [[80, 80, 80], [101, 101, 101]];

    // ----- GRASS TOP -----
    fillTile(ctx, gt.top, (x, y) => pickColor(grassPalette, x, y, 10));

    // ----- DIRT BOTTOM (no specks on bottom) -----
    fillTile(ctx, gt.bottom, (x, y) => {
        const h = Math.abs(Math.sin(x * 127.1 + y * 311.7 + 20 * 43758.5453) * 43758.5453);
        const r = h - Math.floor(h);
        // Darkest brown very rare on bottom (~5%)
        if (r < 0.05) return dirtDarkest.slice();
        // 3 browns equally ~31.6% each
        const bi = Math.floor((r - 0.05) / 0.3166) % 3;
        return dirtBrowns[Math.min(bi, 2)].slice();
    });

    // ----- GRASS SIDE (grass overhang + dirt + 6 specks) -----
    // Pre-pick 6 speck positions deterministically
    const speckPositions = [];
    for (let i = 0; i < 6; i++) {
        const sh = Math.abs(Math.sin((i + 1) * 7919.0) * 43758.5453);
        const sx = Math.floor((sh - Math.floor(sh)) * 16);
        const sh2 = Math.abs(Math.sin((i + 1) * 1301.0) * 43758.5453);
        const sy = 4 + Math.floor((sh2 - Math.floor(sh2)) * 12); // rows 4-15 only
        speckPositions.push([sx, sy]);
    }
    fillTile(ctx, gt.side, (x, y) => {
        // Row 0: always grass
        if (y === 0) return pickColor(grassPalette, x, y, 30);
        // Rows 1-3: ragged grass overhang
        if (y <= 3) {
            const n = txNoise(x, y, 31);
            const threshold = y === 1 ? 0.25 : y === 2 ? 0.55 : 0.78;
            if (n > threshold) return pickColor(grassPalette, x, y, 30);
        }
        // Check if this pixel is a speck
        for (let i = 0; i < 6; i++) {
            if (speckPositions[i][0] === x && speckPositions[i][1] === y) {
                return specks[i % 2].slice();
            }
        }
        // Dirt: darkest in rows right after grass (1-4), barely below
        const h = Math.abs(Math.sin(x * 127.1 + y * 311.7 + 32 * 43758.5453) * 43758.5453);
        const r = h - Math.floor(h);
        const darkChance = (y >= 1 && y <= 4) ? 0.65 : 0.03;
        if (r < darkChance) return dirtDarkest.slice();
        const bi = Math.floor((r - darkChance) / ((1 - darkChance) / 3)) % 3;
        return dirtBrowns[Math.min(bi, 2)].slice();
    });

    // ----- DIRT (no specks, just browns) -----
    fillTile(ctx, FACE_TEXTURES[BlockType.DIRT].all, (x, y) => {
        const h = Math.abs(Math.sin(x * 127.1 + y * 311.7 + 40 * 43758.5453) * 43758.5453);
        const r = h - Math.floor(h);
        if (r < 0.05) return dirtDarkest.slice();
        const bi = Math.floor((r - 0.05) / 0.3166) % 3;
        return dirtBrowns[Math.min(bi, 2)].slice();
    });

    // ----- STONE ----- (varied grays with dramatic darker patches)
    const stonePalette = [
        [128, 128, 128], [118, 118, 118], [135, 135, 135], [100, 100, 100],
        [142, 142, 142], [108, 108, 108], [125, 125, 125], [92, 92, 92],
        [138, 138, 138], [112, 112, 112], [120, 120, 120], [85, 85, 85],
        [132, 132, 132], [145, 145, 145], [105, 105, 105], [115, 115, 115],
    ];
    fillTile(ctx, FACE_TEXTURES[BlockType.STONE].all, (x, y) => {
        const c = pickColor(stonePalette, x, y, 50);
        // Darker crevice patches
        const patch = txNoise(x * 0.5, y * 0.5, 51);
        if (patch < 0.15) { c[0] -= 25; c[1] -= 25; c[2] -= 25; }
        // Light highlight patches
        if (patch > 0.85) { c[0] += 10; c[1] += 10; c[2] += 10; }
        return c;
    });

    // ----- SAND ----- (warm golden with natural variation)
    const sandPalette = [
        [228, 198, 135], [220, 188, 125], [236, 208, 148], [212, 180, 118],
        [232, 202, 140], [216, 184, 120], [240, 212, 152], [224, 194, 130],
        [230, 200, 138], [218, 186, 122], [234, 206, 145], [208, 176, 115],
        [226, 196, 132], [222, 190, 128], [238, 210, 150], [214, 182, 120],
    ];
    fillTile(ctx, FACE_TEXTURES[BlockType.SAND].all, (x, y) => pickColor(sandPalette, x, y, 60));

    // ----- WATER ----- (cleaner blue with visible waves)
    fillTile(ctx, FACE_TEXTURES[BlockType.WATER].all, (x, y) => {
        const wave1 = Math.sin(x * 0.9 + y * 0.6) * 12;
        const wave2 = Math.sin(x * 0.4 - y * 0.8) * 8;
        return [28 + wave1, 90 + wave1 + wave2, 180 + wave2, 160];
    });

    // ----- WOOD TOP ----- (concentric ring pattern like real Minecraft)
    const woodTopLight = [190, 162, 102];
    const woodTopDark = [160, 130, 78];
    const woodTopRing = [130, 100, 60];
    fillTile(ctx, FACE_TEXTURES[BlockType.WOOD].top, (x, y) => {
        const cx = 7.5, cy = 7.5;
        const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
        const ringVal = Math.sin(dist * 2.2);
        const n = txNoise(x, y, 70);
        if (ringVal > 0.5) return jitter(woodTopRing, 6, x, y);
        if (ringVal > 0.0) return jitter(woodTopDark, 5, x, y);
        return jitter(woodTopLight, 4, x, y);
    });

    // ----- WOOD SIDE ----- (vertical bark with subtle variation)
    const woodBarkPalette = [
        [104, 83, 50], [98, 78, 46], [110, 88, 54], [92, 73, 42],
        [116, 93, 58], [88, 70, 40], [106, 85, 52], [100, 80, 48],
        [112, 90, 56], [95, 75, 44], [108, 86, 53], [90, 72, 41],
        [114, 91, 57], [102, 82, 49], [96, 76, 45], [118, 94, 59],
    ];
    fillTile(ctx, FACE_TEXTURES[BlockType.WOOD].side, (x, y) => {
        const c = pickColor(woodBarkPalette, x, y, 75);
        // Vertical stripe pattern
        const stripe = (x + Math.floor(txNoise(x, y, 76) * 2)) % 3 === 0;
        if (stripe) { c[0] -= 12; c[1] -= 10; c[2] -= 8; }
        return c;
    });

    // ----- LEAVES ----- (varied leaf greens with holes)
    const leavesPalette = [
        [56, 118, 29], [48, 108, 24], [62, 125, 33], [42, 100, 20],
        [68, 132, 38], [38, 95, 18], [54, 115, 27], [60, 122, 31],
        [50, 110, 25], [65, 128, 35], [44, 102, 21], [58, 120, 30],
        [40, 98, 19], [66, 130, 37], [52, 112, 26], [46, 105, 22],
    ];
    fillTile(ctx, FACE_TEXTURES[BlockType.LEAVES].all, (x, y) => {
        const n = txNoise(x, y, 77);
        if (n > 0.82) return [0, 0, 0, 0]; // holes in leaves
        const c = pickColor(leavesPalette, x, y, 80);
        return [...c, 255];
    });

    // ----- PLANKS ----- (horizontal plank lines with wood grain)
    const plankPalette = [
        [188, 152, 98], [180, 144, 90], [195, 158, 104], [174, 138, 84],
        [192, 155, 101], [170, 134, 80], [186, 150, 96], [182, 146, 92],
        [196, 160, 106], [176, 140, 86], [190, 153, 99], [178, 142, 88],
    ];
    fillTile(ctx, FACE_TEXTURES[BlockType.PLANKS].all, (x, y) => {
        const plank = Math.floor(y / 4);
        const line = y % 4 === 0;
        if (line) return [155, 118, 65]; // dark seam line
        const c = pickColor(plankPalette, x + plank * 5, y, 85);
        return c;
    });

    // ----- COBBLESTONE ----- (irregular gray stone patches)
    const cobblePalette = [
        [128, 128, 128], [115, 115, 115], [140, 140, 140], [100, 100, 100],
        [145, 145, 145], [108, 108, 108], [135, 135, 135], [95, 95, 95],
        [122, 122, 122], [150, 150, 150], [105, 105, 105], [130, 130, 130],
    ];
    fillTile(ctx, FACE_TEXTURES[BlockType.COBBLESTONE].all, (x, y) => {
        const c = pickColor(cobblePalette, x, y, 90);
        // Add mortar lines between stones
        const gx = x % 4, gy = y % 4;
        const offset = Math.floor(y / 4) % 2 === 0 ? 0 : 2;
        const mx = (x + offset) % 4;
        if (gx === 0 || gy === 0 || mx === 0) {
            const n = txNoise(x, y, 91);
            if (n < 0.4) {
                c[0] -= 20; c[1] -= 20; c[2] -= 20;
            }
        }
        return c;
    });

    // ----- BEDROCK -----
    fillTile(ctx, FACE_TEXTURES[BlockType.BEDROCK].all, (x, y) => {
        const c = variantColor(COLORS.bedrock.base, COLORS.bedrock.variants, x, y, 10);
        return jitter(c, 15, x, y);
    });

    // ----- ORE TEXTURES -----
    function drawOre(tileIdx, oreColor, seed) {
        fillTile(ctx, tileIdx, (x, y) => {
            const c = variantColor(COLORS.stone.base, COLORS.stone.variants, x, y, seed);
            const n = txNoise(x * 1.3, y * 1.3, seed + 100);
            if (n > 0.6 && n < 0.85) {
                return jitter(oreColor, 10, x, y);
            }
            return jitter(c, 8, x, y);
        });
    }

    drawOre(FACE_TEXTURES[BlockType.COAL_ORE].all, COLORS.coal_ore.ore, 11);
    drawOre(FACE_TEXTURES[BlockType.IRON_ORE].all, COLORS.iron_ore.ore, 12);
    drawOre(FACE_TEXTURES[BlockType.GOLD_ORE].all, COLORS.gold_ore.ore, 13);
    drawOre(FACE_TEXTURES[BlockType.DIAMOND_ORE].all, COLORS.diamond_ore.ore, 14);

    // ----- GRAVEL -----
    fillTile(ctx, FACE_TEXTURES[BlockType.GRAVEL].all, (x, y) => {
        const c = variantColor(COLORS.gravel.base, COLORS.gravel.variants, x, y, 15);
        return jitter(c, 12, x, y);
    });

    // ----- SNOW -----
    fillTile(ctx, FACE_TEXTURES[BlockType.SNOW].all, (x, y) => {
        const c = variantColor(COLORS.snow.base, COLORS.snow.variants, x, y, 16);
        return jitter(c, 3, x, y);
    });

    // ----- ICE -----
    fillTile(ctx, FACE_TEXTURES[BlockType.ICE].all, (x, y) => {
        const b = COLORS.ice.base;
        const crack = Math.abs(Math.sin(x * 1.2 + y * 0.7)) < 0.05;
        const c = crack ? [200, 220, 255] : b;
        return [...jitter(c, 5, x, y), 220];
    });

    // ----- CACTUS -----
    fillTile(ctx, FACE_TEXTURES[BlockType.CACTUS].top, (x, y) => {
        const c = COLORS.cactus_top.base;
        return jitter(c, 6, x, y);
    });
    fillTile(ctx, FACE_TEXTURES[BlockType.CACTUS].side, (x, y) => {
        const stripe = x % 4 === 0;
        const c = stripe ? COLORS.cactus_side.stripe : COLORS.cactus_side.base;
        // Add spine dots
        const spine = (x % 4 === 2 && y % 4 === 2);
        if (spine) return [30, 70, 20];
        return jitter(c, 5, x, y);
    });

    // ----- CLAY -----
    fillTile(ctx, FACE_TEXTURES[BlockType.CLAY].all, (x, y) => {
        const c = variantColor(COLORS.clay.base, COLORS.clay.variants, x, y, 19);
        return jitter(c, 5, x, y);
    });

    // ----- GLASS -----
    fillTile(ctx, FACE_TEXTURES[BlockType.GLASS].all, (x, y) => {
        const border = x === 0 || x === 15 || y === 0 || y === 15;
        if (border) return [...COLORS.glass.border, 200];
        return [...COLORS.glass.base, 40];
    });

    // ----- BRICK -----
    fillTile(ctx, FACE_TEXTURES[BlockType.BRICK].all, (x, y) => {
        const row = Math.floor(y / 4);
        const isMortarH = y % 4 === 0;
        const offset = row % 2 === 0 ? 0 : 8;
        const isMortarV = (x + offset) % 8 === 0;
        if (isMortarH || isMortarV) return jitter(COLORS.brick.mortar, 4, x, y);
        return jitter(COLORS.brick.base, 6, x, y);
    });

    // ----- BOOKSHELF -----
    fillTile(ctx, FACE_TEXTURES[BlockType.BOOKSHELF].top, (x, y) => {
        return jitter(COLORS.planks.base, 4, x, y);
    });
    fillTile(ctx, FACE_TEXTURES[BlockType.BOOKSHELF].side, (x, y) => {
        if (y < 2 || y > 13) return jitter(COLORS.planks.base, 4, x, y);
        const bookIdx = Math.floor(x / 3) % 3;
        const bookColor = COLORS.bookshelf.books[bookIdx];
        return jitter(bookColor, 8, x, y);
    });

    // ----- CRAFTING TABLE -----
    fillTile(ctx, FACE_TEXTURES[BlockType.CRAFTING_TABLE].top, (x, y) => {
        // Grid pattern
        const gridLine = x === 5 || x === 10 || y === 5 || y === 10;
        if (gridLine) return jitter(COLORS.crafting_top.grid, 3, x, y);
        return jitter(COLORS.crafting_top.base, 4, x, y);
    });
    fillTile(ctx, FACE_TEXTURES[BlockType.CRAFTING_TABLE].side, (x, y) => {
        if (y < 2) return jitter([180, 143, 84], 3, x, y);
        return jitter(COLORS.crafting_side.base, 5, x, y);
    });

    // ----- FURNACE -----
    fillTile(ctx, FACE_TEXTURES[BlockType.FURNACE].top, (x, y) => {
        return jitter(COLORS.furnace_side.base, 8, x, y);
    });
    fillTile(ctx, FACE_TEXTURES[BlockType.FURNACE].front, (x, y) => {
        // Opening in center
        if (x >= 4 && x <= 11 && y >= 5 && y <= 12) {
            if (x >= 5 && x <= 10 && y >= 6 && y <= 11) {
                return jitter(COLORS.furnace_front.opening, 5, x, y);
            }
        }
        return jitter(COLORS.furnace_side.base, 8, x, y);
    });
    fillTile(ctx, FACE_TEXTURES[BlockType.FURNACE].side, (x, y) => {
        return jitter(COLORS.furnace_side.base, 8, x, y);
    });

    // ----- TNT -----
    fillTile(ctx, FACE_TEXTURES[BlockType.TNT].top, (x, y) => {
        const cx = 7.5, cy = 7.5;
        const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
        if (dist < 3) return jitter(COLORS.tnt_top.fuse, 3, x, y);
        return jitter(COLORS.tnt_top.base, 5, x, y);
    });
    fillTile(ctx, FACE_TEXTURES[BlockType.TNT].side, (x, y) => {
        const band = (y >= 4 && y <= 11);
        if (band) return jitter(COLORS.tnt_side.base, 5, x, y);
        return jitter(COLORS.tnt_side.band, 5, x, y);
    });

    // ----- TORCH -----
    fillTile(ctx, FACE_TEXTURES[BlockType.TORCH].all, (x, y) => {
        // Stick in center
        if (x >= 6 && x <= 9 && y >= 2 && y <= 14) {
            if (y <= 4) return [255, 200, 50, 255]; // Flame
            return [140, 100, 45, 255]; // Wood
        }
        return [0, 0, 0, 0]; // Transparent
    });

    // ----- ITEM TEXTURES -----
    // Stick
    fillTile(ctx, FACE_TEXTURES[BlockType.STICK].all, (x, y) => {
        if (x >= 6 && x <= 9 && y >= 1 && y <= 14) {
            return [140, 100, 45, 255];
        }
        return [0, 0, 0, 0];
    });

    // Raw Pork
    fillTile(ctx, FACE_TEXTURES[BlockType.RAW_PORK].all, (x, y) => {
        if (x >= 2 && x <= 13 && y >= 4 && y <= 11) {
            const fat = y < 6;
            return fat ? [240, 220, 200, 255] : [200, 100, 100, 255];
        }
        return [0, 0, 0, 0];
    });

    // Cooked Pork
    fillTile(ctx, FACE_TEXTURES[BlockType.COOKED_PORK].all, (x, y) => {
        if (x >= 2 && x <= 13 && y >= 4 && y <= 11) {
            const fat = y < 6;
            return fat ? [220, 200, 160, 255] : [160, 80, 50, 255];
        }
        return [0, 0, 0, 0];
    });

    // Wooden Pickaxe
    fillTile(ctx, FACE_TEXTURES[BlockType.WOODEN_PICKAXE].all, (x, y) => {
        // Handle
        if (x >= 7 && x <= 8 && y >= 6 && y <= 14) return [140, 100, 45, 255];
        // Head
        if (y >= 2 && y <= 5 && x >= 3 && x <= 12) return [194, 157, 98, 255];
        return [0, 0, 0, 0];
    });

    // Stone Pickaxe
    fillTile(ctx, FACE_TEXTURES[BlockType.STONE_PICKAXE].all, (x, y) => {
        if (x >= 7 && x <= 8 && y >= 6 && y <= 14) return [140, 100, 45, 255];
        if (y >= 2 && y <= 5 && x >= 3 && x <= 12) return [130, 130, 130, 255];
        return [0, 0, 0, 0];
    });

    // Wooden Sword
    fillTile(ctx, FACE_TEXTURES[BlockType.WOODEN_SWORD].all, (x, y) => {
        if (x >= 7 && x <= 8 && y >= 10 && y <= 14) return [100, 70, 30, 255]; // Handle
        if (x >= 6 && x <= 9 && y >= 9 && y <= 10) return [200, 180, 100, 255]; // Guard
        if (x >= 7 && x <= 8 && y >= 1 && y <= 9) return [194, 157, 98, 255]; // Blade
        return [0, 0, 0, 0];
    });

    // Stone Sword
    fillTile(ctx, FACE_TEXTURES[BlockType.STONE_SWORD].all, (x, y) => {
        if (x >= 7 && x <= 8 && y >= 10 && y <= 14) return [100, 70, 30, 255];
        if (x >= 6 && x <= 9 && y >= 9 && y <= 10) return [200, 180, 100, 255];
        if (x >= 7 && x <= 8 && y >= 1 && y <= 9) return [130, 130, 130, 255];
        return [0, 0, 0, 0];
    });

    // Wooden Axe
    fillTile(ctx, FACE_TEXTURES[BlockType.WOODEN_AXE].all, (x, y) => {
        if (x >= 7 && x <= 8 && y >= 6 && y <= 14) return [140, 100, 45, 255];
        if (x >= 3 && x <= 8 && y >= 2 && y <= 5) return [194, 157, 98, 255];
        return [0, 0, 0, 0];
    });

    // ----- PLANT TEXTURES (transparent cross-shaped) -----
    // Poppy (red flower)
    fillTile(ctx, FACE_TEXTURES[BlockType.FLOWER_RED].all, (x, y) => {
        // Stem
        if (x >= 7 && x <= 8 && y >= 8 && y <= 15) return [50, 120, 30, 255];
        // Flower head
        const cx2 = 7.5, cy2 = 5;
        const d = Math.sqrt((x - cx2) * (x - cx2) + (y - cy2) * (y - cy2));
        if (d < 3.5) return [200, 30, 30, 255];
        if (d < 4.5 && y < 7) return [180, 20, 20, 255];
        // Leaves
        if (x >= 5 && x <= 6 && y >= 10 && y <= 11) return [50, 130, 30, 255];
        if (x >= 9 && x <= 10 && y >= 9 && y <= 10) return [50, 130, 30, 255];
        return [0, 0, 0, 0];
    });

    // Dandelion (yellow flower)
    fillTile(ctx, FACE_TEXTURES[BlockType.FLOWER_YELLOW].all, (x, y) => {
        if (x >= 7 && x <= 8 && y >= 8 && y <= 15) return [50, 120, 30, 255];
        const cx2 = 7.5, cy2 = 5;
        const d = Math.sqrt((x - cx2) * (x - cx2) + (y - cy2) * (y - cy2));
        if (d < 3) return [255, 220, 50, 255];
        if (d < 4 && y < 7) return [230, 200, 40, 255];
        if (x >= 5 && x <= 6 && y >= 10 && y <= 11) return [50, 130, 30, 255];
        return [0, 0, 0, 0];
    });

    // Tall Grass — thin wispy blades, mostly transparent
    fillTile(ctx, FACE_TEXTURES[BlockType.TALL_GRASS].all, (x, y) => {
        // Thin grass blades (1px wide each), mostly air
        const blades = [[3, 6], [5, 4], [7, 3], [9, 5], [11, 6], [6, 7], [10, 4], [8, 5], [4, 8]];
        for (const [bx, minY] of blades) {
            if (x === bx && y >= minY && y <= 15) {
                const shade = 60 + Math.floor(txNoise(x, y, 77) * 50);
                return [shade - 20, shade + 60, shade - 30, 160];
            }
        }
        return [0, 0, 0, 0];
    });

    // Red Mushroom
    fillTile(ctx, FACE_TEXTURES[BlockType.MUSHROOM_RED].all, (x, y) => {
        if (x >= 7 && x <= 8 && y >= 9 && y <= 15) return [200, 190, 170, 255];
        if (y >= 5 && y <= 9 && x >= 4 && x <= 11) {
            const dx2 = Math.abs(x - 7.5);
            if (dx2 < 4 - (y - 5) * 0.5) {
                if (txNoise(x, y, 33) > 0.6) return [255, 255, 255, 255];
                return [200, 30, 30, 255];
            }
        }
        return [0, 0, 0, 0];
    });

    // Brown Mushroom
    fillTile(ctx, FACE_TEXTURES[BlockType.MUSHROOM_BROWN].all, (x, y) => {
        if (x >= 7 && x <= 8 && y >= 9 && y <= 15) return [190, 180, 160, 255];
        if (y >= 6 && y <= 9 && x >= 5 && x <= 10) {
            const dx2 = Math.abs(x - 7.5);
            if (dx2 < 3 - (y - 6) * 0.3) return [140, 100, 60, 255];
        }
        return [0, 0, 0, 0];
    });
    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = false;

    return texture;
}

// Get a small canvas icon for inventory UI — isometric 3D block style
export function getBlockIconCanvas(blockType, size = 32) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const ft = FACE_TEXTURES[blockType];
    if (!ft) {
        ctx.fillStyle = '#888';
        ctx.fillRect(0, 0, size, size);
        return canvas;
    }

    const atlasCanvas = document.querySelector('canvas[data-atlas]') || _atlasCanvas;
    if (!atlasCanvas) {
        ctx.fillStyle = '#888';
        ctx.fillRect(0, 0, size, size);
        return canvas;
    }

    ctx.imageSmoothingEnabled = false;

    // For items and plants, draw flat sprite
    const isPlantOrItem = blockType === BlockType.FLOWER_RED || blockType === BlockType.FLOWER_YELLOW ||
        blockType === BlockType.TALL_GRASS || blockType === BlockType.MUSHROOM_RED ||
        blockType === BlockType.MUSHROOM_BROWN || blockType === BlockType.TORCH ||
        blockType === BlockType.STICK || blockType === BlockType.RAW_PORK ||
        blockType === BlockType.COOKED_PORK || blockType === BlockType.WOODEN_PICKAXE ||
        blockType === BlockType.STONE_PICKAXE || blockType === BlockType.WOODEN_SWORD ||
        blockType === BlockType.STONE_SWORD || blockType === BlockType.WOODEN_AXE;

    if (isPlantOrItem) {
        const tile = ft.all !== undefined ? ft.all : 0;
        const tx = (tile % ATLAS_TILES) * TILE_SIZE;
        const ty = Math.floor(tile / ATLAS_TILES) * TILE_SIZE;
        ctx.drawImage(atlasCanvas, tx, ty, TILE_SIZE, TILE_SIZE, 2, 2, size - 4, size - 4);
        return canvas;
    }

    // === Isometric 3D block rendering ===
    // Get tile indices for top, right-side, and left-side faces
    const topTile = ft.top !== undefined ? ft.top : (ft.all !== undefined ? ft.all : 0);
    const sideTile = ft.side !== undefined ? ft.side : (ft.front !== undefined ? ft.front : (ft.all !== undefined ? ft.all : 0));

    // Extract tile pixel data
    function getTileData(tile) {
        const tx = (tile % ATLAS_TILES) * TILE_SIZE;
        const ty = Math.floor(tile / ATLAS_TILES) * TILE_SIZE;
        const atlasCtx = atlasCanvas.getContext('2d');
        return atlasCtx.getImageData(tx, ty, TILE_SIZE, TILE_SIZE);
    }

    const topData = getTileData(topTile);
    const sideData = getTileData(sideTile);

    // Draw isometric cube manually
    const s = size;
    const half = s / 2;
    const qh = s / 4; // quarter height for isometric projection

    // Top face — parallelogram at top
    for (let px = 0; px < TILE_SIZE; px++) {
        for (let py = 0; py < TILE_SIZE; py++) {
            const i = (py * TILE_SIZE + px) * 4;
            const r = topData.data[i], g = topData.data[i + 1], b = topData.data[i + 2], a = topData.data[i + 3];
            if (a < 10) continue;
            // Map to isometric top face position
            const fx = px / TILE_SIZE;
            const fy = py / TILE_SIZE;
            const screenX = half + (fx - fy) * half * 0.9;
            const screenY = (fx + fy) * qh * 0.9;
            ctx.fillStyle = `rgba(${r},${g},${b},${a / 255})`;
            ctx.fillRect(Math.floor(screenX), Math.floor(screenY), 2, 2);
        }
    }

    // Left face — parallelogram on bottom-left (darker)
    for (let px = 0; px < TILE_SIZE; px++) {
        for (let py = 0; py < TILE_SIZE; py++) {
            const i = (py * TILE_SIZE + px) * 4;
            const r = Math.floor(sideData.data[i] * 0.6);
            const g = Math.floor(sideData.data[i + 1] * 0.6);
            const b = Math.floor(sideData.data[i + 2] * 0.6);
            const a = sideData.data[i + 3];
            if (a < 10) continue;
            const fx = px / TILE_SIZE;
            const fy = py / TILE_SIZE;
            const screenX = (1 - fx) * half * 0.9;
            const screenY = qh * 1.8 + fx * qh * 0.9 + fy * half * 0.55;
            ctx.fillStyle = `rgba(${r},${g},${b},${a / 255})`;
            ctx.fillRect(Math.floor(screenX), Math.floor(screenY), 2, 2);
        }
    }

    // Right face — parallelogram on bottom-right (medium shade)
    for (let px = 0; px < TILE_SIZE; px++) {
        for (let py = 0; py < TILE_SIZE; py++) {
            const i = (py * TILE_SIZE + px) * 4;
            const r = Math.floor(sideData.data[i] * 0.8);
            const g = Math.floor(sideData.data[i + 1] * 0.8);
            const b = Math.floor(sideData.data[i + 2] * 0.8);
            const a = sideData.data[i + 3];
            if (a < 10) continue;
            const fx = px / TILE_SIZE;
            const fy = py / TILE_SIZE;
            const screenX = half * 0.9 + fx * half * 0.9;
            const screenY = qh * 0.9 + (1 - fx) * qh * 0.9 + fy * half * 0.55;
            ctx.fillStyle = `rgba(${r},${g},${b},${a / 255})`;
            ctx.fillRect(Math.floor(screenX), Math.floor(screenY), 2, 2);
        }
    }

    return canvas;
}

// Store atlas canvas globally for icon rendering
let _atlasCanvas = null;
const _originalCreate = createTextureAtlas;

// Wrap to cache the canvas
export function createTextureAtlasAndCache() {
    const canvas = document.createElement('canvas');
    canvas.width = ATLAS_SIZE;
    canvas.height = ATLAS_SIZE;
    const ctx = canvas.getContext('2d');

    // Just call createTextureAtlas and capture the canvas
    const texture = createTextureAtlas();
    _atlasCanvas = texture.image;
    return texture;
}

// Allow getting atlas canvas
export function getAtlasCanvas() {
    return _atlasCanvas;
}

export function setAtlasCanvas(c) {
    _atlasCanvas = c;
}
