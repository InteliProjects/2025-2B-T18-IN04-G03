const pool = require('../db_Config/dbNuvem');

async function verificarAutorização(id_card, id_lock){
    if (!pool) {
        throw new Error('Pool do banco de dados não está disponível. Verifique as variáveis de ambiente.');
    }
    const result = await pool.query(
        "SELECT * FROM permissions WHERE id_card = $1 AND lock_id = $2", 
        [id_card, id_lock]
        
    )
    return result
}

async function verificarHashEPermissao(id_card, HASH, espID) {
    if (!pool) {
        throw new Error('Pool do banco de dados não está disponível. Verifique as variáveis de ambiente.');
    }
    try {
        // Primeiro, busca o id_lock baseado no espID (MAC address)
        // O espID é um MAC address (ex: "AA:BB:CC:DD:EE:FF")
        // Tentando diferentes formas de mapear o espID para id_lock
        // Pode estar armazenado como string no campo name ou como integer em esp_id
        const lockResult = await pool.query(
            `SELECT id_lock FROM locks 
             WHERE name = $1 
                OR name LIKE $2
                OR CAST(esp_id AS TEXT) = $1`,
            [espID, `%${espID}%`]
        );

        if (lockResult.rows.length === 0) {
            return { acesso: false, motivo: 'Lock não encontrado para este espID' };
        }

        const id_lock = lockResult.rows[0].id_lock;

        // Busca o cartão pelo ID_RFID
        // Assumindo que ID_RFID pode ser o id_card (integer) ou um identificador relacionado
        // Vou tentar buscar como integer primeiro, depois como string
        let cardResult;
        const idRfidInt = parseInt(id_card);
        
        if (!isNaN(idRfidInt)) {
            // Tenta buscar como integer (id_card)
            cardResult = await pool.query(
                `SELECT id_card, card_password_hash 
                 FROM cards 
                 WHERE id_card = $1`,
                [idRfidInt]
            );
        }
        
        // Se não encontrou como integer, tenta outras formas
        if (!cardResult || cardResult.rows.length === 0) {
            cardResult = await pool.query(
                `SELECT id_card, card_password_hash 
                 FROM cards 
                 WHERE CAST(id_card AS TEXT) = $1`,
                [id_card]
            );
        }

        if (!cardResult || cardResult.rows.length === 0) {
            return { acesso: false, motivo: 'Cartão não encontrado' };
        }

        const card = cardResult.rows[0];

        // Verifica se o hash corresponde
        if (!card.card_password_hash || card.card_password_hash !== HASH) {
            return { acesso: false, motivo: 'Hash não corresponde' };
        }

        // Busca as permissões do cartão para este lock
        const permissionResult = await pool.query(
            `SELECT id_permission
             FROM permissions
             WHERE id_card = $1 AND lock_id = $2`,
            [card.id_card, id_lock]
        );

        if (permissionResult.rows.length === 0) {
            return { acesso: false, motivo: 'Sem permissão para este lock' };
        }

        // Todas as verificações passaram (hash e permissão)
        return { 
            acesso: true, 
            id_card: card.id_card,
            id_lock: id_lock
        };

    } catch (error) {
        console.error('Erro ao verificar hash e permissão:', error);
        throw error;
    }
}


module.exports = {
    verificarAutorização,
    verificarHashEPermissao
}