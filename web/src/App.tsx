import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { ModalProvider } from '@/context/ModalContext';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { AppDownloadModal } from '@/components/modals/AppDownloadModal';
import { LandingPage } from '@/pages/LandingPage';
import { BlogListPage } from '@/pages/BlogListPage';
import { BlogDetailPage } from '@/pages/BlogDetailPage';
import { ContactPage } from '@/pages/ContactPage';
import { TermsPage } from '@/pages/TermsPage';

function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const element = document.getElementById(hash.replace('#', ''));
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  return null;
}

export default function App() {
  return (
    <ModalProvider>
      <BrowserRouter>
        <ScrollToTop />
        <div className="min-h-screen flex flex-col bg-[#F7F4EF] dark:bg-[#12110F] text-[#1C1916] dark:text-[#F3EEE6] selection:bg-[#FDE4ED] selection:text-[#C7377A] transition-colors duration-300">
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/blogs" element={<BlogListPage />} />
              <Route path="/blogs/:slug" element={<BlogDetailPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/terms-and-conditions" element={<TermsPage />} />
              <Route path="/privacy-policy" element={<TermsPage />} />
              <Route path="*" element={<LandingPage />} />
            </Routes>
          </main>
          <Footer />
          <AppDownloadModal />
        </div>
      </BrowserRouter>
    </ModalProvider>
  );
}
