import Navbar from '@/components/Navbar';
import ParticlesBackground from '@/components/ParticlesBackground';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            <ParticlesBackground />
            <Navbar />
            <main className="page-container" style={{ position: 'relative', zIndex: 1 }}>
                {children}
            </main>
        </>
    );
}
