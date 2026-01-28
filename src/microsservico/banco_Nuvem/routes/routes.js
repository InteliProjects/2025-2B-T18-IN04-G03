const express = require("express");
const router = express.Router();

const logsController = require("../controller/logsController.js");
const verifyController = require("../controller/verifyController.js");
const usersController = require("../controller/usersController.js");
const cardsController = require("../controller/cardsController.js");
const locksController = require("../controller/locksController.js");
const stationsController = require("../controller/stationsController.js");
const serviceGroupsController = require("../controller/serviceGroupsController.js");
const permissionsController = require("../controller/permissionsController.js");

// Rotas para logs
router.post("/", logsController.insertLogs);
router.get("/", logsController.viewAllLogs);

// Rota unificada de verificação (faz todas as verificações necessárias)
router.post("/verify", verifyController.verificarAcesso);

// Rota para buscar id_lock baseado no espID
router.post("/getLockByEspID", locksController.getLockByEspID);

// Rotas para dashboard
router.get("/users", usersController.viewAllUsers);
router.post("/users", usersController.createUser);

router.get("/cards", cardsController.viewAllCards);
router.post("/cards", cardsController.createCard);
router.get("/locks", locksController.viewAllLocks);
router.post("/locks", locksController.createLock);
router.get("/stations", stationsController.viewAllStations);
router.get("/stations/:id", stationsController.viewStationDetail);
router.get("/service-groups", serviceGroupsController.viewAllServiceGroups);
router.post("/service-groups", serviceGroupsController.createServiceGroup);

// Permissões (em memória, apenas para o dashboard)
router.get("/permissions", permissionsController.listPermissions);
router.post("/permissions", permissionsController.createPermission);

module.exports = router
