//import das bibliotecas
const mqtt = require('mqtt');

//banco de dados local
const databaseLocal = require('./banco_local/create/create_sqlite');
const criar_db = databaseLocal.criarSQLite

//banco de dados nuvem
const databaseNuvem = require("./banco_Nuvem/fetch/fetch");
const enviar_db_nuvem = databaseNuvem.enviar_log_nuvem;
const verificarUsuario = databaseNuvem.verificarUsuário;

criar_db();

// variaveis para iniciar o broker
const TOPICO_RECEBIMENTO = 'acesso/credenciais'; // todos os tópicos
// Usa variável de ambiente se disponível, senão usa o padrão
const BROKER_URL = process.env.BROKER_URL || 'mqtt://broker_mqtt:1883';

//conecta o broker
const broker = mqtt.connect(BROKER_URL);

//define como o código vai se comportar quando se conectar no servidor
broker.on('connect', ()=>{
    console.log('conectado');
    broker.subscribe(TOPICO_RECEBIMENTO, ()=>{
        console.log('conectado nos topicos');
    })
});

//define como o codigo vai se comportar quando recebe mensagem
broker.on('message', (topico, mensagem)=>{

    //Usa um try/catch para não afetar o funcionamento do código caso a mensagem não seja recebida em json
    try{
        
        // a mensagem do broker vem em buffer, aqui transforma a mensagem em JSON.
        let data = JSON.parse(mensagem.toString());

        //verifica usuário e publica resposta no MQTT
        verificarUsuario(data);
    }
    catch(error){
        console.error("Tipo de dado incorreto, erro ao converter para JSON", error);
    }
    
});


//caso ocorra joga o erro no console
broker.on('error', (err)=>{
    console.error("Erro de conexão",err);
});

//caso o servidor esteja conectando joga no console
broker.on('reconnect', ()=>{
    console.log('reconectando ao broker, aguarde a tentativa.');
});

//ao fechar o broker joga no console
broker.on('close', () => {
  console.log("Conexão com o broker encerrada.");
});