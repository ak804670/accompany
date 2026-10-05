import React from 'react';

interface GooglePlayButtonProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  showSubtitle?: boolean;
}

export const GooglePlayButton: React.FC<GooglePlayButtonProps> = ({
  className = '',
  size = 'md',
  onClick,
  showSubtitle = true,
}) => {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs rounded-xl gap-2',
    md: 'px-4 py-2 text-sm rounded-2xl gap-3',
    lg: 'px-5 py-3 text-base rounded-2xl gap-3.5',
  };

  const iconSizes = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-7 h-7',
  };

  return (
    <button
      onClick={onClick}
      type="button"
      className={`inline-flex items-center justify-center bg-[#1C1916] dark:bg-[#FFFCF8] text-[#FBF7F2] dark:text-[#1C1916] hover:bg-[#332C25] dark:hover:bg-[#EDE7DC] border border-[#3A342E]/30 dark:border-[#E3DBD1]/40 shadow-md hover:shadow-lg transition-all duration-200 active:scale-[0.98] cursor-pointer group ${sizeClasses[size]} ${className}`}
    >
      {/* Official styled Google Play Vector Icon */}
      <svg
        className={`${iconSizes[size]} shrink-0 transition-transform duration-200 group-hover:scale-105`}
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path
          d="M3.609 1.814L13.792 12 3.61 22.186a2.023 2.023 0 0 1-.61-1.464V3.278c0-.568.225-1.096.609-1.464z"
          fill="#00E676"
        />
        <path
          d="M17.207 8.586l-3.415 3.414 3.415 3.414 3.86-2.228c1.106-.638 1.106-1.734 0-2.372l-3.86-2.228z"
          fill="#FFD600"
        />
        <path
          d="M3.609 1.814c.28-.268.647-.417 1.05-.417.47 0 .918.204 1.258.4l11.29 6.789-2.415 2.414L3.61 1.814z"
          fill="#00B0FF"
        />
        <path
          d="M14.792 13l2.415 2.414-11.29 6.789c-.34.196-.788.4-1.258.4-.403 0-.77-.149-1.05-.417L14.792 13z"
          fill="#FF3D00"
        />
      </svg>
      <div className="flex flex-col text-left leading-tight">
        {showSubtitle && (
          <span className="text-[10px] uppercase font-semibold tracking-wider opacity-75">
            GET IT ON
          </span>
        )}
        <span className="font-bold tracking-tight text-sm">
          Google Play
        </span>
      </div>
    </button>
  );
};
