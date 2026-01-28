const pool = require("../db_Config/dbNuvem.js");

if (!pool) {
    console.warn('Pool do banco não está disponível. Verifique as variáveis de ambiente.');
}

async function viewAllCards() {
    if (!pool) {
        throw new Error('Pool do banco de dados não está disponível. Verifique as variáveis de ambiente.');
    }
    const result = await pool.query("SELECT id_card, card_type, user_id, group_id FROM cards ORDER BY id_card");
    return result.rows;
}

async function createCard({ id_card, card_type, user_id, group_id }) {
    if (!pool) {
        throw new Error('Pool do banco de dados não está disponível. Verifique as variáveis de ambiente.');
    }

    const result = await pool.query(
        "INSERT INTO cards (id_card, card_type, user_id, group_id) VALUES ($1, $2, $3, $4) RETURNING id_card, card_type, user_id, group_id",
        [id_card, card_type || 'rfid', user_id || null, group_id || null]
    );

    return result.rows[0];
}

module.exports = {
    viewAllCards,
    createCard,
};

