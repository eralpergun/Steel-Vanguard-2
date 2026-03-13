import React, { useEffect, useRef, useState } from 'react';
import { GameEngine } from './game/Engine';
import { Crosshair, ShieldAlert, Target } from 'lucide-react';
import { db } from './firebase';
import { ref, get, set, child, onValue, query, orderByChild, limitToLast } from 'firebase/database';

export default function App() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<GameEngine | null>(null);
    const [gameState, setGameState] = useState<'login' | 'menu' | 'playing' | 'gameover'>('login');
    const [username, setUsername] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [selectedTank, setSelectedTank] = useState<'light' | 'medium' | 'heavy' | '67' | 'brr' | 'tralalero' | 'tung' | 'cappucino' | 'lirili' | 'secret' | 'shitty' | 'op_tank'>('medium');
    const [difficulty, setDifficulty] = useState<'easy' | 'normal' | 'hard'>('normal');
    const [uiState, setUiState] = useState({ health: 100, maxHealth: 100, reloadProgress: 1, score: 0, isPaused: false, ammo: 0, maxAmmo: 0, airstrikeCooldown: 0 });
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    const [totalCoins, setTotalCoins] = useState(0);
    const [unlockedTanks, setUnlockedTanks] = useState<string[]>(['light', 'medium', 'heavy']);
    const [chestMessage, setChestMessage] = useState<string | null>(null);
    const [leaderboard, setLeaderboard] = useState<{ username: string, score: number }[]>([]);

    useEffect(() => {
        if (gameState === 'menu') {
            const leaderboardRef = query(ref(db, 'leaderboard'), orderByChild('score'), limitToLast(5));
            const unsubscribe = onValue(leaderboardRef, (snapshot) => {
                if (snapshot.exists()) {
                    const data = snapshot.val();
                    const sorted = Object.entries(data)
                        .map(([username, entry]: [string, any]) => ({ username, score: entry.score as number }))
                        .sort((a, b) => b.score - a.score);
                    setLeaderboard(sorted);
                }
            });
            return () => unsubscribe();
        }
    }, [gameState]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username.trim()) return;
        
        setIsLoggingIn(true);
        try {
            const playerRef = ref(db, `players/${username}`);
            const snapshot = await get(playerRef);
            
            if (snapshot.exists()) {
                const data = snapshot.val();
                setTotalCoins(data.totalCoins || 0);
                setUnlockedTanks(data.unlockedTanks || ['light', 'medium', 'heavy']);
            } else {
                // Initialize new user
                await set(playerRef, {
                    totalCoins: 0,
                    unlockedTanks: ['light', 'medium', 'heavy']
                });
                setTotalCoins(0);
                setUnlockedTanks(['light', 'medium', 'heavy']);
            }
            setGameState('menu');
        } catch (error) {
            console.error("Firebase login error:", error);
            alert("Failed to connect to database. Please check your configuration.");
        } finally {
            setIsLoggingIn(false);
        }
    };

    useEffect(() => {
        if (gameState !== 'login' && username) {
            const saveData = async () => {
                try {
                    await set(ref(db, `players/${username}`), {
                        totalCoins,
                        unlockedTanks
                    });
                    
                    await set(ref(db, `leaderboard/${username}`), {
                        username,
                        score: totalCoins
                    });
                } catch (error) {
                    console.error("Error saving data:", error);
                }
            };
            saveData();
        }
    }, [totalCoins, unlockedTanks, username, gameState]);

    const buyChest = () => {
        if (totalCoins < 5000) {
            setChestMessage("Not enough points! You need 5000.");
            setTimeout(() => setChestMessage(null), 3000);
            return;
        }
        
        const brainrotTanks = ['67', 'brr', 'tralalero', 'tung', 'cappucino', 'lirili'];
        const lockedTanks = brainrotTanks.filter(t => !unlockedTanks.includes(t));
        
        if (lockedTanks.length === 0) {
            setChestMessage("You already unlocked all brainrot tanks!");
            setTimeout(() => setChestMessage(null), 3000);
            return;
        }

        setTotalCoins(prev => prev - 5000);
        const randomTank = lockedTanks[Math.floor(Math.random() * lockedTanks.length)];
        setUnlockedTanks(prev => [...prev, randomTank]);
        
        const names: Record<string, string> = {
            '67': '67 Tank',
            'brr': 'Brr Brr Patapim',
            'tralalero': 'Tralalero Tralala',
            'tung': 'Tung Tung Sahur',
            'cappucino': 'Cappucino Assasino',
            'lirili': 'Lirili Larila'
        };
        setChestMessage(`🎉 You unlocked: ${names[randomTank]}! 🎉`);
        setTimeout(() => setChestMessage(null), 5000);
    };

    const buySecretTank = () => {
        if (totalCoins < 100000) {
            setChestMessage("Not enough points! You need 100,000.");
            setTimeout(() => setChestMessage(null), 3000);
            return;
        }
        setTotalCoins(prev => prev - 100000);
        const isSecret = Math.random() < 0.5;
        const tank = isSecret ? 'secret' : 'shitty';
        if (!unlockedTanks.includes(tank)) {
            setUnlockedTanks(prev => [...prev, tank]);
        }
        const names: Record<string, string> = {
            'secret': 'Secret Tank',
            'shitty': 'Shitty Tank'
        };
        setChestMessage(`🎉 You unlocked: ${names[tank]}! 🎉`);
        setTimeout(() => setChestMessage(null), 5000);
    };

    const buyOPChest = () => {
        if (totalCoins < 1000000) {
            setChestMessage("Not enough points! You need 1,000,000.");
            setTimeout(() => setChestMessage(null), 3000);
            return;
        }
        setTotalCoins(prev => prev - 1000000);
        const isOP = Math.random() < 0.3;
        const tank = isOP ? 'op_tank' : 'shitty';
        if (!unlockedTanks.includes(tank)) {
            setUnlockedTanks(prev => [...prev, tank]);
        }
        const names: Record<string, string> = {
            'op_tank': 'Top Secret OP Tank',
            'shitty': 'Shitty Tank'
        };
        setChestMessage(isOP ? `🔥 HOLY SHIT! You unlocked: ${names[tank]}! 🔥` : `💀 Ouch... You got a ${names[tank]}. 💀`);
        setTimeout(() => setChestMessage(null), 5000);
    };

    useEffect(() => {
        if (gameState === 'playing' && canvasRef.current) {
            const engine = new GameEngine(
                canvasRef.current, 
                selectedTank, 
                difficulty,
                (state) => {
                    setUiState(prev => ({ ...prev, ...state }));
                    if (state.isGameOver) {
                        setGameState('gameover');
                    }
                }
            );
            engineRef.current = engine;
            engine.start();

            return () => {
                engine.stop();
            };
        }
    }, [gameState, selectedTank, difficulty]);

    const tankStats = [
        { id: 'light', name: 'Light Tank', desc: 'Fast & Agile', hp: 108, speed: 360, armor: 'Low', dmg: 27 },
        { id: 'medium', name: 'Medium Tank', desc: 'Balanced', hp: 180, speed: 225, armor: 'Medium', dmg: 45 },
        { id: 'heavy', name: 'Heavy Tank', desc: 'Slow Juggernaut', hp: 360, speed: 198, armor: 'High', dmg: 90 },
    ];

    const brainrotStats = [
        { id: '67', name: '67 Tank', desc: 'Zonguldak Power', hp: 270, speed: 315, armor: 'High', dmg: 108 },
        { id: 'brr', name: 'Brr Brr Patapim', desc: 'Blast Wave', hp: 225, speed: 360, armor: 'Medium', dmg: 22 },
        { id: 'tralalero', name: 'Tralalero', desc: 'Tralala', hp: 720, speed: 162, armor: 'Extreme', dmg: 180 },
        { id: 'tung', name: 'Tung Tung', desc: 'Sahur Special', hp: 135, speed: 380, armor: 'Low', dmg: 65 },
        { id: 'cappucino', name: 'Cappucino Assasino', desc: 'Assassin', hp: 225, speed: 250, armor: 'Medium', dmg: 150 },
        { id: 'lirili', name: 'Lirili', desc: 'Larila', hp: 160, speed: 300, armor: 'Medium', dmg: 55 },
    ];

    const opStats = [
        { id: 'op_tank', name: 'Top Secret OP Tank', desc: 'INSANE POWER', hp: 2000, speed: 600, armor: 'Godlike', dmg: 100 },
        { id: 'secret', name: 'Secret Tank', desc: 'Special Ops', hp: 700, speed: 450, armor: 'High', dmg: 30 },
        { id: 'shitty', name: 'Shitty Tank', desc: 'Literal Trash', hp: 50, speed: 150, armor: 'None', dmg: 10 },
    ];

    const allTanks = [...tankStats, ...brainrotStats, ...opStats];
    const currentTankStats = allTanks.find(t => t.id === selectedTank);

    return (
        <div className="min-h-screen bg-neutral-950 text-white overflow-hidden font-sans selection:bg-emerald-500/30">
            {gameState === 'login' && (
                <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-neutral-900 via-neutral-950 to-black">
                    <div className="w-full max-w-md p-8 bg-neutral-900/50 backdrop-blur-xl rounded-3xl border border-white/5 shadow-2xl">
                        <div className="text-center mb-8">
                            <div className="inline-flex p-4 bg-emerald-500/10 rounded-2xl mb-4">
                                <Target className="w-12 h-12 text-emerald-500" />
                            </div>
                            <h1 className="text-4xl font-black uppercase tracking-tighter mb-2">Tank Fight</h1>
                            <p className="text-neutral-500 text-sm uppercase tracking-widest">War-Torn City Combat</p>
                        </div>
                        
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-neutral-500 mb-2 ml-1">Username</label>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="ENTER CALLSIGN..."
                                    className="w-full bg-black/50 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder:text-neutral-700 focus:outline-none focus:border-emerald-500/50 transition-all font-mono"
                                    maxLength={15}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isLoggingIn || !username.trim()}
                                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:hover:bg-emerald-600 text-white font-bold py-4 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-emerald-900/20"
                            >
                                {isLoggingIn ? 'CONNECTING...' : 'INITIALIZE SYSTEM'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {gameState === 'menu' && (
                <div className="h-screen overflow-y-auto bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-neutral-900 via-neutral-950 to-black p-8">
                    <div className="max-w-6xl mx-auto">
                        <div className="flex justify-between items-end mb-12 border-b border-white/5 pb-8">
                            <div>
                                <h1 className="text-5xl font-black uppercase tracking-tighter mb-2">Command Center</h1>
                                <p className="text-neutral-500 uppercase tracking-widest text-sm">Welcome back, <span className="text-emerald-500">{username}</span></p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-bold uppercase tracking-widest text-neutral-500 mb-1">Total War Credits</p>
                                <p className="text-4xl font-mono font-bold text-yellow-500">{(totalCoins || 0).toLocaleString()}</p>
                            </div>
                        </div>

                        {chestMessage && (
                            <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-8 py-4 rounded-2xl font-bold shadow-2xl animate-bounce">
                                {chestMessage}
                            </div>
                        )}

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                            <div className="lg:col-span-2 space-y-8">
                                <section>
                                    <h3 className="text-xl font-bold text-white uppercase tracking-wider mb-6 flex items-center gap-3">
                                        <ShieldAlert className="w-5 h-5 text-emerald-500" />
                                        Select Vehicle
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {tankStats.map(t => (
                                            <button
                                                key={t.id}
                                                onClick={() => setSelectedTank(t.id as any)}
                                                className={`p-6 rounded-2xl border transition-all text-left group ${
                                                    selectedTank === t.id 
                                                    ? 'bg-emerald-500/10 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.1)]' 
                                                    : 'bg-neutral-900/50 border-white/5 hover:border-white/20'
                                                }`}
                                            >
                                                <p className="text-xs font-bold uppercase tracking-widest text-neutral-500 mb-1 group-hover:text-neutral-400 transition-colors">{t.desc}</p>
                                                <h4 className="text-xl font-bold mb-4">{t.name}</h4>
                                                <ul className="text-[10px] uppercase tracking-wider space-y-1">
                                                    <li><span className="text-neutral-500">Armor:</span> {t.armor}</li>
                                                    <li><span className="text-neutral-500">Damage:</span> {t.dmg}</li>
                                                </ul>
                                            </button>
                                        ))}
                                    </div>
                                </section>

                                <section>
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="text-xl font-bold text-white uppercase tracking-wider flex items-center gap-3">
                                            <Target className="w-5 h-5 text-yellow-500" />
                                            Special Operations
                                        </h3>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={buyChest}
                                                className="bg-yellow-600 hover:bg-yellow-500 text-white text-[10px] font-bold py-2 px-4 rounded-full transition-all"
                                            >
                                                CHEST (5K)
                                            </button>
                                            <button 
                                                onClick={buySecretTank}
                                                className="bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold py-2 px-4 rounded-full transition-all"
                                            >
                                                SECRET (100K)
                                            </button>
                                            <button 
                                                onClick={buyOPChest}
                                                className="bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold py-2 px-4 rounded-full transition-all"
                                            >
                                                OP CHEST (1M)
                                            </button>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {brainrotStats.map(t => (
                                            <button
                                                key={t.id}
                                                disabled={!unlockedTanks.includes(t.id)}
                                                onClick={() => setSelectedTank(t.id as any)}
                                                className={`p-6 rounded-2xl border transition-all text-left relative overflow-hidden group ${
                                                    !unlockedTanks.includes(t.id) ? 'opacity-40 grayscale cursor-not-allowed' :
                                                    selectedTank === t.id 
                                                    ? 'bg-yellow-500/10 border-yellow-500 shadow-[0_0_20px_rgba(245,158,11,0.1)]' 
                                                    : 'bg-neutral-900/50 border-white/5 hover:border-white/20'
                                                }`}
                                            >
                                                {!unlockedTanks.includes(t.id) && (
                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] z-10">
                                                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] -rotate-12 border border-white/20 px-2 py-1">LOCKED</span>
                                                    </div>
                                                )}
                                                <p className="text-xs font-bold uppercase tracking-widest text-neutral-500 mb-1">{t.desc}</p>
                                                <h4 className="text-xl font-bold mb-4">{t.name}</h4>
                                                <ul className="text-[10px] uppercase tracking-wider space-y-1">
                                                    <li><span className="text-neutral-500">Armor:</span> {t.armor}</li>
                                                    <li><span className="text-neutral-500">Damage:</span> {t.dmg}</li>
                                                </ul>
                                            </button>
                                        ))}
                                    </div>
                                </section>

                                <section>
                                    <h3 className="text-xl font-bold text-white uppercase tracking-wider mb-6 flex items-center gap-3">
                                        <ShieldAlert className="w-5 h-5 text-red-500" />
                                        Classified Prototypes
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {opStats.map(t => (
                                            <button
                                                key={t.id}
                                                disabled={!unlockedTanks.includes(t.id)}
                                                onClick={() => setSelectedTank(t.id as any)}
                                                className={`p-6 rounded-2xl border transition-all text-left relative overflow-hidden group ${
                                                    !unlockedTanks.includes(t.id) ? 'opacity-40 grayscale cursor-not-allowed' :
                                                    selectedTank === t.id 
                                                    ? 'bg-red-500/10 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.1)]' 
                                                    : 'bg-neutral-900/50 border-white/5 hover:border-white/20'
                                                }`}
                                            >
                                                {!unlockedTanks.includes(t.id) && (
                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] z-10">
                                                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] -rotate-12 border border-white/20 px-2 py-1">LOCKED</span>
                                                    </div>
                                                )}
                                                <p className="text-xs font-bold uppercase tracking-widest text-neutral-500 mb-1">{t.desc}</p>
                                                <h4 className="text-xl font-bold mb-4">{t.name}</h4>
                                                <ul className="text-[10px] uppercase tracking-wider space-y-1">
                                                    <li><span className="text-neutral-500">Armor:</span> {t.armor}</li>
                                                    <li><span className="text-neutral-500">Damage:</span> {t.dmg}</li>
                                                </ul>
                                            </button>
                                        ))}
                                    </div>
                                </section>
                            </div>

                            <div className="space-y-8">
                                {/* Stats Panel */}
                                <section className="bg-neutral-900/50 rounded-3xl border border-white/5 p-8 sticky top-8">
                                    <h3 className="text-xl font-black uppercase tracking-tighter mb-6 flex items-center gap-3">
                                        <Crosshair className="w-5 h-5 text-emerald-500" />
                                        Vehicle Specs
                                    </h3>
                                    
                                    {currentTankStats && (
                                        <div className="space-y-6">
                                            <div>
                                                <p className="text-xs font-bold uppercase tracking-widest text-neutral-500 mb-1">Selected Model</p>
                                                <p className="text-2xl font-bold text-white">{currentTankStats.name}</p>
                                                <p className="text-sm text-emerald-500 font-mono mt-1">{currentTankStats.desc}</p>
                                            </div>

                                            <div className="space-y-4 pt-4 border-t border-white/5">
                                                <div>
                                                    <div className="flex justify-between text-xs font-bold uppercase tracking-widest mb-2">
                                                        <span className="text-neutral-400">Hull Integrity (HP)</span>
                                                        <span className="text-white">{currentTankStats.hp}</span>
                                                    </div>
                                                    <div className="h-2 bg-neutral-950 rounded-full overflow-hidden">
                                                        <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, (currentTankStats.hp / 2000) * 100)}%` }} />
                                                    </div>
                                                </div>

                                                <div>
                                                    <div className="flex justify-between text-xs font-bold uppercase tracking-widest mb-2">
                                                        <span className="text-neutral-400">Top Speed</span>
                                                        <span className="text-white">{currentTankStats.speed}</span>
                                                    </div>
                                                    <div className="h-2 bg-neutral-950 rounded-full overflow-hidden">
                                                        <div className="h-full bg-blue-500" style={{ width: `${Math.min(100, (currentTankStats.speed / 600) * 100)}%` }} />
                                                    </div>
                                                </div>

                                                <div>
                                                    <div className="flex justify-between text-xs font-bold uppercase tracking-widest mb-2">
                                                        <span className="text-neutral-400">Firepower (DMG)</span>
                                                        <span className="text-white">{currentTankStats.dmg}</span>
                                                    </div>
                                                    <div className="h-2 bg-neutral-950 rounded-full overflow-hidden">
                                                        <div className="h-full bg-red-500" style={{ width: `${Math.min(100, (currentTankStats.dmg / 180) * 100)}%` }} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </section>

                                <section className="bg-neutral-900/50 rounded-3xl border border-white/5 p-8">
                                    <h3 className="text-xl font-bold text-white uppercase tracking-wider mb-6">Leaderboard</h3>
                                    <div className="space-y-4">
                                        {leaderboard.map((entry, index) => (
                                            <div key={entry.username} className="flex items-center justify-between p-4 bg-black/30 rounded-2xl border border-white/5">
                                                <div className="flex items-center gap-4">
                                                    <span className="text-xs font-mono text-neutral-500">0{index + 1}</span>
                                                    <span className="font-bold">{entry.username}</span>
                                                </div>
                                                <span className="font-mono text-yellow-500 font-bold">{(entry.score || 0).toLocaleString()}</span>
                                            </div>
                                        ))}
                                        {leaderboard.length === 0 && <p className="text-neutral-500 text-center py-8 text-xs uppercase tracking-widest">No data available</p>}
                                    </div>
                                </section>

                                <section className="bg-neutral-900/50 rounded-3xl border border-white/5 p-8">
                                    <h3 className="text-xl font-bold text-white uppercase tracking-wider mb-6">Difficulty</h3>
                                    <div className="grid grid-cols-3 gap-2">
                                        {(['easy', 'normal', 'hard'] as const).map(d => (
                                            <button
                                                key={d}
                                                onClick={() => setDifficulty(d)}
                                                className={`py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                                                    difficulty === d ? 'bg-white text-black' : 'bg-black/50 text-neutral-500 hover:text-neutral-300'
                                                }`}
                                            >
                                                {d}
                                            </button>
                                        ))}
                                    </div>
                                </section>

                                <button
                                    onClick={() => setGameState('playing')}
                                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xl py-6 rounded-3xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-2xl shadow-emerald-900/20 uppercase tracking-tighter"
                                >
                                    Deploy to Battle
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {gameState === 'playing' && (
                <div 
                    className="relative w-full h-screen bg-black cursor-none"
                    onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
                >
                    <canvas ref={canvasRef} width={window.innerWidth} height={window.innerHeight} className="block" />
                    
                    {/* HUD */}
                    <div className="absolute top-8 left-8 right-8 flex justify-between items-start pointer-events-none">
                        <div className="space-y-4">
                            <div className="bg-black/40 backdrop-blur-md border border-white/10 p-4 rounded-2xl w-64">
                                <div className="flex justify-between items-end mb-2">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Armor Integrity</span>
                                    <span className="text-xl font-mono font-bold text-emerald-500">{Math.ceil(uiState.health)}</span>
                                </div>
                                <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-emerald-500 transition-all duration-300" 
                                        style={{ width: `${(uiState.health / uiState.maxHealth) * 100}%` }}
                                    />
                                </div>
                            </div>
                            
                            <div className="bg-black/40 backdrop-blur-md border border-white/10 p-4 rounded-2xl w-64">
                                <div className="flex justify-between items-end mb-2">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Weapon System</span>
                                    <span className="text-xl font-mono font-bold text-yellow-500">{uiState.ammo}/{uiState.maxAmmo}</span>
                                </div>
                                <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-yellow-500 transition-all duration-300" 
                                        style={{ width: `${(uiState.ammo / uiState.maxAmmo) * 100}%` }}
                                    />
                                </div>
                            </div>
                            
                            {/* Airstrike Cooldown UI */}
                            {uiState.airstrikeCooldown > 0 && (
                                <div className="bg-black/40 backdrop-blur-md border border-white/10 p-4 rounded-2xl w-64">
                                    <div className="flex justify-between items-end mb-2">
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Airstrike (F)</span>
                                        <span className="text-xl font-mono font-bold text-red-500">{Math.ceil(uiState.airstrikeCooldown)}s</span>
                                    </div>
                                    <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-red-500 transition-all duration-300" 
                                            style={{ width: `${(uiState.airstrikeCooldown / 30) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            )}
                            {uiState.airstrikeCooldown <= 0 && (
                                <div className="bg-black/40 backdrop-blur-md border border-emerald-500/30 p-4 rounded-2xl w-64">
                                    <div className="flex justify-between items-end">
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">Airstrike (F)</span>
                                        <span className="text-xl font-mono font-bold text-emerald-500">READY</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="text-right">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-1">Combat Score</p>
                            <p className="text-5xl font-black font-mono text-white tracking-tighter">{(uiState.score || 0).toLocaleString()}</p>
                        </div>
                    </div>

                    {/* Custom Crosshair */}
                    <div 
                        className="fixed pointer-events-none z-50 mix-blend-difference"
                        style={{ left: mousePos.x, top: mousePos.y, transform: 'translate(-50%, -50%)' }}
                    >
                        <Crosshair className="w-8 h-8 text-white opacity-80" />
                    </div>
                </div>
            )}

            {gameState === 'gameover' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-md z-50">
                    <div className="text-center max-w-md p-12 bg-neutral-900/50 rounded-[3rem] border border-white/5">
                        <h2 className="text-6xl font-black uppercase tracking-tighter text-red-500 mb-4">Vehicle Destroyed</h2>
                        <p className="text-neutral-400 uppercase tracking-widest text-sm mb-8">Combat operation terminated</p>
                        <div className="bg-black/50 p-6 rounded-2xl mb-8 border border-white/5">
                            <p className="text-xs font-bold uppercase tracking-widest text-neutral-500 mb-1">Final Score</p>
                            <p className="text-4xl font-mono font-bold text-emerald-400">{(uiState.score || 0).toLocaleString()}</p>
                        </div>
                        <div className="flex flex-col gap-4">
                            <button
                                onClick={() => setGameState('playing')}
                                className="bg-white text-black font-bold py-4 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                REDEPLOY
                            </button>
                            <button
                                onClick={() => {
                                    setTotalCoins(prev => prev + uiState.score);
                                    setGameState('menu');
                                }}
                                className="bg-neutral-800 hover:bg-neutral-700 text-white font-bold py-4 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                RETURN TO BASE
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {gameState === 'playing' && uiState.isPaused && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-md z-50">
                    <div className="text-center">
                        <h2 className="text-8xl font-black uppercase tracking-tighter text-white mb-12">PAUSED</h2>
                        <div className="flex flex-col gap-4 items-center">
                            <button
                                onClick={() => {
                                    if (engineRef.current) {
                                        engineRef.current.isPaused = false;
                                        engineRef.current.forceUIUpdate();
                                    }
                                }}
                                className="w-64 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                RESUME
                            </button>
                            <button
                                onClick={() => {
                                    setTotalCoins(prev => prev + uiState.score);
                                    setGameState('menu');
                                    if (engineRef.current) engineRef.current.stop();
                                }}
                                className="w-64 bg-neutral-800 hover:bg-neutral-700 text-white font-bold py-4 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                ABORT MISSION
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
