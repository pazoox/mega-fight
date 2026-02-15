'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

interface DatePickerProps {
    value: string;
    onChange: (date: string) => void;
    label?: string;
    className?: string;
    error?: boolean;
}

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

export function DatePicker({ value, onChange, label, className = '', error = false }: DatePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const containerRef = useRef<HTMLDivElement>(null);

    // Initialize current month from value if present
    useEffect(() => {
        if (value) {
            // Parse local date (YYYY-MM-DD)
            const [y, m, d] = value.split('-').map(Number);
            const date = new Date(y, m - 1, d);
            if (!isNaN(date.getTime())) {
                setCurrentMonth(date);
            }
        }
    }, []); // Only on mount/initial value check

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getDaysInMonth = (year: number, month: number) => {
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (year: number, month: number) => {
        return new Date(year, month, 1).getDay();
    };

    const handlePrevMonth = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
    };

    const handleNextMonth = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
    };

    const handleDateClick = (day: number) => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        // Format as YYYY-MM-DD
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        onChange(dateStr);
        setIsOpen(false);
    };

    const isSelected = (day: number) => {
        if (!value) return false;
        // Parse local date (YYYY-MM-DD)
        const [y, m, d] = value.split('-').map(Number);
        const date = new Date(y, m - 1, d);
        return (
            date.getDate() === day &&
            date.getMonth() === currentMonth.getMonth() &&
            date.getFullYear() === currentMonth.getFullYear()
        );
    };

    const isToday = (day: number) => {
        const today = new Date();
        return (
            day === today.getDate() &&
            currentMonth.getMonth() === today.getMonth() &&
            currentMonth.getFullYear() === today.getFullYear()
        );
    };

    const renderCalendar = () => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const daysInMonth = getDaysInMonth(year, month);
        const firstDay = getFirstDayOfMonth(year, month);
        const days = [];

        // Empty slots for previous month
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className="h-8 w-8" />);
        }

        // Days
        for (let day = 1; day <= daysInMonth; day++) {
            const selected = isSelected(day);
            const today = isToday(day);

            days.push(
                <button
                    key={day}
                    onClick={(e) => {
                        e.stopPropagation();
                        handleDateClick(day);
                    }}
                    className={`
                        h-8 w-8 rounded-lg text-xs font-bold transition-all flex items-center justify-center
                        ${selected 
                            ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-900/20 scale-110 z-10' 
                            : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                        }
                        ${today && !selected ? 'border border-yellow-500/50 text-yellow-500' : ''}
                    `}
                >
                    {day}
                </button>
            );
        }

        return days;
    };

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            {label && <label className="block text-sm font-bold text-zinc-400 mb-2">{label}</label>}
            
            {/* Trigger Input */}
            <div 
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    w-full bg-zinc-950 border rounded-xl p-4 flex items-center justify-between cursor-pointer transition-colors group
                    ${error ? 'border-red-500' : 'border-zinc-800 hover:border-zinc-700'}
                    ${isOpen ? 'border-yellow-500 ring-1 ring-yellow-500/20' : ''}
                `}
            >
                <span className={`font-bold ${value ? 'text-white' : 'text-zinc-600'}`}>
                    {value ? (() => {
                        const [y, m, d] = value.split('-').map(Number);
                        return new Date(y, m - 1, d).toLocaleDateString(undefined, { 
                            weekday: 'short', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                        });
                    })() : 'Select date...'}
                </span>
                <CalendarIcon 
                    size={18} 
                    className={`transition-colors ${isOpen || value ? 'text-yellow-500' : 'text-zinc-600 group-hover:text-zinc-400'}`} 
                />
            </div>

            {/* Dropdown Calendar */}
            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-full min-w-[300px] bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95 duration-200">
                    
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                        <button 
                            onClick={handlePrevMonth}
                            className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <span className="font-bold text-white">
                            {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                        </span>
                        <button 
                            onClick={handleNextMonth}
                            className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>

                    {/* Days Grid */}
                    <div className="grid grid-cols-7 gap-1 mb-2">
                        {DAYS.map(d => (
                            <div key={d} className="h-8 flex items-center justify-center text-[10px] font-bold text-zinc-600 uppercase">
                                {d}
                            </div>
                        ))}
                    </div>

                    {/* Dates Grid */}
                    <div className="grid grid-cols-7 gap-1">
                        {renderCalendar()}
                    </div>

                    {/* Footer */}
                    <div className="mt-4 pt-3 border-t border-zinc-800 flex justify-end">
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                const today = new Date();
                                const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                                onChange(dateStr);
                                setCurrentMonth(today);
                                setIsOpen(false);
                            }}
                            className="text-xs font-bold text-yellow-500 hover:text-yellow-400 transition-colors"
                        >
                            Today
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
