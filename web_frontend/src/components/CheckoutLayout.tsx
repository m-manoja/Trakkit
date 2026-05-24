import type { ReactNode } from "react";
import styles from "./CheckoutLayout.module.css";
import logoImg from "../assets/icon.png";

interface CheckoutLayoutProps {
  children: ReactNode;
}

/** Minimal layout for pricing/checkout — no sidebar, optimized for mobile in-app browser. */
export default function CheckoutLayout({ children }: CheckoutLayoutProps) {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <img src={logoImg} alt="Trakkit" className={styles.logo} />
          <span className={styles.logoText}>Trakkit</span>
        </div>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
