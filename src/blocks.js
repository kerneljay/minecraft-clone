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
    PLANKS: 8,
    COBBLESTONE: 9,
    BEDROCK: 10,
    COAL_ORE: 11,
    IRON_ORE: 12,
    GOLD_ORE: 13,
    DIAMOND_ORE: 14,
    GRAVEL: 15,
    SNOW: 16,
    ICE: 17,
    CACTUS: 18,
    CLAY: 19,
    GLASS: 20,
    BRICK: 21,
    BOOKSHELF: 22,
    CRAFTING_TABLE: 23,
    FURNACE: 24,
    TNT: 25,
    TORCH: 26,
    TALL_GRASS: 27,
    FLOWER_RED: 28,
    FLOWER_YELLOW: 29,
    MUSHROOM_RED: 30,
    MUSHROOM_BROWN: 31,
    // Items (not placeable blocks)
    STICK: 32,
    RAW_PORK: 33,
    COOKED_PORK: 34,
    WOODEN_PICKAXE: 35,
    STONE_PICKAXE: 36,
    WOODEN_SWORD: 37,
    STONE_SWORD: 38,
    WOODEN_AXE: 39,
};

// Block properties
export const BlockData = {
    [BlockType.AIR]: { name: 'Air', solid: false, transparent: true, hardness: 0, drop: BlockType.AIR },
    [BlockType.GRASS]: { name: 'Grass Block', solid: true, transparent: false, hardness: 0.6, drop: BlockType.DIRT },
    [BlockType.DIRT]: { name: 'Dirt', solid: true, transparent: false, hardness: 0.5, drop: BlockType.DIRT },
    [BlockType.STONE]: { name: 'Stone', solid: true, transparent: false, hardness: 1.5, drop: BlockType.COBBLESTONE },
    [BlockType.SAND]: { name: 'Sand', solid: true, transparent: false, hardness: 0.5, drop: BlockType.SAND },
    [BlockType.WATER]: { name: 'Water', solid: false, transparent: true, hardness: -1, drop: BlockType.AIR },
    [BlockType.WOOD]: { name: 'Oak Log', solid: true, transparent: false, hardness: 2.0, drop: BlockType.WOOD },
    [BlockType.LEAVES]: { name: 'Oak Leaves', solid: true, transparent: true, hardness: 0.2, drop: BlockType.AIR },
    [BlockType.PLANKS]: { name: 'Oak Planks', solid: true, transparent: false, hardness: 2.0, drop: BlockType.PLANKS },
    [BlockType.COBBLESTONE]: { name: 'Cobblestone', solid: true, transparent: false, hardness: 2.0, drop: BlockType.COBBLESTONE },
    [BlockType.BEDROCK]: { name: 'Bedrock', solid: true, transparent: false, hardness: -1, drop: BlockType.AIR },
    [BlockType.COAL_ORE]: { name: 'Coal Ore', solid: true, transparent: false, hardness: 3.0, drop: BlockType.COAL_ORE },
    [BlockType.IRON_ORE]: { name: 'Iron Ore', solid: true, transparent: false, hardness: 3.0, drop: BlockType.IRON_ORE },
    [BlockType.GOLD_ORE]: { name: 'Gold Ore', solid: true, transparent: false, hardness: 3.0, drop: BlockType.GOLD_ORE },
    [BlockType.DIAMOND_ORE]: { name: 'Diamond Ore', solid: true, transparent: false, hardness: 3.0, drop: BlockType.DIAMOND_ORE },
    [BlockType.GRAVEL]: { name: 'Gravel', solid: true, transparent: false, hardness: 0.6, drop: BlockType.GRAVEL },
    [BlockType.SNOW]: { name: 'Snow', solid: true, transparent: false, hardness: 0.2, drop: BlockType.SNOW },
    [BlockType.ICE]: { name: 'Ice', solid: true, transparent: true, hardness: 0.5, drop: BlockType.ICE },
    [BlockType.CACTUS]: { name: 'Cactus', solid: true, transparent: false, hardness: 0.4, drop: BlockType.CACTUS },
    [BlockType.CLAY]: { name: 'Clay', solid: true, transparent: false, hardness: 0.6, drop: BlockType.CLAY },
    [BlockType.GLASS]: { name: 'Glass', solid: true, transparent: true, hardness: 0.3, drop: BlockType.AIR },
    [BlockType.BRICK]: { name: 'Brick', solid: true, transparent: false, hardness: 2.0, drop: BlockType.BRICK },
    [BlockType.BOOKSHELF]: { name: 'Bookshelf', solid: true, transparent: false, hardness: 1.5, drop: BlockType.BOOKSHELF },
    [BlockType.CRAFTING_TABLE]: { name: 'Crafting Table', solid: true, transparent: false, hardness: 2.5, drop: BlockType.CRAFTING_TABLE },
    [BlockType.FURNACE]: { name: 'Furnace', solid: true, transparent: false, hardness: 3.5, drop: BlockType.FURNACE },
    [BlockType.TNT]: { name: 'TNT', solid: true, transparent: false, hardness: 0, drop: BlockType.TNT },
    [BlockType.TORCH]: { name: 'Torch', solid: false, transparent: true, hardness: 0, drop: BlockType.TORCH },
    [BlockType.TALL_GRASS]: { name: 'Tall Grass', solid: false, transparent: true, hardness: 0, drop: BlockType.AIR },
    [BlockType.FLOWER_RED]: { name: 'Poppy', solid: false, transparent: true, hardness: 0, drop: BlockType.FLOWER_RED },
    [BlockType.FLOWER_YELLOW]: { name: 'Dandelion', solid: false, transparent: true, hardness: 0, drop: BlockType.FLOWER_YELLOW },
    [BlockType.MUSHROOM_RED]: { name: 'Red Mushroom', solid: false, transparent: true, hardness: 0, drop: BlockType.MUSHROOM_RED },
    [BlockType.MUSHROOM_BROWN]: { name: 'Brown Mushroom', solid: false, transparent: true, hardness: 0, drop: BlockType.MUSHROOM_BROWN },
    // Items
    [BlockType.STICK]: { name: 'Stick', solid: false, transparent: true, hardness: 0, drop: BlockType.STICK, isItem: true },
    [BlockType.RAW_PORK]: { name: 'Raw Porkchop', solid: false, transparent: true, hardness: 0, drop: BlockType.RAW_PORK, isItem: true, food: 3 },
    [BlockType.COOKED_PORK]: { name: 'Cooked Porkchop', solid: false, transparent: true, hardness: 0, drop: BlockType.COOKED_PORK, isItem: true, food: 8 },
    [BlockType.WOODEN_PICKAXE]: { name: 'Wooden Pickaxe', solid: false, transparent: true, hardness: 0, drop: BlockType.WOODEN_PICKAXE, isItem: true, toolSpeed: 2 },
    [BlockType.STONE_PICKAXE]: { name: 'Stone Pickaxe', solid: false, transparent: true, hardness: 0, drop: BlockType.STONE_PICKAXE, isItem: true, toolSpeed: 4 },
    [BlockType.WOODEN_SWORD]: { name: 'Wooden Sword', solid: false, transparent: true, hardness: 0, drop: BlockType.WOODEN_SWORD, isItem: true, attackDmg: 4 },
    [BlockType.STONE_SWORD]: { name: 'Stone Sword', solid: false, transparent: true, hardness: 0, drop: BlockType.STONE_SWORD, isItem: true, attackDmg: 5 },
    [BlockType.WOODEN_AXE]: { name: 'Wooden Axe', solid: false, transparent: true, hardness: 0, drop: BlockType.WOODEN_AXE, isItem: true, toolSpeed: 2 },
};

export function isBlockSolid(type) {
    const data = BlockData[type];
    return data ? data.solid : false;
}

export function isBlockTransparent(type) {
    const data = BlockData[type];
    return data ? data.transparent : true;
}

export function isItem(type) {
    const data = BlockData[type];
    return data ? !!data.isItem : false;
}

export function isPlaceable(type) {
    const data = BlockData[type];
    if (!data) return false;
    return !data.isItem && type !== BlockType.AIR;
}
