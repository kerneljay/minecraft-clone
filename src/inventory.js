// Inventory system — hotbar, slots, item stacks
// FIX: Survival starts EMPTY, creative gets all blocks

import { BlockType, BlockData, isPlaceable, isItem } from './blocks.js';

export class Inventory {
    constructor(creative = false) {
        // 36 slots: 0-8 = hotbar, 9-35 = main inventory
        this.slots = new Array(36).fill(null);
        this.selectedSlot = 0;

        if (creative) {
            this.fillCreative();
        }
        // Survival: starts completely empty — you must gather everything!
    }

    fillCreative() {
        let slot = 0;
        for (const typeStr in BlockType) {
            const type = BlockType[typeStr];
            if (type !== BlockType.AIR && type !== BlockType.WATER && type !== BlockType.BEDROCK && slot < 36) {
                inventory_set(this.slots, slot, type, 64);
                slot++;
            }
        }
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
        return this.slots[this.selectedSlot];
    }

    getSlot(index) {
        return this.slots[index];
    }

    swapSlots(a, b) {
        const temp = this.slots[a];
        this.slots[a] = this.slots[b];
        this.slots[b] = temp;
    }

    // Check if player has at least N of a type
    hasItem(type, count = 1) {
        let total = 0;
        for (const slot of this.slots) {
            if (slot && slot.type === type) total += slot.count;
        }
        return total >= count;
    }

    // Remove items from anywhere in inventory (for crafting)
    removeItem(type, count = 1) {
        for (let i = 0; i < this.slots.length; i++) {
            if (this.slots[i] && this.slots[i].type === type) {
                const take = Math.min(count, this.slots[i].count);
                this.slots[i].count -= take;
                count -= take;
                if (this.slots[i].count <= 0) this.slots[i] = null;
                if (count <= 0) return true;
            }
        }
        return count <= 0;
    }
}

function inventory_set(slots, index, type, count) {
    slots[index] = { type, count };
}
