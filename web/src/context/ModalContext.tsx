import React, { createContext, useContext, useState } from 'react';

interface ModalContextType {
  isDownloadModalOpen: boolean;
  openDownloadModal: (source?: string) => void;
  closeDownloadModal: () => void;
  downloadSource: string;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [downloadSource, setDownloadSource] = useState('general');

  const openDownloadModal = (source = 'general') => {
    setDownloadSource(source);
    setIsDownloadModalOpen(true);
  };

  const closeDownloadModal = () => {
    setIsDownloadModalOpen(false);
  };

  return (
    <ModalContext.Provider
      value={{
        isDownloadModalOpen,
        openDownloadModal,
        closeDownloadModal,
        downloadSource,
      }}
    >
      {children}
    </ModalContext.Provider>
  );
}

export function useModal() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
}
