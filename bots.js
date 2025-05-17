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
                this.botController.cells.some(cell => cell.mass >= this.worldConstants.CELL_MIN_MASS_TO_SPLIT_FROM * 2);

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
        if (!botCom) {
            this.currentTargetedPlayerCell = null;
            this.currentTargetedPlayerController = null;
            return;
        }


        if (this.timeSinceFindPlayerCell >= this.findPlayerCellInterval) {
            this.timeSinceFindPlayerCell = 0;

            let humanPlayerController = null;
            if (allEntities.players && allEntities.players.length > 0) {
                const potentialHuman = allEntities.players.find(p => p && !p.isBot);
                if (potentialHuman && potentialHuman.cells && potentialHuman.cells.length > 0) {
                    humanPlayerController = potentialHuman;
                }
            }
            this.currentTargetedPlayerController = humanPlayerController;

            if (this.currentTargetedPlayerController) {
                let closestPlayerCell = null;
                let minDistanceSq = Infinity;
                for (const playerCell of this.currentTargetedPlayerController.cells) {
                    if (!playerCell) continue;
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
                    const cellStillExists = this.currentTargetedPlayerController.cells.find(c => c && c.id === this.currentTargetedPlayerCell.id);
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
            if (this.timeSinceFindPlayerCell === 0 ||
                (botCom && Math.hypot(botCom.x - this.targetX, botCom.y - this.targetY) < 50)) {
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
                    if (!botCell) continue;
                    if (!this.botController.cells.find(c => c && c.id === botCell.id)) continue;

                    if (this.botController.cells.length >= this.worldConstants.MAX_PLAYER_CELLS) break;

                    const distanceToPlayerSq = (botCell.x - playerCell.x) ** 2 + (botCell.y - playerCell.y) ** 2;
                    const R1_factor = this.worldConstants.CELL_RADIUS_MASS_FACTOR || 1;
                    const R2_factor = this.worldConstants.CELL_RADIUS_MASS_FACTOR || 1;

                    const R1 = playerCell.radius || Math.sqrt(playerCell.mass / Math.PI) * R1_factor;
                    const R2 = botCell.radius || Math.sqrt(botCell.mass / Math.PI) * R2_factor;

                    const proximityForSplitSq = (R1 + R2 + this.SACRIFICE_SPLIT_PROXIMITY_BUFFER) ** 2;

                    const canFundamentalSplit = botCell.mass >= this.worldConstants.CELL_MIN_MASS_TO_SPLIT_FROM &&
                        (botCell.mass / 2) >= this.worldConstants.MIN_MASS_PER_SPLIT_PIECE;

                    if (botCell.mass >= this.MINION_SPLIT_MASS_THRESHOLD &&
                        canFundamentalSplit &&
                        distanceToPlayerSq < proximityForSplitSq) {

                        this.botController.targetX = playerCell.x;
                        this.botController.targetY = playerCell.y;
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
// Inside AggressiveBotAI class update method:
// Add this new timer update at the beginning of update()
        this.timeSinceLastAntiBlobSplit += dt;


// Inside 'SEEKING_FOOD': case 'IDLE_WANDER': block in update()

                // ... (Critical Threat Assessment - same) ...
                let isCriticallyDangerousNearby = false; /* ... */
                let isSignificantlyDangerousNearby = false; /* ... */
                let largestThreatNearby = null; /* ... */
                // ... (Threat assessment logic - same as before) ...
                if (isCriticallyDangerousNearby) { /* ... */ }


                // --- START: Finisher Mode Target Prioritization ---
                let isFinisherModeActive = false;
                let bestFinisherTargetScore = -Infinity;
                let finisherTargetCell = null;
                let finisherTargetController = null;

                if (!isCriticallyDangerousNearby) { // Don't enter finisher mode if critically dangerous
                    for (const oppCtrl of allEntities.players) {
                        if (oppCtrl.id === this.botController.id || !oppCtrl.cells || oppCtrl.cells.length === 0) continue;
                        const oppTotalMass = oppCtrl.getTotalMass();
                        if (oppTotalMass < botTotalMass * this.FINISHER_MODE_OPPONENT_MAX_MASS_RATIO ||
                            oppTotalMass < this.FINISHER_MODE_OPPONENT_ABSOLUTE_MAX_MASS) {
                            
                            for (const oppCell of oppCtrl.cells) {
                                if (oppCell.mass <=0) continue;
                                // Check if any of bot's cells can eat this finisher target cell
                                let canEatFinisherCell = false;
                                for(const botCell of this.botController.cells) {
                                    if (botCell.mass > oppCell.mass * this.worldConstants.EAT_MASS_RATIO * this.HUNT_EAT_MASS_RATIO_ADVANTAGE) {
                                        canEatFinisherCell = true;
                                        break;
                                    }
                                }
                                if (!canEatFinisherCell && botCellCount < this.worldConstants.MAX_PLAYER_CELLS) { // Maybe can split-eat
                                     for(const botCell of this.botController.cells) {
                                        if (botCell.mass / 2 > oppCell.mass * this.worldConstants.EAT_MASS_RATIO * this.SPLIT_TO_HUNT_MIN_MASS_ADVANTAGE_POST_SPLIT * (1/this.FINISHER_MODE_RISK_ACCEPTANCE_FACTOR_SPLIT)) {
                                            canEatFinisherCell = true; // Potential split-eat
                                            break;
                                        }
                                     }
                                }

                                if (canEatFinisherCell) {
                                    const distSq = (botCom.x - oppCell.x)**2 + (botCom.y - oppCell.y)**2;
                                    const score = (oppCell.mass / (distSq + 1)) * this.FINISHER_MODE_HUNT_PRIORITY_MULTIPLIER;
                                    if (score > bestFinisherTargetScore) {
                                        // Basic safety: is the target itself near a HUGE threat to the bot?
                                        let finisherTargetCampedBySuperThreat = false;
                                        for(const otherThreat of threateningOpponentCells) {
                                            if(otherThreat.ownerId === oppCtrl.id) continue; // ignore parts of the finisher target itself
                                            if(otherThreat.opponentTotalMass > botTotalMass * 1.5) { // Super threat
                                                const distSqSuperThreatToFinisher = (otherThreat.x - oppCell.x)**2 + (otherThreat.y - oppCell.y)**2;
                                                if(distSqSuperThreatToFinisher < (otherThreat.radius + oppCell.radius + this.FOOD_SAFETY_BUFFER_EATER * 2.0)**2) {
                                                    finisherTargetCampedBySuperThreat = true;
                                                    break;
                                                }
                                            }
                                        }
                                        if (!finisherTargetCampedBySuperThreat) {
                                            bestFinisherTargetScore = score;
                                            finisherTargetCell = oppCell;
                                            finisherTargetController = oppCtrl;
                                            isFinisherModeActive = true;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                if (isFinisherModeActive && finisherTargetCell && finisherTargetController) {
                    this.currentTargetOpponentCell = finisherTargetCell;
                    this.currentTargetOpponentController = finisherTargetController;
                    decidedToHuntOpponentThisFrame = true; // Use the existing hunt flag
                    this.currentAIState = 'HUNTING_OPPONENT'; // Reuse hunting state
                    this.stateTimer = 7000; // Longer timer for finishing
                    this.targetX = this.currentTargetOpponentCell.x;
                    this.targetY = this.currentTargetOpponentCell.y;
                    this.botController.targetX = this.targetX;
                    this.botController.targetY = this.targetY;
                    this.currentTargetFood = null;
                    this.currentTargetVirus = null;
                    // Split-to-hunt logic for finisher targets (slightly more aggressive)
                    // (This would be similar to the existing split-to-hunt but might use FINISHER_MODE_RISK_ACCEPTANCE_FACTOR)
                    // For brevity, the detailed split-to-hunt for finisher is an extension of existing logic.
                }
                // --- END: Finisher Mode ---


                // Opponent Hunting Logic (Standard, if not in finisher mode)
                if (!isFinisherModeActive && !isCriticallyDangerousNearby && this.currentAIState !== 'CONSOLIDATING_DEFENSIVELY') {
                    // ... (existing standard opponent hunting logic - findBestHuntTarget, split-to-hunt)
                    // ... this sets decidedToHuntOpponentThisFrame
                    if (this.timeSinceLastOpponentRecheck >= this.RECHECK_OPPONENT_TARGET_INTERVAL_MAX || !this.currentTargetOpponentCell || !this.isValidHuntTarget(this.currentTargetOpponentCell, this.currentTargetOpponentController, allEntities, botCom)) {
                        this.timeSinceLastOpponentRecheck = 0;
                        this.findBestHuntTarget(allEntities, botCom, threateningOpponentCells); // This will set currentTargetOpponentCell and currentTargetOpponentController
                    }

                    if (this.currentTargetOpponentCell && this.currentTargetOpponentController) {
                        this.targetX = this.currentTargetOpponentCell.x;
                        this.targetY = this.currentTargetOpponentCell.y;
                        this.botController.targetX = this.targetX; 
                        this.botController.targetY = this.targetY;
                        decidedToHuntOpponentThisFrame = true;
                        this.currentAIState = 'HUNTING_OPPONENT'; 
                        this.stateTimer = 5000; 
                        this.currentTargetFood = null; 
                        this.currentTargetVirus = null; 

                        let currentGeneralSplitCooldownHunt = this.GENERAL_SPLIT_COOLDOWN_MS;
                        if (isMobilitySplitFavoredByLowMergeCD) { currentGeneralSplitCooldownHunt *= this.MOBILITY_SPLIT_COOLDOWN_REDUCTION_FACTOR;
                        } else {
                           if (botCellCount > this.HIGH_CELL_COUNT_CAUTIOUS_SPLIT_THRESHOLD) {currentGeneralSplitCooldownHunt *= this.GENERAL_SPLIT_COOLDOWN_MS_HIGH_CELL_COUNT_FACTOR;}
                           if (botTotalMass > this.HIGH_MASS_CAUTIOUS_SPLIT_THRESHOLD) {currentGeneralSplitCooldownHunt *= this.GENERAL_SPLIT_COOLDOWN_MS_HIGH_MASS_FACTOR;}
                        }

                        if (this.timeSinceLastAnySplitAttempt >= currentGeneralSplitCooldownHunt &&
                            this.botController.globalMergeCooldown <= 0 &&
                            botCellCount < this.worldConstants.MAX_PLAYER_CELLS &&
                            !isSignificantlyDangerousNearby) { 

                            for (const botCell of this.botController.cells) {
                                if (botCell.mass < this.worldConstants.CELL_MIN_MASS_TO_SPLIT_FROM ||
                                    (botCell.mass / 2) < this.worldConstants.MIN_MASS_PER_SPLIT_PIECE) continue;

                                const distToTargetSq = (botCell.x - this.currentTargetOpponentCell.x)**2 + (botCell.y - this.currentTargetOpponentCell.y)**2;
                                if (distToTargetSq < (botCell.radius * this.SPLIT_TO_HUNT_MAX_DIST_FACTOR)**2) {
                                    const massAfterSplit = botCell.mass / 2;
                                    const riskFactor = (this.currentAIState === 'HUNTING_OPPONENT' && isFinisherModeActive) ? (1 / this.FINISHER_MODE_RISK_ACCEPTANCE_FACTOR_SPLIT) : 1.0;
                                    if (massAfterSplit > this.currentTargetOpponentCell.mass * this.worldConstants.EAT_MASS_RATIO * this.SPLIT_TO_HUNT_MIN_MASS_ADVANTAGE_POST_SPLIT * riskFactor) {
                                        let opponentCanRetaliatePostSplitHunt = false;
                                        const opponentControllerOfTarget = allEntities.players.find(p => p.id === this.currentTargetOpponentController.id);
                                        if(opponentControllerOfTarget){
                                            const opponentMassAfterTargetEaten = opponentControllerOfTarget.getTotalMass() - this.currentTargetOpponentCell.mass;
                                            if (opponentMassAfterTargetEaten > 0 && opponentControllerOfTarget.cells.length -1 < this.worldConstants.MAX_PLAYER_CELLS && opponentControllerOfTarget.cells.filter(c => c.id !== this.currentTargetOpponentCell.id).length > 0 ) {
                                                const opponentSplitPieceMass = opponentMassAfterTargetEaten / 2;
                                                for (const otherBotCell of this.botController.cells) {
                                                    if (otherBotCell.id === botCell.id) continue;
                                                    if (opponentSplitPieceMass > otherBotCell.mass * this.worldConstants.EAT_MASS_RATIO * this.SPLIT_TO_HUNT_OPPONENT_CANT_RETALIATE_MARGIN) {
                                                        opponentCanRetaliatePostSplitHunt = true;
                                                        break;
                                                    }
                                                }
                                            }
                                        }

                                        if (!opponentCanRetaliatePostSplitHunt && this.isSplitDestinationSafe(this.currentTargetOpponentCell.x, this.currentTargetOpponentCell.y, botCell, threateningOpponentCells, false)) {
                                            this.botController.targetX = this.currentTargetOpponentCell.x;
                                            this.botController.targetY = this.currentTargetOpponentCell.y;
                                            this.botController.initiateSplit();
                                            this.timeSinceLastAnySplitAttempt = 0;
                                            didSplitThisFrame = true;
                                            break;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }


                // Virus Eating Logic
                // Condition: Not hunting, not critically dangerous. Stricter check if significantly dangerous.
                let canConsiderVirus = !decidedToHuntOpponentThisFrame && !isCriticallyDangerousNearby;
                if (canConsiderVirus && isSignificantlyDangerousNearby && largestThreatNearby && this.currentAIState !== 'CONSOLIDATE_FOR_VIRUS') {
                     // ... (same safety check for virus near largestThreatNearby as before)
                    if(this.currentTargetVirus) { 
                        const distThreatToVirus = Math.hypot(largestThreatNearby.x - this.currentTargetVirus.x, largestThreatNearby.y - this.currentTargetVirus.y);
                        if (distThreatToVirus < (largestThreatNearby.radius + this.currentTargetVirus.radius + this.FOOD_SAFETY_BUFFER_EATER * 2.0)) {
                            canConsiderVirus = false; 
                        }
                    } else { 
                         const distBotToLargestThreat = Math.hypot(botCom.x - largestThreatNearby.x, botCom.y - largestThreatNearby.y);
                         if (distBotToLargestThreat < botCom.radius * (this.CRITICAL_THREAT_NO_SPLIT_RADIUS_FACTOR_BASE * 1.2)) {
                            canConsiderVirus = false;
                         }
                    }
                }

                if (canConsiderVirus &&
                    this.currentAIState !== 'CONSOLIDATING_DEFENSIVELY' && 
                    botCellCount < this.worldConstants.MAX_PLAYER_CELLS &&
                    this.timeSinceLastAnySplitAttempt > this.MIN_TIME_SINCE_SPLIT_TO_EAT_VIRUS_MS &&
                    botTotalMass >= this.VIRUS_EAT_MIN_MASS_THRESHOLD) {
                    // ... (Existing Virus eating logic - this sets decidedToSeekVirusThisFrame)
                    // ... findClosestSafeVirusToEat and isVirusSafeToApproach already use largestThreatNearby for context
                    const playerSplitsOnVirus = this.worldConstants.PLAYER_SPLITS_ON_VIRUS_EAT === undefined ? true : this.worldConstants.PLAYER_SPLITS_ON_VIRUS_EAT;
                    if (!(playerSplitsOnVirus && gameMaxMergeCD > this.ACCEPTABLE_RISK_MERGE_COOLDOWN_FOR_VIRUS_EAT_MS)) {
                        let potentialDirectEatVirus = null;
                        if (this.timeSinceLastVirusRecheck >= this.RECHECK_VIRUS_INTERVAL_MAX || !this.currentTargetVirus || !allEntities.viruses.find(v => v && v.id === this.currentTargetVirus.id) || !this.isVirusSafeToApproach(this.currentTargetVirus, botCom, threateningOpponentCells, false, largestThreatNearby)) {
                            this.timeSinceLastVirusRecheck = 0;
                            potentialDirectEatVirus = this.findClosestSafeVirusToEat(botCom, allEntities.viruses, threateningOpponentCells, largestThreatNearby);
                        } else { potentialDirectEatVirus = this.currentTargetVirus; }

                        if (potentialDirectEatVirus) {
                            let gainRatioDirect = (botTotalMass + potentialDirectEatVirus.mass) / botTotalMass;
                            let effectiveMinGainDirect = playerSplitsOnVirus ? this.MIN_VIRUS_EAT_MASS_GAIN_RATIO : this.MIN_VIRUS_EAT_MASS_GAIN_RATIO_NO_SPLIT;
                            if (playerSplitsOnVirus) {
                                const isLowRisk = gameMaxMergeCD < this.LOW_RISK_MERGE_COOLDOWN_FOR_VIRUS_EAT_MS;
                                const isAcceptableRisk = gameMaxMergeCD < this.ACCEPTABLE_RISK_MERGE_COOLDOWN_FOR_VIRUS_EAT_MS;
                                if (!isLowRisk && isAcceptableRisk) effectiveMinGainDirect *= this.VIRUS_EAT_REWARD_BONUS_FOR_ACCEPTABLE_RISK;
                                if (!(isLowRisk || isAcceptableRisk)) gainRatioDirect = 0;
                            }
                            if (gainRatioDirect >= effectiveMinGainDirect * (1/this.VIRUS_TARGET_SCORE_BONUS) ) { // Apply bonus to effective gain needed
                                const avgFoodMass = (this.worldConstants.FOOD_MASS_MAX + this.worldConstants.FOOD_MASS_MIN) / 2 || 2;
                                if (potentialDirectEatVirus.mass > avgFoodMass * this.VIRUS_PRIORITY_FOOD_EQUIVALENCE_THRESHOLD || botTotalMass > this.LARGE_BOT_VIRUS_PRIORITY_MASS_THRESHOLD) {
                                    this.currentTargetVirus = potentialDirectEatVirus;
                                    this.currentAIState = 'SEEKING_VIRUS'; this.stateTimer = 5000;
                                    this.targetX = this.currentTargetVirus.x; this.targetY = this.currentTargetVirus.y;
                                    this.currentTargetFood = null; decidedToSeekVirusThisFrame = true;
                                }
                            }
                        } else if (botCellCount > 1 && !decidedToSeekVirusThisFrame) { // Consolidate for virus
                            let bestConsolidationVirus = null; let maxConsolidationScore = -Infinity;
                            for (const virus of allEntities.viruses) {
                                if (!virus || botTotalMass < virus.mass * (this.worldConstants.VIRUS_EAT_MASS_MULTIPLIER || 1.3)) continue;
                                if (!this.isVirusSafeToApproach(virus, botCom, threateningOpponentCells, true, largestThreatNearby)) continue;
                                let gainRatioConsolidate = (botTotalMass + virus.mass) / botTotalMass;
                                let effectiveMinGainConsolidate = playerSplitsOnVirus ? this.MIN_VIRUS_EAT_MASS_GAIN_RATIO : this.MIN_VIRUS_EAT_MASS_GAIN_RATIO_NO_SPLIT;
                                if (playerSplitsOnVirus) { /* ... risk adjustment ... */ }
                                if (gainRatioConsolidate < effectiveMinGainConsolidate * (1/this.VIRUS_TARGET_SCORE_BONUS) ) continue;
                                const distSq = (virus.x - botCom.x) ** 2 + (virus.y - botCom.y) ** 2;
                                const score = (virus.mass / (distSq + 1000)) * this.VIRUS_TARGET_SCORE_BONUS; // Apply score bonus here
                                if (score > maxConsolidationScore) { maxConsolidationScore = score; bestConsolidationVirus = virus; }
                            }
                            if (bestConsolidationVirus) {
                                this.currentTargetVirus = bestConsolidationVirus; this.currentAIState = 'CONSOLIDATE_FOR_VIRUS';
                                this.stateTimer = this.CONSOLIDATE_STATE_DURATION_MS * 1.5;
                                this.targetX = this.currentTargetVirus.x; this.targetY = this.currentTargetVirus.y;
                                this.currentTargetFood = null; decidedToSeekVirusThisFrame = true;
                            }
                        }
                    }
                }

                // General Splitting Logic (Mobility, Food, Anti-Blob)
                let currentGeneralSplitCooldown = this.GENERAL_SPLIT_COOLDOWN_MS;
                // ... (adjust currentGeneralSplitCooldown based on mobility/mass/cells - same) ...
                 if (isMobilitySplitFavoredByLowMergeCD) {
                     currentGeneralSplitCooldown *= this.MOBILITY_SPLIT_COOLDOWN_REDUCTION_FACTOR;
                } else {
                    if (botCellCount > this.HIGH_CELL_COUNT_CAUTIOUS_SPLIT_THRESHOLD) { currentGeneralSplitCooldown *= this.GENERAL_SPLIT_COOLDOWN_MS_HIGH_CELL_COUNT_FACTOR; }
                    if (botTotalMass > this.HIGH_MASS_CAUTIOUS_SPLIT_THRESHOLD) { currentGeneralSplitCooldown *= this.GENERAL_SPLIT_COOLDOWN_MS_HIGH_MASS_FACTOR; }
                }
                
                // NEW: Anti-blobbing split
                if (!decidedToHuntOpponentThisFrame && !decidedToSeekVirusThisFrame && !didSplitThisFrame &&
                    botCellCount < this.DESIRED_CELL_COUNT_FOR_MOBILITY &&
                    botTotalMass > this.ANTI_BLOB_MIN_TOTAL_MASS &&
                    this.timeSinceLastAntiBlobSplit >= this.ANTI_BLOB_SPLIT_COOLDOWN_MS &&
                    this.botController.globalMergeCooldown <= 0 &&
                    !isSignificantlyDangerousNearby && // Don't anti-blob if significant general danger
                    gameMaxMergeCD < this.LOW_MERGE_CD_FOR_MOBILITY_SPLIT_MS * 1.5) { // Merge CD must be reasonably low

                    let canAntiBlobSplit = this.botController.cells.some(cell => cell.mass >= this.worldConstants.CELL_MIN_MASS_TO_SPLIT_FROM * 1.2 && (cell.mass / 2) >= this.worldConstants.MIN_MASS_PER_SPLIT_PIECE * 1.1); // Slightly higher thresholds for proactive split
                    if(canAntiBlobSplit) {
                        // Try to split towards current wander/food target if safe, else random safeish
                        let tempTargetX = this.targetX, tempTargetY = this.targetY;
                         if (Math.hypot(tempTargetX - botCom.x, tempTargetY - botCom.y) < botCom.radius * 2) {
                             const randomAngle = Math.random() * Math.PI * 2;
                             tempTargetX = botCom.x + Math.cos(randomAngle) * botCom.radius * 4;
                             tempTargetY = botCom.y + Math.sin(randomAngle) * botCom.radius * 4;
                         }
                        if(this.isSplitDestinationSafe(tempTargetX, tempTargetY, botCom, threateningOpponentCells, false)){
                            this.botController.targetX = tempTargetX; this.botController.targetY = tempTargetY;
                            this.botController.initiateSplit();
                            this.timeSinceLastAnySplitAttempt = 0;
                            this.timeSinceLastAntiBlobSplit = 0;
                            didSplitThisFrame = true;
                        }
                    }
                }


                if (!decidedToHuntOpponentThisFrame && !decidedToSeekVirusThisFrame && !didSplitThisFrame &&
                    this.timeSinceLastAnySplitAttempt >= currentGeneralSplitCooldown &&
                    this.botController.globalMergeCooldown <= 0 &&
                    botCellCount < this.worldConstants.MAX_PLAYER_CELLS) {
                    // ... (Existing general split logic for food/mobility - same as previous, with its caution checks)
                    // ... This sets didSplitThisFrame = true if a split occurs
                    let canSplitAnyCellFundamentally = this.botController.cells.some(cell => cell.mass >= this.worldConstants.CELL_MIN_MASS_TO_SPLIT_FROM && (cell.mass / 2) >= this.worldConstants.MIN_MASS_PER_SPLIT_PIECE);
                    let beGenerallyCautiousWithSplitting = isSignificantlyDangerousNearby;
                    if (!isMobilitySplitFavoredByLowMergeCD) { 
                        beGenerallyCautiousWithSplitting = beGenerallyCautiousWithSplitting ||
                                                        botTotalMass > this.HIGH_MASS_CAUTIOUS_SPLIT_THRESHOLD ||
                                                        botCellCount > this.HIGH_CELL_COUNT_CAUTIOUS_SPLIT_THRESHOLD ||
                                                        (botTotalMass < this.LOW_MASS_THRESHOLD_FOR_CAUTIOUS_SPLIT || 
                                                         (gameMaxMergeCD > this.HIGH_MERGE_COOLDOWN_THRESHOLD_MS && botTotalMass < this.LOW_MASS_THRESHOLD_FOR_CAUTIOUS_SPLIT * 2));
                    }

                    if (canSplitAnyCellFundamentally) {
                        const isBotSmallAndWantsToSplitForFood = botTotalMass <= this.LOW_MASS_THRESHOLD_FOR_AGGRESSIVE_SPLIT;
                        if (!beGenerallyCautiousWithSplitting || isBotSmallAndWantsToSplitForFood || isMobilitySplitFavoredByLowMergeCD) {
                             const currentFoodSplitFactor = isBotSmallAndWantsToSplitForFood ? this.MAX_DIST_FOR_TARGETED_FOOD_SPLIT_FACTOR_LOW_MASS : this.MAX_DIST_FOR_TARGETED_FOOD_SPLIT_FACTOR;
                            if (this.currentTargetFood && (this.currentAIState === 'SEEKING_FOOD' || this.currentAIState === 'IDLE_WANDER')) {
                                const distToFoodSq = (this.currentTargetFood.x - botCom.x) ** 2 + (this.currentTargetFood.y - botCom.y) ** 2;
                                const botEffectiveRadius = botCom.radius || Math.sqrt(botTotalMass / Math.PI);
                                if (distToFoodSq < (botEffectiveRadius * currentFoodSplitFactor) ** 2 && this.isSplitDestinationSafe(this.currentTargetFood.x, this.currentTargetFood.y, botCom, threateningOpponentCells, true)) {
                                    this.botController.targetX = this.currentTargetFood.x; this.botController.targetY = this.currentTargetFood.y;
                                    this.botController.initiateSplit(); this.timeSinceLastAnySplitAttempt = 0; didSplitThisFrame = true;
                                }
                            }
                        }

                        if (!didSplitThisFrame && (!beGenerallyCautiousWithSplitting || isMobilitySplitFavoredByLowMergeCD)) {
                            let currentClearAreaRadius = this.CLEAR_AREA_SPLIT_CHECK_RADIUS;
                            if (!isMobilitySplitFavoredByLowMergeCD && (botTotalMass > this.HIGH_MASS_CAUTIOUS_SPLIT_THRESHOLD || botCellCount > this.HIGH_CELL_COUNT_CAUTIOUS_SPLIT_THRESHOLD)) {
                                currentClearAreaRadius *= this.CLEAR_AREA_SPLIT_CHECK_RADIUS_HIGH_MASS_MULTIPLIER;
                            }
                            
                            let immediateAreaIsVeryClearForGeneralSplit = true;
                            for (const threat of threateningOpponentCells) {
                                const distSqToThreatFromCOM = (botCom.x - threat.x) ** 2 + (botCom.y - threat.y) ** 2;
                                if (distSqToThreatFromCOM < (currentClearAreaRadius + threat.radius + botCom.radius) ** 2) {
                                    const largestBotCellMass = Math.max(...this.botController.cells.map(c => c.mass), 0);
                                    let threatMassRatioCondition = threat.mass > largestBotCellMass * this.GENERAL_SPLIT_CLEAR_AREA_THREAT_MASS_RATIO;
                                    let threatTotalMassRatioCondition = threat.opponentTotalMass > botTotalMass * this.GENERAL_SPLIT_CLEAR_AREA_THREAT_TOTAL_MASS_RATIO;

                                    if (isMobilitySplitFavoredByLowMergeCD) {
                                        threatMassRatioCondition = threat.mass > largestBotCellMass * (this.GENERAL_SPLIT_CLEAR_AREA_THREAT_MASS_RATIO * 1.5);
                                        threatTotalMassRatioCondition = threat.opponentTotalMass > botTotalMass * (this.GENERAL_SPLIT_CLEAR_AREA_THREAT_TOTAL_MASS_RATIO * 1.5);
                                    }

                                    if (threatMassRatioCondition || threatTotalMassRatioCondition || threat.opponentControllerIsMajorThreat || threat.opponentControllerCanMergeAndEatBot) {
                                        immediateAreaIsVeryClearForGeneralSplit = false;
                                        break;
                                    }
                                }
                            }

                            if (immediateAreaIsVeryClearForGeneralSplit) {
                                let splitDirX = this.targetX - botCom.x; let splitDirY = this.targetY - botCom.y; const mag = Math.hypot(splitDirX, splitDirY);
                                let tempTargetX, tempTargetY;
                                if (mag < botCom.radius * 2 || mag === 0) {
                                    if (isMobilitySplitFavoredByLowMergeCD && mag > 10) {
                                        tempTargetX = botCom.x + splitDirX / mag * (botCom.radius * 5);
                                        tempTargetY = botCom.y + splitDirY / mag * (botCom.radius * 5);
                                    } else {
                                        const randomAngle = (Math.random() - 0.5) * Math.PI * 0.4; 
                                        tempTargetX = botCom.x + Math.cos(randomAngle) * (botCom.radius * 3);
                                        tempTargetY = botCom.y + Math.sin(randomAngle) * (botCom.radius * 3);
                                    }
                                } else { 
                                    splitDirX /= mag; splitDirY /= mag;
                                    tempTargetX = botCom.x + splitDirX * (botCom.radius * (isMobilitySplitFavoredByLowMergeCD ? 5 : 3));
                                    tempTargetY = botCom.y + splitDirY * (botCom.radius * (isMobilitySplitFavoredByLowMergeCD ? 5 : 3));
                                }
                                const targetCellCountForMobility = isMobilitySplitFavoredByLowMergeCD ? Math.min(this.DESIRED_CELL_COUNT_FOR_MOBILITY +1, this.worldConstants.MAX_PLAYER_CELLS) : 1;


                                if (botCellCount < targetCellCountForMobility ||
                                   (botCellCount < this.worldConstants.MAX_PLAYER_CELLS && !isMobilitySplitFavoredByLowMergeCD) 
                                  ) {
                                    if (this.isSplitDestinationSafe(tempTargetX, tempTargetY, botCom, threateningOpponentCells, false)) {
                                        this.botController.targetX = tempTargetX;
                                        this.botController.targetY = tempTargetY;
                                        this.botController.initiateSplit(); this.timeSinceLastAnySplitAttempt = 0; didSplitThisFrame = true;
                                    }
                                }
                            }
                        }
                    }
                }
                
                // Food Seeking Logic (Fallback)
                if (!decidedToHuntOpponentThisFrame && !decidedToSeekVirusThisFrame && !didSplitThisFrame) {
                     if (this.currentTargetFood) {
                        const foodStillExists = allEntities.food.find(f => f && f.id === this.currentTargetFood.id);
                        if (!foodStillExists || !this.isFoodSafe(this.currentTargetFood, botCom, threateningOpponentCells)) {
                            this.currentTargetFood = null;
                        } else if (botTotalMass > this.VIRUS_IGNORE_FOOD_SIG_CHECK_THRESHOLD && this.currentTargetVirus) { 
                            // If has a virus target and is large enough, might ignore current (small) food for virus
                             if (this.currentTargetFood.mass < botCom.mass * this.MIN_FOOD_MASS_SIGNIFICANCE_RATIO * 0.5) { // Very tiny food
                                this.currentTargetFood = null; // Forget it, go for virus if that's next
                             }
                        }
                    }
                    if (!this.currentTargetFood || this.timeSinceLastFoodRecheck >= this.RECHECK_FOOD_INTERVAL_MAX) {
                        this.timeSinceLastFoodRecheck = 0; 
                        this.currentTargetFood = this.findClosestSafeFood(botCom, allEntities.food, threateningOpponentCells);
                    }
                }
                
                // Set Final Target
                if (!decidedToHuntOpponentThisFrame && !decidedToSeekVirusThisFrame) {
                    if (this.currentTargetFood && !didSplitThisFrame) {
                        if (this.currentAIState !== 'CONSOLIDATING_DEFENSIVELY' && this.currentAIState !== 'CONSOLIDATE_TO_ATTACK' && this.currentAIState !== 'FLEEING_EVASIVE') {
                            this.currentAIState = 'SEEKING_FOOD';
                        }
                        this.targetX = this.currentTargetFood.x; this.targetY = this.currentTargetFood.y;
                    } else if (!didSplitThisFrame) { 
                        if (this.currentAIState !== 'CONSOLIDATING_DEFENSIVELY' && this.currentAIState !== 'CONSOLIDATE_TO_ATTACK' && this.currentAIState !== 'FLEEING_EVASIVE' && this.currentAIState !== 'HUNTING_OPPONENT' && this.currentAIState !== 'SEEKING_VIRUS' && this.currentAIState !== 'CONSOLIDATE_FOR_VIRUS') {
                             this.currentAIState = 'IDLE_WANDER';
                        }
                        const distanceToCurrentWanderTarget = Math.hypot(botCom.x - this.targetX, botCom.y - this.targetY);
                        if (this.currentAIState === 'IDLE_WANDER' && (distanceToCurrentWanderTarget < botCom.radius * 3 || distanceToCurrentWanderTarget < 75)) {
                            this.setSafeWanderTarget(botCom, threateningOpponentCells);
                        }
                    }
                } else if (decidedToHuntOpponentThisFrame) {
                    if (this.currentAIState === 'HUNTING_OPPONENT' && this.currentTargetOpponentCell) {
                        this.targetX = this.currentTargetOpponentCell.x;
                        this.targetY = this.currentTargetOpponentCell.y;
                    }
                } else if (decidedToSeekVirusThisFrame) {
                     if ((this.currentAIState === 'SEEKING_VIRUS' || this.currentAIState === 'CONSOLIDATE_FOR_VIRUS') && this.currentTargetVirus) {
                        this.targetX = this.currentTargetVirus.x;
                        this.targetY = this.currentTargetVirus.y;
                    }
                }
                break;
        }

        if (!didSplitThisFrame || ['FLEEING_EVASIVE', 'CONSOLIDATE_TO_ATTACK', 'CONSOLIDATING_DEFENSIVELY', 'SEEKING_VIRUS', 'CONSOLIDATE_FOR_VIRUS', 'HUNTING_OPPONENT'].includes(this.currentAIState)) {
            this.botController.targetX = this.targetX;
            this.botController.targetY = this.targetY;
        }
    }

    findClosestSafeFood(botCom, allFood, threateningCells) {
        let closestSafeFood = null; let minDistanceSqToSafeFood = Infinity;
        if (allFood && allFood.length > 0) {
            for (const foodItem of allFood) {
                if (!foodItem || !this.isFoodSafe(foodItem, botCom, threateningCells)) continue;

                if (botCom.mass > this.LARGE_BOT_MASS_FOR_FOOD_SIG_CHECK) {
                    if (foodItem.mass < botCom.mass * this.MIN_FOOD_MASS_SIGNIFICANCE_RATIO) {
                        const distSqToTinyFood = (foodItem.x - botCom.x) ** 2 + (foodItem.y - botCom.y) ** 2;
                        if (distSqToTinyFood > (botCom.radius * 1.5)**2) { 
                            continue;
                        }
                    }
                }

                const distanceSq = (foodItem.x - botCom.x) ** 2 + (foodItem.y - botCom.y) ** 2;
                if (distanceSq < minDistanceSqToSafeFood) { minDistanceSqToSafeFood = distanceSq; closestSafeFood = foodItem; }
            }
        }
        return closestSafeFood;
    }

    findBestHuntTarget(allEntities, botCom, threateningBotCells) {
        this.currentTargetOpponentCell = null;
        this.currentTargetOpponentController = null;
        let bestTargetScore = -Infinity;

        if (!allEntities.players) return;

        for (const opponentController of allEntities.players) {
            if (opponentController.id === this.botController.id || !opponentController.cells || opponentController.cells.length === 0) continue;

            for (const opponentCell of opponentController.cells) {
                if (opponentCell.mass <= 0) continue;

                const distSqToOpponentCell = (botCom.x - opponentCell.x)**2 + (botCom.y - opponentCell.y)**2;
                if (distSqToOpponentCell > (botCom.radius * this.MAX_HUNT_DISTANCE_FACTOR)**2) continue;

                let bestEatingBotCell = null;
                let maxBotCellMassForEatingThisTarget = 0;

                for (const botCell of this.botController.cells) {
                    if (botCell.mass > opponentCell.mass * this.worldConstants.EAT_MASS_RATIO * this.HUNT_EAT_MASS_RATIO_ADVANTAGE) {
                        if (botCell.mass > maxBotCellMassForEatingThisTarget) {
                            maxBotCellMassForEatingThisTarget = botCell.mass;
                            bestEatingBotCell = botCell;
                        }
                    }
                }

                if (bestEatingBotCell) {
                    let opponentCanRetaliate = false;
                    const botEatingCellMassAfterEat = bestEatingBotCell.mass + opponentCell.mass;
                    const opponentControllerActual = allEntities.players.find(p=>p.id === opponentController.id);
                    if (!opponentControllerActual) continue;

                    const opponentTotalMassAfterEaten = opponentControllerActual.getTotalMass() - opponentCell.mass;

                    if (opponentTotalMassAfterEaten > this.worldConstants.MIN_MASS_PER_SPLIT_PIECE &&
                        opponentControllerActual.cells.length -1 < this.worldConstants.MAX_PLAYER_CELLS &&
                        opponentControllerActual.cells.filter(c => c.id !== opponentCell.id).length > 0 ) { 
                        
                        const opponentSplitPieceMass = opponentTotalMassAfterEaten / 2;

                        if (opponentSplitPieceMass > botEatingCellMassAfterEat * this.worldConstants.EAT_MASS_RATIO * this.HUNT_SAFETY_OPPONENT_SPLIT_KILL_MARGIN) {
                            opponentCanRetaliate = true;
                        }
                        if (!opponentCanRetaliate) {
                            for (const otherBotCell of this.botController.cells) {
                                if (otherBotCell.id === bestEatingBotCell.id) continue;
                                if (opponentSplitPieceMass > otherBotCell.mass * this.worldConstants.EAT_MASS_RATIO * this.HUNT_SAFETY_OPPONENT_SPLIT_KILL_MARGIN) {
                                    opponentCanRetaliate = true;
                                    break;
                                }
                            }
                        }
                    }

                    if (!opponentCanRetaliate) {
                        let isTargetCamped = false;
                        for (const threat of threateningBotCells) {
                            if (threat.ownerId === opponentController.id) continue;
                            const distSqThreatToTarget = (threat.x - opponentCell.x)**2 + (threat.y - opponentCell.y)**2;
                            if (distSqThreatToTarget < (threat.radius + opponentCell.radius + this.FOOD_SAFETY_BUFFER_EATER*1.5)**2) {
                                isTargetCamped = true;
                                break;
                            }
                        }

                        if (!isTargetCamped) {
                            const score = opponentCell.mass / (distSqToOpponentCell + 1);
                            if (score > bestTargetScore) {
                                bestTargetScore = score;
                                this.currentTargetOpponentCell = opponentCell;
                                this.currentTargetOpponentController = opponentControllerActual;
                            }
                        }
                    }
                }
            }
        }
    }

    isValidHuntTarget(targetCell, targetController, allEntities, botCom) {
        if (!targetCell || !targetController || targetCell.mass <= 0) { this.currentTargetOpponentCell = null; this.currentTargetOpponentController = null; return false; }

        const currentOpponentController = allEntities.players.find(p => p.id === targetController.id);
        if (!currentOpponentController || !currentOpponentController.cells.find(c => c.id === targetCell.id)) {
            this.currentTargetOpponentCell = null; this.currentTargetOpponentController = null; return false;
        }
        
        let canEat = false;
        let bestEatingBotCellAfterReval = null;
        for (const botCell of this.botController.cells) {
            if (botCell.mass > targetCell.mass * this.worldConstants.EAT_MASS_RATIO * this.HUNT_EAT_MASS_RATIO_ADVANTAGE) {
                canEat = true; bestEatingBotCellAfterReval = botCell; break;
            }
        }
        if (!canEat || !bestEatingBotCellAfterReval) { this.currentTargetOpponentCell = null; this.currentTargetOpponentController = null; return false; }

        let opponentCanRetaliate = false;
        const botEatingCellMassAfterEat = bestEatingBotCellAfterReval.mass + targetCell.mass;
        const opponentTotalMassAfterEaten = currentOpponentController.getTotalMass() - targetCell.mass;

        if (opponentTotalMassAfterEaten > this.worldConstants.MIN_MASS_PER_SPLIT_PIECE &&
            currentOpponentController.cells.length -1 < this.worldConstants.MAX_PLAYER_CELLS &&
            currentOpponentController.cells.filter(c => c.id !== targetCell.id).length > 0) {
            const opponentSplitPieceMass = opponentTotalMassAfterEaten / 2;
            if (opponentSplitPieceMass > botEatingCellMassAfterEat * this.worldConstants.EAT_MASS_RATIO * this.HUNT_SAFETY_OPPONENT_SPLIT_KILL_MARGIN) {
                opponentCanRetaliate = true;
            }
            if (!opponentCanRetaliate) {
                for (const otherBotCell of this.botController.cells) {
                    if (otherBotCell.id === bestEatingBotCellAfterReval.id) continue;
                    if (opponentSplitPieceMass > otherBotCell.mass * this.worldConstants.EAT_MASS_RATIO * this.HUNT_SAFETY_OPPONENT_SPLIT_KILL_MARGIN) {
                        opponentCanRetaliate = true; break;
                    }
                }
            }
        }
        if(opponentCanRetaliate) {this.currentTargetOpponentCell = null; this.currentTargetOpponentController = null;}
        return !opponentCanRetaliate;
    }

    isSplitDestinationSafe(splitTargetX, splitTargetY, botComCellForSplit, threateningCells, isTargetedFoodSplit = false) {
        let typicalSplitPieceMass = 0;
        if (botComCellForSplit && botComCellForSplit.mass >= this.worldConstants.CELL_MIN_MASS_TO_SPLIT_FROM && (botComCellForSplit.mass / 2) >= this.worldConstants.MIN_MASS_PER_SPLIT_PIECE) {
            typicalSplitPieceMass = botComCellForSplit.mass / 2;
        } else {
            if (this.botController.cells.length > 0) {
                let largestSplittableCellMass = 0;
                this.botController.cells.forEach(c => {
                    if (c.mass >= this.worldConstants.CELL_MIN_MASS_TO_SPLIT_FROM && (c.mass / 2) >= this.worldConstants.MIN_MASS_PER_SPLIT_PIECE && c.mass > largestSplittableCellMass) largestSplittableCellMass = c.mass;
                });
                if (largestSplittableCellMass > 0) typicalSplitPieceMass = largestSplittableCellMass / 2; else return false;
            } else { return false;}
        }
        if (typicalSplitPieceMass < this.worldConstants.MIN_MASS_PER_SPLIT_PIECE) return false;
        
        const projectedSplitCellRadius = 4 + Math.sqrt(typicalSplitPieceMass) * (this.worldConstants.CELL_RADIUS_MASS_FACTOR || 4);

        for (const threat of threateningCells) {
            const perceptionBufferForSplitCheck = this.DANGER_PERCEPTION_BUFFER_EATER * (isTargetedFoodSplit ? 0.6 : 0.8);
            if ((threat.isEater || threat.opponentControllerIsMajorThreat || threat.opponentControllerCanMergeAndEatBot) &&
                ((botComCellForSplit.x - threat.x) ** 2 + (botComCellForSplit.y - threat.y) ** 2) < (botComCellForSplit.radius + threat.radius + perceptionBufferForSplitCheck) ** 2) {
                return false;
            }

            const distThreatToProjectedSpotSq = (splitTargetX - threat.x) ** 2 + (splitTargetY - threat.y) ** 2;
            
            const safetyBufferForDestinationCell = (threat.isEater || threat.opponentControllerIsMajorThreat || threat.opponentControllerCanMergeAndEatBot)
                ? this.FOOD_SAFETY_BUFFER_EATER * (isTargetedFoodSplit ? 1.3 : 1.5)
                : this.FOOD_SAFETY_BUFFER_STALEMATE * (isTargetedFoodSplit ? 1.1 : 1.3);

            if (threat.mass > typicalSplitPieceMass * this.worldConstants.EAT_MASS_RATIO &&
                distThreatToProjectedSpotSq < (projectedSplitCellRadius + threat.radius + safetyBufferForDestinationCell) ** 2) {
                return false;
            }

            const safetyBufferForDestinationController = this.FOOD_SAFETY_BUFFER_EATER * (isTargetedFoodSplit ? 1.6 : 1.8);
            if (threat.opponentTotalMass > typicalSplitPieceMass * this.worldConstants.EAT_MASS_RATIO * this.SPLIT_PIECE_VULNERABILITY_FACTOR &&
                distThreatToProjectedSpotSq < (projectedSplitCellRadius + threat.radius + safetyBufferForDestinationController) ** 2) {
                return false;
            }
        }
        return true;
    }

    enterFleeingEvasiveState(botCom, primaryThreat, allThreats) {
        this.currentAIState = 'FLEEING_EVASIVE'; this.stateTimer = this.FLEE_STATE_DURATION_MS_BASE + Math.random() * this.FLEE_STATE_DURATION_RANDOM;
        this.currentTargetFood = null; this.currentTargetVirus = null;
        this.currentTargetOpponentCell = null; this.currentTargetOpponentController = null;
        const baseFleeAngle = Math.atan2(botCom.y - primaryThreat.y, botCom.x - primaryThreat.x);
        const angleOffsets = [0, Math.PI / 6, -Math.PI / 6, Math.PI / 3, -Math.PI / 3, Math.PI / 2, -Math.PI / 2, Math.PI / 4, -Math.PI / 4];
        let bestFleeScore = -Infinity;
        let bestFleeX = botCom.x + Math.cos(baseFleeAngle) * this.FLEE_STATE_PROJECTION_DISTANCE;
        let bestFleeY = botCom.y + Math.sin(baseFleeAngle) * this.FLEE_STATE_PROJECTION_DISTANCE;
        bestFleeX = Math.max(botCom.radius, Math.min(bestFleeX, this.worldConstants.MAP_WIDTH - botCom.radius));
        bestFleeY = Math.max(botCom.radius, Math.min(bestFleeY, this.worldConstants.MAP_HEIGHT - botCom.radius));
        for (const offset of angleOffsets) {
            const currentAngle = baseFleeAngle + offset;
            const projectedX = botCom.x + Math.cos(currentAngle) * this.FLEE_STATE_PROJECTION_DISTANCE;
            const projectedY = botCom.y + Math.sin(currentAngle) * this.FLEE_STATE_PROJECTION_DISTANCE;
            const clampedX = Math.max(botCom.radius, Math.min(projectedX, this.worldConstants.MAP_WIDTH - botCom.radius));
            const clampedY = Math.max(botCom.radius, Math.min(projectedY, this.worldConstants.MAP_HEIGHT - botCom.radius));
            let currentScore = ((clampedX - primaryThreat.x) ** 2 + (clampedY - primaryThreat.y) ** 2) * this.W_PRIMARY_THREAT_DIST;
            for (const otherThreat of allThreats) {
                if (otherThreat.id === primaryThreat.id) continue;
                const distSqToOther = (clampedX - otherThreat.x) ** 2 + (clampedY - otherThreat.y) ** 2;
                const dangerZoneRadius = otherThreat.radius + botCom.radius + ((otherThreat.isEater || otherThreat.opponentControllerIsMajorThreat || otherThreat.opponentControllerCanMergeAndEatBot) ? this.DANGER_PERCEPTION_BUFFER_EATER : this.DANGER_PERCEPTION_BUFFER_STALEMATE);
                if (distSqToOther < dangerZoneRadius ** 2) currentScore -= (dangerZoneRadius ** 2 - distSqToOther) * this.W_OTHER_THREAT_PENALTY_FACTOR;
            }
            const minDistToWall = Math.min(clampedX - botCom.radius, this.worldConstants.MAP_WIDTH - botCom.radius - clampedX, clampedY - botCom.radius, this.worldConstants.MAP_HEIGHT - botCom.radius - clampedY);
            if (minDistToWall < botCom.radius * 2) currentScore -= (botCom.radius * 2 - minDistToWall) * this.W_WALL_PENALTY_FACTOR_CLOSE; else currentScore += minDistToWall * this.W_WALL_BONUS_OPEN_SPACE;
            currentScore -= (Math.abs(projectedX - clampedX) + Math.abs(projectedY - clampedY)) * this.W_CLAMPING_PENALTY_FACTOR;
            if (currentScore > bestFleeScore) { bestFleeScore = currentScore; bestFleeX = clampedX; bestFleeY = clampedY; }
        }
        this.targetX = bestFleeX; this.targetY = bestFleeY; this.botController.targetX = this.targetX; this.botController.targetY = this.targetY;
    }

    findClosestSafeVirusToEat(botCom, allViruses, threateningCells, largestThreatNearby = null) {
        let closestSafeVirus = null; let minDistanceSqToSafeVirus = Infinity;
        let largestCell = null;
        if (this.botController.cells && this.botController.cells.length > 0) this.botController.cells.forEach(c => { if (!largestCell || c.mass > largestCell.mass) largestCell = c; });
        if (!largestCell) return null;
        const virusEatMultiplier = this.worldConstants.VIRUS_EAT_MASS_MULTIPLIER || 1.3;
        if (allViruses && allViruses.length > 0) {
            for (const virus of allViruses) {
                if (!virus || largestCell.mass < virus.mass * virusEatMultiplier || !this.isVirusSafeToApproach(virus, largestCell, threateningCells, false, largestThreatNearby)) continue;
                const distanceSq = (virus.x - largestCell.x) ** 2 + (virus.y - largestCell.y) ** 2;
                if (distanceSq < minDistanceSqToSafeVirus) { minDistanceSqToSafeVirus = distanceSq; closestSafeVirus = virus; }
            }
        }
        return closestSafeVirus;
    }

    isVirusSafeToApproach(virus, entityApproaching, threateningCells, isConsolidationTargetCheck = false, largestThreatNearby = null) {
        const playerSplitsOnVirus = this.worldConstants.PLAYER_SPLITS_ON_VIRUS_EAT === undefined ? true : this.worldConstants.PLAYER_SPLITS_ON_VIRUS_EAT;
        let safetyMultiplierAroundVirus = (playerSplitsOnVirus && !isConsolidationTargetCheck) ? 1.5 : 1.2;
        let pathThreatRadiusMultiplierForVirus = (playerSplitsOnVirus && !isConsolidationTargetCheck) ? 1.2 : 1.0;

        if (largestThreatNearby && !isConsolidationTargetCheck) {
            const distThreatToVirus = Math.hypot(largestThreatNearby.x - virus.x, largestThreatNearby.y - virus.y);
            if (distThreatToVirus < (largestThreatNearby.radius + virus.radius + this.FOOD_SAFETY_BUFFER_EATER * 2.5)) {
                return false;
            }
        }

        for (const threatCell of threateningCells) {
            const baseSafetyBuffer = ((threatCell.isEater || threatCell.opponentControllerIsMajorThreat || threatCell.opponentControllerCanMergeAndEatBot) ? this.FOOD_SAFETY_BUFFER_EATER : this.FOOD_SAFETY_BUFFER_STALEMATE);
            const safetyBufferForVirus = baseSafetyBuffer * 1.4 * safetyMultiplierAroundVirus;
            if (((virus.x - threatCell.x) ** 2 + (virus.y - threatCell.y) ** 2) < (virus.radius + threatCell.radius + safetyBufferForVirus) ** 2) return false;

            if (!isConsolidationTargetCheck) {
                const vecBotToVirusX = virus.x - entityApproaching.x; const vecBotToVirusY = virus.y - entityApproaching.y; const distBotToVirusSq = vecBotToVirusX ** 2 + vecBotToVirusY ** 2;
                if (distBotToVirusSq < (entityApproaching.radius + virus.radius) ** 2 * 0.5) continue;
                const vecBotToThreatX = threatCell.x - entityApproaching.x; const vecBotToThreatY = threatCell.y - entityApproaching.y; const distBotToThreatSq = vecBotToThreatX ** 2 + vecBotToThreatY ** 2;
                if (distBotToThreatSq < distBotToVirusSq * 1.2) {
                    const dotProduct = vecBotToVirusX * vecBotToThreatX + vecBotToVirusY * vecBotToThreatY;
                    if (dotProduct > 0) {
                        const cosAngle = dotProduct / (Math.sqrt(distBotToVirusSq * distBotToThreatSq) || 1e-9);
                        if (cosAngle > this.PATH_THREAT_COS_ANGLE_THRESHOLD) {
                            const crossProductModuleSq = ((entityApproaching.x - virus.x) * (threatCell.y - entityApproaching.y) - (entityApproaching.x - threatCell.x) * (virus.y - entityApproaching.y)) ** 2;
                            const perpDistSq = distBotToVirusSq > 1e-6 ? crossProductModuleSq / distBotToVirusSq : Infinity;
                            const blockingRadius = threatCell.radius * this.PATH_THREAT_EFFECTIVE_RADIUS_MULTIPLIER * pathThreatRadiusMultiplierForVirus + entityApproaching.radius * 0.3;
                            if (perpDistSq < blockingRadius ** 2) return false;
                        }
                    }
                }
            }
        }
        return true;
    }
    
    setSafeWanderTarget(botCom, threateningCells) {
        let bestWanderX = botCom.x + (Math.random() - 0.5) * (this.worldConstants.MAP_WIDTH / 2);
        let bestWanderY = botCom.y + (Math.random() - 0.5) * (this.worldConstants.MAP_HEIGHT / 2);
        let maxMinDistToAnyThreatSq = -1;
        for (let i = 0; i < 8; i++) {
            let wanderX = botCom.x + (Math.random() - 0.5) * this.FLEE_STATE_PROJECTION_DISTANCE * 0.8;
            let wanderY = botCom.y + (Math.random() - 0.5) * this.FLEE_STATE_PROJECTION_DISTANCE * 0.8;
            wanderX = Math.max(botCom.radius, Math.min(wanderX, this.worldConstants.MAP_WIDTH - botCom.radius));
            wanderY = Math.max(botCom.radius, Math.min(wanderY, this.worldConstants.MAP_HEIGHT - botCom.radius));
            let currentPointMinDistSq = Infinity;
            if (threateningCells.length > 0) {
                for (const threat of threateningCells) {
                    const dSq = (wanderX - threat.x) ** 2 + (wanderY - threat.y) ** 2;
                    const dangerZoneRadius = threat.radius + botCom.radius + ((threat.isEater || threat.opponentControllerIsMajorThreat || threat.opponentControllerCanMergeAndEatBot) ? this.DANGER_PERCEPTION_BUFFER_EATER : this.DANGER_PERCEPTION_BUFFER_STALEMATE);
                    if (dSq < dangerZoneRadius ** 2) { currentPointMinDistSq = dSq; break; }
                    if (dSq < currentPointMinDistSq) currentPointMinDistSq = dSq;
                }
            } else { currentPointMinDistSq = Infinity; }
            if (currentPointMinDistSq > maxMinDistToAnyThreatSq) { maxMinDistToAnyThreatSq = currentPointMinDistSq; bestWanderX = wanderX; bestWanderY = wanderY; }
        }
        this.targetX = bestWanderX; this.targetY = bestWanderY;
    }

    isFoodSafe(foodItem, botCom, threateningCells) {
        for (const threatCell of threateningCells) {
            const safetyBufferForFood = (threatCell.isEater || threatCell.opponentControllerIsMajorThreat || threatCell.opponentControllerCanMergeAndEatBot) ? this.FOOD_SAFETY_BUFFER_EATER : this.FOOD_SAFETY_BUFFER_STALEMATE;
            if (((foodItem.x - threatCell.x) ** 2 + (foodItem.y - threatCell.y) ** 2) < (foodItem.radius + threatCell.radius + safetyBufferForFood) ** 2) return false;
            const vecBotToFoodX = foodItem.x - botCom.x; const vecBotToFoodY = foodItem.y - botCom.y; const distBotToFoodSq = vecBotToFoodX ** 2 + vecBotToFoodY ** 2;
            if (distBotToFoodSq < (botCom.radius + foodItem.radius) ** 2 * 0.5) continue;
            const vecBotToThreatX = threatCell.x - botCom.x; const vecBotToThreatY = threatCell.y - botCom.y; const distBotToThreatSq = vecBotToThreatX ** 2 + vecBotToThreatY ** 2;
            if (distBotToThreatSq < distBotToFoodSq * 1.2) {
                const dotProduct = vecBotToFoodX * vecBotToThreatX + vecBotToFoodY * vecBotToThreatY;
                if (dotProduct > 0) {
                    const cosAngle = dotProduct / (Math.sqrt(distBotToFoodSq * distBotToThreatSq) || 1e-9);
                    if (cosAngle > this.PATH_THREAT_COS_ANGLE_THRESHOLD) {
                        const crossProductModuleSq = ((botCom.x - foodItem.x) * (threatCell.y - botCom.y) - (botCom.x - threatCell.x) * (foodItem.y - botCom.y)) ** 2;
                        const perpDistSq = distBotToFoodSq > 1e-6 ? crossProductModuleSq / distBotToFoodSq : Infinity;
                        const blockingRadius = threatCell.radius * this.PATH_THREAT_EFFECTIVE_RADIUS_MULTIPLIER + botCom.radius * 0.3;
                        if (perpDistSq < blockingRadius ** 2) return false;
                    }
                }
            }
        }
        return true;
    }
}
AiTypes.aggressive = AggressiveBotAI;