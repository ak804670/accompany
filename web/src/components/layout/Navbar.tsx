import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Sun, Moon, ArrowDownToLine } from 'lucide-react';
import { useTheme } from '@/components/theme-provider';
import { useModal } from '@/context/ModalContext';

export const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const { openDownloadModal } = useModal();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const navLinks = [
    { label: 'Home', href: '/' },
    { label: 'Companions', href: '/#companions' },
    { label: 'How It Works', href: '/#how-it-works' },
    { label: 'Stories & Blog', href: '/blogs' },
    { label: 'Contact', href: '/contact' },
  ];

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
          isScrolled
            ? 'bg-[#F7F4EF]/90 dark:bg-[#12110F]/90 backdrop-blur-md shadow-sm border-b border-[#E3DBD1]/80 dark:border-[#3A342E]/80 py-3.5'
            : 'bg-transparent py-5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            {/* Brand Logo & Wordmark */}
            <Link to="/" className="flex items-center gap-2.5 group focus:outline-none">
              <div className="relative">
                <img
                  src="/logo/icon.png"
                  alt="Accompany"
                  className="w-9 h-9 object-contain rounded-xl transition-transform duration-300 group-hover:scale-105"
                />
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-[#32B86B] rounded-full ring-2 ring-[#F7F4EF] dark:ring-[#12110F]" />
              </div>
              <div className="flex flex-col">
                <span className="font-serif text-2xl font-semibold tracking-tight text-[#1C1916] dark:text-[#F3EEE6] leading-none">
                  Accompany
                </span>
                <span className="text-[10px] text-[#5E574F] dark:text-[#B7AFA3] tracking-wider uppercase font-medium">
                  Emotional Support
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => {
                const isCurrent =
                  link.href === '/'
                    ? location.pathname === '/' && !location.hash
                    : link.href.startsWith('/#')
                    ? location.pathname === '/' && location.hash === link.href.replace('/', '')
                    : location.pathname.startsWith(link.href);

                return (
                  <Link
                    key={link.label}
                    to={link.href}
                    className={`text-sm font-medium transition-colors ${
                      isCurrent
                        ? 'text-[#C7377A] font-semibold'
                        : 'text-[#5E574F] dark:text-[#B7AFA3] hover:text-[#1C1916] dark:hover:text-[#F3EEE6]'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            {/* Right Action Buttons */}
            <div className="hidden md:flex items-center gap-3">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2.5 rounded-full border border-[#E3DBD1] dark:border-[#3A342E] text-[#5E574F] dark:text-[#B7AFA3] hover:text-[#1C1916] dark:hover:text-[#F3EEE6] hover:bg-[#FFFCF8] dark:hover:bg-[#1C1A17] transition-all cursor-pointer"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4 text-[#F2A82B]" /> : <Moon className="w-4 h-4" />}
              </button>

              {/* Download App CTA */}
              <button
                onClick={() => openDownloadModal('navbar')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#C7377A] hover:bg-[#A62965] text-white text-xs font-semibold shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer active:scale-95 group"
              >
                <ArrowDownToLine className="w-3.5 h-3.5 group-hover:translate-y-0.5 transition-transform" />
                <span>Download App</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#FDE4ED] animate-pulse" />
              </button>
            </div>

            {/* Mobile Hamburger Toggle */}
            <div className="flex md:hidden items-center gap-2">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-full border border-[#E3DBD1] dark:border-[#3A342E] text-[#5E574F] dark:text-[#B7AFA3]"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4 text-[#F2A82B]" /> : <Moon className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-xl border border-[#E3DBD1] dark:border-[#3A342E] text-[#1C1916] dark:text-[#F3EEE6] hover:bg-[#FFFCF8] dark:hover:bg-[#1C1A17]"
                aria-label="Open menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#FFFCF8] dark:bg-[#1C1A17] border-b border-[#E3DBD1] dark:border-[#3A342E] px-4 pt-3 pb-6 shadow-lg animate-in slide-in-from-top-3 duration-200">
            <div className="flex flex-col gap-3">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  to={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2 px-3 rounded-lg text-sm font-medium text-[#1C1916] dark:text-[#F3EEE6] hover:bg-[#F7F4EF] dark:hover:bg-[#25221E] transition-colors"
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-2 border-t border-[#E3DBD1]/70 dark:border-[#3A342E]/70 flex flex-col gap-2">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    openDownloadModal('mobile-nav');
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#C7377A] text-white font-semibold text-sm shadow-sm"
                >
                  <ArrowDownToLine className="w-4 h-4" />
                  <span>Download Accompany (Free)</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Spacer so fixed header doesn't overlap page top */}
      <div className="h-20" />
    </>
  );
};
