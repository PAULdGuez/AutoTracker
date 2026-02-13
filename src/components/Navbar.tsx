'use client';

import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { motion } from 'framer-motion';
import Link from 'next/link';

const navLinks = [
    { href: '/inicio', label: 'Inicio' },
    { href: '/contar', label: 'Contar' },
    { href: '/analisis', label: 'Análisis' },
];

export default function Navbar() {
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClient();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
        router.refresh();
    };

    return (
        <motion.div
            className="navbar-wrapper"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
        >
            {/* Red indicator line with center bump */}
            <div className="navbar-indicator">
                <div className="navbar-indicator-bump" />
            </div>

            <nav className="navbar">
                <Link href="/inicio" className="navbar-brand">
                    <div className="navbar-brand-icon">⏱</div>
                    <span>TimeTracker</span>
                </Link>

                <div className="navbar-links">
                    {navLinks.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`navbar-link ${pathname === link.href || pathname.startsWith(link.href + '/') ? 'active' : ''}`}
                        >
                            {link.label}
                        </Link>
                    ))}
                </div>

                <div className="navbar-user">
                    <div className="navbar-avatar" title="Paul">P</div>
                    <button className="navbar-logout" onClick={handleLogout}>
                        Salir
                    </button>
                </div>
            </nav>
        </motion.div>
    );
}
