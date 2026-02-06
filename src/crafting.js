// Crafting system — recipes and crafting logic

import { BlockType } from './blocks.js';

// Recipes: input grid (use 0 for empty) -> output item + count
// Grid is flattened 3x3 array (9 elements)
export const RECIPES = [
    {
        name: 'Planks (from Log)',
        input: [
            0, 0, 0,
            0, BlockType.WOOD, 0,
            0, 0, 0
        ],
        output: BlockType.PLANKS,
        count: 4
    },
    {
        name: 'Crafting Table',
        input: [
            0, 0, 0,
            BlockType.PLANKS, BlockType.PLANKS, 0,
            BlockType.PLANKS, BlockType.PLANKS, 0
        ],
        output: BlockType.CRAFTING_TABLE,
        count: 1
    },
    {
        name: 'Furnace',
        input: [
            BlockType.COBBLESTONE, BlockType.COBBLESTONE, BlockType.COBBLESTONE,
            BlockType.COBBLESTONE, 0, BlockType.COBBLESTONE,
            BlockType.COBBLESTONE, BlockType.COBBLESTONE, BlockType.COBBLESTONE
        ],
        output: BlockType.FURNACE,
        count: 1
    },
    {
        name: 'Stone Bricks',
        input: [
            0, 0, 0,
            BlockType.STONE, BlockType.STONE, 0,
            BlockType.STONE, BlockType.STONE, 0
        ],
        output: BlockType.BRICK,
        count: 4
    },
    {
        name: 'Bookshelf',
        input: [
            BlockType.PLANKS, BlockType.PLANKS, BlockType.PLANKS,
            BlockType.PLANKS, BlockType.PLANKS, BlockType.PLANKS,
            BlockType.PLANKS, BlockType.PLANKS, BlockType.PLANKS
        ],
        output: BlockType.BOOKSHELF,
        count: 1
    },
    {
        name: 'Glass (from Sand)',
        input: [
            0, 0, 0,
            0, BlockType.SAND, 0,
            0, 0, 0
        ],
        output: BlockType.GLASS,
        count: 1
    },
    {
        name: 'Snow Block',
        input: [
            0, 0, 0,
            BlockType.ICE, BlockType.ICE, 0,
            BlockType.ICE, BlockType.ICE, 0
        ],
        output: BlockType.SNOW,
        count: 1
    },
    {
        name: 'TNT',
        input: [
            BlockType.SAND, BlockType.GRAVEL, BlockType.SAND,
            BlockType.GRAVEL, BlockType.SAND, BlockType.GRAVEL,
            BlockType.SAND, BlockType.GRAVEL, BlockType.SAND
        ],
        output: BlockType.TNT,
        count: 1
    }
];

export function checkRecipe(grid) {
    // grid is an array of 9 block types (0 = empty)
    for (const recipe of RECIPES) {
        if (matchesRecipe(grid, recipe.input)) {
            return { type: recipe.output, count: recipe.count };
        }
    }
    return null;
}

function matchesRecipe(grid, recipe) {
    // Try all possible positions (shifted)
    // Find bounding box of recipe
    let minR = 3, maxR = -1, minC = 3, maxC = -1;
    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
            if (recipe[r * 3 + c] !== 0) {
                minR = Math.min(minR, r);
                maxR = Math.max(maxR, r);
                minC = Math.min(minC, c);
                maxC = Math.max(maxC, c);
            }
        }
    }

    let gMinR = 3, gMaxR = -1, gMinC = 3, gMaxC = -1;
    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
            if (grid[r * 3 + c] !== 0) {
                gMinR = Math.min(gMinR, r);
                gMaxR = Math.max(gMaxR, r);
                gMinC = Math.min(gMinC, c);
                gMaxC = Math.max(gMaxC, c);
            }
        }
    }

    // Dimensions must match
    if (maxR - minR !== gMaxR - gMinR || maxC - minC !== gMaxC - gMinC) return false;

    // Check alignment
    const dr = gMinR - minR;
    const dc = gMinC - minC;

    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
            const recipeVal = recipe[r * 3 + c];
            const gr = r + dr;
            const gc = c + dc;
            const gridVal = (gr >= 0 && gr < 3 && gc >= 0 && gc < 3) ? grid[gr * 3 + gc] : 0;
            if (recipeVal !== gridVal) return false;
        }
    }

    return true;
}
