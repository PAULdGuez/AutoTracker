'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

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
            </motion.div>
        </div>
    );
}
