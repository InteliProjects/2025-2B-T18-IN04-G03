'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { fetchStations, fetchLocks, fetchAccessLogs } from '@/lib/api';
import type { Station, Lock, AccessLog } from '@/lib/api';
import styles from '../page.module.css';

export default function StationsPage() {
  const [stations, setStations] = useState<Station[]>([]);
  const [locks, setLocks] = useState<Lock[]>([]);
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStations();
  }, []);

  const loadStations = async () => {
    try {
      setLoading(true);
      setError(null);
      const [stationsData, locksData, logsData] = await Promise.all([
        fetchStations(),
        fetchLocks().catch(() => []),
        fetchAccessLogs().catch(() => []),
      ]);
      setStations(stationsData);
      setLocks(locksData);
      setLogs(logsData);
    } catch (error) {
      console.error('Erro ao carregar estações:', error);
      setError('Não foi possível carregar as estações agora.');
    } finally {
      setLoading(false);
    }
  };

  const stationsWithStats = useMemo(() => {
    const locksByStation = locks.reduce<Record<number, Lock[]>>((acc, lock) => {
      acc[lock.station_id] = acc[lock.station_id] || [];
      acc[lock.station_id].push(lock);
      return acc;
    }, {});

    const accessByLock = logs.reduce<Record<number, number>>((acc, log) => {
      acc[log.id_lock] = (acc[log.id_lock] || 0) + 1;
      return acc;
    }, {});

    return stations.map((station) => {
      const stationLocks = locksByStation[station.id_station] || [];
      const totalAccesses = stationLocks.reduce((sum, lock) => sum + (accessByLock[lock.id_lock] || 0), 0);
      return {
        ...station,
        lockCount: stationLocks.length,
        totalAccesses,
      };
    });
  }, [stations, locks, logs]);

  if (loading) {
    return (
      <div className={styles.loading}>Carregando estações...</div>
    );
  }

  return (
    <>
      <section className={styles.section}>
        <div className={styles.pageHeader}>
          <div>
            <p className={styles.breadcrumb}>Dashboard / Estações</p>
            <h1 className={styles.pageTitle}>Estações</h1>
            <p className={styles.pageSubtitle}>Escolha uma estação para ver os detalhes e gerenciar salas.</p>
          </div>
          <span className={styles.counterPill}>{stations.length} estações</span>
        </div>

        {error && <div className={styles.errorMessage}>{error}</div>}

        <div className={styles.stationsGrid}>
          {stationsWithStats.length === 0 ? (
            <div className={styles.emptyState}>
              <p>Nenhuma estação encontrada.</p>
            </div>
          ) : (
            stationsWithStats.map((station) => (
              <Link
                href={`/stations/${station.id_station}`}
                key={station.id_station}
                className={styles.stationCard}
              >
                <div className={styles.stationCardHeader}>
                  <div>
                    <p className={styles.stationId}>Estação #{station.id_station}</p>
                    <h3 className={styles.stationName}>{station.name}</h3>
                  </div>
                  <span className={styles.chip}>{station.lockCount} salas</span>
                </div>
                <div className={styles.stationMeta}>
                  <span>Broker ID: {station.broker_id ?? '—'}</span>
                  <span>Acessos: {station.totalAccesses}</span>
                </div>
                <div className={styles.cardFooter}>
                  <span>Ver detalhes</span>
                  <span className={styles.arrow}>→</span>
                </div>
              </Link>
            ))
          )}
        </div>
      </section>
    </>
  );
}

