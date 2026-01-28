'use client';

import { useEffect, useMemo, useState } from 'react';
import { fetchUsers, createUser } from '@/lib/api';
import type { User } from '@/lib/api';
import styles from '../page.module.css';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    user_type: 'user',
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await fetchUsers();
      setUsers(data);
      setCurrentPage(1);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(users.length / pageSize)),
    [users.length]
  );

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return users.slice(start, start + pageSize);
  }, [users, currentPage]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.name || !formData.email) {
      setError('Nome e email são obrigatórios');
      return;
    }

    try {
      setSubmitting(true);
      await createUser(formData);
      setSuccess('Usuário criado com sucesso!');
      setFormData({ name: '', email: '', user_type: 'user' });
      setShowModal(false);
      setTimeout(() => {
        loadUsers();
      }, 500);
    } catch (error: any) {
      setError(
        error.response?.data?.message || 'Erro ao criar usuário'
      );
      console.error('Erro ao criar usuário:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className={styles.loading}>Carregando usuários...</div>;
  }

  return (
    <>
      <section className={styles.section}>
        <div className={styles.pageHeader}>
          <div>
            <div className={styles.breadcrumb}>Administração / Usuários</div>
            <h1 className={styles.pageTitle}>Usuários</h1>
            <p className={styles.pageSubtitle}>
              Gerencie os usuários autorizados a utilizar o sistema de controle de acesso.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'flex-end' }}>
            <span className={styles.counterPill}>
              {users.length} usuário{users.length === 1 ? '' : 's'} no total
            </span>
            <button
              className={styles.btnAdd}
              onClick={() => setShowModal(true)}
            >
              + Adicionar Usuário
            </button>
          </div>
        </div>

        {error && <div className={styles.errorMessage}>{error}</div>}
        {success && <div className={styles.successMessage}>{success}</div>}

        <div className={styles.tableContainer}>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Nome</th>
                <th>Email</th>
                <th>Tipo</th>
                <th>Data de Criação</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                    Nenhum usuário encontrado
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => (
                  <tr key={user.id_user}>
                    <td>{user.id_user}</td>
                    <td>{user.name}</td>
                    <td>{user.email || '-'}</td>
                    <td>
                      <span className={styles.badgeInfo}>{user.user_type}</span>
                    </td>
                    <td>{new Date(user.created_at).toLocaleString('pt-BR')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {users.length > pageSize && (
          <div className={styles.pagination}>
            <button
              className={styles.paginationButton}
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              Anterior
            </button>
            <span className={styles.paginationInfo}>
              Página {currentPage} de {totalPages}
            </span>
            <button
              className={styles.paginationButton}
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              Próxima
            </button>
          </div>
        )}
      </section>

      {/* Modal de Criação */}
      <div className={`${styles.modal} ${showModal ? styles.modalOpen : ''}`}>
        <div className={styles.modalContent}>
          <button
            className={styles.modalClose}
            onClick={() => {
              setShowModal(false);
              setError('');
              setFormData({ name: '', email: '', user_type: 'user' });
            }}
          >
            ✕
          </button>

          <div className={styles.modalHeader}>
            <h2>Criar Novo Usuário</h2>
          </div>

          <form onSubmit={handleSubmit}>
            {error && <div className={styles.errorMessage}>{error}</div>}

            <div className={styles.formGroup}>
              <label htmlFor="name">Nome *</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Digite o nome do usuário"
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="email">Email *</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Digite o email do usuário"
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="user_type">Tipo de Usuário</label>
              <select
                id="user_type"
                name="user_type"
                value={formData.user_type}
                onChange={handleInputChange}
              >
                <option value="user">Usuário</option>
                <option value="admin">Administrador</option>
                <option value="supervisor">Supervisor</option>
              </select>
            </div>

            <div className={styles.formActions}>
              <button
                type="submit"
                className={styles.btnPrimary}
                disabled={submitting}
              >
                {submitting ? 'Salvando...' : 'Criar Usuário'}
              </button>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => {
                  setShowModal(false);
                  setError('');
                  setFormData({ name: '', email: '', user_type: 'user' });
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

