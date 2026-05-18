import { Link } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import logo from '@/assets/cham-miles/logo.png';

export default function HeroHeader({ navLinks, headerVariants, headerItemVariants }) {
    return (
        <motion.header
            className="relative w-full  z-10 flex items-center justify-between px-6 md:px-0 lg:px-0 py-4"
            variants={headerVariants}
            initial="hidden"
            animate="visible"
        >
            <motion.div variants={headerItemVariants}>
                <Link to="/" className="flex items-center">
                    <img
                        src={logo}
                        alt="FlyCham"
                        className="h-8 md:h-10 w-auto"
                    />
                </Link>
            </motion.div>

            <nav className="hidden md:flex items-center gap-6 lg:gap-7">
                {navLinks.map((item) => (
                    <motion.a
                        key={item.label}
                        href={item.href}
                        variants={headerItemVariants}
                        className="flex items-center gap-1 text-white/95 text-[11px] lg:text-xs font-medium hover:opacity-80 transition-opacity"
                    >
                        {item.label}
                        {item.external && <ArrowUpRight size={11} strokeWidth={2} aria-hidden />}
                    </motion.a>
                ))}
            </nav>
        </motion.header>
    );
}
