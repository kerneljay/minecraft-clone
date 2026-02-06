// Canvas-generated Minecraft-style texture atlas
// Each texture is 16x16 pixels, arranged in an atlas

import * as THREE from 'three';
import { BlockType } from './blocks.js';

const TILE_SIZE = 16;
const ATLAS_TILES = 16; // 16x16 grid
const ATLAS_SIZE = TILE_SIZE * ATLAS_TILES;

// Color palettes for each block
const COLORS = {
    grass_top: { base: [95, 159, 53], variants: [[87, 147, 45], [102, 168, 58], [80, 140, 40]] },
    grass_side: { base: [134, 96, 67], top: [95, 159, 53] },
    dirt: { base: [134, 96, 67], variants: [[121, 85, 58], [139, 101, 72], [128, 90, 62]] },
    stone: { base: [125, 125, 125], variants: [[115, 115, 115], [135, 135, 135], [105, 105, 105], [140, 140, 140]] },
    sand: { base: [219, 211, 160], variants: [[210, 200, 150], [225, 218, 168], [214, 206, 155]] },
    water: { base: [32, 68, 168], variants: [[28, 62, 155], [38, 75, 180]] },
    wood_side: { base: [104, 83, 50], variants: [[96, 75, 42], [112, 90, 56]] },
    wood_top: { base: [152, 122, 72], ring: [104, 83, 50] },
    leaves: { base: [55, 120, 35], variants: [[45, 110, 28], [65, 130, 42], [50, 115, 30]] },
    cobblestone: { base: [122, 122, 122], variants: [[100, 100, 100], [140, 140, 140], [110, 110, 110]] },
    planks: { base: [188, 152, 98], variants: [[175, 140, 88], [198, 162, 108]] },
    bedrock: { base: [85, 85, 85], variants: [[65, 65, 65], [95, 95, 95], [50, 50, 50]] },
    gravel: { base: [136, 126, 122], variants: [[120, 110, 105], [148, 138, 132], [128, 118, 114]] },
    coal_ore: { base: [125, 125, 125], ore: [40, 40, 40] },
    iron_ore: { base: [125, 125, 125], ore: [186, 165, 143] },
    gold_ore: { base: [125, 125, 125], ore: [252, 238, 75] },
    diamond_ore: { base: [125, 125, 125], ore: [93, 236, 240] },
    glass: { base: [200, 220, 240], border: [180, 200, 220] },
    crafting_top: { base: [188, 152, 98], grid: [140, 110, 70] },
    furnace_front: { base: [125, 125, 125], hole: [40, 40, 40] },
    snow: { base: [240, 248, 255], variants: [[235, 243, 250], [245, 250, 255]] },
    ice: { base: [140, 180, 230], variants: [[130, 170, 220], [150, 190, 240]] },
    clay: { base: [158, 164, 176], variants: [[148, 154, 166], [168, 174, 186]] },
    brick: { base: [150, 90, 70], mortar: [185, 175, 165] },
    tnt_side: { base: [220, 40, 30] },
    bookshelf: { base: [188, 152, 98], books: [[120, 30, 30], [30, 55, 120], [50, 120, 50]] },
    obsidian: { base: [15, 10, 24], variants: [[20, 15, 30], [25, 18, 38], [10, 8, 18]] }
};

// Texture UV map: maps block type + face to atlas position [col, row]
// Face order: top, bottom, front, back, left, right (or single for all)
export const TEXTURE_MAP = {};

let nextSlot = 0;
function slot() { const s = nextSlot; nextSlot++; return s; }

// Assign atlas positions
const TEX = {
    grass_top: slot(), // 0
    grass_side: slot(), // 1
    dirt: slot(), // 2
    stone: slot(), // 3
    sand: slot(), // 4
    water: slot(), // 5
    wood_side: slot(), // 6
    wood_top: slot(), // 7
    leaves: slot(), // 8
    cobblestone: slot(), // 9
    planks: slot(), // 10
    bedrock: slot(), // 11
    gravel: slot(), // 12
    coal_ore: slot(), // 13
    iron_ore: slot(), // 14
    gold_ore: slot(), // 15
    diamond_ore: slot(), // 16
    glass: slot(), // 17
    crafting_top: slot(), // 18
    crafting_side: slot(), // 19
    furnace_front: slot(), // 20
    furnace_side: slot(), // 21
    snow: slot(), // 22
    ice: slot(), // 23
    clay: slot(), // 24
    brick: slot(), // 25
    tnt_side: slot(), // 26
    tnt_top: slot(), // 27
    bookshelf: slot(), // 28
    obsidian: slot(), // 29
    grass_bottom: slot(), // 30 (same as dirt)
};

// Face indices: 0=top, 1=bottom, 2=north, 3=south, 4=west, 5=east
TEXTURE_MAP[BlockType.GRASS] = [TEX.grass_top, TEX.dirt, TEX.grass_side, TEX.grass_side, TEX.grass_side, TEX.grass_side];
TEXTURE_MAP[BlockType.DIRT] = [TEX.dirt, TEX.dirt, TEX.dirt, TEX.dirt, TEX.dirt, TEX.dirt];
TEXTURE_MAP[BlockType.STONE] = [TEX.stone, TEX.stone, TEX.stone, TEX.stone, TEX.stone, TEX.stone];
TEXTURE_MAP[BlockType.SAND] = [TEX.sand, TEX.sand, TEX.sand, TEX.sand, TEX.sand, TEX.sand];
TEXTURE_MAP[BlockType.WATER] = [TEX.water, TEX.water, TEX.water, TEX.water, TEX.water, TEX.water];
TEXTURE_MAP[BlockType.WOOD] = [TEX.wood_top, TEX.wood_top, TEX.wood_side, TEX.wood_side, TEX.wood_side, TEX.wood_side];
TEXTURE_MAP[BlockType.LEAVES] = [TEX.leaves, TEX.leaves, TEX.leaves, TEX.leaves, TEX.leaves, TEX.leaves];
TEXTURE_MAP[BlockType.COBBLESTONE] = [TEX.cobblestone, TEX.cobblestone, TEX.cobblestone, TEX.cobblestone, TEX.cobblestone, TEX.cobblestone];
TEXTURE_MAP[BlockType.PLANKS] = [TEX.planks, TEX.planks, TEX.planks, TEX.planks, TEX.planks, TEX.planks];
TEXTURE_MAP[BlockType.BEDROCK] = [TEX.bedrock, TEX.bedrock, TEX.bedrock, TEX.bedrock, TEX.bedrock, TEX.bedrock];
TEXTURE_MAP[BlockType.GRAVEL] = [TEX.gravel, TEX.gravel, TEX.gravel, TEX.gravel, TEX.gravel, TEX.gravel];
TEXTURE_MAP[BlockType.COAL_ORE] = [TEX.coal_ore, TEX.coal_ore, TEX.coal_ore, TEX.coal_ore, TEX.coal_ore, TEX.coal_ore];
TEXTURE_MAP[BlockType.IRON_ORE] = [TEX.iron_ore, TEX.iron_ore, TEX.iron_ore, TEX.iron_ore, TEX.iron_ore, TEX.iron_ore];
TEXTURE_MAP[BlockType.GOLD_ORE] = [TEX.gold_ore, TEX.gold_ore, TEX.gold_ore, TEX.gold_ore, TEX.gold_ore, TEX.gold_ore];
TEXTURE_MAP[BlockType.DIAMOND_ORE] = [TEX.diamond_ore, TEX.diamond_ore, TEX.diamond_ore, TEX.diamond_ore, TEX.diamond_ore, TEX.diamond_ore];
TEXTURE_MAP[BlockType.GLASS] = [TEX.glass, TEX.glass, TEX.glass, TEX.glass, TEX.glass, TEX.glass];
TEXTURE_MAP[BlockType.CRAFTING_TABLE] = [TEX.crafting_top, TEX.planks, TEX.crafting_side, TEX.crafting_side, TEX.crafting_side, TEX.crafting_side];
TEXTURE_MAP[BlockType.FURNACE] = [TEX.furnace_side, TEX.furnace_side, TEX.furnace_front, TEX.furnace_side, TEX.furnace_side, TEX.furnace_side];
TEXTURE_MAP[BlockType.SNOW] = [TEX.snow, TEX.snow, TEX.snow, TEX.snow, TEX.snow, TEX.snow];
TEXTURE_MAP[BlockType.ICE] = [TEX.ice, TEX.ice, TEX.ice, TEX.ice, TEX.ice, TEX.ice];
TEXTURE_MAP[BlockType.CLAY] = [TEX.clay, TEX.clay, TEX.clay, TEX.clay, TEX.clay, TEX.clay];
TEXTURE_MAP[BlockType.BRICK] = [TEX.brick, TEX.brick, TEX.brick, TEX.brick, TEX.brick, TEX.brick];
TEXTURE_MAP[BlockType.TNT] = [TEX.tnt_top, TEX.tnt_top, TEX.tnt_side, TEX.tnt_side, TEX.tnt_side, TEX.tnt_side];
TEXTURE_MAP[BlockType.BOOKSHELF] = [TEX.planks, TEX.planks, TEX.bookshelf, TEX.bookshelf, TEX.bookshelf, TEX.bookshelf];
TEXTURE_MAP[BlockType.OBSIDIAN] = [TEX.obsidian, TEX.obsidian, TEX.obsidian, TEX.obsidian, TEX.obsidian, TEX.obsidian];
TEXTURE_MAP[BlockType.CACTUS] = [TEX.leaves, TEX.leaves, TEX.leaves, TEX.leaves, TEX.leaves, TEX.leaves];

function drawPixelTexture(ctx, x, y, type) {
    const r = (seed) => {
        let s = seed;
        return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
    };

    const rng = r(type * 1337 + x * 97 + y * 31);

    // Fill base color
    const fillNoise = (baseColor, variants, density = 0.3) => {
        for (let py = 0; py < TILE_SIZE; py++) {
            for (let px = 0; px < TILE_SIZE; px++) {
                let color;
                if (variants && rng() < density) {
                    color = variants[Math.floor(rng() * variants.length)];
                } else {
                    color = baseColor;
                }
                // Add subtle per-pixel noise
                const noise = Math.floor((rng() - 0.5) * 10);
                ctx.fillStyle = `rgb(${color[0] + noise},${color[1] + noise},${color[2] + noise})`;
                ctx.fillRect(x + px, y + py, 1, 1);
            }
        }
    };

    switch (type) {
        case TEX.grass_top:
            fillNoise(COLORS.grass_top.base, COLORS.grass_top.variants, 0.4);
            break;

        case TEX.grass_side: {
            // Dirt base
            fillNoise(COLORS.dirt.base, COLORS.dirt.variants, 0.3);
            // Green top strip (3-4 px)
            for (let py = 0; py < 4; py++) {
                for (let px = 0; px < TILE_SIZE; px++) {
                    const depth = py + (rng() > 0.5 ? 1 : 0);
                    if (depth < 3 + Math.floor(rng() * 2)) {
                        const c = COLORS.grass_top.base;
                        const n = Math.floor((rng() - 0.5) * 15);
                        ctx.fillStyle = `rgb(${c[0] + n},${c[1] + n},${c[2] + n})`;
                        ctx.fillRect(x + px, y + py, 1, 1);
                    }
                }
            }
            break;
        }

        case TEX.dirt:
        case TEX.grass_bottom:
            fillNoise(COLORS.dirt.base, COLORS.dirt.variants, 0.35);
            break;

        case TEX.stone:
            fillNoise(COLORS.stone.base, COLORS.stone.variants, 0.5);
            // Add cracks
            for (let i = 0; i < 3; i++) {
                const sx = Math.floor(rng() * 14);
                const sy = Math.floor(rng() * 14);
                ctx.fillStyle = `rgb(${95 + Math.floor(rng() * 20)},${95 + Math.floor(rng() * 20)},${95 + Math.floor(rng() * 20)})`;
                ctx.fillRect(x + sx, y + sy, 2, 1);
            }
            break;

        case TEX.sand:
            fillNoise(COLORS.sand.base, COLORS.sand.variants, 0.4);
            break;

        case TEX.water:
            for (let py = 0; py < TILE_SIZE; py++) {
                for (let px = 0; px < TILE_SIZE; px++) {
                    const wave = Math.sin((px + py * 0.5) * 0.8) * 15;
                    const c = COLORS.water.base;
                    ctx.fillStyle = `rgba(${c[0] + wave},${c[1] + wave},${c[2] + wave},0.75)`;
                    ctx.fillRect(x + px, y + py, 1, 1);
                }
            }
            break;

        case TEX.wood_side: {
            const c = COLORS.wood_side;
            for (let py = 0; py < TILE_SIZE; py++) {
                for (let px = 0; px < TILE_SIZE; px++) {
                    const stripe = (py % 4 < 2) ? c.base : c.variants[0];
                    const n = Math.floor((rng() - 0.5) * 12);
                    ctx.fillStyle = `rgb(${stripe[0] + n},${stripe[1] + n},${stripe[2] + n})`;
                    ctx.fillRect(x + px, y + py, 1, 1);
                }
            }
            break;
        }

        case TEX.wood_top: {
            const c = COLORS.wood_top;
            for (let py = 0; py < TILE_SIZE; py++) {
                for (let px = 0; px < TILE_SIZE; px++) {
                    const cx = px - 7.5, cy = py - 7.5;
                    const dist = Math.sqrt(cx * cx + cy * cy);
                    const ring = dist % 3 < 1.5;
                    const color = ring ? c.ring : c.base;
                    const n = Math.floor((rng() - 0.5) * 10);
                    ctx.fillStyle = `rgb(${color[0] + n},${color[1] + n},${color[2] + n})`;
                    ctx.fillRect(x + px, y + py, 1, 1);
                }
            }
            break;
        }

        case TEX.leaves:
            fillNoise(COLORS.leaves.base, COLORS.leaves.variants, 0.5);
            // Add darker spots for holes
            for (let i = 0; i < 8; i++) {
                const lx = Math.floor(rng() * 14);
                const ly = Math.floor(rng() * 14);
                ctx.fillStyle = `rgba(0,0,0,0.2)`;
                ctx.fillRect(x + lx, y + ly, 2, 2);
            }
            break;

        case TEX.cobblestone:
            fillNoise(COLORS.cobblestone.base, COLORS.cobblestone.variants, 0.45);
            // Add cobblestone pattern — darker outlines
            for (let i = 0; i < 6; i++) {
                const bx = Math.floor(rng() * 12);
                const by = Math.floor(rng() * 12);
                const bw = 3 + Math.floor(rng() * 3);
                const bh = 2 + Math.floor(rng() * 3);
                ctx.fillStyle = `rgba(0,0,0,0.15)`;
                ctx.fillRect(x + bx, y + by, bw, 1);
                ctx.fillRect(x + bx, y + by + bh, bw, 1);
                ctx.fillRect(x + bx, y + by, 1, bh);
                ctx.fillRect(x + bx + bw, y + by, 1, bh);
            }
            break;

        case TEX.planks: {
            const c = COLORS.planks;
            for (let py = 0; py < TILE_SIZE; py++) {
                for (let px = 0; px < TILE_SIZE; px++) {
                    const plank = Math.floor(py / 4);
                    const gap = (py % 4 === 0);
                    const seam = (px === (plank % 2 === 0 ? 6 : 12));
                    let color = rng() < 0.3 ? c.variants[Math.floor(rng() * 2)] : c.base;
                    if (gap || seam) color = [color[0] - 30, color[1] - 25, color[2] - 15];
                    const n = Math.floor((rng() - 0.5) * 8);
                    ctx.fillStyle = `rgb(${color[0] + n},${color[1] + n},${color[2] + n})`;
                    ctx.fillRect(x + px, y + py, 1, 1);
                }
            }
            break;
        }

        case TEX.bedrock:
            fillNoise(COLORS.bedrock.base, COLORS.bedrock.variants, 0.6);
            break;

        case TEX.gravel:
            fillNoise(COLORS.gravel.base, COLORS.gravel.variants, 0.5);
            break;

        case TEX.coal_ore:
        case TEX.iron_ore:
        case TEX.gold_ore:
        case TEX.diamond_ore: {
            // Stone base
            fillNoise(COLORS.stone.base, COLORS.stone.variants, 0.4);
            // Ore spots
            const oreKey = type === TEX.coal_ore ? 'coal_ore' : type === TEX.iron_ore ? 'iron_ore' : type === TEX.gold_ore ? 'gold_ore' : 'diamond_ore';
            const oreColor = COLORS[oreKey].ore;
            for (let i = 0; i < 5; i++) {
                const ox = 2 + Math.floor(rng() * 10);
                const oy = 2 + Math.floor(rng() * 10);
                const os = 2 + Math.floor(rng() * 2);
                for (let dy = 0; dy < os; dy++) {
                    for (let dx = 0; dx < os; dx++) {
                        const n = Math.floor((rng() - 0.5) * 15);
                        ctx.fillStyle = `rgb(${oreColor[0] + n},${oreColor[1] + n},${oreColor[2] + n})`;
                        ctx.fillRect(x + ox + dx, y + oy + dy, 1, 1);
                    }
                }
            }
            break;
        }

        case TEX.glass: {
            const c = COLORS.glass;
            for (let py = 0; py < TILE_SIZE; py++) {
                for (let px = 0; px < TILE_SIZE; px++) {
                    const border = px === 0 || px === 15 || py === 0 || py === 15;
                    if (border) {
                        ctx.fillStyle = `rgb(${c.border[0]},${c.border[1]},${c.border[2]})`;
                    } else {
                        ctx.fillStyle = `rgba(${c.base[0]},${c.base[1]},${c.base[2]},0.3)`;
                    }
                    ctx.fillRect(x + px, y + py, 1, 1);
                }
            }
            // Shine
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.fillRect(x + 2, y + 2, 3, 1);
            ctx.fillRect(x + 2, y + 3, 1, 2);
            break;
        }

        case TEX.crafting_top: {
            fillNoise(COLORS.planks.base, COLORS.planks.variants, 0.3);
            // Grid lines
            ctx.fillStyle = 'rgba(80,60,40,0.5)';
            for (let i = 0; i < TILE_SIZE; i += 4) {
                ctx.fillRect(x + i, y, 1, TILE_SIZE);
                ctx.fillRect(x, y + i, TILE_SIZE, 1);
            }
            break;
        }

        case TEX.crafting_side: {
            fillNoise(COLORS.planks.base, COLORS.planks.variants, 0.3);
            // Tool pattern
            ctx.fillStyle = 'rgba(80,60,40,0.4)';
            ctx.fillRect(x + 3, y + 3, 4, 4);
            ctx.fillRect(x + 9, y + 3, 4, 4);
            ctx.fillRect(x + 3, y + 9, 4, 4);
            ctx.fillRect(x + 9, y + 9, 4, 4);
            break;
        }

        case TEX.furnace_front:
            fillNoise(COLORS.stone.base, COLORS.stone.variants, 0.4);
            ctx.fillStyle = '#282828';
            ctx.fillRect(x + 4, y + 6, 8, 6);
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(x + 5, y + 7, 6, 4);
            break;

        case TEX.furnace_side:
            fillNoise(COLORS.stone.base, COLORS.stone.variants, 0.4);
            break;

        case TEX.snow:
            fillNoise(COLORS.snow.base, COLORS.snow.variants, 0.3);
            break;

        case TEX.ice:
            fillNoise(COLORS.ice.base, COLORS.ice.variants, 0.3);
            // Cracks
            ctx.fillStyle = 'rgba(200,220,255,0.4)';
            ctx.fillRect(x + 3, y + 5, 8, 1);
            ctx.fillRect(x + 6, y + 2, 1, 10);
            break;

        case TEX.clay:
            fillNoise(COLORS.clay.base, COLORS.clay.variants, 0.3);
            break;

        case TEX.brick: {
            const mortar = COLORS.brick.mortar;
            // Mortar fill
            for (let py = 0; py < TILE_SIZE; py++) {
                for (let px = 0; px < TILE_SIZE; px++) {
                    ctx.fillStyle = `rgb(${mortar[0] + Math.floor((rng() - 0.5) * 10)},${mortar[1] + Math.floor((rng() - 0.5) * 10)},${mortar[2] + Math.floor((rng() - 0.5) * 10)})`;
                    ctx.fillRect(x + px, y + py, 1, 1);
                }
            }
            // Brick pattern
            const bc = COLORS.brick.base;
            for (let row = 0; row < 4; row++) {
                const offset = (row % 2) * 4;
                for (let col = 0; col < 2; col++) {
                    const bx = offset + col * 8;
                    const by = row * 4;
                    for (let dy = 1; dy < 3; dy++) {
                        for (let dx = 1; dx < 7; dx++) {
                            const n = Math.floor((rng() - 0.5) * 15);
                            ctx.fillStyle = `rgb(${bc[0] + n},${bc[1] + n},${bc[2] + n})`;
                            ctx.fillRect(x + ((bx + dx) % 16), y + by + dy, 1, 1);
                        }
                    }
                }
            }
            break;
        }

        case TEX.tnt_side: {
            const c = COLORS.tnt_side.base;
            for (let py = 0; py < TILE_SIZE; py++) {
                for (let px = 0; px < TILE_SIZE; px++) {
                    const band = py > 3 && py < 12;
                    if (band) {
                        const n = Math.floor((rng() - 0.5) * 12);
                        ctx.fillStyle = `rgb(${c[0] + n},${c[1] + n},${c[2] + n})`;
                    } else {
                        ctx.fillStyle = `rgb(${180 + Math.floor(rng() * 20)},${160 + Math.floor(rng() * 20)},${100 + Math.floor(rng() * 20)})`;
                    }
                    ctx.fillRect(x + px, y + py, 1, 1);
                }
            }
            // TNT text
            ctx.fillStyle = '#000';
            ctx.fillRect(x + 3, y + 6, 2, 4); ctx.fillRect(x + 4, y + 6, 2, 1); // T
            ctx.fillRect(x + 7, y + 6, 1, 4); ctx.fillRect(x + 9, y + 6, 1, 4); ctx.fillRect(x + 8, y + 8, 1, 1); // N
            ctx.fillRect(x + 11, y + 6, 2, 1); ctx.fillRect(x + 12, y + 6, 1, 4); // T
            break;
        }

        case TEX.tnt_top:
            for (let py = 0; py < TILE_SIZE; py++) {
                for (let px = 0; px < TILE_SIZE; px++) {
                    const cx = px - 7.5, cy = py - 7.5;
                    const dist = Math.sqrt(cx * cx + cy * cy);
                    if (dist < 4) {
                        ctx.fillStyle = `rgb(${50 + Math.floor(rng() * 20)},${50 + Math.floor(rng() * 20)},${50 + Math.floor(rng() * 20)})`;
                    } else {
                        ctx.fillStyle = `rgb(${210 + Math.floor(rng() * 20)},${40 + Math.floor(rng() * 15)},${30 + Math.floor(rng() * 15)})`;
                    }
                    ctx.fillRect(x + px, y + py, 1, 1);
                }
            }
            break;

        case TEX.bookshelf: {
            fillNoise(COLORS.planks.base, COLORS.planks.variants, 0.3);
            // Books rows
            for (let row = 0; row < 2; row++) {
                const by = 2 + row * 7;
                for (let bk = 0; bk < 5; bk++) {
                    const bc = COLORS.bookshelf.books[Math.floor(rng() * 3)];
                    const bx = 1 + bk * 3;
                    for (let dy = 0; dy < 5; dy++) {
                        for (let dx = 0; dx < 2; dx++) {
                            const n = Math.floor((rng() - 0.5) * 15);
                            ctx.fillStyle = `rgb(${bc[0] + n},${bc[1] + n},${bc[2] + n})`;
                            ctx.fillRect(x + bx + dx, y + by + dy, 1, 1);
                        }
                    }
                }
            }
            break;
        }

        case TEX.obsidian:
            fillNoise(COLORS.obsidian.base, COLORS.obsidian.variants, 0.5);
            // Purple sheen
            for (let i = 0; i < 4; i++) {
                const sx = Math.floor(rng() * 14);
                const sy = Math.floor(rng() * 14);
                ctx.fillStyle = 'rgba(60,20,80,0.3)';
                ctx.fillRect(x + sx, y + sy, 2, 1);
            }
            break;

        default:
            fillNoise([200, 0, 200], null, 0); // Missing texture = magenta
            break;
    }
}

let textureAtlas = null;
let atlasTexture = null;

export function createTextureAtlas() {
    const canvas = document.createElement('canvas');
    canvas.width = ATLAS_SIZE;
    canvas.height = ATLAS_SIZE;
    const ctx = canvas.getContext('2d');

    // Draw each texture tile
    for (let i = 0; i <= nextSlot; i++) {
        const col = i % ATLAS_TILES;
        const row = Math.floor(i / ATLAS_TILES);
        drawPixelTexture(ctx, col * TILE_SIZE, row * TILE_SIZE, i);
    }

    textureAtlas = canvas;

    atlasTexture = new THREE.CanvasTexture(canvas);
    atlasTexture.magFilter = THREE.NearestFilter;
    atlasTexture.minFilter = THREE.NearestFilter;
    atlasTexture.wrapS = THREE.RepeatWrapping;
    atlasTexture.wrapT = THREE.RepeatWrapping;
    atlasTexture.colorSpace = THREE.SRGBColorSpace;

    return atlasTexture;
}

export function getUVsForFace(blockType, faceIndex) {
    const map = TEXTURE_MAP[blockType];
    if (!map) return [0, 0, 1 / ATLAS_TILES, 1 / ATLAS_TILES]; // fallback

    const texIndex = map[faceIndex] || map[0];
    const col = texIndex % ATLAS_TILES;
    const row = Math.floor(texIndex / ATLAS_TILES);

    const u = col / ATLAS_TILES;
    const v = 1 - (row + 1) / ATLAS_TILES;
    const s = 1 / ATLAS_TILES;

    return [u, v, s]; // u, v, size
}

export function getBlockIconCanvas(blockType, size = 32) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    if (!textureAtlas) return canvas;

    // Get front face texture
    const map = TEXTURE_MAP[blockType];
    if (!map) return canvas;

    const texIndex = map[2] || map[0]; // Front face or top
    const col = texIndex % ATLAS_TILES;
    const row = Math.floor(texIndex / ATLAS_TILES);

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
        textureAtlas,
        col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE,
        0, 0, size, size
    );

    return canvas;
}

export { TEX, ATLAS_TILES, TILE_SIZE, ATLAS_SIZE, atlasTexture };
