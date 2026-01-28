const model = require("../model/usersModel.js");

async function viewAllUsers(req, res) {
    try {
        const users = await model.viewAllUsers();
        return res.status(200).json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: "erro no servidor", detalhes: error.message });
    }
}

async function createUser(req, res) {
    try {
        const { name, email, user_type } = req.body || {};

        if (!name || !email) {
            return res.status(400).json({ message: "Nome e email são obrigatórios" });
        }

        const user = await model.createUser({ name, email, user_type });
        return res.status(201).json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: "erro no servidor", detalhes: error.message });
    }
}

module.exports = {
    viewAllUsers,
    createUser,
};

