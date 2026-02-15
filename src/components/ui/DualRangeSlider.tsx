import React, { useState, useRef, useEffect, useCallback } from 'react';

interface DualRangeSliderProps {
    min: number;
    max: number;
    step?: number;
    value: [number, number];
    onChange: (value: [number, number]) => void;
    className?: string;
    formatLabel?: (value: number) => string;
}

export function DualRangeSlider({ 
    min, 
    max, 
    step = 1, 
    value, 
    onChange, 
    className,
    formatLabel = (v) => v.toString()
}: DualRangeSliderProps) {
    const [isDragging, setIsDragging] = useState<'min' | 'max' | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Ensure value is within bounds
    const safeMin = Math.max(min, Math.min(value[0], value[1]));
    const safeMax = Math.min(max, Math.max(value[0], value[1]));

    const getPercentage = useCallback((val: number) => {
        return ((val - min) / (max - min)) * 100;
    }, [min, max]);

    const handleMouseDown = (type: 'min' | 'max') => (e: React.MouseEvent | React.TouchEvent) => {
        setIsDragging(type);
        e.preventDefault();
    };

    const handleMove = useCallback((clientX: number) => {
        if (!isDragging || !containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const percentage = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
        const rawValue = min + (percentage / 100) * (max - min);
        
        // Snap to step
        const steppedValue = Math.round(rawValue / step) * step;

        if (isDragging === 'min') {
            const newValue = Math.min(steppedValue, safeMax - step);
            if (newValue >= min) onChange([newValue, safeMax]);
        } else {
            const newValue = Math.max(steppedValue, safeMin + step);
            if (newValue <= max) onChange([safeMin, newValue]);
        }
    }, [isDragging, min, max, step, safeMin, safeMax, onChange]);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => handleMove(e.clientX);
        const handleTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientX);
        const handleUp = () => setIsDragging(null);

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('touchmove', handleTouchMove);
            window.addEventListener('mouseup', handleUp);
            window.addEventListener('touchend', handleUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('mouseup', handleUp);
            window.removeEventListener('touchend', handleUp);
        };
    }, [isDragging, handleMove]);

    const minPercent = getPercentage(safeMin);
    const maxPercent = getPercentage(safeMax);

    return (
        <div className={`w-full select-none pt-6 pb-2 ${className}`}>
            <div ref={containerRef} className="relative h-2 bg-zinc-800 rounded-full">
                {/* Track */}
                <div 
                    className="absolute h-full bg-yellow-500 rounded-full"
                    style={{ left: `${minPercent}%`, width: `${maxPercent - minPercent}%` }}
                />

                {/* Min Thumb */}
                <div 
                    className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-zinc-900 border-2 border-yellow-500 rounded-full cursor-grab active:cursor-grabbing shadow-lg z-10 hover:scale-110 transition-transform flex items-center justify-center"
                    style={{ left: `${minPercent}%` }}
                    onMouseDown={handleMouseDown('min')}
                    onTouchStart={handleMouseDown('min')}
                >
                    <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full" />
                    
                    {/* Floating Label */}
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-zinc-800 text-white text-xs px-2 py-1 rounded border border-zinc-700 whitespace-nowrap">
                        {formatLabel(safeMin)}
                    </div>
                </div>

                {/* Max Thumb */}
                <div 
                    className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-zinc-900 border-2 border-yellow-500 rounded-full cursor-grab active:cursor-grabbing shadow-lg z-10 hover:scale-110 transition-transform flex items-center justify-center"
                    style={{ left: `${maxPercent}%` }}
                    onMouseDown={handleMouseDown('max')}
                    onTouchStart={handleMouseDown('max')}
                >
                    <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full" />
                    
                    {/* Floating Label */}
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-zinc-800 text-white text-xs px-2 py-1 rounded border border-zinc-700 whitespace-nowrap">
                        {formatLabel(safeMax)}
                    </div>
                </div>
            </div>
        </div>
    );
}
