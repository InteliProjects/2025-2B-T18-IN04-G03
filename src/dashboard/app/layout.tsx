import type { Metadata } from 'next';
import './globals.css';
import Sidebar from './components/Sidebar';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Dashboard - Controle de Acesso',
  description: 'Dashboard de visualização dos dados do sistema de controle de acesso',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <div className={styles.container}>
          <Sidebar />
          <main className={styles.main}>{children}</main>
        </div>
      </body>
    </html>
  );
}

