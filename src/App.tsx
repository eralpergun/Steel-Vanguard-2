import React, { useEffect, useRef, useState } from 'react';
import { GameEngine } from './game/Engine';
import { Crosshair, ShieldAlert, Target, Info } from 'lucide-react';
import { db } from './firebase';
import { ref, get, set, child } from 'firebase/database';
import { MobileControls } from './components/MobileControls';

export default function App() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<GameEngine | null>(null);
    const [gameState, setGameState] = useState<'login' | 'menu' | 'playing' | 'gameover'>('login');
    const [username, setUsername] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [selectedTank, setSelectedTank] = useState<'light' | 'medium' | 'heavy' | '67' | 'brr' | 'tralalero' | 'tung' | 'cappucino' | 'lirili' | 'secret' | 'shitty'>('medium');
    const [difficulty, setDifficulty] = useState<'easy' | 'normal' | 'hard'>('normal');
    const [uiState, setUiState] = useState({ health: 100, maxHealth: 100, reloadProgress: 1, score: 0, isPaused: false, ammo: 0, maxAmmo: 0 });
    const [showControls, setShowControls] = useState(false);

    const [totalCoins, setTotalCoins] = useState(0);
    const [unlockedTanks, setUnlockedTanks] = useState<string[]>(['light', 'medium', 'heavy']);
    const [chestMessage, setChestMessage] = useState<string | null>(null);
    const [leaderboard, setLeaderboard] = useState<{ username: string, score: number }[]>([]);

    useEffect(() => {
        if (gameState === 'playing') {
            setShowControls(true);
            setTimeout(() => setShowControls(false), 5000);
        }
    }, [gameState]);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            const snapshot = await get(child(ref(db), 'leaderboard'));
            if (snapshot.exists()) {
                const data = snapshot.val();
                const sorted = Object.entries(data)
                    .map(([username, score]) => ({ username, score: score as number }))
                    .sort((a, b) => b.score - a.score)
                    .slice(0, 5);
                setLeaderboard(sorted);
            }
        };
        fetchLeaderboard();
    }, [gameState]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username.trim()) return;
        
        setIsLoggingIn(true);
        try {
            const dbRef = ref(db);
            
            const snapshot = await get(child(dbRef, `players/${username}`));
            if (snapshot.exists()) {
                const data = snapshot.val();
                setTotalCoins(data.totalCoins || 0);
                setUnlockedTanks(data.unlockedTanks || ['light', 'medium', 'heavy']);
            } else {
                // Initialize new user
                await set(ref(db, `players/${username}`), {
                    totalCoins: 0,
                    unlockedTanks: ['light', 'medium', 'heavy']
                });
                setTotalCoins(0);
                setUnlockedTanks(['light', 'medium', 'heavy']);
            }
            setGameState('menu');
        } catch (error) {
            console.error("Firebase login error:", error);
            alert("Failed to connect to database.");
        } finally {
            setIsLoggingIn(false);
        }
    };

    useEffect(() => {
        if (gameState !== 'login' && username) {
            set(ref(db, `players/${username}`), {
                totalCoins,
                unlockedTanks
            }).catch(console.error);
            
            set(ref(db, `leaderboard/${username}`), totalCoins).catch(console.error);
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
            '67': '67 Tankı',
            'brr': 'Brr Brr Patapim',
            'tralalero': 'Tralalero Tralala',
            'tung': 'Tung Tung Tung Sahur',
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
            '67': '67 Tankı',
            'brr': 'Brr Brr Patapim',
            'tralalero': 'Tralalero Tralala',
            'tung': 'Tung Tung Tung Sahur',
            'cappucino': 'Cappucino Assasino',
            'lirili': 'Lirili Larila',
            'secret': 'Gizli Tank',
            'shitty': 'Shitty Tank'
        };
        setChestMessage(`🎉 You got: ${names[tank]}! 🎉`);
        setTimeout(() => setChestMessage(null), 5000);
    };

    useEffect(() => {
        if (gameState === 'playing' && canvasRef.current) {
            const engine = new GameEngine(canvasRef.current, selectedTank, difficulty, (state) => {
                setUiState(state);
                if (state.health <= 0) {
                    setGameState('gameover');
                    setTotalCoins(prev => prev + state.score);
                    
                    engine.stop();
                }
            });
            engineRef.current = engine;
            engine.start();

            const handleResize = () => {
                if (canvasRef.current) {
                    canvasRef.current.width = window.innerWidth;
                    canvasRef.current.height = window.innerHeight;
                }
            };
            window.addEventListener('resize', handleResize);
            handleResize();

            return () => {
                engine.stop();
                window.removeEventListener('resize', handleResize);
            };
        }
    }, [gameState]);

    return (
        <div className="relative w-full h-screen bg-neutral-900 overflow-hidden font-sans text-white select-none">
            {gameState === 'playing' && (
                <>
                    <canvas ref={canvasRef} className="absolute inset-0 w-full h-full cursor-crosshair" />
                    <MobileControls onInput={(m, t, s) => engineRef.current?.setMobileInput(m, t, s)} />
                    {showControls && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-50 pointer-events-none">
                            <div className="bg-black/80 p-8 rounded-2xl border border-white/20 text-center">
                                <Info className="w-16 h-16 mx-auto text-emerald-400 mb-4" />
                                <h2 className="text-3xl font-bold text-white mb-4">Mobile Controls</h2>
                                <p className="text-neutral-300">Left Joystick: Aim Turret</p>
                                <p className="text-neutral-300">Right Joystick: Move Tank</p>
                                <p className="text-neutral-300">Red Button: Shoot</p>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* UI Overlay */}
            {gameState === 'playing' && (
                <div className="absolute inset-0 pointer-events-none p-6 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                        <div className="bg-black/50 p-4 rounded-xl backdrop-blur-sm border border-white/10">
                            <div className="text-sm text-neutral-400 uppercase tracking-wider mb-1">Score</div>
                            <div className="text-3xl font-mono font-bold text-emerald-400">{uiState.score}</div>
                        </div>
                        <div className="bg-black/50 p-4 rounded-xl backdrop-blur-sm border border-white/10 flex items-center gap-3">
                            <Target className="w-6 h-6 text-neutral-400" />
                            <div>
                                <div className="text-sm text-neutral-400 uppercase tracking-wider mb-1">Armor Status</div>
                                <div className="w-48 h-4 bg-neutral-800 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-200 ${uiState.health > 30 ? 'bg-emerald-500' : 'bg-red-500'}`}
                                        style={{ width: `${Math.max(0, (uiState.health / uiState.maxHealth) * 100)}%` }}
                                    />
                                </div>
                                <div className="text-xs text-right mt-1 text-neutral-300">{Math.ceil(uiState.health)} / {uiState.maxHealth}</div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-center mb-8 gap-6">
                        <div className="bg-black/50 p-4 rounded-xl backdrop-blur-sm border border-white/10 flex items-center gap-4">
                            <Crosshair className={`w-6 h-6 ${uiState.reloadProgress >= 1 ? 'text-emerald-400' : 'text-orange-400 animate-pulse'}`} />
                            <div>
                                <div className="text-sm text-neutral-400 uppercase tracking-wider mb-1">Main Gun</div>
                                <div className="w-64 h-3 bg-neutral-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-orange-500 transition-all duration-75"
                                        style={{ width: `${uiState.reloadProgress * 100}%` }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="bg-black/50 p-4 rounded-xl backdrop-blur-sm border border-white/10 flex items-center gap-4">
                            <div className="text-center">
                                <div className="text-sm text-neutral-400 uppercase tracking-wider mb-1">Ammo</div>
                                <div className={`text-3xl font-mono font-bold ${uiState.ammo > 0 ? 'text-amber-400' : 'text-red-500 animate-bounce'}`}>
                                    {uiState.ammo} <span className="text-sm text-neutral-500">/ {uiState.maxAmmo}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Login Screen */}
            {gameState === 'login' && (
                <div className="absolute inset-0 flex items-center justify-center bg-neutral-900 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-neutral-800 to-neutral-950">
                    <div className="text-center max-w-md p-8 bg-black/40 rounded-3xl border border-white/10 backdrop-blur-md shadow-2xl">
                        <ShieldAlert className="w-20 h-20 mx-auto text-emerald-500 mb-6" />
                        <h1 className="text-4xl font-black uppercase tracking-tighter mb-2 text-white drop-shadow-lg">Tank Fight</h1>
                        <p className="text-neutral-400 mb-8">Enter your username to load your progress.</p>
                        
                        <form onSubmit={handleLogin} className="flex flex-col gap-4">
                            <input 
                                type="text" 
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Username" 
                                className="px-4 py-3 rounded-xl bg-neutral-800 border border-neutral-700 text-white focus:outline-none focus:border-emerald-500 transition-colors text-center text-lg font-bold"
                                required
                                disabled={isLoggingIn}
                            />
                            <button 
                                type="submit"
                                disabled={isLoggingIn || !username.trim()}
                                className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-700 disabled:text-neutral-500 text-white font-bold text-lg py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(5,150,105,0.3)]"
                            >
                                {isLoggingIn ? 'CONNECTING...' : 'LOGIN'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Menus */}
            {gameState === 'menu' && (
                <div className="absolute inset-0 flex items-center justify-center bg-neutral-900 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-neutral-800 to-neutral-950 overflow-y-auto">
                    <div className="text-center max-w-4xl p-8 my-auto">
                        <ShieldAlert className="w-24 h-24 mx-auto text-emerald-500 mb-6" />
                        <h1 className="text-6xl font-black uppercase tracking-tighter mb-4 text-white drop-shadow-lg">Tank Fight</h1>
                        <p className="text-xl text-neutral-400 mb-4">Top-down armored warfare. Angle your hull to bounce shots, flank enemies for critical rear damage.</p>
                        
                        <div className="text-2xl font-mono font-bold text-yellow-400 mb-8 bg-black/40 inline-block px-6 py-2 rounded-full border border-yellow-500/30">
                            Total Points: {totalCoins}
                        </div>

                        <div className="mb-8">
                            <h3 className="text-xl font-bold text-white uppercase tracking-wider mb-4">Difficulty</h3>
                            <div className="flex justify-center gap-4">
                                {(['easy', 'normal', 'hard'] as const).map((d) => (
                                    <button
                                        key={d}
                                        onClick={() => setDifficulty(d)}
                                        className={`px-6 py-2 rounded-lg font-bold uppercase transition-all ${difficulty === d ? 'bg-emerald-600 text-white shadow-[0_0_15px_rgba(5,150,105,0.5)]' : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'}`}
                                    >
                                        {d}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-left bg-black/30 p-6 rounded-2xl mb-8 border border-white/5">
                            <div>
                                <h3 className="font-bold text-emerald-400 mb-2">Controls</h3>
                                <ul className="text-neutral-300 space-y-2 text-sm">
                                    <li><kbd className="bg-neutral-800 px-2 py-1 rounded">W</kbd> <kbd className="bg-neutral-800 px-2 py-1 rounded">S</kbd> Forward / Reverse</li>
                                    <li><kbd className="bg-neutral-800 px-2 py-1 rounded">A</kbd> <kbd className="bg-neutral-800 px-2 py-1 rounded">D</kbd> Rotate Hull</li>
                                    <li><kbd className="bg-neutral-800 px-2 py-1 rounded">Mouse</kbd> Aim Turret</li>
                                    <li><kbd className="bg-neutral-800 px-2 py-1 rounded">Click</kbd> Fire Main Gun</li>
                                    <li><kbd className="bg-neutral-800 px-2 py-1 rounded">ESC</kbd> Pause Game</li>
                                </ul>
                            </div>
                            <div>
                                <h3 className="font-bold text-orange-400 mb-2">Armor Mechanics</h3>
                                <ul className="text-neutral-300 space-y-2 text-sm">
                                    <li><span className="text-emerald-400 font-bold">Front:</span> Heavy Armor (Ricochet)</li>
                                    <li><span className="text-yellow-400 font-bold">Sides:</span> Medium Armor (Normal)</li>
                                    <li><span className="text-red-400 font-bold">Rear:</span> Weak Armor (Critical)</li>
                                </ul>
                            </div>
                        </div>

                        <div className="mb-8">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-bold text-white uppercase tracking-wider">Select Your Vehicle</h3>
                                <button 
                                    onClick={buyChest}
                                    className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-6 rounded-lg transition-all shadow-[0_0_15px_rgba(147,51,234,0.5)] flex items-center gap-2"
                                >
                                    <span>🎁 Buy Brainrot Chest (5000 pts)</span>
                                </button>
                                <button 
                                    onClick={buySecretTank}
                                    className="bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-2 px-6 rounded-lg transition-all shadow-[0_0_15px_rgba(202,138,4,0.5)] flex items-center gap-2"
                                >
                                    <span>🎁 Gizli Tank Satın Al (100,000 pts)</span>
                                </button>
                            </div>
                            
                            {chestMessage && (
                                <div className="mb-4 p-3 bg-purple-900/50 border border-purple-500 text-purple-200 rounded-lg font-bold animate-pulse">
                                    {chestMessage}
                                </div>
                            )}

                            <div className="grid grid-cols-3 gap-4">
                                {[
                                    { id: 'light', name: 'Light Tank', speed: 'Fast', armor: 'Light', dmg: 'Low', color: 'text-blue-400', border: 'border-blue-500', bg: 'bg-blue-500/20' },
                                    { id: 'medium', name: 'Medium Tank', speed: 'Normal', armor: 'Medium', dmg: 'Normal', color: 'text-emerald-400', border: 'border-emerald-500', bg: 'bg-emerald-500/20' },
                                    { id: 'heavy', name: 'Heavy Tank', speed: 'Slow', armor: 'Heavy', dmg: 'High', color: 'text-orange-400', border: 'border-orange-500', bg: 'bg-orange-500/20' },
                                    { id: '67', name: '67 Tankı', speed: 'Very Fast', armor: 'Medium', dmg: 'Very High', color: 'text-purple-400', border: 'border-purple-500', bg: 'bg-purple-500/20' },
                                    { id: 'brr', name: 'Brr Brr Patapim', speed: 'Fast', armor: 'Medium', dmg: 'Rapid Fire', color: 'text-pink-400', border: 'border-pink-500', bg: 'bg-pink-500/20' },
                                    { id: 'tralalero', name: 'Tralalero Tralala', speed: 'Very Slow', armor: 'Godlike', dmg: 'Devastating', color: 'text-fuchsia-400', border: 'border-fuchsia-500', bg: 'bg-fuchsia-500/20' },
                                    { id: 'tung', name: 'Tung Tung Tung Sahur', speed: 'Insane', armor: 'Light', dmg: 'Insane', color: 'text-yellow-400', border: 'border-yellow-500', bg: 'bg-yellow-500/20' },
                                    { id: 'cappucino', name: 'Cappucino Assasino', speed: 'Fast', armor: 'Medium', dmg: 'Critical', color: 'text-amber-600', border: 'border-amber-700', bg: 'bg-amber-700/20' },
                                    { id: 'lirili', name: 'Lirili Larila', speed: 'Very Fast', armor: 'Medium', dmg: 'High', color: 'text-cyan-400', border: 'border-cyan-500', bg: 'bg-cyan-500/20' },
                                    { id: 'secret', name: 'Gizli Tank', speed: 'Very Fast', armor: 'Godlike', dmg: 'Rapid Fire', color: 'text-yellow-400', border: 'border-yellow-500', bg: 'bg-yellow-500/20' },
                                    { id: 'shitty', name: 'Shitty Tank', speed: 'Slow', armor: 'Weak', dmg: 'Very Low', color: 'text-red-400', border: 'border-red-500', bg: 'bg-red-500/20' }
                                ].filter(t => unlockedTanks.includes(t.id)).map(t => (
                                    <div
                                        key={t.id}
                                        onClick={() => setSelectedTank(t.id as any)}
                                        className={`cursor-pointer p-4 rounded-xl border-2 transition-all text-left ${selectedTank === t.id ? `${t.border} ${t.bg}` : 'border-white/10 bg-black/40 hover:border-white/30'}`}
                                    >
                                        <h4 className={`font-bold text-lg uppercase mb-2 ${t.color}`}>{t.name}</h4>
                                        <ul className="text-sm text-neutral-300 space-y-1">
                                            <li><span className="text-neutral-500">Speed:</span> {t.speed}</li>
                                            <li><span className="text-neutral-500">Armor:</span> {t.armor}</li>
                                            <li><span className="text-neutral-500">Damage:</span> {t.dmg}</li>
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mb-8">
                            <h3 className="text-xl font-bold text-white uppercase tracking-wider mb-4">Leaderboard</h3>
                            <div className="bg-black/30 p-6 rounded-2xl border border-white/5">
                                <table className="w-full text-left text-neutral-300">
                                    <thead>
                                        <tr className="text-emerald-400">
                                            <th className="pb-2">Rank</th>
                                            <th className="pb-2">Username</th>
                                            <th className="pb-2 text-right">Score</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {leaderboard.map((entry, index) => (
                                            <tr key={entry.username} className="border-t border-white/5">
                                                <td className="py-2 font-mono">{index + 1}</td>
                                                <td className="py-2">{entry.username}</td>
                                                <td className="py-2 text-right font-mono text-yellow-400">{entry.score}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <button
                            onClick={() => setGameState('playing')}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xl py-4 px-12 rounded-full transition-all hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(5,150,105,0.3)] pointer-events-auto"
                        >
                            DEPLOY TO BATTLE
                        </button>
                    </div>
                </div>
            )}

            {gameState === 'gameover' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-50">
                    <div className="text-center">
                        <h2 className="text-6xl font-black uppercase tracking-tighter text-red-500 mb-4">Vehicle Destroyed</h2>
                        <p className="text-2xl text-neutral-300 mb-8">Final Score: <span className="text-emerald-400 font-mono font-bold">{uiState.score}</span></p>
                        <div className="flex flex-col gap-4 items-center">
                            <button
                                onClick={() => setGameState('playing')}
                                className="bg-white text-black font-bold text-xl py-4 px-12 rounded-full transition-all hover:scale-105 active:scale-95 pointer-events-auto w-64"
                            >
                                REDEPLOY
                            </button>
                            <button
                                onClick={() => setGameState('menu')}
                                className="bg-neutral-700 hover:bg-neutral-600 text-white font-bold text-lg py-3 px-8 rounded-full transition-all hover:scale-105 active:scale-95 pointer-events-auto w-64"
                            >
                                ANASAYFAYA DÖN
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {gameState === 'playing' && uiState.isPaused && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50">
                    <div className="text-center">
                        <h2 className="text-6xl font-black uppercase tracking-tighter text-white mb-8">PAUSED</h2>
                        <div className="flex flex-col gap-4 items-center">
                            <button
                                onClick={() => {
                                    if (engineRef.current) {
                                        engineRef.current.isPaused = false;
                                        engineRef.current.forceUIUpdate();
                                    }
                                }}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xl py-4 px-12 rounded-full transition-all hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(5,150,105,0.3)] pointer-events-auto w-64"
                            >
                                RESUME
                            </button>
                            <button
                                onClick={() => {
                                    setTotalCoins(prev => prev + uiState.score);
                                    setGameState('menu');
                                    if (engineRef.current) engineRef.current.stop();
                                }}
                                className="bg-neutral-700 hover:bg-neutral-600 text-white font-bold text-lg py-3 px-8 rounded-full transition-all hover:scale-105 active:scale-95 pointer-events-auto w-64"
                            >
                                ANASAYFAYA DÖN
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
