import Navbar from '@/components/Navbar';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            <Navbar />
            <main className="page-container">
                {children}
            </main>
        </>
    );
}
