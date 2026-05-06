import type { ReactNode } from "react";
import Sidebar from "./Sidebar/Sidebar";
import styles from "./Layout.module.css";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className={styles.layout}>
      <Sidebar />
      <main className={styles.main}>
        <div className={styles.container}>
          {children}
        </div>
      </main>
    </div>
  );
}
