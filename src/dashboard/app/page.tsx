'use client';

import { useEffect, useMemo, useState } from 'react';
import { fetchAccessLogs, fetchUsers } from '@/lib/api';
import type { AccessLog } from '@/lib/api';
import styles from './page.module.css';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalAccesses: 0,
    deniedAccesses: 0,
    activeUsers: 0,
    successRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentLogs, setRecentLogs] = useState<AccessLog[]>([]);
  const [allLogs, setAllLogs] = useState<AccessLog[]>([]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [logs, users] = await Promise.all([
        fetchAccessLogs().catch(() => []),
        fetchUsers().catch(() => []),
      ]);

      const granted = logs.filter(
        (log) => log.access_result === 'granted' || log.access_result === 'Accept'
      ).length;
      const denied = logs.filter(
        (log) => log.access_result === 'denied' || log.access_result === 'Deny'
      ).length;
      const total = logs.length;
      const successRate = total > 0 ? Math.round((granted / total) * 100) : 0;

      setStats({
        totalAccesses: total,
        deniedAccesses: denied,
        activeUsers: users.length,
        successRate,
      });

      const sortedLogs = [...logs].sort(
        (a, b) =>
          new Date(b.access_time).getTime() - new Date(a.access_time).getTime()
      );
      setRecentLogs(sortedLogs.slice(0, 10));
      setAllLogs(logs);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Atualização periódica (quase "tempo real")
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const lastWeekSeries = useMemo(() => {
    const today = new Date();
    const days: { label: string; dateKey: string }[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateKey = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('pt-BR', {
        weekday: 'short',
        day: '2-digit',
      });
      days.push({ label, dateKey });
    }

    const counts: Record<string, number> = {};
    for (const log of allLogs) {
      const key = new Date(log.access_time).toISOString().slice(0, 10);
      counts[key] = (counts[key] || 0) + 1;
    }

    const series = days.map((d) => ({
      label: d.label,
      value: counts[d.dateKey] || 0,
    }));

    const max = Math.max(1, ...series.map((s) => s.value));

    return { series, max };
  }, [allLogs]);

  if (loading) {
    return <div className={styles.loading}>Carregando dados...</div>;
  }

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <div className={styles.breadcrumb}>Visão Geral / Dashboard</div>
          <h1 className={styles.pageTitle}>Painel de Acessos</h1>
          <p className={styles.pageSubtitle}>
            Acompanhe em tempo real os acessos, usuários ativos e a taxa de sucesso do sistema.
          </p>
        </div>
      </div>

      <section className={styles.section}>
        <div className={styles.statsRow}>
          <div className={styles.statPill}>
            <div className={styles.statLabel}>Acessos Totais</div>
            <div className={styles.statValue}>{stats.totalAccesses}</div>
          </div>
          <div className={styles.statPill}>
            <div className={styles.statLabel}>Acessos Negados</div>
            <div className={styles.statValue}>{stats.deniedAccesses}</div>
          </div>
          <div className={styles.statPill}>
            <div className={styles.statLabel}>Usuários Ativos</div>
            <div className={styles.statValue}>{stats.activeUsers}</div>
          </div>
          <div className={styles.statPill}>
            <div className={styles.statLabel}>Taxa de Sucesso</div>
            <div className={styles.statValue}>{stats.successRate}%</div>
          </div>
        </div>

        <div className={styles.chartWrapper}>
          <h2>Acessos por dia (últimos 7 dias)</h2>
          {lastWeekSeries.series.length === 0 ? (
            <div className={styles.emptyState}>
              Nenhum acesso registrado nos últimos dias.
            </div>
          ) : (
            lastWeekSeries.series.map((item) => (
              <div key={item.label} className={styles.barRow}>
                <div className={styles.barLabel}>
                  <span>{item.label}</span>
                </div>
                <div className={styles.barTrack}>
                  <div
                    className={styles.bar}
                    style={{
                      width: `${
                        item.value === 0
                          ? 0
                          : Math.max(
                              8,
                              (item.value / lastWeekSeries.max) * 100
                            )
                      }%`,
                    }}
                  />
                </div>
                <div className={styles.barValue}>{item.value}</div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className={styles.section}>
        <h2>Logs Recentes</h2>
        <div className={styles.tableContainer}>
          <table>
            <thead>
              <tr>
                <th>ID Log</th>
                <th>Cartão</th>
                <th>Fechadura</th>
                <th>Data/Hora</th>
                <th>Resultado</th>
                <th>Usuário</th>
              </tr>
            </thead>
            <tbody>
              {recentLogs.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    style={{ textAlign: 'center', padding: '2rem' }}
                  >
                    Nenhum log encontrado
                  </td>
                </tr>
              ) : (
                recentLogs.map((log) => (
                  <tr key={log.id_log}>
                    <td>{log.id_log}</td>
                    <td>{log.id_card}</td>
                    <td>{log.id_lock}</td>
                    <td>
                      {new Date(log.access_time).toLocaleString('pt-BR')}
                    </td>
                    <td>
                      <span
                        className={
                          log.access_result === 'granted' ||
                          log.access_result === 'Accept'
                            ? styles.badgeSuccess
                            : styles.badgeDanger
                        }
                      >
                        {log.access_result}
                      </span>
                    </td>
                    <td>{log.user_id || '-'}</td>
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

