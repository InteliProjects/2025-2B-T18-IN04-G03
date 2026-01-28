'use client';

import { useState } from 'react';
import Link from 'next/link';
import styles from '../page.module.css';

export default function Sidebar() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <>
      {/* Sidebar Colapsível */}
      <aside className={`${styles.sidebar} ${!sidebarOpen ? styles.sidebarClosed : ''}`}>
        <div className={styles.sidebarHeader}>
          <h2 className={styles.sidebarTitle}>Menu</h2>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={styles.toggleBtn}
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? '✕' : '☰'}
          </button>
        </div>

        <nav className={styles.sidebarNav}>
          <Link href="/" className={styles.navLink}>
            📊 {sidebarOpen && 'Início'}
          </Link>
          <Link href="/users" className={styles.navLink}>
            👥 {sidebarOpen && 'Usuários'}
          </Link>
          <Link href="/cards" className={styles.navLink}>
            🎫 {sidebarOpen && 'Cartões'}
          </Link>
          <Link href="/permissions" className={styles.navLink}>
            🔐 {sidebarOpen && 'Permissões'}
          </Link>
          <Link href="/locks" className={styles.navLink}>
            🔒 {sidebarOpen && 'Fechaduras'}
          </Link>
          <Link href="/stations" className={styles.navLink}>
            🏢 {sidebarOpen && 'Estações'}
          </Link>
          <Link href="/groups" className={styles.navLink}>
            👫 {sidebarOpen && 'Grupos'}
          </Link>
        </nav>
      </aside>

      {/* Main Container para adaptar margin */}
      <style>{`
        :root {
          --sidebar-open: ${sidebarOpen ? '280px' : '80px'};
        }
      `}</style>
    </>
  );
}
