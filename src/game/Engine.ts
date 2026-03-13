import { Vec2, resolveCircleAABB, resolveCircleCircle, moveTowardsAngle } from './utils';

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
    damage: number;
    ammo: number;
    maxAmmo: number;
    isPlayer: boolean;
    color: string;
    type?: string;
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
    x: number; y: number;
    w: number; h: number;
    type: 'building' | 'ruin' | 'wall';
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

    public isPaused: boolean = false;
    private playerTankType: 'light' | 'medium' | 'heavy' | '67' | 'brr' | 'tralalero' | 'tung' | 'cappucino' | 'lirili' | 'secret' | 'shitty' | 'op_tank';

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

    private difficulty: 'easy' | 'normal' | 'hard';

    private textures: Record<string, HTMLImageElement> = {};
    private texturesLoaded: boolean = false;

    constructor(canvas: HTMLCanvasElement, tankType: 'light' | 'medium' | 'heavy' | '67' | 'brr' | 'tralalero' | 'tung' | 'cappucino' | 'lirili' | 'secret' | 'shitty' | 'op_tank', difficulty: 'easy' | 'normal' | 'hard', onUpdateUI: (state: any) => void) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')!;
        this.playerTankType = tankType;
        this.difficulty = difficulty;
        this.onUpdateUI = onUpdateUI;

        this.loadTextures();
        this.init();
        this.setupInput();
    }

    private loadTextures() {
        const urls: Record<string, string> = {
            ruin0: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Ruined_buildings_in_Kabul.jpg/400px-Ruined_buildings_in_Kabul.jpg',
            ruin1: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Ruined_house_in_Agdam.jpg/400px-Ruined_house_in_Agdam.jpg',
            ruin2: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Ruined_house_in_the_village_of_Kopachi.jpg/400px-Ruined_house_in_the_village_of_Kopachi.jpg',
            dead_tank0: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/Destroyed_Iraqi_Type_69_tank.jpg/300px-Destroyed_Iraqi_Type_69_tank.jpg',
            dead_tank1: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Destroyed_T-72_tank_in_Tskhinvali.jpg/300px-Destroyed_T-72_tank_in_Tskhinvali.jpg',
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
        }

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
            damage: damage,
            ammo: maxAmmo,
            maxAmmo: maxAmmo,
            isPlayer: true,
            color: '#10b981' // emerald-500
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
                type: Math.random() > 0.3 ? 'ruin' : 'building'
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

        let currentPlayerMaxSpeed = this.player.maxSpeed * (this.player.speedBuffTimer > 0 ? 1.5 : 1.0);

        if (inputY !== 0) {
            this.player.speed = currentPlayerMaxSpeed * inputY;
        } else {
            this.player.speed *= 0.9; // Friction
        }

        if (inputX !== 0) {
            this.player.hullAngle += inputX * this.player.turnSpeed * dt;
        }

        // Mouse aiming
        const targetCamX = this.player.x - this.canvas.width / 2;
        const targetCamY = this.player.y - this.canvas.height / 2;
        this.camX += (targetCamX - this.camX) * 5 * dt;
        this.camY += (targetCamY - this.camY) * 5 * dt;

        const mouseWorldX = this.mouseX + this.camX;
        const mouseWorldY = this.mouseY + this.camY;

        const targetAngle = Math.atan2(mouseWorldY - this.player.y, mouseWorldX - this.player.x);
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
                this.spawnExplosion(strike.x, strike.y, '#ef4444', 100);
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
        let baseMaxEnemies = 6;
        let scoreInterval = 500;
        if (this.difficulty === 'easy') {
            baseMaxEnemies = 4;
            scoreInterval = 1000;
        } else if (this.difficulty === 'hard') {
            baseMaxEnemies = 8;
            scoreInterval = 250;
        }
        
        let maxEnemies = baseMaxEnemies + Math.floor(this.score / scoreInterval);
        
        if (this.spawnTimer <= 0 && this.enemies.length < maxEnemies) {
            this.spawnTimer = Math.max(1.0, 4.0 - Math.floor(this.score / scoreInterval) * 0.1);
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
                ammo: 999, // Enemies have infinite ammo for now
                maxAmmo: 999,
                isPlayer: false, color: type === 'scout' ? '#3b82f6' : (type === 'sniper' ? '#f59e0b' : '#ef4444') // blue, amber, red
            });
        }

        // --- Update Tanks ---
        const allTanks = [this.player, ...this.enemies];
        
        allTanks.forEach(tank => {
            tank.reloadTimer -= dt;
            tank.speedBuffTimer -= dt;

            // Move
            tank.x += Math.cos(tank.hullAngle) * tank.speed * dt;
            tank.y += Math.sin(tank.hullAngle) * tank.speed * dt;

            // AI Logic
            if (!tank.isPlayer) {
                let distToPlayer = new Vec2(this.player.x - tank.x, this.player.y - tank.y).mag();
                let aiTargetAngle = Math.atan2(this.player.y - tank.y, this.player.x - tank.x);
                let currentMaxSpeed = tank.maxSpeed * (tank.speedBuffTimer > 0 ? 1.5 : 1.0);

                // Behavior based on type
                if (tank.type === 'scout') {
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
                for (let obs of this.obstacles) {
                    let res = resolveCircleAABB(p.x, p.y, p.radius, obs.x, obs.y, obs.w, obs.h);
                    if (res.hit) {
                        destroyed = true;
                        this.spawnExplosion(p.x, p.y, '#737373', 5); // Dust
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
                            damageMult = 0.2; // Front armor bounces/resists
                            hitText = "RICOCHET";
                            color = "#a3a3a3";
                            this.spawnExplosion(p.x, p.y, '#fbbf24', 3); // sparks
                        } else if (dot < -0.6) {
                            damageMult = 2.0; // Rear armor weak
                            hitText = "CRITICAL HIT";
                            color = "#ef4444";
                            this.spawnExplosion(p.x, p.y, '#ef4444', 10);
                        } else {
                            damageMult = 1.0; // Side
                            hitText = "PENETRATION";
                            color = "#fcd34d";
                            this.spawnExplosion(p.x, p.y, '#f97316', 8);
                        }

                        tank.health -= p.damage * damageMult;
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
            this.spawnExplosion(this.player.x, this.player.y, '#10b981', 50);
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
                maxAmmo: this.player.maxAmmo
            });
            this.stop();
            return;
        }

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            if (this.enemies[i].health <= 0) {
                this.spawnExplosion(this.enemies[i].x, this.enemies[i].y, '#ef4444', 30);
                this.decorations.push({
                    x: this.enemies[i].x, y: this.enemies[i].y,
                    size: this.enemies[i].radius,
                    type: 'dead_tank',
                    rotation: this.enemies[i].hullAngle,
                    color: '#4a0404' // Dark red
                });
                this.shakeAmount = 10; // Screen shake on enemy death
                this.enemies.splice(i, 1);
                let points = 100;
                if (this.difficulty === 'easy') points = 50;
                else if (this.difficulty === 'hard') points = 200;
                this.score += points;
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
            airstrikeCooldown: Math.max(0, this.airstrikeCooldown)
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

        this.projectiles.push({
            x: px, y: py,
            vx: Math.cos(angle) * 1500,
            vy: Math.sin(angle) * 1500,
            radius: 2,
            damage: tank.damage * 0.15,
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

        this.projectiles.push({
            x: px, y: py,
            vx: Math.cos(tank.turretAngle) * 1000,
            vy: Math.sin(tank.turretAngle) * 1000,
            radius: 4,
            damage: tank.damage,
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

    private spawnExplosion(x: number, y: number, color: string, count: number) {
        for (let i = 0; i < count; i++) {
            let angle = Math.random() * Math.PI * 2;
            let speed = Math.random() * 100 + 50;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: Math.random() * 0.3 + 0.1,
                maxLife: 0.4,
                color: color,
                size: Math.random() * 6 + 2
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
                    size: Math.random() * 8 + 4
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
                const tex = this.textures[`dead_tank${seed}`];
                
                if (tex && tex.complete && tex.naturalWidth > 0) {
                    this.ctx.beginPath();
                    this.ctx.roundRect(-dec.size*1.2, -dec.size, dec.size * 2.4, dec.size * 2, 8);
                    this.ctx.clip();
                    this.ctx.drawImage(tex, -dec.size*1.2, -dec.size, dec.size * 2.4, dec.size * 2);
                    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'; // Blend with dark ground
                    this.ctx.fill();
                } else {
                    // Draw destroyed hull
                    this.ctx.fillStyle = dec.color || '#333';
                    this.ctx.beginPath();
                    this.ctx.roundRect(-dec.size, -dec.size * 0.8, dec.size * 2, dec.size * 1.6, 4);
                    this.ctx.fill();
                    this.ctx.strokeStyle = '#111';
                    this.ctx.lineWidth = 2;
                    this.ctx.stroke();
                    
                    // Draw broken turret
                    this.ctx.beginPath();
                    this.ctx.arc(0, 0, dec.size * 0.5, 0, Math.PI * 2);
                    this.ctx.fill();
                    this.ctx.stroke();
                    
                    // Draw bent barrel
                    this.ctx.beginPath();
                    this.ctx.moveTo(0, 0);
                    this.ctx.lineTo(dec.size * 1.2, dec.size * 0.3); // slightly bent
                    this.ctx.lineWidth = 4;
                    this.ctx.stroke();
                    
                    // Add some scorch marks
                    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                    this.ctx.beginPath();
                    this.ctx.arc(dec.size * 0.3, -dec.size * 0.2, dec.size * 0.4, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            } else {
                // Rubble
                this.ctx.fillStyle = '#404040';
                for(let j=0; j<3; j++) {
                    this.ctx.fillRect(Math.random()*dec.size - dec.size/2, Math.random()*dec.size - dec.size/2, 5, 5);
                }
            }
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
            this.ctx.globalAlpha = p.life / p.maxLife;
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = p.color;
            this.ctx.fillStyle = p.color;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2);
            this.ctx.fill();
        }
        this.ctx.globalAlpha = 1.0;
        this.ctx.shadowBlur = 0;

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
        this.ctx.fillStyle = '#1e293b'; // Dark slate
        this.ctx.beginPath();
        this.ctx.moveTo(30, 0); // Nose
        this.ctx.lineTo(-10, 40); // Right wing tip
        this.ctx.lineTo(-20, 40);
        this.ctx.lineTo(-10, 10); // Right wing base
        this.ctx.lineTo(-30, 15); // Right tail tip
        this.ctx.lineTo(-40, 15);
        this.ctx.lineTo(-35, 0); // Tail center
        this.ctx.lineTo(-40, -15);
        this.ctx.lineTo(-30, -15); // Left tail tip
        this.ctx.lineTo(-10, -10); // Left wing base
        this.ctx.lineTo(-20, -40);
        this.ctx.lineTo(-10, -40); // Left wing tip
        this.ctx.closePath();
        this.ctx.fill();
        
        // Cockpit
        this.ctx.fillStyle = '#94a3b8';
        this.ctx.beginPath();
        this.ctx.ellipse(10, 0, 8, 3, 0, 0, Math.PI * 2);
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
            this.ctx.fillStyle = '#525252'; // Concrete gray
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
        for(let i = -tank.radius; i < tank.radius; i += 6) {
            this.ctx.fillRect(i, -tank.radius, 2, tank.radius*0.4);
            this.ctx.fillRect(i, tank.radius*0.6, 2, tank.radius*0.4);
        }

        // Main body with gradient
        const hullGradient = this.ctx.createLinearGradient(-tank.radius, -tank.radius, tank.radius, tank.radius);
        hullGradient.addColorStop(0, tank.color);
        hullGradient.addColorStop(1, '#000000'); // darker shade
        
        this.ctx.fillStyle = hullGradient;
        this.ctx.beginPath();
        this.ctx.roundRect(-tank.radius, -tank.radius*0.8, tank.radius*2, tank.radius*1.6, 4);
        this.ctx.fill();
        
        // Add camo blobs
        this.ctx.save();
        this.ctx.clip(); // Clip to the rounded rect of the hull
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
        turretGradient.addColorStop(0, tank.color);
        turretGradient.addColorStop(1, '#000000');
        this.ctx.fillStyle = turretGradient;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, tank.radius * 0.6, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Turret camo
        this.ctx.save();
        this.ctx.clip();
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
        this.ctx.restore();

        this.ctx.strokeStyle = '#171717';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        this.ctx.restore();

        // Reset shadow completely
        this.ctx.shadowBlur = 0;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;

        // Health bar (only for enemies)
        if (!tank.isPlayer) {
            this.ctx.fillStyle = '#ef4444';
            this.ctx.fillRect(-15, -tank.radius - 15, 30, 4);
            this.ctx.fillStyle = '#10b981';
            this.ctx.fillRect(-15, -tank.radius - 15, 30 * (tank.health / tank.maxHealth), 4);
        }

        this.ctx.restore();
    }
}
