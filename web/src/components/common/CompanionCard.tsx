import React from 'react';
import { Phone, MessageSquare, Star, ShieldCheck, Coins } from 'lucide-react';
import type { Companion } from '@/types/companion';
import { useModal } from '@/context/ModalContext';

interface CompanionCardProps {
  companion: Companion;
  className?: string;
}

export const CompanionCard: React.FC<CompanionCardProps> = ({ companion, className = '' }) => {
  const { openDownloadModal } = useModal();

  return (
    <div
      className={`relative group bg-[#FFFCF8] dark:bg-[#1C1A17] rounded-3xl border border-[#E3DBD1] dark:border-[#3A342E] p-5 shadow-xs hover:shadow-xl hover:border-[#C7377A]/40 dark:hover:border-[#C7377A]/50 transition-all duration-300 flex flex-col justify-between ${className}`}
    >
      <div>
        {/* Top Info: Avatar, Online Status, Verified, Rate */}
        <div className="flex items-start gap-4 mb-4">
          <div className="relative shrink-0">
            <img
              src={companion.avatar}
              alt={companion.name}
              className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl object-cover border border-[#E3DBD1] dark:border-[#3A342E] shadow-sm transition-transform duration-300 group-hover:scale-102"
            />
            {/* Online Status Dot */}
            <span
              className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#FFFCF8] dark:border-[#1C1A17] flex items-center justify-center ${
                companion.online ? 'bg-[#32B86B]' : 'bg-[#B7AFA3]'
              }`}
            >
              {companion.online && (
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
              )}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1.5">
                <h4 className="font-serif text-lg font-bold text-[#1C1916] dark:text-[#F3EEE6] truncate">
                  {companion.name}
                </h4>
                <span className="text-xs text-[#5E574F] dark:text-[#B7AFA3]">
                  {companion.age}
                </span>
                <span title="Verified Companion">
                  <ShieldCheck className="w-4 h-4 text-[#C7377A] shrink-0" />
                </span>
              </div>
              <div className="inline-flex items-center gap-1 text-xs font-bold text-[#C7377A] bg-[#FDE4ED] dark:bg-[#26131E] px-2 py-0.5 rounded-full shrink-0">
                <Coins className="w-3 h-3 text-[#F2A82B]" />
                <span>₹{companion.ratePerMin}/m</span>
              </div>
            </div>

            <p className="text-xs font-medium text-[#C7377A] truncate mt-0.5">
              {companion.role}
            </p>

            {/* Ratings & Calls */}
            <div className="flex items-center gap-2 mt-1.5 text-xs text-[#5E574F] dark:text-[#B7AFA3]">
              <div className="flex items-center gap-1 text-[#F2A82B] font-semibold">
                <Star className="w-3.5 h-3.5 fill-current" />
                <span>{companion.rating.toFixed(2)}</span>
              </div>
              <span>•</span>
              <span>{companion.totalCalls.toLocaleString()}+ calls</span>
            </div>
          </div>
        </div>

        {/* Bio / Tagline */}
        <p className="text-xs text-[#5E574F] dark:text-[#B7AFA3] line-clamp-2 leading-relaxed mb-3.5">
          {companion.bio}
        </p>

        {/* Specialty Tags */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {companion.specialties.map((tag) => (
            <span
              key={tag}
              className="text-[10px] font-medium px-2 py-0.5 rounded-lg bg-[#F7F4EF] dark:bg-[#25221E] text-[#1C1916] dark:text-[#F3EEE6] border border-[#E3DBD1]/70 dark:border-[#3A342E]/70"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pt-3 border-t border-[#E3DBD1]/70 dark:border-[#3A342E]/70 flex items-center gap-2">
        <button
          onClick={() => openDownloadModal('companion-call')}
          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#C7377A] hover:bg-[#A62965] text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all active:scale-98 cursor-pointer"
        >
          <Phone className="w-3.5 h-3.5" />
          <span>Call Now</span>
        </button>
        <button
          onClick={() => openDownloadModal('companion-chat')}
          className="inline-flex items-center justify-center gap-1 py-2 px-3 rounded-xl border border-[#E3DBD1] dark:border-[#3A342E] hover:bg-[#F7F4EF] dark:hover:bg-[#25221E] text-xs font-medium text-[#1C1916] dark:text-[#F3EEE6] transition-colors cursor-pointer"
          title="Chat in App"
        >
          <MessageSquare className="w-3.5 h-3.5 text-[#5E574F] dark:text-[#B7AFA3]" />
          <span>Chat</span>
        </button>
      </div>
    </div>
  );
};
