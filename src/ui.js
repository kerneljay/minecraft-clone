// UI system — HUD rendering (health, hunger, hotbar, crosshair, debug info)

import { BlockType, BlockData } from './blocks.js';
import { getBlockIconCanvas } from './textures.js';
import { checkRecipe } from './crafting.js';

export class UI {
    constructor() {
        this.hotbarEl = document.getElementById('hotbar');
        this.healthBar = document.getElementById('health-bar');
        this.hungerBar = document.getElementById('hunger-bar');
        this.xpBar = document.getElementById('xp-bar');
        this.debugInfo = document.getElementById('debug-info');
        this.inventoryScreen = document.getElementById('inventory-screen');
        this.craftingGrid = document.getElementById('crafting-grid');
        this.craftingResult = document.getElementById('crafting-result');
        this.playerInventory = document.getElementById('player-inventory');
        this.deathScreen = document.getElementById('death-screen');
        this.pauseMenu = document.getElementById('pause-menu');

        this.inventoryOpen = false;
        this.craftingSlots = new Array(9).fill(0);
        this.selectedInvSlot = -1;

        this.initHotbar();
        this.initHealthBar();
        this.initHungerBar();
        this.initXPBar();
    }

    initHotbar() {
        this.hotbarEl.innerHTML = '';
        for (let i = 0; i < 9; i++) {
            const slot = document.createElement('div');
            slot.className = 'hotbar-slot';
            slot.innerHTML = `<span class="slot-number">${i + 1}</span>`;
            this.hotbarEl.appendChild(slot);
        }
    }

    initHealthBar() {
        this.healthBar.innerHTML = '';
        for (let i = 0; i < 10; i++) {
            const heart = document.createElement('div');
            heart.className = 'heart';
            this.healthBar.appendChild(heart);
        }
    }

    initHungerBar() {
        this.hungerBar.innerHTML = '';
        for (let i = 0; i < 10; i++) {
            const food = document.createElement('div');
            food.className = 'food';
            this.hungerBar.appendChild(food);
        }
    }

    initXPBar() {
        const fill = document.createElement('div');
        fill.className = 'fill';
        this.xpBar.appendChild(fill);
    }

    updateHotbar(inventory, selectedSlot) {
        const slots = this.hotbarEl.querySelectorAll('.hotbar-slot');
        for (let i = 0; i < 9; i++) {
            const slot = slots[i];
            const item = inventory.slots[i];

            slot.className = 'hotbar-slot' + (i === selectedSlot ? ' selected' : '');

            // Remove old icon
            const oldCanvas = slot.querySelector('canvas');
            if (oldCanvas) oldCanvas.remove();
            const oldCount = slot.querySelector('.slot-count');
            if (oldCount) oldCount.remove();

            if (item && item.count > 0) {
                const icon = getBlockIconCanvas(item.type, 32);
                slot.appendChild(icon);

                if (item.count > 1) {
                    const count = document.createElement('span');
                    count.className = 'slot-count';
                    count.textContent = item.count;
                    slot.appendChild(count);
                }
            }
        }
    }

    updateHealth(health, maxHealth) {
        const hearts = this.healthBar.querySelectorAll('.heart');
        for (let i = 0; i < 10; i++) {
            const heartValue = (i + 1) * 2;
            if (health >= heartValue) {
                hearts[i].className = 'heart';
            } else if (health >= heartValue - 1) {
                hearts[i].className = 'heart half';
            } else {
                hearts[i].className = 'heart empty';
            }
        }
    }

    updateHunger(hunger) {
        const foods = this.hungerBar.querySelectorAll('.food');
        for (let i = 0; i < 10; i++) {
            const foodValue = (i + 1) * 2;
            if (hunger >= foodValue) {
                foods[i].className = 'food';
            } else if (hunger >= foodValue - 1) {
                foods[i].className = 'food half';
            } else {
                foods[i].className = 'food empty';
            }
        }
    }

    updateXP(xp) {
        const fill = this.xpBar.querySelector('.fill');
        if (fill) fill.style.width = `${(xp % 100)}%`;
    }

    updateDebugInfo(data) {
        this.debugInfo.innerHTML = [
            `Minecraft Clone v1.0`,
            `FPS: ${data.fps}`,
            `XYZ: ${data.x.toFixed(1)} / ${data.y.toFixed(1)} / ${data.z.toFixed(1)}`,
            `Chunk: ${data.chunkX}, ${data.chunkZ}`,
            `Chunks loaded: ${data.chunksLoaded}`,
            `Time: ${data.time}`,
            `Looking at: ${data.lookingAt || 'nothing'}`,
            `Biome: ${data.biome || 'Plains'}`
        ].join('<br>');
    }

    toggleInventory(inventory) {
        this.inventoryOpen = !this.inventoryOpen;
        this.inventoryScreen.style.display = this.inventoryOpen ? 'flex' : 'none';

        if (this.inventoryOpen) {
            this.renderInventory(inventory);
        }
    }

    renderInventory(inventory) {
        // Crafting grid
        this.craftingGrid.innerHTML = '<div class="inv-title">Crafting</div>';
        for (let i = 0; i < 9; i++) {
            const slot = document.createElement('div');
            slot.className = 'inv-slot';
            if (this.craftingSlots[i]) {
                const icon = getBlockIconCanvas(this.craftingSlots[i], 28);
                slot.appendChild(icon);
            }
            slot.addEventListener('click', () => {
                if (this.selectedInvSlot >= 0) {
                    const item = inventory.slots[this.selectedInvSlot];
                    if (item) {
                        this.craftingSlots[i] = item.type;
                        this.selectedInvSlot = -1;
                        this.renderInventory(inventory);
                        this.checkCrafting(inventory);
                    }
                } else {
                    this.craftingSlots[i] = 0;
                    this.renderInventory(inventory);
                    this.checkCrafting(inventory);
                }
            });
            this.craftingGrid.appendChild(slot);
        }

        // Crafting result
        this.craftingResult.innerHTML = '';
        const result = checkRecipe(this.craftingSlots);
        if (result) {
            const resultSlot = document.createElement('div');
            resultSlot.className = 'inv-slot';
            resultSlot.style.borderColor = '#ffd700';
            const icon = getBlockIconCanvas(result.type, 28);
            resultSlot.appendChild(icon);
            const count = document.createElement('span');
            count.className = 'slot-count';
            count.textContent = result.count;
            resultSlot.appendChild(count);
            resultSlot.addEventListener('click', () => {
                inventory.addItem(result.type, result.count);
                this.craftingSlots.fill(0);
                this.renderInventory(inventory);
            });
            this.craftingResult.appendChild(resultSlot);
        }

        // Player inventory
        this.playerInventory.innerHTML = '<div class="inv-title" style="grid-column: 1/-1">Inventory</div>';
        for (let i = 0; i < 36; i++) {
            const slot = document.createElement('div');
            slot.className = 'inv-slot' + (i === this.selectedInvSlot ? ' selected' : '');
            const item = inventory.slots[i];
            if (item && item.count > 0) {
                const icon = getBlockIconCanvas(item.type, 28);
                slot.appendChild(icon);
                if (item.count > 1) {
                    const c = document.createElement('span');
                    c.className = 'slot-count';
                    c.textContent = item.count;
                    slot.appendChild(c);
                }
            }
            slot.addEventListener('click', () => {
                if (this.selectedInvSlot === i) {
                    this.selectedInvSlot = -1;
                } else if (this.selectedInvSlot >= 0) {
                    inventory.swapSlots(this.selectedInvSlot, i);
                    this.selectedInvSlot = -1;
                } else {
                    this.selectedInvSlot = i;
                }
                this.renderInventory(inventory);
            });
            this.playerInventory.appendChild(slot);
        }
    }

    checkCrafting(inventory) {
        const result = checkRecipe(this.craftingSlots);
        this.renderInventory(inventory);
    }

    showDeathScreen(score) {
        this.deathScreen.style.display = 'flex';
        document.getElementById('death-score').textContent = `Score: ${score}`;
    }

    hideDeathScreen() {
        this.deathScreen.style.display = 'none';
    }

    showPauseMenu() {
        this.pauseMenu.style.display = 'flex';
    }

    hidePauseMenu() {
        this.pauseMenu.style.display = 'none';
    }
}
