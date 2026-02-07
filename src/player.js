// Player controller — first-person movement, physics, block interaction, and right hand
// FIX: Edge-outline block highlight (not wireframe), visible right arm, better physics

import * as THREE from 'three';
import { BlockType, BlockData, isBlockSolid, isPlaceable, isItem } from './blocks.js';
import { CHUNK_HEIGHT } from './chunk.js';

export class Player {
    constructor(camera, world) {
        this.camera = camera;
        this.world = world;

        // Position & physics
        this.position = new THREE.Vector3(8, 80, 8);
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.onGround = false;
        this.width = 0.6;
        this.height = 1.62;
        this.eyeHeight = 1.52;

        // Movement
        this.speed = 4.317; // Blocks/second (Minecraft sprint ~5.6)
        this.sprintSpeed = 5.612;
        this.jumpForce = 8.5;
        this.gravity = -28;
        this.isSprinting = false;

        // Mouse look
        this.yaw = 0;
        this.pitch = 0;
        this.sensitivity = 0.002;

        // Block interaction
        this.reach = 5;
        this.raycaster = new THREE.Raycaster();
        this.breakProgress = 0;
        this.breakTarget = null;
        this.isBreaking = false;
        this.breakTime = 0.5; // Default break time in seconds

        // Block highlight — edge-painted box, NOT wireframe
        this.highlightBox = this.createBlockHighlight();

        // Right hand/arm
        this.rightArm = this.createRightArm();
        this.armSwing = 0;
        this.isSwinging = false;
        this.mineSwingAngle = 0;
        this.isMining = false;
        this.mineTarget = null;
        this.mineProgress = 0;
        this.peaceful = false; // Peaceful mode: no hunger drain

        // Input state
        this.keys = {};
        this.mouseLocked = false;

        // Health & Hunger
        this.health = 20;
        this.maxHealth = 20;
        this.hunger = 20;
        this.maxHunger = 20;
        this.saturation = 5;
        this.xp = 0;
        this.xpLevel = 0;
        this.xpProgress = 0;
        this.hungerTimer = 0;
        this.regenTimer = 0;
        this.fallStartY = null;

        // Game mode
        this.creative = false;
        this.flying = false;

        this.setupControls();
    }

    createBlockHighlight() {
        // Create an edge-only box using EdgesGeometry for clean Minecraft-style outline
        const boxGeo = new THREE.BoxGeometry(1.005, 1.005, 1.005);
        const edgesGeo = new THREE.EdgesGeometry(boxGeo);
        const edgeMat = new THREE.LineBasicMaterial({
            color: 0x000000,
            linewidth: 2,
            transparent: true,
            opacity: 0.6,
            depthTest: true,
        });
        const highlight = new THREE.LineSegments(edgesGeo, edgeMat);
        highlight.visible = false;
        highlight.renderOrder = 999;
        return highlight;
    }

    createRightArm() {
        // Slim Minecraft first-person arm — long and thin, not cube-like
        const armGroup = new THREE.Group();

        // Long slim forearm (3x longer, much thinner)
        const armGeo = new THREE.BoxGeometry(0.12, 1.8, 0.10);
        const armMat = new THREE.MeshLambertMaterial({ color: 0xd4a574 }); // Skin tone
        const arm = new THREE.Mesh(armGeo, armMat);
        arm.position.set(0, -0.5, 0);
        armGroup.add(arm);

        // Small fist at the bottom (only slightly wider)
        const fistGeo = new THREE.BoxGeometry(0.15, 0.14, 0.14);
        const fistMat = new THREE.MeshLambertMaterial({ color: 0xc89860 });
        const fist = new THREE.Mesh(fistGeo, fistMat);
        fist.position.set(0, -1.45, 0);
        armGroup.add(fist);

        return armGroup;
    }

    setupControls() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            // Sprint with Shift
            if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
                if (!this.flying) this.isSprinting = true;
            }
            // Creative mode: double-space to toggle fly
            if (e.code === 'Space' && this.creative) {
                if (this._lastSpaceTime && Date.now() - this._lastSpaceTime < 300) {
                    this.flying = !this.flying;
                    this.velocity.y = 0;
                }
                this._lastSpaceTime = Date.now();
            }
        });

        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
            if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
                this.isSprinting = false;
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (!this.mouseLocked) return;
            this.yaw -= e.movementX * this.sensitivity;
            this.pitch -= e.movementY * this.sensitivity;
            this.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.pitch));
        });
    }

    update(dt, inventory) {
        // Clamp dt to prevent tunneling
        dt = Math.min(dt, 0.05);

        this.updateMovement(dt);
        this.updatePhysics(dt);
        this.updateCamera();
        this.updateBlockHighlight();
        this.updateHunger(dt);
        this.updateArmSwing(dt);
        this.updateHeldItem(inventory);
    }

    updateMovement(dt) {
        const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
        const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));

        const moveDir = new THREE.Vector3(0, 0, 0);

        if (this.keys['KeyW']) moveDir.add(forward);
        if (this.keys['KeyS']) moveDir.sub(forward);
        if (this.keys['KeyA']) moveDir.sub(right);
        if (this.keys['KeyD']) moveDir.add(right);

        if (moveDir.lengthSq() > 0) moveDir.normalize();

        const speed = this.isSprinting ? this.sprintSpeed : this.speed;

        if (this.flying) {
            // Flying mode (creative)
            this.velocity.x = moveDir.x * speed * 2;
            this.velocity.z = moveDir.z * speed * 2;
            if (this.keys['Space']) this.velocity.y = speed * 2;
            else if (this.keys['ControlLeft']) this.velocity.y = -speed * 2;
            else this.velocity.y *= 0.8; // Slow down vertically
        } else {
            this.velocity.x = moveDir.x * speed;
            this.velocity.z = moveDir.z * speed;

            // Jump
            if (this.keys['Space'] && this.onGround) {
                this.velocity.y = this.jumpForce;
                this.onGround = false;
                this.fallStartY = this.position.y;
            }
        }
    }

    updatePhysics(dt) {
        if (!this.flying) {
            this.velocity.y += this.gravity * dt;
        }

        // Track fall start for fall damage
        if (!this.onGround && !this.flying && this.velocity.y < 0 && this.fallStartY === null) {
            this.fallStartY = this.position.y;
        }

        // Move with collision
        const newPos = this.position.clone();

        // X axis
        newPos.x += this.velocity.x * dt;
        if (this.checkCollision(newPos)) {
            newPos.x = this.position.x;
            this.velocity.x = 0;
        }

        // Y axis
        newPos.y += this.velocity.y * dt;
        if (this.checkCollision(newPos)) {
            if (this.velocity.y < 0) {
                // Landing
                if (this.fallStartY !== null && !this.creative) {
                    const fallDist = this.fallStartY - newPos.y;
                    if (fallDist > 3) {
                        const damage = Math.floor(fallDist - 3);
                        this.takeDamage(damage);
                    }
                }
                this.onGround = true;
                this.fallStartY = null;
            }
            newPos.y = this.position.y;
            this.velocity.y = 0;
        } else {
            if (!this.flying) this.onGround = false;
        }

        // Z axis
        newPos.z += this.velocity.z * dt;
        if (this.checkCollision(newPos)) {
            newPos.z = this.position.z;
            this.velocity.z = 0;
        }

        this.position.copy(newPos);

        // Keep above bedrock
        if (this.position.y < 1) {
            this.position.y = 80;
            this.velocity.y = 0;
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
            // Mid-height
            [pos.x - hw, pos.y + this.height * 0.5, pos.z - hw],
            [pos.x + hw, pos.y + this.height * 0.5, pos.z + hw],
        ];

        for (const [cx, cy, cz] of corners) {
            const bx = Math.floor(cx);
            const by = Math.floor(cy);
            const bz = Math.floor(cz);
            if (isBlockSolid(this.world.getBlock(bx, by, bz))) {
                return true;
            }
        }
        return false;
    }

    updateCamera() {
        this.camera.position.set(
            this.position.x,
            this.position.y + this.eyeHeight,
            this.position.z
        );

        const euler = new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ');
        this.camera.quaternion.setFromEuler(euler);
    }

    updateBlockHighlight() {
        const hit = this.raycast();
        if (hit) {
            this.highlightBox.visible = true;
            this.highlightBox.position.set(
                hit.blockPos.x + 0.5,
                hit.blockPos.y + 0.5,
                hit.blockPos.z + 0.5
            );
        } else {
            this.highlightBox.visible = false;
        }
    }

    updateHunger(dt) {
        if (this.creative || this.peaceful) return;

        // Drain hunger over time or with sprint — realistic MC pacing
        this.hungerTimer += dt;
        const drainRate = this.isSprinting ? 8 : 25;
        if (this.hungerTimer > drainRate) {
            this.hungerTimer = 0;
            if (this.hunger > 0) {
                this.hunger = Math.max(0, this.hunger - 0.25);
            }
        }

        // Regen health when hunger > 17
        if (this.hunger > 17 && this.health < this.maxHealth) {
            this.regenTimer += dt;
            if (this.regenTimer > 2) {
                this.regenTimer = 0;
                this.health = Math.min(this.maxHealth, this.health + 1);
                this.hunger = Math.max(0, this.hunger - 0.3);
            }
        }

        // Starve damage when hunger = 0
        if (this.hunger <= 0) {
            this.regenTimer += dt;
            if (this.regenTimer > 4) {
                this.regenTimer = 0;
                if (this.health > 1) this.takeDamage(1);
            }
        }
    }

    // Color map for held block display
    static HELD_ITEM_COLORS = {
        1: 0x5F9F35, 2: 0x866049, 3: 0x7D7D7D, 4: 0xDCD3A0, 6: 0x674E31,
        7: 0x348228, 8: 0xC29D62, 9: 0x7A7A7A, 11: 0x444444, 12: 0xC4A88F,
        13: 0xC8A800, 14: 0x22AADD, 15: 0x887E7E, 16: 0xE8E8F0, 17: 0x7AA8E0,
        18: 0x377826, 19: 0x9EA4B0, 20: 0xC8DCFF, 21: 0x964A36, 22: 0x8B3A3A,
        23: 0xC29D62, 24: 0x828282, 25: 0xC81E1E, 26: 0xFFC832,
        27: 0x8C6432, 28: 0xC86464, 29: 0xA05032,
        30: 0xB08050, 31: 0x909090, 32: 0xB08050, 33: 0x909090, 34: 0xB08050,
    };

    updateHeldItem(inventory) {
        // Held block mesh removed — just show bare hand
    }

    updateArmSwing(dt) {
        if (this.isSwinging) {
            this.armSwing += dt * 14;
            if (this.armSwing > Math.PI) {
                this.armSwing = 0;
                this.isSwinging = false;
            }
        }

        // Mining swing animation (continuous while holding) — fast!
        if (this.isMining) {
            this.mineSwingAngle += dt * 14;
        } else {
            this.mineSwingAngle *= 0.8; // Quickly return
        }

        // Update right arm position
        if (this.rightArm.parent) {
            const swing = Math.sin(this.armSwing) * 0.5;
            const mineSwing = Math.sin(this.mineSwingAngle) * 0.45;
            const totalSwing = swing + mineSwing;
            this.rightArm.position.set(0.38, -0.5 - totalSwing * 0.1, -0.45 + totalSwing * 0.2);
            this.rightArm.rotation.x = -totalSwing;
            this.rightArm.rotation.z = -0.1;
        }
    }

    swingArm() {
        this.isSwinging = true;
        this.armSwing = 0;
    }

    takeDamage(amount) {
        if (this.creative) return;
        this.health = Math.max(0, this.health - amount);
        // Red flash effect handled by UI
    }

    heal(amount) {
        this.health = Math.min(this.maxHealth, this.health + amount);
    }

    eat(hungerRestore, satRestore = 0) {
        this.hunger = Math.min(this.maxHunger, this.hunger + hungerRestore);
        this.saturation = Math.min(this.hunger, this.saturation + satRestore);
    }

    raycast() {
        const dir = new THREE.Vector3(0, 0, -1);
        dir.applyQuaternion(this.camera.quaternion);

        const origin = this.camera.position.clone();
        const step = 0.05;
        let prevX = -1, prevY = -1, prevZ = -1;

        for (let t = 0; t < this.reach; t += step) {
            const px = origin.x + dir.x * t;
            const py = origin.y + dir.y * t;
            const pz = origin.z + dir.z * t;

            const bx = Math.floor(px);
            const by = Math.floor(py);
            const bz = Math.floor(pz);

            if (bx !== prevX || by !== prevY || bz !== prevZ) {
                const block = this.world.getBlock(bx, by, bz);
                if (block !== BlockType.AIR && block !== BlockType.WATER) {
                    return {
                        blockPos: { x: bx, y: by, z: bz },
                        prevPos: { x: prevX, y: prevY, z: prevZ },
                        block: block,
                        distance: t
                    };
                }
                prevX = bx;
                prevY = by;
                prevZ = bz;
            }
        }

        return null;
    }

    // Start or continue mining a block (called each frame while mouse held)
    startMining(world, inventory) {
        const hit = this.raycast();
        if (!hit) {
            this.cancelMining();
            return false;
        }

        const { x, y, z } = hit.blockPos;
        const block = world.getBlock(x, y, z);
        if (block === BlockType.AIR || block === BlockType.WATER || block === BlockType.BEDROCK) {
            this.cancelMining();
            return false;
        }

        // Check if target changed
        if (!this.mineTarget || this.mineTarget.x !== x || this.mineTarget.y !== y || this.mineTarget.z !== z) {
            // New target — reset progress
            this.mineTarget = { x, y, z };
            this.mineProgress = 0;
        }

        this.isMining = true;
        return false; // Not broken yet
    }

    // Update mining progress each frame (called from update)
    updateMining(dt, world, inventory) {
        if (!this.isMining || !this.mineTarget) return;

        const { x, y, z } = this.mineTarget;
        const block = world.getBlock(x, y, z);
        if (block === BlockType.AIR || block === BlockType.BEDROCK) {
            this.cancelMining();
            return;
        }

        const data = BlockData[block];
        const hardness = data ? data.hardness : 1.0;
        // Break time scales with hardness (minimum 0.2s for instant-feel blocks)
        const breakTime = Math.max(0.2, hardness * 1.5);

        this.mineProgress += dt;

        if (this.mineProgress >= breakTime) {
            // Block broken!
            world.setBlock(x, y, z, BlockType.AIR);
            this.swingArm();

            // Drop item
            let dropType = block;
            if (block === BlockType.GRASS) dropType = BlockType.DIRT;
            if (block === BlockType.STONE) dropType = BlockType.COBBLESTONE;
            if (block === BlockType.LEAVES) {
                if (Math.random() < 0.05) dropType = BlockType.WOOD;
                else { this.cancelMining(); return; }
            }

            inventory.addItem(dropType, 1);
            this.cancelMining();
        }
    }

    cancelMining() {
        this.isMining = false;
        this.mineTarget = null;
        this.mineProgress = 0;
    }

    // Legacy instant break for creative
    breakBlock(world, inventory) {
        const hit = this.raycast();
        if (!hit) return false;

        const { x, y, z } = hit.blockPos;
        const block = world.getBlock(x, y, z);
        if (block === BlockType.AIR || block === BlockType.WATER || block === BlockType.BEDROCK) return false;

        world.setBlock(x, y, z, BlockType.AIR);
        this.swingArm();

        let dropType = block;
        if (block === BlockType.GRASS) dropType = BlockType.DIRT;
        if (block === BlockType.STONE) dropType = BlockType.COBBLESTONE;
        if (block === BlockType.LEAVES) {
            if (Math.random() < 0.05) dropType = BlockType.WOOD;
            else return true;
        }

        inventory.addItem(dropType, 1);
        return true;
    }

    placeBlock(world, inventory) {
        const hit = this.raycast();
        if (!hit || hit.prevPos.x < 0) return false;

        const held = inventory.getHeldItem();
        if (!held) return false;

        // Only place placeable blocks
        if (isItem(held.type)) return false;

        const { x, y, z } = hit.prevPos;

        // Don't place inside player
        const hw = this.width / 2;
        if (x >= Math.floor(this.position.x - hw) && x <= Math.floor(this.position.x + hw) &&
            z >= Math.floor(this.position.z - hw) && z <= Math.floor(this.position.z + hw) &&
            y >= Math.floor(this.position.y) && y <= Math.floor(this.position.y + this.height)) {
            return false;
        }

        world.setBlock(x, y, z, held.type);
        this.swingArm();

        if (!this.creative) {
            inventory.removeFromSlot(inventory.selectedSlot, 1);
        }
        return true;
    }
}
