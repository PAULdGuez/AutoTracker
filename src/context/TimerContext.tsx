'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface TimerContextType {
    isActive: boolean;
    startTime: number | null;
    toggleTimer: () => void;
    resetTimer: () => void;
    restartTimer: () => void;
    elapsedSeconds: number;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

export function TimerProvider({ children }: { children: React.ReactNode }) {
    const [isActive, setIsActive] = useState(false);
    const [startTime, setStartTime] = useState<number | null>(null);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);

    // Load state from local storage on mount
    useEffect(() => {
        const storedIsActive = localStorage.getItem('timerIsActive') === 'true';
        const storedStartTime = localStorage.getItem('timerStartTime');

        if (storedIsActive && storedStartTime) {
            setIsActive(true);
            setStartTime(parseInt(storedStartTime, 10));
        }
    }, []);

    // Update elapsed time
    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (isActive && startTime) {
            // Update immediately
            setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));

            interval = setInterval(() => {
                setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
            }, 1000);
        } else {
            setElapsedSeconds(0);
        }

        return () => clearInterval(interval);
    }, [isActive, startTime]);

    const toggleTimer = useCallback(() => {
        if (isActive) {
            // Stop timer
            setIsActive(false);
            setStartTime(null);
            localStorage.removeItem('timerIsActive');
            localStorage.removeItem('timerStartTime');
        } else {
            // Start timer
            const now = Date.now();
            setIsActive(true);
            setStartTime(now);
            localStorage.setItem('timerIsActive', 'true');
            localStorage.setItem('timerStartTime', now.toString());
        }
    }, [isActive]);

    const resetTimer = useCallback(() => {
        setIsActive(false);
        setStartTime(null);
        setElapsedSeconds(0);
        localStorage.removeItem('timerIsActive');
        localStorage.removeItem('timerStartTime');
    }, []);

    const restartTimer = useCallback(() => {
        const now = Date.now();
        setIsActive(true);
        setStartTime(now);
        setElapsedSeconds(0);
        localStorage.setItem('timerIsActive', 'true');
        localStorage.setItem('timerStartTime', now.toString());
    }, []);

    return (
        <TimerContext.Provider value={{ isActive, startTime, toggleTimer, resetTimer, restartTimer, elapsedSeconds }}>
            {children}
        </TimerContext.Provider>
    );
}

export function useTimer() {
    const context = useContext(TimerContext);
    if (context === undefined) {
        throw new Error('useTimer must be used within a TimerProvider');
    }
    return context;
}
