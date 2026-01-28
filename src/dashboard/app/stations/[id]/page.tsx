'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  fetchAccessLogs,
  fetchLocks,
  fetchStationDetail,
  fetchStations,
  createLock,
} from '@/lib/api';
import type { AccessLog, Lock, StationDetail } from '@/lib/api';
import styles from '../../page.module.css';

interface RoomFormState {
  name: string;
  brokerInfo: string;
  esp_id: string;
}

export default function StationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const stationId = useMemo(() => {
    const value = Array.isArray(params?.id) ? params.id[0] : params?.id;
    return Number(value);
  }, [params]);

  const [stationDetail, setStationDetail] = useState<StationDetail | null>(null);
  const [locks, setLocks] = useState<Lock[]>([]);
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [roomForm, setRoomForm] = useState<RoomFormState>({
    name: '',
    brokerInfo: '',
    esp_id: '',
  });

  useEffect(() => {
    if (!stationId) return;
    loadStation();
  }, [stationId]);

  const loadStation = async () => {
    try {
      setLoading(true);
      setError(null);

      try {
        const detail = await fetchStationDetail(stationId);
        setStationDetail(detail);
        setLocks(detail.locks);
        setLogs(detail.logs);
      } catch (fetchDetailError) {
        // Fallback quando a rota detalhada não estiver disponível
        console.warn('Rota de detalhe indisponível, usando fallback.', fetchDetailError);
        const [stations, locksData, logsData] = await Promise.all([
          fetchStations(),
          fetchLocks().catch(() => []),
          fetchAccessLogs().catch(() => []),
        ]);

        const station = stations.find((st) => st.id_station === stationId);
        if (!station) {
          throw new Error('Estação não encontrada');
        }

        const stationLocks = locksData.filter((lock) => lock.station_id === stationId);
        const stationLogs = logsData.filter((log) =>
          stationLocks.some((lock) => lock.id_lock === log.id_lock)
        );

        setStationDetail({
          station,
          locks: stationLocks,
          logs: stationLogs,
          stats: {
            operational_locks: stationLocks.length,
            active_users: new Set(stationLogs.map((log) => log.user_id).filter(Boolean)).size,
            denied_accesses: stationLogs.filter(
              (log) =>
                (log.access_result || '').toLowerCase() === 'denied' || log.access_result === 'Deny'
            ).length,
            total_accesses: stationLogs.length,
          },
        });
        setLocks(stationLocks);
        setLogs(stationLogs);
      }

    } catch (err) {
      console.error('Erro ao carregar detalhes da estação:', err);
      setError('Não foi possível carregar os detalhes desta estação.');
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    if (!stationDetail) {
      return {
        operational_locks: 0,
        active_users: 0,
        denied_accesses: 0,
        total_accesses: 0,
      };
    }
    return stationDetail.stats;
  }, [stationDetail]);

  const accessByRoom = useMemo(() => {
    if (!locks.length) return [];
    const grouped = locks.map((lock) => {
      const accesses = logs.filter((log) => log.id_lock === lock.id_lock);
      return {
        id: lock.id_lock,
        name: lock.name,
        total: accesses.length,
      };
    });
    return grouped.sort((a, b) => b.total - a.total);
  }, [locks, logs]);

  const handleRoomSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!stationId) return;

    try {
      setIsSaving(true);
      const brokerIdNumber = roomForm.brokerInfo && !Number.isNaN(Number(roomForm.brokerInfo))
        ? Number(roomForm.brokerInfo)
        : null;
      const espIdNumber = Number(roomForm.esp_id || '0');

      await createLock({
        name: roomForm.name,
        station_id: stationId,
        esp_id: espIdNumber,
        locks_type: 'sala',
        broker_id: brokerIdNumber,
        broker_ip: brokerIdNumber === null ? roomForm.brokerInfo : undefined,
      });

      setRoomForm({ name: '', brokerInfo: '', esp_id: '' });
      setIsModalOpen(false);
      await loadStation();
    } catch (err) {
      console.error('Erro ao adicionar sala:', err);
      setError('Não foi possível adicionar a sala. Verifique os dados e tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const exportCsv = () => {
    const header = ['ID Log', 'Cartão', 'Fechadura', 'Data/Hora', 'Resultado', 'Usuário'];
    const rows = logs.map((log) => [
      log.id_log,
      log.id_card,
      log.id_lock,
      new Date(log.access_time).toISOString(),
      log.access_result,
      log.user_id ?? '',
    ]);
    const csvContent = [header, ...rows]
      .map((row) => row.map((cell) => `"${cell ?? ''}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `logs-estacao-${stationId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return <div className={styles.loading}>Carregando detalhes da estação...</div>;
  }

  if (!stationId || !stationDetail) {
    return <div className={styles.errorMessage}>Estação não encontrada.</div>;
  }

  return (
    <>
      <section className={styles.section}>
        <div className={styles.pageHeader}>
          <div>
            <p className={styles.breadcrumb}>Estações / #{stationId}</p>
            <h1 className={styles.pageTitle}>{stationDetail.station.name}</h1>
            <p className={styles.pageSubtitle}>Visão detalhada e gestão das salas desta estação.</p>
          </div>
          <button className={styles.btnSecondary} onClick={() => router.push('/stations')}>
            ← Voltar
          </button>
        </div>

        {error && <div className={styles.errorMessage}>{error}</div>}

        <div className={styles.statsRow}>
          <div className={styles.statPill}>
            <p className={styles.statLabel}>Trancas Operacionais</p>
            <p className={styles.statValue}>{stats.operational_locks}</p>
          </div>
          <div className={styles.statPill}>
            <p className={styles.statLabel}>Usuários Ativos</p>
            <p className={styles.statValue}>{stats.active_users}</p>
          </div>
          <div className={styles.statPill}>
            <p className={styles.statLabel}>Acessos Negados</p>
            <p className={styles.statValue}>{stats.denied_accesses}</p>
          </div>
          <div className={styles.statPill}>
            <p className={styles.statLabel}>Acessos Totais</p>
            <p className={styles.statValue}>{stats.total_accesses}</p>
          </div>
        </div>

        <div className={styles.sectionHeader}>
          <h2>Salas operacionais</h2>
          <button className={styles.btnAdd} onClick={() => setIsModalOpen(true)}>
            + Adicionar sala
          </button>
        </div>

        <div className={styles.roomsGrid}>
          {locks.length === 0 ? (
            <div className={styles.emptyState}>
              <p>Nenhuma sala cadastrada para esta estação.</p>
            </div>
          ) : (
            locks.map((lock) => (
              <div key={lock.id_lock} className={styles.roomCard}>
                <div className={styles.roomHeader}>
                  <h4>{lock.name}</h4>
                  <span className={styles.chip}>ID {lock.id_lock}</span>
                </div>
                <p className={styles.roomMeta}>Broker: {lock.broker_id ?? '—'}</p>
                <p className={styles.roomMeta}>Trancas: {lock.esp_id}</p>
              </div>
            ))
          )}
        </div>

        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>Gráfico de acessos por sala</h2>
            <span className={styles.counterPill}>{accessByRoom.length} salas</span>
          </div>
          <div className={styles.chartWrapper}>
            {accessByRoom.length === 0 ? (
              <p className={styles.emptyState}>Sem registros para exibir.</p>
            ) : (
              accessByRoom.map((room) => {
                const max = accessByRoom[0]?.total || 1;
                const percent = Math.round((room.total / max) * 100);
                return (
                  <div key={room.id} className={styles.barRow}>
                    <div className={styles.barLabel}>
                      <span>{room.name}</span>
                      <small>ID {room.id}</small>
                    </div>
                    <div className={styles.barTrack}>
                      <div className={styles.bar} style={{ width: `${percent}%` }} />
                    </div>
                    <div className={styles.barValue}>{room.total}</div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>Logs da estação</h2>
            <button className={styles.btnSecondary} onClick={exportCsv}>
              Exportar CSV
            </button>
          </div>
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
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '1.5rem' }}>
                      Nenhum log encontrado para esta estação.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id_log}>
                      <td>{log.id_log}</td>
                      <td>{log.id_card}</td>
                      <td>{log.id_lock}</td>
                      <td>{new Date(log.access_time).toLocaleString('pt-BR')}</td>
                      <td>
                        <span
                          className={
                            log.access_result === 'granted' || log.access_result === 'Accept'
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
        </div>
      </section>

      {/* Modal de adição de sala */}
      <div className={`${styles.modal} ${isModalOpen ? styles.modalOpen : ''}`}>
        <div className={styles.modalContent}>
          <button className={styles.modalClose} onClick={() => setIsModalOpen(false)}>
            ✕
          </button>
          <div className={styles.modalHeader}>
            <h2>Adicionar sala</h2>
            <p>Cadastre uma nova sala para esta estação.</p>
          </div>
          <form onSubmit={handleRoomSubmit}>
            <div className={styles.formGroup}>
              <label htmlFor="roomName">Nome da sala</label>
              <input
                id="roomName"
                value={roomForm.name}
                onChange={(e) => setRoomForm((prev) => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="brokerId">IP do broker</label>
              <input
                id="brokerId"
                value={roomForm.brokerInfo}
                onChange={(e) => setRoomForm((prev) => ({ ...prev, brokerInfo: e.target.value }))}
                placeholder="IP ou ID já cadastrado"
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="espId">Número de trancas (ESP ID)</label>
              <input
                id="espId"
                type="number"
                min={1}
                value={roomForm.esp_id}
                onChange={(e) => setRoomForm((prev) => ({ ...prev, esp_id: e.target.value }))}
                required
              />
            </div>
            <div className={styles.formActions}>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => setIsModalOpen(false)}
                disabled={isSaving}
              >
                Cancelar
              </button>
              <button type="submit" className={styles.btnPrimary} disabled={isSaving}>
                {isSaving ? 'Salvando...' : 'Salvar sala'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}


