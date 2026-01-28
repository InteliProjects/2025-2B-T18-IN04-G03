'use client';

import { useEffect, useState } from 'react';
import { fetchServiceGroups, createServiceGroup } from '@/lib/api';
import type { ServiceGroup } from '@/lib/api';
import styles from '../page.module.css';

export default function GroupsPage() {
  const [groups, setGroups] = useState<ServiceGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    leaderName: '',
    password: '',
    memberCount: '',
    memberIds: '',
  });

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchServiceGroups();
      setGroups(data);
    } catch (error) {
      console.error('Erro ao carregar grupos:', error);
      setError('Não foi possível carregar os grupos agora.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setIsSaving(true);
      setError(null);

      const memberIds = form.memberIds
        .split(',')
        .map((id) => Number(id.trim()))
        .filter((id) => !Number.isNaN(id));

      if (form.memberCount && Number(form.memberCount) !== memberIds.length) {
        setError('Quantidade de integrantes não corresponde aos IDs informados.');
        return;
      }

      await createServiceGroup({
        leader_name: form.leaderName,
        group_password: form.password,
        member_ids: memberIds,
        group_name: `Grupo de ${form.leaderName}`,
      });

      setForm({ leaderName: '', password: '', memberCount: '', memberIds: '' });
      setIsModalOpen(false);
      await loadGroups();
    } catch (err) {
      console.error('Erro ao criar grupo:', err);
      setError('Não foi possível criar o grupo. Verifique os dados.');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.loading}>Carregando grupos...</div>
    );
  }

  return (
    <>
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>Acesso de Grupo ({groups.length})</h2>
          <button className={styles.btnAdd} onClick={() => setIsModalOpen(true)}>
            + Adicionar grupo
          </button>
        </div>

        {error && <div className={styles.errorMessage}>{error}</div>}

        <div className={styles.tableContainer}>
          <table>
            <thead>
              <tr>
                <th>ID Grupo</th>
                <th>Nome do Grupo</th>
                <th>ID Líder</th>
              </tr>
            </thead>
            <tbody>
              {groups.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ textAlign: 'center', padding: '2rem' }}>
                    Nenhum grupo encontrado
                  </td>
                </tr>
              ) : (
                groups.map((group) => (
                  <tr key={group.id_group}>
                    <td>{group.id_group}</td>
                    <td>{group.group_name}</td>
                    <td>{group.leader_user_id}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal de criação de grupo */}
      <div className={`${styles.modal} ${isModalOpen ? styles.modalOpen : ''}`}>
        <div className={styles.modalContent}>
          <button className={styles.modalClose} onClick={() => setIsModalOpen(false)}>
            ✕
          </button>
          <div className={styles.modalHeader}>
            <h2>Adicionar grupo ao serviço</h2>
            <p>Informe os dados solicitados para criar o grupo.</p>
          </div>
          <form onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <label htmlFor="leaderName">Nome do chefe de grupo</label>
              <input
                id="leaderName"
                value={form.leaderName}
                onChange={(e) => setForm((prev) => ({ ...prev, leaderName: e.target.value }))}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="password">Senha do chefe de grupo</label>
              <input
                id="password"
                type="password"
                value={form.password}
                onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="memberCount">Quantidade de integrantes</label>
              <input
                id="memberCount"
                type="number"
                min={1}
                value={form.memberCount}
                onChange={(e) => setForm((prev) => ({ ...prev, memberCount: e.target.value }))}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="memberIds">IDs dos integrantes (separados por vírgula)</label>
              <input
                id="memberIds"
                placeholder="Ex: 12, 15, 18"
                value={form.memberIds}
                onChange={(e) => setForm((prev) => ({ ...prev, memberIds: e.target.value }))}
                required
              />
              <small>O primeiro ID será considerado líder do grupo.</small>
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
                {isSaving ? 'Salvando...' : 'Salvar grupo'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

