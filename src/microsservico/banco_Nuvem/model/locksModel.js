const pool = require("../db_Config/dbNuvem.js");
/**
 * Busca o id_lock baseado no espID (MAC address do ESP32)
 * @param {string} espID - MAC address do ESP32 (ex: "AA:BB:CC:DD:EE:FF")
 * @returns {Promise<number|null>} id_lock ou null se não encontrado
 */
async function getLockByEspID(espID) {
    
    try {
        // Tenta buscar o lock pelo espID
        // O espID pode estar armazenado no campo 'name' ou 'esp_id'
        const result = await pool.query(
            `SELECT id_lock FROM locks 
             WHERE name = $1 
                OR name LIKE $2
                OR CAST(esp_id AS TEXT) = $1`,
            [espID, `%${espID}%`]
        );

        if (result.rows.length > 0) {
            return result.rows[0].id_lock;
        }
        
        return null;
    } catch (error) {
        console.error('Erro ao buscar lock por espID:', error.message);
        throw error;
    }
}



async function viewAllLocks() {
    const result = await pool.query("SELECT id_lock, name, station_id, esp_id, locks_type, broker_id FROM locks ORDER BY id_lock");
    return result.rows;
}

async function createLock({ name, station_id, esp_id, locks_type, broker_identifier }) {
    if (!pool) {
        throw new Error('Pool do banco de dados não está disponível. Verifique as variáveis de ambiente.');
    }

    let brokerIdToUse = null;
    if (broker_identifier) {
        const asNumber = Number(broker_identifier);
        if (!Number.isNaN(asNumber)) {
            brokerIdToUse = asNumber;
        } else {
            // Trata como IP e tenta criar/recuperar o broker
            const broker = await pool.query(
                `INSERT INTO brokers (ip_address)
                 VALUES ($1)
                 ON CONFLICT (ip_address) DO UPDATE SET ip_address = EXCLUDED.ip_address
                 RETURNING id_broker`,
                [String(broker_identifier)]
            );
            brokerIdToUse = broker.rows[0].id_broker;
        }
    }

    const result = await pool.query(
        `INSERT INTO locks (name, station_id, esp_id, locks_type, broker_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id_lock, name, station_id, esp_id, locks_type, broker_id`,
        [name, station_id, esp_id, locks_type, brokerIdToUse]
    );

    return result.rows[0];
}

module.exports = {
    viewAllLocks,
    createLock,
    getLockByEspID
};

