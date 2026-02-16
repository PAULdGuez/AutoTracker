import Navbar from '@/components/Navbar';
import ParticlesBackground from '@/components/ParticlesBackground';

import { TimerProvider } from '@/context/TimerContext';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <TimerProvider>
            <ParticlesBackground />
            <Navbar />
            <main className="page-container" style={{ position: 'relative', zIndex: 1 }}>
                {children}
            </main>
        </TimerProvider>
    );
}
