// Mob system — passive and hostile mobs with basic AI

import * as THREE from 'three';
import { BlockType, isBlockSolid } from './blocks.js';

const MOB_TYPES = {
    PIG: 'pig',
    COW: 'cow',
    ZOMBIE: 'zombie',
    SKELETON: 'skeleton',
    CREEPER: 'creeper'
};

const MOB_CONFIG = {
    [MOB_TYPES.PIG]: { health: 10, speed: 1.5, hostile: false, color: 0xf0a0a0, width: 0.8, height: 0.8 },
    [MOB_TYPES.COW]: { health: 10, speed: 1.2, hostile: false, color: 0x6b3a2a, width: 0.9, height: 1.0 },
    [MOB_TYPES.ZOMBIE]: { health: 20, speed: 2.0, hostile: true, color: 0x4a7a3a, width: 0.6, height: 1.8, damage: 3 },
    [MOB_TYPES.SKELETON]: { health: 20, speed: 2.2, hostile: true, color: 0xc8c8c8, width: 0.6, height: 1.8, damage: 2 },
    [MOB_TYPES.CREEPER]: { health: 20, speed: 1.5, hostile: true, color: 0x3a8a3a, width: 0.6, height: 1.5, damage: 10 }
};

class Mob {
    constructor(type, x, y, z) {
        this.type = type;
        this.config = MOB_CONFIG[type];
        this.position = new THREE.Vector3(x, y, z);
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.health = this.config.health;
        this.alive = true;
        this.onGround = false;

        // AI state
        this.aiTimer = 0;
        this.aiTarget = null;
        this.wanderDir = new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize();
        this.wanderTimer = 0;
        this.attackCooldown = 0;

        // Create mesh
        this.mesh = this.createMesh();
        this.mesh.position.copy(this.position);
    }

    createMesh() {
        const group = new THREE.Group();

        // Body
        const bodyGeo = new THREE.BoxGeometry(this.config.width, this.config.height * 0.5, this.config.width * 1.2);
        const bodyMat = new THREE.MeshLambertMaterial({ color: this.config.color });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = this.config.height * 0.4;
        body.castShadow = true;
        group.add(body);

        // Head
        const headSize = this.config.width * 0.6;
        const headGeo = new THREE.BoxGeometry(headSize, headSize, headSize);

        let headColor = this.config.color;
        if (this.type === MOB_TYPES.ZOMBIE) headColor = 0x5a8a4a;
        else if (this.type === MOB_TYPES.SKELETON) headColor = 0xd8d8d8;

        const headMat = new THREE.MeshLambertMaterial({ color: headColor });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = this.config.height * 0.75;
        head.position.z = -this.config.width * 0.3;
        head.castShadow = true;
        group.add(head);

        // Eyes
        const eyeGeo = new THREE.BoxGeometry(0.1, 0.1, 0.05);
        const eyeColor = this.config.hostile ? 0xff0000 : 0x222222;
        const eyeMat = new THREE.MeshBasicMaterial({ color: eyeColor });

        const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-0.12, this.config.height * 0.78, -this.config.width * 0.6);
        group.add(leftEye);

        const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightEye.position.set(0.12, this.config.height * 0.78, -this.config.width * 0.6);
        group.add(rightEye);

        // Legs (4 for passive, 2 for hostile)
        const legGeo = new THREE.BoxGeometry(0.2, this.config.height * 0.3, 0.2);
        const legMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(this.config.color).multiplyScalar(0.7) });

        if (!this.config.hostile) {
            // 4 legs
            const positions = [
                [-0.2, 0.15, -0.3], [0.2, 0.15, -0.3],
                [-0.2, 0.15, 0.3], [0.2, 0.15, 0.3]
            ];
            for (const [lx, ly, lz] of positions) {
                const leg = new THREE.Mesh(legGeo, legMat);
                leg.position.set(lx, ly, lz);
                leg.castShadow = true;
                group.add(leg);
            }
        } else {
            // 2 legs
            const leftLeg = new THREE.Mesh(legGeo, legMat);
            leftLeg.position.set(-0.15, 0.15, 0);
            group.add(leftLeg);
            const rightLeg = new THREE.Mesh(legGeo, legMat);
            rightLeg.position.set(0.15, 0.15, 0);
            group.add(rightLeg);
        }

        return group;
    }

    update(dt, world, playerPos) {
        if (!this.alive) return;

        dt = Math.min(dt, 0.05);

        // Gravity
        this.velocity.y -= 20 * dt;

        // AI behavior
        this.aiTimer += dt;
        this.attackCooldown = Math.max(0, this.attackCooldown - dt);

        if (this.config.hostile) {
            this.hostileAI(dt, playerPos);
        } else {
            this.passiveAI(dt);
        }

        // Apply velocity
        this.position.x += this.velocity.x * dt;
        this.position.z += this.velocity.z * dt;

        // Y collision
        this.position.y += this.velocity.y * dt;
        const feetBlock = world.getBlock(
            Math.floor(this.position.x),
            Math.floor(this.position.y),
            Math.floor(this.position.z)
        );
        if (isBlockSolid(feetBlock)) {
            this.position.y = Math.floor(this.position.y) + 1;
            this.velocity.y = 0;
            this.onGround = true;
        } else {
            this.onGround = false;
        }

        // Check if needs to jump (block in front)
        const frontBlock = world.getBlock(
            Math.floor(this.position.x + this.wanderDir.x * 0.5),
            Math.floor(this.position.y),
            Math.floor(this.position.z + this.wanderDir.z * 0.5)
        );
        if (isBlockSolid(frontBlock) && this.onGround) {
            this.velocity.y = 7;
        }

        // Keep above ground
        if (this.position.y < 0) {
            this.alive = false;
        }

        // Update mesh position
        this.mesh.position.copy(this.position);

        // Face movement direction
        if (this.velocity.x !== 0 || this.velocity.z !== 0) {
            this.mesh.rotation.y = Math.atan2(this.velocity.x, this.velocity.z);
        }
    }

    passiveAI(dt) {
        this.wanderTimer += dt;
        if (this.wanderTimer > 3 + Math.random() * 4) {
            this.wanderTimer = 0;
            this.wanderDir.set(Math.random() - 0.5, 0, Math.random() - 0.5).normalize();
            // Sometimes stop moving
            if (Math.random() < 0.3) {
                this.velocity.x = 0;
                this.velocity.z = 0;
                return;
            }
        }
        this.velocity.x = this.wanderDir.x * this.config.speed;
        this.velocity.z = this.wanderDir.z * this.config.speed;
    }

    hostileAI(dt, playerPos) {
        const dist = this.position.distanceTo(playerPos);

        if (dist < 16) {
            // Chase player
            const dir = new THREE.Vector3(
                playerPos.x - this.position.x,
                0,
                playerPos.z - this.position.z
            ).normalize();

            this.wanderDir.copy(dir);
            this.velocity.x = dir.x * this.config.speed;
            this.velocity.z = dir.z * this.config.speed;
        } else {
            // Wander
            this.passiveAI(dt);
        }
    }

    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0) {
            this.alive = false;
        }
        // Knockback
        this.velocity.y = 4;
    }

    canAttack(playerPos) {
        if (!this.config.hostile || this.attackCooldown > 0) return false;
        const dist = this.position.distanceTo(playerPos);
        return dist < 2;
    }

    attack() {
        this.attackCooldown = 1.5;
        return this.config.damage || 0;
    }
}

export class MobManager {
    constructor(scene, world) {
        this.scene = scene;
        this.world = world;
        this.mobs = [];
        this.maxMobs = 30;
        this.spawnTimer = 0;
        this.spawnRate = 5; // seconds between spawn attempts
    }

    update(dt, playerPos, isNight) {
        this.spawnTimer += dt;

        // Spawn mobs periodically
        if (this.spawnTimer > this.spawnRate && this.mobs.length < this.maxMobs) {
            this.spawnTimer = 0;
            this.trySpawn(playerPos, isNight);
        }

        // Update all mobs
        for (const mob of this.mobs) {
            mob.update(dt, this.world, playerPos);

            // Attack player if close
            if (mob.canAttack(playerPos)) {
                const damage = mob.attack();
                if (damage > 0) {
                    return { type: 'damage', amount: damage };
                }
            }
        }

        // Remove dead mobs
        this.mobs = this.mobs.filter(mob => {
            if (!mob.alive) {
                this.scene.remove(mob.mesh);
                return false;
            }
            return true;
        });

        // Despawn far mobs
        this.mobs = this.mobs.filter(mob => {
            const dist = mob.position.distanceTo(playerPos);
            if (dist > 100) {
                this.scene.remove(mob.mesh);
                return false;
            }
            return true;
        });

        return null;
    }

    trySpawn(playerPos, isNight) {
        // Random direction from player
        const angle = Math.random() * Math.PI * 2;
        const dist = 20 + Math.random() * 30;
        const sx = playerPos.x + Math.cos(angle) * dist;
        const sz = playerPos.z + Math.sin(angle) * dist;
        const sy = this.world.getSpawnHeight(sx, sz);

        if (sy <= 0 || sy > 120) return;

        // Check block is appropriate for spawning
        const groundBlock = this.world.getBlock(Math.floor(sx), sy - 1, Math.floor(sz));
        if (!isBlockSolid(groundBlock)) return;

        let type;
        if (isNight) {
            // Hostile at night
            const roll = Math.random();
            if (roll < 0.4) type = MOB_TYPES.ZOMBIE;
            else if (roll < 0.7) type = MOB_TYPES.SKELETON;
            else if (roll < 0.85) type = MOB_TYPES.CREEPER;
            else type = Math.random() < 0.5 ? MOB_TYPES.PIG : MOB_TYPES.COW;
        } else {
            // Passive during day
            type = Math.random() < 0.5 ? MOB_TYPES.PIG : MOB_TYPES.COW;
        }

        const mob = new Mob(type, sx, sy, sz);
        this.mobs.push(mob);
        this.scene.add(mob.mesh);
    }

    // Handle player attacking a mob
    attackMob(playerPos, direction) {
        const ray = new THREE.Raycaster(playerPos, direction, 0, 4);

        for (const mob of this.mobs) {
            const dist = mob.position.distanceTo(playerPos);
            if (dist < 4) {
                // Simple distance/direction check
                const toMob = new THREE.Vector3().subVectors(mob.position, playerPos).normalize();
                const dot = direction.dot(toMob);
                if (dot > 0.5) {
                    mob.takeDamage(3);
                    return true;
                }
            }
        }
        return false;
    }
}
