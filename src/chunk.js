// Chunk system — generates terrain data and builds optimized meshes

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
        this.dirty = true;
        this.generated = false;
    }

    getIndex(x, y, z) {
        return y * CHUNK_SIZE * CHUNK_SIZE + z * CHUNK_SIZE + x;
    }

    getBlock(x, y, z) {
        if (x < 0 || x >= CHUNK_SIZE || y < 0 || y >= CHUNK_HEIGHT || z < 0 || z >= CHUNK_SIZE) {
            // Ask world for cross-chunk blocks
            const wx = this.cx * CHUNK_SIZE + x;
            const wz = this.cz * CHUNK_SIZE + z;
            return this.world.getBlock(wx, y, wz);
        }
        return this.blocks[this.getIndex(x, y, z)];
    }

    setBlock(x, y, z, type) {
        if (x < 0 || x >= CHUNK_SIZE || y < 0 || y >= CHUNK_HEIGHT || z < 0 || z >= CHUNK_SIZE) return;
        this.blocks[this.getIndex(x, y, z)] = type;
        this.dirty = true;
    }

    generate(noise) {
        const worldX = this.cx * CHUNK_SIZE;
        const worldZ = this.cz * CHUNK_SIZE;

        for (let x = 0; x < CHUNK_SIZE; x++) {
            for (let z = 0; z < CHUNK_SIZE; z++) {
                const wx = worldX + x;
                const wz = worldZ + z;

                // Multi-octave terrain height
                const baseHeight = noise.fbm2D(wx * 0.005, wz * 0.005, 6, 2.0, 0.5);
                const detailNoise = noise.fbm2D(wx * 0.02, wz * 0.02, 4, 2.0, 0.5);
                const mountainNoise = noise.fbm2D(wx * 0.002, wz * 0.002, 3, 2.0, 0.5);

                // Biome determination
                const temperature = noise.fbm2D(wx * 0.003 + 1000, wz * 0.003 + 1000, 3);
                const moisture = noise.fbm2D(wx * 0.003 + 5000, wz * 0.003 + 5000, 3);

                // Height calculation (surface at ~64)
                let height = 58 + Math.floor(baseHeight * 20 + detailNoise * 8);

                // Mountains
                if (mountainNoise > 0.3) {
                    height += Math.floor((mountainNoise - 0.3) * 60);
                }

                // Flatten for ocean
                const waterLevel = 62;
                const isDesert = temperature > 0.3 && moisture < -0.1;
                const isSnowy = temperature < -0.3;

                for (let y = 0; y < CHUNK_HEIGHT; y++) {
                    const idx = this.getIndex(x, y, z);

                    if (y === 0) {
                        this.blocks[idx] = BlockType.BEDROCK;
                    } else if (y < height - 4) {
                        // Deep underground
                        const caveNoise = noise.noise3D(wx * 0.05, y * 0.05, wz * 0.05);
                        const caveNoise2 = noise.noise3D(wx * 0.08, y * 0.08, wz * 0.08);

                        if (caveNoise > 0.4 && caveNoise2 > 0.2 && y > 5) {
                            this.blocks[idx] = BlockType.AIR; // Cave
                        } else {
                            this.blocks[idx] = BlockType.STONE;

                            // Ore generation
                            if (y < 16) {
                                const oreNoise = noise.noise3D(wx * 0.15, y * 0.15, wz * 0.15);
                                if (oreNoise > 0.75) this.blocks[idx] = BlockType.DIAMOND_ORE;
                                else if (oreNoise > 0.6) this.blocks[idx] = BlockType.GOLD_ORE;
                            } else if (y < 40) {
                                const oreNoise = noise.noise3D(wx * 0.12 + 100, y * 0.12, wz * 0.12 + 100);
                                if (oreNoise > 0.65) this.blocks[idx] = BlockType.IRON_ORE;
                                else if (oreNoise > 0.55) this.blocks[idx] = BlockType.COAL_ORE;
                            } else if (y < 64) {
                                const oreNoise = noise.noise3D(wx * 0.1 + 200, y * 0.1, wz * 0.1 + 200);
                                if (oreNoise > 0.7) this.blocks[idx] = BlockType.COAL_ORE;
                            }

                            // Gravel pockets
                            if (noise.noise3D(wx * 0.08 + 500, y * 0.08, wz * 0.08 + 500) > 0.7) {
                                this.blocks[idx] = BlockType.GRAVEL;
                            }
                        }
                    } else if (y < height) {
                        // Sub-surface layer
                        if (isDesert) {
                            this.blocks[idx] = BlockType.SAND;
                        } else {
                            this.blocks[idx] = BlockType.DIRT;
                        }
                    } else if (y === height) {
                        // Surface block
                        if (height < waterLevel - 1) {
                            this.blocks[idx] = BlockType.SAND; // Underwater = sand
                        } else if (isDesert) {
                            this.blocks[idx] = BlockType.SAND;
                        } else if (isSnowy) {
                            this.blocks[idx] = BlockType.SNOW;
                        } else {
                            this.blocks[idx] = BlockType.GRASS;
                        }
                    } else if (y <= waterLevel && y > height) {
                        this.blocks[idx] = BlockType.WATER;
                    } else {
                        this.blocks[idx] = BlockType.AIR;
                    }
                }

                // Tree generation
                if (height > waterLevel && !isDesert && Math.abs(noise.noise2D(wx * 0.5, wz * 0.5)) > 0.7) {
                    if (x >= 2 && x < CHUNK_SIZE - 2 && z >= 2 && z < CHUNK_SIZE - 2) {
                        const treeHeight = 5 + Math.floor(Math.abs(noise.noise2D(wx * 3, wz * 3)) * 2);
                        // Trunk
                        for (let ty = 1; ty <= treeHeight; ty++) {
                            if (height + ty < CHUNK_HEIGHT) {
                                this.blocks[this.getIndex(x, height + ty, z)] = BlockType.WOOD;
                            }
                        }
                        // Leaves
                        for (let lx = -2; lx <= 2; lx++) {
                            for (let lz = -2; lz <= 2; lz++) {
                                for (let ly = treeHeight - 2; ly <= treeHeight + 1; ly++) {
                                    const lxA = x + lx, lzA = z + lz, lyA = height + ly;
                                    if (lxA >= 0 && lxA < CHUNK_SIZE && lzA >= 0 && lzA < CHUNK_SIZE && lyA < CHUNK_HEIGHT) {
                                        if (Math.abs(lx) + Math.abs(lz) < 4 && !(lx === 0 && lz === 0 && ly <= treeHeight)) {
                                            if (this.blocks[this.getIndex(lxA, lyA, lzA)] === BlockType.AIR) {
                                                this.blocks[this.getIndex(lxA, lyA, lzA)] = BlockType.LEAVES;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                // Cactus in desert
                if (isDesert && height > waterLevel && Math.abs(noise.noise2D(wx * 0.8 + 300, wz * 0.8 + 300)) > 0.85) {
                    const cactusH = 2 + Math.floor(Math.abs(noise.noise2D(wx * 5 + 300, wz * 5 + 300)) * 2);
                    for (let cy = 1; cy <= cactusH; cy++) {
                        if (height + cy < CHUNK_HEIGHT) {
                            this.blocks[this.getIndex(x, height + cy, z)] = BlockType.CACTUS;
                        }
                    }
                }

                // Flowers and grass
                if (!isDesert && !isSnowy && height > waterLevel) {
                    const floraChance = noise.noise2D(wx * 1.5 + 700, wz * 1.5 + 700);
                    if (floraChance > 0.6) {
                        if (height + 1 < CHUNK_HEIGHT) {
                            this.blocks[this.getIndex(x, height + 1, z)] = BlockType.TALL_GRASS;
                        }
                    } else if (floraChance > 0.75) {
                        if (height + 1 < CHUNK_HEIGHT) {
                            this.blocks[this.getIndex(x, height + 1, z)] =
                                noise.noise2D(wx * 2, wz * 2) > 0 ? BlockType.FLOWER_RED : BlockType.FLOWER_YELLOW;
                        }
                    }
                }
            }
        }

        this.generated = true;
        this.dirty = true;
    }

    buildMesh(material, waterMaterial) {
        if (!this.dirty) return;

        const positions = [];
        const normals = [];
        const uvs = [];
        const indices = [];

        const waterPositions = [];
        const waterNormals = [];
        const waterUvs = [];
        const waterIndices = [];

        // Face definitions: direction offset, normal, vertex positions
        const faces = [
            { dir: [0, 1, 0], norm: [0, 1, 0], verts: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], faceIdx: 0 }, // top
            { dir: [0, -1, 0], norm: [0, -1, 0], verts: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], faceIdx: 1 }, // bottom
            { dir: [0, 0, 1], norm: [0, 0, 1], verts: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], faceIdx: 2 }, // south (front)
            { dir: [0, 0, -1], norm: [0, 0, -1], verts: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]], faceIdx: 3 }, // north (back)
            { dir: [-1, 0, 0], norm: [-1, 0, 0], verts: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]], faceIdx: 4 }, // west
            { dir: [1, 0, 0], norm: [1, 0, 0], verts: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]], faceIdx: 5 }  // east
        ];

        for (let y = 0; y < CHUNK_HEIGHT; y++) {
            for (let z = 0; z < CHUNK_SIZE; z++) {
                for (let x = 0; x < CHUNK_SIZE; x++) {
                    const block = this.blocks[this.getIndex(x, y, z)];
                    if (block === BlockType.AIR) continue;

                    const isWater = block === BlockType.WATER;

                    for (const face of faces) {
                        const nx = x + face.dir[0];
                        const ny = y + face.dir[1];
                        const nz = z + face.dir[2];

                        const neighbor = this.getBlock(nx, ny, nz);

                        // Only draw face if neighbor is transparent (and not same type for water)
                        const shouldDraw = isWater
                            ? (neighbor === BlockType.AIR || (isBlockTransparent(neighbor) && neighbor !== BlockType.WATER))
                            : (neighbor === BlockType.AIR || (isBlockTransparent(neighbor) && neighbor !== block));

                        if (!shouldDraw) continue;

                        // Get UV coordinates from texture atlas
                        const [u, v, s] = getUVsForFace(block, face.faceIdx);

                        // Slight UV inset to prevent bleeding
                        const eps = 0.001;

                        const targetPositions = isWater ? waterPositions : positions;
                        const targetNormals = isWater ? waterNormals : normals;
                        const targetUvs = isWater ? waterUvs : uvs;
                        const targetIndices = isWater ? waterIndices : indices;

                        const vertOffset = targetPositions.length / 3;

                        for (const vert of face.verts) {
                            targetPositions.push(x + vert[0], y + vert[1] * (isWater ? 0.9 : 1), z + vert[2]);
                            targetNormals.push(face.norm[0], face.norm[1], face.norm[2]);
                        }

                        // UV mapping
                        targetUvs.push(
                            u + eps, v + eps,
                            u + s - eps, v + eps,
                            u + s - eps, v + s - eps,
                            u + eps, v + s - eps
                        );

                        targetIndices.push(
                            vertOffset, vertOffset + 1, vertOffset + 2,
                            vertOffset, vertOffset + 2, vertOffset + 3
                        );
                    }
                }
            }
        }

        // Remove old meshes
        if (this.mesh) {
            this.mesh.geometry.dispose();
            this.mesh.parent?.remove(this.mesh);
        }
        if (this.waterMesh) {
            this.waterMesh.geometry.dispose();
            this.waterMesh.parent?.remove(this.waterMesh);
        }

        // Build solid mesh
        if (positions.length > 0) {
            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
            geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
            geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
            geometry.setIndex(indices);

            this.mesh = new THREE.Mesh(geometry, material);
            this.mesh.position.set(this.cx * CHUNK_SIZE, 0, this.cz * CHUNK_SIZE);
            this.mesh.castShadow = true;
            this.mesh.receiveShadow = true;
        }

        // Build water mesh
        if (waterPositions.length > 0) {
            const waterGeometry = new THREE.BufferGeometry();
            waterGeometry.setAttribute('position', new THREE.Float32BufferAttribute(waterPositions, 3));
            waterGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(waterNormals, 3));
            waterGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(waterUvs, 2));
            waterGeometry.setIndex(waterIndices);

            this.waterMesh = new THREE.Mesh(waterGeometry, waterMaterial);
            this.waterMesh.position.set(this.cx * CHUNK_SIZE, 0, this.cz * CHUNK_SIZE);
        }

        this.dirty = false;
    }

    dispose() {
        if (this.mesh) {
            this.mesh.geometry.dispose();
            this.mesh.parent?.remove(this.mesh);
            this.mesh = null;
        }
        if (this.waterMesh) {
            this.waterMesh.geometry.dispose();
            this.waterMesh.parent?.remove(this.waterMesh);
            this.waterMesh = null;
        }
    }
}
