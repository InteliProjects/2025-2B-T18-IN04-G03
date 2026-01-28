const model = require("../model/serviceGroupsModel.js");

async function viewAllServiceGroups(req, res) {
    try {
        const groups = await model.viewAllServiceGroups();
        return res.status(200).json(groups);
    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: "erro no servidor", detalhes: error.message });
    }
}

async function createServiceGroup(req, res) {
    try {
        const { leader_name, group_password, member_ids, group_name } = req.body;

        if (!leader_name || !group_password || !member_ids || !Array.isArray(member_ids) || member_ids.length === 0) {
            return res.status(400).json({
                erro: "Dados obrigatórios ausentes",
                detalhes: "leader_name, group_password e member_ids são obrigatórios"
            });
        }

        const group = await model.createServiceGroup({
            leader_name,
            group_password,
            member_ids,
            group_name,
        });

        return res.status(201).json(group);
    } catch (error) {
        console.error("Erro ao criar grupo de serviço:", error);
        res.status(500).json({ erro: "erro no servidor", detalhes: error.message });
    }
}

module.exports = {
    viewAllServiceGroups,
    createServiceGroup,
};

