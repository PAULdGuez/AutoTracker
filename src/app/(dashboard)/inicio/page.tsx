'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useTimer } from '@/context/TimerContext';

export default function InicioPage() {
    const fullText = 'Bienvenido Paul';
    const [displayedText, setDisplayedText] = useState('');
    const [showCursor, setShowCursor] = useState(true);
    const [isComplete, setIsComplete] = useState(false);

    const startTyping = useCallback(() => {
        setDisplayedText('');
        setIsComplete(false);
        setShowCursor(true);

        let index = 0;
        const interval = setInterval(() => {
            if (index < fullText.length) {
                setDisplayedText(fullText.slice(0, index + 1));
                index++;
            } else {
                clearInterval(interval);
                setIsComplete(true);
            }
        }, 100);

        return () => clearInterval(interval);
    }, [fullText]);

    useEffect(() => {
        const cleanup = startTyping();
        return cleanup;
    }, [startTyping]);

    const now = new Date();
    const dateStr = now.toLocaleDateString('es-MX', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
    const timeStr = now.toLocaleTimeString('es-MX', {
        hour: '2-digit',
        minute: '2-digit',
    });

    return (
        <div className="welcome-container">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8 }}
            >
                <h1 className="welcome-text">
                    {displayedText}
                    {showCursor && <span className="welcome-cursor" />}
                </h1>

                <motion.p
                    className="welcome-subtitle"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: isComplete ? 1 : 0, y: isComplete ? 0 : 10 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                >
                    Listo para registrar tu progreso de hoy
                </motion.p>

                <motion.p
                    className="welcome-date"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isComplete ? 1 : 0 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                >
                    {dateStr} · {timeStr}
                </motion.p>

                <ChronometerToggle isVisible={isComplete} />
            </motion.div>
        </div>
    );
}

function ChronometerToggle({ isVisible }: { isVisible: boolean }) {
    const { isActive, toggleTimer, elapsedSeconds } = useTimer();

    const formatTime = (totalSeconds: number) => {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            style={{ marginTop: 32 }}
        >
            <div
                onClick={toggleTimer}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    cursor: 'pointer',
                    background: isActive ? 'rgba(34, 197, 94, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                    padding: '12px 24px',
                    borderRadius: '50px',
                    border: isActive ? '1px solid #22c55e' : '1px solid rgba(255, 255, 255, 0.08)',
                    transition: 'all 0.3s ease',
                    width: 'fit-content',
                    margin: '0 auto',
                }}
            >
                <div
                    style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        border: isActive ? '2px solid #22c55e' : '2px solid rgba(255, 255, 255, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: isActive ? '0 0 10px #22c55e, 0 0 20px rgba(34, 197, 94, 0.4)' : 'none',
                        transition: 'all 0.3s ease',
                    }}
                >
                    <div
                        style={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            backgroundColor: isActive ? '#22c55e' : 'transparent',
                            transition: 'all 0.3s ease',
                        }}
                    />
                </div>
                <span
                    style={{
                        fontSize: '1rem',
                        fontWeight: 500,
                        color: isActive ? '#22c55e' : 'var(--text-secondary)',
                        textShadow: isActive ? '0 0 10px rgba(34, 197, 94, 0.5)' : 'none',
                        transition: 'all 0.3s ease',
                        fontFamily: isActive ? 'var(--font-mono)' : 'inherit',
                    }}
                >
                    {isActive ? formatTime(elapsedSeconds) : 'Modo Cronómetro'}
                </span>
            </div>
        </motion.div>
    );
}
