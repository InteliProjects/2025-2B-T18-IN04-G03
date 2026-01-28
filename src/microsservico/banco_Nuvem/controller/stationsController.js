const model = require("../model/stationsModel.js");

async function viewAllStations(req, res) {
    try {
        const stations = await model.viewAllStations();
        return res.status(200).json(stations);
    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: "erro no servidor", detalhes: error.message });
    }
}

async function viewStationDetail(req, res) {
    try {
        const stationId = parseInt(req.params.id, 10);
        if (Number.isNaN(stationId)) {
            return res.status(400).json({ erro: "ID da estação inválido" });
        }

        const stationData = await model.viewStationDetail(stationId);

        if (!stationData) {
            return res.status(404).json({ erro: "Estação não encontrada" });
        }

        return res.status(200).json(stationData);
    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: "erro no servidor", detalhes: error.message });
    }
}

module.exports = {
    viewAllStations,
    viewStationDetail,
};

