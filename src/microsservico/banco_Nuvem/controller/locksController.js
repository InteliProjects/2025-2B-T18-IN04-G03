const model = require("../model/locksModel.js");

/**
 * Controller para buscar id_lock baseado no espID
 */
async function getLockByEspID(req, res) {
    try {
        const { espID } = req.body;
        
        if (!espID) {
            return res.status(400).json({ 
                erro: "espID é obrigatório" 
            });
        }
        
        const id_lock = await model.getLockByEspID(espID);
        
        if (id_lock === null) {
            return res.status(404).json({ 
                erro: "Lock não encontrado para este espID",
                espID: espID
            });
        }
        
        return res.status(200).json({ 
            id_lock: id_lock,
            espID: espID
        });
        
    } catch (error) {
        console.error("Erro no controller getLockByEspID:", error);
        return res.status(500).json({ 
            erro: "Erro ao buscar lock", 
            detalhes: error.message 
        });
    }
}

async function viewAllLocks(req, res) {
    try {
        const locks = await model.viewAllLocks();
        return res.status(200).json(locks);
    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: "erro no servidor", detalhes: error.message });
    }
}

async function createLock(req, res) {
    try {
        const { name, station_id, esp_id, locks_type = 'sala', broker_id, broker_ip } = req.body;

        if (!name || !station_id || !esp_id) {
            return res.status(400).json({
                erro: "Dados obrigatórios ausentes",
                detalhes: "name, station_id e esp_id são obrigatórios"
            });
        }

        const newLock = await model.createLock({
            name,
            station_id,
            esp_id,
            locks_type,
            broker_identifier: broker_ip || broker_id
        });

        return res.status(201).json(newLock);
    } catch (error) {
        console.error("Erro ao criar sala/fechadura:", error);
        res.status(500).json({ erro: "erro no servidor", detalhes: error.message });
    }
}

module.exports = {
    viewAllLocks,
    createLock,
    getLockByEspID
  
};

