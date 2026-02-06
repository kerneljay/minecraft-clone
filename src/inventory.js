// Inventory system — hotbar, slots, item stacks

import { BlockType, BlockData } from './blocks.js';
import { getBlockIconCanvas } from './textures.js';

export class Inventory {
    constructor() {
        // 36 slots: 0-8 = hotbar, 9-35 = main inventory
        this.slots = new Array(36).fill(null);

        // Start with some survival items
        this.slots[0] = { type: BlockType.PLANKS, count: 32 };
        this.slots[1] = { type: BlockType.COBBLESTONE, count: 32 };
        this.slots[2] = { type: BlockType.DIRT, count: 64 };
        this.slots[3] = { type: BlockType.TORCH, count: 16 };
        this.slots[4] = { type: BlockType.CRAFTING_TABLE, count: 1 };
        this.slots[5] = { type: BlockType.FURNACE, count: 1 };
        this.slots[6] = { type: BlockType.GLASS, count: 16 };
        this.slots[7] = { type: BlockType.BRICK, count: 32 };
        this.slots[8] = { type: BlockType.SAND, count: 32 };
    }

    addItem(type, count = 1) {
        // First try to stack with existing
        for (let i = 0; i < this.slots.length; i++) {
            if (this.slots[i] && this.slots[i].type === type && this.slots[i].count < 64) {
                const space = 64 - this.slots[i].count;
                const toAdd = Math.min(count, space);
                this.slots[i].count += toAdd;
                count -= toAdd;
                if (count <= 0) return true;
            }
        }
        // Find empty slot
        for (let i = 0; i < this.slots.length; i++) {
            if (!this.slots[i]) {
                this.slots[i] = { type, count };
                return true;
            }
        }
        return false; // Inventory full
    }

    removeFromSlot(slotIndex, count = 1) {
        if (!this.slots[slotIndex]) return;
        this.slots[slotIndex].count -= count;
        if (this.slots[slotIndex].count <= 0) {
            this.slots[slotIndex] = null;
        }
    }

    getHeldItem() {
        return this.slots[this.selectedSlot || 0];
    }

    getSlot(index) {
        return this.slots[index];
    }

    swapSlots(a, b) {
        const temp = this.slots[a];
        this.slots[a] = this.slots[b];
        this.slots[b] = temp;
    }
}
