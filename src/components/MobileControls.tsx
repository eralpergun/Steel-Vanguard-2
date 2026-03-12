import React, { useState, useRef, useEffect } from 'react';

interface Props {
    onInput: (movement: { x: number, y: number }, turret: { x: number, y: number }, shoot: boolean) => void;
}

export const MobileControls: React.FC<Props> = ({ onInput }) => {
    const [movement, setMovement] = useState({ x: 0, y: 0 });
    const [turret, setTurret] = useState({ x: 0, y: 0 });
    const [shoot, setShoot] = useState(false);

    const handleTouch = (e: React.TouchEvent, type: 'movement' | 'turret') => {
        const touch = e.touches[0];
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        let x = (touch.clientX - centerX) / (rect.width / 2);
        let y = (touch.clientY - centerY) / (rect.height / 2);
        
        const mag = Math.sqrt(x * x + y * y);
        if (mag > 1) {
            x /= mag;
            y /= mag;
        }

        if (type === 'movement') setMovement({ x, y: -y }); // y is inverted
        else setTurret({ x, y: -y });
    };

    const handleTouchEnd = (type: 'movement' | 'turret') => {
        if (type === 'movement') setMovement({ x: 0, y: 0 });
        else setTurret({ x: 0, y: 0 });
    };

    useEffect(() => {
        onInput(movement, turret, shoot);
    }, [movement, turret, shoot, onInput]);

    return (
        <div className="absolute inset-0 pointer-events-none p-6 flex justify-between items-end">
            {/* Turret Joystick (Left) */}
            <div 
                className="w-32 h-32 rounded-full bg-white/20 border-2 border-white/50 pointer-events-auto flex items-center justify-center"
                onTouchMove={(e) => handleTouch(e, 'turret')}
                onTouchEnd={() => handleTouchEnd('turret')}
            >
                <div className="w-12 h-12 rounded-full bg-white/50" style={{ transform: `translate(${turret.x * 20}px, ${-turret.y * 20}px)` }} />
            </div>

            {/* Shoot Button */}
            <button 
                className="w-24 h-24 rounded-full bg-red-600/50 border-4 border-red-500 pointer-events-auto text-white font-bold"
                onTouchStart={() => setShoot(true)}
                onTouchEnd={() => setShoot(false)}
            >
                FIRE
            </button>

            {/* Movement Joystick (Right) */}
            <div 
                className="w-32 h-32 rounded-full bg-white/20 border-2 border-white/50 pointer-events-auto flex items-center justify-center"
                onTouchMove={(e) => handleTouch(e, 'movement')}
                onTouchEnd={() => handleTouchEnd('movement')}
            >
                <div className="w-12 h-12 rounded-full bg-white/50" style={{ transform: `translate(${movement.x * 20}px, ${-movement.y * 20}px)` }} />
            </div>
        </div>
    );
};
