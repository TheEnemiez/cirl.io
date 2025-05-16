// script.js - Main game logic
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    const startScreen = document.getElementById('start-screen');
    const gameContainer = document.getElementById('game-container');
    const playerNameInput = document.getElementById('playerNameInput');
    const numBotsInput = document.getElementById('numBotsInput');
    const botTypeSelect = document.getElementById('botTypeSelect'); // Get the new select element
    const startGameButton = document.getElementById('startGameButton');
    const restartGameButton = document.getElementById('restartGameButton');
    const gameOverMessage = document.getElementById('gameOverMessage');

    const playerNameDisplay = document.getElementById('playerNameDisplay');
    const playerMassDisplay = document.getElementById('playerMassDisplay');
    const playerCellCountDisplay = document.getElementById('playerCellCountDisplay');
    const leaderboardList = document.getElementById('leaderboardList');

    let gameLoopId;
    let player;
    let bots = [];
    let food = [];
    let viruses = [];
    let spewedMasses = [];

    let screenMouseX = window.innerWidth / 2;
    let screenMouseY = window.innerHeight / 2;
    let worldMouseX = 0;
    let worldMouseY = 0;

    const camera = { x: 0, y: 0, zoom: 1 };

    // Game Constants
    const MAP_WIDTH = 3000;
    const MAP_HEIGHT = 3000;
    const GRID_SIZE = 50;

    const PLAYER_START_MASS = 100;
    const BOT_START_MASS = 10; // Minions might start small
    const FOOD_MASS = 1;
    const FOOD_RADIUS = 6;
    const MAX_FOOD_COUNT = 250;
    const FOOD_SPAWN_INTERVAL = 150;

    const VIRUS_MASS_DEFAULT = 100;
    const MAX_VIRUS_COUNT = 25;
    const VIRUS_SPAWN_INTERVAL = 2500;
    const VIRUS_EAT_MASS_MULTIPLIER = 1.3;
    const VIRUS_FED_LIMIT = 215;
    const VIRUS_COLOR = '#00ff00'; // Green
    const VIRUS_SPLIT_MASS_LOW_MIN = 130; // Min mass of cell to be split by virus
    const VIRUS_SPLIT_MASS_LOW_MAX = 300; // Upper bound for "standard" virus split
    const VIRUS_SPLIT_LOW_MAX_PIECES = 10;
    const VIRUS_SPLIT_HIGH_MIN_PIECES = 9; // For the old pattern (mass > LOW_MAX and <= 300)

    const SPEWED_MASS_COST = 20;
    const SPEWED_MASS_YIELD = 18;
    const SPEWED_MASS_RADIUS = 18;
    const MIN_SPEW_MASS_TOTAL = 50;
    const SPEWED_MASS_SPEED = 25;
    const SPEWED_MASS_LIFESPAN = 60 * 10000; // Long lifespan

    const CELL_MIN_MASS_TO_SPLIT_FROM = 20; // A cell must be at least this mass to initiate a split
    const MIN_MASS_PER_SPLIT_PIECE = 10;    // Each piece resulting from a split must be at least this mass
    const MAX_PLAYER_CELLS = 32;
    const EAT_MASS_RATIO = 1.3;

    const MASS_DECAY_RATE_PER_SECOND = 0.005; // 0.5% per second
    const MASS_DECAY_INTERVAL = 1000; // 1 second

    const MERGE_TIME_MIN_MASS = 100;
    const MERGE_TIME_MAX_MASS = 2000;
    const MERGE_TIME_MIN_MS = 500
    const MERGE_TIME_MAX_MS = 5000
    const CELL_OVERLAP_RESOLUTION_FACTOR = 0.2;
    const CELL_SPLIT_EJECT_SPEED_BASE = 40;
    const CELL_SPLIT_EJECT_DURATION = 2500;
    const CELL_EJECTION_DAMPING = 0.99;
    const SPEWED_MASS_DAMPING = 0.98;

    const PLAYER_RESPAWN_DELAY = 3000; // 3 seconds
    let playerRespawnTimer = 0;
    let isPlayerDead = false;

    let lastDecayTime = 0;
    let lastFoodSpawnTime = 0;
    let lastVirusSpawnTime = 0;
    let lastLeaderboardUpdateTime = 0;

    // Store the chosen bot AI type for the current game session
    let currentGameBotAiType = 'minion'; // Default if not set otherwise

    const WORLD_CONSTANTS = { MAP_WIDTH, MAP_HEIGHT, MIN_SPEW_MASS: MIN_SPEW_MASS_TOTAL, CELL_MIN_MASS_TO_SPLIT: CELL_MIN_MASS_TO_SPLIT_FROM, MAX_PLAYER_CELLS };

    let uniqueIdCounter = 0;
    function getUniqueId() { return uniqueIdCounter++; }

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // --- Entity Classes ---
    class Entity {
        constructor(x, y, mass, color) {
            this.id = getUniqueId();
            this.x = x; this.y = y;
            this.mass = mass; this.color = color;
            this.radius = 0;
            this.targetRadius = 4 + Math.sqrt(this.mass) * 4;
            this.radius = this.targetRadius;
        }

        updateRadiusAndTarget() {
            this.targetRadius = 4 + Math.sqrt(this.mass) * 4;
        }

        animateRadiusLogic(dtFrameFactor) {
            const animationSpeed = 0.08;
            if (Math.abs(this.radius - this.targetRadius) > 0.05) {
                this.radius += (this.targetRadius - this.radius) * animationSpeed * dtFrameFactor;
            } else {
                this.radius = this.targetRadius;
            }
        }

        draw(ctx) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();
            ctx.strokeStyle = darkenColor(this.color, 20);
            ctx.lineWidth = Math.max(1 / camera.zoom, this.radius / 20);
            ctx.stroke();
        }
    }

    class Cell extends Entity {
        constructor(x, y, mass, color, name = "", ownerId = null, isBot = false) {
            super(x, y, mass, color);
            this.name = name;
            this.ownerId = ownerId;
            this.vx = 0; this.vy = 0;
            this.isBot = isBot;
            this.mergeTimer = 0;
            this.ejectionVx = 0; this.ejectionVy = 0;
            this.ejectionTimer = 0;
            this.updateRadiusAndTarget();
            this.radius = this.targetRadius;
        }

        updateSelf(dt, dtFrameFactor, targetWorldX, targetWorldY) {
            if (this.mergeTimer > 0) this.mergeTimer -= dt;

            this.animateRadiusLogic(dtFrameFactor);

            let finalVx = 0;
            let finalVy = 0;
            let isEjecting = this.ejectionTimer > 0;

            if (isEjecting) {
                finalVx += this.ejectionVx;
                finalVy += this.ejectionVy;

                this.ejectionTimer -= dt;
                this.ejectionVx *= CELL_EJECTION_DAMPING;
                this.ejectionVy *= CELL_EJECTION_DAMPING;

                const angleToMouse = Math.atan2(targetWorldY - this.y, targetWorldX - this.x);
                const baseSpeed = Math.max(0.5, 8 - Math.log(this.mass + 1) * 1.3);

                let blendFactor = 0;
                const remainingEjectionRatio = this.ejectionTimer > 0 ? this.ejectionTimer / CELL_SPLIT_EJECT_DURATION : 0;
                const currentEjectionSpeedSq = this.ejectionVx * this.ejectionVx + this.ejectionVy * this.ejectionVy;

                if (currentEjectionSpeedSq < (baseSpeed * 0.3 * baseSpeed * 0.3)) {
                    blendFactor = Math.min(1, (1 - remainingEjectionRatio) + 0.5);
                } else {
                    blendFactor = 1 - remainingEjectionRatio;
                }
                blendFactor = Math.max(0, Math.min(1, blendFactor * 1.5));

                finalVx = (this.ejectionVx * (1 - blendFactor)) + (Math.cos(angleToMouse) * baseSpeed * blendFactor);
                finalVy = (this.ejectionVy * (1 - blendFactor)) + (Math.sin(angleToMouse) * baseSpeed * blendFactor);

                if (this.ejectionTimer <= 0 || (Math.abs(this.ejectionVx) < 0.05 && Math.abs(this.ejectionVy) < 0.05)) {
                    this.ejectionTimer = 0;
                    this.ejectionVx = 0;
                    this.ejectionVy = 0;
                    isEjecting = false;
                }
            }

            if (!isEjecting) {
                const angle = Math.atan2(targetWorldY - this.y, targetWorldX - this.x);
                const speed = Math.max(0.5, 8 - Math.log(this.mass + 1) * 1.3);
                finalVx = Math.cos(angle) * speed;
                finalVy = Math.sin(angle) * speed;
            }

            this.x += finalVx * dtFrameFactor;
            this.y += finalVy * dtFrameFactor;

            this.x = Math.max(this.radius, Math.min(this.x, MAP_WIDTH - this.radius));
            this.y = Math.max(this.radius, Math.min(this.y, MAP_HEIGHT - this.radius));
        }
        decayMass() {
            const minMassThreshold = this.isBot ? BOT_START_MASS : PLAYER_START_MASS;
            const massToLose = Math.floor(this.mass * MASS_DECAY_RATE_PER_SECOND);
            if (this.mass - massToLose >= minMassThreshold / 2) { this.mass -= massToLose; }
            else if (this.mass > minMassThreshold / 2) { this.mass = minMassThreshold / 2; }
            this.updateRadiusAndTarget();
        }

        draw(ctx) {
            super.draw(ctx);
            if (this.name) {
                const fontSize = Math.max(10 / camera.zoom, Math.floor(this.radius / 3.5));
                ctx.font = `bold ${fontSize}px Arial`;
                ctx.fillStyle = "white"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
                ctx.shadowColor = "rgba(0,0,0,0.5)"; ctx.shadowBlur = 3 / camera.zoom;
                ctx.shadowOffsetX = 1 / camera.zoom; ctx.shadowOffsetY = 1 / camera.zoom;
                ctx.fillText(this.name, this.x, this.y);
                if (!this.isBot || (this.ownerId && player && this.ownerId === player.id)) {
                    ctx.font = `${Math.max(8 / camera.zoom, fontSize * 0.65)}px Arial`;
                    ctx.fillText(Math.floor(this.mass), this.x, this.y + fontSize * 0.85);
                }
                ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
            }
        }
    }

    class PlayerController {
        constructor(id, name, startMass, color, isBot = false, aiType = null) {
            this.id = id; this.name = name; this.color = color;
            this.cells = []; this.isBot = isBot;
            this.targetX = MAP_WIDTH / 2; this.targetY = MAP_HEIGHT / 2;
            this.spawnInitialCell(startMass);
            if (isBot && aiType && AiTypes[aiType]) {
                this.ai = new AiTypes[aiType](this, WORLD_CONSTANTS);
            } else if (isBot) { // Fallback for bots if AI type is invalid
                console.warn(`Invalid AI type specified: ${aiType}. Defaulting to 'random' for bot ${name}`);
                this.ai = new AiTypes['random'](this, WORLD_CONSTANTS);
            }
        }
        spawnInitialCell(mass) {
            const cellRadius = 4 + Math.sqrt(mass) * 4;
            const spawnPos = findSafeSpawnPosition(cellRadius * 1.5, this.isBot ? "bot" : "player");
            const newCell = new Cell(spawnPos.x, spawnPos.y, mass, this.color, this.name, this.id, this.isBot);
            newCell.mergeTimer = this.calculateMergeTime(newCell.mass);
            this.cells.push(newCell);
        }
        respawn() {
            this.cells = []; this.spawnInitialCell(PLAYER_START_MASS);
            if (!this.isBot) {
                isPlayerDead = false; playerRespawnTimer = 0;
                const com = this.getCenterOfMassCell();
                camera.x = com.x; camera.y = com.y;
            }
        }
        getCenterOfMassCell() {
            if (this.cells.length === 0) return { x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2, radius: 10, mass: 0 };
            let totalMass = 0; let comX = 0; let comY = 0; let maxRadius = 0;
            this.cells.forEach(cell => {
                totalMass += cell.mass; comX += cell.x * cell.mass; comY += cell.y * cell.mass;
                if (cell.radius > maxRadius) maxRadius = cell.radius;
            });
            if (totalMass === 0 && this.cells.length > 0) return { x: this.cells[0].x, y: this.cells[0].y, radius: this.cells[0].radius, mass: 0 };
            if (totalMass === 0) return { x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2, radius: 10, mass: 0 };
            return { x: comX / totalMass, y: comY / totalMass, radius: maxRadius, mass: totalMass };
        }
        calculateMergeTime(mass) {
            if (mass <= MERGE_TIME_MIN_MASS) return MERGE_TIME_MIN_MS;
            if (mass >= MERGE_TIME_MAX_MASS) return MERGE_TIME_MAX_MS;
            const ratio = (mass - MERGE_TIME_MIN_MASS) / (MERGE_TIME_MAX_MASS - MERGE_TIME_MIN_MASS);
            return MERGE_TIME_MIN_MS + ratio * (MERGE_TIME_MAX_MS - MERGE_TIME_MIN_MS);
        }

        update(dt, dtFrameFactor) {
            if (this.isBot && this.ai) {
                this.ai.update(dt, { food, viruses, players: [player, ...bots.filter(b => b !== this)] });
            }

            this.cells.forEach(cell => {
                const targetWorldX = this.isBot ? this.targetX : worldMouseX;
                const targetWorldY = this.isBot ? this.targetY : worldMouseY;
                cell.updateSelf(dt, dtFrameFactor, targetWorldX, targetWorldY);
            });

            if (this.cells.length > 1) {
                for (let i = 0; i < this.cells.length; i++) {
                    for (let j = i + 1; j < this.cells.length; j++) {
                        const cell1 = this.cells[i]; const cell2 = this.cells[j];
                        if (!cell1 || !cell2) continue;

                        if (cell1.ejectionTimer > 0 && cell2.ejectionTimer > 0) {
                            const dx_check = cell2.x - cell1.x;
                            const dy_check = cell2.y - cell1.y;
                            const distanceSq_check = dx_check * dx_check + dy_check * dy_check;
                            if (distanceSq_check < 0.1) {
                                const nudgeAngle = Math.random() * Math.PI * 2;
                                const nudgeAmount = 0.5;
                                cell1.x -= Math.cos(nudgeAngle) * nudgeAmount * 0.5;
                                cell1.y -= Math.sin(nudgeAngle) * nudgeAmount * 0.5;
                                cell2.x += Math.cos(nudgeAngle) * nudgeAmount * 0.5;
                                cell2.y += Math.sin(nudgeAngle) * nudgeAmount * 0.5;
                            }
                            continue;
                        }

                        const dx = cell2.x - cell1.x; const dy = cell2.y - cell1.y;
                        const distanceSq = dx * dx + dy * dy;
                        const sumRadii = cell1.radius + cell2.radius;

                        if (distanceSq < (sumRadii * sumRadii) && distanceSq > 0.001) {
                            const distance = Math.sqrt(distanceSq);
                            const overlap = sumRadii - distance;

                            if (overlap > 0) {
                                const invDistance = 1 / distance;
                                const normDx = dx * invDistance;
                                const normDy = dy * invDistance;
                                const moveAmount = overlap * CELL_OVERLAP_RESOLUTION_FACTOR;
                                const totalMassForOverlap = cell1.mass + cell2.mass;
                                let move1Factor = 0.5;
                                let move2Factor = 0.5;

                                if (totalMassForOverlap > 0) {
                                    move1Factor = cell2.mass / totalMassForOverlap;
                                    move2Factor = cell1.mass / totalMassForOverlap;
                                }
                                move1Factor = Math.max(0.1, Math.min(0.9, move1Factor));
                                move2Factor = 1.0 - move1Factor;

                                if (cell1.ejectionTimer <= 0) {
                                    cell1.x -= normDx * moveAmount * move1Factor;
                                    cell1.y -= normDy * moveAmount * move1Factor;
                                }
                                if (cell2.ejectionTimer <= 0) {
                                    cell2.x += normDx * moveAmount * move2Factor;
                                    cell2.y += normDy * moveAmount * move2Factor;
                                }

                                [cell1, cell2].forEach(c => {
                                    if (c.ejectionTimer <= 0) {
                                        c.x = Math.max(c.radius, Math.min(c.x, MAP_WIDTH - c.radius));
                                        c.y = Math.max(c.radius, Math.min(c.y, MAP_HEIGHT - c.radius));
                                    }
                                });
                            }
                        }
                    }
                }

                let mergedInThisCycle = true;
                while (mergedInThisCycle) {
                    mergedInThisCycle = false;
                    for (let i = 0; i < this.cells.length; i++) {
                        for (let j = i + 1; j < this.cells.length; j++) {
                            const cell1 = this.cells[i]; const cell2 = this.cells[j];
                            if (!cell1 || !cell2) continue;

                            const dx = cell2.x - cell1.x; const dy = cell2.y - cell1.y;
                            const distanceSq = dx * dx + dy * dy;
                            const canPhysicallyMerge = distanceSq < Math.max(cell1.radius, cell2.radius) ** 2 * 0.7;

                            if (cell1.mergeTimer <= 0 && cell2.mergeTimer <= 0 && canPhysicallyMerge) {
                                const absorbingCell = cell1.mass >= cell2.mass ? cell1 : cell2;
                                const absorbedCell = cell1.mass < cell2.mass ? cell1 : cell2;
                                const M1_old = absorbingCell.mass; const M2 = absorbedCell.mass;
                                const totalNewMass = M1_old + M2;

                                if (totalNewMass > 0) {
                                    absorbingCell.x = (absorbingCell.x * M1_old + absorbedCell.x * M2) / totalNewMass;
                                    absorbingCell.y = (absorbingCell.y * M1_old + absorbedCell.y * M2) / totalNewMass;
                                }
                                absorbingCell.mass = totalNewMass;
                                absorbingCell.updateRadiusAndTarget();
                                absorbingCell.mergeTimer = this.calculateMergeTime(absorbingCell.mass);

                                const absorbedIndex = this.cells.indexOf(absorbedCell);
                                if (absorbedIndex > -1) this.cells.splice(absorbedIndex, 1);
                                mergedInThisCycle = true; break;
                            }
                        }
                        if (mergedInThisCycle) break;
                    }
                }
            }
            this.cells = this.cells.filter(cell => cell.mass > 0);
        }

        getTotalMass() { return this.cells.reduce((sum, cell) => sum + cell.mass, 0); }

        initiateSplit() {
            if (this.cells.length >= MAX_PLAYER_CELLS) return;

            const MAX_EJECT_SPEED_BONUS_FROM_MASS = 15;
            const BASE_EJECT_SPEED_FACTOR = 3.0;

            const cellsToConsiderSplitting = [...this.cells];
            let currentTotalCellCount = this.cells.length;

            for (const cell of cellsToConsiderSplitting) {
                if (currentTotalCellCount >= MAX_PLAYER_CELLS) break;
                if (!this.cells.includes(cell) || cell.mass < CELL_MIN_MASS_TO_SPLIT_FROM) {
                    continue;
                }

                const originalMass = cell.mass;
                const massOfParentPiece = Math.floor(originalMass / 2);
                const massOfNewPiece = originalMass - massOfParentPiece;

                if (massOfNewPiece < MIN_MASS_PER_SPLIT_PIECE || massOfParentPiece < MIN_MASS_PER_SPLIT_PIECE) {
                    continue;
                }

                cell.mass = massOfParentPiece;
                cell.updateRadiusAndTarget();

                const angle = this.isBot ?
                    (this.ai && (this.targetX !== undefined) ? Math.atan2(this.targetY - cell.y, this.targetX - cell.x) : Math.random() * Math.PI * 2)
                    : Math.atan2(worldMouseY - cell.y, worldMouseX - cell.x);

                const ejectDist = cell.radius * 0.1;
                const newX = cell.x + Math.cos(angle) * ejectDist;
                const newY = cell.y + Math.sin(angle) * ejectDist;

                const newCell = new Cell(newX, newY, massOfNewPiece, this.color, this.name, this.id, this.isBot);

                const massBasedSpeedBonus = Math.min(Math.sqrt(massOfNewPiece) * 0.4, MAX_EJECT_SPEED_BONUS_FROM_MASS);
                const ejectSpeed = (CELL_SPLIT_EJECT_SPEED_BASE + massBasedSpeedBonus) / BASE_EJECT_SPEED_FACTOR;

                newCell.ejectionVx = Math.cos(angle) * ejectSpeed;
                newCell.ejectionVy = Math.sin(angle) * ejectSpeed;
                newCell.ejectionTimer = CELL_SPLIT_EJECT_DURATION;

                cell.ejectionVx = 0;
                cell.ejectionVy = 0;
                cell.ejectionTimer = 0;

                cell.mergeTimer = this.calculateMergeTime(cell.mass);
                newCell.mergeTimer = this.calculateMergeTime(newCell.mass);

                this.cells.push(newCell);
                currentTotalCellCount++;
            }
        }

        initiateSpew() {
            if (this.getTotalMass() < MIN_SPEW_MASS_TOTAL) return;
            this.cells.forEach(cell => {
                if (cell.mass > SPEWED_MASS_COST + PLAYER_START_MASS / 2 && cell.ejectionTimer <= 0) { // Only non-ejecting cells spew
                    cell.mass -= SPEWED_MASS_COST; cell.updateRadiusAndTarget();
                    const angle = this.isBot ?
                        (this.ai && (this.targetX !== undefined) ? Math.atan2(this.targetY - cell.y, this.targetX - cell.x) : Math.random() * Math.PI * 2)
                        : Math.atan2(worldMouseY - cell.y, worldMouseX - cell.x);
                    const ejectDist = cell.radius + SPEWED_MASS_RADIUS + 2;
                    let spewX = cell.x + Math.cos(angle) * ejectDist; let spewY = cell.y + Math.sin(angle) * ejectDist;
                    const smVx = Math.cos(angle) * SPEWED_MASS_SPEED; const smVy = Math.sin(angle) * SPEWED_MASS_SPEED;
                    const SPEWED_CHECK_RADIUS = SPEWED_MASS_RADIUS * 1.5;
                    for (let k = 0; k < 3; k++) {
                        let conflict = false;
                        for (const existingSM of spewedMasses) {
                            const distSq = (spewX - existingSM.x) ** 2 + (spewY - existingSM.y) ** 2;
                            if (distSq < (SPEWED_CHECK_RADIUS + existingSM.radius) ** 2 * 0.25) { conflict = true; break; }
                        }
                        if (!conflict) break;
                        spewX += (Math.random() - 0.5) * SPEWED_MASS_RADIUS * 4;
                        spewY += (Math.random() - 0.5) * SPEWED_MASS_RADIUS * 4;
                        spewX = Math.max(SPEWED_MASS_RADIUS, Math.min(spewX, MAP_WIDTH - SPEWED_MASS_RADIUS));
                        spewY = Math.max(SPEWED_MASS_RADIUS, Math.min(spewY, MAP_HEIGHT - SPEWED_MASS_RADIUS));
                    }
                    spewedMasses.push(new SpewedMass(spewX, spewY, this.color, this.id, smVx, smVy));
                }
            });
        }

        applyMassDecay() {
            this.cells.forEach(cell => cell.decayMass());
            this.cells = this.cells.filter(cell => cell.mass >= MIN_MASS_PER_SPLIT_PIECE / 2); // Allow slightly smaller before removing
        }

        handleVirusEatSplit(eatenCellOriginal) {
            let cellIndex = this.cells.findIndex(c => c.id === eatenCellOriginal.id);
            let cellToProcess = (cellIndex !== -1) ? this.cells[cellIndex] : null;

            if (!cellToProcess || cellToProcess.mass <= 0) {
                return;
            }

            const originalMass = cellToProcess.mass;
            const originalX = cellToProcess.x;
            const originalY = cellToProcess.y;

            this.cells.splice(cellIndex, 1);

            let newCells = [];
            const minPieceForVirusSplit = MIN_MASS_PER_SPLIT_PIECE;

            const MAX_EJECT_SPEED_BONUS_FROM_MASS_VIRUS = 10;
            const BASE_EJECT_SPEED_FACTOR_VIRUS = 3.2;
            const VIRUS_SPLIT_EJECT_DURATION_MULTIPLIER = 1.0;

            if (originalMass > 300 && (MAX_PLAYER_CELLS - this.cells.length) >= 3) {
                let remainingMass = originalMass;

                let mainBlobMass = Math.max(minPieceForVirusSplit, Math.floor(originalMass * 0.50));
                if (remainingMass - mainBlobMass < minPieceForVirusSplit * 2) {
                    mainBlobMass = Math.max(minPieceForVirusSplit, remainingMass - (minPieceForVirusSplit * 2));
                }
                if (mainBlobMass < minPieceForVirusSplit) mainBlobMass = minPieceForVirusSplit;

                const mainBlob = new Cell(originalX, originalY, mainBlobMass, this.color, this.name, this.id, this.isBot);
                mainBlob.mergeTimer = this.calculateMergeTime(mainBlobMass);
                mainBlob.ejectionTimer = 0;
                newCells.push(mainBlob);
                remainingMass -= mainBlobMass;

                let secondPieceMass = 0;
                if (remainingMass >= minPieceForVirusSplit && (MAX_PLAYER_CELLS - (this.cells.length + newCells.length)) >= 1) {
                    secondPieceMass = Math.max(minPieceForVirusSplit, Math.floor(originalMass * 0.25));
                    if (secondPieceMass > remainingMass - minPieceForVirusSplit) {
                        secondPieceMass = Math.max(minPieceForVirusSplit, remainingMass - minPieceForVirusSplit);
                    }
                    if (secondPieceMass > remainingMass) secondPieceMass = remainingMass;
                    if (secondPieceMass < minPieceForVirusSplit && remainingMass >= minPieceForVirusSplit) secondPieceMass = minPieceForVirusSplit;

                    if (secondPieceMass >= minPieceForVirusSplit) {
                        const anglePiece2 = Math.random() * Math.PI * 2;
                        const ejectDistPiece2 = mainBlob.radius > 0 ? mainBlob.radius * 0.3 : 5;
                        const piece2X = originalX + Math.cos(anglePiece2) * ejectDistPiece2;
                        const piece2Y = originalY + Math.sin(anglePiece2) * ejectDistPiece2;
                        const piece2 = new Cell(piece2X, piece2Y, secondPieceMass, this.color, this.name, this.id, this.isBot);

                        const massBasedSpeedBonus2 = Math.min(Math.sqrt(secondPieceMass) * 0.35, MAX_EJECT_SPEED_BONUS_FROM_MASS_VIRUS);
                        const ejectSpeed2 = (CELL_SPLIT_EJECT_SPEED_BASE * 0.9 + massBasedSpeedBonus2) / BASE_EJECT_SPEED_FACTOR_VIRUS;

                        piece2.ejectionVx = Math.cos(anglePiece2) * ejectSpeed2;
                        piece2.ejectionVy = Math.sin(anglePiece2) * ejectSpeed2;
                        piece2.ejectionTimer = CELL_SPLIT_EJECT_DURATION * VIRUS_SPLIT_EJECT_DURATION_MULTIPLIER;
                        piece2.mergeTimer = this.calculateMergeTime(secondPieceMass);
                        newCells.push(piece2);
                        remainingMass -= secondPieceMass;
                    }
                }

                let numTinyPieces = Math.floor(Math.random() * 6) + 5;
                for (let i = 0; i < numTinyPieces; i++) {
                    if (remainingMass < minPieceForVirusSplit || (MAX_PLAYER_CELLS - (this.cells.length + newCells.length)) <= 0) break;

                    let tinyMass = Math.floor(Math.random() * 41) + 10;
                    tinyMass = Math.min(tinyMass, remainingMass);
                    if (tinyMass < minPieceForVirusSplit) {
                        if (remainingMass >= minPieceForVirusSplit) tinyMass = minPieceForVirusSplit;
                        else break;
                    }

                    const angleTiny = (i / numTinyPieces) * Math.PI * 2 + (Math.random() - 0.5) * 0.8;
                    const ejectDistTiny = (mainBlob.radius > 0 ? mainBlob.radius * 0.5 : 10) + Math.random() * 20;
                    const tinyX = originalX + Math.cos(angleTiny) * ejectDistTiny;
                    const tinyY = originalY + Math.sin(angleTiny) * ejectDistTiny;
                    const tinyPiece = new Cell(tinyX, tinyY, tinyMass, this.color, this.name, this.id, this.isBot);

                    const massBasedSpeedBonusTiny = Math.min(Math.sqrt(tinyMass) * 0.3, MAX_EJECT_SPEED_BONUS_FROM_MASS_VIRUS);
                    const ejectSpeedTiny = (CELL_SPLIT_EJECT_SPEED_BASE * 1.1 + massBasedSpeedBonusTiny) / BASE_EJECT_SPEED_FACTOR_VIRUS;

                    tinyPiece.ejectionVx = Math.cos(angleTiny) * ejectSpeedTiny;
                    tinyPiece.ejectionVy = Math.sin(angleTiny) * ejectSpeedTiny;
                    tinyPiece.ejectionTimer = CELL_SPLIT_EJECT_DURATION * (VIRUS_SPLIT_EJECT_DURATION_MULTIPLIER + 0.2);
                    tinyPiece.mergeTimer = this.calculateMergeTime(tinyMass);
                    newCells.push(tinyPiece);
                    remainingMass -= tinyMass;
                }
                if (remainingMass > 0 && newCells.length > 0 && newCells[0].id === mainBlob.id) {
                    newCells[0].mass += remainingMass;
                    newCells[0].updateRadiusAndTarget();
                }

            } else if (originalMass >= VIRUS_SPLIT_MASS_LOW_MIN && originalMass <= VIRUS_SPLIT_MASS_LOW_MAX) {
                let numPieces = Math.floor(originalMass / (minPieceForVirusSplit * 1.25));
                numPieces = Math.min(numPieces, VIRUS_SPLIT_LOW_MAX_PIECES, MAX_PLAYER_CELLS - this.cells.length);
                if (numPieces <= 1 && MAX_PLAYER_CELLS - this.cells.length >= 1) numPieces = 2;

                const massPerPiece = (numPieces > 0) ? Math.floor(originalMass / numPieces) : 0;

                if (numPieces <= 0 || massPerPiece < minPieceForVirusSplit) {
                    const reCell = new Cell(originalX, originalY, originalMass, this.color, this.name, this.id, this.isBot);
                    reCell.mergeTimer = this.calculateMergeTime(reCell.mass); this.cells.push(reCell); return;
                }

                for (let i = 0; i < numPieces; i++) {
                    if (this.cells.length + newCells.length >= MAX_PLAYER_CELLS) break;
                    const angle = (i / numPieces) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
                    const ejectDist = minPieceForVirusSplit * 0.3;
                    const nx = originalX + Math.cos(angle) * ejectDist;
                    const ny = originalY + Math.sin(angle) * ejectDist;
                    const piece = new Cell(nx, ny, massPerPiece, this.color, this.name, this.id, this.isBot);

                    const massBasedSpeedBonus = Math.min(Math.sqrt(massPerPiece) * 0.3, MAX_EJECT_SPEED_BONUS_FROM_MASS_VIRUS);
                    const ejectSpeed = (CELL_SPLIT_EJECT_SPEED_BASE + massBasedSpeedBonus) / BASE_EJECT_SPEED_FACTOR_VIRUS;

                    piece.ejectionVx = Math.cos(angle) * ejectSpeed;
                    piece.ejectionVy = Math.sin(angle) * ejectSpeed;
                    piece.ejectionTimer = CELL_SPLIT_EJECT_DURATION * VIRUS_SPLIT_EJECT_DURATION_MULTIPLIER;
                    piece.mergeTimer = this.calculateMergeTime(massPerPiece);
                    newCells.push(piece);
                }
            } else if (originalMass > VIRUS_SPLIT_MASS_LOW_MAX && originalMass <= 300) {
                let numSmallCells = Math.min(VIRUS_SPLIT_HIGH_MIN_PIECES, MAX_PLAYER_CELLS - this.cells.length - 1);
                if (numSmallCells < 0) numSmallCells = 0;

                let massForSmall = numSmallCells * minPieceForVirusSplit;
                let mainBlobMassOld = originalMass - massForSmall;

                if (mainBlobMassOld < minPieceForVirusSplit * 2 || (numSmallCells > 0 && mainBlobMassOld < massForSmall)) {
                    mainBlobMassOld = originalMass; numSmallCells = 0;
                }
                if (mainBlobMassOld < minPieceForVirusSplit) {
                    const reCell = new Cell(originalX, originalY, originalMass, this.color, this.name, this.id, this.isBot);
                    reCell.mergeTimer = this.calculateMergeTime(reCell.mass); this.cells.push(reCell); return;
                }

                const mainBlobOld = new Cell(originalX, originalY, mainBlobMassOld, this.color, this.name, this.id, this.isBot);
                mainBlobOld.mergeTimer = this.calculateMergeTime(mainBlobMassOld);
                mainBlobOld.ejectionTimer = 0;
                newCells.push(mainBlobOld);

                for (let i = 0; i < numSmallCells; i++) {
                    if (this.cells.length + newCells.length >= MAX_PLAYER_CELLS) break;
                    const angle = (i / numSmallCells) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
                    const ejectDist = mainBlobOld.radius > 0 ? mainBlobOld.radius * 0.6 : 5;
                    const nx = originalX + Math.cos(angle) * ejectDist;
                    const ny = originalY + Math.sin(angle) * ejectDist;
                    const piece = new Cell(nx, ny, minPieceForVirusSplit, this.color, this.name, this.id, this.isBot);

                    const massBasedSpeedBonus = Math.min(Math.sqrt(minPieceForVirusSplit) * 0.3, MAX_EJECT_SPEED_BONUS_FROM_MASS_VIRUS);
                    const ejectSpeed = (CELL_SPLIT_EJECT_SPEED_BASE * 1.0 + massBasedSpeedBonus) / BASE_EJECT_SPEED_FACTOR_VIRUS;

                    piece.ejectionVx = Math.cos(angle) * ejectSpeed;
                    piece.ejectionVy = Math.sin(angle) * ejectSpeed;
                    piece.ejectionTimer = CELL_SPLIT_EJECT_DURATION * (VIRUS_SPLIT_EJECT_DURATION_MULTIPLIER + 0.1);
                    piece.mergeTimer = this.calculateMergeTime(minPieceForVirusSplit);
                    newCells.push(piece);
                }
            } else {
                const reCell = new Cell(originalX, originalY, originalMass, this.color, this.name, this.id, this.isBot);
                reCell.mergeTimer = this.calculateMergeTime(reCell.mass);
                this.cells.push(reCell);
                return;
            }
            this.cells.push(...newCells);
        }
    }

    class Food extends Entity {
        constructor(x, y) { super(x, y, FOOD_MASS, getRandomPastelColor()); this.radius = FOOD_RADIUS; this.targetRadius = this.radius; }
    }

    class Virus extends Entity {
        constructor(x, y, mass = VIRUS_MASS_DEFAULT) {
            super(x, y, mass, VIRUS_COLOR);
            this.baseMass = VIRUS_MASS_DEFAULT;
            this.ejectionVx = 0; this.ejectionVy = 0; this.ejectionTimer = 0;
            this.updateRadiusAndTarget();
            this.radius = this.targetRadius;
        }
        updateRadiusAndTarget() { this.targetRadius = 4 + Math.sqrt(this.mass) * 4.5; } // Viruses are a bit denser visually

        draw(ctx) {
            const numOuterPoints = 12 + Math.floor(this.radius / 15);
            const outerR = this.radius;
            const innerR = this.radius * (0.60 + Math.sin(Date.now() / 250) * 0.08); // Pulsating inner radius
            const rotation = Date.now() / 2500; // Slow rotation
            ctx.beginPath();
            for (let i = 0; i < numOuterPoints; i++) {
                let angleOuter = (i / numOuterPoints) * Math.PI * 2 + rotation;
                let xOuter = this.x + Math.cos(angleOuter) * outerR;
                let yOuter = this.y + Math.sin(angleOuter) * outerR;
                let angleInner = ((i + 0.5) / numOuterPoints) * Math.PI * 2 + rotation;
                let xInner = this.x + Math.cos(angleInner) * innerR;
                let yInner = this.y + Math.sin(angleInner) * innerR;
                if (i === 0) { ctx.moveTo(xOuter, yOuter); } else { ctx.lineTo(xOuter, yOuter); }
                ctx.lineTo(xInner, yInner);
            }
            ctx.closePath();
            ctx.fillStyle = this.color; ctx.fill();
            ctx.strokeStyle = darkenColor(this.color, 30);
            ctx.lineWidth = Math.max(1.5 / camera.zoom, this.radius / 30);
            ctx.stroke();
        }

        onFed(spewedItem) {
            this.mass += SPEWED_MASS_YIELD; this.updateRadiusAndTarget();
            if (this.mass > VIRUS_FED_LIMIT && viruses.length < MAX_VIRUS_COUNT) {
                this.mass = this.baseMass; this.updateRadiusAndTarget(); // Reset mass
                const angle = Math.atan2(spewedItem.y - this.y, spewedItem.x - this.x); // Angle from spewed mass to virus center
                const shootAngle = angle + Math.PI; // Shoot new virus in opposite direction
                const ejectDist = this.radius * 1.5;
                const newVirusRadius = 4 + Math.sqrt(VIRUS_MASS_DEFAULT) * 4.5;
                const spawnPos = findSafeSpawnPosition(newVirusRadius, "virus", {
                    preferredX: this.x + Math.cos(shootAngle) * ejectDist * 2.5, // Further out preferred
                    preferredY: this.y + Math.sin(shootAngle) * ejectDist * 2.5,
                });
                const newVirus = new Virus(spawnPos.x, spawnPos.y);
                const virusEjectSpeed = SPEWED_MASS_SPEED * 1.1; // New virus ejects with some speed
                newVirus.ejectionVx = Math.cos(shootAngle) * virusEjectSpeed;
                newVirus.ejectionVy = Math.sin(shootAngle) * virusEjectSpeed;
                newVirus.ejectionTimer = CELL_SPLIT_EJECT_DURATION * 0.8; // Shorter ejection for new virus
                viruses.push(newVirus);
            }
        }
    }

    class SpewedMass extends Entity {
        constructor(x, y, color, ownerId, vx, vy) {
            super(x, y, SPEWED_MASS_YIELD, color);
            this.radius = SPEWED_MASS_RADIUS; this.targetRadius = this.radius; // Static radius
            this.ownerId = ownerId; this.createdAt = Date.now();
            this.vx = vx; this.vy = vy;
            this.lifeTimer = SPEWED_MASS_LIFESPAN;
        }
        update(dt, dtFrameFactor) {
            this.x += this.vx * dtFrameFactor; this.y += this.vy * dtFrameFactor;
            this.vx *= SPEWED_MASS_DAMPING; this.vy *= SPEWED_MASS_DAMPING;
            if (Math.abs(this.vx) < 0.05) this.vx = 0; if (Math.abs(this.vy) < 0.05) this.vy = 0;
            this.x = Math.max(this.radius, Math.min(this.x, MAP_WIDTH - this.radius));
            this.y = Math.max(this.radius, Math.min(this.y, MAP_HEIGHT - this.radius));
            this.lifeTimer -= dt;
        }
    }

    function findSafeSpawnPosition(radius, entityType = "unknown", preferences = {}) {
        const MAX_TRIES = 30; let spawnX, spawnY;
        let bestSpawnX = preferences.preferredX || Math.random() * (MAP_WIDTH - radius * 2) + radius;
        let bestSpawnY = preferences.preferredY || Math.random() * (MAP_HEIGHT - radius * 2) + radius;
        let foundSafe = false;
        // Consider all cells for safe spawning checks
        const allPlayerAndBotCells = [...(player && !isPlayerDead ? player.cells : []), ...bots.flatMap(b => b.cells)];

        for (let i = 0; i < MAX_TRIES; i++) {
            if (i < 5 && preferences.preferredX !== undefined) { // Try near preferred location first
                spawnX = preferences.preferredX + (Math.random() - 0.5) * radius * (i + 1) * 2;
                spawnY = preferences.preferredY + (Math.random() - 0.5) * radius * (i + 1) * 2;
            } else { // Random location
                spawnX = Math.random() * (MAP_WIDTH - radius * 2) + radius;
                spawnY = Math.random() * (MAP_HEIGHT - radius * 2) + radius;
            }
            spawnX = Math.max(radius, Math.min(spawnX, MAP_WIDTH - radius));
            spawnY = Math.max(radius, Math.min(spawnY, MAP_HEIGHT - radius));

            let isSafe = true;
            // Check against player/bot cells
            for (const cell of allPlayerAndBotCells) {
                const distSq = (spawnX - cell.x) ** 2 + (spawnY - cell.y) ** 2;
                if (distSq < (radius + cell.radius + 10) ** 2) { isSafe = false; break; }
            }
            if (!isSafe) continue;

            // Additional check for viruses if spawning a virus
            if (entityType === "virus") {
                for (const v of viruses) {
                    const distSq = (spawnX - v.x) ** 2 + (spawnY - v.y) ** 2;
                    if (distSq < (radius + v.radius + 20) ** 2) { isSafe = false; break; }
                }
            }
            if (isSafe) { bestSpawnX = spawnX; bestSpawnY = spawnY; foundSafe = true; break; }
        }
        return { x: bestSpawnX, y: bestSpawnY, foundSafe };
    }

    function initGame() {
        uniqueIdCounter = 0; isPlayerDead = false; playerRespawnTimer = 0;
        const playerNameVal = playerNameInput.value || "Player";
        const numBotsVal = parseInt(numBotsInput.value) || 0;
        currentGameBotAiType = botTypeSelect.value; // Get selected bot type

        player = new PlayerController(getUniqueId(), playerNameVal, PLAYER_START_MASS, '#007bff');
        bots = [];
        for (let i = 0; i < numBotsVal; i++) {
            bots.push(new PlayerController(getUniqueId(), `Bot ${i + 1}`, BOT_START_MASS, getRandomBotColor(), true, currentGameBotAiType));
        }
        food = []; viruses = []; spewedMasses = [];
        spawnInitialEntities();
        lastDecayTime = Date.now(); lastFoodSpawnTime = Date.now(); lastVirusSpawnTime = Date.now(); lastLeaderboardUpdateTime = Date.now();
        const com = player.getCenterOfMassCell(); camera.x = com.x; camera.y = com.y;
        startScreen.style.display = 'none'; gameContainer.style.display = 'block'; gameOverMessage.style.display = 'none';
        resizeCanvas();
        if (gameLoopId) cancelAnimationFrame(gameLoopId);
        lastFrameTime = performance.now();
        gameLoop(lastFrameTime);
    }
    function spawnInitialEntities() {
        for (let i = 0; i < MAX_FOOD_COUNT / 1.5; i++) spawnFood();
        for (let i = 0; i < MAX_VIRUS_COUNT / 2; i++) spawnVirus();
    }
    function spawnFood() {
        if (food.length < MAX_FOOD_COUNT) {
            const spawnPos = findSafeSpawnPosition(FOOD_RADIUS * 2, "food");
            food.push(new Food(spawnPos.x, spawnPos.y));
        }
    }
    function spawnVirus() {
        if (viruses.length < MAX_VIRUS_COUNT) {
            const virusRadius = 4 + Math.sqrt(VIRUS_MASS_DEFAULT) * 4.5;
            const spawnPos = findSafeSpawnPosition(virusRadius * 1.2, "virus");
            viruses.push(new Virus(spawnPos.x, spawnPos.y));
        }
    }

    function updateCamera() {
        let targetX, targetY, targetMass;
        if (isPlayerDead || !player || player.cells.length === 0) {
            targetX = MAP_WIDTH / 2; targetY = MAP_HEIGHT / 2; targetMass = PLAYER_START_MASS;
        } else {
            const com = player.getCenterOfMassCell();
            targetX = com.x; targetY = com.y; targetMass = com.mass;
        }
        camera.x += (targetX - camera.x) * 0.1; camera.y += (targetY - camera.y) * 0.1;
        const baseZoom = Math.max(canvas.width / MAP_WIDTH, canvas.height / MAP_HEIGHT) * 0.9; // Ensure map edges are roughly visible at min zoom
        const massFactor = Math.max(0.1, 1.6 - Math.log10(targetMass + 1) * 0.35); // Zoom out with mass
        const desiredZoom = Math.max(baseZoom * 0.3, massFactor); // Clamp zoom so it doesn't get too small or too large

        camera.zoom += (desiredZoom - camera.zoom) * 0.05;
        camera.zoom = Math.max(0.05, Math.min(camera.zoom, 2.5)); // Absolute min/max zoom
    }
    function updateWorldMouseCoords() {
        worldMouseX = (screenMouseX - canvas.width / 2) / camera.zoom + camera.x;
        worldMouseY = (screenMouseY - canvas.height / 2) / camera.zoom + camera.y;
    }
    function checkCollisions() {
        const allControllers = [...(player && !isPlayerDead ? [player] : []), ...bots].filter(c => c && c.cells.length > 0);

        allControllers.forEach(controller => {
            for (let i = controller.cells.length - 1; i >= 0; i--) {
                if (i >= controller.cells.length) continue;
                const cell = controller.cells[i];
                if (!cell || cell.mass <= 0) continue;

                for (let j = food.length - 1; j >= 0; j--) {
                    const f = food[j];
                    if (!f) continue;
                    if (isColliding(cell, f, "food")) {
                        cell.mass += f.mass;
                        cell.updateRadiusAndTarget();
                        food.splice(j, 1);
                    }
                }

                for (let j = spewedMasses.length - 1; j >= 0; j--) {
                    const sm = spewedMasses[j];
                    if (!sm) continue;
                    if (isColliding(cell, sm, "spewed") && cell.mass > sm.mass * 1.1) {
                        cell.mass += sm.mass;
                        cell.updateRadiusAndTarget();
                        spewedMasses.splice(j, 1);
                    }
                }

                let virusEatenAndCellSplit = false;
                for (let j = viruses.length - 1; j >= 0; j--) {
                    const v = viruses[j];
                    if (!v) continue;

                    if (!controller.cells.includes(cell) || cell.mass <= 0) {
                        virusEatenAndCellSplit = true;
                        break;
                    }

                    if (isColliding(cell, v, "virus") && cell.mass >= v.mass * VIRUS_EAT_MASS_MULTIPLIER) {
                        // Cell eats virus mass *before* splitting logic
                        cell.mass += v.mass; // Cell gains virus mass
                        cell.updateRadiusAndTarget(); // Update radius due to gained mass

                        viruses.splice(j, 1); // Remove virus

                        // Now call split logic, passing the cell that ate the virus
                        // This cell already has the increased mass.
                        controller.handleVirusEatSplit(cell);

                        virusEatenAndCellSplit = true;
                        break;
                    }
                }
                if (virusEatenAndCellSplit) {
                    // Cell was processed by virus split, outer loop i-- will handle correctly
                }
            }
        });

        for (let i = spewedMasses.length - 1; i >= 0; i--) {
            const sm = spewedMasses[i];
            if (!sm) continue;
            for (let j = viruses.length - 1; j >= 0; j--) {
                const v = viruses[j];
                if (!v) continue;
                if (isColliding(sm, v, "virus_feed")) {
                    v.onFed(sm);
                    spewedMasses.splice(i, 1);
                    break;
                }
            }
        }

        const allActivePlayerCellsSnapshot = [];
        allControllers.forEach(c => {
            c.cells.forEach(cell_in_controller => {
                if (cell_in_controller && cell_in_controller.mass > 0) {
                    allActivePlayerCellsSnapshot.push(cell_in_controller);
                }
            });
        });

        for (let i = 0; i < allActivePlayerCellsSnapshot.length; i++) {
            for (let j = i + 1; j < allActivePlayerCellsSnapshot.length; j++) {
                const cellA = allActivePlayerCellsSnapshot[i];
                const cellB = allActivePlayerCellsSnapshot[j];

                if (!cellA || !cellB || cellA.mass <= 0 || cellB.mass <= 0 || cellA.ownerId === cellB.ownerId) continue;

                if (isColliding(cellA, cellB, "cell")) {
                    let eater, eatee;
                    if (cellA.mass >= cellB.mass * EAT_MASS_RATIO && cellA.mass > cellB.mass + Math.max(1, MIN_MASS_PER_SPLIT_PIECE * 0.1)) {
                        eater = cellA; eatee = cellB;
                    } else if (cellB.mass >= cellA.mass * EAT_MASS_RATIO && cellB.mass > cellA.mass + Math.max(1, MIN_MASS_PER_SPLIT_PIECE * 0.1)) {
                        eater = cellB; eatee = cellA;
                    }

                    if (eater) {
                        eater.mass += eatee.mass;
                        eatee.mass = 0;
                        eater.updateRadiusAndTarget();

                        const ownerOfEatee = allControllers.find(c => c.id === eatee.ownerId);
                        if (ownerOfEatee) {
                            ownerOfEatee.cells = ownerOfEatee.cells.filter(c => c.id !== eatee.id);
                        }
                    }
                }
            }
        }
        allControllers.forEach(c => {
            c.cells = c.cells.filter(cell => cell.mass > MIN_MASS_PER_SPLIT_PIECE / 2);
        });
    }
    function isColliding(obj1, obj2, type) {
        if (!obj1 || !obj2 || obj1.radius === undefined || obj2.radius === undefined) return false;
        const dx = obj1.x - obj2.x; const dy = obj1.y - obj2.y; const distSq = dx * dx + dy * dy;
        switch (type) {
            case "food": return distSq < obj1.radius * obj1.radius * 0.8; // Cell needs to be mostly over food
            case "spewed": return distSq < obj1.radius * obj1.radius * 0.8; // Same for spewed mass
            case "virus": // Cell hits virus if its main body overlaps with virus's "core"
                return distSq < (obj1.radius - obj2.radius * 0.2) ** 2;
            case "virus_feed": // Spewed mass hits virus if it overlaps significantly
                return distSq < (obj2.radius + obj1.radius * 0.5) ** 2;
            case "cell": // Cell eating another cell
                const larger = obj1.mass > obj2.mass ? obj1 : obj2;
                const smaller = obj1.mass <= obj2.mass ? obj1 : obj2;
                // Larger cell must substantially overlap smaller cell's center
                return distSq < (larger.radius - smaller.radius * 0.33) ** 2;
            default: // Generic fallback, not really used with current types
                return distSq < (obj1.radius + obj2.radius) ** 2 * 0.25;
        }
    }
    function updateHUD() {
        if (!player) return;
        playerNameDisplay.textContent = player.name;
        const playerState = (isPlayerDead || player.cells.length === 0);
        playerMassDisplay.textContent = playerState ? "0 (Respawning...)" : Math.floor(player.getTotalMass());
        playerCellCountDisplay.textContent = playerState ? "0" : player.cells.length;
        const now = Date.now();
        if (now - lastLeaderboardUpdateTime > 1000) { // Update leaderboard every second
            lastLeaderboardUpdateTime = now;
            const leaderSource = [...(player && !isPlayerDead ? [player] : []), ...bots];
            const allPlayersForLeaderboard = leaderSource
                .filter(p => p && p.cells.length > 0 && p.getTotalMass() > 0) // Ensure they have mass
                .map(p => ({ name: p.name, mass: Math.floor(p.getTotalMass()), id: p.id }))
                .sort((a, b) => b.mass - a.mass)
                .slice(0, 10);
            leaderboardList.innerHTML = '';
            allPlayersForLeaderboard.forEach(p => {
                const li = document.createElement('li');
                li.textContent = `${p.name}: ${p.mass}`;
                if (player && p.id === player.id && !isPlayerDead) {
                    li.style.fontWeight = 'bold';
                    li.style.color = player.color;
                }
                leaderboardList.appendChild(li);
            });
        }
    }
    function drawGridAndBorders() {
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.scale(camera.zoom, camera.zoom);
        ctx.translate(-camera.x, -camera.y);

        const viewLeft = camera.x - (canvas.width / 2) / camera.zoom;
        const viewTop = camera.y - (canvas.height / 2) / camera.zoom;
        const viewRight = camera.x + (canvas.width / 2) / camera.zoom;
        const viewBottom = camera.y + (canvas.height / 2) / camera.zoom;

        ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1 / camera.zoom;
        const startGridX = Math.floor(viewLeft / GRID_SIZE) * GRID_SIZE;
        const endGridX = Math.ceil(viewRight / GRID_SIZE) * GRID_SIZE;
        const startGridY = Math.floor(viewTop / GRID_SIZE) * GRID_SIZE;
        const endGridY = Math.ceil(viewBottom / GRID_SIZE) * GRID_SIZE;

        for (let x = startGridX; x < endGridX; x += GRID_SIZE) {
            if (x < 0 || x > MAP_WIDTH) continue;
            ctx.beginPath(); ctx.moveTo(x, Math.max(0, viewTop)); ctx.lineTo(x, Math.min(MAP_HEIGHT, viewBottom)); ctx.stroke();
        }
        for (let y = startGridY; y < endGridY; y += GRID_SIZE) {
            if (y < 0 || y > MAP_HEIGHT) continue;
            ctx.beginPath(); ctx.moveTo(Math.max(0, viewLeft), y); ctx.lineTo(Math.min(MAP_WIDTH, viewRight), y); ctx.stroke();
        }

        ctx.strokeStyle = '#333'; ctx.lineWidth = Math.max(2, 10 / camera.zoom);
        ctx.strokeRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
        ctx.restore();
    }

    function gameLoop(timestamp) {
        const dt = Math.min(50, timestamp - lastFrameTime); // Cap delta time to prevent large jumps
        const dtFrameFactor = dt / (1000 / 60); // Factor for 60 FPS baseline
        lastFrameTime = timestamp;

        updateWorldMouseCoords();

        const now = Date.now();
        if (now - lastDecayTime > MASS_DECAY_INTERVAL) {
            if (player && !isPlayerDead) player.applyMassDecay();
            bots.forEach(bot => bot.applyMassDecay());
            lastDecayTime = now;
        }
        if (now - lastFoodSpawnTime > FOOD_SPAWN_INTERVAL) { spawnFood(); lastFoodSpawnTime = now; }
        if (now - lastVirusSpawnTime > VIRUS_SPAWN_INTERVAL) { spawnVirus(); lastVirusSpawnTime = now; }

        for (let i = spewedMasses.length - 1; i >= 0; i--) {
            spewedMasses[i].update(dt, dtFrameFactor);
            if (spewedMasses[i].lifeTimer <= 0) spewedMasses.splice(i, 1);
        }
        viruses.forEach(v => {
            v.animateRadiusLogic(dtFrameFactor);
            if (v.ejectionTimer > 0) { // Viruses can also eject (when shot from another virus)
                v.x += v.ejectionVx * dtFrameFactor; v.y += v.ejectionVy * dtFrameFactor;
                v.ejectionTimer -= dt;
                v.ejectionVx *= CELL_EJECTION_DAMPING; v.ejectionVy *= CELL_EJECTION_DAMPING; // Use same damping as cells
                v.x = Math.max(v.radius, Math.min(v.x, MAP_WIDTH - v.radius));
                v.y = Math.max(v.radius, Math.min(v.y, MAP_HEIGHT - v.radius));
                if (v.ejectionTimer <= 0 || (Math.abs(v.ejectionVx) < 0.1 && Math.abs(v.ejectionVy) < 0.1)) {
                    v.ejectionTimer = 0; v.ejectionVx = 0; v.ejectionVy = 0;
                }
            }
        });

        if (player && !isPlayerDead) {
            player.update(dt, dtFrameFactor);
            if (player.cells.length === 0 && player.getTotalMass() === 0) { // Player truly dead
                isPlayerDead = true;
                playerRespawnTimer = PLAYER_RESPAWN_DELAY;
                gameOverMessage.querySelector('h2').textContent = "You were eaten!";
                gameOverMessage.style.display = 'block'; // Show game over immediately
            }
        } else if (isPlayerDead) {
            playerRespawnTimer -= dt;
            if (playerRespawnTimer <= 0) {
                // Don't auto-respawn here. Player clicks "Play Again"
                // gameOverMessage.style.display = 'block'; // Ensure it's visible
            }
        }
        bots.forEach(bot => bot.update(dt, dtFrameFactor));
        for (let i = bots.length - 1; i >= 0; i--) { // Respawn dead bots
            if (bots[i].cells.length === 0 && bots[i].getTotalMass() === 0) {
                const deadBot = bots[i];
                bots[i] = new PlayerController(deadBot.id, deadBot.name, BOT_START_MASS, getRandomBotColor(), true, currentGameBotAiType); // Use stored AI type
            }
        }

        checkCollisions();
        updateCamera();
        updateHUD();

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawGridAndBorders();

        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.scale(camera.zoom, camera.zoom);
        ctx.translate(-camera.x, -camera.y);

        const renderables = [
            ...food, ...spewedMasses, ...viruses,
            ...(player && !isPlayerDead ? player.cells : []),
            ...bots.flatMap(b => b.cells)
        ];
        renderables.sort((a, b) => a.mass - b.mass); // Draw smaller entities first
        renderables.forEach(e => e.draw(ctx));

        ctx.restore();
        gameLoopId = requestAnimationFrame(gameLoop);
    }
    let lastFrameTime = 0;

    startGameButton.addEventListener('click', initGame);
    restartGameButton.addEventListener('click', () => {
        if (gameLoopId) cancelAnimationFrame(gameLoopId);
        gameOverMessage.style.display = 'none';
        startScreen.style.display = 'block';
        gameContainer.style.display = 'none';
    });
    canvas.addEventListener('mousemove', (e) => {
        screenMouseX = e.clientX; screenMouseY = e.clientY;
    });
    window.addEventListener('keydown', (e) => {
        if (!player || isPlayerDead || player.cells.length === 0) return;
        if (e.key === 'w' || e.key === 'W') player.initiateSpew();
        if (e.code === 'Space') { e.preventDefault(); player.initiateSplit(); }
    });

    function getRandomPastelColor() { return `hsl(${Math.random() * 360},${25 + Math.random() * 70}%,${75 + Math.random() * 10}%)`; }
    function getRandomBotColor() { const c = ['#ff5733', '#33ff57', '#3357ff', '#ff33a1', '#a133ff', '#ffff33', '#ff9033', '#33ffC7', '#f075e6', '#75f0dd']; return c[Math.floor(Math.random() * c.length)]; }
    function darkenColor(color, percent) {
        try {
            if (color.startsWith('#')) {
                let num = parseInt(color.slice(1), 16); let amt = Math.round(2.55 * percent);
                let R = (num >> 16) - amt; let G = (num >> 8 & 0x00FF) - amt; let B = (num & 0x0000FF) - amt;
                R = Math.max(0, Math.min(255, R)); G = Math.max(0, Math.min(255, G)); B = Math.max(0, Math.min(255, B));
                const rHex = R.toString(16).padStart(2, '0'); const gHex = G.toString(16).padStart(2, '0'); const bHex = B.toString(16).padStart(2, '0');
                return `#${rHex}${gHex}${bHex}`;
            } else if (color.startsWith('rgb')) {
                let parts = color.match(/\d+/g).map(Number); let amt = Math.round(2.55 * percent * (255 / 100)); // More accurate darkening for RGB
                parts[0] = Math.max(0, Math.min(255, parts[0] - amt));
                parts[1] = Math.max(0, Math.min(255, parts[1] - amt));
                parts[2] = Math.max(0, Math.min(255, parts[2] - amt));
                return `rgb(${parts[0]},${parts[1]},${parts[2]})`;
            } else if (color.startsWith('hsl')) { // HSL darkening is simpler, just reduce lightness
                let parts = color.match(/(\d+(\.\d+)?)/g).map(Number);
                parts[2] = Math.max(0, Math.min(100, parts[2] - percent));
                return `hsl(${parts[0]},${parts[1]}%,${parts[2]}%)`;
            }
        } catch (error) { /* console.error("Failed to darken color:", color, error); */ return color; }
        return color; // Fallback
    }
});