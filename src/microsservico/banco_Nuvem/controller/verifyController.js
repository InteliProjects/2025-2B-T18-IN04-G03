const model = require('../model/verifyModel');

// Função unificada de verificação que faz todas as verificações necessárias
async function verificarAcesso(req, res) {
    try {
        // Aceita tanto ID_RFID quanto id_card (compatibilidade)
        const id_card = req.body.ID_RFID || req.body.id_card;
        const { espID, HASH, id_lock } = req.body;

        console.log(`[VERIFY] Requisição recebida - ID_RFID: ${id_card}, espID: ${espID}, HASH: ${HASH?.substring(0, 20)}..., id_lock: ${id_lock}`);

        // Validação básica: precisa ter pelo menos id_card
        if (!id_card) {
            console.log(`[VERIFY] Campo id_card obrigatório não fornecido`);
            return res.status(400).json({
                "Acesso": "Deny",
                "ID_Broker": "ValidationServer_1",
                "espID": espID || "unknown",
                "motivo": "id_card obrigatório"
            });
        }

        let resultado = { acesso: false, motivo: 'Verificação não realizada' };

        // Caso 1: Verificação completa com hash e espID (verificação da ESP)
        if (HASH && espID) {
            console.log(`[VERIFY] Realizando verificação completa (hash + permissão)`);
            resultado = await model.verificarHashEPermissao(id_card, HASH, espID);
        }
        // Caso 2: Verificação apenas de permissão (quando id_lock é fornecido)
        else if (id_lock) {
            console.log(`[VERIFY] Realizando verificação de permissão`);
            const result = await model.verificarAutorização(id_card, id_lock);

            if (result.rows.length === 0) {
                resultado = { acesso: false, motivo: 'Sem permissão para este lock' };
            } else {
                resultado = { acesso: true, motivo: 'Acesso permitido' };
            }
        }
        // Caso 3: Dados insuficientes
        else {
            console.log(`[VERIFY] Dados insuficientes para verificação`);
            resultado = { 
                acesso: false, 
                motivo: 'Dados insuficientes. Forneça (HASH + espID) ou id_lock' 
            };
        }

        console.log(`[VERIFY] Resultado: ${resultado.acesso ? 'ACCEPT' : 'DENY'} - Motivo: ${resultado.motivo || 'N/A'}`);

        // Retorna a resposta no formato especificado
        const resposta = {
            "Acesso": resultado.acesso ? "Accept" : "Deny",
            "ID_Broker": "ValidationServer_1",
            "espID": espID || "unknown"
        };
        return res.status(200).json(resposta);

    } catch (error) {
        console.error('[VERIFY] Erro ao verificar acesso:', error);
        return res.status(500).json({
            "Acesso": "Deny",
            "ID_Broker": "ValidationServer_1",
            "espID": req.body?.espID || "unknown",
            "motivo": "Erro interno do servidor"
        });
    }
}

module.exports = {
    verificarAcesso
};