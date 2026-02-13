'use client';

import { Tranquiluxe } from 'uvcanvas';

export default function ParticlesBackground() {
    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                zIndex: 0,
                pointerEvents: 'none',
                opacity: 0.35,
            }}
        >
            <Tranquiluxe />
        </div>
    );
}
