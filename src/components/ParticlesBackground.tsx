'use client';

import { useRef, useEffect, useCallback } from 'react';
import { useTheme } from './ThemeProvider';

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
    opacity: number;
}

export default function ParticlesBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const particlesRef = useRef<Particle[]>([]);
    const animFrameRef = useRef<number>(0);
    const mouseRef = useRef({ x: -1000, y: -1000 });
    const { theme } = useTheme();

    const initParticles = useCallback((width: number, height: number) => {
        const count = Math.min(Math.floor((width * height) / 12000), 120);
        const particles: Particle[] = [];
        for (let i = 0; i < count; i++) {
            particles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * 0.4,
                vy: (Math.random() - 0.5) * 0.4,
                radius: Math.random() * 1.8 + 0.8,
                opacity: Math.random() * 0.5 + 0.2,
            });
        }
        particlesRef.current = particles;
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            if (particlesRef.current.length === 0) {
                initParticles(canvas.width, canvas.height);
            }
        };

        resize();
        window.addEventListener('resize', resize);

        const handleMouse = (e: MouseEvent) => {
            mouseRef.current = { x: e.clientX, y: e.clientY };
        };
        window.addEventListener('mousemove', handleMouse);

        const isDark = theme === 'dark';
        const lineDistance = 150;

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const particles = particlesRef.current;
            const mouse = mouseRef.current;

            // Update positions
            for (const p of particles) {
                p.x += p.vx;
                p.y += p.vy;

                if (p.x < 0) { p.x = 0; p.vx *= -1; }
                if (p.x > canvas.width) { p.x = canvas.width; p.vx *= -1; }
                if (p.y < 0) { p.y = 0; p.vy *= -1; }
                if (p.y > canvas.height) { p.y = canvas.height; p.vy *= -1; }

                // Mouse repulsion
                const dx = p.x - mouse.x;
                const dy = p.y - mouse.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 120) {
                    const force = (120 - dist) / 120 * 0.02;
                    p.vx += dx / dist * force;
                    p.vy += dy / dist * force;
                }

                // Damping
                p.vx *= 0.999;
                p.vy *= 0.999;
            }

            // Draw lines between close particles
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < lineDistance) {
                        const alpha = (1 - dist / lineDistance) * 0.15;
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.strokeStyle = isDark
                            ? `rgba(255, 255, 255, ${alpha})`
                            : `rgba(0, 0, 0, ${alpha * 0.6})`;
                        ctx.lineWidth = 0.6;
                        ctx.stroke();
                    }
                }
            }

            // Draw lines from mouse to nearby particles
            for (const p of particles) {
                const dx = p.x - mouse.x;
                const dy = p.y - mouse.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 180) {
                    const alpha = (1 - dist / 180) * 0.2;
                    ctx.beginPath();
                    ctx.moveTo(mouse.x, mouse.y);
                    ctx.lineTo(p.x, p.y);
                    ctx.strokeStyle = isDark
                        ? `rgba(255, 255, 255, ${alpha})`
                        : `rgba(0, 0, 0, ${alpha * 0.5})`;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }

            // Draw particles
            for (const p of particles) {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fillStyle = isDark
                    ? `rgba(255, 255, 255, ${p.opacity})`
                    : `rgba(0, 0, 0, ${p.opacity * 0.5})`;
                ctx.fill();
            }

            animFrameRef.current = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            cancelAnimationFrame(animFrameRef.current);
            window.removeEventListener('resize', resize);
            window.removeEventListener('mousemove', handleMouse);
        };
    }, [theme, initParticles]);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                zIndex: 0,
                pointerEvents: 'none',
            }}
        />
    );
}
