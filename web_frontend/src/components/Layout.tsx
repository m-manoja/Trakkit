import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import Sidebar from "./Sidebar/Sidebar";
import styles from "./Layout.module.css";
import logoImg from "../assets/icon.png";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isMobileMenuOpen]);

  return (
    <div className={styles.layout}>
      {/* Mobile Header */}
      <div className={styles.mobileHeader}>
        <div className={styles.mobileLogoContainer}>
           <img src={logoImg} alt="Trakkit" className={styles.mobileLogo} />
           <span className={styles.mobileLogoText}>Trakkit</span>
        </div>
        <button className={styles.menuButton} onClick={() => setIsMobileMenuOpen(prev => !prev)}>
          {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {isMobileMenuOpen && (
        <div className={styles.mobileOverlay} onClick={() => setIsMobileMenuOpen(false)}></div>
      )}

      <div className={`${styles.sidebarWrapper} ${isMobileMenuOpen ? styles.open : ''}`}>
        <Sidebar onClose={() => setIsMobileMenuOpen(false)} />
      </div>

      <main className={styles.main}>
        <div className={styles.container}>
          {children}
        </div>
      </main>
    </div>
  );
}
