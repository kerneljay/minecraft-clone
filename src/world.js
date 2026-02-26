// World manager — loads/unloads chunks around the player

import * as THREE from 'three';
import { Chunk, CHUNK_SIZE, CHUNK_HEIGHT } from './chunk.js';
import { SimplexNoise } from './noise.js';
import { BlockType, isBlockSolid } from './blocks.js';

export class World {
    constructor(scene, material, waterMaterial, seed = 12345) {
        this.scene = scene;
        this.material = material;
        this.waterMaterial = waterMaterial;
        this.chunks = new Map();
        this.noise = new SimplexNoise(seed);
        this.renderDistance = 6;
        this.seed = seed;
        this.performanceProfile = 'normal';
        this.workBudget = {
            generate: 6,
            decorate: 6,
            build: 4,
            unload: 12,
            unloadEvery: 4,
        };
        this.updateTick = 0;
    }

    setPerformanceProfile(profile = 'normal') {
        if (profile === this.performanceProfile) return;
        this.performanceProfile = profile;

        if (profile === 'low') {
            this.workBudget = {
                generate: 2,
                decorate: 2,
                build: 2,
                unload: 8,
                unloadEvery: 8,
            };
        } else if (profile === 'high') {
            this.workBudget = {
                generate: 8,
                decorate: 8,
                build: 6,
                unload: 24,
                unloadEvery: 2,
            };
        } else {
            this.workBudget = {
                generate: 6,
                decorate: 6,
                build: 4,
                unload: 12,
                unloadEvery: 4,
            };
        }
    }

    getChunkKey(cx, cz) {
        return `${cx},${cz}`;
    }

    getChunk(cx, cz) {
        return this.chunks.get(this.getChunkKey(cx, cz));
    }

    getBlock(wx, wy, wz) {
        if (wy < 0 || wy >= CHUNK_HEIGHT) return BlockType.AIR;
        const cx = Math.floor(wx / CHUNK_SIZE);
        const cz = Math.floor(wz / CHUNK_SIZE);
        const chunk = this.getChunk(cx, cz);
        if (!chunk || !chunk.generated) return BlockType.STONE;
        const lx = ((wx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
        const lz = ((wz % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
        return chunk.blocks[chunk.getIndex(lx, wy, lz)];
    }

    setBlock(wx, wy, wz, type) {
        if (wy < 0 || wy >= CHUNK_HEIGHT) return;
        const cx = Math.floor(wx / CHUNK_SIZE);
        const cz = Math.floor(wz / CHUNK_SIZE);
        const chunk = this.getChunk(cx, cz);
        if (!chunk) return;
        const lx = ((wx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
        const lz = ((wz % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
        chunk.blocks[chunk.getIndex(lx, wy, lz)] = type;
        chunk.dirty = true;

        // Mark neighboring chunks dirty if at edge
        if (lx === 0) { const nc = this.getChunk(cx - 1, cz); if (nc) nc.dirty = true; }
        if (lx === CHUNK_SIZE - 1) { const nc = this.getChunk(cx + 1, cz); if (nc) nc.dirty = true; }
        if (lz === 0) { const nc = this.getChunk(cx, cz - 1); if (nc) nc.dirty = true; }
        if (lz === CHUNK_SIZE - 1) { const nc = this.getChunk(cx, cz + 1); if (nc) nc.dirty = true; }
    }

    // Accept either (Vector3) or (Vector3, forceAll)
    update(playerPos, forceAll = false) {
        const px = typeof playerPos === 'object' ? playerPos.x : playerPos;
        const pz = typeof playerPos === 'object' ? playerPos.z : arguments[1] || 0;
        this.updateTick++;

        const pcx = Math.floor(px / CHUNK_SIZE);
        const pcz = Math.floor(pz / CHUNK_SIZE);
        const rd = this.renderDistance;
        const budget = this.workBudget;

        // Build a spiral-ordered list of offsets (nearest chunks first)
        if (!this._spiralOffsets || this._spiralRd !== rd) {
            this._spiralOffsets = [];
            for (let dx = -rd; dx <= rd; dx++) {
                for (let dz = -rd; dz <= rd; dz++) {
                    if (dx * dx + dz * dz <= rd * rd) {
                        this._spiralOffsets.push([dx, dz]);
                    }
                }
            }
            this._spiralOffsets.sort((a, b) => (a[0] * a[0] + a[1] * a[1]) - (b[0] * b[0] + b[1] * b[1]));
            this._spiralRd = rd;
        }

        // Pass 1: Generate terrain for new chunks (limit per frame for smoothness)
        let generated = 0;
        const maxGenerate = forceAll ? 999 : budget.generate;
        for (const [dx, dz] of this._spiralOffsets) {
            const cx = pcx + dx;
            const cz = pcz + dz;
            const key = this.getChunkKey(cx, cz);

            if (!this.chunks.has(key)) {
                if (generated >= maxGenerate) break;
                const chunk = new Chunk(cx, cz, this);
                this.chunks.set(key, chunk);
                chunk.generate(this.noise);
                generated++;
            }
        }

        // Pass 2: Decorate chunks whose 4 neighbors all have terrain (so cross-chunk trees work)
        let decorated = 0;
        const maxDecorate = forceAll ? 999 : budget.decorate;
        for (const [key, chunk] of this.chunks) {
            if (chunk.decorated || !chunk.generated) continue;
            if (decorated >= maxDecorate) break;
            const n1 = this.getChunk(chunk.cx - 1, chunk.cz);
            const n2 = this.getChunk(chunk.cx + 1, chunk.cz);
            const n3 = this.getChunk(chunk.cx, chunk.cz - 1);
            const n4 = this.getChunk(chunk.cx, chunk.cz + 1);
            if (n1 && n1.generated && n2 && n2.generated && n3 && n3.generated && n4 && n4.generated) {
                chunk.decorate(this.noise);
                decorated++;
            }
        }

        // Build/rebuild dirty meshes (limit per frame unless forced)
        let built = 0;
        const maxBuild = forceAll ? 200 : budget.build;
        for (const [key, chunk] of this.chunks) {
            if (!chunk.dirty || !chunk.generated) continue;
            chunk.buildMesh(this.material, this.waterMaterial);
            if (chunk.mesh) this.scene.add(chunk.mesh);
            if (chunk.waterMesh) this.scene.add(chunk.waterMesh);
            built++;
            if (built >= maxBuild) break;
        }

        // Unload distant chunks
        const shouldUnload = forceAll || (this.updateTick % budget.unloadEvery === 0);
        if (shouldUnload) {
            let unloaded = 0;
            const maxUnload = forceAll ? Number.POSITIVE_INFINITY : budget.unload;
            for (const [key, chunk] of this.chunks) {
                const dx = chunk.cx - pcx;
                const dz = chunk.cz - pcz;
                if (dx * dx + dz * dz > (rd + 2) * (rd + 2)) {
                    chunk.dispose();
                    this.chunks.delete(key);
                    unloaded++;
                    if (unloaded >= maxUnload) break;
                }
            }
        }
    }

    // Raycasting for block interaction
    raycast(origin, direction, maxDist = 6) {
        const step = 0.05;
        const pos = origin.clone();
        const dir = direction.clone().normalize().multiplyScalar(step);
        let prevBlock = null;

        for (let d = 0; d < maxDist; d += step) {
            pos.add(dir);
            const bx = Math.floor(pos.x);
            const by = Math.floor(pos.y);
            const bz = Math.floor(pos.z);

            const block = this.getBlock(bx, by, bz);
            if (block !== BlockType.AIR && block !== BlockType.WATER) {
                return {
                    block,
                    position: { x: bx, y: by, z: bz },
                    normal: prevBlock ? {
                        x: prevBlock.x - bx,
                        y: prevBlock.y - by,
                        z: prevBlock.z - bz
                    } : { x: 0, y: 1, z: 0 }
                };
            }
            prevBlock = { x: bx, y: by, z: bz };
        }
        return null;
    }

    getSpawnHeight(x, z) {
        const cx = Math.floor(x / CHUNK_SIZE);
        const cz = Math.floor(z / CHUNK_SIZE);
        const chunk = this.getChunk(cx, cz);
        if (!chunk) return 80;
        const lx = ((Math.floor(x) % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
        const lz = ((Math.floor(z) % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
        for (let y = CHUNK_HEIGHT - 1; y > 0; y--) {
            const block = chunk.blocks[chunk.getIndex(lx, y, lz)];
            if (isBlockSolid(block)) return y + 1;
        }
        return 80;
    }
}
