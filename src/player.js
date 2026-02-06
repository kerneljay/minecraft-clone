// Player controller — first-person movement, physics, and block interaction

import * as THREE from 'three';
import { BlockType, BlockData, isBlockSolid } from './blocks.js';
import { CHUNK_HEIGHT } from './chunk.js';

export class Player {
    constructor(camera, world) {
        this.camera = camera;
        this.world = world;

        // Position & physics
        this.position = new THREE.Vector3(8, 80, 8);
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.onGround = false;
        this.width = 0.6;  // Player hitbox
        this.height = 1.8;

        // Camera
        this.yaw = 0;
        this.pitch = 0;

        // Movement params
        this.walkSpeed = 4.317;   // Minecraft walk speed
        this.sprintSpeed = 5.612; // Sprint speed
        this.jumpForce = 8.5;
        this.gravity = -28;
        this.isSprinting = false;
        this.isFlying = false; // Creative mode

        // Block interaction
        this.breakProgress = 0;
        this.breakingBlock = null;
        this.selectedSlot = 0;

        // Survival stats
        this.health = 20;
        this.maxHealth = 20;
        this.hunger = 20;
        this.maxHunger = 20;
        this.saturation = 5;
        this.xp = 0;
        this.xpLevel = 0;
        this.isDead = false;

        // Hunger timer
        this.hungerTimer = 0;
        this.healTimer = 0;
        this.damageTimer = 0;

        // Fall damage
        this.fallStartY = this.position.y;
        this.wasFalling = false;

        // Input state
        this.keys = {};
        this.mouseDX = 0;
        this.mouseDY = 0;
        this.leftClick = false;
        this.rightClick = false;
        this.leftClickHeld = false;

        this.setupInput();
    }

    setupInput() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            if (e.code === 'ShiftLeft') this.isSprinting = true;

            // Hotbar selection with number keys
            if (e.code >= 'Digit1' && e.code <= 'Digit9') {
                this.selectedSlot = parseInt(e.code.replace('Digit', '')) - 1;
            }
        });

        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
            if (e.code === 'ShiftLeft') this.isSprinting = false;
        });

        document.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement) {
                this.mouseDX += e.movementX;
                this.mouseDY += e.movementY;
            }
        });

        document.addEventListener('mousedown', (e) => {
            if (e.button === 0) { this.leftClick = true; this.leftClickHeld = true; }
            if (e.button === 2) this.rightClick = true;
        });

        document.addEventListener('mouseup', (e) => {
            if (e.button === 0) { this.leftClickHeld = false; this.breakProgress = 0; this.breakingBlock = null; }
        });

        document.addEventListener('wheel', (e) => {
            if (e.deltaY > 0) {
                this.selectedSlot = (this.selectedSlot + 1) % 9;
            } else {
                this.selectedSlot = (this.selectedSlot - 1 + 9) % 9;
            }
        });

        // Prevent context menu
        document.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    update(dt, inventory) {
        if (this.isDead) return;

        // Clamp dt to avoid physics issues
        dt = Math.min(dt, 0.05);

        // Mouse look
        const sensitivity = 0.002;
        this.yaw -= this.mouseDX * sensitivity;
        this.pitch -= this.mouseDY * sensitivity;
        this.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.pitch));
        this.mouseDX = 0;
        this.mouseDY = 0;

        // Movement
        const speed = this.isSprinting ? this.sprintSpeed : this.walkSpeed;
        const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
        const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
        const moveDir = new THREE.Vector3(0, 0, 0);

        if (this.keys['KeyW']) moveDir.add(forward);
        if (this.keys['KeyS']) moveDir.sub(forward);
        if (this.keys['KeyA']) moveDir.sub(right);
        if (this.keys['KeyD']) moveDir.add(right);

        if (moveDir.length() > 0) {
            moveDir.normalize().multiplyScalar(speed);
        }

        // Apply gravity
        if (!this.isFlying) {
            this.velocity.y += this.gravity * dt;
        }

        // Flying controls
        if (this.isFlying) {
            this.velocity.y = 0;
            if (this.keys['Space']) this.velocity.y = 10;
            if (this.keys['ShiftLeft']) this.velocity.y = -10;
        }

        // Jump
        if (this.keys['Space'] && this.onGround && !this.isFlying) {
            this.velocity.y = this.jumpForce;
            this.onGround = false;
            // Sprinting reduces hunger faster
            if (this.isSprinting) this.hunger = Math.max(0, this.hunger - 0.1);
        }

        this.velocity.x = moveDir.x;
        this.velocity.z = moveDir.z;

        // Collision detection & movement
        this.moveWithCollision(dt);

        // Fall damage
        if (this.onGround) {
            if (this.wasFalling) {
                const fallDist = this.fallStartY - this.position.y;
                if (fallDist > 3) {
                    const damage = Math.floor(fallDist - 3);
                    this.takeDamage(damage);
                }
            }
            this.fallStartY = this.position.y;
            this.wasFalling = false;
        } else {
            if (this.velocity.y < 0) {
                if (!this.wasFalling) {
                    this.fallStartY = this.position.y;
                    this.wasFalling = true;
                }
            }
        }

        // Update camera
        this.camera.position.copy(this.position);
        this.camera.position.y += 1.62; // Eye height

        const euler = new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ');
        this.camera.quaternion.setFromEuler(euler);

        // Survival mechanics
        this.updateSurvival(dt);

        // Block interaction
        this.handleBlockInteraction(dt, inventory);

        // Reset click states
        this.leftClick = false;
        this.rightClick = false;
    }

    moveWithCollision(dt) {
        const hw = this.width / 2;
        const pos = this.position;

        // Move X
        pos.x += this.velocity.x * dt;
        if (this.checkCollision(pos)) {
            pos.x -= this.velocity.x * dt;
            this.velocity.x = 0;
        }

        // Move Y
        pos.y += this.velocity.y * dt;
        if (this.checkCollision(pos)) {
            if (this.velocity.y < 0) this.onGround = true;
            pos.y -= this.velocity.y * dt;
            this.velocity.y = 0;
        } else {
            this.onGround = false;
        }

        // Move Z
        pos.z += this.velocity.z * dt;
        if (this.checkCollision(pos)) {
            pos.z -= this.velocity.z * dt;
            this.velocity.z = 0;
        }

        // Keep above void
        if (pos.y < -10) {
            this.takeDamage(20);
        }
    }

    checkCollision(pos) {
        const hw = this.width / 2;
        const corners = [
            [pos.x - hw, pos.y, pos.z - hw],
            [pos.x + hw, pos.y, pos.z - hw],
            [pos.x - hw, pos.y, pos.z + hw],
            [pos.x + hw, pos.y, pos.z + hw],
            [pos.x - hw, pos.y + this.height, pos.z - hw],
            [pos.x + hw, pos.y + this.height, pos.z - hw],
            [pos.x - hw, pos.y + this.height, pos.z + hw],
            [pos.x + hw, pos.y + this.height, pos.z + hw],
            // Middle height check
            [pos.x - hw, pos.y + 0.9, pos.z - hw],
            [pos.x + hw, pos.y + 0.9, pos.z - hw],
            [pos.x - hw, pos.y + 0.9, pos.z + hw],
            [pos.x + hw, pos.y + 0.9, pos.z + hw],
        ];

        for (const [cx, cy, cz] of corners) {
            const bx = Math.floor(cx);
            const by = Math.floor(cy);
            const bz = Math.floor(cz);
            const block = this.world.getBlock(bx, by, bz);
            if (isBlockSolid(block)) return true;
        }
        return false;
    }

    handleBlockInteraction(dt, inventory) {
        // Get direction camera is looking
        const dir = new THREE.Vector3(0, 0, -1);
        dir.applyQuaternion(this.camera.quaternion);

        const hit = this.world.raycast(this.camera.position, dir, 5);

        if (hit) {
            // Breaking blocks (left click held)
            if (this.leftClickHeld) {
                const pos = hit.position;
                const key = `${pos.x},${pos.y},${pos.z}`;

                if (this.breakingBlock !== key) {
                    this.breakingBlock = key;
                    this.breakProgress = 0;
                }

                const blockData = BlockData[hit.block];
                const breakTime = blockData.hardness < 0 ? Infinity : (blockData.hardness * 1.5);

                this.breakProgress += dt;

                if (this.breakProgress >= breakTime && breakTime !== Infinity) {
                    // Break the block!
                    const dropType = blockData.drop;
                    this.world.setBlock(pos.x, pos.y, pos.z, BlockType.AIR);

                    // Add to inventory
                    if (dropType !== BlockType.AIR) {
                        inventory.addItem(dropType, 1);
                    }

                    this.breakProgress = 0;
                    this.breakingBlock = null;

                    // Hunger depletion from mining
                    this.hunger = Math.max(0, this.hunger - 0.025);
                }
            }

            // Placing blocks (right click)
            if (this.rightClick && hit.normal) {
                const px = hit.position.x + hit.normal.x;
                const py = hit.position.y + hit.normal.y;
                const pz = hit.position.z + hit.normal.z;

                // Check player isn't placing inside themselves
                const playerMinX = this.position.x - this.width / 2;
                const playerMaxX = this.position.x + this.width / 2;
                const playerMinY = this.position.y;
                const playerMaxY = this.position.y + this.height;
                const playerMinZ = this.position.z - this.width / 2;
                const playerMaxZ = this.position.z + this.width / 2;

                const blockInPlayer = (
                    px + 1 > playerMinX && px < playerMaxX &&
                    py + 1 > playerMinY && py < playerMaxY &&
                    pz + 1 > playerMinZ && pz < playerMaxZ
                );

                if (!blockInPlayer) {
                    const heldItem = inventory.getHeldItem();
                    if (heldItem && heldItem.count > 0 && isBlockSolid(heldItem.type)) {
                        this.world.setBlock(px, py, pz, heldItem.type);
                        inventory.removeFromSlot(this.selectedSlot, 1);
                    }
                }
            }
        } else {
            this.breakProgress = 0;
            this.breakingBlock = null;
        }
    }

    updateSurvival(dt) {
        // Hunger depletion over time
        this.hungerTimer += dt;
        if (this.hungerTimer >= 4) { // ~80 seconds Minecraft tick for hunger
            this.hungerTimer = 0;
            if (this.isSprinting || this.velocity.length() > 0.1) {
                this.hunger = Math.max(0, this.hunger - 0.5);
            } else {
                this.hunger = Math.max(0, this.hunger - 0.1);
            }
        }

        // Health regeneration (when hunger >= 18)
        if (this.hunger >= 18 && this.health < this.maxHealth) {
            this.healTimer += dt;
            if (this.healTimer >= 0.5) {
                this.healTimer = 0;
                this.health = Math.min(this.maxHealth, this.health + 1);
                this.hunger = Math.max(0, this.hunger - 0.3);
            }
        }

        // Starvation damage (when hunger === 0)
        if (this.hunger === 0) {
            this.damageTimer += dt;
            if (this.damageTimer >= 4) {
                this.damageTimer = 0;
                this.takeDamage(1);
            }
        }

        // Water damage (head submerged — simplified)
        const headY = this.position.y + 1.62;
        const headBlock = this.world.getBlock(
            Math.floor(this.position.x),
            Math.floor(headY),
            Math.floor(this.position.z)
        );
        if (headBlock === BlockType.WATER) {
            // Simplified drowning
            this.damageTimer += dt;
            if (this.damageTimer >= 2) {
                this.damageTimer = 0;
                this.takeDamage(1);
            }
        }
    }

    takeDamage(amount) {
        if (this.isDead) return;
        this.health = Math.max(0, this.health - amount);
        if (this.health <= 0) {
            this.isDead = true;
        }
    }

    respawn() {
        this.health = this.maxHealth;
        this.hunger = this.maxHunger;
        this.isDead = false;
        this.velocity.set(0, 0, 0);
        this.position.set(8, this.world.getSpawnHeight(8, 8) + 1, 8);
        this.fallStartY = this.position.y;
    }

    getForwardDir() {
        const dir = new THREE.Vector3(0, 0, -1);
        dir.applyQuaternion(this.camera.quaternion);
        return dir;
    }

    getLookingAt() {
        const dir = this.getForwardDir();
        return this.world.raycast(this.camera.position, dir, 5);
    }
}
