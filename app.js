const express = require('express');
const app = express()
require('dotenv').config();

const routes = require("./src/microsservico/banco_Nuvem/routes/routes.js");
app.use(express.json());

// CORS para permitir requisições do dashboard Next.js
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

app.use("/", routes);

app.listen(3001, ()=>{
    console.log("app rodando em localhost:3001");
});