// bots.js - Defines bot AI logic

var AiTypes = AiTypes || {}; // Ensure AiTypes namespace exists

class RandomBotAI {
    constructor(botController, worldConstants) {
        this.botController = botController;
        this.worldConstants = worldConstants;

        this.targetX = Math.random() * this.worldConstants.MAP_WIDTH;
        this.targetY = Math.random() * this.worldConstants.MAP_HEIGHT;

        this.decisionInterval = 2000 + Math.random() * 3000;
        this.timeSinceLastDecision = 0;

        this.moveTargetRecalculateInterval = 500 + Math.random() * 1000;
        this.timeSinceMoveTargetRecalculate = 0;
    }

    update(dt, allEntities) {
        this.timeSinceLastDecision += dt;
        this.timeSinceMoveTargetRecalculate += dt;

        if (!this.botController.cells || this.botController.cells.length === 0) {
            return;
        }

        const mainCell = this.botController.getCenterOfMassCell();

        if (this.timeSinceMoveTargetRecalculate >= this.moveTargetRecalculateInterval ||
            (mainCell && Math.hypot(mainCell.x - this.targetX, mainCell.y - this.targetY) < 50)) {

            this.timeSinceMoveTargetRecalculate = 0;
            this.moveTargetRecalculateInterval = 500 + Math.random() * 1000;
            this.targetX = Math.random() * this.worldConstants.MAP_WIDTH;
            this.targetY = Math.random() * this.worldConstants.MAP_HEIGHT;
        }
        this.botController.targetX = this.targetX;
        this.botController.targetY = this.targetY;

        if (this.timeSinceLastDecision >= this.decisionInterval) {
            this.timeSinceLastDecision = 0;
            this.decisionInterval = 2000 + Math.random() * 3000;

            const totalMass = this.botController.getTotalMass();
            const canSpew = totalMass >= this.worldConstants.MIN_SPEW_MASS;
            const canSplit = this.botController.cells.length < this.worldConstants.MAX_PLAYER_CELLS &&
                this.botController.cells.some(cell => cell.mass >= this.worldConstants.CELL_MIN_MASS_TO_SPLIT * 2);

            const actionRoll = Math.random();

            if (canSpew && actionRoll < 0.15) {
                this.botController.initiateSpew();
            } else if (canSplit && actionRoll >= 0.15 && actionRoll < 0.25) {
                this.botController.initiateSplit();
            }
        }
    }
}
AiTypes.random = RandomBotAI;

class MinionBotAI {
    constructor(botController, worldConstants) {
        this.botController = botController;
        this.worldConstants = worldConstants;

        this.targetX = Math.random() * this.worldConstants.MAP_WIDTH;
        this.targetY = Math.random() * this.worldConstants.MAP_HEIGHT;

        this.decisionInterval = 400 + Math.random() * 400;
        this.timeSinceLastDecision = 0;

        this.findPlayerCellInterval = 100 + Math.random() * 100;
        this.timeSinceFindPlayerCell = this.findPlayerCellInterval;

        this.currentTargetedPlayerController = null;
        this.currentTargetedPlayerCell = null;

        this.MINION_SPLIT_MASS_THRESHOLD = 50;
        this.SACRIFICE_SPLIT_PROXIMITY_BUFFER = 60;
    }

    update(dt, allEntities) {
        this.timeSinceLastDecision += dt;
        this.timeSinceFindPlayerCell += dt;

        if (!this.botController.cells || this.botController.cells.length === 0) {
            this.currentTargetedPlayerCell = null;
            this.currentTargetedPlayerController = null;
            return;
        }

        const botCom = this.botController.getCenterOfMassCell();

        if (this.timeSinceFindPlayerCell >= this.findPlayerCellInterval) {
            this.timeSinceFindPlayerCell = 0;

            let humanPlayerController = null;
            if (allEntities.players && allEntities.players.length > 0) {
                const potentialHuman = allEntities.players[0];
                if (potentialHuman && !potentialHuman.isBot &&
                    potentialHuman.cells && potentialHuman.cells.length > 0) {
                    humanPlayerController = potentialHuman;
                }
            }
            this.currentTargetedPlayerController = humanPlayerController;

            if (this.currentTargetedPlayerController) {
                let closestPlayerCell = null;
                let minDistanceSq = Infinity;
                for (const playerCell of this.currentTargetedPlayerController.cells) {
                    const dx = playerCell.x - botCom.x;
                    const dy = playerCell.y - botCom.y;
                    const distanceSq = dx * dx + dy * dy;
                    if (distanceSq < minDistanceSq) {
                        minDistanceSq = distanceSq;
                        closestPlayerCell = playerCell;
                    }
                }
                this.currentTargetedPlayerCell = closestPlayerCell;
            } else {
                this.currentTargetedPlayerCell = null;
            }
        } else {
            if (this.currentTargetedPlayerController) {
                if (!this.currentTargetedPlayerController.cells || this.currentTargetedPlayerController.cells.length === 0) {
                    this.currentTargetedPlayerController = null;
                    this.currentTargetedPlayerCell = null;
                } else if (this.currentTargetedPlayerCell) {
                    const cellStillExists = this.currentTargetedPlayerController.cells.find(c => c.id === this.currentTargetedPlayerCell.id);
                    if (!cellStillExists) {
                        this.currentTargetedPlayerCell = null;
                        this.timeSinceFindPlayerCell = this.findPlayerCellInterval;
                    }
                } else if (this.currentTargetedPlayerController.cells.length > 0) {
                    this.timeSinceFindPlayerCell = this.findPlayerCellInterval;
                }
            } else {
                this.currentTargetedPlayerCell = null;
            }
        }

        if (this.currentTargetedPlayerCell) {
            this.targetX = this.currentTargetedPlayerCell.x;
            this.targetY = this.currentTargetedPlayerCell.y;
        } else {
            if (this.timeSinceFindPlayerCell === 0 || Math.hypot(botCom.x - this.targetX, botCom.y - this.targetY) < 50) {
                this.targetX = this.worldConstants.MAP_WIDTH / 2 + (Math.random() - 0.5) * 500;
                this.targetY = this.worldConstants.MAP_HEIGHT / 2 + (Math.random() - 0.5) * 500;
            }
        }
        this.botController.targetX = this.targetX;
        this.botController.targetY = this.targetY;

        if (this.timeSinceLastDecision >= this.decisionInterval) {
            this.timeSinceLastDecision = 0;

            if (this.currentTargetedPlayerController && this.currentTargetedPlayerCell) {
                const playerCell = this.currentTargetedPlayerCell;
                const cellsToConsiderSplitting = [...this.botController.cells];

                for (const botCell of cellsToConsiderSplitting) {
                    if (!this.botController.cells.includes(botCell)) continue;
                    if (this.botController.cells.length >= this.worldConstants.MAX_PLAYER_CELLS) break;

                    const distanceToPlayerSq = (botCell.x - playerCell.x) ** 2 + (botCell.y - playerCell.y) ** 2;
                    const proximityForSplitSq = (playerCell.radius + botCell.radius + this.SACRIFICE_SPLIT_PROXIMITY_BUFFER) ** 2;

                    if (botCell.mass >= this.MINION_SPLIT_MASS_THRESHOLD &&
                        botCell.mass >= this.worldConstants.CELL_MIN_MASS_TO_SPLIT &&
                        distanceToPlayerSq < proximityForSplitSq) {

                        this.botController.initiateSplit();
                        this.timeSinceLastDecision = -this.decisionInterval / 2;
                        return;
                    }
                }
            }
        }
    }
}
AiTypes.minion = MinionBotAI;


class AggressiveBotAI {
    constructor(botController, worldConstants) {
        this.botController = botController;
        this.worldConstants = worldConstants;

        this.targetX = Math.random() * this.worldConstants.MAP_WIDTH;
        this.targetY = Math.random() * this.worldConstants.MAP_HEIGHT;
        this.currentMode = "ROAM";

        this.decisionInterval = 150 + Math.random() * 150; // Faster decisions: 0.15-0.3s
        this.timeSinceLastDecision = 0;

        // --- Core Parameters ---
        this.VIEW_RADIUS_SQUARED = (850) ** 2;
        this.EAT_RATIO = worldConstants.EAT_MASS_RATIO || 1.3;
        this.FLEE_RATIO = 1.35; // If enemyCell.mass / botLargestCell.mass > this ratio, it's a threat.

        // --- Fleeing & Safety ---
        this.FLEE_IMMEDIATE_DANGER_PROXIMITY_SQUARED = (280) ** 2; // Critical distance for immediate flee
        this.FLEE_DOMINANT_PLAYER_PROXIMITY_SQUARED = (450) ** 2; // Flee from generally dominant players if they get this close
        this.WALL_DODGE_MARGIN = 60; // How far to stay from walls when fleeing/maneuvering near them
        this.SAFE_FLEE_POINT_CHECKS = 7; // Number of directions to check for safe flee spots (odd number preferred for symmetry)
        this.VIRUS_DODGE_FLEE_PENALTY_FACTOR = 0.2; // Factor to penalize flee paths through dangerous viruses

        // --- Attacking ---
        this.ATTACK_SPLIT_MASS_ADVANTAGE = 1.6; // Bot total mass vs target cell mass for split attack
        this.ATTACK_SPLIT_PROXIMITY_SQUARED = (250) ** 2; // Closer proximity for split attacking
        this.PURSUE_PLAYER_MIN_BOT_MASS = 70;
        this.RISKY_ATTACK_THREAT_PROXIMITY_SQUARED = (350) ** 2; // If a threat is this close to target, attack is risky

        // --- Virus Interaction ---
        this.VIRUS_EAT_MIN_BOT_MASS = 135; // Min bot total mass to consider eating a virus
        this.VIRUS_DANGER_CHECK_RADIUS_SQUARED = (500) ** 2; // Radius to check for dangerous players near a virus
        this.VIRUS_COMPETITOR_CHECK_RADIUS_SQUARED = (300) ** 2; // Radius to check for any competitor near a virus

        // --- Food & Roaming ---
        this.FOOD_PRIORITY_MAX_MASS = 200;
        this.FOOD_SAFETY_THREAT_PROXIMITY_SQUARED = (250) ** 2;

        // --- Cell Management ---
        this.DEFENSIVE_SPLIT_MAX_CELLS = 4; // Don't defensively split if already this many cells or more
        this.DEFENSIVE_SPLIT_MIN_MASS = 150; // Min total mass to consider a defensive split
        this.DEFENSIVE_SPLIT_THREAT_MASS_RATIO = 1.5; // Threat total mass must be this much larger than bot total mass
    }

    distSq(x1, y1, x2, y2) { return (x1 - x2) ** 2 + (y1 - y2) ** 2; }

    normalizeAngle(angle) {
        while (angle > Math.PI) angle -= 2 * Math.PI;
        while (angle < -Math.PI) angle += 2 * Math.PI;
        return angle;
    }

    findClosest(entityList, sourceX, sourceY, filterFn = null) {
        let closest = null;
        let minDSq = Infinity;
        for (const entity of entityList) {
            if (filterFn && !filterFn(entity)) continue;
            const dSq = this.distSq(sourceX, sourceY, entity.x, entity.y);
            if (dSq < minDSq) {
                minDSq = dSq;
                closest = entity;
            }
        }
        return { entity: closest, distanceSq: minDSq };
    }

    analyzeEnvironment(allEntities, botCom, botCells, botTotalMass, botLargestCell) {
        const visiblePlayers = allEntities.players.filter(p => p.id !== this.botController.id && p.cells.length > 0);
        let threatCells = [];       // Individual enemy cells that can eat bot's largest cell
        let targetCells = [];       // Individual enemy cells bot can eat
        let dominantThreatPlayers = []; // Enemy players who are significantly larger and pose a general threat

        for (const player of visiblePlayers) {
            let playerTotalVisibleMass = 0;
            let playerCellsInView = [];
            let closestPlayerCellDistSqToBotCom = Infinity;
            let canPlayerEatBotLargest = false;

            for (const enemyCell of player.cells) {
                const dSq = this.distSq(botCom.x, botCom.y, enemyCell.x, enemyCell.y);
                if (dSq < this.VIEW_RADIUS_SQUARED) {
                    playerCellsInView.push({ ...enemyCell, dSqToBotCom: dSq }); // Store distance for sorting later
                    playerTotalVisibleMass += enemyCell.mass;
                    closestPlayerCellDistSqToBotCom = Math.min(closestPlayerCellDistSqToBotCom, dSq);

                    if (botLargestCell && enemyCell.mass > botLargestCell.mass * this.FLEE_RATIO) {
                        threatCells.push({ ...enemyCell, ownerId: player.id, dSqToBotCom: dSq });
                        canPlayerEatBotLargest = true;
                    }

                    if (botCells.some(bc => bc.mass >= enemyCell.mass * this.EAT_RATIO)) {
                        targetCells.push({ ...enemyCell, ownerId: player.id, dSqToBotCom: dSq });
                    }
                }
            }

            if (playerCellsInView.length > 0 && canPlayerEatBotLargest &&
                playerTotalVisibleMass > botTotalMass * this.FLEE_RATIO &&
                closestPlayerCellDistSqToBotCom < this.FLEE_DOMINANT_PLAYER_PROXIMITY_SQUARED * 1.2) { // A bit more lenient for adding to dominant list
                dominantThreatPlayers.push({
                    id: player.id,
                    cells: playerCellsInView,
                    totalVisibleMass: playerTotalVisibleMass,
                    closestCellDistSqToBotCom: closestPlayerCellDistSqToBotCom,
                    comX: playerCellsInView.reduce((sum, cell) => sum + cell.x * cell.mass, 0) / playerTotalVisibleMass,
                    comY: playerCellsInView.reduce((sum, cell) => sum + cell.y * cell.mass, 0) / playerTotalVisibleMass
                });
            }
        }

        threatCells.sort((a, b) => a.dSqToBotCom - b.dSqToBotCom);
        targetCells.sort((a, b) => a.dSqToBotCom - b.dSqToBotCom);
        dominantThreatPlayers.sort((a, b) => a.closestCellDistSqToBotCom - b.closestCellDistSqToBotCom);

        const visibleFood = allEntities.food.filter(f => this.distSq(botCom.x, botCom.y, f.x, f.y) < this.VIEW_RADIUS_SQUARED);
        const visibleViruses = allEntities.viruses.filter(v => this.distSq(botCom.x, botCom.y, v.x, v.y) < this.VIEW_RADIUS_SQUARED);

        return {
            threatCells,
            targetCells,
            dominantThreatPlayers,
            closestFood: this.findClosest(visibleFood, botCom.x, botCom.y),
            closestVirus: this.findClosest(visibleViruses, botCom.x, botCom.y),
            allVisiblePlayers: visiblePlayers // For general competitor checks
        };
    }

    getSafeFleeTarget(botCom, primaryThreatSource, allThreatCells, allEntities) {
        let bestFleeX = botCom.x;
        let bestFleeY = botCom.y;
        let maxSafestScore = -Infinity; // Higher is better (further from threats, fewer penalties)

        // Determine the primary direction to flee from (away from the source that triggered flee)
        const fleeAngleFromPrimary = Math.atan2(botCom.y - primaryThreatSource.y, botCom.x - primaryThreatSource.x);
        const fleeDistance = Math.sqrt(this.VIEW_RADIUS_SQUARED) * 0.8; // How far to project flee points

        for (let i = 0; i < this.SAFE_FLEE_POINT_CHECKS; i++) {
            // Check directions spread around the primary flee angle
            // (i / (CHECK_COUNT-1) - 0.5) generates values from -0.5 to 0.5
            // Multiplied by Math.PI gives a 180-degree fan
            const angleOffset = this.SAFE_FLEE_POINT_CHECKS === 1 ? 0 :
                (i / (this.SAFE_FLEE_POINT_CHECKS - 1) - 0.5) * Math.PI;
            const fleeAngle = this.normalizeAngle(fleeAngleFromPrimary + angleOffset);

            let testX = botCom.x + Math.cos(fleeAngle) * fleeDistance;
            let testY = botCom.y + Math.sin(fleeAngle) * fleeDistance;

            // Clamp to map boundaries with margin
            testX = Math.max(this.WALL_DODGE_MARGIN, Math.min(testX, this.worldConstants.MAP_WIDTH - this.WALL_DODGE_MARGIN));
            testY = Math.max(this.WALL_DODGE_MARGIN, Math.min(testY, this.worldConstants.MAP_HEIGHT - this.WALL_DODGE_MARGIN));

            let currentPathMinDistSqToThreat = Infinity;
            let virusPenalty = 0;

            // Evaluate this projected point against all known threats
            for (const threat of allThreatCells) {
                const dSq = this.distSq(testX, testY, threat.x, threat.y);
                currentPathMinDistSqToThreat = Math.min(currentPathMinDistSqToThreat, dSq);
            }

            // Check for viruses in this path that the bot would pop
            if (this.botController.getTotalMass() > (this.worldConstants.VIRUS_MASS_ABSORBED || 100) * 1.1) { // Approximate, bot mass > virus mass
                for (const virus of allEntities.viruses) {
                    // Simplified: if virus is near the projected path and bot would pop it
                    const distToVirusSq = this.distSq(botCom.x + Math.cos(fleeAngle) * fleeDistance / 2, // Check midpoint too
                        botCom.y + Math.sin(fleeAngle) * fleeDistance / 2,
                        virus.x, virus.y);
                    if (distToVirusSq < (virus.radius * 2.5) ** 2) { // If virus is near the path segment
                        const botToVirusAngle = Math.atan2(virus.y - botCom.y, virus.x - botCom.x);
                        const angleDiffToPath = Math.abs(this.normalizeAngle(fleeAngle - botToVirusAngle));
                        if (angleDiffToPath < Math.PI / 3) { // Virus is roughly in the flee direction
                            virusPenalty += currentPathMinDistSqToThreat * this.VIRUS_DODGE_FLEE_PENALTY_FACTOR; // Penalize score
                            break; // One problematic virus is enough for this path check
                        }
                    }
                }
            }

            const pathScore = currentPathMinDistSqToThreat - virusPenalty;

            if (pathScore > maxSafestScore) {
                maxSafestScore = pathScore;
                bestFleeX = testX;
                bestFleeY = testY;
            }
        }
        return { x: bestFleeX, y: bestFleeY };
    }

    isActionSafe(actionPointX, actionPointY, envAnalysis, safetyMarginSqMultiplier = 1) {
        const botCom = this.botController.getCenterOfMassCell();
        const distBotToActionPtSq = this.distSq(botCom.x, botCom.y, actionPointX, actionPointY);

        for (const threat of envAnalysis.threatCells) {
            const distThreatToActionPtSq = this.distSq(threat.x, threat.y, actionPointX, actionPointY);
            // If threat is closer to action point than bot, or very close to action point
            if (distThreatToActionPtSq < this.RISKY_ATTACK_THREAT_PROXIMITY_SQUARED * safetyMarginSqMultiplier ||
                (distThreatToActionPtSq < distBotToActionPtSq * 0.8 && distThreatToActionPtSq < (threat.radius * 5) ** 2)) { // Threat can intercept
                return false;
            }
        }
        for (const domPlayer of envAnalysis.dominantThreatPlayers) {
            const distDomPlayerToActionPtSq = this.distSq(domPlayer.comX, domPlayer.comY, actionPointX, actionPointY);
            if (distDomPlayerToActionPtSq < this.RISKY_ATTACK_THREAT_PROXIMITY_SQUARED * 1.5 * safetyMarginSqMultiplier) {
                return false;
            }
        }
        return true;
    }

    isVirusZoneSafe(virusEntity, envAnalysis) {
        for (const threatCell of envAnalysis.threatCells) {
            if (this.distSq(threatCell.x, threatCell.y, virusEntity.x, virusEntity.y) < this.VIRUS_DANGER_CHECK_RADIUS_SQUARED) {
                return false;
            }
        }
        for (const player of envAnalysis.allVisiblePlayers) { // Check all other players, not just threats
            for (const enemyCell of player.cells) {
                if (this.distSq(enemyCell.x, enemyCell.y, virusEntity.x, virusEntity.y) < this.VIRUS_COMPETITOR_CHECK_RADIUS_SQUARED) {
                    // If competitor is large enough to be a nuisance after virus pop
                    if (enemyCell.mass * this.EAT_RATIO > (this.botController.getTotalMass() / (this.worldConstants.VIRUS_MAX_SPLIT || 15)) ||
                        enemyCell.mass > 60) {
                        return false;
                    }
                }
            }
        }
        return true;
    }


    update(dt, allEntities) {
        this.timeSinceLastDecision += dt;

        const botCells = this.botController.cells;
        if (!botCells || botCells.length === 0) {
            this.currentMode = "ROAM"; // Reset mode if dead
            this.targetX = Math.random() * this.worldConstants.MAP_WIDTH; // Pick new random target
            this.targetY = Math.random() * this.worldConstants.MAP_HEIGHT;
            return;
        }

        if (this.timeSinceLastDecision >= this.decisionInterval) {
            this.timeSinceLastDecision = 0;

            const botCom = this.botController.getCenterOfMassCell();
            const botTotalMass = this.botController.getTotalMass();
            const botLargestCell = botCells.reduce((largest, cell) => cell.mass > (largest.mass || 0) ? cell : largest, { mass: 0 });

            const env = this.analyzeEnvironment(allEntities, botCom, botCells, botTotalMass, botLargestCell);

            let newTargetX = this.targetX; // Default to previous target
            let newTargetY = this.targetY;
            let actionTaken = false;
            let newMode = "ROAM"; // Default mode

            // --- PRIORITY 0: CRITICAL FLEEING & DEFENSIVE ACTIONS ---
            const closestThreatCell = env.threatCells.length > 0 ? env.threatCells[0] : null;
            const closestDominantPlayer = env.dominantThreatPlayers.length > 0 ? env.dominantThreatPlayers[0] : null;

            let fleeSource = null;
            if (closestThreatCell && closestThreatCell.dSqToBotCom < this.FLEE_IMMEDIATE_DANGER_PROXIMITY_SQUARED) {
                fleeSource = closestThreatCell; // Immediate cell threat
                newMode = "FLEE_CRITICAL_CELL";
            } else if (closestDominantPlayer && closestDominantPlayer.closestCellDistSqToBotCom < this.FLEE_DOMINANT_PLAYER_PROXIMITY_SQUARED) {
                fleeSource = { x: closestDominantPlayer.comX, y: closestDominantPlayer.comY }; // Dominant player threat
                newMode = "FLEE_DOMINANT_PLAYER";
            }

            if (fleeSource) {
                // Consider defensive split if under extreme pressure
                if (botCells.length < this.worldConstants.MAX_PLAYER_CELLS &&
                    botCells.length < this.DEFENSIVE_SPLIT_MAX_CELLS &&
                    botTotalMass >= this.DEFENSIVE_SPLIT_MIN_MASS &&
                    botLargestCell.mass >= this.worldConstants.CELL_MIN_MASS_TO_SPLIT * 2 &&
                    closestDominantPlayer && // Only split defensively against a dominant player or very large single cell
                    (closestDominantPlayer.totalVisibleMass > botTotalMass * this.DEFENSIVE_SPLIT_THREAT_MASS_RATIO ||
                        (closestThreatCell && closestThreatCell.mass > botTotalMass * this.DEFENSIVE_SPLIT_THREAT_MASS_RATIO))
                ) {
                    this.botController.initiateSplit();
                    newMode = newMode + "_SPLIT";
                }

                const fleeTarget = this.getSafeFleeTarget(botCom, fleeSource, env.threatCells, allEntities);
                newTargetX = fleeTarget.x;
                newTargetY = fleeTarget.y;
                actionTaken = true;
            }


            // --- PRIORITY 1: GENERAL THREAT AVOIDANCE (if not critically fleeing) ---
            if (!actionTaken && env.threatCells.length > 0) {
                // If any threat cell exists, consider it a reason to be cautious and potentially reposition.
                // Use the closest threat cell as the primary one to move away from.
                const generalFleeTarget = this.getSafeFleeTarget(botCom, env.threatCells[0], env.threatCells, allEntities);
                newTargetX = generalFleeTarget.x;
                newTargetY = generalFleeTarget.y;
                newMode = "FLEE_GENERAL";
                actionTaken = true;
            }

            // --- PRIORITY 2: ATTACK TARGET WITH SPLIT (if safe) ---
            const closestTargetToEat = env.targetCells.length > 0 ? env.targetCells[0] : null;
            if (!actionTaken && closestTargetToEat && botTotalMass > this.PURSUE_PLAYER_MIN_BOT_MASS) {
                const canSplitKill = botCells.some(bc =>
                    bc.mass / 2 > closestTargetToEat.mass * this.EAT_RATIO &&
                    bc.mass >= this.worldConstants.CELL_MIN_MASS_TO_SPLIT &&
                    closestTargetToEat.dSqToBotCom < this.ATTACK_SPLIT_PROXIMITY_SQUARED
                );

                if (canSplitKill &&
                    botTotalMass >= closestTargetToEat.mass * this.ATTACK_SPLIT_MASS_ADVANTAGE &&
                    botCells.length < this.worldConstants.MAX_PLAYER_CELLS &&
                    this.isActionSafe(closestTargetToEat.x, closestTargetToEat.y, env)
                ) {
                    newTargetX = closestTargetToEat.x;
                    newTargetY = closestTargetToEat.y;
                    this.botController.initiateSplit();
                    newMode = "ATTACK_SPLIT";
                    actionTaken = true;
                }
            }

            // --- PRIORITY 3: HUNT SMALLER PLAYER (if safe) ---
            if (!actionTaken && closestTargetToEat && botTotalMass > this.PURSUE_PLAYER_MIN_BOT_MASS) {
                if (this.isActionSafe(closestTargetToEat.x, closestTargetToEat.y, env)) {
                    newTargetX = closestTargetToEat.x;
                    newTargetY = closestTargetToEat.y;
                    newMode = "HUNT_PLAYER";
                    actionTaken = true;
                }
            }

            // --- PRIORITY 4: EAT VIRUS (if safe and beneficial) ---
            if (!actionTaken && env.closestVirus.entity && botTotalMass >= this.VIRUS_EAT_MIN_BOT_MASS) {
                const virus = env.closestVirus.entity;
                const canPopVirus = botCells.some(c => c.mass >= virus.mass * this.EAT_RATIO);
                const cellsAfterPop = botCells.length + (this.worldConstants.VIRUS_MAX_SPLIT || 15) - 1; // Approximation

                if (canPopVirus && cellsAfterPop <= this.worldConstants.MAX_PLAYER_CELLS &&
                    this.isVirusZoneSafe(virus, env)) {
                    newTargetX = virus.x;
                    newTargetY = virus.y;
                    newMode = "EAT_VIRUS";
                    actionTaken = true;
                }
            }

            // --- PRIORITY 5: HUNT FOOD (if low mass or no other actions and safe) ---
            if (!actionTaken && env.closestFood.entity) {
                const foodIsPriority = botTotalMass < this.FOOD_PRIORITY_MAX_MASS;
                const noMajorThreats = env.threatCells.length === 0 && env.dominantThreatPlayers.length === 0;

                if (foodIsPriority || noMajorThreats) {
                    // Check if food is near a threat
                    let foodZoneSafe = true;
                    for (const threat of env.threatCells) {
                        if (this.distSq(env.closestFood.entity.x, env.closestFood.entity.y, threat.x, threat.y) < this.FOOD_SAFETY_THREAT_PROXIMITY_SQUARED) {
                            foodZoneSafe = false;
                            break;
                        }
                    }
                    if (foodZoneSafe && this.isActionSafe(env.closestFood.entity.x, env.closestFood.entity.y, env, 0.8)) { // Slightly more lenient safety for food
                        newTargetX = env.closestFood.entity.x;
                        newTargetY = env.closestFood.entity.y;
                        newMode = "HUNT_FOOD";
                        actionTaken = true;
                    }
                }
            }

            // --- PRIORITY 6: ROAM (if nothing else to do) ---
            if (!actionTaken) {
                newMode = "ROAM";
                // If reached current roam target or it's invalid, pick a new one.
                if (this.distSq(botCom.x, botCom.y, this.targetX, this.targetY) < (150 ** 2) ||
                    this.targetX === botCom.x && this.targetY === botCom.y || // At target
                    this.currentMode !== "ROAM") { // Or switched from another mode to roam

                    // Simple random roam, could be improved (e.g. roam towards less dense areas)
                    const roamDist = Math.sqrt(this.VIEW_RADIUS_SQUARED) * 0.6;
                    newTargetX = botCom.x + (Math.random() - 0.5) * roamDist * 2;
                    newTargetY = botCom.y + (Math.random() - 0.5) * roamDist * 2;
                } else {
                    // Continue towards existing roam target
                    newTargetX = this.targetX;
                    newTargetY = this.targetY;
                }
            }

            // Spew mass logic (remains simple for now)
            if (newMode !== "FLEE_CRITICAL_CELL" && newMode !== "FLEE_DOMINANT_PLAYER" && !newMode.includes("SPLIT") &&
                botTotalMass > this.worldConstants.MIN_SPEW_MASS * 4 && // Needs significant excess mass
                Math.random() < 0.01 && // Low chance
                botCells.some(cell => cell.mass > this.worldConstants.MIN_SPEW_MASS * 2)) {
                this.botController.initiateSpew();
            }

            this.currentMode = newMode;
            this.targetX = Math.max(0, Math.min(newTargetX, this.worldConstants.MAP_WIDTH));
            this.targetY = Math.max(0, Math.min(newTargetY, this.worldConstants.MAP_HEIGHT));
        }

        this.botController.targetX = this.targetX;
        this.botController.targetY = this.targetY;
    }
}
AiTypes.aggressive = AggressiveBotAI;
