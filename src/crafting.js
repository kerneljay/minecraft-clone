// Crafting system — 2x2 (inventory) + 3x3 (crafting table) + furnace smelting
// FIX: Support both 2x2 and 3x3 grids, many more recipes

import { BlockType } from './blocks.js';

// RECIPES — each has a pattern and output
// Pattern strings: rows separated by commas, each char maps to an ingredient
// 2x2 recipes are checked in inventory, 3x3 only at crafting table

export const RECIPES = [
    // ===== 2x2 RECIPES (also work on 3x3) =====
    {
        name: 'Planks',
        pattern: ['A'],
        key: { A: BlockType.WOOD },
        output: BlockType.PLANKS,
        count: 4,
        size: 1
    },
    {
        name: 'Sticks',
        pattern: ['A', 'A'],
        key: { A: BlockType.PLANKS },
        output: BlockType.STICK,
        count: 4,
        size: 2
    },
    {
        name: 'Crafting Table',
        pattern: ['AA', 'AA'],
        key: { A: BlockType.PLANKS },
        output: BlockType.CRAFTING_TABLE,
        count: 1,
        size: 2
    },
    {
        name: 'Torch',
        pattern: ['A', 'B'],
        key: { A: BlockType.COAL_ORE, B: BlockType.STICK },
        output: BlockType.TORCH,
        count: 4,
        size: 2
    },
    {
        name: 'Stone Bricks',
        pattern: ['AA', 'AA'],
        key: { A: BlockType.STONE },
        output: BlockType.BRICK,
        count: 4,
        size: 2
    },
    {
        name: 'Snow Block',
        pattern: ['AA', 'AA'],
        key: { A: BlockType.SNOW },
        output: BlockType.ICE,
        count: 1,
        size: 2
    },

    // ===== 3x3 RECIPES (crafting table only) =====
    {
        name: 'Furnace',
        pattern: ['AAA', 'A A', 'AAA'],
        key: { A: BlockType.COBBLESTONE },
        output: BlockType.FURNACE,
        count: 1,
        size: 3
    },
    {
        name: 'Wooden Pickaxe',
        pattern: ['AAA', ' B ', ' B '],
        key: { A: BlockType.PLANKS, B: BlockType.STICK },
        output: BlockType.WOODEN_PICKAXE,
        count: 1,
        size: 3
    },
    {
        name: 'Stone Pickaxe',
        pattern: ['AAA', ' B ', ' B '],
        key: { A: BlockType.COBBLESTONE, B: BlockType.STICK },
        output: BlockType.STONE_PICKAXE,
        count: 1,
        size: 3
    },
    {
        name: 'Wooden Sword',
        pattern: [' A ', ' A ', ' B '],
        key: { A: BlockType.PLANKS, B: BlockType.STICK },
        output: BlockType.WOODEN_SWORD,
        count: 1,
        size: 3
    },
    {
        name: 'Stone Sword',
        pattern: [' A ', ' A ', ' B '],
        key: { A: BlockType.COBBLESTONE, B: BlockType.STICK },
        output: BlockType.STONE_SWORD,
        count: 1,
        size: 3
    },
    {
        name: 'Wooden Axe',
        pattern: ['AA ', 'AB ', ' B '],
        key: { A: BlockType.PLANKS, B: BlockType.STICK },
        output: BlockType.WOODEN_AXE,
        count: 1,
        size: 3
    },
    {
        name: 'Bookshelf',
        pattern: ['AAA', 'BBB', 'AAA'],
        key: { A: BlockType.PLANKS, B: BlockType.PLANKS },
        output: BlockType.BOOKSHELF,
        count: 1,
        size: 3
    },
    {
        name: 'Glass (from Sand)',
        pattern: ['A'],
        key: { A: BlockType.SAND },
        output: BlockType.GLASS,
        count: 1,
        size: 1
    },
    {
        name: 'TNT',
        pattern: ['ABA', 'BAB', 'ABA'],
        key: { A: BlockType.SAND, B: BlockType.GRAVEL },
        output: BlockType.TNT,
        count: 1,
        size: 3
    },
];

// Furnace smelting recipes
export const SMELTING_RECIPES = [
    { input: BlockType.IRON_ORE, output: BlockType.IRON_ORE, count: 1, name: 'Smelt Iron' }, // Iron ingot placeholder
    { input: BlockType.GOLD_ORE, output: BlockType.GOLD_ORE, count: 1, name: 'Smelt Gold' },
    { input: BlockType.SAND, output: BlockType.GLASS, count: 1, name: 'Smelt Glass' },
    { input: BlockType.COBBLESTONE, output: BlockType.STONE, count: 1, name: 'Smelt Stone' },
    { input: BlockType.WOOD, output: BlockType.COAL_ORE, count: 1, name: 'Charcoal' },
    { input: BlockType.RAW_PORK, output: BlockType.COOKED_PORK, count: 1, name: 'Cook Porkchop' },
    { input: BlockType.CLAY, output: BlockType.BRICK, count: 1, name: 'Bake Brick' },
];

// Check recipe against a grid (array of block types)
// gridSize is 2 for inventory, 3 for crafting table
export function checkRecipe(grid, gridSize = 3) {
    for (const recipe of RECIPES) {
        if (recipe.size > gridSize) continue; // Can't craft 3x3 in 2x2
        if (matchesRecipe(grid, gridSize, recipe)) {
            return { type: recipe.output, count: recipe.count, name: recipe.name };
        }
    }
    return null;
}

function matchesRecipe(grid, gridSize, recipe) {
    const pattern = recipe.pattern;
    const key = recipe.key;

    // Get pattern dimensions
    const patH = pattern.length;
    const patW = Math.max(...pattern.map(r => r.length));

    // Try all valid offsets within the grid
    for (let dr = 0; dr <= gridSize - patH; dr++) {
        for (let dc = 0; dc <= gridSize - patW; dc++) {
            if (checkOffset(grid, gridSize, pattern, key, dr, dc, patH, patW)) {
                return true;
            }
        }
    }
    return false;
}

function checkOffset(grid, gridSize, pattern, key, dr, dc, patH, patW) {
    // Verify all grid cells
    for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
            const gridVal = grid[r * gridSize + c] || 0;
            const pr = r - dr;
            const pc = c - dc;

            if (pr >= 0 && pr < patH && pc >= 0 && pc < pattern[pr].length) {
                const patChar = pattern[pr][pc];
                if (patChar === ' ') {
                    if (gridVal !== 0) return false;
                } else {
                    const expected = key[patChar];
                    if (gridVal !== expected) return false;
                }
            } else {
                // Outside pattern — must be empty
                if (gridVal !== 0) return false;
            }
        }
    }
    return true;
}

// Check smelting recipe
export function checkSmelting(inputType) {
    for (const r of SMELTING_RECIPES) {
        if (r.input === inputType) {
            return { type: r.output, count: r.count, name: r.name };
        }
    }
    return null;
}
