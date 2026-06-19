import React, { useRef, useState } from 'react';

interface JoystickProps {
    onMove: (dx: number, dy: number) => void;
    onStop: () => void;
    baseColor?: string;
    stickColor?: string;
    label?: string;
    size?: number;
    subLabel?: string;
}

export const VirtualJoystick: React.FC<JoystickProps> = ({
    onMove,
    onStop,
    baseColor = 'rgba(255, 255, 255, 0.08)',
    stickColor = 'rgba(255, 255, 255, 0.3)',
    label = '',
    size = 120,
    subLabel = ''
}) => {
    const baseRef = useRef<HTMLDivElement>(null);
    const [stickPos, setStickPos] = useState({ x: 0, y: 0 });
    const [isActive, setIsActive] = useState(false);
    const pointerIdRef = useRef<number | null>(null);

    const radius = size / 2;
    const maxDistance = radius - 15; // boundary for visual stick

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        e.preventDefault();
        const baseEl = baseRef.current;
        if (!baseEl) return;

        // Capture pointer so movement is tracked even outside the joystick container
        baseEl.setPointerCapture(e.pointerId);
        pointerIdRef.current = e.pointerId;
        setIsActive(true);

        updatePosition(e);
    };

    const updatePosition = (e: React.PointerEvent<HTMLDivElement>) => {
        const baseEl = baseRef.current;
        if (!baseEl || pointerIdRef.current !== e.pointerId) return;

        const rect = baseEl.getBoundingClientRect();
        const centerX = rect.left + radius;
        const centerY = rect.top + radius;

        // Calculate delta
        let dx = e.clientX - centerX;
        let dy = e.clientY - centerY;

        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > maxDistance) {
            dx = (dx / distance) * maxDistance;
            dy = (dy / distance) * maxDistance;
        }

        setStickPos({ x: dx, y: dy });

        // Normalize delta to -1.0 ... 1.0 (inverted y for traditional cartesian coordinate standard, 
        // but let's look at how the other joystick mapped: e.x / 60, -e.y / 60. So x is direct, y is inverted!)
        const normalizedX = dx / maxDistance;
        const normalizedY = -dy / maxDistance;

        onMove(normalizedX, normalizedY);
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!isActive) return;
        e.preventDefault();
        updatePosition(e);
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        if (pointerIdRef.current !== e.pointerId) return;
        e.preventDefault();
        
        setIsActive(false);
        pointerIdRef.current = null;
        setStickPos({ x: 0, y: 0 });
        onStop();
    };

    return (
        <div 
            ref={baseRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="relative flex items-center justify-center rounded-full select-none cursor-grab active:cursor-grabbing touch-none transition-transform duration-100 ease-out"
            style={{
                width: size,
                height: size,
                background: baseColor,
                border: isActive ? '2px solid rgba(255, 255, 255, 0.25)' : '2px solid rgba(255, 255, 255, 0.1)',
                boxShadow: isActive ? '0 0 20px rgba(255, 255, 255, 0.15)' : 'none',
                transform: isActive ? 'scale(1.05)' : 'scale(1)',
                touchAction: 'none',
                backgroundColor: isActive ? 'rgba(0, 0, 0, 0.65)' : 'rgba(0, 0, 0, 0.4)',
                backdropFilter: 'blur(8px)',
            }}
        >
            {/* Guide Grid Cross */}
            <div className="absolute inset-0 rounded-full flex items-center justify-center pointer-events-none opacity-30">
                <div className="absolute w-[80%] h-[1px] bg-white/20" />
                <div className="absolute h-[80%] w-[1px] bg-white/20" />
                <div className="absolute inset-3 border border-white/5 rounded-full" />
            </div>

            {/* Stick Knob */}
            <div 
                className="absolute w-12 h-12 rounded-full flex items-center justify-center border transition-all duration-75 select-none pointer-events-none shadow-md"
                style={{
                    backgroundColor: isActive ? 'rgba(255, 255, 255, 0.5)' : stickColor,
                    borderColor: isActive ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.3)',
                    transform: `translate(${stickPos.x}px, ${stickPos.y}px)`,
                    boxShadow: isActive ? '0 0 15px rgba(255, 255, 255, 0.4)' : '0 4px 6px -1px rgba(0,0,0,0.3)',
                }}
            >
                <div className="w-2.5 h-2.5 rounded-full bg-white opacity-85" />
            </div>

            {/* Visual labels */}
            {label && !isActive && (
                <div className="absolute bottom-2 left-0 right-0 text-center pointer-events-none">
                    <span className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest block">{label}</span>
                    {subLabel && <span className="text-[6px] font-medium text-neutral-500 uppercase tracking-widest block leading-none">{subLabel}</span>}
                </div>
            )}
        </div>
    );
};
