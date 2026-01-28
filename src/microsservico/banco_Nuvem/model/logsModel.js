const pool = require("../db_Config/dbNuvem.js")

async function viewAllLogs(){
    const result = await pool.query("SELECT * FROM access_logs ORDER BY access_time DESC");

    return result.rows
}

async function insertLogs(data, entradaSaida) {
    // Garante que o campo access_result esteja presente e com valor válido
    const access_result = (data && data.access_result === 'granted') ? data.access_result : 'denied';

    const result = await pool.query(
        `INSERT INTO access_logs(id_card, id_lock, user_id, access_result, entradaSaida) VALUES($1, $2, $3, $4, $5) RETURNING *`,
        [data.id_card, data.id_lock, data.user_id, access_result, entradaSaida]
    );

    return result.rows[0];
}

module.exports = {
    viewAllLogs,
    insertLogs,
};
