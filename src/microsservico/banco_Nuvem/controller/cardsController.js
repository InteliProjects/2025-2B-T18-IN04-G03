const model = require("../model/cardsModel.js");

async function viewAllCards(req, res) {
    try {
        const cards = await model.viewAllCards();
        return res.status(200).json(cards);
    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: "erro no servidor", detalhes: error.message });
    }
}

async function createCard(req, res) {
    try {
        const { id_card, card_type, user_id, group_id } = req.body || {};

        if (!id_card) {
            return res.status(400).json({ message: "ID do cartão é obrigatório" });
        }

        const card = await model.createCard({
            id_card,
            card_type,
            user_id,
            group_id,
        });

        return res.status(201).json(card);
    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: "erro no servidor", detalhes: error.message });
    }
}

module.exports = {
    viewAllCards,
    createCard,
};

