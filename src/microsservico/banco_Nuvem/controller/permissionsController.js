// Controlador simples de permissões para evitar erros 404 no dashboard.
// Neste momento ele não persiste em banco; apenas retorna dados em memória.

let inMemoryPermissions = [];
let nextId = 1;

async function listPermissions(req, res) {
    try {
        return res.status(200).json(inMemoryPermissions);
    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: "erro no servidor", detalhes: error.message });
    }
}

async function createPermission(req, res) {
    try {
        const { permission_name, description } = req.body || {};

        if (!permission_name) {
            return res.status(400).json({ message: "Nome da permissão é obrigatório" });
        }

        const perm = {
            id_permission: nextId++,
            permission_name,
            description: description || null,
            created_at: new Date().toISOString(),
        };

        inMemoryPermissions.push(perm);
        return res.status(201).json(perm);
    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: "erro no servidor", detalhes: error.message });
    }
}

module.exports = {
    listPermissions,
    createPermission,
};


