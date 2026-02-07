// UI system — HUD rendering (health, hunger, hotbar, crosshair, debug info, crafting UI)
// FIX: MC-style UI polish, proper crafting grid, block icons in hotbar

import { BlockType, BlockData, isItem } from './blocks.js';
import { checkRecipe, checkSmelting } from './crafting.js';

export class UI {
    constructor() {
        this.hotbarEl = document.getElementById('hotbar');
        this.healthBar = document.getElementById('health-bar');
        this.hungerBar = document.getElementById('hunger-bar');
        this.xpBar = document.getElementById('xp-bar');
        this.debugInfo = document.getElementById('debug-info');
        this.crosshair = document.getElementById('crosshair');

        // Crafting overlay
        this.craftingOpen = false;
        this.inventoryOpen = false;
        this.craftingGrid = new Array(9).fill(0); // 3x3 for crafting table
        this.invCraftGrid = new Array(4).fill(0); // 2x2 for inventory
        this.craftingResult = null;

        // Which crafting mode: 'inventory' (2x2), 'table' (3x3), 'furnace'
        this.craftingMode = null;

        this.hotbarSlots = [];
        this.selectedSlot = 0;

        this.buildHotbar();
        this.setupCraftingUI();

        this.damageFlashAlpha = 0;
    }

    buildHotbar() {
        this.hotbarEl.innerHTML = '';
        this.hotbarSlots = [];

        for (let i = 0; i < 9; i++) {
            const slot = document.createElement('div');
            slot.className = 'hotbar-slot' + (i === 0 ? ' selected' : '');
            const icon = document.createElement('canvas');
            icon.width = 32;
            icon.height = 32;
            icon.className = 'slot-icon';
            const count = document.createElement('span');
            count.className = 'slot-count';
            slot.appendChild(icon);
            slot.appendChild(count);
            this.hotbarEl.appendChild(slot);
            this.hotbarSlots.push({ el: slot, icon, count });
        }
    }

    setupCraftingUI() {
        // Crafting overlay will be created dynamically when opened
        this.craftingOverlay = document.getElementById('crafting-overlay');
        if (!this.craftingOverlay) {
            this.craftingOverlay = document.createElement('div');
            this.craftingOverlay.id = 'crafting-overlay';
            this.craftingOverlay.style.cssText = `
                display: none; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
                background: rgba(0,0,0,0.7); z-index: 100; 
                justify-content: center; align-items: center;
                font-family: 'Press Start 2P', monospace;
            `;
            document.body.appendChild(this.craftingOverlay);
        }
    }

    update(player, inventory, world) {
        this.updateHotbar(inventory);
        this.updateHealthBar(player);
        this.updateHungerBar(player);
        this.updateDebugInfo(player, world);
        this.updateDamageFlash();
    }

    updateHotbar(inventory) {
        for (let i = 0; i < 9; i++) {
            const slot = this.hotbarSlots[i];
            const item = inventory.getSlot(i);

            // Selection highlight
            if (i === inventory.selectedSlot) {
                slot.el.classList.add('selected');
            } else {
                slot.el.classList.remove('selected');
            }

            if (item) {
                this.drawItemIcon(slot.icon, item.type);
                slot.count.textContent = item.count > 1 ? item.count : '';
            } else {
                const ctx = slot.icon.getContext('2d');
                ctx.clearRect(0, 0, 32, 32);
                slot.count.textContent = '';
            }
        }
    }

    drawItemIcon(canvas, blockType) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const data = BlockData[blockType];
        if (!data) return;

        // Simple colored square with block name indicator
        const colors = {
            [BlockType.GRASS]: '#5F9F35',
            [BlockType.DIRT]: '#866049',
            [BlockType.STONE]: '#7D7D7D',
            [BlockType.SAND]: '#DCD3A0',
            [BlockType.WOOD]: '#674E31',
            [BlockType.LEAVES]: '#348228',
            [BlockType.PLANKS]: '#C29D62',
            [BlockType.COBBLESTONE]: '#7A7A7A',
            [BlockType.BEDROCK]: '#555',
            [BlockType.COAL_ORE]: '#333',
            [BlockType.IRON_ORE]: '#C4A88F',
            [BlockType.GOLD_ORE]: '#FFD700',
            [BlockType.DIAMOND_ORE]: '#2DD',
            [BlockType.GRAVEL]: '#887E7E',
            [BlockType.SNOW]: '#F5F5FF',
            [BlockType.ICE]: '#94BCFF',
            [BlockType.CACTUS]: '#377826',
            [BlockType.CLAY]: '#9EA4B0',
            [BlockType.GLASS]: '#C8DCFF',
            [BlockType.BRICK]: '#964A36',
            [BlockType.BOOKSHELF]: '#8B3A3A',
            [BlockType.CRAFTING_TABLE]: '#C29D62',
            [BlockType.FURNACE]: '#828282',
            [BlockType.TNT]: '#C81E1E',
            [BlockType.TORCH]: '#FFC832',
            [BlockType.STICK]: '#8C6432',
            [BlockType.RAW_PORK]: '#C86464',
            [BlockType.COOKED_PORK]: '#A05032',
            [BlockType.WOODEN_PICKAXE]: '#C29D62',
            [BlockType.STONE_PICKAXE]: '#7D7D7D',
            [BlockType.WOODEN_SWORD]: '#C29D62',
            [BlockType.STONE_SWORD]: '#7D7D7D',
            [BlockType.WOODEN_AXE]: '#C29D62',
        };

        const color = colors[blockType] || '#888';

        // Draw a nice 3D-ish block icon
        ctx.fillStyle = color;
        ctx.fillRect(4, 4, 24, 24);

        // Highlight edge (top and left)
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillRect(4, 4, 24, 3);
        ctx.fillRect(4, 4, 3, 24);

        // Shadow edge (bottom and right)
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(4, 25, 24, 3);
        ctx.fillRect(25, 4, 3, 24);

        // For items (tools, food), draw a simpler icon shape
        if (isItem(blockType)) {
            ctx.clearRect(0, 0, 32, 32);
            ctx.fillStyle = color;
            if (blockType === BlockType.STICK) {
                ctx.fillRect(13, 4, 6, 24);
            } else if (blockType === BlockType.RAW_PORK || blockType === BlockType.COOKED_PORK) {
                ctx.beginPath();
                ctx.ellipse(16, 16, 10, 7, 0, 0, Math.PI * 2);
                ctx.fill();
            } else {
                // Tool shape
                ctx.fillRect(13, 14, 6, 16); // Handle
                ctx.fillRect(6, 4, 20, 10); // Head
            }
        }
    }

    updateHealthBar(player) {
        if (!this.healthBar) return;
        this.healthBar.innerHTML = '';
        for (let i = 0; i < 10; i++) {
            const hp = player.health - i * 2;
            const canvas = document.createElement('canvas');
            canvas.width = 18;
            canvas.height = 18;
            canvas.style.cssText = 'width:18px;height:18px;image-rendering:pixelated;display:inline-block;margin:0 1px;';
            const ctx = canvas.getContext('2d');

            // Draw MC-style heart
            if (hp >= 2) {
                // Full heart — bright red
                ctx.fillStyle = '#c00';
                ctx.fillRect(2, 4, 4, 2); ctx.fillRect(12, 4, 4, 2); // top bumps
                ctx.fillRect(0, 6, 18, 4); // middle
                ctx.fillRect(2, 10, 14, 2);
                ctx.fillRect(4, 12, 10, 2);
                ctx.fillRect(6, 14, 6, 2);
                ctx.fillRect(8, 16, 2, 2);
                // Highlight
                ctx.fillStyle = '#f44';
                ctx.fillRect(4, 6, 2, 2); ctx.fillRect(14, 6, 2, 2);
            } else if (hp >= 1) {
                // Half heart — left half red, right half dark
                ctx.fillStyle = '#c00';
                ctx.fillRect(2, 4, 4, 2);
                ctx.fillRect(0, 6, 9, 4);
                ctx.fillRect(2, 10, 7, 2);
                ctx.fillRect(4, 12, 5, 2);
                ctx.fillRect(6, 14, 3, 2);
                ctx.fillRect(8, 16, 1, 2);
                // Empty half outline
                ctx.fillStyle = '#440000';
                ctx.fillRect(12, 4, 4, 2);
                ctx.fillRect(9, 6, 9, 4);
                ctx.fillRect(9, 10, 7, 2);
                ctx.fillRect(9, 12, 5, 2);
                ctx.fillRect(9, 14, 3, 2);
                ctx.fillRect(9, 16, 1, 2);
            } else {
                // Empty heart — dark outline
                ctx.fillStyle = '#440000';
                ctx.fillRect(2, 4, 4, 2); ctx.fillRect(12, 4, 4, 2);
                ctx.fillRect(0, 6, 18, 4);
                ctx.fillRect(2, 10, 14, 2);
                ctx.fillRect(4, 12, 10, 2);
                ctx.fillRect(6, 14, 6, 2);
                ctx.fillRect(8, 16, 2, 2);
            }
            this.healthBar.appendChild(canvas);
        }
    }

    updateHungerBar(player) {
        if (!this.hungerBar) return;
        this.hungerBar.innerHTML = '';
        for (let i = 0; i < 10; i++) {
            const h = player.hunger - i * 2;
            const canvas = document.createElement('canvas');
            canvas.width = 18;
            canvas.height = 18;
            canvas.style.cssText = 'width:18px;height:18px;image-rendering:pixelated;display:inline-block;margin:0 1px;';
            const ctx = canvas.getContext('2d');

            // Draw MC-style drumstick
            if (h >= 2) {
                // Full drumstick — brown/tan
                ctx.fillStyle = '#c8841e';
                ctx.fillRect(4, 4, 8, 6); // meat body
                ctx.fillRect(6, 2, 4, 2); // top
                ctx.fillRect(6, 10, 4, 2); // bottom
                ctx.fillStyle = '#e8a420';
                ctx.fillRect(6, 5, 4, 4); // highlight
                // Bone
                ctx.fillStyle = '#eee';
                ctx.fillRect(12, 6, 4, 2); // stick
                ctx.fillRect(16, 4, 2, 2); // bone knob top
                ctx.fillRect(16, 8, 2, 2); // bone knob bottom
            } else if (h >= 1) {
                // Half drumstick — faded
                ctx.fillStyle = '#8a5a12';
                ctx.fillRect(4, 4, 8, 6);
                ctx.fillRect(6, 2, 4, 2);
                ctx.fillRect(6, 10, 4, 2);
                ctx.fillStyle = '#eee';
                ctx.fillRect(12, 6, 4, 2);
                ctx.fillRect(16, 4, 2, 2);
                ctx.fillRect(16, 8, 2, 2);
            } else {
                // Empty hunger — dark outline
                ctx.fillStyle = '#332200';
                ctx.fillRect(4, 4, 8, 6);
                ctx.fillRect(6, 2, 4, 2);
                ctx.fillRect(6, 10, 4, 2);
                ctx.fillRect(12, 6, 4, 2);
                ctx.fillRect(16, 4, 2, 2);
                ctx.fillRect(16, 8, 2, 2);
            }
            this.hungerBar.appendChild(canvas);
        }
    }

    updateDebugInfo(player, world) {
        if (!this.debugInfo) return;
        const pos = player.position;
        const chunkX = Math.floor(pos.x / 16);
        const chunkZ = Math.floor(pos.z / 16);
        this.debugInfo.innerHTML = [
            `XYZ: ${pos.x.toFixed(1)} / ${pos.y.toFixed(1)} / ${pos.z.toFixed(1)}`,
            `Chunk: ${chunkX}, ${chunkZ}`,
            `Loaded: ${world.chunks.size}`,
            player.creative ? `Mode: Creative${player.flying ? ' (Flying)' : ''}` : `Mode: Survival`,
        ].join('<br>');
    }

    updateDamageFlash() {
        let overlay = document.getElementById('damage-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'damage-overlay';
            overlay.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
                background: red; opacity: 0; pointer-events: none; z-index: 50;
                transition: opacity 0.15s;
            `;
            document.body.appendChild(overlay);
        }
        if (this.damageFlashAlpha > 0) {
            overlay.style.opacity = this.damageFlashAlpha;
            this.damageFlashAlpha = Math.max(0, this.damageFlashAlpha - 0.02);
        }
    }

    flashDamage() {
        this.damageFlashAlpha = 0.4;
    }

    // ===== CRAFTING UI =====
    openCrafting(mode, inventory) {
        this.craftingMode = mode;
        this.craftingGrid = new Array(mode === 'table' ? 9 : 4).fill(0);
        this.craftingResult = null;
        this.buildCraftingUI(inventory);
        this.craftingOverlay.style.display = 'flex';
        this.craftingOpen = true;
    }

    closeCrafting(inventory) {
        // Return any item held on cursor back to inventory
        if (this._cursorItem) {
            inventory.addItem(this._cursorItem.type, this._cursorItem.count);
            this._cursorItem = null;
            this._cursorSlot = -1;
        }

        // Return items in crafting grid to inventory
        const grid = this.craftingMode === 'table' ? this.craftingGrid : this.invCraftGrid;
        for (let i = 0; i < grid.length; i++) {
            if (grid[i] !== 0) {
                inventory.addItem(grid[i], 1);
                grid[i] = 0;
            }
        }
        this.craftingOverlay.style.display = 'none';
        this.craftingOpen = false;
        this.craftingMode = null;
    }

    buildCraftingUI(inventory) {
        const mode = this.craftingMode;
        const gridSize = mode === 'table' ? 3 : 2;
        const grid = mode === 'table' ? this.craftingGrid : this.invCraftGrid;
        const title = mode === 'table' ? 'Crafting Table' : mode === 'furnace' ? 'Furnace' : 'Inventory';

        this.craftingOverlay.innerHTML = `
            <div style="background: #c6c6c6; border: 3px solid #555; padding: 16px; border-radius: 4px; min-width: 320px;">
                <div style="color: #404040; font-size: 10px; margin-bottom: 12px; text-align: center;">${title}</div>
                <div style="display: flex; gap: 20px; align-items: center; justify-content: center;">
                    <div id="craft-grid" style="display: grid; grid-template-columns: repeat(${gridSize}, 40px); gap: 2px;"></div>
                    <div style="font-size: 20px; color: #555;">→</div>
                    <div id="craft-result" style="width: 44px; height: 44px; background: #8b8b8b; border: 2px solid #555; cursor: pointer; display: flex; align-items: center; justify-content: center;"></div>
                </div>
                ${mode !== 'furnace' ? `
                <div style="margin-top: 16px; border-top: 2px solid #999; padding-top: 12px;">
                    <div style="color: #404040; font-size: 8px; margin-bottom: 8px;">Inventory</div>
                    <div id="craft-inventory" style="display: grid; grid-template-columns: repeat(9, 40px); gap: 2px;"></div>
                </div>` : ''}
                <div style="text-align: center; margin-top: 12px;">
                    <span style="color: #666; font-size: 7px;">Press E or Escape to close</span>
                </div>
            </div>
        `;

        // Fill crafting grid
        const gridEl = document.getElementById('craft-grid');
        for (let i = 0; i < gridSize * gridSize; i++) {
            const cell = document.createElement('div');
            cell.style.cssText = 'width: 40px; height: 40px; background: #8b8b8b; border: 2px solid #555; cursor: pointer; display: flex; align-items: center; justify-content: center;';
            cell.dataset.index = i;
            cell.addEventListener('click', () => this.handleCraftGridClick(i, inventory));
            this.updateCraftCell(cell, grid[i]);
            gridEl.appendChild(cell);
        }

        // Fill inventory slots
        const invEl = document.getElementById('craft-inventory');
        if (invEl) {
            for (let i = 0; i < 36; i++) {
                const cell = document.createElement('div');
                cell.style.cssText = `width: 40px; height: 40px; background: ${i < 9 ? '#a0a0a0' : '#8b8b8b'}; border: 2px solid #555; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 7px; color: #fff; position: relative;`;
                cell.dataset.invIndex = i;
                cell.addEventListener('click', () => this.handleInvSlotClick(i, inventory));
                const item = inventory.getSlot(i);
                this.updateInvCell(cell, item);
                invEl.appendChild(cell);
            }
        }

        // Result click
        document.getElementById('craft-result').addEventListener('click', () => this.handleCraftResult(inventory));

        this.updateCraftingResult();
    }

    updateCraftCell(cell, blockType) {
        if (blockType && blockType !== 0) {
            const data = BlockData[blockType];
            cell.style.background = this.getBlockColor(blockType);
            cell.textContent = data ? data.name.substring(0, 2) : '?';
            cell.style.color = '#fff';
            cell.style.fontSize = '7px';
            cell.style.textShadow = '1px 1px #000';
        } else {
            cell.style.background = '#8b8b8b';
            cell.textContent = '';
        }
    }

    updateInvCell(cell, item) {
        if (item) {
            const data = BlockData[item.type];
            cell.style.background = this.getBlockColor(item.type);
            cell.innerHTML = `<span style="font-size:7px;color:#fff;text-shadow:1px 1px #000;">${data ? data.name.substring(0, 2) : '?'}</span>`;
            if (item.count > 1) {
                cell.innerHTML += `<span style="position:absolute;bottom:1px;right:2px;font-size:6px;color:#fff;text-shadow:1px 1px #000;">${item.count}</span>`;
            }
        } else {
            cell.innerHTML = '';
            cell.style.background = '#8b8b8b';
        }
    }

    getBlockColor(type) {
        const colorMap = {
            [BlockType.GRASS]: '#5F9F35', [BlockType.DIRT]: '#866049', [BlockType.STONE]: '#7D7D7D',
            [BlockType.SAND]: '#DCD3A0', [BlockType.WOOD]: '#674E31', [BlockType.LEAVES]: '#348228',
            [BlockType.PLANKS]: '#C29D62', [BlockType.COBBLESTONE]: '#7A7A7A', [BlockType.COAL_ORE]: '#444',
            [BlockType.IRON_ORE]: '#C4A88F', [BlockType.GOLD_ORE]: '#C8A800', [BlockType.DIAMOND_ORE]: '#2AA',
            [BlockType.GRAVEL]: '#887E7E', [BlockType.SNOW]: '#E8E8F0', [BlockType.ICE]: '#7AA8E0',
            [BlockType.CACTUS]: '#377826', [BlockType.CLAY]: '#9EA4B0', [BlockType.GLASS]: '#A0B8D0',
            [BlockType.BRICK]: '#964A36', [BlockType.BOOKSHELF]: '#8B3A3A', [BlockType.CRAFTING_TABLE]: '#C29D62',
            [BlockType.FURNACE]: '#828282', [BlockType.TNT]: '#C81E1E', [BlockType.TORCH]: '#FFC832',
            [BlockType.STICK]: '#8C6432', [BlockType.RAW_PORK]: '#C86464', [BlockType.COOKED_PORK]: '#A05032',
            [BlockType.WOODEN_PICKAXE]: '#B08050', [BlockType.STONE_PICKAXE]: '#909090',
            [BlockType.WOODEN_SWORD]: '#B08050', [BlockType.STONE_SWORD]: '#909090',
            [BlockType.WOODEN_AXE]: '#B08050',
        };
        return colorMap[type] || '#888';
    }

    // Selected item to place in grid (cursor)
    _cursorItem = null;
    _cursorSlot = -1;

    handleInvSlotClick(index, inventory) {
        if (this._cursorItem) {
            // Place cursor item into slot
            const existing = inventory.getSlot(index);
            if (!existing) {
                inventory.slots[index] = { ...this._cursorItem };
                this._cursorItem = null;
                this._cursorSlot = -1;
            } else if (existing.type === this._cursorItem.type && existing.count < 64) {
                existing.count += this._cursorItem.count;
                if (existing.count > 64) {
                    this._cursorItem.count = existing.count - 64;
                    existing.count = 64;
                } else {
                    this._cursorItem = null;
                    this._cursorSlot = -1;
                }
            } else {
                // Swap
                inventory.slots[index] = { ...this._cursorItem };
                this._cursorItem = existing;
            }
        } else {
            // Pick up item from slot
            const item = inventory.getSlot(index);
            if (item) {
                this._cursorItem = { ...item };
                this._cursorSlot = index;
                inventory.slots[index] = null;
            }
        }
        this.buildCraftingUI(inventory);
    }

    handleCraftGridClick(index, inventory) {
        const grid = this.craftingMode === 'table' ? this.craftingGrid : this.invCraftGrid;

        if (this._cursorItem) {
            // Place cursor item into craft grid
            if (grid[index] === 0) {
                grid[index] = this._cursorItem.type;
                this._cursorItem.count--;
                if (this._cursorItem.count <= 0) {
                    this._cursorItem = null;
                    this._cursorSlot = -1;
                }
            }
        } else {
            // Pick up from craft grid back to cursor
            if (grid[index] !== 0) {
                this._cursorItem = { type: grid[index], count: 1 };
                grid[index] = 0;
            }
        }

        this.updateCraftingResult();
        this.buildCraftingUI(inventory);
    }

    handleCraftResult(inventory) {
        const grid = this.craftingMode === 'table' ? this.craftingGrid : this.invCraftGrid;
        const gridSize = this.craftingMode === 'table' ? 3 : 2;
        const result = checkRecipe(grid, gridSize);

        if (result) {
            // Add result to inventory
            inventory.addItem(result.type, result.count);

            // Remove one of each ingredient from grid
            for (let i = 0; i < grid.length; i++) {
                if (grid[i] !== 0) grid[i] = 0;
            }

            this.updateCraftingResult();
            this.buildCraftingUI(inventory);
        }
    }

    updateCraftingResult() {
        const grid = this.craftingMode === 'table' ? this.craftingGrid : this.invCraftGrid;
        const gridSize = this.craftingMode === 'table' ? 3 : 2;
        this.craftingResult = checkRecipe(grid, gridSize);

        const resultEl = document.getElementById('craft-result');
        if (resultEl && this.craftingResult) {
            const data = BlockData[this.craftingResult.type];
            resultEl.style.background = this.getBlockColor(this.craftingResult.type);
            resultEl.innerHTML = `<span style="font-size:7px;color:#fff;text-shadow:1px 1px #000;">${data ? data.name.substring(0, 3) : '?'}${this.craftingResult.count > 1 ? ' x' + this.craftingResult.count : ''}</span>`;
        } else if (resultEl) {
            resultEl.style.background = '#8b8b8b';
            resultEl.innerHTML = '';
        }
    }

    selectSlot(index) {
        this.selectedSlot = index;
    }
}
