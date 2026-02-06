// Block type registry — defines all block types and their properties

export const BlockType = {
    AIR: 0,
    GRASS: 1,
    DIRT: 2,
    STONE: 3,
    SAND: 4,
    WATER: 5,
    WOOD: 6,
    LEAVES: 7,
    COBBLESTONE: 8,
    PLANKS: 9,
    BEDROCK: 10,
    GRAVEL: 11,
    COAL_ORE: 12,
    IRON_ORE: 13,
    GOLD_ORE: 14,
    DIAMOND_ORE: 15,
    GLASS: 16,
    CRAFTING_TABLE: 17,
    FURNACE: 18,
    SNOW: 19,
    ICE: 20,
    CLAY: 21,
    BRICK: 22,
    TNT: 23,
    BOOKSHELF: 24,
    OBSIDIAN: 25,
    TORCH: 26,
    TALL_GRASS: 27,
    FLOWER_RED: 28,
    FLOWER_YELLOW: 29,
    CACTUS: 30,
    SUGAR_CANE: 31
};

// Block properties
export const BlockData = {
    [BlockType.AIR]: { name: 'Air', solid: false, transparent: true, tool: null, hardness: 0, drop: BlockType.AIR },
    [BlockType.GRASS]: { name: 'Grass Block', solid: true, transparent: false, tool: 'shovel', hardness: 0.6, drop: BlockType.DIRT },
    [BlockType.DIRT]: { name: 'Dirt', solid: true, transparent: false, tool: 'shovel', hardness: 0.5, drop: BlockType.DIRT },
    [BlockType.STONE]: { name: 'Stone', solid: true, transparent: false, tool: 'pickaxe', hardness: 1.5, drop: BlockType.COBBLESTONE },
    [BlockType.SAND]: { name: 'Sand', solid: true, transparent: false, tool: 'shovel', hardness: 0.5, drop: BlockType.SAND },
    [BlockType.WATER]: { name: 'Water', solid: false, transparent: true, tool: null, hardness: 100, drop: BlockType.AIR },
    [BlockType.WOOD]: { name: 'Oak Log', solid: true, transparent: false, tool: 'axe', hardness: 2.0, drop: BlockType.WOOD },
    [BlockType.LEAVES]: { name: 'Oak Leaves', solid: true, transparent: true, tool: 'shears', hardness: 0.2, drop: BlockType.AIR },
    [BlockType.COBBLESTONE]: { name: 'Cobblestone', solid: true, transparent: false, tool: 'pickaxe', hardness: 2.0, drop: BlockType.COBBLESTONE },
    [BlockType.PLANKS]: { name: 'Oak Planks', solid: true, transparent: false, tool: 'axe', hardness: 2.0, drop: BlockType.PLANKS },
    [BlockType.BEDROCK]: { name: 'Bedrock', solid: true, transparent: false, tool: null, hardness: -1, drop: BlockType.AIR },
    [BlockType.GRAVEL]: { name: 'Gravel', solid: true, transparent: false, tool: 'shovel', hardness: 0.6, drop: BlockType.GRAVEL },
    [BlockType.COAL_ORE]: { name: 'Coal Ore', solid: true, transparent: false, tool: 'pickaxe', hardness: 3.0, drop: BlockType.COAL_ORE },
    [BlockType.IRON_ORE]: { name: 'Iron Ore', solid: true, transparent: false, tool: 'pickaxe', hardness: 3.0, drop: BlockType.IRON_ORE },
    [BlockType.GOLD_ORE]: { name: 'Gold Ore', solid: true, transparent: false, tool: 'pickaxe', hardness: 3.0, drop: BlockType.GOLD_ORE },
    [BlockType.DIAMOND_ORE]: { name: 'Diamond Ore', solid: true, transparent: false, tool: 'pickaxe', hardness: 3.0, drop: BlockType.DIAMOND_ORE },
    [BlockType.GLASS]: { name: 'Glass', solid: true, transparent: true, tool: null, hardness: 0.3, drop: BlockType.AIR },
    [BlockType.CRAFTING_TABLE]: { name: 'Crafting Table', solid: true, transparent: false, tool: 'axe', hardness: 2.5, drop: BlockType.CRAFTING_TABLE },
    [BlockType.FURNACE]: { name: 'Furnace', solid: true, transparent: false, tool: 'pickaxe', hardness: 3.5, drop: BlockType.FURNACE },
    [BlockType.SNOW]: { name: 'Snow Block', solid: true, transparent: false, tool: 'shovel', hardness: 0.2, drop: BlockType.SNOW },
    [BlockType.ICE]: { name: 'Ice', solid: true, transparent: true, tool: 'pickaxe', hardness: 0.5, drop: BlockType.AIR },
    [BlockType.CLAY]: { name: 'Clay', solid: true, transparent: false, tool: 'shovel', hardness: 0.6, drop: BlockType.CLAY },
    [BlockType.BRICK]: { name: 'Brick', solid: true, transparent: false, tool: 'pickaxe', hardness: 2.0, drop: BlockType.BRICK },
    [BlockType.TNT]: { name: 'TNT', solid: true, transparent: false, tool: null, hardness: 0.0, drop: BlockType.TNT },
    [BlockType.BOOKSHELF]: { name: 'Bookshelf', solid: true, transparent: false, tool: 'axe', hardness: 1.5, drop: BlockType.PLANKS },
    [BlockType.OBSIDIAN]: { name: 'Obsidian', solid: true, transparent: false, tool: 'pickaxe', hardness: 50, drop: BlockType.OBSIDIAN },
    [BlockType.TORCH]: { name: 'Torch', solid: false, transparent: true, tool: null, hardness: 0.0, drop: BlockType.TORCH },
    [BlockType.TALL_GRASS]: { name: 'Tall Grass', solid: false, transparent: true, tool: null, hardness: 0.0, drop: BlockType.AIR },
    [BlockType.FLOWER_RED]: { name: 'Red Flower', solid: false, transparent: true, tool: null, hardness: 0.0, drop: BlockType.FLOWER_RED },
    [BlockType.FLOWER_YELLOW]: { name: 'Yellow Flower', solid: false, transparent: true, tool: null, hardness: 0.0, drop: BlockType.FLOWER_YELLOW },
    [BlockType.CACTUS]: { name: 'Cactus', solid: true, transparent: false, tool: null, hardness: 0.4, drop: BlockType.CACTUS },
    [BlockType.SUGAR_CANE]: { name: 'Sugar Cane', solid: false, transparent: true, tool: null, hardness: 0.0, drop: BlockType.SUGAR_CANE }
};

export function isBlockSolid(type) {
    return BlockData[type]?.solid ?? false;
}

export function isBlockTransparent(type) {
    return BlockData[type]?.transparent ?? true;
}
