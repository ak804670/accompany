import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Heart, Sparkles, QrCode, Download, ArrowUpRight } from 'lucide-react';
import { GooglePlayButton } from '@/components/common/GooglePlayButton';
import { useModal } from '@/context/ModalContext';

export const Footer: React.FC = () => {
  const { openDownloadModal } = useModal();

  return (
    <footer className="relative bg-[#FFFCF8] dark:bg-[#161412] text-[#1C1916] dark:text-[#F3EEE6] border-t border-[#E3DBD1] dark:border-[#3A342E] pt-16 pb-12 overflow-hidden">
      {/* Background Accent Gradients */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#C7377A]/5 dark:bg-[#C7377A]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-10 w-80 h-80 bg-[#F06091]/5 dark:bg-[#F06091]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* App Download Highlight Banner in Footer */}
        <div className="relative mb-16 rounded-3xl bg-gradient-to-br from-[#FDE4ED]/70 via-[#FFFCF8] to-[#F7F4EF] dark:from-[#26131E] dark:via-[#1C1A17] dark:to-[#12110F] border border-[#C7377A]/25 p-8 md:p-12 shadow-sm overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#C7377A]/10 text-[#C7377A] text-xs font-semibold mb-4">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Available on Android</span>
              </div>
              <h3 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-semibold tracking-tight text-[#1C1916] dark:text-[#F3EEE6] mb-3">
                Someone is always ready to listen. Download Accompany.
              </h3>
              <p className="text-sm sm:text-base text-[#5E574F] dark:text-[#B7AFA3] leading-relaxed max-w-xl mb-6">
                Connect in 30 seconds over 100% private audio, video, or chat. Real listeners, genuine empathy, zero judgment.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-4">
                <GooglePlayButton
                  size="lg"
                  onClick={() => openDownloadModal('footer-banner')}
                />
                <a
                  href="/downloads/accompany-latest.apk"
                  download
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl border border-[#E3DBD1] dark:border-[#3A342E] text-xs sm:text-sm font-semibold hover:bg-[#F7F4EF] dark:hover:bg-[#25221E] transition-all bg-white/60 dark:bg-black/30 shadow-xs"
                >
                  <Download className="w-4 h-4 text-[#C7377A]" />
                  <span>Download Direct APK</span>
                </a>
              </div>
            </div>

            {/* QR Code and App Details */}
            <div className="lg:col-span-5 flex flex-col sm:flex-row items-center justify-end gap-5">
              <div className="p-4 rounded-2xl bg-white dark:bg-[#1C1A17] border border-[#E3DBD1] dark:border-[#3A342E] shadow-sm flex items-center gap-4 w-full sm:w-auto">
                <div className="w-20 h-20 bg-white p-1 rounded-xl border border-gray-200 flex items-center justify-center shrink-0">
                  <QrCode className="w-18 h-18 text-[#1C1916]" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#1C1916] dark:text-[#F3EEE6] mb-1">
                    Scan with Phone
                  </div>
                  <div className="text-[11px] text-[#5E574F] dark:text-[#B7AFA3] leading-tight">
                    Instant Play Store install on your Android device
                  </div>
                  <div className="mt-2 text-[11px] font-semibold text-[#29995C] flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Safe & Verified</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Links Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-[#E3DBD1] dark:border-[#3A342E]">
          {/* Brand info */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-2.5 mb-4 group">
              <img
                src="/logo/icon.png"
                alt="Accompany"
                className="w-8 h-8 rounded-xl object-contain"
              />
              <span className="font-serif text-2xl font-bold tracking-tight text-[#1C1916] dark:text-[#F3EEE6]">
                Accompany
              </span>
            </Link>
            <p className="text-sm text-[#5E574F] dark:text-[#B7AFA3] leading-relaxed max-w-sm mb-6">
              India's premier companionship and emotional support network. Safe, anonymous, and judgment-free conversations with empathetic companions 24 hours a day, 7 days a week.
            </p>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#C7377A]">
              <Heart className="w-4 h-4 fill-current text-[#C7377A]" />
              <span>Built with empathy for anyone who needs to be heard.</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#1C1916] dark:text-[#F3EEE6] mb-4">
              Platform
            </h4>
            <ul className="space-y-2.5 text-sm text-[#5E574F] dark:text-[#B7AFA3]">
              <li>
                <Link to="/" className="hover:text-[#C7377A] transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/#companions" className="hover:text-[#C7377A] transition-colors">
                  Browse Companions
                </Link>
              </li>
              <li>
                <Link to="/#how-it-works" className="hover:text-[#C7377A] transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link to="/blogs" className="hover:text-[#C7377A] transition-colors">
                  Journal & Articles
                </Link>
              </li>
            </ul>
          </div>

          {/* Topics & Support */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#1C1916] dark:text-[#F3EEE6] mb-4">
              Explore Topics
            </h4>
            <ul className="space-y-2.5 text-sm text-[#5E574F] dark:text-[#B7AFA3]">
              <li>
                <Link to="/blogs" className="hover:text-[#C7377A] transition-colors">
                  Heartbreak & Breakup
                </Link>
              </li>
              <li>
                <Link to="/blogs" className="hover:text-[#C7377A] transition-colors">
                  Urban Loneliness
                </Link>
              </li>
              <li>
                <Link to="/blogs" className="hover:text-[#C7377A] transition-colors">
                  Dating & Relationships
                </Link>
              </li>
              <li>
                <Link to="/blogs" className="hover:text-[#C7377A] transition-colors">
                  Late Night Conversations
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact & Listeners */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#1C1916] dark:text-[#F3EEE6] mb-4">
              Community & Help
            </h4>
            <ul className="space-y-2.5 text-sm text-[#5E574F] dark:text-[#B7AFA3]">
              <li>
                <Link to="/contact" className="hover:text-[#C7377A] transition-colors">
                  Contact Support
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-[#C7377A] transition-colors flex items-center gap-1 text-[#C7377A] font-medium">
                  <span>Become a Companion</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </li>
              <li>
                <button
                  onClick={() => openDownloadModal('footer-link')}
                  className="hover:text-[#C7377A] transition-colors cursor-pointer text-left"
                >
                  Download on Google Play
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Disclaimer / Regulatory Note */}
        <div className="py-6 border-b border-[#E3DBD1]/70 dark:border-[#3A342E]/70 text-xs text-[#5E574F] dark:text-[#B7AFA3] leading-relaxed">
          <p className="mb-2">
            <strong className="text-[#1C1916] dark:text-[#F3EEE6]">Medical & Crisis Disclaimer:</strong> Accompany provides peer-to-peer emotional companionship, active listening, and wellness conversations. We are not a medical, psychiatric, or licensed clinical healthcare provider.
          </p>
          <p>
            If you or someone you know is in acute danger, experiencing suicidal thoughts, or dealing with a mental health emergency, please immediately call national emergency helplines such as <strong>KIRAN (1800-599-0019)</strong> or <strong>Tele-MANAS (14416)</strong> in India.
          </p>
        </div>

        {/* Bottom row: copyright & policies */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#5E574F] dark:text-[#B7AFA3]">
          <div>
            &copy; {new Date().getFullYear()} Accompany App. All rights reserved.
          </div>
          <div className="flex items-center gap-6">
            <Link
              to="/terms?tab=privacy"
              className="hover:text-[#C7377A] dark:hover:text-[#F3EEE6] transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              to="/terms?tab=terms"
              className="hover:text-[#C7377A] dark:hover:text-[#F3EEE6] transition-colors"
            >
              Terms of Service
            </Link>
            <Link
              to="/terms?tab=terms"
              className="hover:text-[#C7377A] dark:hover:text-[#F3EEE6] transition-colors"
            >
              Safety & Anonymity
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
