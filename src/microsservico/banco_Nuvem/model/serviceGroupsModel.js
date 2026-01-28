const crypto = require('crypto');
const pool = require("../db_Config/dbNuvem.js");

if (!pool) {
    console.warn('Pool do banco não está disponível. Verifique as variáveis de ambiente.');
}

async function viewAllServiceGroups() {
    if (!pool) {
        throw new Error('Pool do banco de dados não está disponível. Verifique as variáveis de ambiente.');
    }
    const result = await pool.query("SELECT id_group, group_name, leader_user_id FROM service_groups ORDER BY id_group");
    return result.rows;
}

async function ensureLeaderUser(leader_name) {
    // Procura um usuário existente com o mesmo nome
    const existing = await pool.query(
        "SELECT id_user FROM users WHERE name = $1 ORDER BY id_user LIMIT 1",
        [leader_name]
    );

    if (existing.rows.length > 0) {
        return existing.rows[0].id_user;
    }

    // Cria um usuário mínimo para representar o líder (apenas para manter integridade)
    const safeEmail = `${leader_name.toLowerCase().replace(/\s+/g, '.')}+leader${Date.now()}@example.com`;
    const created = await pool.query(
        "INSERT INTO users (name, email, user_type) VALUES ($1, $2, $3) RETURNING id_user",
        [leader_name, safeEmail, 'leader']
    );

    return created.rows[0].id_user;
}

async function createServiceGroup({ leader_name, group_password, member_ids, group_name }) {
    if (!pool) {
        throw new Error('Pool do banco de dados não está disponível. Verifique as variáveis de ambiente.');
    }

    const candidateLeader = Array.isArray(member_ids) && member_ids.length > 0
        ? parseInt(member_ids[0], 10)
        : null;

    let leader_user_id = null;
    if (!Number.isNaN(candidateLeader ?? NaN)) {
        const leaderCheck = await pool.query(
            "SELECT id_user FROM users WHERE id_user = $1 LIMIT 1",
            [candidateLeader]
        );
        if (leaderCheck.rows.length > 0) {
            leader_user_id = candidateLeader;
        }
    }

    if (!leader_user_id) {
        leader_user_id = await ensureLeaderUser(leader_name);
    }
    const password_hash = crypto.createHash('sha256').update(group_password).digest('hex');
    const finalGroupName = group_name || `Grupo de ${leader_name}`;

    const group = await pool.query(
        `INSERT INTO service_groups (group_name, leader_user_id, group_password_hash)
         VALUES ($1, $2, $3)
         RETURNING id_group, group_name, leader_user_id`,
        [finalGroupName, leader_user_id, password_hash]
    );

    const createdGroup = group.rows[0];

    if (Array.isArray(member_ids)) {
        for (const rawId of member_ids) {
            const memberId = parseInt(rawId, 10);
            if (Number.isNaN(memberId)) continue;
            try {
                await pool.query(
                    `INSERT INTO outsourced_group_members (id_group, user_id)
                     VALUES ($1, $2)
                     ON CONFLICT DO NOTHING`,
                    [createdGroup.id_group, memberId]
                );
            } catch (error) {
                console.warn(`Não foi possível vincular o usuário ${memberId} ao grupo ${createdGroup.id_group}:`, error.message);
            }
        }
    }

    return {
        ...createdGroup,
        member_ids,
    };
}

module.exports = {
    viewAllServiceGroups,
    createServiceGroup,
};

