const pool = require("../db_Config/dbNuvem.js");

if (!pool) {
    console.warn('Pool do banco não está disponível. Verifique as variáveis de ambiente.');
}

async function viewAllStations() {
    if (!pool) {
        throw new Error('Pool do banco de dados não está disponível. Verifique as variáveis de ambiente.');
    }
    const result = await pool.query("SELECT id_station, name, broker_id FROM stations ORDER BY id_station");
    return result.rows;
}

async function viewStationDetail(stationId) {
    if (!pool) {
        throw new Error('Pool do banco de dados não está disponível. Verifique as variáveis de ambiente.');
    }

    const stationResult = await pool.query(
        "SELECT id_station, name, broker_id FROM stations WHERE id_station = $1 LIMIT 1",
        [stationId]
    );

    if (stationResult.rows.length === 0) {
        return null;
    }

    const locksResult = await pool.query(
        "SELECT id_lock, name, station_id, esp_id, locks_type, broker_id FROM locks WHERE station_id = $1 ORDER BY id_lock",
        [stationId]
    );

    const logsResult = await pool.query(
        `SELECT *
         FROM access_logs
         WHERE id_lock IN (SELECT id_lock FROM locks WHERE station_id = $1)
         ORDER BY access_time DESC`,
        [stationId]
    );

    const deniedAccesses = logsResult.rows.filter((log) => (log.access_result || '').toLowerCase() === 'denied' || log.access_result === 'Deny').length;
    const activeUsers = new Set(logsResult.rows.map((log) => log.user_id).filter(Boolean)).size;

    return {
        station: stationResult.rows[0],
        locks: locksResult.rows,
        logs: logsResult.rows,
        stats: {
            operational_locks: locksResult.rows.length,
            active_users: activeUsers,
            denied_accesses: deniedAccesses,
            total_accesses: logsResult.rows.length,
        }
    };
}

module.exports = {
    viewAllStations,
    viewStationDetail,
};

