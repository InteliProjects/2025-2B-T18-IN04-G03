'use client';

import { useEffect, useState } from 'react';
import { fetchCards, createCard } from '@/lib/api';
import type { Card } from '@/lib/api';
import styles from '../page.module.css';

export default function CardsPage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    id_card: '',
    card_type: 'rfid',
    user_id: '',
    group_id: '',
  });

  useEffect(() => {
    loadCards();
  }, []);

  const loadCards = async () => {
    try {
      setLoading(true);
      const data = await fetchCards();
      setCards(data);
    } catch (error) {
      console.error('Erro ao carregar cartões:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value === '' ? '' : name === 'user_id' || name === 'group_id' ? parseInt(value) || '' : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.id_card) {
      setError('ID do Cartão é obrigatório');
      return;
    }

    try {
      setSubmitting(true);
      const dataToSend = {
        id_card: formData.id_card,
        card_type: formData.card_type,
        user_id: formData.user_id ? parseInt(formData.user_id as any) : undefined,
        group_id: formData.group_id ? parseInt(formData.group_id as any) : undefined,
      };
      await createCard(dataToSend);
      setSuccess('Cartão criado com sucesso!');
      setFormData({ id_card: '', card_type: 'rfid', user_id: '', group_id: '' });
      setShowModal(false);
      setTimeout(() => {
        loadCards();
      }, 500);
    } catch (error: any) {
      setError(
        error.response?.data?.message || 'Erro ao criar cartão'
      );
      console.error('Erro ao criar cartão:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.loading}>Carregando cartões...</div>
    );
  }

  return (
    <>
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>Lista de Cartões ({cards.length})</h2>
          <button
            className={styles.btnAdd}
            onClick={() => setShowModal(true)}
          >
            + Adicionar Cartão
          </button>
        </div>

        {error && <div className={styles.errorMessage}>{error}</div>}
        {success && <div className={styles.successMessage}>{success}</div>}

        <div className={styles.tableContainer}>
          <table>
            <thead>
              <tr>
                <th>ID Cartão</th>
                <th>Tipo</th>
                <th>ID Usuário</th>
                <th>ID Grupo</th>
              </tr>
            </thead>
            <tbody>
              {cards.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>
                    Nenhum cartão encontrado
                  </td>
                </tr>
              ) : (
                cards.map((card) => (
                  <tr key={card.id_card}>
                    <td>{card.id_card}</td>
                    <td>
                      <span className={styles.badgeInfo}>{card.card_type}</span>
                    </td>
                    <td>{card.user_id || '-'}</td>
                    <td>{card.group_id || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal de Criação */}
      <div className={`${styles.modal} ${showModal ? styles.modalOpen : ''}`}>
        <div className={styles.modalContent}>
          <button
            className={styles.modalClose}
            onClick={() => {
              setShowModal(false);
              setError('');
              setFormData({ id_card: '', card_type: 'rfid', user_id: '', group_id: '' });
            }}
          >
            ✕
          </button>

          <div className={styles.modalHeader}>
            <h2>Criar Novo Cartão</h2>
          </div>

          <form onSubmit={handleSubmit}>
            {error && <div className={styles.errorMessage}>{error}</div>}

            <div className={styles.formGroup}>
              <label htmlFor="id_card">ID do Cartão *</label>
              <input
                type="text"
                id="id_card"
                name="id_card"
                value={formData.id_card}
                onChange={handleInputChange}
                placeholder="Digite o ID do cartão"
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="card_type">Tipo de Cartão</label>
              <select
                id="card_type"
                name="card_type"
                value={formData.card_type}
                onChange={handleInputChange}
              >
                <option value="rfid">RFID</option>
                <option value="nfc">NFC</option>
                <option value="mifare">Mifare</option>
                <option value="other">Outro</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="user_id">ID do Usuário (opcional)</label>
              <input
                type="number"
                id="user_id"
                name="user_id"
                value={formData.user_id}
                onChange={handleInputChange}
                placeholder="Digite o ID do usuário"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="group_id">ID do Grupo (opcional)</label>
              <input
                type="number"
                id="group_id"
                name="group_id"
                value={formData.group_id}
                onChange={handleInputChange}
                placeholder="Digite o ID do grupo"
              />
            </div>

            <div className={styles.formActions}>
              <button
                type="submit"
                className={styles.btnPrimary}
                disabled={submitting}
              >
                {submitting ? 'Salvando...' : 'Criar Cartão'}
              </button>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => {
                  setShowModal(false);
                  setError('');
                  setFormData({ id_card: '', card_type: 'rfid', user_id: '', group_id: '' });
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

