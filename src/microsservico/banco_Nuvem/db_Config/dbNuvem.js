require('dotenv').config();

const { Pool } = require('pg');

// Valida se as variáveis de ambiente necessárias estão definidas
if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_DATABASE) {
  console.warn('Variáveis de ambiente do banco não configuradas. Pool não será criado.');
  console.warn(' DB_HOST, DB_USER e DB_DATABASE são obrigatórias.');
  // Exporta null para evitar erros, mas o código que usar precisa verificar
  module.exports = null;
} else {
  const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT) || 5432, 
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
  });

  // Testa a conexão de forma assíncrona (não bloqueia)
  pool.connect()
    .then(client => {
      console.log('Conectado ao banco de dados PostgreSQL');
      client.release();
    })
    .catch(err => {
      console.error('Erro ao conectar ao banco de dados:', err.message);
      console.error('   Verifique as credenciais e se o banco está acessível.');
    });

  module.exports = pool;
}
