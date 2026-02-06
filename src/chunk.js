// Chunk system — generates terrain data and builds optimized meshes
// FIX: Smoother biomes with lower-frequency noise, cleaner terrain, no phantom blocks

import * as THREE from 'three';
import { BlockType, isBlockSolid, isBlockTransparent } from './blocks.js';
import { getUVsForFace, ATLAS_TILES } from './textures.js';

export const CHUNK_SIZE = 16;
export const CHUNK_HEIGHT = 128;

export class Chunk {
    constructor(cx, cz, world) {
        this.cx = cx;
        this.cz = cz;
        this.world = world;
        this.blocks = new Uint8Array(CHUNK_SIZE * CHUNK_HEIGHT * CHUNK_SIZE);
        this.mesh = null;
        this.waterMesh = null;
        this.generated = false;
        this.dirty = true;
    }

    getIndex(x, y, z) {
        return y * CHUNK_SIZE * CHUNK_SIZE + z * CHUNK_SIZE + x;
    }

    generate(noise) {
        const SEA_LEVEL = 62;
        const wx0 = this.cx * CHUNK_SIZE;
        const wz0 = this.cz * CHUNK_SIZE;

        for (let lx = 0; lx < CHUNK_SIZE; lx++) {
            for (let lz = 0; lz < CHUNK_SIZE; lz++) {
                const wx = wx0 + lx;
                const wz = wz0 + lz;

                // ===== BIOME DETERMINATION (SMOOTHER — lower frequency) =====
                // Use very low frequency for biome transitions so they're gradual
                const temp = noise.fbm2D(wx * 0.001 + 1000, wz * 0.001 + 1000, 3, 2.0, 0.5);
                const moist = noise.fbm2D(wx * 0.001 + 5000, wz * 0.001 + 5000, 3, 2.0, 0.5);

                // Determine biome
                let biome = 'plains';
                if (temp > 0.3 && moist < -0.1) biome = 'desert';
                else if (temp < -0.3) biome = 'snowy';
                else if (moist > 0.3) biome = 'forest';
                else if (temp > 0.1 && moist > -0.1) biome = 'savanna';

                // ===== TERRAIN HEIGHT =====
                // Base continental noise (very smooth, large features)
                const continentalness = noise.fbm2D(wx * 0.002, wz * 0.002, 4, 2.0, 0.5);
                // Erosion noise (medium detail)
                const erosion = noise.fbm2D(wx * 0.008 + 200, wz * 0.008 + 200, 4, 2.0, 0.45);
                // Detail noise (fine terrain features)
                const detail = noise.fbm2D(wx * 0.03 + 500, wz * 0.03 + 500, 3, 2.0, 0.4);

                let height = 64 + continentalness * 24 + erosion * 10 + detail * 4;

                // Biome-specific height modifications
                if (biome === 'desert') {
                    height = 64 + continentalness * 8 + erosion * 3 + detail * 2;
                } else if (biome === 'snowy') {
                    height = 66 + continentalness * 20 + erosion * 12 + detail * 3;
                } else if (biome === 'forest') {
                    height = 65 + continentalness * 18 + erosion * 8 + detail * 4;
                }

                height = Math.floor(Math.max(1, Math.min(CHUNK_HEIGHT - 10, height)));

                // ===== FILL BLOCKS =====
                for (let y = 0; y < CHUNK_HEIGHT; y++) {
                    const idx = this.getIndex(lx, y, lz);
                    let block = BlockType.AIR;

                    if (y === 0) {
                        block = BlockType.BEDROCK;
                    } else if (y < height - 4) {
                        block = BlockType.STONE;

                        // Ore generation
                        if (y > 5 && y < 50) {
                            const oreNoise = noise.noise3D(wx * 0.08, y * 0.08, wz * 0.08);
                            if (oreNoise > 0.65) {
                                if (y < 16) block = BlockType.DIAMOND_ORE;
                                else if (y < 30) block = BlockType.GOLD_ORE;
                                else block = BlockType.IRON_ORE;
                            } else if (oreNoise > 0.55) {
                                block = BlockType.COAL_ORE;
                            }
                        }
                    } else if (y < height) {
                        // Surface layers
                        if (biome === 'desert') {
                            block = BlockType.SAND;
                        } else if (biome === 'snowy') {
                            block = y === height - 1 ? BlockType.SNOW : BlockType.DIRT;
                        } else {
                            block = BlockType.DIRT;
                        }
                    } else if (y === height) {
                        // Top block
                        if (biome === 'desert') {
                            block = BlockType.SAND;
                        } else if (biome === 'snowy') {
                            block = BlockType.SNOW;
                        } else {
                            block = BlockType.GRASS;
                        }
                    } else if (y <= SEA_LEVEL && y > height) {
                        // Water
                        block = BlockType.WATER;
                    }

                    // Cave generation (3D noise)
                    if (y > 2 && y < height - 2 && block !== BlockType.BEDROCK) {
                        const caveNoise = noise.noise3D(wx * 0.04, y * 0.04, wz * 0.04);
                        const caveNoise2 = noise.noise3D(wx * 0.06 + 100, y * 0.06, wz * 0.06 + 100);
                        if (caveNoise > 0.5 && caveNoise2 > 0.4) {
                            block = BlockType.AIR;
                        }
                    }

                    this.blocks[idx] = block;
                }

                // ===== DECORATIONS (trees, flowers, etc.) =====
                if (height > SEA_LEVEL) {
                    const decNoise = noise.noise2D(wx * 0.5, wz * 0.5);

                    // Trees
                    if (biome !== 'desert' && biome !== 'snowy') {
                        const treeChance = biome === 'forest' ? 0.7 : 0.85;
                        if (decNoise > treeChance) {
                            this.generateTree(lx, height + 1, lz);
                        }
                    }

                    // Cactus in desert
                    if (biome === 'desert' && decNoise > 0.88) {
                        const cactusH = 2 + Math.floor(Math.abs(decNoise) * 3);
                        for (let cy = 1; cy <= cactusH; cy++) {
                            if (height + cy < CHUNK_HEIGHT) {
                                this.blocks[this.getIndex(lx, height + cy, lz)] = BlockType.CACTUS;
                            }
                        }
                    }

                    // Flowers and tall grass
                    if (biome === 'plains' || biome === 'forest' || biome === 'savanna') {
                        const grassNoise = noise.noise2D(wx * 2.0, wz * 2.0);
                        if (grassNoise > 0.2 && grassNoise < 0.4 && decNoise <= (biome === 'forest' ? 0.7 : 0.85)) {
                            // Don't place if there's already a tree
                            if (this.blocks[this.getIndex(lx, height + 1, lz)] === BlockType.AIR) {
                                if (grassNoise > 0.35) {
                                    this.blocks[this.getIndex(lx, height + 1, lz)] = BlockType.FLOWER_RED;
                                } else if (grassNoise > 0.3) {
                                    this.blocks[this.getIndex(lx, height + 1, lz)] = BlockType.FLOWER_YELLOW;
                                }
                            }
                        }
                    }
                }
            }
        }

        this.generated = true;
        this.dirty = true;
    }

    generateTree(lx, baseY, lz) {
        const trunkHeight = 4 + Math.floor(Math.random() * 3);

        // Trunk
        for (let ty = 0; ty < trunkHeight; ty++) {
            if (baseY + ty < CHUNK_HEIGHT && lx >= 0 && lx < CHUNK_SIZE && lz >= 0 && lz < CHUNK_SIZE) {
                this.blocks[this.getIndex(lx, baseY + ty, lz)] = BlockType.WOOD;
            }
        }

        // Leaves (sphere-ish shape around top)
        const leafStart = trunkHeight - 2;
        const leafEnd = trunkHeight + 1;
        for (let dy = leafStart; dy <= leafEnd; dy++) {
            const radius = dy === leafEnd ? 1 : (dy >= trunkHeight ? 2 : 2);
            for (let dx = -radius; dx <= radius; dx++) {
                for (let dz = -radius; dz <= radius; dz++) {
                    if (dx === 0 && dz === 0 && dy < trunkHeight) continue; // Trunk position
                    const nx = lx + dx;
                    const nz = lz + dz;
                    const ny = baseY + dy;
                    if (nx >= 0 && nx < CHUNK_SIZE && nz >= 0 && nz < CHUNK_SIZE && ny < CHUNK_HEIGHT) {
                        if (Math.abs(dx) + Math.abs(dz) <= radius + 1) {
                            if (this.blocks[this.getIndex(nx, ny, nz)] === BlockType.AIR) {
                                this.blocks[this.getIndex(nx, ny, nz)] = BlockType.LEAVES;
                            }
                        }
                    }
                }
            }
        }
    }

    buildMesh(material, waterMaterial) {
        const positions = [];
        const normals = [];
        const uvs = [];
        const indices = [];

        const waterPositions = [];
        const waterNormals = [];
        const waterUVs = [];
        const waterIndices = [];

        const wx0 = this.cx * CHUNK_SIZE;
        const wz0 = this.cz * CHUNK_SIZE;

        for (let lx = 0; lx < CHUNK_SIZE; lx++) {
            for (let ly = 0; ly < CHUNK_HEIGHT; ly++) {
                for (let lz = 0; lz < CHUNK_SIZE; lz++) {
                    const block = this.blocks[this.getIndex(lx, ly, lz)];
                    if (block === BlockType.AIR) continue;

                    const isWater = block === BlockType.WATER;
                    const p = isWater ? waterPositions : positions;
                    const n = isWater ? waterNormals : normals;
                    const u = isWater ? waterUVs : uvs;
                    const idx = isWater ? waterIndices : indices;

                    const wx = wx0 + lx;
                    const wz = wz0 + lz;

                    // Check each face
                    const faces = [
                        { dir: [0, 1, 0], face: 0 },  // top
                        { dir: [0, -1, 0], face: 1 }, // bottom
                        { dir: [0, 0, -1], face: 2 }, // front (north)
                        { dir: [0, 0, 1], face: 3 },  // back (south)
                        { dir: [1, 0, 0], face: 4 },  // right (east)
                        { dir: [-1, 0, 0], face: 5 }, // left (west)
                    ];

                    for (const { dir, face } of faces) {
                        const nx = lx + dir[0];
                        const ny = ly + dir[1];
                        const nz = lz + dir[2];

                        let neighbor;
                        if (nx >= 0 && nx < CHUNK_SIZE && ny >= 0 && ny < CHUNK_HEIGHT && nz >= 0 && nz < CHUNK_SIZE) {
                            neighbor = this.blocks[this.getIndex(nx, ny, nz)];
                        } else if (ny < 0 || ny >= CHUNK_HEIGHT) {
                            neighbor = BlockType.AIR;
                        } else {
                            // Cross-chunk: get neighbor block from world
                            neighbor = this.world.getBlock(wx + dir[0], ly + dir[1], wz + dir[2]);
                        }

                        // Skip face if neighbor is same type or opaque
                        if (isWater) {
                            if (neighbor === BlockType.WATER) continue;
                        } else {
                            if (isBlockSolid(neighbor) && !isBlockTransparent(neighbor)) continue;
                            if (neighbor === block && isBlockTransparent(block)) continue;
                        }

                        // Add face — use WORLD coordinates so chunks render at correct position
                        const vi = p.length / 3;
                        const faceUVs = getUVsForFace(block, face);
                        const faceVerts = getFaceVertices(wx0 + lx, ly, wz0 + lz, face);

                        for (let i = 0; i < 4; i++) {
                            p.push(faceVerts[i * 3], faceVerts[i * 3 + 1], faceVerts[i * 3 + 2]);
                            n.push(dir[0], dir[1], dir[2]);
                        }
                        u.push(
                            faceUVs[0], faceUVs[1],
                            faceUVs[2], faceUVs[3],
                            faceUVs[4], faceUVs[5],
                            faceUVs[6], faceUVs[7]
                        );
                        idx.push(vi, vi + 1, vi + 2, vi, vi + 2, vi + 3);
                    }
                }
            }
        }

        // Remove old meshes
        if (this.mesh) {
            this.mesh.parent?.remove(this.mesh);
            this.mesh.geometry.dispose();
            this.mesh = null;
        }
        if (this.waterMesh) {
            this.waterMesh.parent?.remove(this.waterMesh);
            this.waterMesh.geometry.dispose();
            this.waterMesh = null;
        }

        // Build solid mesh
        if (positions.length > 0) {
            const geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
            geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
            geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
            geo.setIndex(indices);
            this.mesh = new THREE.Mesh(geo, material);
            this.mesh.frustumCulled = true;
        }

        // Build water mesh
        if (waterPositions.length > 0) {
            const geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.Float32BufferAttribute(waterPositions, 3));
            geo.setAttribute('normal', new THREE.Float32BufferAttribute(waterNormals, 3));
            geo.setAttribute('uv', new THREE.Float32BufferAttribute(waterUVs, 2));
            geo.setIndex(waterIndices);
            this.waterMesh = new THREE.Mesh(geo, waterMaterial);
        }

        this.dirty = false;
    }

    dispose() {
        if (this.mesh) {
            this.mesh.parent?.remove(this.mesh);
            this.mesh.geometry.dispose();
            this.mesh = null;
        }
        if (this.waterMesh) {
            this.waterMesh.parent?.remove(this.waterMesh);
            this.waterMesh.geometry.dispose();
            this.waterMesh = null;
        }
    }
}

function getFaceVertices(x, y, z, face) {
    switch (face) {
        case 0: // top (+Y)
            return [x, y + 1, z, x + 1, y + 1, z, x + 1, y + 1, z + 1, x, y + 1, z + 1];
        case 1: // bottom (-Y)
            return [x, y, z + 1, x + 1, y, z + 1, x + 1, y, z, x, y, z];
        case 2: // front (-Z)
            return [x, y, z, x + 1, y, z, x + 1, y + 1, z, x, y + 1, z];
        case 3: // back (+Z)
            return [x + 1, y, z + 1, x, y, z + 1, x, y + 1, z + 1, x + 1, y + 1, z + 1];
        case 4: // right (+X)
            return [x + 1, y, z, x + 1, y, z + 1, x + 1, y + 1, z + 1, x + 1, y + 1, z];
        case 5: // left (-X)
            return [x, y, z + 1, x, y, z, x, y + 1, z, x, y + 1, z + 1];
        default:
            return [x, y, z, x + 1, y, z, x + 1, y + 1, z, x, y + 1, z];
    }
}
