import React, { useEffect, useRef, useState } from 'react';
import { soundtrackEngine } from '../game/Audio';

interface Props {
    isMuted: boolean;
}

export const SoundtrackVisualizer: React.FC<Props> = ({ isMuted }) => {
    const [intensity, setIntensity] = useState(0);
    const barsRef = useRef<HTMLDivElement[]>([]);

    useEffect(() => {
        let active = true;
        const tick = () => {
            if (!active) return;
            const current = soundtrackEngine.currentIntensity;
            setIntensity(current);

            // Animate 6 EQ bars dynamically with natural random noise weighted by current intensity
            barsRef.current.forEach((bar, index) => {
                if (!bar) return;
                if (isMuted) {
                    bar.style.height = '3px';
                    return;
                }
                const noise = Math.random();
                const factor = 12 + intensity * 24;
                const h = Math.max(3, Math.min(28, (index % 2 === 0 ? 0.3 : 0.6) * factor + noise * factor));
                bar.style.height = `${h}px`;
            });

            requestAnimationFrame(tick);
        };

        requestAnimationFrame(tick);

        return () => {
            active = false;
        };
    }, [isMuted, intensity]);

    // Live state status text indicator mapping based on battle threat level
    let moodLabel = 'AMBIENT SILENCE';
    let moodColor = 'text-neutral-500 border-neutral-800/60 bg-neutral-950/20';

    if (isMuted) {
        moodLabel = 'SOUNDS MUTED';
        moodColor = 'text-neutral-600 border-neutral-900 bg-neutral-950/10';
    } else if (intensity > 0.78) {
        moodLabel = 'CLIMAX COMBAT';
        moodColor = 'text-red-400 border-red-950/40 bg-red-950/20';
    } else if (intensity > 0.44) {
        moodLabel = 'CONTACT ACTIVE';
        moodColor = 'text-yellow-400 border-yellow-950/40 bg-yellow-950/20';
    } else if (intensity > 0.12) {
        moodLabel = 'TACTICAL SEARCH';
        moodColor = 'text-emerald-500 border-emerald-950/40 bg-emerald-950/20';
    } else {
        moodLabel = 'PEACEFUL SECURE';
        moodColor = 'text-neutral-400 border-neutral-800/40 bg-neutral-950/10';
    }

    return (
        <div className="pointer-events-auto mt-2 flex flex-col items-end gap-1.5 p-2 rounded-xl border border-white/5 bg-black/40 backdrop-blur-md w-full sm:w-48 shadow-lg select-none">
            <div className="flex items-center justify-between w-full gap-4">
                <span className="text-[7.5px] font-black uppercase tracking-widest text-neutral-500">TACTICAL OST DRIVER</span>
                
                {/* Micro EQ Equalizer */}
                <div className="flex items-end gap-0.5 h-7 w-12 justify-end">
                    {[0, 1, 2, 3, 4, 5].map((idx) => {
                        let barBg = 'bg-neutral-600';
                        if (!isMuted) {
                            if (intensity > 0.7) {
                                barBg = idx > 3 ? 'bg-red-400' : idx > 1 ? 'bg-yellow-400' : 'bg-emerald-400';
                            } else if (intensity > 0.35) {
                                barBg = idx > 3 ? 'bg-yellow-400' : 'bg-emerald-400';
                            } else {
                                barBg = 'bg-emerald-500';
                            }
                        }

                        return (
                            <div
                                key={idx}
                                ref={(el) => {
                                    if (el) barsRef.current[idx] = el;
                                }}
                                className={`w-1 rounded-full transition-all duration-75 ${barBg}`}
                                style={{ height: '3px' }}
                            />
                        );
                    })}
                </div>
            </div>

            {/* EQ Mode and Threat levels */}
            <div className={`w-full py-0.5 px-1.5 rounded-md border text-[7px] font-black uppercase tracking-widest text-right leading-none transition-all ${moodColor}`}>
                {moodLabel}
            </div>
        </div>
    );
};
