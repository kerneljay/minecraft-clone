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
        this.sprintSpeed = 7.2;
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
        this.devMode = false;
        this.flying = false;
        this.flySpeedMultiplier = 1.0;
        this.flySpeedMin = 0.25;
        this.flySpeedMax = 5.0;
        this.flySpeedStep = 0.25;
        this.cameraMode = 0; // 0: first person, 1: third person back, 2: third person front
        this.thirdPersonDistance = 4.0;
        this.thirdPersonHeightOffset = 0.35;
        this.walkCycle = 0;
        this.avatarSwingAmount = 0;
        this.avatarBobOffset = 0;
        this.avatarJumpOffset = 0;
        this.avatarParts = null;

        // Third-person avatar (simple local player model)
        this.avatar = this.createAvatar();
        this.avatar.visible = false;

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
        // Slim Minecraft first-person arm — wider, shifted right
        const armGroup = new THREE.Group();

        // Forearm — 33% wider than before
        const armGeo = new THREE.BoxGeometry(0.16, 1.2, 0.13);
        const armMat = new THREE.MeshLambertMaterial({ color: 0xd4a574 });
        const arm = new THREE.Mesh(armGeo, armMat);
        arm.position.set(0, -0.3, 0);
        armGroup.add(arm);

        // Fist at the bottom — also wider
        const fistGeo = new THREE.BoxGeometry(0.20, 0.14, 0.18);
        const fistMat = new THREE.MeshLambertMaterial({ color: 0xc89860 });
        const fist = new THREE.Mesh(fistGeo, fistMat);
        fist.position.set(0, -0.95, 0);
        armGroup.add(fist);

        return armGroup;
    }

    createAvatar() {
        const avatar = new THREE.Group();

        const skinMat = new THREE.MeshLambertMaterial({ color: 0xd4a574 });
        const shirtMat = new THREE.MeshLambertMaterial({ color: 0x4d79cf });
        const pantsMat = new THREE.MeshLambertMaterial({ color: 0x2f3f73 });
        const hairMat = new THREE.MeshLambertMaterial({ color: 0x5a3b25 });

        // Use joint pivots (shoulders/hips) to keep limbs from protruding during animation.
        const headPivot = new THREE.Group();
        headPivot.position.set(0, 1.34, 0);
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), skinMat);
        head.position.set(0, 0.25, 0);
        headPivot.add(head);
        avatar.add(headPivot);

        const hair = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.18, 0.52), hairMat);
        hair.position.set(0, 0.41, 0);
        headPivot.add(hair);

        const body = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.74, 0.28), shirtMat);
        body.position.set(0, 0.9, 0);
        avatar.add(body);

        const leftArmPivot = new THREE.Group();
        leftArmPivot.position.set(-0.37, 1.2, 0);
        avatar.add(leftArmPivot);
        const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.7, 0.18), skinMat);
        leftArm.position.set(0, -0.35, 0);
        leftArmPivot.add(leftArm);

        const rightArmPivot = new THREE.Group();
        rightArmPivot.position.set(0.37, 1.2, 0);
        avatar.add(rightArmPivot);
        const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.7, 0.18), skinMat);
        rightArm.position.set(0, -0.35, 0);
        rightArmPivot.add(rightArm);

        const leftLegPivot = new THREE.Group();
        leftLegPivot.position.set(-0.14, 0.72, 0);
        avatar.add(leftLegPivot);
        const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.72, 0.22), pantsMat);
        leftLeg.position.set(0, -0.36, 0);
        leftLegPivot.add(leftLeg);

        const rightLegPivot = new THREE.Group();
        rightLegPivot.position.set(0.14, 0.72, 0);
        avatar.add(rightLegPivot);
        const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.72, 0.22), pantsMat);
        rightLeg.position.set(0, -0.36, 0);
        rightLegPivot.add(rightLeg);

        this.avatarParts = {
            headPivot,
            head,
            body,
            leftArmPivot,
            rightArmPivot,
            leftLegPivot,
            rightLegPivot,
            leftArm,
            rightArm,
            leftLeg,
            rightLeg,
        };

        return avatar;
    }

    cycleCameraMode() {
        this.cameraMode = (this.cameraMode + 1) % 3;
    }

    getViewQuaternion() {
        return new THREE.Quaternion().setFromEuler(
            new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ')
        );
    }

    getViewDirection() {
        const dir = new THREE.Vector3(0, 0, -1);
        dir.applyQuaternion(this.getViewQuaternion());
        return dir.normalize();
    }

    resolveThirdPersonCamera(origin, target) {
        const dir = target.clone().sub(origin);
        const distance = dir.length();
        if (distance <= 0.001) return origin.clone();

        dir.normalize();
        const step = 0.12;
        let safeDistance = distance;

        for (let t = 0.2; t <= distance; t += step) {
            const px = origin.x + dir.x * t;
            const py = origin.y + dir.y * t;
            const pz = origin.z + dir.z * t;
            const bx = Math.floor(px);
            const by = Math.floor(py);
            const bz = Math.floor(pz);

            if (isBlockSolid(this.world.getBlock(bx, by, bz))) {
                safeDistance = Math.max(0.25, t - 0.2);
                break;
            }
        }

        return origin.clone().addScaledVector(dir, safeDistance);
    }
    setupControls() {
        document.addEventListener('keydown', (e) => {
            if (window._chatOpen) return;
            this.keys[e.code] = true;
            // Sprint with Shift
            if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
                if (!this.flying) this.isSprinting = true;
            }
            // Creative/dev mode: double-space to toggle fly
            if (e.code === 'Space' && (this.creative || this.devMode)) {
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
        if (window._chatOpen) {
            this.velocity.x = 0;
            this.velocity.z = 0;
            if (this.flying) this.velocity.y *= 0.8;
            return;
        }

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
            const flySpeed = speed * 2 * this.flySpeedMultiplier;
            this.velocity.x = moveDir.x * flySpeed;
            this.velocity.z = moveDir.z * flySpeed;
            if (this.keys['Space']) this.velocity.y = flySpeed;
            else if (this.keys['ControlLeft']) this.velocity.y = -flySpeed;
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

    adjustFlySpeed(increase) {
        if (!this.devMode) return;
        const delta = increase ? this.flySpeedStep : -this.flySpeedStep;
        this.flySpeedMultiplier = Math.max(
            this.flySpeedMin,
            Math.min(this.flySpeedMax, this.flySpeedMultiplier + delta)
        );
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
        const eyePos = new THREE.Vector3(
            this.position.x,
            this.position.y + this.eyeHeight,
            this.position.z
        );
        const viewQuat = this.getViewQuaternion();
        const viewDir = new THREE.Vector3(0, 0, -1).applyQuaternion(viewQuat).normalize();
        const firstPerson = this.cameraMode === 0;

        this.rightArm.visible = firstPerson;

        if (this.avatar) {
            this.avatar.visible = !firstPerson;
            this.avatar.position.set(
                this.position.x,
                this.position.y + this.avatarBobOffset + this.avatarJumpOffset,
                this.position.z
            );
            this.avatar.rotation.set(0, this.yaw, 0);
        }

        if (firstPerson) {
            this.camera.position.copy(eyePos);
            this.camera.quaternion.copy(viewQuat);
            return;
        }

        const frontView = this.cameraMode === 2;
        const desiredPos = eyePos
            .clone()
            .addScaledVector(viewDir, frontView ? this.thirdPersonDistance : -this.thirdPersonDistance);
        desiredPos.y += this.thirdPersonHeightOffset;

        const resolvedPos = this.resolveThirdPersonCamera(eyePos, desiredPos);
        this.camera.position.copy(resolvedPos);
        this.camera.lookAt(eyePos);
    }

    updateAvatarAnimation(dt) {
        if (!this.avatarParts) return;

        const horizontalSpeed = Math.sqrt(
            this.velocity.x * this.velocity.x +
            this.velocity.z * this.velocity.z
        );
        const speedRatio = Math.min(1, horizontalSpeed / this.sprintSpeed);
        const moving = speedRatio > 0.02 && (this.onGround || this.flying);

        if (moving) {
            this.walkCycle += dt * (7 + speedRatio * 10);
        }

        const blendFast = Math.min(1, dt * 14);
        const blendSlow = Math.min(1, dt * 9);

        const targetSwing = moving ? (0.16 + speedRatio * 0.6) : 0;
        this.avatarSwingAmount += (targetSwing - this.avatarSwingAmount) * blendFast;

        const walkSin = Math.sin(this.walkCycle);
        let leftArmX = walkSin * this.avatarSwingAmount * 0.8;
        let rightArmX = -leftArmX;
        let leftLegX = -walkSin * this.avatarSwingAmount * 1.05;
        let rightLegX = -leftLegX;

        // Jump/fall pose
        let jumpBodyPitch = 0;
        let jumpYOffset = 0;
        if (!this.onGround && !this.flying) {
            if (this.velocity.y > 0.15) {
                // Jump up: tuck legs a bit, push arms back
                leftArmX -= 0.28;
                rightArmX -= 0.28;
                leftLegX += 0.2;
                rightLegX += 0.2;
                jumpBodyPitch = 0.08;
                jumpYOffset = 0.03;
            } else {
                // Falling: brace slightly
                leftArmX += 0.12;
                rightArmX += 0.12;
                leftLegX -= 0.15;
                rightLegX -= 0.15;
                jumpBodyPitch = -0.06;
                jumpYOffset = -0.03;
            }
        }

        // Mining/swing animation overlay on right arm
        if (this.isMining) {
            rightArmX += -0.85 + Math.sin(this.mineSwingAngle * 1.15) * 0.35;
        } else if (this.isSwinging) {
            rightArmX += -0.35 + Math.sin(this.armSwing) * 0.25;
        }

        // Clamp rotations to keep limbs visually attached and avoid protruding geometry.
        leftArmX = THREE.MathUtils.clamp(leftArmX, -1.1, 1.1);
        rightArmX = THREE.MathUtils.clamp(rightArmX, -1.45, 1.1);
        leftLegX = THREE.MathUtils.clamp(leftLegX, -0.95, 0.95);
        rightLegX = THREE.MathUtils.clamp(rightLegX, -0.95, 0.95);

        this.avatarParts.leftArmPivot.rotation.x += (leftArmX - this.avatarParts.leftArmPivot.rotation.x) * blendFast;
        this.avatarParts.rightArmPivot.rotation.x += (rightArmX - this.avatarParts.rightArmPivot.rotation.x) * blendFast;
        this.avatarParts.leftLegPivot.rotation.x += (leftLegX - this.avatarParts.leftLegPivot.rotation.x) * blendFast;
        this.avatarParts.rightLegPivot.rotation.x += (rightLegX - this.avatarParts.rightLegPivot.rotation.x) * blendFast;

        // Subtle torso/head counter motion for a more complete animation set.
        const bodyPitchTarget = THREE.MathUtils.clamp(speedRatio * 0.08 + jumpBodyPitch, -0.15, 0.18);
        this.avatarParts.body.rotation.x += (bodyPitchTarget - this.avatarParts.body.rotation.x) * blendSlow;
        const headPitchTarget = -this.avatarParts.body.rotation.x * 0.55;
        this.avatarParts.headPivot.rotation.x += (headPitchTarget - this.avatarParts.headPivot.rotation.x) * blendSlow;

        const targetBob = (moving && this.onGround)
            ? Math.abs(Math.sin(this.walkCycle * 2)) * 0.022 * (0.6 + speedRatio)
            : 0;
        this.avatarBobOffset += (targetBob - this.avatarBobOffset) * blendSlow;
        this.avatarJumpOffset += (jumpYOffset - this.avatarJumpOffset) * blendSlow;
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

        // Update right arm position — arm points FORWARD (not up)
        if (this.rightArm.parent) {
            const swing = Math.sin(this.armSwing) * 0.5;
            const mineSwing = Math.sin(this.mineSwingAngle) * 0.45;
            const totalSwing = swing + mineSwing;
            this.rightArm.position.set(0.45, -0.35 - totalSwing * 0.08, -0.55 + totalSwing * 0.15);
            this.rightArm.rotation.x = -1.2 - totalSwing * 0.5; // Base angle forward (~70°)
            this.rightArm.rotation.z = -0.1;
        }

        this.updateAvatarAnimation(dt);
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
        const dir = this.getViewDirection();
        const origin = new THREE.Vector3(
            this.position.x,
            this.position.y + this.eyeHeight,
            this.position.z
        );
        const step = 0.05;
        let prevX = null, prevY = null, prevZ = null;

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

        // Instant break for hardness 0 (plants, flowers, tall grass)
        if (hardness === 0) {
            world.setBlock(x, y, z, BlockType.AIR);
            // Drop: use block data's drop (AIR = no drop, e.g. tall grass)
            const dropType = data && data.drop !== undefined ? data.drop : block;
            if (dropType !== BlockType.AIR && window._droppedItems) {
                window._droppedItems.spawnDrop(x, y, z, dropType);
            }
            this.cancelMining();
            return;
        }

        // Break time scales with hardness (minimum 0.2s for instant-feel blocks)
        const breakTime = Math.max(0.2, hardness * 1.5);

        this.mineProgress += dt;

        if (this.mineProgress >= breakTime) {
            // Block broken!
            world.setBlock(x, y, z, BlockType.AIR);
            this.swingArm();

            // Drop item as floating entity
            let dropType = block;
            if (block === BlockType.GRASS) dropType = BlockType.DIRT;
            if (block === BlockType.STONE) dropType = BlockType.COBBLESTONE;
            if (block === BlockType.LEAVES) {
                if (Math.random() < 0.05) dropType = BlockType.WOOD;
                else { this.cancelMining(); return; }
            }

            // Spawn floating drop (skip if AIR)
            if (dropType !== BlockType.AIR && window._droppedItems) {
                window._droppedItems.spawnDrop(x, y, z, dropType);
            } else if (dropType !== BlockType.AIR) {
                inventory.addItem(dropType, 1); // Fallback
            }
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
        if (!hit) return false;
        // Reject if no valid previous position (ray hit on first step)
        if (hit.prevPos.x === null || hit.prevPos.y === null || hit.prevPos.z === null) return false;

        const held = inventory.getHeldItem();
        if (!held) return false;

        // Only place placeable blocks
        if (isItem(held.type)) return false;

        const { x, y, z } = hit.prevPos;

        // Don't place if target block already occupied
        const existing = world.getBlock(x, y, z);
        if (existing !== BlockType.AIR && existing !== BlockType.WATER) return false;

        // Don't place inside player — proper AABB overlap test
        const hw = this.width / 2;
        const playerMinX = this.position.x - hw;
        const playerMaxX = this.position.x + hw;
        const playerMinY = this.position.y;
        const playerMaxY = this.position.y + this.height;
        const playerMinZ = this.position.z - hw;
        const playerMaxZ = this.position.z + hw;

        // Block occupies [x, x+1] x [y, y+1] x [z, z+1]
        const overlap = (
            playerMinX < x + 1 && playerMaxX > x &&
            playerMinY < y + 1 && playerMaxY > y &&
            playerMinZ < z + 1 && playerMaxZ > z
        );
        if (overlap) return false;

        world.setBlock(x, y, z, held.type);
        this.swingArm();

        if (!this.creative) {
            inventory.removeFromSlot(inventory.selectedSlot, 1);
        }
        return true;
    }
}
