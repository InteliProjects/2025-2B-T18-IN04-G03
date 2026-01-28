const model = require("../model/logsModel.js");


async function viewAllLogs(req, res) {
    try{
        const logs = await model.viewAllLogs();
        return res.status(200).json(logs)
    }
    catch(error){
        console.error(error)
        res.status(500).json({erro: "erro no servidor"}, error)
    }
}


async function insertLogs(req, res) {
    try {
        // Recebe os dados do body: { id_card, id_lock, user_id }
        const data = req.body;
        let entradaSaida;
        
        if(data.saida == "saida"){
            entradaSaida = "saida"
        }
        else{
            entradaSaida = "entrada"
        }

        const logs = await model.insertLogs(data, entradaSaida);
        return res.status(201).json(logs);
    }
    catch (error) {
        console.error("Erro no controller insertLogs:", error);
        return res.status(500).json({ erro: "Erro ao inserir log", detalhes: error.message });
    }
}




module.exports = { 
    insertLogs,
    viewAllLogs
};


