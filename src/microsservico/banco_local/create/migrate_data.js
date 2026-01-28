// migrate_data.js
require('dotenv').config();
const { Client } = require('pg');
const sqlite3 = require('sqlite3').verbose();

const SQLITE_PATH = 'controle_acesso.db';

const TABLE_ORDER = [
  'users',
  'service_groups',
  'brokers',
  'stations',
  'cards',
  'locks',
  'outsourced_group_members',
  'permissions',
  'access_logs'
];

function openSqlite(path) {
  return new sqlite3.Database(path);
}

function runSqlite(db, sql, params=[]) {
  return new Promise((res, rej) => {
    db.run(sql, params, function(err) {
      if (err) rej(err);
      else res(this);
    });
  });
}

async function migrate() {
  // Conexão Postgres (Supabase)
  const pg = new Client({
    host: process.env.PGHOST,
    port: process.env.PGPORT || 5432,
    database: process.env.PGDATABASE,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    ssl: { rejectUnauthorized: false } // Supabase pode exigir SSL
  });

  await pg.connect();
  console.log('Conectado ao Postgres.');

  // Abre SQLite
  const sqlite = openSqlite(SQLITE_PATH);
  console.log('SQLite aberto:', SQLITE_PATH);

  try {
    for (const table of TABLE_ORDER) {
      console.log(`\nMigrando tabela: ${table} ...`);

      // buscar todos os registros
      const res = await pg.query(`SELECT * FROM ${table}`);
      const rows = res.rows || [];
      console.log(`Encontrados ${rows.length} registros em ${table}.`);

      if (rows.length === 0) continue;

      // começar transação no sqlite
      await runSqlite(sqlite, 'BEGIN TRANSACTION;');

      // para cada linha, preparar e inserir
      for (const r of rows) {
        // Transformações:
        const transformed = {};

        for (const [k, v] of Object.entries(r)) {
          if (v === null || v === undefined) {
            transformed[k] = null;
          } else if (Array.isArray(v)) {
            // arrays do PG -> armazenar como JSON string
            transformed[k] = JSON.stringify(v);
          } else if (typeof v === 'boolean') {
            transformed[k] = v ? 1 : 0;
          } else if (v instanceof Date) {
            transformed[k] = v.toISOString();
          } else {
            // tenta detectar timestamp string (formato YYYY-..)
            if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T?\d{0,2}/.test(v)) {
              // mantemos string (SQLite aceita ISO 8601)
              transformed[k] = v;
            } else {
              transformed[k] = v;
            }
          }
        }

        const cols = Object.keys(transformed);
        const placeholders = cols.map(() => '?').join(',');
        const sql = `INSERT INTO ${table} (${cols.join(',')}) VALUES (${placeholders})`;
        const values = cols.map(c => transformed[c]);

        try {
          await runSqlite(sqlite, sql, values);
        } catch (insertErr) {
          console.error(`Erro inserindo linha em ${table}:`, insertErr.message);
          console.error('SQL:', sql);
        }
      } // fim rows loop

      await runSqlite(sqlite, 'COMMIT;');
      console.log(`Tabela ${table} migrada com sucesso.`);
    } // fim tabela loop

    console.log('\nMigração concluída.');
  } catch (err) {
    console.error('Erro durante a migração:', err);
    try { await runSqlite(sqlite, 'ROLLBACK;'); } catch(e) {}
  } finally {
    await pg.end();
    sqlite.close();
  }
}

migrate().catch(e => console.error(e));

//exporta a funcao migrate
module.exports = { 
  migrate
}
