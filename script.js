// script.js - Main game logic
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    const startScreen = document.getElementById('start-screen');
    const gameContainer = document.getElementById('game-container');
    const playerNameInput = document.getElementById('playerNameInput');
    const numBotsInput = document.getElementById('numBotsInput');
    const botTypeSelect = document.getElementById('botTypeSelect');
    const startGameButton = document.getElementById('startGameButton');
    const startAsSpectatorCheckbox = document.getElementById('startAsSpectatorCheckbox');

    const gameOverMessage = document.getElementById('gameOverMessage');
    const gameOverText = document.getElementById('gameOverText');
    const respawnTimerText = document.getElementById('respawnTimerText');
    const spectateButton = document.getElementById('spectateButton');
    const respawnNowButton = document.getElementById('respawnNowButton');
    const restartGameButton = document.getElementById('restartGameButton');

    const spectateControls = document.getElementById('spectateControls');
    const spectatingInfo = document.getElementById('spectatingInfo');
    const prevSpectateTargetButton = document.getElementById('prevSpectateTarget');
    const nextSpectateTargetButton = document.getElementById('nextSpectateTarget');
    const toggleFreeRoamButton = document.getElementById('toggleFreeRoam');
    const spectateRespawnButton = document.getElementById('spectateRespawnButton');
    const spectateBackToMenuButton = document.getElementById('spectateBackToMenuButton');

    const playerNameDisplay = document.getElementById('playerNameDisplay');
    const playerMassDisplay = document.getElementById('playerMassDisplay');
    const playerCellCountDisplay = document.getElementById('playerCellCountDisplay');
    const leaderboardList = document.getElementById('leaderboardList');
    const playerGlobalMergeCooldownDisplay = document.getElementById('playerGlobalMergeCooldownDisplay');

    const gameModeSelect = document.getElementById('gameModeSelect');
    const customSettingsPanel = document.getElementById('customSettingsPanel');

    const csInputs = {
        MapSize: document.getElementById('csMapSize'),
        PlayerStartMass: document.getElementById('csPlayerStartMass'),
        BotStartMass: document.getElementById('csBotStartMass'),
        MaxPlayerCells: document.getElementById('csMaxPlayerCells'),
        EatMassRatio: document.getElementById('csEatMassRatio'),
        MassDecayRate: document.getElementById('csMassDecayRate'),
        CellMinMassToSplitFrom: document.getElementById('csCellMinMassToSplitFrom'),
        MinMassPerSplitPiece: document.getElementById('csMinMassPerSplitPiece'),
        MaxFoodCount: document.getElementById('csMaxFoodCount'),
        FoodMassMin: document.getElementById('csFoodMassMin'),
        FoodMassMax: document.getElementById('csFoodMassMax'),
        FoodSpawnInterval: document.getElementById('csFoodSpawnInterval'),
        MaxVirusCount: document.getElementById('csMaxVirusCount'),
        VirusMassMin: document.getElementById('csVirusMassMin'),
        VirusMassMax: document.getElementById('csVirusMassMax'),
        VirusFedLimit: document.getElementById('csVirusFedLimit'),
        VirusEatMassMultiplier: document.getElementById('csVirusEatMassMultiplier'),
        PlayerSplitsOnVirusEat: document.getElementById('csPlayerSplitsOnVirusEat'),
        VirusSpawnInterval: document.getElementById('csVirusSpawnInterval'),
        SpewedMassYield: document.getElementById('csSpewedMassYield'),
        SpewedMassCost: document.getElementById('csSpewedMassCost'),
        MinSpewMassTotal: document.getElementById('csMinSpewMassTotal'),
        GlobalMergeCooldownMinMs: document.getElementById('csGlobalMergeCooldownMinMs'),
        GlobalMergeCooldownMaxMs: document.getElementById('csGlobalMergeCooldownMaxMs'),
        PlayerBaseSpeed: document.getElementById('csPlayerBaseSpeed'),
        PlayerMassPenaltyFactor: document.getElementById('csPlayerMassPenaltyFactor'),
        PlayerMinSpeedCap: document.getElementById('csPlayerMinSpeedCap'),
    };
    let gameSettings = {};
    const defaultSettings = {
        MAP_WIDTH: 3000, MAP_HEIGHT: 3000,
        PLAYER_START_MASS: 10, BOT_START_MASS: 10,
        MAX_PLAYER_CELLS: 256, EAT_MASS_RATIO: 1.3,
        MASS_DECAY_RATE_PER_SECOND: 0.005,
        CELL_MIN_MASS_TO_SPLIT_FROM: 20, MIN_MASS_PER_SPLIT_PIECE: 10,
        MAX_FOOD_COUNT: 250,
        FOOD_MASS_MIN: 1, FOOD_MASS_MAX: 3,
        FOOD_SPAWN_INTERVAL: 10,
        MAX_VIRUS_COUNT: 25,
        VIRUS_MASS_MIN: 100, VIRUS_MASS_MAX: 100,
        VIRUS_FED_LIMIT: 215, VIRUS_EAT_MASS_MULTIPLIER: 1.3,
        PLAYER_SPLITS_ON_VIRUS_EAT: true, VIRUS_SPAWN_INTERVAL: 2500,
        SPEWED_MASS_YIELD: 18, SPEWED_MASS_COST: 20,
        MIN_SPEW_MASS_TOTAL: 50,
        GLOBAL_MERGE_COOLDOWN_MIN_MS: 200, GLOBAL_MERGE_COOLDOWN_MAX_MS: 400,
        PLAYER_BASE_SPEED: 8, PLAYER_MASS_PENALTY_FACTOR: 1.3, PLAYER_MIN_SPEED_CAP: 0.5,
        AGGRESSIVE_BOT_SPLIT_EAT_FACTOR: 1.1,
        GRID_SIZE: 50, VIRUS_COLOR: '#00ff00',
        VIRUS_SPLIT_MASS_LOW_MIN: 130, VIRUS_SPLIT_MASS_LOW_MAX: 300,
        VIRUS_SPLIT_LOW_MAX_PIECES: 10, VIRUS_SPLIT_HIGH_MIN_PIECES: 9,
        SPEWED_MASS_SPEED: 25, SPEWED_MASS_LIFESPAN: 60 * 10000,
        MASS_DECAY_INTERVAL: 1000,
        GLOBAL_MERGE_COOLDOWN_MIN_TOTAL_MASS_FACTOR: 1.0,
        GLOBAL_MERGE_COOLDOWN_MAX_TOTAL_MASS_FACTOR: 5.0,
        CELL_OVERLAP_RESOLUTION_FACTOR: 0.2, CELL_SPLIT_EJECT_SPEED_BASE: 40,
        CELL_SPLIT_EJECT_DURATION: 2500, CELL_EJECTION_DAMPING: 0.99,
        SPEWED_MASS_DAMPING: 0.98, PLAYER_RESPAWN_DELAY: 3000,
    };
    const gameModes = {
        classic: { ...defaultSettings },
        fastFood: {
            ...defaultSettings, MAX_FOOD_COUNT: 600, FOOD_SPAWN_INTERVAL: 70,
            PLAYER_START_MASS: 50, BOT_START_MASS: 8, MASS_DECAY_RATE_PER_SECOND: 0.007,
            GLOBAL_MERGE_COOLDOWN_MIN_MS: 150, GLOBAL_MERGE_COOLDOWN_MAX_MS: 300,
            FOOD_MASS_MIN: 1, FOOD_MASS_MAX: 3,
        },
        virusMayhem: {
            ...defaultSettings, MAX_VIRUS_COUNT: 60, VIRUS_SPAWN_INTERVAL: 1200,
            VIRUS_FED_LIMIT: 160, PLAYER_SPLITS_ON_VIRUS_EAT: false,
            PLAYER_START_MASS: 150, BOT_START_MASS: 20, VIRUS_EAT_MASS_MULTIPLIER: 1.1,
            SPEWED_MASS_YIELD: 25, SPEWED_MASS_COST: 15,
            VIRUS_MASS_MIN: 80, VIRUS_MASS_MAX: 120,
        },
        chaos: {
            ...defaultSettings,
            MAP_WIDTH: 2000, MAP_HEIGHT: 2000, PLAYER_START_MASS: 200, MAX_PLAYER_CELLS: 16,
            EAT_MASS_RATIO: 1.1, MASS_DECAY_RATE_PER_SECOND: 0.01,
            FOOD_MASS_MIN: 5, FOOD_MASS_MAX: 15, MAX_FOOD_COUNT: 100, FOOD_SPAWN_INTERVAL: 250,
            VIRUS_MASS_MIN: 150, VIRUS_MASS_MAX: 250, MAX_VIRUS_COUNT: 10, VIRUS_FED_LIMIT: 300,
            PLAYER_SPLITS_ON_VIRUS_EAT: true, SPEWED_MASS_YIELD: 10, SPEWED_MASS_COST: 5,
            PLAYER_BASE_SPEED: 10, PLAYER_MASS_PENALTY_FACTOR: 1.0,
            GLOBAL_MERGE_COOLDOWN_MIN_MS: 500, GLOBAL_MERGE_COOLDOWN_MAX_MS: 1000,
        },
        custom: { ...defaultSettings }
    };

    function updateCustomInputFields() {
        csInputs.MapSize.value = gameSettings.MAP_WIDTH;
        csInputs.PlayerStartMass.value = gameSettings.PLAYER_START_MASS;
        csInputs.BotStartMass.value = gameSettings.BOT_START_MASS;
        csInputs.MaxPlayerCells.value = gameSettings.MAX_PLAYER_CELLS;
        csInputs.EatMassRatio.value = gameSettings.EAT_MASS_RATIO;
        csInputs.MassDecayRate.value = gameSettings.MASS_DECAY_RATE_PER_SECOND;
        csInputs.CellMinMassToSplitFrom.value = gameSettings.CELL_MIN_MASS_TO_SPLIT_FROM;
        csInputs.MinMassPerSplitPiece.value = gameSettings.MIN_MASS_PER_SPLIT_PIECE;
        csInputs.MaxFoodCount.value = gameSettings.MAX_FOOD_COUNT;
        csInputs.FoodMassMin.value = gameSettings.FOOD_MASS_MIN;
        csInputs.FoodMassMax.value = gameSettings.FOOD_MASS_MAX;
        csInputs.FoodSpawnInterval.value = gameSettings.FOOD_SPAWN_INTERVAL;
        csInputs.MaxVirusCount.value = gameSettings.MAX_VIRUS_COUNT;
        csInputs.VirusMassMin.value = gameSettings.VIRUS_MASS_MIN;
        csInputs.VirusMassMax.value = gameSettings.VIRUS_MASS_MAX;
        const minVirusFedLimit = (parseInt(csInputs.VirusMassMax.value) || gameSettings.VIRUS_MASS_MAX) + 10;
        csInputs.VirusFedLimit.min = minVirusFedLimit;
        csInputs.VirusFedLimit.value = Math.max(minVirusFedLimit, gameSettings.VIRUS_FED_LIMIT);

        csInputs.VirusEatMassMultiplier.value = gameSettings.VIRUS_EAT_MASS_MULTIPLIER;
        csInputs.PlayerSplitsOnVirusEat.checked = gameSettings.PLAYER_SPLITS_ON_VIRUS_EAT;
        csInputs.VirusSpawnInterval.value = gameSettings.VIRUS_SPAWN_INTERVAL;
        csInputs.SpewedMassYield.value = gameSettings.SPEWED_MASS_YIELD;
        csInputs.SpewedMassCost.value = gameSettings.SPEWED_MASS_COST;
        csInputs.MinSpewMassTotal.value = gameSettings.MIN_SPEW_MASS_TOTAL;
        csInputs.GlobalMergeCooldownMinMs.value = gameSettings.GLOBAL_MERGE_COOLDOWN_MIN_MS;
        csInputs.GlobalMergeCooldownMaxMs.value = gameSettings.GLOBAL_MERGE_COOLDOWN_MAX_MS;
        csInputs.PlayerBaseSpeed.value = gameSettings.PLAYER_BASE_SPEED;
        csInputs.PlayerMassPenaltyFactor.value = gameSettings.PLAYER_MASS_PENALTY_FACTOR;
        csInputs.PlayerMinSpeedCap.value = gameSettings.PLAYER_MIN_SPEED_CAP;
    }
    function loadSettingsFromCustomInputs() {
        const newMapSize = parseInt(csInputs.MapSize.value) || defaultSettings.MAP_WIDTH;
        gameSettings.MAP_WIDTH = newMapSize; gameSettings.MAP_HEIGHT = newMapSize;
        gameSettings.PLAYER_START_MASS = parseInt(csInputs.PlayerStartMass.value) || defaultSettings.PLAYER_START_MASS;
        gameSettings.BOT_START_MASS = parseInt(csInputs.BotStartMass.value) || defaultSettings.BOT_START_MASS;
        gameSettings.MAX_PLAYER_CELLS = parseInt(csInputs.MaxPlayerCells.value) || defaultSettings.MAX_PLAYER_CELLS;
        gameSettings.EAT_MASS_RATIO = parseFloat(csInputs.EatMassRatio.value) || defaultSettings.EAT_MASS_RATIO;
        gameSettings.MASS_DECAY_RATE_PER_SECOND = parseFloat(csInputs.MassDecayRate.value) || defaultSettings.MASS_DECAY_RATE_PER_SECOND;
        gameSettings.CELL_MIN_MASS_TO_SPLIT_FROM = parseInt(csInputs.CellMinMassToSplitFrom.value) || defaultSettings.CELL_MIN_MASS_TO_SPLIT_FROM;
        gameSettings.MIN_MASS_PER_SPLIT_PIECE = parseInt(csInputs.MinMassPerSplitPiece.value) || defaultSettings.MIN_MASS_PER_SPLIT_PIECE;
        gameSettings.MAX_FOOD_COUNT = parseInt(csInputs.MaxFoodCount.value) || defaultSettings.MAX_FOOD_COUNT;
        gameSettings.FOOD_MASS_MIN = parseInt(csInputs.FoodMassMin.value) || defaultSettings.FOOD_MASS_MIN;
        gameSettings.FOOD_MASS_MAX = parseInt(csInputs.FoodMassMax.value) || defaultSettings.FOOD_MASS_MAX;
        gameSettings.FOOD_SPAWN_INTERVAL = parseInt(csInputs.FoodSpawnInterval.value) || defaultSettings.FOOD_SPAWN_INTERVAL;
        gameSettings.MAX_VIRUS_COUNT = parseInt(csInputs.MaxVirusCount.value) || defaultSettings.MAX_VIRUS_COUNT;
        gameSettings.VIRUS_MASS_MIN = parseInt(csInputs.VirusMassMin.value) || defaultSettings.VIRUS_MASS_MIN;
        gameSettings.VIRUS_MASS_MAX = parseInt(csInputs.VirusMassMax.value) || defaultSettings.VIRUS_MASS_MAX;

        const minVirusFedLimit = gameSettings.VIRUS_MASS_MAX + 10;
        csInputs.VirusFedLimit.min = minVirusFedLimit;
        gameSettings.VIRUS_FED_LIMIT = Math.max(minVirusFedLimit, parseInt(csInputs.VirusFedLimit.value) || defaultSettings.VIRUS_FED_LIMIT);
        csInputs.VirusFedLimit.value = gameSettings.VIRUS_FED_LIMIT;

        gameSettings.VIRUS_EAT_MASS_MULTIPLIER = parseFloat(csInputs.VirusEatMassMultiplier.value) || defaultSettings.VIRUS_EAT_MASS_MULTIPLIER;
        gameSettings.PLAYER_SPLITS_ON_VIRUS_EAT = csInputs.PlayerSplitsOnVirusEat.checked;
        gameSettings.VIRUS_SPAWN_INTERVAL = parseInt(csInputs.VirusSpawnInterval.value) || defaultSettings.VIRUS_SPAWN_INTERVAL;
        gameSettings.SPEWED_MASS_YIELD = parseInt(csInputs.SpewedMassYield.value) || defaultSettings.SPEWED_MASS_YIELD;
        gameSettings.SPEWED_MASS_COST = parseInt(csInputs.SpewedMassCost.value);
        if (isNaN(gameSettings.SPEWED_MASS_COST)) gameSettings.SPEWED_MASS_COST = defaultSettings.SPEWED_MASS_COST;

        gameSettings.MIN_SPEW_MASS_TOTAL = parseInt(csInputs.MinSpewMassTotal.value) || defaultSettings.MIN_SPEW_MASS_TOTAL;
        gameSettings.GLOBAL_MERGE_COOLDOWN_MIN_MS = parseInt(csInputs.GlobalMergeCooldownMinMs.value) || defaultSettings.GLOBAL_MERGE_COOLDOWN_MIN_MS;
        gameSettings.GLOBAL_MERGE_COOLDOWN_MAX_MS = parseInt(csInputs.GlobalMergeCooldownMaxMs.value) || defaultSettings.GLOBAL_MERGE_COOLDOWN_MAX_MS;
        gameSettings.PLAYER_BASE_SPEED = parseFloat(csInputs.PlayerBaseSpeed.value) || defaultSettings.PLAYER_BASE_SPEED;
        gameSettings.PLAYER_MASS_PENALTY_FACTOR = parseFloat(csInputs.PlayerMassPenaltyFactor.value) || defaultSettings.PLAYER_MASS_PENALTY_FACTOR;
        gameSettings.PLAYER_MIN_SPEED_CAP = parseFloat(csInputs.PlayerMinSpeedCap.value) || defaultSettings.PLAYER_MIN_SPEED_CAP;

        if (gameSettings.FOOD_MASS_MAX < gameSettings.FOOD_MASS_MIN) {
            gameSettings.FOOD_MASS_MAX = gameSettings.FOOD_MASS_MIN;
            csInputs.FoodMassMax.value = gameSettings.FOOD_MASS_MAX;
        }
        if (gameSettings.VIRUS_MASS_MAX < gameSettings.VIRUS_MASS_MIN) {
            gameSettings.VIRUS_MASS_MAX = gameSettings.VIRUS_MASS_MIN;
            csInputs.VirusMassMax.value = gameSettings.VIRUS_MASS_MAX;
            const newMinVirusFedLimit = gameSettings.VIRUS_MASS_MAX + 10;
            csInputs.VirusFedLimit.min = newMinVirusFedLimit;
            gameSettings.VIRUS_FED_LIMIT = Math.max(newMinVirusFedLimit, parseInt(csInputs.VirusFedLimit.value) || defaultSettings.VIRUS_FED_LIMIT);
            csInputs.VirusFedLimit.value = gameSettings.VIRUS_FED_LIMIT;
        }
        if (gameSettings.GLOBAL_MERGE_COOLDOWN_MAX_MS < gameSettings.GLOBAL_MERGE_COOLDOWN_MIN_MS) {
            gameSettings.GLOBAL_MERGE_COOLDOWN_MAX_MS = gameSettings.GLOBAL_MERGE_COOLDOWN_MIN_MS;
            csInputs.GlobalMergeCooldownMaxMs.value = gameSettings.GLOBAL_MERGE_COOLDOWN_MAX_MS;
        }
    }
    function applyModeSettings(modeName) {
        if (gameModes[modeName]) {
            gameSettings = { ...gameModes[modeName] };
        } else {
            gameSettings = { ...gameModes.classic };
        }
        if (modeName === 'custom') {
            customSettingsPanel.classList.remove('hidden');
            loadSettingsFromCustomInputs();
        } else {
            customSettingsPanel.classList.add('hidden');
        }
        updateCustomInputFields();
    }

    gameModeSelect.addEventListener('change', (e) => applyModeSettings(e.target.value));
    Object.entries(csInputs).forEach(([key, input]) => {
        input.addEventListener('change', () => {
            if (gameModeSelect.value === 'custom') loadSettingsFromCustomInputs();
        });
        if (input.type === 'number') {
            input.addEventListener('input', () => {
                if (gameModeSelect.value === 'custom') loadSettingsFromCustomInputs();
            });
        }
    });
    if (csInputs.VirusMassMax) {
        csInputs.VirusMassMax.addEventListener('input', () => {
            if (gameModeSelect.value === 'custom') {
                const virusMaxMass = parseInt(csInputs.VirusMassMax.value) || defaultSettings.VIRUS_MASS_MAX;
                const newMinFedLimit = virusMaxMass + 10;
                csInputs.VirusFedLimit.min = newMinFedLimit;
                if (parseInt(csInputs.VirusFedLimit.value) < newMinFedLimit) {
                    csInputs.VirusFedLimit.value = newMinFedLimit;
                }
                loadSettingsFromCustomInputs();
            }
        });
    }
    applyModeSettings(gameModeSelect.value);

    let gameLoopId;
    let player;
    let bots = [];
    let food = [];
    let viruses = [];
    let spewedMasses = [];
    let screenMouseX = window.innerWidth / 2, screenMouseY = window.innerHeight / 2;
    let worldMouseX = 0, worldMouseY = 0;
    const camera = { x: 0, y: 0, zoom: 1, targetZoom: 1 }; // Added targetZoom
    let currentWorldConstantsForBots = {};

    // Zoom constants
    const MIN_ZOOM = 0.1;
    const MAX_ZOOM = 4.0; // Increased max zoom capability
    const ZOOM_SPEED_FACTOR = 0.05; // How much to zoom per wheel step

    const MOTION_BLUR_ENABLED = true; // Set to false to disable motion blur
    const MOTION_BLUR_ALPHA_OVERLAY = 0.20; // Alpha of the overlay. Lower = longer trails (e.g., 0.1-0.3). Higher = shorter trails.
    // This represents the opacity of the "fading" layer drawn each frame.
    const CANVAS_BACKGROUND_COLOR_RGB = "224, 224, 224"; // Matches #e0e0e0 from CSS

    let playerRespawnTimer = 0;
    let isPlayerDead = false;
    let isSpectating = false;
    let spectateTargetId = null;
    let spectateMode = 'target';
    let freeRoamCameraX = 0;
    let freeRoamCameraY = 0;
    const keysPressed = {};
    const SPECTATE_CAMERA_SPEED = 500;
    const SPECTATE_FREE_ROAM_ZOOM = 0.7; // Default zoom for free roam, can be adjusted by wheel
    let playerCanRespawnManually = false;

    let lastDecayTime = 0, lastFoodSpawnTime = 0, lastVirusSpawnTime = 0, lastLeaderboardUpdateTime = 0;
    let currentGameBotAiType = 'minion';
    let uniqueIdCounter = 0;
    function getUniqueId() { return uniqueIdCounter++; }

    function resizeCanvas() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    class Entity {
        constructor(x, y, mass, color) {
            this.id = getUniqueId();
            this.x = x; this.y = y;
            this.mass = mass; this.color = color;
            this.radius = 0;
            this.targetRadius = 4 + Math.sqrt(this.mass) * 4;
            this.radius = this.targetRadius;
        }
        updateRadiusAndTarget() { this.targetRadius = 4 + Math.sqrt(this.mass) * 4; }
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
            // Increased base screen-space thickness and relative thickness
            ctx.lineWidth = Math.max(2.5 / camera.zoom, this.radius / 15);
            ctx.stroke();
        }
    }
    class Cell extends Entity {
        constructor(x, y, mass, color, name = "", ownerId = null, isBot = false) {
            super(x, y, mass, color);
            this.name = name;
            this.ownerId = ownerId;
            this.isBot = isBot;
            this.vx = 0; this.vy = 0;
            this.ejectionVx = 0; this.ejectionVy = 0;
            this.ejectionTimer = 0;
            this.splitPartnerId = null;
            this.splitPassthroughEndTime = 0;
            this.updateRadiusAndTarget();
        }

        updateSelf(dt, dtFrameFactor, targetWorldX, targetWorldY) {
            this.animateRadiusLogic(dtFrameFactor);

            let desiredSpeed = Math.max(
                gameSettings.PLAYER_MIN_SPEED_CAP,
                gameSettings.PLAYER_BASE_SPEED - Math.log(this.mass + 1) * gameSettings.PLAYER_MASS_PENALTY_FACTOR
            );
            let intendedVx = 0;
            let intendedVy = 0;

            const isActuallyEjectingWithForce = (Math.abs(this.ejectionVx) > 0.01 || Math.abs(this.ejectionVy) > 0.01) && this.ejectionTimer > 0;

            if (isActuallyEjectingWithForce) {
                const angleToMouse = Math.atan2(targetWorldY - this.y, targetWorldX - this.x);
                const playerControlSpeed = desiredSpeed;
                let blendFactor = 0;
                const remainingEjectionRatio = this.ejectionTimer > 0 ? this.ejectionTimer / gameSettings.CELL_SPLIT_EJECT_DURATION : 0;
                const ejectionMagnitude = Math.sqrt(this.ejectionVx ** 2 + this.ejectionVy ** 2);

                if (ejectionMagnitude < playerControlSpeed * 0.4 || remainingEjectionRatio < 0.4) {
                    blendFactor = Math.min(1, (1 - remainingEjectionRatio) * 1.2 + (1 - Math.min(1, ejectionMagnitude / (playerControlSpeed * 0.4 + 0.1))) * 0.8);
                } else {
                    blendFactor = (1 - remainingEjectionRatio) * 0.3;
                }
                blendFactor = Math.max(0, Math.min(1, blendFactor));

                const playerControlledVx = Math.cos(angleToMouse) * playerControlSpeed;
                const playerControlledVy = Math.sin(angleToMouse) * playerControlSpeed;

                intendedVx = (this.ejectionVx * (1 - blendFactor)) + (playerControlledVx * blendFactor);
                intendedVy = (this.ejectionVy * (1 - blendFactor)) + (playerControlledVy * blendFactor);

                this.ejectionVx *= gameSettings.CELL_EJECTION_DAMPING;
                this.ejectionVy *= gameSettings.CELL_EJECTION_DAMPING;
            } else {
                const angle = Math.atan2(targetWorldY - this.y, targetWorldX - this.x);
                intendedVx = Math.cos(angle) * desiredSpeed;
                intendedVy = Math.sin(angle) * desiredSpeed;
            }

            const movementSmoothingFactor = 0.15;
            this.vx += (intendedVx - this.vx) * movementSmoothingFactor * dtFrameFactor;
            this.vy += (intendedVy - this.vy) * movementSmoothingFactor * dtFrameFactor;

            this.x += this.vx * dtFrameFactor;
            this.y += this.vy * dtFrameFactor;

            this.x = Math.max(this.radius, Math.min(this.x, gameSettings.MAP_WIDTH - this.radius));
            this.y = Math.max(this.radius, Math.min(this.y, gameSettings.MAP_HEIGHT - this.radius));

            if (this.ejectionTimer > 0) {
                this.ejectionTimer -= dt;
                if (this.ejectionTimer <= 0) {
                    this.ejectionTimer = 0; this.ejectionVx = 0; this.ejectionVy = 0;
                } else if (isActuallyEjectingWithForce && Math.abs(this.ejectionVx) < 0.05 && Math.abs(this.ejectionVy) < 0.05) {
                    this.ejectionVx = 0; this.ejectionVy = 0;
                }
            }
        }

        decayMass() {
            const minMassThreshold = this.isBot ? gameSettings.BOT_START_MASS : gameSettings.PLAYER_START_MASS;
            const massToLose = Math.floor(this.mass * gameSettings.MASS_DECAY_RATE_PER_SECOND);
            let massChanged = false;

            if (this.mass - massToLose >= gameSettings.MIN_MASS_PER_SPLIT_PIECE / 2) {
                this.mass -= massToLose;
                massChanged = true;
            } else if (this.mass > gameSettings.MIN_MASS_PER_SPLIT_PIECE / 2 && massToLose > 0) {
                this.mass = gameSettings.MIN_MASS_PER_SPLIT_PIECE / 2;
                massChanged = true;
            }
            if (massChanged) this.updateRadiusAndTarget();
        }
        draw(ctx) {
            super.draw(ctx); // Calls Entity.draw() for the main circle and outline
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
            this.targetX = gameSettings.MAP_WIDTH / 2; this.targetY = gameSettings.MAP_HEIGHT / 2;
            this.globalMergeCooldown = 0;
            this.spawnInitialCell(startMass);
            if (isBot && aiType && AiTypes[aiType]) {
                this.ai = new AiTypes[aiType](this, currentWorldConstantsForBots);
            } else if (isBot) {
                this.ai = new AiTypes['random'](this, currentWorldConstantsForBots);
            }
        }
        spawnInitialCell(mass) {
            const cellRadius = 4 + Math.sqrt(mass) * 4;
            const spawnPos = findSafeSpawnPosition(cellRadius * 1.5, this.isBot ? "bot" : "player");
            const newCell = new Cell(spawnPos.x, spawnPos.y, mass, this.color, this.name, this.id, this.isBot);
            this.cells.push(newCell);
        }
        respawn() {
            this.cells = [];
            this.globalMergeCooldown = 0;
            this.spawnInitialCell(gameSettings.PLAYER_START_MASS);
        }
        getCenterOfMassCell() {
            if (this.cells.length === 0) return { x: gameSettings.MAP_WIDTH / 2, y: gameSettings.MAP_HEIGHT / 2, radius: 10, mass: 0 };
            let totalMass = 0; let comX = 0; let comY = 0; let maxRadius = 0;
            this.cells.forEach(cell => {
                totalMass += cell.mass; comX += cell.x * cell.mass; comY += cell.y * cell.mass;
                if (cell.radius > maxRadius) maxRadius = cell.radius;
            });
            if (totalMass === 0 && this.cells.length > 0) return { x: this.cells[0].x, y: this.cells[0].y, radius: this.cells[0].radius, mass: 0 };
            if (totalMass === 0) return { x: gameSettings.MAP_WIDTH / 2, y: gameSettings.MAP_HEIGHT / 2, radius: 10, mass: 0 };
            return { x: comX / totalMass, y: comY / totalMass, radius: maxRadius, mass: totalMass };
        }
        calculateGlobalMergeCooldown(totalMass) {
            const minTotalMass = gameSettings.PLAYER_START_MASS * gameSettings.GLOBAL_MERGE_COOLDOWN_MIN_TOTAL_MASS_FACTOR;
            const maxTotalMass = gameSettings.PLAYER_START_MASS * gameSettings.GLOBAL_MERGE_COOLDOWN_MAX_TOTAL_MASS_FACTOR;

            if (totalMass <= minTotalMass) return gameSettings.GLOBAL_MERGE_COOLDOWN_MIN_MS;
            if (totalMass >= maxTotalMass) return gameSettings.GLOBAL_MERGE_COOLDOWN_MAX_MS;
            const ratio = (totalMass - minTotalMass) / (maxTotalMass - minTotalMass);
            return gameSettings.GLOBAL_MERGE_COOLDOWN_MIN_MS + ratio * (gameSettings.GLOBAL_MERGE_COOLDOWN_MAX_MS - gameSettings.GLOBAL_MERGE_COOLDOWN_MIN_MS);
        }

        update(dt, dtFrameFactor) {
            if (this.globalMergeCooldown > 0) {
                this.globalMergeCooldown -= dt;
                if (this.globalMergeCooldown < 0) this.globalMergeCooldown = 0;
            }

            if (this.isBot && this.ai) {
                const activePlayersForAI = bots.filter(b => b !== this);
                if (player && !isPlayerDead) {
                    activePlayersForAI.unshift(player);
                }
                this.ai.update(dt, { food, viruses, players: activePlayersForAI });
            }

            this.cells.forEach(cell => {
                const targetWorldX = this.isBot ? this.targetX : worldMouseX;
                const targetWorldY = this.isBot ? this.targetY : worldMouseY;
                cell.updateSelf(dt, dtFrameFactor, targetWorldX, targetWorldY);
            });

            if (this.cells.length > 1) {
                if (this.globalMergeCooldown > 0) {
                    const now = Date.now();
                    for (let i = 0; i < this.cells.length; i++) {
                        for (let j = i + 1; j < this.cells.length; j++) {
                            const cell1 = this.cells[i]; const cell2 = this.cells[j];
                            if (!cell1 || !cell2) continue;
                            let passthroughActiveForThisPair = false;
                            if (cell1.splitPartnerId === cell2.id && cell2.splitPartnerId === cell1.id) {
                                if (now < cell1.splitPassthroughEndTime && now < cell2.splitPassthroughEndTime) {
                                    passthroughActiveForThisPair = true;
                                    const dx_sep = cell2.x - cell1.x; const dy_sep = cell2.y - cell1.y;
                                    const distSq_sep = dx_sep * dx_sep + dy_sep * dy_sep;
                                    const sumRadii_sep = cell1.radius + cell2.radius;
                                    if (distSq_sep >= sumRadii_sep * sumRadii_sep * 0.95) {
                                        cell1.splitPartnerId = null; cell1.splitPassthroughEndTime = 0;
                                        cell2.splitPartnerId = null; cell2.splitPassthroughEndTime = 0;
                                        passthroughActiveForThisPair = false;
                                    }
                                } else {
                                    cell1.splitPartnerId = null; cell1.splitPassthroughEndTime = 0;
                                    cell2.splitPartnerId = null; cell2.splitPassthroughEndTime = 0;
                                    passthroughActiveForThisPair = false;
                                }
                            }
                            if (passthroughActiveForThisPair) continue;

                            const dx = cell2.x - cell1.x; const dy = cell2.y - cell1.y;
                            const distanceSq = dx * dx + dy * dy;
                            const sumRadii = cell1.radius + cell2.radius;
                            if (distanceSq < (sumRadii * sumRadii) && distanceSq > 0.001) {
                                const distance = Math.sqrt(distanceSq);
                                const overlap = sumRadii - distance;
                                if (overlap > 0) {
                                    const invDistance = 1 / distance;
                                    const normDx = dx * invDistance; const normDy = dy * invDistance;
                                    const moveAmount = overlap * gameSettings.CELL_OVERLAP_RESOLUTION_FACTOR;
                                    const totalMassForOverlap = cell1.mass + cell2.mass;
                                    let move1Factor = 0.5; let move2Factor = 0.5;
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
                                        if ((c === cell1 && cell1.ejectionTimer <= 0) || (c === cell2 && cell2.ejectionTimer <= 0)) {
                                            c.x = Math.max(c.radius, Math.min(c.x, gameSettings.MAP_WIDTH - c.radius));
                                            c.y = Math.max(c.radius, Math.min(c.y, gameSettings.MAP_HEIGHT - c.radius));
                                        }
                                    });
                                }
                            }
                        }
                    }
                }
                if (this.globalMergeCooldown <= 0 && this.cells.length > 1) {
                    let cellsToProcess = [...this.cells]; let mergedInThisPass;
                    do {
                        mergedInThisPass = false; let cellsToRemove = new Set();
                        for (let i = 0; i < cellsToProcess.length; i++) {
                            for (let j = i + 1; j < cellsToProcess.length; j++) {
                                const cell1 = cellsToProcess[i]; const cell2 = cellsToProcess[j];
                                if (cellsToRemove.has(cell1.id) || cellsToRemove.has(cell2.id)) continue;
                                const dx = cell2.x - cell1.x; const dy = cell2.y - cell1.y;
                                const distanceSq = dx * dx + dy * dy;
                                const canPhysicallyMerge = distanceSq < (Math.max(cell1.radius, cell2.radius) ** 2);
                                if (canPhysicallyMerge) {
                                    const absorbingCell = cell1.mass >= cell2.mass ? cell1 : cell2;
                                    const absorbedCell = cell1.mass < cell2.mass ? cell1 : cell2;
                                    if (cellsToRemove.has(absorbingCell.id)) continue;
                                    absorbingCell.mass += absorbedCell.mass;
                                    absorbingCell.updateRadiusAndTarget();
                                    cellsToRemove.add(absorbedCell.id);
                                    mergedInThisPass = true;
                                }
                            }
                        }
                        if (mergedInThisPass) cellsToProcess = cellsToProcess.filter(c => !cellsToRemove.has(c.id));
                    } while (mergedInThisPass && cellsToProcess.length > 1);
                    this.cells = cellsToProcess;
                }
            }
            this.cells = this.cells.filter(cell => cell.mass > 0);
        }

        getTotalMass() { return this.cells.reduce((sum, cell) => sum + cell.mass, 0); }

        initiateSplit() {
            if (this.cells.length >= gameSettings.MAX_PLAYER_CELLS) return;
            const MAX_EJECT_SPEED_BONUS_FROM_MASS = 15;
            const BASE_EJECT_SPEED_FACTOR = 3.0;

            const cellsToConsiderSplitting = [...this.cells];
            let currentTotalCellCount = this.cells.length;
            let splitOccurred = false;
            const now = Date.now();
            const passthroughDuration = 1500;

            for (const cell of cellsToConsiderSplitting) {
                if (currentTotalCellCount >= gameSettings.MAX_PLAYER_CELLS) break;
                if (!this.cells.includes(cell) || cell.mass < gameSettings.CELL_MIN_MASS_TO_SPLIT_FROM) continue;

                const originalMass = cell.mass;
                const massOfParentPiece = Math.floor(originalMass / 2);
                const massOfNewPiece = originalMass - massOfParentPiece;

                if (massOfNewPiece < gameSettings.MIN_MASS_PER_SPLIT_PIECE || massOfParentPiece < gameSettings.MIN_MASS_PER_SPLIT_PIECE) continue;

                cell.mass = massOfParentPiece;
                cell.updateRadiusAndTarget();
                cell.ejectionTimer = Math.min(100, gameSettings.CELL_SPLIT_EJECT_DURATION / 10);
                cell.ejectionVx = 0; cell.ejectionVy = 0;

                const angle = this.isBot ?
                    (this.ai && (this.targetX !== undefined) ? Math.atan2(this.targetY - cell.y, this.targetX - cell.x) : Math.random() * Math.PI * 2)
                    : Math.atan2(worldMouseY - cell.y, worldMouseX - cell.x);

                const ejectDist = 0.1;
                const newX = cell.x + Math.cos(angle) * ejectDist;
                const newY = cell.y + Math.sin(angle) * ejectDist;
                const newCell = new Cell(newX, newY, massOfNewPiece, this.color, this.name, this.id, this.isBot);

                const massBasedSpeedBonus = Math.min(Math.sqrt(massOfNewPiece) * 0.4, MAX_EJECT_SPEED_BONUS_FROM_MASS);
                const newPieceEjectSpeed = (gameSettings.CELL_SPLIT_EJECT_SPEED_BASE + massBasedSpeedBonus) / BASE_EJECT_SPEED_FACTOR;

                newCell.ejectionVx = Math.cos(angle) * newPieceEjectSpeed;
                newCell.ejectionVy = Math.sin(angle) * newPieceEjectSpeed;
                newCell.ejectionTimer = gameSettings.CELL_SPLIT_EJECT_DURATION;

                cell.splitPartnerId = newCell.id; cell.splitPassthroughEndTime = now + passthroughDuration;
                newCell.splitPartnerId = cell.id; newCell.splitPassthroughEndTime = now + passthroughDuration;

                this.cells.push(newCell);
                currentTotalCellCount++;
                splitOccurred = true;
            }
            if (splitOccurred) {
                this.globalMergeCooldown = this.calculateGlobalMergeCooldown(this.getTotalMass());
            }
        }

        initiateSpew() {
            if (this.getTotalMass() < gameSettings.MIN_SPEW_MASS_TOTAL) return;
            const spewedMassRadius = 4 + Math.sqrt(gameSettings.SPEWED_MASS_YIELD) * 4;

            this.cells.forEach(cell => {
                if (cell.mass > gameSettings.SPEWED_MASS_COST + gameSettings.MIN_MASS_PER_SPLIT_PIECE && cell.ejectionTimer <= 0) {
                    cell.mass -= gameSettings.SPEWED_MASS_COST;
                    cell.updateRadiusAndTarget();

                    const angle = this.isBot ?
                        (this.ai && (this.targetX !== undefined) ? Math.atan2(this.targetY - cell.y, this.targetX - cell.x) : Math.random() * Math.PI * 2)
                        : Math.atan2(worldMouseY - cell.y, worldMouseX - cell.x);
                    const ejectDist = cell.radius + spewedMassRadius + 2;
                    let spewX = cell.x + Math.cos(angle) * ejectDist; let spewY = cell.y + Math.sin(angle) * ejectDist;
                    const smVx = Math.cos(angle) * gameSettings.SPEWED_MASS_SPEED; const smVy = Math.sin(angle) * gameSettings.SPEWED_MASS_SPEED;

                    const SPEWED_CHECK_RADIUS = spewedMassRadius * 1.5;
                    for (let k = 0; k < 3; k++) {
                        let conflict = false;
                        for (const existingSM of spewedMasses) {
                            const distSq = (spewX - existingSM.x) ** 2 + (spewY - existingSM.y) ** 2;
                            if (distSq < (SPEWED_CHECK_RADIUS + existingSM.radius) ** 2 * 0.25) { conflict = true; break; }
                        }
                        if (!conflict) break;
                        spewX += (Math.random() - 0.5) * spewedMassRadius * 4;
                        spewY += (Math.random() - 0.5) * spewedMassRadius * 4;
                        spewX = Math.max(spewedMassRadius, Math.min(spewX, gameSettings.MAP_WIDTH - spewedMassRadius));
                        spewY = Math.max(spewedMassRadius, Math.min(spewY, gameSettings.MAP_HEIGHT - spewedMassRadius));
                    }
                    spewedMasses.push(new SpewedMass(spewX, spewY, this.color, this.id, smVx, smVy));
                }
            });
        }

        applyMassDecay() {
            this.cells.forEach(cell => cell.decayMass());
            this.cells = this.cells.filter(cell => cell.mass >= gameSettings.MIN_MASS_PER_SPLIT_PIECE / 2);
        }

        handleVirusEatSplit(eatenCellOriginal) {
            let cellIndex = this.cells.findIndex(c => c.id === eatenCellOriginal.id);
            let cellToProcess = (cellIndex !== -1) ? this.cells[cellIndex] : null;
            if (!cellToProcess || cellToProcess.mass <= 0) return;

            if (!gameSettings.PLAYER_SPLITS_ON_VIRUS_EAT) {
                return;
            }

            const originalMass = cellToProcess.mass;
            const originalX = cellToProcess.x;
            const originalY = cellToProcess.y;
            this.cells.splice(cellIndex, 1);
            let newCells = [];
            const minPieceForVirusSplit = gameSettings.MIN_MASS_PER_SPLIT_PIECE;
            const MAX_EJECT_SPEED_BONUS_FROM_MASS_VIRUS = 10;
            const BASE_EJECT_SPEED_FACTOR_VIRUS = 3.2;
            const VIRUS_SPLIT_EJECT_DURATION_MULTIPLIER = 1.0;

            const numPieces = Math.min(gameSettings.VIRUS_SPLIT_LOW_MAX_PIECES, gameSettings.MAX_PLAYER_CELLS - this.cells.length, Math.floor(originalMass / minPieceForVirusSplit) || 1);
            const massPerPiece = (numPieces > 0) ? Math.floor(originalMass / numPieces) : 0;

            if (numPieces <= 0 || massPerPiece < minPieceForVirusSplit) {
                const reCell = new Cell(originalX, originalY, originalMass, this.color, this.name, this.id, this.isBot);
                this.cells.push(reCell); this.globalMergeCooldown = this.calculateGlobalMergeCooldown(this.getTotalMass()); return;
            }

            for (let i = 0; i < numPieces; i++) {
                if (this.cells.length + newCells.length >= gameSettings.MAX_PLAYER_CELLS) break;
                const angle = (i / numPieces) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
                const ejectDist = minPieceForVirusSplit * 0.3 + Math.random() * 10;
                const nx = originalX + Math.cos(angle) * ejectDist;
                const ny = originalY + Math.sin(angle) * ejectDist;
                const piece = new Cell(nx, ny, massPerPiece, this.color, this.name, this.id, this.isBot);
                const massBasedSpeedBonus = Math.min(Math.sqrt(massPerPiece) * 0.3, MAX_EJECT_SPEED_BONUS_FROM_MASS_VIRUS);
                const ejectSpeed = (gameSettings.CELL_SPLIT_EJECT_SPEED_BASE + massBasedSpeedBonus) / BASE_EJECT_SPEED_FACTOR_VIRUS;
                piece.ejectionVx = Math.cos(angle) * ejectSpeed; piece.ejectionVy = Math.sin(angle) * ejectSpeed;
                piece.ejectionTimer = gameSettings.CELL_SPLIT_EJECT_DURATION * VIRUS_SPLIT_EJECT_DURATION_MULTIPLIER;
                newCells.push(piece);
            }
            this.cells.push(...newCells);
            this.globalMergeCooldown = this.calculateGlobalMergeCooldown(this.getTotalMass());
        }
    }
    class Food extends Entity {
        constructor(x, y) {
            const mass = gameSettings.FOOD_MASS_MIN + Math.random() * (gameSettings.FOOD_MASS_MAX - gameSettings.FOOD_MASS_MIN);
            super(x, y, Math.floor(mass), getRandomPastelColor());
            this.radius = 4 + Math.sqrt(this.mass) * 4;
            this.targetRadius = this.radius;
        }
    }
    class Virus extends Entity {
        constructor(x, y, initialMass = -1) {
            const mass = initialMass === -1
                ? Math.floor(gameSettings.VIRUS_MASS_MIN + Math.random() * (gameSettings.VIRUS_MASS_MAX - gameSettings.VIRUS_MASS_MIN))
                : initialMass;
            super(x, y, mass, gameSettings.VIRUS_COLOR);
            this.baseMass = this.mass;
            this.ejectionVx = 0; this.ejectionVy = 0; this.ejectionTimer = 0;
            this.updateRadiusAndTarget(); this.radius = this.targetRadius;
        }
        updateRadiusAndTarget() { this.targetRadius = 4 + Math.sqrt(this.mass) * 4.5; }
        draw(ctx) {
            // More, smaller spikes, no animation, no rotation
            const numOuterPoints = 20 + Math.floor(this.radius / 10); // More spikes
            const outerR = this.radius;
            const innerR = this.radius * 0.85; // Shallower spikes (closer to outerR)
            const rotation = 0; // No rotation

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
            // Slightly thicker outline for viruses
            ctx.lineWidth = Math.max(3 / camera.zoom, this.radius / 20);
            ctx.stroke();
        }
        onFed(spewedItem) {
            this.mass += gameSettings.SPEWED_MASS_YIELD; this.updateRadiusAndTarget();
            if (this.mass > gameSettings.VIRUS_FED_LIMIT && viruses.length < gameSettings.MAX_VIRUS_COUNT) {
                this.mass = this.baseMass;
                this.updateRadiusAndTarget();
                const angle = Math.atan2(spewedItem.y - this.y, spewedItem.x - this.x);
                const shootAngle = angle + Math.PI;
                const ejectDist = this.radius * 1.5;
                const newVirusSpawnMass = Math.floor(gameSettings.VIRUS_MASS_MIN + Math.random() * (gameSettings.VIRUS_MASS_MAX - gameSettings.VIRUS_MASS_MIN));
                const newVirusRadius = 4 + Math.sqrt(newVirusSpawnMass) * 4.5;

                const spawnPos = findSafeSpawnPosition(newVirusRadius, "virus", {
                    preferredX: this.x + Math.cos(shootAngle) * ejectDist * 2.5,
                    preferredY: this.y + Math.sin(shootAngle) * ejectDist * 2.5,
                });
                const newVirus = new Virus(spawnPos.x, spawnPos.y, newVirusSpawnMass);
                const virusEjectSpeed = gameSettings.SPEWED_MASS_SPEED * 1.1;
                newVirus.ejectionVx = Math.cos(shootAngle) * virusEjectSpeed;
                newVirus.ejectionVy = Math.sin(shootAngle) * virusEjectSpeed;
                newVirus.ejectionTimer = gameSettings.CELL_SPLIT_EJECT_DURATION * 0.8;
                viruses.push(newVirus);
            }
        }
    }
    class SpewedMass extends Entity {
        constructor(x, y, color, ownerId, vx, vy) {
            super(x, y, gameSettings.SPEWED_MASS_YIELD, color);
            this.radius = 4 + Math.sqrt(gameSettings.SPEWED_MASS_YIELD) * 4;
            this.targetRadius = this.radius;
            this.ownerId = ownerId; this.createdAt = Date.now();
            this.vx = vx; this.vy = vy; this.lifeTimer = gameSettings.SPEWED_MASS_LIFESPAN;
        }
        update(dt, dtFrameFactor) {
            this.x += this.vx * dtFrameFactor; this.y += this.vy * dtFrameFactor;
            this.vx *= gameSettings.SPEWED_MASS_DAMPING; this.vy *= gameSettings.SPEWED_MASS_DAMPING;
            if (Math.abs(this.vx) < 0.05) this.vx = 0; if (Math.abs(this.vy) < 0.05) this.vy = 0;
            this.x = Math.max(this.radius, Math.min(this.x, gameSettings.MAP_WIDTH - this.radius));
            this.y = Math.max(this.radius, Math.min(this.y, gameSettings.MAP_HEIGHT - this.radius));
            this.lifeTimer -= dt;
        }
    }
    function findSafeSpawnPosition(radius, entityType = "unknown", preferences = {}) {
        const MAX_TRIES = 30; let spawnX, spawnY;
        let bestSpawnX = preferences.preferredX || Math.random() * (gameSettings.MAP_WIDTH - radius * 2) + radius;
        let bestSpawnY = preferences.preferredY || Math.random() * (gameSettings.MAP_HEIGHT - radius * 2) + radius;
        let foundSafe = false;
        const playerCells = (player && player.cells) ? player.cells : [];
        const allPlayerAndBotCells = [...playerCells, ...bots.flatMap(b => b.cells)];

        for (let i = 0; i < MAX_TRIES; i++) {
            if (i < 5 && preferences.preferredX !== undefined) {
                spawnX = preferences.preferredX + (Math.random() - 0.5) * radius * (i + 1) * 2;
                spawnY = preferences.preferredY + (Math.random() - 0.5) * radius * (i + 1) * 2;
            } else {
                spawnX = Math.random() * (gameSettings.MAP_WIDTH - radius * 2) + radius;
                spawnY = Math.random() * (gameSettings.MAP_HEIGHT - radius * 2) + radius;
            }
            spawnX = Math.max(radius, Math.min(spawnX, gameSettings.MAP_WIDTH - radius));
            spawnY = Math.max(radius, Math.min(spawnY, gameSettings.MAP_HEIGHT - radius));
            let isSafe = true;
            for (const cell of allPlayerAndBotCells) {
                const distSq = (spawnX - cell.x) ** 2 + (spawnY - cell.y) ** 2;
                if (distSq < (radius + cell.radius + 10) ** 2) { isSafe = false; break; }
            }
            if (!isSafe) continue;
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

    function findControllerById(id) {
        if (player && player.id === id) return player;
        return bots.find(b => b.id === id);
    }

    function getAllPotentialSpectateTargets() {
        const targets = [];
        if (player && !isPlayerDead && player.cells.length > 0) {
            targets.push(player);
        }
        bots.forEach(bot => {
            if (bot.cells.length > 0) {
                targets.push(bot);
            }
        });
        return targets.sort((a, b) => b.getTotalMass() - a.getTotalMass());
    }

    function updateSpectateControlsUI() {
        if (!isSpectating) {
            spectateControls.style.display = 'none';
            return;
        }
        spectateControls.style.display = 'block';
        if (spectateMode === 'target' && spectateTargetId !== null) {
            const target = findControllerById(spectateTargetId);
            spectatingInfo.textContent = target ? `Spectating: ${target.name}` : "Spectating: Target Lost";
            toggleFreeRoamButton.textContent = "Toggle Free Roam (Target)";
        } else if (spectateMode === 'freeRoam') {
            spectatingInfo.textContent = "Spectating: Free Roam (WASD to move)";
            toggleFreeRoamButton.textContent = "Toggle Free Roam (Free)";
        } else {
            spectatingInfo.textContent = "Spectating: None";
            toggleFreeRoamButton.textContent = "Toggle Free Roam";
        }
    }

    function cycleSpectateTarget(direction) {
        if (spectateMode !== 'target' && spectateMode !== 'initial') {
            switchToTargetSpectate(null);
            return;
        }

        const targets = getAllPotentialSpectateTargets();
        if (targets.length === 0) {
            switchToFreeRoamSpectate();
            return;
        }

        let currentIndex = -1;
        if (spectateTargetId !== null) {
            currentIndex = targets.findIndex(t => t.id === spectateTargetId);
        }

        if (direction > 0) {
            currentIndex++;
            if (currentIndex >= targets.length) currentIndex = 0;
        } else {
            currentIndex--;
            if (currentIndex < 0) currentIndex = targets.length - 1;
        }

        if (targets[currentIndex]) {
            spectateTargetId = targets[currentIndex].id;
            spectateMode = 'target';
        } else {
            switchToFreeRoamSpectate();
        }
        updateSpectateControlsUI();
    }

    function switchToTargetSpectate(targetIdToSet) {
        const targetController = findControllerById(targetIdToSet);

        if (targetController && targetController.cells.length > 0) {
            spectateMode = 'target';
            spectateTargetId = targetIdToSet;
        } else {
            // If specific target is invalid or has no cells, try to find another, or go free roam
            const allTargets = getAllPotentialSpectateTargets();
            if (allTargets.length > 0 && allTargets[0].id !== targetIdToSet) { // Avoid infinite loop if first target is bad
                spectateMode = 'target';
                spectateTargetId = allTargets[0].id;
            } else {
                // Fallback to free roam if no valid target can be found
                switchToFreeRoamSpectate();
                return; // switchToFreeRoamSpectate will update UI
            }
        }
        updateSpectateControlsUI();
    }

    function switchToFreeRoamSpectate() {
        spectateMode = 'freeRoam';
        spectateTargetId = null;
        if (camera.x && camera.y) {
            freeRoamCameraX = camera.x;
            freeRoamCameraY = camera.y;
        } else {
            freeRoamCameraX = gameSettings.MAP_WIDTH / 2;
            freeRoamCameraY = gameSettings.MAP_HEIGHT / 2;
        }
        camera.targetZoom = SPECTATE_FREE_ROAM_ZOOM; // Set targetZoom
        camera.targetZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, camera.targetZoom)); // Clamp
        updateSpectateControlsUI();
    }


    function startSpectating() {
        isSpectating = true; // CRITICAL: This must be true for click listeners to work
        // playerCanRespawnManually is managed elsewhere (initGame or death timer)

        respawnNowButton.style.display = 'none';
        gameOverMessage.style.display = 'none'; // Ensure game over is hidden
        spectateControls.style.display = 'block'; // Show spectate controls

        // Find an initial target or go to free roam
        const targets = getAllPotentialSpectateTargets();
        if (targets.length > 0) {
            // switchToTargetSpectate will handle setting spectateTargetId and spectateMode
            switchToTargetSpectate(targets[0].id);
        } else {
            switchToFreeRoamSpectate();
        }
        // updateSpectateControlsUI() is called by switchToTargetSpectate/switchToFreeRoamSpectate
    }

    function stopSpectating() {
        isSpectating = false;
        spectateTargetId = null;
        spectateControls.style.display = 'none';
    }

    function handleRespawn() {
        stopSpectating();
        isPlayerDead = false;
        playerCanRespawnManually = false;
        playerRespawnTimer = 0;

        if (!player) {
            const playerNameVal = playerNameInput.value || "Player";
            player = new PlayerController(getUniqueId(), playerNameVal, gameSettings.PLAYER_START_MASS, '#007bff');
        } else {
            player.respawn();
        }

        if (player && player.cells.length > 0) {
            const com = player.getCenterOfMassCell();
            camera.x = com.x; camera.y = com.y;
        } else {
            camera.x = gameSettings.MAP_WIDTH / 2;
            camera.y = gameSettings.MAP_HEIGHT / 2;
        }

        // Set a default game targetZoom when player (re)spawns
        let respawnZoom = Math.max(0.2, Math.min(1.5, Math.max(canvas.width / gameSettings.MAP_WIDTH, canvas.height / gameSettings.MAP_HEIGHT) * 1.2));
        camera.targetZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, respawnZoom));
        // camera.zoom could also be snapped here if instant zoom on respawn is preferred, then smooth from wheel.
        // For now, let it smoothly transition if it was different.

        gameOverMessage.style.display = 'none';
        spectateButton.style.display = 'none';
        respawnNowButton.style.display = 'none';
    }

    function handleFreeRoamCameraInput(dt) {
        if (!isSpectating || spectateMode !== 'freeRoam') return;
        const moveSpeed = (SPECTATE_CAMERA_SPEED / camera.zoom) * (dt / 1000);

        if (keysPressed['w'] || keysPressed['W'] || keysPressed['ArrowUp']) freeRoamCameraY -= moveSpeed;
        if (keysPressed['s'] || keysPressed['S'] || keysPressed['ArrowDown']) freeRoamCameraY += moveSpeed;
        if (keysPressed['a'] || keysPressed['A'] || keysPressed['ArrowLeft']) freeRoamCameraX -= moveSpeed;
        if (keysPressed['d'] || keysPressed['D'] || keysPressed['ArrowRight']) freeRoamCameraX += moveSpeed;

        const margin = 50 / camera.zoom;
        freeRoamCameraX = Math.max(margin, Math.min(freeRoamCameraX, gameSettings.MAP_WIDTH - margin));
        freeRoamCameraY = Math.max(margin, Math.min(freeRoamCameraY, gameSettings.MAP_HEIGHT - margin));
    }

    function initGame() {
        uniqueIdCounter = 0;

        isSpectating = false;
        spectateTargetId = null;
        spectateMode = 'target';
        freeRoamCameraX = 0;
        freeRoamCameraY = 0;
        Object.keys(keysPressed).forEach(key => keysPressed[key] = false);
        spectateControls.style.display = 'none';

        if (gameModeSelect.value === 'custom') loadSettingsFromCustomInputs();

        currentWorldConstantsForBots = {
            MAP_WIDTH: gameSettings.MAP_WIDTH, MAP_HEIGHT: gameSettings.MAP_HEIGHT,
            MIN_SPEW_MASS: gameSettings.MIN_SPEW_MASS_TOTAL,
            CELL_MIN_MASS_TO_SPLIT_FROM: gameSettings.CELL_MIN_MASS_TO_SPLIT_FROM, // Corrected name
            MIN_MASS_PER_SPLIT_PIECE: gameSettings.MIN_MASS_PER_SPLIT_PIECE,     // Added
            MAX_PLAYER_CELLS: gameSettings.MAX_PLAYER_CELLS,
            VIRUS_MASS_ABSORBED: gameSettings.VIRUS_MASS_MAX, // This effectively is the mass gained
            VIRUS_EAT_MASS_MULTIPLIER: gameSettings.VIRUS_EAT_MASS_MULTIPLIER, // Added
            PLAYER_SPLITS_ON_VIRUS_EAT: gameSettings.PLAYER_SPLITS_ON_VIRUS_EAT, // Added
            VIRUS_MAX_SPLIT: gameSettings.VIRUS_SPLIT_LOW_MAX_PIECES,
            EAT_MASS_RATIO: gameSettings.EAT_MASS_RATIO,
            PLAYER_MAX_SPEED: gameSettings.PLAYER_BASE_SPEED,
            PLAYER_MIN_SPEED: gameSettings.PLAYER_MIN_SPEED_CAP,
            EAT_MASS_RATIO_FOR_SPLIT: gameSettings.EAT_MASS_RATIO * gameSettings.AGGRESSIVE_BOT_SPLIT_EAT_FACTOR,
            CELL_RADIUS_MASS_FACTOR: 4, // Default, assuming '4' is the factor used in Entity class for radius calc
            GAME_GLOBAL_MERGE_COOLDOWN_MAX_MS: gameSettings.GLOBAL_MERGE_COOLDOWN_MAX_MS,
        };
        const playerNameVal = playerNameInput.value || "Player";
        const numBotsVal = parseInt(numBotsInput.value) || 0;
        currentGameBotAiType = botTypeSelect.value;

        player = null;
        isPlayerDead = false;
        playerRespawnTimer = 0;
        playerCanRespawnManually = false;

        bots = [];
        for (let i = 0; i < numBotsVal; i++) {
            bots.push(new PlayerController(getUniqueId(), `Bot ${i + 1}`, gameSettings.BOT_START_MASS, getRandomBotColor(), true, currentGameBotAiType));
        }
        food = []; viruses = []; spewedMasses = [];
        spawnInitialEntities();

        lastDecayTime = Date.now(); lastFoodSpawnTime = Date.now(); lastVirusSpawnTime = Date.now(); lastLeaderboardUpdateTime = Date.now();

        let initialZoom = Math.max(canvas.width / gameSettings.MAP_WIDTH, canvas.height / gameSettings.MAP_HEIGHT) * 1.2;
        initialZoom = Math.max(0.2, Math.min(1.5, initialZoom));

        if (startAsSpectatorCheckbox.checked) {
            isSpectating = true;
            isPlayerDead = true;
            playerCanRespawnManually = true;
            camera.x = gameSettings.MAP_WIDTH / 2;
            camera.y = gameSettings.MAP_HEIGHT / 2;
            startSpectating();
            if (spectateMode === 'freeRoam') {
                camera.targetZoom = SPECTATE_FREE_ROAM_ZOOM; // Set targetZoom
            } else {
                camera.targetZoom = initialZoom; // Set targetZoom
            }
            camera.zoom = camera.targetZoom; // Initialize zoom directly for immediate effect on start
        } else {
            isSpectating = false;
            isPlayerDead = false;
            playerCanRespawnManually = false;
            player = new PlayerController(getUniqueId(), playerNameVal, gameSettings.PLAYER_START_MASS, '#007bff');
            if (player.cells.length > 0) {
                const com = player.getCenterOfMassCell();
                camera.x = com.x; camera.y = com.y;
            } else {
                camera.x = gameSettings.MAP_WIDTH / 2;
                camera.y = gameSettings.MAP_HEIGHT / 2;
            }
            camera.targetZoom = initialZoom; // Set targetZoom
            camera.zoom = camera.targetZoom; // Initialize zoom directly for immediate effect on start
        }
        camera.targetZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, camera.targetZoom));
        camera.zoom = camera.targetZoom; // Ensure zoom also starts clamped

        startScreen.style.display = 'none'; gameContainer.style.display = 'block';
        gameOverMessage.style.display = 'none';
        resizeCanvas();
        if (gameLoopId) cancelAnimationFrame(gameLoopId);
        lastFrameTime = performance.now();
        gameLoop(lastFrameTime);
    }
    function spawnInitialEntities() {
        for (let i = 0; i < gameSettings.MAX_FOOD_COUNT / 1.5; i++) spawnFood();
        for (let i = 0; i < gameSettings.MAX_VIRUS_COUNT / 2; i++) spawnVirus();
    }
    function spawnFood() {
        if (food.length < gameSettings.MAX_FOOD_COUNT) {
            const tempFoodMass = gameSettings.FOOD_MASS_MIN + Math.random() * (gameSettings.FOOD_MASS_MAX - gameSettings.FOOD_MASS_MIN);
            const foodRadius = 4 + Math.sqrt(tempFoodMass) * 4;
            const spawnPos = findSafeSpawnPosition(foodRadius * 2, "food"); food.push(new Food(spawnPos.x, spawnPos.y));
        }
    }
    function spawnVirus() {
        if (viruses.length < gameSettings.MAX_VIRUS_COUNT) {
            const tempVirusMass = gameSettings.VIRUS_MASS_MIN + Math.random() * (gameSettings.VIRUS_MASS_MAX - gameSettings.VIRUS_MASS_MIN);
            const virusRadius = 4 + Math.sqrt(tempVirusMass) * 4.5;
            const spawnPos = findSafeSpawnPosition(virusRadius * 1.2, "virus"); viruses.push(new Virus(spawnPos.x, spawnPos.y, Math.floor(tempVirusMass)));
        }
    }

    function updateCamera() {
        let targetX, targetY;
        const ZOOM_INTERPOLATION_FACTOR = 0.08; // Adjust for desired smoothness (0.05 to 0.15 is usually good)

        if (isSpectating) {
            if (spectateMode === 'target' && spectateTargetId !== null) {
                const targetController = findControllerById(spectateTargetId);
                if (targetController && targetController.cells.length > 0) {
                    const com = targetController.getCenterOfMassCell();
                    targetX = com.x; targetY = com.y;
                } else {
                    switchToFreeRoamSpectate(); // Target lost, switch to free roam
                    targetX = freeRoamCameraX; targetY = freeRoamCameraY;
                }
            } else { // Free roam or no target
                targetX = freeRoamCameraX; targetY = freeRoamCameraY;
            }
        } else if (player && !isPlayerDead && player.cells.length > 0) {
            const com = player.getCenterOfMassCell();
            targetX = com.x; targetY = com.y;
        } else {
            targetX = camera.x || gameSettings.MAP_WIDTH / 2;
            targetY = camera.y || gameSettings.MAP_HEIGHT / 2;
        }

        camera.x += (targetX - camera.x) * 0.1; // Smooth pan for X
        camera.y += (targetY - camera.y) * 0.1; // Smooth pan for Y

        // Smooth zoom interpolation
        camera.zoom += (camera.targetZoom - camera.zoom) * ZOOM_INTERPOLATION_FACTOR;

        // Ensure zoom stays within bounds after interpolation (though targetZoom is already clamped)
        // This also handles the case where targetZoom might be very close but not equal to zoom.
        if (Math.abs(camera.targetZoom - camera.zoom) < 0.001) {
            camera.zoom = camera.targetZoom;
        }
        camera.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, camera.zoom));
    }

    function updateWorldMouseCoords() {
        worldMouseX = (screenMouseX - canvas.width / 2) / camera.zoom + camera.x;
        worldMouseY = (screenMouseY - canvas.height / 2) / camera.zoom + camera.y;
    }
    function checkCollisions() {
        const allControllers = [];
        if (player && !isPlayerDead && !isSpectating) {
            allControllers.push(player);
        }
        allControllers.push(...bots.filter(c => c && c.cells.length > 0));

        allControllers.forEach(controller => {
            for (let i = controller.cells.length - 1; i >= 0; i--) {
                if (i >= controller.cells.length) continue;
                const cell = controller.cells[i];
                if (!cell || cell.mass <= 0) continue;

                for (let j = food.length - 1; j >= 0; j--) {
                    const f = food[j]; if (!f) continue;
                    if (isColliding(cell, f, "food")) {
                        cell.mass += f.mass;
                        cell.updateRadiusAndTarget();
                        food.splice(j, 1);
                    }
                }
                for (let j = spewedMasses.length - 1; j >= 0; j--) {
                    const sm = spewedMasses[j]; if (!sm) continue;
                    if (isColliding(cell, sm, "spewed") && cell.mass > sm.mass * 1.1) {
                        cell.mass += sm.mass;
                        cell.updateRadiusAndTarget();
                        spewedMasses.splice(j, 1);
                    }
                }
                let virusEatenAndCellSplit = false;
                for (let j = viruses.length - 1; j >= 0; j--) {
                    const v = viruses[j]; if (!v) continue;
                    if (!controller.cells.includes(cell) || cell.mass <= 0) { virusEatenAndCellSplit = true; break; }

                    if (isColliding(cell, v, "virus") && cell.mass >= v.mass * gameSettings.VIRUS_EAT_MASS_MULTIPLIER) {
                        cell.mass += v.mass;
                        cell.updateRadiusAndTarget();
                        viruses.splice(j, 1);
                        controller.handleVirusEatSplit(cell);
                        virusEatenAndCellSplit = true; break;
                    }
                }
                if (virusEatenAndCellSplit) continue;
            }
        });
        for (let i = spewedMasses.length - 1; i >= 0; i--) {
            const sm = spewedMasses[i]; if (!sm) continue;
            for (let j = viruses.length - 1; j >= 0; j--) {
                const v = viruses[j]; if (!v) continue;
                if (isColliding(sm, v, "virus_feed")) { v.onFed(sm); spewedMasses.splice(i, 1); break; }
            }
        }
        const allActivePlayerCellsSnapshot = [];
        allControllers.forEach(c => { c.cells.forEach(cell_in_controller => { if (cell_in_controller && cell_in_controller.mass > 0) { allActivePlayerCellsSnapshot.push(cell_in_controller); } }); });

        for (let i = 0; i < allActivePlayerCellsSnapshot.length; i++) {
            const cellA = allActivePlayerCellsSnapshot[i];
            if (!cellA || cellA.mass <= 0) continue;
            for (let j = i + 1; j < allActivePlayerCellsSnapshot.length; j++) {
                const cellB = allActivePlayerCellsSnapshot[j];
                if (!cellB || cellB.mass <= 0) continue;
                if (cellA.ownerId === cellB.ownerId) continue;

                if (isColliding(cellA, cellB, "cell")) {
                    let eater, eatee;
                    if (cellA.mass >= cellB.mass * gameSettings.EAT_MASS_RATIO && cellA.mass > cellB.mass + Math.max(1, gameSettings.MIN_MASS_PER_SPLIT_PIECE * 0.1)) {
                        eater = cellA; eatee = cellB;
                    } else if (cellB.mass >= cellA.mass * gameSettings.EAT_MASS_RATIO && cellB.mass > cellA.mass + Math.max(1, gameSettings.MIN_MASS_PER_SPLIT_PIECE * 0.1)) {
                        eater = cellB; eatee = cellA;
                    }
                    if (eater) {
                        eater.mass += eatee.mass; eatee.mass = 0;
                        eater.updateRadiusAndTarget();
                        const ownerOfEatee = allControllers.find(c => c.id === eatee.ownerId);
                        if (ownerOfEatee) { ownerOfEatee.cells = ownerOfEatee.cells.filter(c => c.id !== eatee.id); }
                        const eateeIndexInSnapshot = allActivePlayerCellsSnapshot.findIndex(c => c && c.id === eatee.id);
                        if (eateeIndexInSnapshot !== -1) allActivePlayerCellsSnapshot[eateeIndexInSnapshot] = null;
                        if (eater === cellB) break;
                    }
                }
            }
        }
        allControllers.forEach(c => { c.cells = c.cells.filter(cell => cell.mass >= gameSettings.MIN_MASS_PER_SPLIT_PIECE / 2); });
    }
    function isColliding(obj1, obj2, type) {
        if (!obj1 || !obj2 || obj1.radius === undefined || obj2.radius === undefined) return false;
        const dx = obj1.x - obj2.x; const dy = obj1.y - obj2.y; const distSq = dx * dx + dy * dy;
        switch (type) {
            case "food": return distSq < obj1.radius * obj1.radius * 0.8;
            case "spewed": return distSq < obj1.radius * obj1.radius * 0.8;
            case "virus": return distSq < (obj1.radius - obj2.radius * 0.2) ** 2;
            case "virus_feed": return distSq < (obj2.radius + obj1.radius * 0.5) ** 2;
            case "cell":
                const larger = obj1.mass > obj2.mass ? obj1 : obj2; const smaller = obj1.mass <= obj2.mass ? obj1 : obj2;
                return distSq < (larger.radius - smaller.radius * 0.33) ** 2;
            default: return distSq < (obj1.radius + obj2.radius) ** 2 * 0.25;
        }
    }
    function updateHUD() {
        let nameToShow = "-";
        let massToShow = "0";
        let cellsToShow = "0";
        let currentGlobalMergeCooldown = 0;
        let targetForHUD = null;
        let isActualPlayerActive = player && !isPlayerDead && !isSpectating;

        if (isSpectating && spectateMode === 'target' && spectateTargetId !== null) {
            targetForHUD = findControllerById(spectateTargetId);
        } else if (isActualPlayerActive) {
            targetForHUD = player;
        }

        if (targetForHUD) {
            nameToShow = targetForHUD.name;
            massToShow = Math.floor(targetForHUD.getTotalMass());
            cellsToShow = targetForHUD.cells.length;
            currentGlobalMergeCooldown = targetForHUD.globalMergeCooldown;
        } else if (isSpectating && spectateMode === 'freeRoam') {
            nameToShow = "Free Roam";
        } else if (isPlayerDead) {
            nameToShow = player ? player.name : (playerNameInput.value || "Player Spectator");
            massToShow = "0";
            if (player) massToShow += " (Dead)";
            cellsToShow = "0";
        } else if (!player && !isSpectating) {
            return;
        }

        playerNameDisplay.textContent = nameToShow;
        playerMassDisplay.textContent = massToShow;
        playerCellCountDisplay.textContent = cellsToShow;

        if (playerGlobalMergeCooldownDisplay) {
            if (targetForHUD && targetForHUD.cells.length > 1) {
                if (currentGlobalMergeCooldown > 0) {
                    playerGlobalMergeCooldownDisplay.textContent = `Merge CD: ${(currentGlobalMergeCooldown / 1000).toFixed(1)}s`;
                    playerGlobalMergeCooldownDisplay.style.display = 'block';
                } else {
                    playerGlobalMergeCooldownDisplay.textContent = 'Merge Ready!';
                    playerGlobalMergeCooldownDisplay.style.display = 'block';
                }
            } else {
                playerGlobalMergeCooldownDisplay.style.display = 'none';
            }
        }

        const now = Date.now();
        if (now - lastLeaderboardUpdateTime > 1000) {
            lastLeaderboardUpdateTime = now;
            const leaderSource = [];
            if (player && !isPlayerDead && !isSpectating) {
                leaderSource.push(player);
            }
            leaderSource.push(...bots);

            const allPlayersForLeaderboard = leaderSource
                .filter(p => p && p.cells.length > 0 && p.getTotalMass() > 0) // Keep filtering for active for sorting
                .map(p => ({ name: p.name, mass: Math.floor(p.getTotalMass()), id: p.id }))
                .sort((a, b) => b.mass - a.mass).slice(0, 10);
            leaderboardList.innerHTML = '';
            allPlayersForLeaderboard.forEach(pLeader => {
                const li = document.createElement('li');
                li.textContent = `${pLeader.name}: ${pLeader.mass}`;
                li.dataset.id = pLeader.id; // Store ID for click-to-spectate
                li.style.cursor = 'pointer'; // Indicate it's clickable

                if (player && pLeader.id === player.id && !isPlayerDead && !isSpectating) {
                    li.style.fontWeight = 'bold'; li.style.color = player.color;
                } else if (isSpectating && spectateTargetId === pLeader.id) {
                    li.style.fontWeight = 'bold'; li.style.color = '#ff8c00';
                }
                leaderboardList.appendChild(li);
            });
        }
    }
    function drawGridAndBorders() {
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2); ctx.scale(camera.zoom, camera.zoom); ctx.translate(-camera.x, -camera.y);
        const viewLeft = camera.x - (canvas.width / 2) / camera.zoom; const viewTop = camera.y - (canvas.height / 2) / camera.zoom;
        const viewRight = camera.x + (canvas.width / 2) / camera.zoom; const viewBottom = camera.y + (canvas.height / 2) / camera.zoom;
        ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1 / camera.zoom; // Grid lines can remain thin
        const startGridX = Math.floor(viewLeft / gameSettings.GRID_SIZE) * gameSettings.GRID_SIZE; const endGridX = Math.ceil(viewRight / gameSettings.GRID_SIZE) * gameSettings.GRID_SIZE;
        const startGridY = Math.floor(viewTop / gameSettings.GRID_SIZE) * gameSettings.GRID_SIZE; const endGridY = Math.ceil(viewBottom / gameSettings.GRID_SIZE) * gameSettings.GRID_SIZE;
        for (let x = startGridX; x < endGridX; x += gameSettings.GRID_SIZE) {
            if (x < 0 || x > gameSettings.MAP_WIDTH) continue;
            ctx.beginPath(); ctx.moveTo(x, Math.max(0, viewTop)); ctx.lineTo(x, Math.min(gameSettings.MAP_HEIGHT, viewBottom)); ctx.stroke();
        }
        for (let y = startGridY; y < endGridY; y += gameSettings.GRID_SIZE) {
            if (y < 0 || y > gameSettings.MAP_HEIGHT) continue;
            ctx.beginPath(); ctx.moveTo(Math.max(0, viewLeft), y); ctx.lineTo(Math.min(gameSettings.MAP_WIDTH, viewRight), y); ctx.stroke();
        }
        ctx.strokeStyle = '#333';
        // Thicker border for map
        ctx.lineWidth = Math.max(4 / camera.zoom, 2);
        ctx.strokeRect(0, 0, gameSettings.MAP_WIDTH, gameSettings.MAP_HEIGHT);
        ctx.restore();
    }

    let lastFrameTime = 0;
    function gameLoop(timestamp) {
        const dt = Math.min(50, timestamp - lastFrameTime);
        const dtFrameFactor = dt / (1000 / 60);
        lastFrameTime = timestamp;

        if (!isSpectating || spectateMode === 'target') {
            updateWorldMouseCoords();
        }

        const now = Date.now();
        if (now - lastDecayTime > gameSettings.MASS_DECAY_INTERVAL) {
            if (player && !isPlayerDead && !isSpectating) player.applyMassDecay();
            bots.forEach(bot => bot.applyMassDecay()); lastDecayTime = now;
        }
        if (now - lastFoodSpawnTime > gameSettings.FOOD_SPAWN_INTERVAL) { spawnFood(); lastFoodSpawnTime = now; }
        if (now - lastVirusSpawnTime > gameSettings.VIRUS_SPAWN_INTERVAL) { spawnVirus(); lastVirusSpawnTime = now; }

        for (let i = spewedMasses.length - 1; i >= 0; i--) {
            spewedMasses[i].update(dt, dtFrameFactor);
            if (spewedMasses[i].lifeTimer <= 0) spewedMasses.splice(i, 1);
        }
        viruses.forEach(v => {
            v.animateRadiusLogic(dtFrameFactor); // Still animate radius for smooth appearance/disappearance
            if (v.ejectionTimer > 0) {
                v.x += v.ejectionVx * dtFrameFactor; v.y += v.ejectionVy * dtFrameFactor; v.ejectionTimer -= dt;
                v.ejectionVx *= gameSettings.CELL_EJECTION_DAMPING;
                v.ejectionVy *= gameSettings.CELL_EJECTION_DAMPING;
                v.x = Math.max(v.radius, Math.min(v.x, gameSettings.MAP_WIDTH - v.radius));
                v.y = Math.max(v.radius, Math.min(v.y, gameSettings.MAP_HEIGHT - v.radius));
                if (v.ejectionTimer <= 0 || (Math.abs(v.ejectionVx) < 0.1 && Math.abs(v.ejectionVy) < 0.1)) {
                    v.ejectionTimer = 0; v.ejectionVx = 0; v.ejectionVy = 0;
                }
            }
        });

        if (player && !isPlayerDead && !isSpectating) {
            player.update(dt, dtFrameFactor);
            if (player.cells.length === 0 && player.getTotalMass() === 0) {
                isPlayerDead = true;
                playerRespawnTimer = gameSettings.PLAYER_RESPAWN_DELAY;
                playerCanRespawnManually = false;
                gameOverText.textContent = "You were eaten!";
                gameOverMessage.style.display = 'block';
                spectateButton.style.display = 'inline-block';
                respawnNowButton.style.display = 'none';
                respawnTimerText.textContent = `Respawn in: ${(playerRespawnTimer / 1000).toFixed(1)}s`;
            }
        } else if (player && isPlayerDead && !isSpectating) {
            playerRespawnTimer -= dt;
            if (playerRespawnTimer <= 0) {
                playerRespawnTimer = 0;
                playerCanRespawnManually = true;
                respawnTimerText.textContent = "Ready to Respawn!";
                respawnNowButton.style.display = 'inline-block';
            } else {
                respawnTimerText.textContent = `Respawn in: ${(playerRespawnTimer / 1000).toFixed(1)}s`;
            }
        }

        if (isSpectating && spectateMode === 'freeRoam') {
            handleFreeRoamCameraInput(dt);
        }

        bots.forEach(bot => bot.update(dt, dtFrameFactor));
        for (let i = bots.length - 1; i >= 0; i--) {
            if (bots[i].cells.length === 0 && bots[i].getTotalMass() === 0) {
                if (isSpectating && spectateTargetId === bots[i].id) {
                    switchToFreeRoamSpectate();
                }
                const deadBot = bots[i];
                bots[i] = new PlayerController(deadBot.id, deadBot.name, gameSettings.BOT_START_MASS, getRandomBotColor(), true, currentGameBotAiType);
            }
        }

        checkCollisions();
        updateCamera();
        updateHUD();

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawGridAndBorders();
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2); ctx.scale(camera.zoom, camera.zoom); ctx.translate(-camera.x, -camera.y);

        const renderables = [
            ...food,
            ...spewedMasses,
            ...viruses,
            ...(player && player.cells ? player.cells : []),
            ...bots.flatMap(b => b.cells)
        ];
        renderables.sort((a, b) => a.mass - b.mass);
        renderables.forEach(e => e.draw(ctx));
        ctx.restore();

        gameLoopId = requestAnimationFrame(gameLoop);
    }

    startGameButton.addEventListener('click', initGame);

    restartGameButton.addEventListener('click', () => {
        if (gameLoopId) cancelAnimationFrame(gameLoopId);
        stopSpectating();
        gameOverMessage.style.display = 'none';
        startScreen.style.display = 'block';
        gameContainer.style.display = 'none';
    });

    spectateButton.addEventListener('click', () => {
        startSpectating();
    });

    respawnNowButton.addEventListener('click', () => {
        if (playerCanRespawnManually) {
            handleRespawn();
        }
    });

    prevSpectateTargetButton.addEventListener('click', () => cycleSpectateTarget(-1));
    nextSpectateTargetButton.addEventListener('click', () => cycleSpectateTarget(1));
    toggleFreeRoamButton.addEventListener('click', () => {
        if (spectateMode === 'target') {
            switchToFreeRoamSpectate();
        } else {
            switchToTargetSpectate(null);
        }
    });
    spectateRespawnButton.addEventListener('click', () => {
        handleRespawn();
    });
    spectateBackToMenuButton.addEventListener('click', () => {
        if (gameLoopId) cancelAnimationFrame(gameLoopId);
        stopSpectating();
        gameOverMessage.style.display = 'none';
        startScreen.style.display = 'block';
        gameContainer.style.display = 'none';
    });

    leaderboardList.addEventListener('click', (e) => {
        if (!isSpectating && !isPlayerDead) return; // Allow clicking leaderboard to spectate if player is dead

        const listItem = e.target.closest('li[data-id]');
        if (listItem && listItem.dataset.id) {
            const targetId = parseInt(listItem.dataset.id);
            const controllerToSpectate = findControllerById(targetId);
            if (controllerToSpectate && controllerToSpectate.cells.length > 0) {
                // If not already spectating, start spectating mode
                if (!isSpectating) {
                    startSpectating(); // This sets up spectate mode
                }
                switchToTargetSpectate(targetId);
            } else if (controllerToSpectate) {
                // Target exists but has no cells (e.g. dead player on leaderboard)
                // Optionally provide feedback or just do nothing / switch to free roam
                if (!isSpectating) startSpectating();
                switchToFreeRoamSpectate(); // Fallback if target is un-spectate-able
            }
        }
    });

    canvas.addEventListener('click', (e) => {
        if (!isSpectating) return; // Only allow cell clicking when spectating

        // screenMouseX and screenMouseY are already updated by the mousemove listener
        const clickWorldX = (screenMouseX - canvas.width / 2) / camera.zoom + camera.x;
        const clickWorldY = (screenMouseY - canvas.height / 2) / camera.zoom + camera.y;

        const allDrawableCells = [
            ...(player && player.cells ? player.cells : []), // Include player cells if they exist
            ...bots.flatMap(b => b.cells)
        ].filter(cell => cell && cell.mass > 0);

        // Sort by mass descending to click the "topmost" cell in case of overlap
        allDrawableCells.sort((a, b) => b.mass - a.mass);

        for (const cell of allDrawableCells) {
            const distSq = (clickWorldX - cell.x) ** 2 + (clickWorldY - cell.y) ** 2;
            if (distSq < cell.radius * cell.radius) {
                // Clicked on this cell
                if (cell.ownerId !== spectateTargetId || spectateMode === 'freeRoam') {
                    switchToTargetSpectate(cell.ownerId);
                }
                return; // Spectate the first one hit
            }
        }
    });

    canvas.addEventListener('mousemove', (e) => { screenMouseX = e.clientX; screenMouseY = e.clientY; });

    // Mouse Wheel Zoom
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault(); // Prevent page scrolling
        const zoomDirection = e.deltaY > 0 ? -1 : 1; // -1 for zoom out, 1 for zoom in

        // Calculate the new target zoom
        let newTargetZoom = camera.targetZoom * (1 + zoomDirection * ZOOM_SPEED_FACTOR);
        camera.targetZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newTargetZoom));
    });


    window.addEventListener('keydown', (e) => {
        if (isSpectating && spectateMode === 'freeRoam') {
            keysPressed[e.key.toLowerCase()] = true;
            if (["arrowup", "arrowdown", "arrowleft", "arrowright"].includes(e.key.toLowerCase())) {
                e.preventDefault();
            }
        }

        if (!player || isPlayerDead || isSpectating) {
            if (e.key === 'w' || e.key === 'W' || e.code === 'Space') {
                e.preventDefault();
            }
            return;
        }

        if (e.key === 'w' || e.key === 'W') player.initiateSpew();
        if (e.code === 'Space') { e.preventDefault(); player.initiateSplit(); }
    });

    window.addEventListener('keyup', (e) => {
        if (isSpectating && spectateMode === 'freeRoam') {
            keysPressed[e.key.toLowerCase()] = false;
        }
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
                let parts = color.match(/\d+/g).map(Number); let amt = Math.round(2.55 * percent * (255 / 100));
                parts[0] = Math.max(0, Math.min(255, parts[0] - amt)); parts[1] = Math.max(0, Math.min(255, parts[1] - amt)); parts[2] = Math.max(0, Math.min(255, parts[2] - amt));
                return `rgb(${parts[0]},${parts[1]},${parts[2]})`;
            }
            else if (color.startsWith('hsl')) {
                let parts = color.match(/(\d+(\.\d+)?)/g).map(Number);
                parts[2] = Math.max(0, Math.min(100, parts[2] - percent));
                return `hsl(${parts[0]},${parts[1]}%,${parts[2]}%)`;
            }
        } catch (error) { return color; }
        return color;
    }
});