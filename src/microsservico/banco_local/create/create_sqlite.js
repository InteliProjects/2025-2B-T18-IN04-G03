// create_sqlite.js
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const { migrate } = require('./migrate_data');
const PATH_DB = 'controle_acesso.db';
const SCHEMA_FILE = 'src/microsservico/banco_local/create/schema.sql';

//funcao que verifica a existencia do banco - caso exista não cria outro.
function criarSQLite() {
  //verifica se o banco esta nos arquivos
  const exists = fs.existsSync(PATH_DB);
  //instancia o banco se existente ou cria o mesmo
  const db = new sqlite3.Database(PATH_DB, (err) => {
    if (err) return console.error('Erro abrindo/criando DB:', err.message);

    //caso ele exista printa no console que ele ja existe e fecha a requisição local
    if (exists) {
      console.log('Banco já existe:', PATH_DB);
      db.close();
      return;
    }
    //caso contrário ele cria o banco
    console.log('Banco criado:', PATH_DB);

    const schema = fs.readFileSync(SCHEMA_FILE, 'utf8');

    // executa o código sql identico ao banco da nuvem
    db.exec('PRAGMA foreign_keys = ON;\n' + schema, (err) => {
      
      if (err) console.error('Erro executando schema:', err);
    
      else console.log('Schema executado com sucesso!');
    
      db.close();

      // replica todas as informações guardadas no banco da nuvem
      migrate();
    });
  });
}

module.exports = {
  criarSQLite
}
