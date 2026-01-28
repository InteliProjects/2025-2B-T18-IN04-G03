const pool = require("../db_Config/dbNuvem.js");

if (!pool) {
    console.warn('Pool do banco não está disponível. Verifique as variáveis de ambiente.');
}

async function viewAllUsers() {
    if (!pool) {
        throw new Error('Pool do banco de dados não está disponível. Verifique as variáveis de ambiente.');
    }
    const result = await pool.query("SELECT id_user, name, email, user_type, created_at FROM users ORDER BY id_user");
    return result.rows;
}

async function createUser({ name, email, user_type }) {
    if (!pool) {
        throw new Error('Pool do banco de dados não está disponível. Verifique as variáveis de ambiente.');
    }

    const result = await pool.query(
        "INSERT INTO users (name, email, user_type) VALUES ($1, $2, $3) RETURNING id_user, name, email, user_type, created_at",
        [name, email, user_type || 'user']
    );

    return result.rows[0];
}

module.exports = {
    viewAllUsers,
    createUser,
};

