'use client';

import { useEffect, useState } from 'react';
import { fetchPermissions, createPermission } from '@/lib/api';
import type { Permission } from '@/lib/api';
import styles from '../page.module.css';

export default function PermissionsPage() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    permission_name: '',
    description: '',
  });

  useEffect(() => {
    loadPermissions();
  }, []);

  const loadPermissions = async () => {
    try {
      setLoading(true);
      const data = await fetchPermissions();
      setPermissions(data);
    } catch (err) {
      console.error('Erro ao carregar permissões:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.permission_name) {
      setError('Nome da permissão é obrigatório');
      return;
    }

    try {
      setSubmitting(true);
      await createPermission(formData);
      setSuccess('Permissão criada com sucesso!');
      setFormData({ permission_name: '', description: '' });
      setShowModal(false);
      setTimeout(() => loadPermissions(), 500);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao criar permissão');
      console.error('Erro ao criar permissão:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className={styles.loading}>Carregando permissões...</div>;

  return (
    <>
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>Permissões ({permissions.length})</h2>
          <button className={styles.btnAdd} onClick={() => setShowModal(true)}>
            + Adicionar Permissão
          </button>
        </div>

        {error && <div className={styles.errorMessage}>{error}</div>}
        {success && <div className={styles.successMessage}>{success}</div>}

        <div className={styles.tableContainer}>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Nome</th>
                <th>Descrição</th>
                <th>Criado Em</th>
              </tr>
            </thead>
            <tbody>
              {permissions.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>
                    Nenhuma permissão encontrada
                  </td>
                </tr>
              ) : (
                permissions.map((p) => (
                  <tr key={p.id_permission}>
                    <td>{p.id_permission}</td>
                    <td>{p.permission_name}</td>
                    <td>{p.description || '-'}</td>
                    <td>{p.created_at ? new Date(p.created_at).toLocaleString('pt-BR') : '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className={`${styles.modal} ${showModal ? styles.modalOpen : ''}`}>
        <div className={styles.modalContent}>
          <button
            className={styles.modalClose}
            onClick={() => {
              setShowModal(false);
              setError('');
              setFormData({ permission_name: '', description: '' });
            }}
          >
            ✕
          </button>

          <div className={styles.modalHeader}>
            <h2>Criar Nova Permissão</h2>
          </div>

          <form onSubmit={handleSubmit}>
            {error && <div className={styles.errorMessage}>{error}</div>}

            <div className={styles.formGroup}>
              <label htmlFor="permission_name">Nome da Permissão *</label>
              <input
                id="permission_name"
                name="permission_name"
                value={formData.permission_name}
                onChange={handleInputChange}
                placeholder="Ex.: access:door:123"
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="description">Descrição (opcional)</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Descrição breve da permissão"
                rows={4}
              />
            </div>

            <div className={styles.formActions}>
              <button type="submit" className={styles.btnPrimary} disabled={submitting}>
                {submitting ? 'Salvando...' : 'Criar Permissão'}
              </button>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => {
                  setShowModal(false);
                  setError('');
                  setFormData({ permission_name: '', description: '' });
                }}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
