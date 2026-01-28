'use client';

import { useEffect, useState } from 'react';
import { fetchLocks } from '@/lib/api';
import type { Lock } from '@/lib/api';
import styles from '../page.module.css';

export default function LocksPage() {
  const [locks, setLocks] = useState<Lock[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLocks();
  }, []);

  const loadLocks = async () => {
    try {
      setLoading(true);
      const data = await fetchLocks();
      setLocks(data);
    } catch (error) {
      console.error('Erro ao carregar fechaduras:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.loading}>Carregando fechaduras...</div>
    );
  }

  return (
    <>
      <section className={styles.section}>
          <h2>Lista de Fechaduras ({locks.length})</h2>
          <div className={styles.tableContainer}>
            <table>
              <thead>
                <tr>
                  <th>ID Fechadura</th>
                  <th>Nome</th>
                  <th>ID Estação</th>
                  <th>ESP ID</th>
                  <th>Tipo</th>
                  <th>ID Broker</th>
                </tr>
              </thead>
              <tbody>
                {locks.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                      Nenhuma fechadura encontrada
                    </td>
                  </tr>
                ) : (
                  locks.map((lock) => (
                    <tr key={lock.id_lock}>
                      <td>{lock.id_lock}</td>
                      <td>{lock.name}</td>
                      <td>{lock.station_id}</td>
                      <td>{lock.esp_id}</td>
                      <td>
                        <span className={styles.badgeInfo}>{lock.locks_type}</span>
                      </td>
                      <td>{lock.broker_id || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
    </>
  );
}

