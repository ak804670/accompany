import React, { useEffect } from 'react';
import { X, Star, ShieldCheck, Download, Smartphone, QrCode } from 'lucide-react';
import { useModal } from '@/context/ModalContext';
import { GooglePlayButton } from '@/components/common/GooglePlayButton';

export const AppDownloadModal: React.FC = () => {
  const { isDownloadModalOpen, closeDownloadModal, downloadSource } = useModal();

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDownloadModal();
    };
    if (isDownloadModalOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto';
    };
  }, [isDownloadModalOpen, closeDownloadModal]);

  if (!isDownloadModalOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={closeDownloadModal}
    >
      <div
        className="relative w-full max-w-lg bg-[#FFFCF8] dark:bg-[#1C1A17] text-[#1C1916] dark:text-[#F3EEE6] rounded-3xl border border-[#E3DBD1] dark:border-[#3A342E] shadow-2xl p-6 md:p-8 overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative background glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#C7377A]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-[#F06091]/15 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={closeDownloadModal}
          className="absolute top-5 right-5 p-2 rounded-full text-[#5E574F] dark:text-[#B7AFA3] hover:bg-[#F7F4EF] dark:hover:bg-[#25221E] transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3.5 mb-5">
          <img
            src="/logo/app-icon-light.png"
            alt="Accompany Logo"
            className="w-14 h-14 rounded-2xl shadow-sm border border-[#E3DBD1] dark:border-[#3A342E] object-cover"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-bold font-serif tracking-tight">Accompany</span>
              <span className="text-[11px] font-semibold bg-[#FDE4ED] text-[#C7377A] px-2 py-0.5 rounded-full">
                Free App
              </span>
            </div>
            <p className="text-xs text-[#5E574F] dark:text-[#B7AFA3] mt-0.5">
              Empathetic Companions & Anonymous Talk 24/7
            </p>
          </div>
        </div>

        {/* Rating and Trust Pill */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-[#F7F4EF] dark:bg-[#25221E] border border-[#E3DBD1]/70 dark:border-[#3A342E]/70 mb-6">
          <div className="flex items-center gap-1.5">
            <div className="flex text-[#F2A82B]">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-3.5 h-3.5 fill-current" />
              ))}
            </div>
            <span className="text-xs font-semibold">4.9 / 5.0</span>
            <span className="text-[11px] text-[#5E574F] dark:text-[#B7AFA3]">(2,800+ reviews)</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-medium text-[#29995C]">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>100% Anonymous</span>
          </div>
        </div>

        {/* Context-aware message */}
        <div className="mb-6">
          <h3 className="text-lg font-serif font-semibold mb-1">
            {downloadSource === 'call'
              ? 'Start your private call in the app'
              : downloadSource === 'companion'
              ? 'Connect with verified companions instantly'
              : 'Carry unburdened conversations anywhere'}
          </h3>
          <p className="text-xs text-[#5E574F] dark:text-[#B7AFA3] leading-relaxed">
            Download Accompany on your phone to enjoy crystal-clear audio & video calls, end-to-end encrypted chats, and instant 24/7 access to compassionate listeners.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 mb-6">
          <GooglePlayButton
            size="lg"
            className="w-full sm:flex-1 justify-center"
            onClick={() => {
              // Can link to official playstore link or trigger download
              window.open('https://play.google.com/store/apps/details?id=com.datingmarketplace.app', '_blank');
            }}
          />
          <a
            href="/downloads/accompany-latest.apk"
            download
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-[#E3DBD1] dark:border-[#3A342E] text-xs font-semibold hover:bg-[#F7F4EF] dark:hover:bg-[#25221E] transition-colors"
          >
            <Download className="w-4 h-4 text-[#C7377A]" />
            <span>Direct APK</span>
          </a>
        </div>

        {/* QR Code and Mobile Info Box */}
        <div className="p-4 rounded-2xl border border-dashed border-[#E3DBD1] dark:border-[#3A342E] flex items-center gap-4 bg-white/40 dark:bg-black/20">
          <div className="w-16 h-16 shrink-0 bg-white p-1 rounded-xl border border-gray-200 shadow-sm flex items-center justify-center">
            {/* SVG stylized QR code */}
            <QrCode className="w-14 h-14 text-[#1C1916]" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <Smartphone className="w-3.5 h-3.5 text-[#C7377A]" />
              <span>Scan QR Code with Phone</span>
            </div>
            <p className="text-[11px] text-[#5E574F] dark:text-[#B7AFA3] mt-0.5 leading-snug">
              Point your phone camera here to jump straight to the Play Store download page.
            </p>
          </div>
        </div>

        {/* Footer reassurance */}
        <p className="text-[11px] text-center text-[#5E574F] dark:text-[#B7AFA3] mt-5">
          🔒 No phone numbers shared • No personal data logged • 100% confidential
        </p>
      </div>
    </div>
  );
};
