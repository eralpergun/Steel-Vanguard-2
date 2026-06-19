import { Vec2, resolveCircleAABB, resolveCircleCircle, moveTowardsAngle } from './utils';

export type Customization = {
    paintJob: string;
    decal: string;
    visualMod: string;
    skin: string;
};

export type Upgrades = {
    health: number;
    speed: number;
    damage: number;
    reload: number;
};

export type Tank = {
    id: number;
    x: number; y: number;
    radius: number;
    hullAngle: number;
    turretAngle: number;
    speed: number;
    maxSpeed: number;
    turnSpeed: number;
    turretTurnSpeed: number;
    health: number;
    maxHealth: number;
    reloadTimer: number;
    reloadTime: number;
    speedBuffTimer: number;
    lastDamageTime: number;
    damage: number;
    armorFront: number;
    armorSide: number;
    armorRear: number;
    ammo: number;
    maxAmmo: number;
    isPlayer: boolean;
    color: string;
    type?: string;
    customization?: Customization;
};

export type Projectile = {
    x: number; y: number;
    vx: number; vy: number;
    radius: number;
    damage: number;
    ownerId: number;
    life: number;
    trail: {x: number, y: number}[];
};

export type Obstacle = {
    id?: number;
    x: number; y: number;
    w: number; h: number;
    type: 'building' | 'ruin' | 'wall';
    health: number;
    maxHealth: number;
};

export type Shockwave = {
    x: number; y: number;
    radius: number;
    maxRadius: number;
    life: number;
    color: string;
};

export type Decoration = {
    x: number; y: number;
    size: number;
    type: 'crater' | 'rubble' | 'dead_tank';
    rotation: number;
    color?: string;
};

export type Particle = {
    x: number; y: number;
    vx: number; vy: number;
    life: number; maxLife: number;
    color: string; size: number;
    shape?: 'circle' | 'square' | 'line';
    rotation?: number;
    rotationSpeed?: number;
};

export type FloatingText = {
    x: number; y: number;
    text: string;
    life: number; maxLife: number;
    color: string;
};

export type Item = {
    id: number;
    x: number; y: number;
    radius: number;
    type: 'repair' | 'speed' | 'ammo';
    life: number;
};

export type MissionItem = {
    x: number; y: number;
    collected: boolean;
};

export type Mission = {
    type: 'capture' | 'destroy' | 'survive' | 'collect';
    x: number; y: number;
    radius?: number;
    targetId?: number;
    progress: number;
    active: boolean;
    title: string;
    rewardDesc: string;
    duration?: number;
    maxDuration?: number;
    itemsToCollect?: MissionItem[];
};

export class GameEngine {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private onUpdateUI: (state: any) => void;
    private isRunning: boolean = false;
    private lastTime: number = 0;
    private animationFrameId: number = 0;

    private keys: Set<string> = new Set();
    private mouseX: number = 0;
    private mouseY: number = 0;
    private isMouseDown: boolean = false;
    private isRightMouseDown: boolean = false;

    private nextId: number = 1;
    private player!: Tank;
    private enemies: Tank[] = [];
    private projectiles: Projectile[] = [];
    private obstacles: Obstacle[] = [];
    private decorations: Decoration[] = [];
    private particles: Particle[] = [];
    private floatingTexts: FloatingText[] = [];
    private items: Item[] = [];
    private shockwaves: Shockwave[] = [];

    public currentMission: Mission | null = null;
    private missionSpawnTimer: number = 5; // First mission after 5 seconds

    public isPaused: boolean = false;
    private playerTankType: 'light' | 'medium' | 'heavy' | '67' | 'brr' | 'tralalero' | 'tung' | 'cappucino' | 'lirili' | 'secret' | 'shitty' | 'op_tank' | 'bulldog' | 'phantom' | 'titan' | 'wasp' | 'paladin' | 'vortex';
    private customization: Customization;

    public isMobile: boolean = false;
    private mobileMoveX: number = 0;
    private mobileMoveY: number = 0;
    private mobileAimX: number = 0;
    private mobileAimY: number = 0;

    public setMobileMove(dx: number, dy: number) {
        this.mobileMoveX = dx;
        this.mobileMoveY = dy;
    }

    public setMobileAim(dx: number, dy: number) {
        this.mobileAimX = dx;
        this.mobileAimY = dy;
    }

    public setMobileFire(firing: boolean) {
        this.isMouseDown = firing;
    }

    public setMobileMachineGun(firing: boolean) {
        this.isRightMouseDown = firing;
    }

    public triggerMobileAirstrike() {
        this.keys.add('f');
        setTimeout(() => this.keys.delete('f'), 100);
    }

    private score: number = 0;
    private spawnTimer: number = 0;
    private itemSpawnTimer: number = 2.0;
    private airstrikeCooldown: number = 0;
    private airstrikes: {targetId: number, x: number, y: number, timer: number, angle: number}[] = [];
    private planes: {x: number, y: number, angle: number, speed: number, life: number}[] = [];
    private mgReloadTimer: number = 0;

    private trees: {x: number, y: number, size: number, type: number}[] = [];
    private bgCanvas!: HTMLCanvasElement;
    private bgCtx!: CanvasRenderingContext2D;

    private camX: number = 0;
    private camY: number = 0;
    private shakeAmount: number = 0;

    private difficulty: 'easy' | 'normal' | 'hard' | 'custom';
    private customEnemyCount?: number;
    private upgrades: Upgrades;
    private killFeed: Array<{ id: number; type: string; timestamp: number }> = [];

    private textures: Record<string, HTMLImageElement> = {};
    private texturesLoaded: boolean = false;

    constructor(canvas: HTMLCanvasElement, tankType: 'light' | 'medium' | 'heavy' | '67' | 'brr' | 'tralalero' | 'tung' | 'cappucino' | 'lirili' | 'secret' | 'shitty' | 'op_tank' | 'bulldog' | 'phantom' | 'titan' | 'wasp' | 'paladin' | 'vortex', difficulty: 'easy' | 'normal' | 'hard' | 'custom', onUpdateUI: (state: any) => void, customization: Customization, customEnemyCount?: number, upgrades?: Upgrades) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')!;
        this.playerTankType = tankType;
        this.difficulty = difficulty;
        this.onUpdateUI = onUpdateUI;
        this.customization = customization;
        this.customEnemyCount = customEnemyCount;
        this.upgrades = upgrades || { health: 0, speed: 0, damage: 0, reload: 0 };

        this.loadTextures();
        this.init();
        this.setupInput();
    }

    private loadTextures() {
        const urls: Record<string, string> = {
            ruin0: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Ruined_buildings_in_Kabul.jpg/400px-Ruined_buildings_in_Kabul.jpg',
            ruin1: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Ruined_house_in_Agdam.jpg/400px-Ruined_house_in_Agdam.jpg',
            ruin2: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Ruined_house_in_the_village_of_Kopachi.jpg/400px-Ruined_house_in_the_village_of_Kopachi.jpg',
            crater: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Lochnagar_Crater.jpg/300px-Lochnagar_Crater.jpg'
        };

        let loadedCount = 0;
        const total = Object.keys(urls).length;

        for (const [key, url] of Object.entries(urls)) {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = url;
            img.onload = () => {
                loadedCount++;
                if (loadedCount === total) {
                    this.texturesLoaded = true;
                }
            };
            this.textures[key] = img;
        }
    }

    private init() {
        this.spawnTimer = 1.0;
        this.killFeed = [];
        
        // Balanced Medium Tank (Default)
        let radius = 20, health = 180, speed = 225, turn = 3.0, turretTurn = 5.0, reload = 1.1, damage = 45, maxAmmo = 50;
        
        let startEnemies = 6;
        if (this.difficulty === 'easy') startEnemies = 4;
        else if (this.difficulty === 'hard') startEnemies = 8;

        // ... (rest of init)
        if (this.playerTankType === 'light') {
            // Balanced Light Tank
            radius = 16; health = 108; speed = 360; turn = 4.5; turretTurn = 6.0; reload = 0.66; damage = 27; maxAmmo = 80;
        } else if (this.playerTankType === 'heavy') {
            // Balanced Heavy Tank
            radius = 26; health = 360; speed = 198; turn = 2.0; turretTurn = 3.5; reload = 1.65; damage = 90; maxAmmo = 30;
        } else if (this.playerTankType === '67') {
            radius = 22; health = 270; speed = 315; turn = 4.0; turretTurn = 6.0; reload = 0.88; damage = 108; maxAmmo = 100;
        } else if (this.playerTankType === 'brr') {
            radius = 18; health = 225; speed = 360; turn = 5.0; turretTurn = 8.0; reload = 0.22; damage = 22; maxAmmo = 200;
        } else if (this.playerTankType === 'tralalero') {
            radius = 30; health = 720; speed = 162; turn = 2.5; turretTurn = 4.0; reload = 1.1; damage = 180; maxAmmo = 50;
        } else if (this.playerTankType === 'tung') {
            // Tung Tung Sahur - Fast, high damage, low health
            radius = 18; health = 135; speed = 380; turn = 4.5; turretTurn = 7.0; reload = 0.55; damage = 65; maxAmmo = 120;
        } else if (this.playerTankType === 'cappucino') {
            // Cappucino Assasino - Medium speed, medium health, very high damage, slow reload
            radius = 24; health = 225; speed = 250; turn = 3.5; turretTurn = 4.5; reload = 2.0; damage = 150; maxAmmo = 40;
        } else if (this.playerTankType === 'lirili') {
            // Lirili Larila - Balanced but with a special ability
            radius = 19; health = 160; speed = 300; turn = 6.0; turretTurn = 9.0; reload = 0.75; damage = 55; maxAmmo = 70;
        } else if (this.playerTankType === 'secret') {
            // Secret Tank - Rapid fire, high armor, very fast
            radius = 20; health = 700; speed = 450; turn = 6.0; turretTurn = 10.0; reload = 0.1; damage = 30; maxAmmo = 500;
        } else if (this.playerTankType === 'shitty') {
            // Shitty Tank - Very bad
            radius = 22; health = 50; speed = 150; turn = 1.5; turretTurn = 2.0; reload = 2.0; damage = 10; maxAmmo = 20;
        } else if (this.playerTankType === 'op_tank') {
            // Top Secret OP Tank - Insane everything
            radius = 24; health = 2000; speed = 600; turn = 7.0; turretTurn = 12.0; reload = 0.05; damage = 100; maxAmmo = 1000;
        } else if (this.playerTankType === 'bulldog') {
            radius = 21; health = 250; speed = 250; turn = 3.5; turretTurn = 5.0; reload = 0.9; damage = 60; maxAmmo = 60;
        } else if (this.playerTankType === 'phantom') {
            radius = 17; health = 100; speed = 400; turn = 6.0; turretTurn = 8.0; reload = 1.5; damage = 80; maxAmmo = 45;
        } else if (this.playerTankType === 'titan') {
            radius = 32; health = 1000; speed = 100; turn = 1.5; turretTurn = 2.5; reload = 3.0; damage = 200; maxAmmo = 25;
        } else if (this.playerTankType === 'wasp') {
            radius = 15; health = 80; speed = 450; turn = 6.5; turretTurn = 10.0; reload = 0.2; damage = 15; maxAmmo = 150;
        } else if (this.playerTankType === 'paladin') {
            radius = 25; health = 400; speed = 180; turn = 2.5; turretTurn = 4.0; reload = 0.8; damage = 40; maxAmmo = 80;
        } else if (this.playerTankType === 'vortex') {
            radius = 22; health = 300; speed = 280; turn = 4.0; turretTurn = 5.5; reload = 1.2; damage = 75; maxAmmo = 65;
        }

        // Apply Player Upgrades
        health = health * (1 + this.upgrades.health * 0.1); // +10% per level
        speed = speed * (1 + this.upgrades.speed * 0.05); // +5% per level
        damage = damage * (1 + this.upgrades.damage * 0.05); // +5% per level
        reload = reload * Math.pow(0.95, this.upgrades.reload); // -5% per level

        this.player = {
            id: this.nextId++,
            x: 0, y: 0,
            radius: radius,
            hullAngle: -Math.PI / 2,
            turretAngle: -Math.PI / 2,
            speed: 0, maxSpeed: speed,
            turnSpeed: turn, turretTurnSpeed: turretTurn,
            health: health, maxHealth: health,
            reloadTimer: 0, reloadTime: reload,
            speedBuffTimer: 0,
            lastDamageTime: 0,
            damage: damage,
            armorFront: 0.8,
            armorSide: 1.0,
            armorRear: 1.5,
            ammo: maxAmmo,
            maxAmmo: maxAmmo,
            isPlayer: true,
            color: this.customization.paintJob, // Use paintJob as color
            customization: this.customization
        };
        this.camX = this.player.x;
        this.camY = this.player.y;

        // Generate procedural background
        this.bgCanvas = document.createElement('canvas');
        this.bgCanvas.width = 1024;
        this.bgCanvas.height = 1024;
        this.bgCtx = this.bgCanvas.getContext('2d')!;
        
        // Fill base solid grass green
        this.bgCtx.fillStyle = '#3f6212'; // lime-900 (dark realistic grass)
        this.bgCtx.fillRect(0, 0, 1024, 1024);
        
        // Add subtle noise for realism
        for (let i = 0; i < 50000; i++) {
            const x = Math.random() * 1024;
            const y = Math.random() * 1024;
            const size = Math.random() * 2 + 1;
            const shade = Math.random() > 0.5 ? 255 : 0;
            const alpha = Math.random() * 0.03;
            this.bgCtx.fillStyle = `rgba(${shade}, ${shade}, ${shade}, ${alpha})`;
            this.bgCtx.fillRect(x, y, size, size);
        }
        
        // Add subtle larger grass variations
        for (let i = 0; i < 50; i++) {
            this.bgCtx.beginPath();
            this.bgCtx.arc(Math.random() * 1024, Math.random() * 1024, Math.random() * 30 + 10, 0, Math.PI * 2);
            this.bgCtx.fillStyle = `rgba(77, 124, 15, ${Math.random() * 0.1})`; // lime-700
            this.bgCtx.fill();
        }
        
        // Add skid marks
        for (let i = 0; i < 30; i++) {
            this.bgCtx.beginPath();
            const sx = Math.random() * 1024;
            const sy = Math.random() * 1024;
            const angle = Math.random() * Math.PI * 2;
            const length = Math.random() * 100 + 50;
            this.bgCtx.moveTo(sx, sy);
            this.bgCtx.lineTo(sx + Math.cos(angle) * length, sy + Math.sin(angle) * length);
            this.bgCtx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
            this.bgCtx.lineWidth = Math.random() * 4 + 2;
            this.bgCtx.stroke();
            
            // Parallel track
            this.bgCtx.beginPath();
            const px = sx + Math.cos(angle + Math.PI/2) * 10;
            const py = sy + Math.sin(angle + Math.PI/2) * 10;
            this.bgCtx.moveTo(px, py);
            this.bgCtx.lineTo(px + Math.cos(angle) * length, py + Math.sin(angle) * length);
            this.bgCtx.stroke();
        }

        // Generate a war-torn city layout
        this.obstacles = [];
        this.decorations = [];
        
        // Add streets and blocks
        for (let i = 0; i < 200; i++) {
            const isHorizontal = Math.random() > 0.5;
            const x = Math.random() * 10000 - 5000;
            const y = Math.random() * 10000 - 5000;
            const w = isHorizontal ? Math.random() * 300 + 100 : Math.random() * 50 + 40;
            const h = isHorizontal ? Math.random() * 50 + 40 : Math.random() * 300 + 100;
            
            this.obstacles.push({
                x, y, w, h,
                type: Math.random() > 0.3 ? 'ruin' : 'building',
                health: 2000,
                maxHealth: 2000
            });
        }

        // Add decorations (craters and rubble)
        for (let i = 0; i < 400; i++) {
            this.decorations.push({
                x: Math.random() * 10000 - 5000,
                y: Math.random() * 10000 - 5000,
                size: Math.random() * 40 + 10,
                type: Math.random() > 0.4 ? 'rubble' : 'crater',
                rotation: Math.random() * Math.PI * 2
            });
        }

        // Add trees
        this.trees = [];
        for (let i = 0; i < 300; i++) {
            this.trees.push({
                x: Math.random() * 10000 - 5000,
                y: Math.random() * 10000 - 5000,
                size: Math.random() * 20 + 15,
                type: Math.floor(Math.random() * 3)
            });
        }
        
        this.forceUIUpdate();
    }

    private setupInput() {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                this.isPaused = !this.isPaused;
                this.forceUIUpdate();
            }
            this.keys.add(e.key.toLowerCase());
        };
        const handleKeyUp = (e: KeyboardEvent) => this.keys.delete(e.key.toLowerCase());
        const handleMouseMove = (e: MouseEvent) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouseX = e.clientX - rect.left;
            this.mouseY = e.clientY - rect.top;
        };
        const handleMouseDown = (e: MouseEvent) => { 
            if (e.button === 0) this.isMouseDown = true; 
            if (e.button === 2) this.isRightMouseDown = true;
        };
        const handleMouseUp = (e: MouseEvent) => { 
            if (e.button === 0) this.isMouseDown = false; 
            if (e.button === 2) this.isRightMouseDown = false;
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        this.canvas.addEventListener('mousemove', handleMouseMove);
        this.canvas.addEventListener('mousedown', handleMouseDown);
        this.canvas.addEventListener('mouseup', handleMouseUp);
        this.canvas.addEventListener('contextmenu', e => e.preventDefault());

        // Store cleanup function
        (this as any).cleanupInput = () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            this.canvas.removeEventListener('mousemove', handleMouseMove);
            this.canvas.removeEventListener('mousedown', handleMouseDown);
            this.canvas.removeEventListener('mouseup', handleMouseUp);
            this.canvas.removeEventListener('contextmenu', e => e.preventDefault());
        };
    }

    public start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.lastTime = performance.now();
        this.loop(this.lastTime);
    }

    public stop() {
        this.isRunning = false;
        cancelAnimationFrame(this.animationFrameId);
        if ((this as any).cleanupInput) (this as any).cleanupInput();
    }

    private loop = (time: number) => {
        if (!this.isRunning) return;
        
        let dt = (time - this.lastTime) / 1000;
        this.lastTime = time;
        if (dt > 0.1) dt = 0.1; // Cap dt to prevent huge jumps

        if (!this.isPaused) {
            this.update(dt);
        }
        this.draw();

        this.animationFrameId = requestAnimationFrame(this.loop);
    };

    private update(dt: number) {
        // --- Player Input ---
        let inputY = 0;
        let inputX = 0;
        if (this.keys.has('w')) inputY += 1;
        if (this.keys.has('s')) inputY -= 1;
        if (this.keys.has('a')) inputX -= 1;
        if (this.keys.has('d')) inputX += 1;

        let playerHealthFactor = Math.max(0.4, this.player.health / this.player.maxHealth);
        let currentPlayerMaxSpeed = this.player.maxSpeed * (this.player.speedBuffTimer > 0 ? 1.5 : 1.0) * playerHealthFactor;

        if (this.mobileMoveX !== 0 || this.mobileMoveY !== 0) {
            // Mobile absolute movement
            const targetAngle = Math.atan2(this.mobileMoveY, this.mobileMoveX);
            this.player.hullAngle = moveTowardsAngle(this.player.hullAngle, targetAngle, this.player.turnSpeed * dt * 2);
            
            let angleDiff = Math.abs(this.player.hullAngle - targetAngle);
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            angleDiff = Math.abs(angleDiff);

            const mag = Math.min(1, Math.sqrt(this.mobileMoveX * this.mobileMoveX + this.mobileMoveY * this.mobileMoveY));
            if (angleDiff < Math.PI / 4) {
                this.player.speed = currentPlayerMaxSpeed * mag;
            } else {
                this.player.speed = currentPlayerMaxSpeed * mag * 0.5;
            }
        } else {
            if (inputY !== 0) {
                this.player.speed = currentPlayerMaxSpeed * inputY;
            } else {
                this.player.speed *= 0.9; // Friction
            }

            if (inputX !== 0) {
                this.player.hullAngle += inputX * this.player.turnSpeed * dt;
            }
        }

        // Mouse aiming
        const targetCamX = this.player.x - this.canvas.width / 2;
        const targetCamY = this.player.y - this.canvas.height / 2;
        this.camX += (targetCamX - this.camX) * 5 * dt;
        this.camY += (targetCamY - this.camY) * 5 * dt;

        let targetAngle;
        if (this.isMobile) {
            if (this.mobileAimX !== 0 || this.mobileAimY !== 0) {
                targetAngle = Math.atan2(this.mobileAimY, this.mobileAimX);
            } else {
                targetAngle = this.player.turretAngle; // Keep current angle if not aiming
            }
        } else {
            const mouseWorldX = this.mouseX + this.camX;
            const mouseWorldY = this.mouseY + this.camY;
            targetAngle = Math.atan2(mouseWorldY - this.player.y, mouseWorldX - this.player.x);
        }
        
        this.player.turretAngle = moveTowardsAngle(this.player.turretAngle, targetAngle, this.player.turretTurnSpeed * dt);

        if (this.isMouseDown && this.player.reloadTimer <= 0 && this.player.ammo > 0) {
            this.fireProjectile(this.player);
        }

        this.mgReloadTimer -= dt;
        if (this.isRightMouseDown && this.mgReloadTimer <= 0 && this.player.ammo > 0) {
            this.fireMachineGun(this.player);
        }

        this.airstrikeCooldown -= dt;
        if (this.keys.has('f') && this.airstrikeCooldown <= 0) {
            let nearestEnemy = null;
            let minDist = Infinity;
            for (let enemy of this.enemies) {
                let dist = new Vec2(this.player.x - enemy.x, this.player.y - enemy.y).mag();
                if (dist < minDist) {
                    minDist = dist;
                    nearestEnemy = enemy;
                }
            }
            
            if (nearestEnemy) {
                this.airstrikeCooldown = 30;
                let angle = Math.random() * Math.PI * 2;
                this.airstrikes.push({targetId: nearestEnemy.id, x: nearestEnemy.x, y: nearestEnemy.y, timer: 2.0, angle: angle});
                this.floatingTexts.push({
                    x: nearestEnemy.x, y: nearestEnemy.y,
                    text: "AIRSTRIKE INBOUND",
                    life: 2.0, maxLife: 2.0,
                    color: "#ef4444"
                });
            }
        }

        for (let i = this.airstrikes.length - 1; i >= 0; i--) {
            let strike = this.airstrikes[i];
            
            // Track target if it still exists
            let target = this.enemies.find(e => e.id === strike.targetId);
            if (target) {
                strike.x = target.x;
                strike.y = target.y;
            }

            strike.timer -= dt;
            if (strike.timer <= 0) {
                this.spawnAirstrikeExplosion(strike.x, strike.y, '#ef4444', 300);
                this.shakeAmount = 30;
                
                // Plane continues flying after dropping bomb
                this.planes.push({
                    x: strike.x, 
                    y: strike.y, 
                    angle: strike.angle, 
                    speed: 1500, // Speed of the plane
                    life: 2.0
                });

                const allTanks = [this.player, ...this.enemies];
                for (let tank of allTanks) {
                    let dist = new Vec2(strike.x - tank.x, strike.y - tank.y).mag();
                    if (dist <= 200 + tank.radius) {
                        tank.health = 0; // Instant kill if inside red circle
                    }
                }
                this.airstrikes.splice(i, 1);
            }
        }

        // --- Item Spawning ---
        this.itemSpawnTimer -= dt;
        if (this.itemSpawnTimer <= 0 && this.items.length < 24) {
            this.itemSpawnTimer = 2.0;
            let angle = Math.random() * Math.PI * 2;
            let dist = Math.random() * 1000 + 500;
            let rand = Math.random();
            let type: 'repair' | 'speed' | 'ammo' = 'repair';
            if (rand > 0.66) type = 'speed';
            else if (rand > 0.33) type = 'ammo';
            
            this.items.push({
                id: this.nextId++,
                x: this.player.x + Math.cos(angle) * dist,
                y: this.player.y + Math.sin(angle) * dist,
                radius: 15,
                type: type,
                life: 30.0
            });
        }

        // --- Update Items ---
        for (let i = this.items.length - 1; i >= 0; i--) {
            let item = this.items[i];
            item.life -= dt;
            if (item.life <= 0) {
                this.items.splice(i, 1);
                continue;
            }

            let res = resolveCircleCircle(this.player.x, this.player.y, this.player.radius, item.x, item.y, item.radius);
            if (res.hit) {
                if (item.type === 'repair' && this.player.health < this.player.maxHealth) {
                    let healAmount = Math.ceil(this.player.maxHealth * 0.25);
                    this.player.health = Math.min(this.player.maxHealth, this.player.health + healAmount);
                    this.floatingTexts.push({
                        x: this.player.x, y: this.player.y - 30,
                        text: `+${healAmount} ARMOR`,
                        life: 1.5, maxLife: 1.5,
                        color: "#10b981"
                    });
                    this.items.splice(i, 1);
                } else if (item.type === 'speed') {
                    this.player.speedBuffTimer = 10.0;
                    this.floatingTexts.push({
                        x: this.player.x, y: this.player.y - 30,
                        text: "SPEED BOOST",
                        life: 1.5, maxLife: 1.5,
                        color: "#3b82f6"
                    });
                    this.items.splice(i, 1);
                } else if (item.type === 'ammo' && this.player.ammo < this.player.maxAmmo) {
                    this.player.ammo = this.player.maxAmmo;
                    this.floatingTexts.push({
                        x: this.player.x, y: this.player.y - 30,
                        text: `FULL AMMO`,
                        life: 1.5, maxLife: 1.5,
                        color: "#f59e0b"
                    });
                    this.items.splice(i, 1);
                }
            }
        }

        // --- Enemy Spawning ---
        this.spawnTimer -= dt;
        
        let maxEnemies: number;
        let scoreInterval = 500;
        
        let isCustomMode = this.difficulty === 'custom' && this.customEnemyCount !== undefined && this.customEnemyCount > 0;

        if (isCustomMode) {
            maxEnemies = this.customEnemyCount!;
            scoreInterval = 500; // Default scaling for custom
        } else {
            let baseMaxEnemies = 6;
            if (this.difficulty === 'easy') {
                baseMaxEnemies = 4;
                scoreInterval = 1000;
            } else if (this.difficulty === 'hard') {
                baseMaxEnemies = 8;
                scoreInterval = 250;
            }
            maxEnemies = baseMaxEnemies + Math.floor(this.score / scoreInterval);
        }
        
        let shouldSpawn = false;
        const activeEnemiesCount = this.enemies.filter(e => e.type !== 'modular').length;
        if (isCustomMode) {
            shouldSpawn = activeEnemiesCount < maxEnemies;
        } else {
            shouldSpawn = this.spawnTimer <= 0 && activeEnemiesCount < maxEnemies;
        }

        while (shouldSpawn) {
            if (!isCustomMode) {
                this.spawnTimer = Math.max(1.0, 4.0 - Math.floor(this.score / scoreInterval) * 0.1);
            }
            let angle = Math.random() * Math.PI * 2;
            let dist = Math.max(this.canvas.width, this.canvas.height) + 200;
            
            // Harder enemies
            let enemyHealth = 50 + Math.floor(this.score / scoreInterval) * 20;
            let enemyDamage = 20 + Math.floor(this.score / scoreInterval) * 5;
            let enemySpeed = (120 + Math.floor(this.score / scoreInterval) * 10) * 1.5;
            let enemyReload = Math.max(2.0, 5 - Math.floor(this.score / scoreInterval) * 0.5);
            
            const types = ['scout', 'sniper', 'brawler'];
            const type = types[Math.floor(Math.random() * types.length)];
            
            if (type === 'scout') {
                enemyHealth *= 0.7;
                enemySpeed *= 1.5;
                enemyDamage *= 0.8;
            } else if (type === 'sniper') {
                enemyHealth *= 0.8;
                enemySpeed *= 0.7;
                enemyDamage *= 2.0;
                enemyReload *= 2.0;
            } else if (type === 'brawler') {
                enemyHealth *= 1.5;
                enemySpeed *= 0.9;
                enemyDamage *= 1.2;
            }

            this.enemies.push({
                id: this.nextId++,
                type: type,
                x: this.player.x + Math.cos(angle) * dist,
                y: this.player.y + Math.sin(angle) * dist,
                radius: 20,
                hullAngle: 0, turretAngle: 0,
                speed: 0, maxSpeed: enemySpeed,
                turnSpeed: 1.5 + Math.floor(this.score / 500) * 0.2, 
                turretTurnSpeed: 2.0 + Math.floor(this.score / 500) * 0.2,
                health: enemyHealth, maxHealth: enemyHealth,
                reloadTimer: 0, reloadTime: enemyReload,
                speedBuffTimer: 0,
                damage: enemyDamage,
                armorFront: 0.8,
                armorSide: 1.0,
                armorRear: 1.5,
                ammo: 999, // Enemies have infinite ammo for now
                maxAmmo: 999,
                isPlayer: false,
                lastDamageTime: 0,
                color: type === 'scout' ? '#3b82f6' : (type === 'sniper' ? '#f59e0b' : '#ef4444') // blue, amber, red
            });

            if (isCustomMode) {
                const currentActiveEnemiesCount = this.enemies.filter(e => e.type !== 'modular').length;
                shouldSpawn = currentActiveEnemiesCount < maxEnemies;
            } else {
                shouldSpawn = false; // Only spawn one per frame if not custom
            }
        }

        // --- Update Tanks ---
        const allTanks = [this.player, ...this.enemies];
        
        allTanks.forEach(tank => {
            tank.reloadTimer -= dt;
            tank.speedBuffTimer -= dt;

            // Health regeneration
            if (performance.now() - tank.lastDamageTime > 5000) {
                if (tank.health < tank.maxHealth) {
                    tank.health = Math.min(tank.health + 1.0 * dt, tank.maxHealth);
                }
            }

            // Move
            tank.x += Math.cos(tank.hullAngle) * tank.speed * dt;
            tank.y += Math.sin(tank.hullAngle) * tank.speed * dt;

            // Dust particles
            if (tank.speed > 50 && Math.random() < 0.2) {
                this.particles.push({
                    x: tank.x - Math.cos(tank.hullAngle) * tank.radius,
                    y: tank.y - Math.sin(tank.hullAngle) * tank.radius,
                    vx: (Math.random() - 0.5) * 20,
                    vy: (Math.random() - 0.5) * 20,
                    life: 0.3 + Math.random() * 0.2,
                    maxLife: 0.5,
                    color: '#a3a3a3',
                    size: Math.random() * 2 + 1
                });
            }

            // Smoke trails for damaged player
            if (tank.isPlayer && tank.speed > 50 && tank.health < tank.maxHealth * 0.75) {
                if (Math.random() < 0.3) {
                    this.particles.push({
                        x: tank.x - Math.cos(tank.hullAngle) * tank.radius,
                        y: tank.y - Math.sin(tank.hullAngle) * tank.radius,
                        vx: (Math.random() - 0.5) * 10,
                        vy: (Math.random() - 0.5) * 10,
                        life: 1.0 + Math.random() * 0.5,
                        maxLife: 1.5,
                        color: '#404040',
                        size: Math.random() * 4 + 2
                    });
                }
            }

            // --- Damage Effects ---
            if (tank.health < tank.maxHealth * 0.5) {
                // Spawn smoke/sparks
                if (Math.random() < 0.1) {
                    this.particles.push({
                        x: tank.x + (Math.random() - 0.5) * tank.radius,
                        y: tank.y + (Math.random() - 0.5) * tank.radius,
                        vx: (Math.random() - 0.5) * 50,
                        vy: -Math.random() * 50,
                        life: 0.5 + Math.random() * 0.5,
                        maxLife: 1.0,
                        color: tank.health < tank.maxHealth * 0.25 ? '#ef4444' : '#6b7280', // Red sparks or grey smoke
                        size: Math.random() * 3 + 1
                    });
                }
            }

            // AI Logic
            if (!tank.isPlayer) {
                let distToPlayer = new Vec2(this.player.x - tank.x, this.player.y - tank.y).mag();
                let aiTargetAngle = Math.atan2(this.player.y - tank.y, this.player.x - tank.x);
                let healthFactor = Math.max(0.4, tank.health / tank.maxHealth);
                let currentMaxSpeed = tank.maxSpeed * (tank.speedBuffTimer > 0 ? 1.5 : 1.0) * healthFactor;

                // Behavior based on type
                if (tank.type === 'modular') {
                    // Modular tanks don't move, they just aim and shoot
                    tank.speed = 0;
                } else if (tank.type === 'scout') {
                    // Flanking behavior
                    let flankAngle = aiTargetAngle + (Math.random() > 0.5 ? Math.PI / 4 : -Math.PI / 4);
                    if (distToPlayer > 300) {
                        tank.hullAngle = moveTowardsAngle(tank.hullAngle, flankAngle, tank.turnSpeed * dt);
                        tank.speed = currentMaxSpeed;
                    } else if (distToPlayer < 200) {
                        tank.hullAngle = moveTowardsAngle(tank.hullAngle, aiTargetAngle + Math.PI, tank.turnSpeed * dt);
                        tank.speed = -currentMaxSpeed;
                    } else {
                        tank.speed = currentMaxSpeed * 0.5;
                    }
                } else if (tank.type === 'sniper') {
                    // Keep distance
                    if (distToPlayer < 600) {
                        tank.hullAngle = moveTowardsAngle(tank.hullAngle, aiTargetAngle + Math.PI, tank.turnSpeed * dt);
                        tank.speed = currentMaxSpeed;
                    } else if (distToPlayer > 800) {
                        tank.hullAngle = moveTowardsAngle(tank.hullAngle, aiTargetAngle, tank.turnSpeed * dt);
                        tank.speed = currentMaxSpeed;
                    } else {
                        tank.speed = 0;
                    }
                } else { // brawler
                    // Charge
                    tank.hullAngle = moveTowardsAngle(tank.hullAngle, aiTargetAngle, tank.turnSpeed * dt);
                    if (distToPlayer > 100) {
                        tank.speed = currentMaxSpeed;
                    } else {
                        tank.speed = 0;
                    }
                }

                tank.turretAngle = moveTowardsAngle(tank.turretAngle, aiTargetAngle, tank.turretTurnSpeed * dt);

                let aimDiff = Math.abs(tank.turretAngle - aiTargetAngle);
                while (aimDiff > Math.PI) aimDiff -= Math.PI * 2;
                aimDiff = Math.abs(aimDiff);

                if (aimDiff < 0.1 && tank.reloadTimer <= 0 && distToPlayer < (tank.type === 'sniper' ? 1000 : 500)) {
                    this.fireProjectile(tank);
                }
            }

            // Collisions with obstacles
            for (let obs of this.obstacles) {
                let res = resolveCircleAABB(tank.x, tank.y, tank.radius, obs.x, obs.y, obs.w, obs.h);
                if (res.hit) {
                    tank.x += res.dx;
                    tank.y += res.dy;
                }
            }
        });

        // Tank vs Tank collisions
        for (let i = 0; i < allTanks.length; i++) {
            for (let j = i + 1; j < allTanks.length; j++) {
                let t1 = allTanks[i];
                let t2 = allTanks[j];
                let res = resolveCircleCircle(t1.x, t1.y, t1.radius, t2.x, t2.y, t2.radius);
                if (res.hit) {
                    t1.x += res.dx * 0.5; t1.y += res.dy * 0.5;
                    t2.x -= res.dx * 0.5; t2.y -= res.dy * 0.5;
                }
            }
        }

        // --- Update Projectiles ---
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            let p = this.projectiles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;
            
            p.trail.push({x: p.x, y: p.y});
            if (p.trail.length > 10) p.trail.shift();

            let destroyed = false;
            if (p.life <= 0) destroyed = true;

            // Projectile vs Obstacle
            if (!destroyed) {
                for (let i = 0; i < this.obstacles.length; i++) {
                    let obs = this.obstacles[i];
                    let res = resolveCircleAABB(p.x, p.y, p.radius, obs.x, obs.y, obs.w, obs.h);
                    if (res.hit) {
                        destroyed = true;
                        
                        // Damage obstacle
                        obs.health -= p.damage;
                        this.spawnExplosion(p.x, p.y, '#737373', 5); // Dust
                        
                        if (obs.health <= 0) {
                            this.obstacles.splice(i, 1);
                            this.spawnExplosion(obs.x + obs.w/2, obs.y + obs.h/2, '#525252', 20); // Big explosion
                        }
                        break;
                    }
                }
            }

            // Projectile vs Tanks
            if (!destroyed) {
                for (let tank of allTanks) {
                    if (tank.id === p.ownerId) continue; // Don't hit self
                    let res = resolveCircleCircle(p.x, p.y, p.radius, tank.x, tank.y, tank.radius);
                    if (res.hit) {
                        destroyed = true;
                        
                        // --- ARMOR MECHANICS (War Thunder style) ---
                        let toImpact = new Vec2(p.x - tank.x, p.y - tank.y).normalize();
                        let tankForward = new Vec2(Math.cos(tank.hullAngle), Math.sin(tank.hullAngle));
                        let dot = toImpact.x * tankForward.x + toImpact.y * tankForward.y;

                        let damageMult = 1;
                        let hitText = "";
                        let color = "#fff";

                        if (dot > 0.6) {
                            damageMult = tank.armorFront;
                            hitText = "FRONT HIT";
                            color = "#a3a3a3";
                            this.spawnExplosion(p.x, p.y, '#fbbf24', 3); // sparks
                        } else if (dot < -0.6) {
                            damageMult = tank.armorRear;
                            hitText = "REAR HIT";
                            color = "#ef4444";
                            this.spawnExplosion(p.x, p.y, '#ef4444', 10);
                        } else {
                            damageMult = tank.armorSide;
                            hitText = "SIDE HIT";
                            color = "#fcd34d";
                            this.spawnExplosion(p.x, p.y, '#f97316', 8);
                        }

                        tank.health -= p.damage * damageMult;
                        tank.lastDamageTime = performance.now();
                        this.floatingTexts.push({
                            x: tank.x, y: tank.y - 30,
                            text: hitText,
                            life: 1.5, maxLife: 1.5,
                            color: color
                        });

                        if (tank.isPlayer) {
                            this.shakeAmount = 15; // Screen shake on player hit
                        }

                        break;
                    }
                }
            }

            if (destroyed) {
                this.projectiles.splice(i, 1);
            }
        }

        // --- Update Particles & Texts ---
        for (let i = this.planes.length - 1; i >= 0; i--) {
            let p = this.planes[i];
            p.x += Math.cos(p.angle) * p.speed * dt;
            p.y += Math.sin(p.angle) * p.speed * dt;
            p.life -= dt;
            if (p.life <= 0) this.planes.splice(i, 1);
        }
        for (let i = this.shockwaves.length - 1; i >= 0; i--) {
            let s = this.shockwaves[i];
            s.radius += s.maxRadius * dt * 2;
            s.life -= dt;
            if (s.life <= 0) this.shockwaves.splice(i, 1);
        }
        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;
            if (p.life <= 0) this.particles.splice(i, 1);
        }
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            let ft = this.floatingTexts[i];
            ft.life -= dt;
            if (ft.life <= 0) this.floatingTexts.splice(i, 1);
        }

        // --- Death Logic ---
        if (this.player.health <= 0) {
            this.spawnTankExplosion(this.player.x, this.player.y, '#10b981');
            this.decorations.push({
                x: this.player.x, y: this.player.y,
                size: this.player.radius,
                type: 'dead_tank',
                rotation: this.player.hullAngle,
                color: '#1a4d2e' // Dark green
            });
            this.onUpdateUI({ 
                isGameOver: true, 
                score: this.score, 
                health: 0,
                airstrikeCooldown: 0,
                ammo: this.player.ammo,
                maxAmmo: this.player.maxAmmo,
                isRegenerating: false
            });
            this.stop();
            return;
        }

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            if (this.enemies[i].health <= 0) {
                this.spawnTankExplosion(this.enemies[i].x, this.enemies[i].y, '#ef4444');
                this.decorations.push({
                    x: this.enemies[i].x, y: this.enemies[i].y,
                    size: this.enemies[i].radius,
                    type: 'dead_tank',
                    rotation: this.enemies[i].hullAngle,
                    color: '#4a0404' // Dark red
                });
                this.shakeAmount = 10; // Screen shake on enemy death
                
                // Add to kill feed
                const enemyType = this.enemies[i].type;
                this.killFeed.unshift({
                    id: this.nextId++,
                    type: enemyType,
                    timestamp: Date.now()
                });
                if (this.killFeed.length > 3) {
                    this.killFeed.pop();
                }

                this.enemies.splice(i, 1);
                let points = 100;
                if (this.difficulty === 'easy') points = 50;
                else if (this.difficulty === 'hard') points = 200;
                this.score += points;
            }
        }

        // --- Mission Logic ---
        if (!this.currentMission) {
            this.missionSpawnTimer -= dt;
            if (this.missionSpawnTimer <= 0) {
                const missionTypeRand = Math.random();
                const spawnDist = Math.random() * 500 + 500; // 500 to 1000 pixels away
                const spawnAngle = Math.random() * Math.PI * 2;
                const spawnX = this.player.x + Math.cos(spawnAngle) * spawnDist;
                const spawnY = this.player.y + Math.sin(spawnAngle) * spawnDist;

                if (missionTypeRand < 0.25) {
                    this.currentMission = {
                        type: 'capture',
                        x: spawnX,
                        y: spawnY,
                        radius: 150,
                        progress: 0,
                        active: true,
                        title: 'Capture the Zone',
                        rewardDesc: '+1000 Score & Full Heal'
                    };
                    
                    // Spawn 1 modular tank at the capture zone
                    this.enemies.push({
                        id: this.nextId++,
                        type: 'modular',
                        x: spawnX,
                        y: spawnY,
                        radius: 25,
                        hullAngle: 0, turretAngle: 0,
                        speed: 0, maxSpeed: 0,
                        turnSpeed: 0, turretTurnSpeed: 3.0,
                        health: 300, maxHealth: 300,
                        reloadTimer: 0, reloadTime: 1.5,
                        speedBuffTimer: 0,
                        damage: 40,
                        armorFront: 1.0, armorSide: 1.0, armorRear: 1.0,
                        ammo: 999, maxAmmo: 999,
                        isPlayer: false,
                        lastDamageTime: 0,
                        color: '#8b5cf6' // Purple
                    });
                } else if (missionTypeRand < 0.5) {
                    const targetId = this.nextId++;
                    const targetObstacle: Obstacle = {
                        id: targetId,
                        x: spawnX - 50,
                        y: spawnY - 50,
                        w: 100, h: 100,
                        type: 'building',
                        health: 1500,
                        maxHealth: 1500
                    };
                    this.obstacles.push(targetObstacle);
                    this.currentMission = {
                        type: 'destroy',
                        x: spawnX,
                        y: spawnY,
                        targetId: targetId,
                        progress: 0,
                        active: true,
                        title: 'Destroy Enemy Base',
                        rewardDesc: '+1500 Score & Airstrike Ready'
                    };
                    
                    // Spawn 2 modular tanks at the enemy base
                    this.enemies.push({
                        id: this.nextId++,
                        type: 'modular',
                        x: spawnX - 70,
                        y: spawnY,
                        radius: 25,
                        hullAngle: 0, turretAngle: 0,
                        speed: 0, maxSpeed: 0,
                        turnSpeed: 0, turretTurnSpeed: 3.0,
                        health: 300, maxHealth: 300,
                        reloadTimer: 0, reloadTime: 1.5,
                        speedBuffTimer: 0,
                        damage: 40,
                        armorFront: 1.0, armorSide: 1.0, armorRear: 1.0,
                        ammo: 999, maxAmmo: 999,
                        isPlayer: false,
                        lastDamageTime: 0,
                        color: '#8b5cf6' // Purple
                    });
                    this.enemies.push({
                        id: this.nextId++,
                        type: 'modular',
                        x: spawnX + 70,
                        y: spawnY,
                        radius: 25,
                        hullAngle: 0, turretAngle: 0,
                        speed: 0, maxSpeed: 0,
                        turnSpeed: 0, turretTurnSpeed: 3.0,
                        health: 300, maxHealth: 300,
                        reloadTimer: 0, reloadTime: 1.5,
                        speedBuffTimer: 0,
                        damage: 40,
                        armorFront: 1.0, armorSide: 1.0, armorRear: 1.0,
                        ammo: 999, maxAmmo: 999,
                        isPlayer: false,
                        lastDamageTime: 0,
                        color: '#8b5cf6' // Purple
                    });
                } else if (missionTypeRand < 0.75) {
                    this.currentMission = {
                        type: 'survive',
                        x: this.player.x,
                        y: this.player.y,
                        progress: 0,
                        active: true,
                        duration: 30, // Survive for 30s
                        maxDuration: 30,
                        title: 'Survive the Ambush',
                        rewardDesc: '+2500 Score & Full Ammo'
                    };
                    
                    // Spawn 3 aggressive light tanks closely
                    for (let j=0; j<3; j++) {
                        const ang = Math.random() * Math.PI * 2;
                        this.enemies.push({
                            id: this.nextId++,
                            type: 'light',
                            x: this.player.x + Math.cos(ang) * 400,
                            y: this.player.y + Math.sin(ang) * 400,
                            radius: 16,
                            hullAngle: 0, turretAngle: 0,
                            speed: 0, maxSpeed: 380,
                            turnSpeed: 4.5, turretTurnSpeed: 6.0,
                            health: 120, maxHealth: 120,
                            reloadTimer: 0, reloadTime: 0.5,
                            speedBuffTimer: 0,
                            damage: 25,
                            armorFront: 1.0, armorSide: 1.0, armorRear: 1.0,
                            ammo: 999, maxAmmo: 999,
                            isPlayer: false,
                            lastDamageTime: 0,
                            color: '#b91c1c' // Red aggressive
                        });
                    }
                } else {
                    const items = [];
                    for(let i=0; i<3; i++){
                        items.push({
                            x: this.player.x + (Math.random()-0.5)*1500,
                            y: this.player.y + (Math.random()-0.5)*1500,
                            collected: false
                        });
                    }
                    this.currentMission = {
                        type: 'collect',
                        x: items[0].x, // point to first uncollected
                        y: items[0].y,
                        progress: 0,
                        active: true,
                        itemsToCollect: items,
                        title: 'Collect Supply Drops',
                        rewardDesc: '+2000 Score & Airstrike'
                    };
                }
            }
        } else {
            if (this.currentMission.type === 'capture') {
                const dist = Math.hypot(this.player.x - this.currentMission.x, this.player.y - this.currentMission.y);
                if (dist < (this.currentMission.radius || 150)) {
                    this.currentMission.progress += dt * 10; // 10 seconds to capture
                    if (this.currentMission.progress >= 100) {
                        this.score += 1000;
                        this.player.health = this.player.maxHealth;
                        this.floatingTexts.push({ x: this.player.x, y: this.player.y - 40, text: 'MISSION COMPLETE!', life: 2.0, maxLife: 2.0, color: '#10b981' });
                        this.floatingTexts.push({ x: this.player.x, y: this.player.y - 60, text: '+ FULL HEAL', life: 2.0, maxLife: 2.0, color: '#34d399' });
                        this.currentMission = null;
                        this.missionSpawnTimer = 10;
                    }
                } else {
                    this.currentMission.progress -= dt * 5;
                    if (this.currentMission.progress < 0) this.currentMission.progress = 0;
                }
            } else if (this.currentMission.type === 'destroy') {
                const target = this.obstacles.find(o => o.id === this.currentMission!.targetId);
                if (target) {
                    this.currentMission.progress = 100 - (target.health / target.maxHealth) * 100;
                } else {
                    this.score += 1500;
                    this.airstrikeCooldown = 0;
                    this.floatingTexts.push({ x: this.player.x, y: this.player.y - 40, text: 'BASE DESTROYED!', life: 2.0, maxLife: 2.0, color: '#10b981' });
                    this.floatingTexts.push({ x: this.player.x, y: this.player.y - 60, text: '+ AIRSTRIKE READY', life: 2.0, maxLife: 2.0, color: '#34d399' });
                    this.currentMission = null;
                    this.missionSpawnTimer = 10;
                }
            } else if (this.currentMission.type === 'survive') {
                this.currentMission.duration! -= dt;
                this.currentMission.progress = 100 - (this.currentMission.duration! / this.currentMission.maxDuration!) * 100;
                if (this.currentMission.duration! <= 0) {
                    this.score += 2500;
                    this.player.ammo = this.player.maxAmmo;
                    this.floatingTexts.push({ x: this.player.x, y: this.player.y - 40, text: 'AMBUSH SURVIVED!', life: 2.0, maxLife: 2.0, color: '#10b981' });
                    this.floatingTexts.push({ x: this.player.x, y: this.player.y - 60, text: '+ MAX AMMO', life: 2.0, maxLife: 2.0, color: '#34d399' });
                    this.currentMission = null;
                    this.missionSpawnTimer = 10;
                }
            } else if (this.currentMission.type === 'collect') {
                let collectedCount = 0;
                let nextTarget = null;
                for (let item of this.currentMission.itemsToCollect!) {
                    if (!item.collected) {
                        const dist = Math.hypot(this.player.x - item.x, this.player.y - item.y);
                        if (dist < this.player.radius + 30) {
                            item.collected = true;
                            this.floatingTexts.push({ x: item.x, y: item.y - 20, text: 'SUPPLY COLLECTED', life: 1.5, maxLife: 1.5, color: '#f59e0b' });
                        } else if (!nextTarget) {
                            nextTarget = item; // point to the closest or first uncollected one
                        }
                    }
                    if (item.collected) collectedCount++;
                }
                this.currentMission.progress = (collectedCount / this.currentMission.itemsToCollect!.length) * 100;
                if (nextTarget) {
                    this.currentMission.x = nextTarget.x;
                    this.currentMission.y = nextTarget.y;
                }

                if (collectedCount >= this.currentMission.itemsToCollect!.length) {
                    this.score += 2000;
                    this.airstrikeCooldown = 0;
                    this.floatingTexts.push({ x: this.player.x, y: this.player.y - 40, text: 'SUPPLIES SECURED!', life: 2.0, maxLife: 2.0, color: '#10b981' });
                    this.floatingTexts.push({ x: this.player.x, y: this.player.y - 60, text: '+ AIRSTRIKE READY', life: 2.0, maxLife: 2.0, color: '#34d399' });
                    this.currentMission = null;
                    this.missionSpawnTimer = 10;
                }
            }
        }

        // Screen shake decay
        if (this.shakeAmount > 0) {
            this.shakeAmount -= dt * 30;
            if (this.shakeAmount < 0) this.shakeAmount = 0;
        }

        // --- UI Update ---
        this.forceUIUpdate();
    }

    public forceUIUpdate() {
        this.onUpdateUI({
            health: this.player.health,
            maxHealth: this.player.maxHealth,
            reloadProgress: Math.max(0, 1 - (this.player.reloadTimer / this.player.reloadTime)),
            score: this.score,
            isPaused: this.isPaused,
            ammo: this.player.ammo,
            maxAmmo: this.player.maxAmmo,
            airstrikeCooldown: Math.max(0, this.airstrikeCooldown),
            isRegenerating: performance.now() - this.player.lastDamageTime > 5000 && this.player.health < this.player.maxHealth,
            mission: this.currentMission,
            killFeed: [...this.killFeed]
        });
    }

    private fireMachineGun(tank: Tank) {
        this.mgReloadTimer = 0.1;
        tank.ammo -= 2;
        if (tank.ammo < 0) tank.ammo = 0;
        
        let barrelLength = tank.radius + 10;
        let spread = (Math.random() - 0.5) * 0.2;
        let angle = tank.turretAngle + spread;
        let px = tank.x + Math.cos(angle) * barrelLength;
        let py = tank.y + Math.sin(angle) * barrelLength;

        let healthFactor = Math.max(0.4, tank.health / tank.maxHealth);

        this.projectiles.push({
            x: px, y: py,
            vx: Math.cos(angle) * 1500,
            vy: Math.sin(angle) * 1500,
            radius: 2,
            damage: tank.damage * 0.15 * healthFactor,
            ownerId: tank.id,
            life: 0.8,
            trail: []
        });

        this.spawnExplosion(px, py, '#fcd34d', 3);
    }

    private fireProjectile(tank: Tank) {
        tank.reloadTimer = tank.reloadTime;
        tank.ammo--;
        let barrelLength = tank.radius + 15;
        let px = tank.x + Math.cos(tank.turretAngle) * barrelLength;
        let py = tank.y + Math.sin(tank.turretAngle) * barrelLength;

        let healthFactor = Math.max(0.4, tank.health / tank.maxHealth);

        this.projectiles.push({
            x: px, y: py,
            vx: Math.cos(tank.turretAngle) * 1000,
            vy: Math.sin(tank.turretAngle) * 1000,
            radius: 4,
            damage: tank.damage * healthFactor,
            ownerId: tank.id,
            life: 2.0,
            trail: []
        });

        // Muzzle flash
        this.spawnExplosion(px, py, '#f59e0b', 8);
        if (tank.isPlayer) {
            this.shakeAmount = 5; // Small shake on fire
        }
    }

    private spawnAirstrikeExplosion(x: number, y: number, color: string, count: number) {
        this.spawnExplosion(x, y, color, count);
        this.shockwaves.push({
            x, y,
            radius: 0,
            maxRadius: 300,
            life: 1.0,
            color: 'rgba(239, 68, 68, 1)'
        });
    }

    private spawnExplosion(x: number, y: number, color: string, count: number) {
        for (let i = 0; i < count; i++) {
            let angle = Math.random() * Math.PI * 2;
            let speed = Math.random() * 150 + 50;
            let size = Math.random() * 8 + 3;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: Math.random() * 0.5 + 0.2,
                maxLife: 0.7,
                color: color,
                size: size,
                shape: 'circle'
            });
            // Add smoke
            if (Math.random() > 0.5) {
                this.particles.push({
                    x, y,
                    vx: Math.cos(angle) * speed * 0.5,
                    vy: Math.sin(angle) * speed * 0.5,
                    life: Math.random() * 0.5 + 0.2,
                    maxLife: 0.7,
                    color: 'rgba(50, 50, 50, 0.5)',
                    size: Math.random() * 8 + 4,
                    shape: 'circle'
                });
            }
        }
    }

    private spawnTankExplosion(x: number, y: number, color: string) {
        // Dramatic central core shockwave
        this.shockwaves.push({
            x, y,
            radius: 0,
            maxRadius: 180,
            life: 1.0,
            color: 'rgba(255, 100, 0, 1)'
        });
        
        // Massive fire cloud
        this.spawnExplosion(x, y, '#ef4444', 40); // Red
        this.spawnExplosion(x, y, '#f97316', 30); // Orange
        this.spawnExplosion(x, y, '#eab308', 20); // Yellow
        
        // Scatter debris
        for (let i = 0; i < 15; i++) {
            let angle = Math.random() * Math.PI * 2;
            let speed = Math.random() * 200 + 100;
            let size = Math.random() * 8 + 4;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: Math.random() * 1.5 + 1.0,
                maxLife: 2.5,
                color: Math.random() > 0.5 ? '#525252' : '#262626', // metallic debris
                size: size,
                shape: 'square',
                rotation: Math.random() * Math.PI,
                rotationSpeed: (Math.random() - 0.5) * 10
            });
            
            // Burning debris trail pieces
            if (Math.random() > 0.7) {
                this.particles.push({
                    x, y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    life: Math.random() * 0.5 + 0.5,
                    maxLife: 1.0,
                    color: '#fbbf24', 
                    size: size * 0.5,
                    shape: 'circle'
                });
            }
        }
    }

    private draw() {
        // Background - Procedural terrain
        const bgPattern = this.ctx.createPattern(this.bgCanvas, 'repeat');
        if (bgPattern) {
            this.ctx.save();
            this.ctx.fillStyle = bgPattern;
            this.ctx.translate(-this.camX % 1024, -this.camY % 1024);
            this.ctx.fillRect(-1024, -1024, this.canvas.width + 2048, this.canvas.height + 2048);
            this.ctx.restore();
        } else {
            this.ctx.fillStyle = '#3f6212'; 
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }

        this.ctx.save();
        
        // Apply screen shake
        let shakeOffsetX = 0;
        let shakeOffsetY = 0;
        if (this.shakeAmount > 0) {
            shakeOffsetX = (Math.random() - 0.5) * this.shakeAmount;
            shakeOffsetY = (Math.random() - 0.5) * this.shakeAmount;
        }

        this.ctx.translate(-this.camX + shakeOffsetX, -this.camY + shakeOffsetY);

        // Draw Ground Details (Decorations)
        for (let dec of this.decorations) {
            this.ctx.save();
            this.ctx.translate(dec.x, dec.y);
            this.ctx.rotate(dec.rotation);
            
            if (dec.type === 'crater') {
                const tex = this.textures['crater'];
                if (tex && tex.complete && tex.naturalWidth > 0) {
                    this.ctx.beginPath();
                    this.ctx.ellipse(0, 0, dec.size, dec.size * 0.7, 0, 0, Math.PI * 2);
                    this.ctx.clip();
                    this.ctx.drawImage(tex, -dec.size, -dec.size, dec.size * 2, dec.size * 2);
                    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'; // Blend with dark ground
                    this.ctx.fill();
                } else {
                    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
                    this.ctx.beginPath();
                    this.ctx.ellipse(0, 0, dec.size, dec.size * 0.7, 0, 0, Math.PI * 2);
                    this.ctx.fill();
                    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
                    this.ctx.stroke();
                }
            } else if (dec.type === 'dead_tank') {
                const seed = Math.floor(Math.abs(dec.x + dec.y)) % 2;
                
                this.ctx.save();
                this.ctx.translate(dec.x, dec.y);
                this.ctx.rotate(dec.rotation || 0);

                // Burnt area on ground
                this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
                this.ctx.beginPath();
                this.ctx.ellipse(0, 0, dec.size * 1.5, dec.size * 1.8, 0, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Draw destroyed hull (Burnt and charred)
                this.ctx.fillStyle = '#1c1917'; // very dark stone for charred metal
                this.ctx.beginPath();
                this.ctx.roundRect(-dec.size*0.9, -dec.size * 1.0, dec.size * 1.8, dec.size * 2.0, 6);
                this.ctx.fill();
                
                // Inner exposed parts / rust
                this.ctx.fillStyle = '#4a0404'; // dark red/rust
                this.ctx.fillRect(-dec.size*0.6, -dec.size*0.4, dec.size*1.2, dec.size*0.8);
                
                // Track detritus
                this.ctx.fillStyle = '#0f0f0f';
                for(let k=0; k<2; k++) {
                   const side = k === 0 ? -dec.size*1.0 : dec.size*0.6;
                   this.ctx.fillRect(side, -dec.size * 1.1, dec.size*0.4, dec.size * 2.2);
                }

                // Blown off turret (slightly offset and rotated randomly)
                this.ctx.save();
                this.ctx.translate(dec.size * 0.4, dec.size * 0.5);
                this.ctx.rotate(seed === 0 ? 0.3 : -0.5);
                
                this.ctx.fillStyle = '#292524'; // charred turret color
                this.ctx.beginPath();
                this.ctx.arc(0, 0, dec.size * 0.6, 0, Math.PI * 2);
                this.ctx.fill();
                
                this.ctx.lineWidth = 1;
                this.ctx.strokeStyle = '#000';
                this.ctx.stroke();
                
                // Bent/Burnt Barrel
                this.ctx.fillStyle = '#1c1917';
                this.ctx.beginPath();
                this.ctx.moveTo(0, -dec.size*0.1);
                this.ctx.lineTo(dec.size * 1.5, -dec.size*0.1);
                // The bent part
                this.ctx.lineTo(dec.size * 1.7, dec.size*0.4);
                this.ctx.lineTo(dec.size * 1.5, dec.size*0.4 - 4);
                this.ctx.lineTo(dec.size * 1.5, Math.min(dec.size*0.1, dec.size*0.4 - 4));
                this.ctx.lineTo(0, dec.size*0.1);
                this.ctx.fill();
                this.ctx.stroke();
                
                this.ctx.restore(); // restore turret pos

                // Embers / Fire
                if (performance.now() % (1000) > 500) {
                     this.ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
                     this.ctx.beginPath();
                     this.ctx.arc(dec.size * (Math.random()-0.5), dec.size * (Math.random()-0.5), Math.random() * 5 + 5, 0, Math.PI * 2);
                     this.ctx.fill();
                     this.ctx.fillStyle = 'rgba(245, 158, 11, 0.6)';
                     this.ctx.beginPath();
                     this.ctx.arc(dec.size * (Math.random()-0.5), dec.size * (Math.random()-0.5), Math.random() * 4 + 2, 0, Math.PI * 2);
                     this.ctx.fill();
                }

                this.ctx.restore();
            } else {
                // Rubble
                this.ctx.fillStyle = '#404040';
                for(let j=0; j<3; j++) {
                    this.ctx.fillRect(Math.random()*dec.size - dec.size/2, Math.random()*dec.size - dec.size/2, 5, 5);
                }
            }
            this.ctx.restore();
        }

        // Draw Shockwaves
        for (let s of this.shockwaves) {
            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
            // Replace alpha in rgba(r, g, b, a)
            this.ctx.strokeStyle = s.color.replace(/[\d.]+\)$/, `${s.life})`);
            this.ctx.lineWidth = 5 * s.life;
            this.ctx.stroke();
            this.ctx.restore();
        }

        // Draw Grid (Subtle pavement lines)
        const gridSize = 200;
        const offsetX = -this.camX % gridSize;
        const offsetY = -this.camY % gridSize;
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        for (let x = offsetX - gridSize; x < this.canvas.width + gridSize; x += gridSize) {
            this.ctx.moveTo(this.camX + x, this.camY); this.ctx.lineTo(this.camX + x, this.camY + this.canvas.height);
        }
        for (let y = offsetY - gridSize; y < this.canvas.height + gridSize; y += gridSize) {
            this.ctx.moveTo(this.camX, this.camY + y); this.ctx.lineTo(this.camX + this.canvas.width, this.camY + y);
        }
        this.ctx.stroke();

        // Draw Obstacles (Ruined Buildings)
        for (let obs of this.obstacles) {
            this.drawRuin(obs);
        }

        // Draw Mission
        if (this.currentMission) {
            if (this.currentMission.type === 'capture') {
                this.ctx.save();
                this.ctx.beginPath();
                this.ctx.arc(this.currentMission.x, this.currentMission.y, this.currentMission.radius || 150, 0, Math.PI * 2);
                this.ctx.fillStyle = `rgba(16, 185, 129, ${0.1 + Math.sin(performance.now() / 200) * 0.05})`; // Pulse emerald
                this.ctx.fill();
                this.ctx.strokeStyle = '#10b981';
                this.ctx.lineWidth = 2;
                this.ctx.setLineDash([10, 10]);
                this.ctx.stroke();
                
                // Draw progress ring
                if (this.currentMission.progress > 0) {
                    this.ctx.beginPath();
                    this.ctx.arc(this.currentMission.x, this.currentMission.y, (this.currentMission.radius || 150) + 5, -Math.PI/2, -Math.PI/2 + (this.currentMission.progress / 100) * Math.PI * 2);
                    this.ctx.strokeStyle = '#34d399';
                    this.ctx.lineWidth = 4;
                    this.ctx.setLineDash([]);
                    this.ctx.stroke();
                }
                
                this.ctx.fillStyle = '#10b981';
                this.ctx.font = 'bold 14px monospace';
                this.ctx.textAlign = 'center';
                this.ctx.fillText('CAPTURE ZONE', this.currentMission.x, this.currentMission.y);
                this.ctx.restore();
            } else if (this.currentMission.type === 'destroy') {
                const target = this.obstacles.find(o => o.id === this.currentMission!.targetId);
                if (target) {
                    this.ctx.save();
                    this.ctx.beginPath();
                    this.ctx.arc(target.x + target.w/2, target.y + target.h/2, Math.max(target.w, target.h) + 10, 0, Math.PI * 2);
                    this.ctx.strokeStyle = `rgba(239, 68, 68, ${0.5 + Math.sin(performance.now() / 150) * 0.5})`; // Pulse red
                    this.ctx.lineWidth = 3;
                    this.ctx.setLineDash([15, 15]);
                    this.ctx.stroke();
                    
                    this.ctx.fillStyle = '#ef4444';
                    this.ctx.font = 'bold 14px monospace';
                    this.ctx.textAlign = 'center';
                    this.ctx.fillText('TARGET', target.x + target.w/2, target.y - 10);
                    this.ctx.restore();
                }
            } else if (this.currentMission.type === 'collect') {
                for (let item of this.currentMission.itemsToCollect!) {
                    if (!item.collected) {
                        this.ctx.save();
                        this.ctx.beginPath();
                        this.ctx.arc(item.x, item.y, 25, 0, Math.PI * 2);
                        this.ctx.fillStyle = `rgba(245, 158, 11, ${0.8 + Math.sin(performance.now() / 200) * 0.2})`;
                        this.ctx.shadowColor = '#f59e0b';
                        this.ctx.shadowBlur = 20;
                        this.ctx.fill();
                        
                        this.ctx.fillStyle = '#ffffff';
                        this.ctx.shadowBlur = 0;
                        this.ctx.font = 'bold 24px monospace';
                        this.ctx.textAlign = 'center';
                        this.ctx.textBaseline = 'middle';
                        this.ctx.fillText('★', item.x, item.y + 2);
                        this.ctx.restore();
                    }
                }
            } else if (this.currentMission.type === 'survive') {
                this.ctx.save();
                this.ctx.beginPath();
                this.ctx.arc(this.player.x, this.player.y, 800, 0, Math.PI * 2);
                this.ctx.strokeStyle = `rgba(239, 68, 68, ${0.1 + Math.sin(performance.now() / 150) * 0.1})`;
                this.ctx.lineWidth = 30;
                this.ctx.stroke();
                this.ctx.restore();
            }
        }

        // Draw Items
        for (let item of this.items) {
            this.ctx.save();
            this.ctx.shadowBlur = 15;
            if (item.type === 'repair') {
                this.ctx.shadowColor = '#10b981';
                this.ctx.fillStyle = '#10b981'; // emerald-500
                this.ctx.beginPath();
                this.ctx.arc(item.x, item.y, item.radius, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Draw plus sign
                this.ctx.shadowBlur = 0;
                this.ctx.fillStyle = '#ffffff';
                this.ctx.fillRect(item.x - 2, item.y - 8, 4, 16);
                this.ctx.fillRect(item.x - 8, item.y - 2, 16, 4);
            } else if (item.type === 'speed') {
                this.ctx.shadowColor = '#3b82f6';
                this.ctx.fillStyle = '#3b82f6'; // blue-500
                this.ctx.beginPath();
                this.ctx.arc(item.x, item.y, item.radius, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Draw forward arrows (>>)
                this.ctx.shadowBlur = 0;
                this.ctx.fillStyle = '#ffffff';
                this.ctx.beginPath();
                this.ctx.moveTo(item.x - 4, item.y - 6);
                this.ctx.lineTo(item.x + 4, item.y);
                this.ctx.lineTo(item.x - 4, item.y + 6);
                this.ctx.lineTo(item.x - 2, item.y);
                this.ctx.fill();
            } else if (item.type === 'ammo') {
                this.ctx.shadowColor = '#f59e0b';
                this.ctx.fillStyle = '#f59e0b'; // amber-500
                this.ctx.beginPath();
                this.ctx.arc(item.x, item.y, item.radius, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Draw bullet icon (simple rectangle)
                this.ctx.shadowBlur = 0;
                this.ctx.fillStyle = '#ffffff';
                this.ctx.fillRect(item.x - 3, item.y - 6, 6, 12);
                this.ctx.beginPath();
                this.ctx.arc(item.x, item.y - 6, 3, 0, Math.PI, true);
                this.ctx.fill();
            }
            this.ctx.restore();
        }

        // Draw Airstrikes
        for (let strike of this.airstrikes) {
            this.ctx.beginPath();
            this.ctx.arc(strike.x, strike.y, 200, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(239, 68, 68, ${0.1 + Math.sin(strike.timer * 15) * 0.1})`;
            this.ctx.fill();
            this.ctx.strokeStyle = '#ef4444';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            
            // Crosshair
            this.ctx.beginPath();
            this.ctx.moveTo(strike.x - 20, strike.y);
            this.ctx.lineTo(strike.x + 20, strike.y);
            this.ctx.moveTo(strike.x, strike.y - 20);
            this.ctx.lineTo(strike.x, strike.y + 20);
            this.ctx.stroke();
        }

        // Draw Tanks
        const allTanks = [this.player, ...this.enemies];
        for (let tank of allTanks) {
            this.drawTank(tank);
        }

        // Draw Trees
        for (let tree of this.trees) {
            this.ctx.save();
            this.ctx.translate(tree.x, tree.y);
            
            // Tree shadow
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            this.ctx.beginPath();
            this.ctx.arc(tree.size * 0.3, tree.size * 0.3, tree.size, 0, Math.PI * 2);
            this.ctx.fill();

            // Tree leaves
            if (tree.type === 0) {
                this.ctx.fillStyle = '#14532d'; // green-900
            } else if (tree.type === 1) {
                this.ctx.fillStyle = '#064e3b'; // emerald-900
            } else {
                this.ctx.fillStyle = '#3f6212'; // lime-900
            }
            
            this.ctx.beginPath();
            this.ctx.arc(0, 0, tree.size, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Tree highlights
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
            this.ctx.beginPath();
            this.ctx.arc(-tree.size * 0.2, -tree.size * 0.2, tree.size * 0.6, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.restore();
        }

        // Draw Projectiles
        for (let p of this.projectiles) {
            // Draw trail
            if (p.trail.length > 1) {
                this.ctx.beginPath();
                this.ctx.moveTo(p.trail[0].x, p.trail[0].y);
                for (let i = 1; i < p.trail.length; i++) {
                    this.ctx.lineTo(p.trail[i].x, p.trail[i].y);
                }
                this.ctx.strokeStyle = 'rgba(253, 224, 71, 0.6)'; // yellow-300 with alpha
                this.ctx.lineWidth = p.radius * 1.5;
                this.ctx.lineCap = 'round';
                this.ctx.shadowBlur = 10;
                this.ctx.shadowColor = '#fde047';
                this.ctx.stroke();
                this.ctx.shadowBlur = 0;
            }

            // Draw projectile head
            this.ctx.save();
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = '#fde047';
            this.ctx.fillStyle = '#fde047'; // yellow-300
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        }

        // Draw Particles
        for (let p of this.particles) {
            this.ctx.save();
            this.ctx.globalAlpha = p.life / p.maxLife;
            
            if (p.shape === 'square') {
                this.ctx.translate(p.x, p.y);
                if (p.rotation !== undefined && p.rotationSpeed !== undefined) {
                    p.rotation += p.rotationSpeed * 0.016; // Approx 60fps dt
                    this.ctx.rotate(p.rotation);
                }
                this.ctx.fillStyle = p.color;
                this.ctx.fillRect(-p.size, -p.size, p.size * 2, p.size * 2);
            } else {
                this.ctx.shadowBlur = 10;
                this.ctx.shadowColor = p.color;
                this.ctx.fillStyle = p.color;
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2);
                this.ctx.fill();
            }
            this.ctx.restore();
        }

        // Draw Floating Texts
        this.ctx.font = 'bold 14px "Inter", sans-serif';
        this.ctx.textAlign = 'center';
        for (let ft of this.floatingTexts) {
            this.ctx.globalAlpha = ft.life / ft.maxLife;
            this.ctx.fillStyle = ft.color;
            this.ctx.fillText(ft.text, ft.x, ft.y - (1 - ft.life/ft.maxLife) * 30);
        }
        this.ctx.globalAlpha = 1.0;

        // Draw Planes
        for (let strike of this.airstrikes) {
            // Plane approaches target over 2 seconds
            let planeX = strike.x - Math.cos(strike.angle) * 1500 * (strike.timer / 2.0);
            let planeY = strike.y - Math.sin(strike.angle) * 1500 * (strike.timer / 2.0);
            this.drawPlane(planeX, planeY, strike.angle);
        }
        for (let p of this.planes) {
            this.drawPlane(p.x, p.y, p.angle);
        }

        this.ctx.restore();

        // Draw Off-Screen Mission Indicator
        if (this.currentMission && this.currentMission.active && this.currentMission.type !== 'survive') {
            const screenX = this.currentMission.x - this.camX;
            const screenY = this.currentMission.y - this.camY;
            
            // Check if off-screen
            const margin = 50;
            if (screenX < margin || screenX > this.canvas.width - margin || 
                screenY < margin || screenY > this.canvas.height - margin) {
                
                // Calculate intersection with screen bounds
                const cx = this.canvas.width / 2;
                const cy = this.canvas.height / 2;
                const angle = Math.atan2(screenY - cy, screenX - cx);
                
                let indX = cx + Math.cos(angle) * (cx - margin);
                let indY = cy + Math.sin(angle) * (cy - margin);
                
                // Clamp to screen bounds
                indX = Math.max(margin, Math.min(this.canvas.width - margin, indX));
                indY = Math.max(margin, Math.min(this.canvas.height - margin, indY));
                
                this.ctx.save();
                this.ctx.translate(indX, indY);
                this.ctx.rotate(angle);
                
                // Draw arrow
                this.ctx.beginPath();
                this.ctx.moveTo(15, 0);
                this.ctx.lineTo(-10, 10);
                this.ctx.lineTo(-5, 0);
                this.ctx.lineTo(-10, -10);
                this.ctx.closePath();
                
                this.ctx.fillStyle = '#10b981'; // emerald-500
                this.ctx.fill();
                this.ctx.strokeStyle = '#047857'; // emerald-700
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
                
                // Draw pulsing glow
                this.ctx.beginPath();
                this.ctx.arc(0, 0, 20 + Math.sin(performance.now() / 150) * 5, 0, Math.PI * 2);
                this.ctx.strokeStyle = `rgba(16, 185, 129, ${0.3 + Math.sin(performance.now() / 150) * 0.2})`;
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
                
                this.ctx.restore();
            }
        }

        // Draw Vignette Effect
        const gradient = this.ctx.createRadialGradient(
            this.canvas.width / 2, this.canvas.height / 2, this.canvas.height * 0.4,
            this.canvas.width / 2, this.canvas.height / 2, this.canvas.height * 0.8
        );
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(1, 'rgba(0,0,0,0.6)');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    private drawPlane(x: number, y: number, angle: number) {
        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.rotate(angle);
        
        // Plane Shadow
        this.ctx.save();
        this.ctx.translate(50, 50); // Shadow offset
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.beginPath();
        this.ctx.moveTo(30, 0);
        this.ctx.lineTo(-10, 40);
        this.ctx.lineTo(-20, 40);
        this.ctx.lineTo(-10, 10);
        this.ctx.lineTo(-30, 15);
        this.ctx.lineTo(-40, 15);
        this.ctx.lineTo(-35, 0);
        this.ctx.lineTo(-40, -15);
        this.ctx.lineTo(-30, -15);
        this.ctx.lineTo(-10, -10);
        this.ctx.lineTo(-20, -40);
        this.ctx.lineTo(-10, -40);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.restore();

        // Plane Body
        this.ctx.fillStyle = '#334155'; // Slightly lighter slate
        this.ctx.beginPath();
        this.ctx.moveTo(30, 0); // Nose
        this.ctx.lineTo(-10, 40); // Wing tip
        this.ctx.lineTo(-20, 40); // Wing back
        this.ctx.lineTo(-10, 10); // Body
        this.ctx.lineTo(-30, 15); // Tail wing
        this.ctx.lineTo(-40, 15); // Tail wing tip
        this.ctx.lineTo(-35, 0); // Tail
        this.ctx.lineTo(-40, -15); // Tail wing tip
        this.ctx.lineTo(-30, -15); // Tail wing
        this.ctx.lineTo(-10, -10); // Body
        this.ctx.lineTo(-20, -40); // Wing back
        this.ctx.lineTo(-10, -40); // Wing tip
        this.ctx.closePath();
        this.ctx.fill();

        // Engine/Detail
        this.ctx.fillStyle = '#ef4444'; // Red detail
        this.ctx.beginPath();
        this.ctx.arc(-5, 0, 5, 0, Math.PI * 2);
        this.ctx.fill();

        // Cockpit
        this.ctx.fillStyle = '#60a5fa'; // Light blue
        this.ctx.beginPath();
        this.ctx.ellipse(5, 0, 8, 4, 0, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.restore();
    }

    private drawRuin(obs: Obstacle) {
        this.ctx.save();
        
        const seed = Math.floor(Math.abs(obs.x + obs.y)) % 3;
        const tex = this.textures[`ruin${seed}`];
        
        if (tex && tex.complete && tex.naturalWidth > 0) {
            // Draw real photo
            this.ctx.beginPath();
            this.ctx.rect(obs.x, obs.y, obs.w, obs.h);
            this.ctx.clip();
            this.ctx.drawImage(tex, obs.x, obs.y, obs.w, obs.h);
            
            // Darken it to match the game's atmosphere
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            this.ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
            
            // Add a border
            this.ctx.strokeStyle = '#171717';
            this.ctx.lineWidth = 3;
            this.ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);
        } else {
            // Base structure fallback
            const healthPercent = obs.health / obs.maxHealth;
            const color = healthPercent > 0.7 ? '#525252' : (healthPercent > 0.3 ? '#404040' : '#262626');
            this.ctx.fillStyle = color; // Concrete gray
            this.ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
            
            // Ruin details (broken walls/windows)
            this.ctx.strokeStyle = '#171717';
            this.ctx.lineWidth = 2;
            
            // Draw some "rooms" or internal walls
            this.ctx.beginPath();
            if (obs.w > obs.h) {
                for(let x = obs.x + 40; x < obs.x + obs.w; x += 60) {
                    this.ctx.moveTo(x, obs.y);
                    this.ctx.lineTo(x, obs.y + obs.h * 0.7);
                }
            } else {
                for(let y = obs.y + 40; y < obs.y + obs.h; y += 60) {
                    this.ctx.moveTo(obs.x, y);
                    this.ctx.lineTo(obs.x + obs.w * 0.7, y);
                }
            }
            this.ctx.stroke();

            // Broken edges (jagged look)
            this.ctx.fillStyle = '#262626';
            const edgeSeed = (obs.x + obs.y) % 100;
            if (edgeSeed > 50) {
                // Top jagged
                this.ctx.beginPath();
                this.ctx.moveTo(obs.x, obs.y);
                this.ctx.lineTo(obs.x + obs.w * 0.3, obs.y + 10);
                this.ctx.lineTo(obs.x + obs.w * 0.6, obs.y - 5);
                this.ctx.lineTo(obs.x + obs.w, obs.y + 15);
                this.ctx.lineTo(obs.x + obs.w, obs.y);
                this.ctx.fill();
            }

            // Rebar / Exposed metal
            this.ctx.strokeStyle = '#737373';
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.moveTo(obs.x + obs.w, obs.y + 20);
            this.ctx.lineTo(obs.x + obs.w + 10, obs.y + 15);
            this.ctx.moveTo(obs.x + obs.w, obs.y + 30);
            this.ctx.lineTo(obs.x + obs.w + 12, obs.y + 35);
            this.ctx.stroke();
        }

        this.ctx.restore();
    }

    private drawTank(tank: Tank) {
        this.ctx.save();
        this.ctx.translate(tank.x, tank.y);

        // Tank drop shadow
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
        this.ctx.shadowBlur = 15;
        this.ctx.shadowOffsetX = 8;
        this.ctx.shadowOffsetY = 8;

        // Draw hull
        this.ctx.save();
        this.ctx.rotate(tank.hullAngle);
        
        // Treads
        this.ctx.fillStyle = '#111111'; // darker neutral
        this.ctx.fillRect(-tank.radius*1.1, -tank.radius, tank.radius*2.2, tank.radius*0.4);
        this.ctx.fillRect(-tank.radius*1.1, tank.radius*0.6, tank.radius*2.2, tank.radius*0.4);
        
        // Tread details (lines)
        this.ctx.fillStyle = '#262626';
        let offset = (performance.now() / 50 * (tank.speed / tank.maxSpeed)) % 6;
        for(let i = -tank.radius + offset; i < tank.radius; i += 6) {
            this.ctx.fillRect(i, -tank.radius, 2, tank.radius*0.4);
            this.ctx.fillRect(i, tank.radius*0.6, 2, tank.radius*0.4);
        }

        // Determine colors based on skin
        let skin = tank.customization?.skin || 'default';
        let primaryColor = tank.customization?.paintJob || tank.color;
        let secondaryColor = '#000000';
        let isNeon = false;

        if (skin === 'gold') {
            primaryColor = '#fbbf24';
            secondaryColor = '#92400e';
        } else if (skin === 'neon') {
            primaryColor = '#00ffff';
            secondaryColor = '#ff00ff';
            isNeon = true;
        } else if (skin === 'lava') {
            primaryColor = '#ef4444';
            secondaryColor = '#7f1d1d';
        } else if (skin === 'plasma') {
            primaryColor = '#a855f7';
            secondaryColor = '#1d4ed8';
            isNeon = true;
        }

        // Main body with gradient
        const hullGradient = this.ctx.createLinearGradient(-tank.radius, -tank.radius, tank.radius, tank.radius);
        hullGradient.addColorStop(0, primaryColor);
        hullGradient.addColorStop(1, secondaryColor); // darker shade
        
        if (isNeon) {
            this.ctx.shadowColor = primaryColor;
            this.ctx.shadowBlur = 15;
        }

        this.ctx.fillStyle = hullGradient;
        this.ctx.beginPath();
        this.ctx.roundRect(-tank.radius, -tank.radius*0.8, tank.radius*2, tank.radius*1.6, 4);
        this.ctx.fill();

        // Regeneration indicator
        if (performance.now() - tank.lastDamageTime > 5000 && tank.health < tank.maxHealth) {
            this.ctx.strokeStyle = 'rgba(34, 197, 94, 0.5)';
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, tank.radius * 1.2, 0, Math.PI * 2);
            this.ctx.stroke();
        }

        // --- Damage Dents ---
        if (tank.health < tank.maxHealth * 0.75) {
            this.ctx.fillStyle = 'rgba(0,0,0,0.3)';
            // Draw a few "dents" based on health
            let dentCount = Math.floor((1 - tank.health / tank.maxHealth) * 5);
            for(let i = 0; i < dentCount; i++) {
                let dx = (Math.sin(tank.id + i) * tank.radius * 0.8);
                let dy = (Math.cos(tank.id + i) * tank.radius * 0.6);
                this.ctx.beginPath();
                this.ctx.arc(dx, dy, tank.radius * 0.2, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }

        // Apply visual mod if present on hull
        if (tank.customization && tank.customization.visualMod !== 'none') {
            if (tank.customization.visualMod === 'armor') {
                this.ctx.fillStyle = '#3f3f46'; // dark zinc
                this.ctx.fillRect(-tank.radius*0.8, -tank.radius*0.9, tank.radius*1.6, tank.radius*0.2);
                this.ctx.fillRect(-tank.radius*0.8, tank.radius*0.7, tank.radius*1.6, tank.radius*0.2);
            }
        }

        
        // Add camo or specific skin patterns
        this.ctx.save();
        this.ctx.clip(); // Clip to the rounded rect of the hull
        
        if (skin === 'neon') {
            this.ctx.strokeStyle = '#00ffff';
            this.ctx.lineWidth = 2;
            for(let i=0; i < 3; i++) {
                this.ctx.strokeRect(-tank.radius + 5 + i*4, -tank.radius*0.8 + 5 + i*4, tank.radius*2 - 10 - i*8, tank.radius*1.6 - 10 - i*8);
            }
        } else if (skin === 'lava') {
            this.ctx.fillStyle = 'rgba(255, 100, 0, 0.6)';
            let seed = tank.id * 54321 + performance.now() / 200;
            for (let i = 0; i < 5; i++) {
                seed = (seed * 9301 + 49297) % 233280;
                let bx = (seed / 233280) * tank.radius * 2 - tank.radius;
                seed = (seed * 9301 + 49297) % 233280;
                let by = (seed / 233280) * tank.radius * 2 - tank.radius;
                this.ctx.beginPath();
                this.ctx.arc(bx, by, tank.radius * 0.3, 0, Math.PI * 2);
                this.ctx.fill();
            }
        } else {
            // Default camo blobs
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            let seed = tank.id * 12345;
            for (let i = 0; i < 6; i++) {
                seed = (seed * 9301 + 49297) % 233280;
                let bx = (seed / 233280) * tank.radius * 2 - tank.radius;
                seed = (seed * 9301 + 49297) % 233280;
                let by = (seed / 233280) * tank.radius * 2 - tank.radius;
                seed = (seed * 9301 + 49297) % 233280;
                let br = (seed / 233280) * tank.radius * 0.6 + 2;
                this.ctx.beginPath();
                this.ctx.arc(bx, by, br, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
        this.ctx.restore();

        // Hull border
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        
        // Front indicator (white stripe)
        this.ctx.fillStyle = 'rgba(255,255,255,0.7)';
        this.ctx.fillRect(tank.radius*0.6, -tank.radius*0.2, tank.radius*0.3, tank.radius*0.4);

        this.ctx.restore();

        // Reset shadow for turret
        this.ctx.shadowBlur = 8;
        this.ctx.shadowOffsetX = 4;
        this.ctx.shadowOffsetY = 4;

        // Draw turret
        this.ctx.save();
        this.ctx.rotate(tank.turretAngle);
        
        // Barrel
        const barrelGradient = this.ctx.createLinearGradient(0, -4, tank.radius + 20, 8);
        barrelGradient.addColorStop(0, '#525252');
        barrelGradient.addColorStop(1, '#262626');
        this.ctx.fillStyle = barrelGradient;
        this.ctx.fillRect(0, -4, tank.radius + 20, 8);
        this.ctx.strokeRect(0, -4, tank.radius + 20, 8);
        
        // Turret body
        const turretGradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, tank.radius * 0.6);
        turretGradient.addColorStop(0, primaryColor);
        turretGradient.addColorStop(1, secondaryColor);
        this.ctx.fillStyle = turretGradient;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, tank.radius * 0.6, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Turret glow
        this.ctx.shadowColor = 'rgba(255, 255, 255, 0.2)';
        this.ctx.shadowBlur = 10;
        this.ctx.stroke();
        this.ctx.shadowBlur = 0; // Reset shadow
        this.ctx.shadowColor = 'transparent';
        
        // Turret camo
        this.ctx.save();
        this.ctx.clip();
        
        if (skin === 'lava') {
            this.ctx.fillStyle = 'rgba(255, 100, 0, 0.8)';
            this.ctx.beginPath();
            this.ctx.arc(0, 0, tank.radius * 0.2, 0, Math.PI * 2);
            this.ctx.fill();
        } else {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            let tSeed = tank.id * 54321;
            for (let i = 0; i < 4; i++) {
                tSeed = (tSeed * 9301 + 49297) % 233280;
                let bx = (tSeed / 233280) * tank.radius - tank.radius/2;
                tSeed = (tSeed * 9301 + 49297) % 233280;
                let by = (tSeed / 233280) * tank.radius - tank.radius/2;
                tSeed = (tSeed * 9301 + 49297) % 233280;
                let br = (tSeed / 233280) * tank.radius * 0.4 + 2;
                this.ctx.beginPath();
                this.ctx.arc(bx, by, br, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
        this.ctx.restore();

        // Apply decal ON the turret
        if (tank.customization && tank.customization.decal !== 'none') {
            this.ctx.save();
            // rotate so decal faces the turret barrel forward
            this.ctx.rotate(Math.PI / 2);
            let fontSize = tank.radius * 0.7;
            this.ctx.font = `900 ${fontSize}px "Inter", sans-serif`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            
            // Decal shadow/stroke for visibility
            this.ctx.strokeStyle = 'rgba(0,0,0,0.8)';
            this.ctx.lineWidth = 3;
            this.ctx.strokeText(tank.customization.decal, 0, 0);
            
            // Decal fill
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            if(skin === 'gold') this.ctx.fillStyle = '#fffbeb';
            if(skin === 'neon' || skin === 'plasma') {
                 this.ctx.fillStyle = primaryColor;
                 this.ctx.shadowColor = primaryColor;
                 this.ctx.shadowBlur = 10;
            }
            this.ctx.fillText(tank.customization.decal, 0, 0);
            this.ctx.restore();
        }

        // Apply visual mod on turret
        if (tank.customization && tank.customization.visualMod === 'antenna') {
            this.ctx.strokeStyle = '#a1a1aa'; // zinc 400
            this.ctx.lineWidth = 1.5;
            this.ctx.beginPath();
            this.ctx.moveTo(0, -tank.radius * 0.4);
            this.ctx.lineTo(0, -tank.radius * 1.2);
            this.ctx.stroke();
            this.ctx.fillStyle = '#ef4444'; // red tip
            this.ctx.beginPath();
            this.ctx.arc(0, -tank.radius * 1.2, 2, 0, Math.PI*2);
            this.ctx.fill();
        }

        this.ctx.strokeStyle = '#171717';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        this.ctx.restore();

        // Reset shadow completely
        this.ctx.shadowBlur = 0;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;
        this.ctx.shadowColor = 'transparent';

        // Health bar (drawn horizontally, no shadow)
        if (!tank.isPlayer) {
            const barWidth = tank.radius * 2;
            const barHeight = 4;
            const healthPercent = tank.health / tank.maxHealth;
            
            this.ctx.fillStyle = '#333';
            this.ctx.fillRect(-tank.radius, -tank.radius * 1.5, barWidth, barHeight);
            
            this.ctx.fillStyle = healthPercent > 0.5 ? '#10b981' : '#ef4444'; // green or red
            this.ctx.fillRect(-tank.radius, -tank.radius * 1.5, barWidth * healthPercent, barHeight);
        }

        this.ctx.restore();
    }
}
