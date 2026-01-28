const axios = require("axios");
const mqtt = require("mqtt");
// URL da API - usa variável de ambiente se disponível (para Docker), senão usa localhost
const API_URL = process.env.BANCO_NUVEM_API_URL || "http://localhost:3001";

// Usa variável de ambiente se disponível, senão usa o padrão
const BROKER_URL = process.env.BROKER_URL || 'mqtt://broker_mqtt:1883';
const TOPICO = "acesso/credenciais"
//conecta o broker
const broker = mqtt.connect(BROKER_URL);

//mostra como o broker se comporta ao conectar, ou seja conecta no tópico
broker.on("connect", () => {
  console.log("conectado");
  broker.subscribe(TOPICO, () => {
    console.log("conectado nos topicos");
  });
});
//funcoes para requisitar a API do supabase
async function enviar_log_nuvem(data) {
  try {
    const payload = {
      id_card: data.id_card, //ID do cartão RFID
      id_lock: data.id_lock, // ID da fechadura/ESP
      user_id: data.user_id, // ID do usuário
    };

    //cria a variavel que lida com o fetch da restAPI e manda as informações do json que vem como parâmetro
    const response = await axios.post(`${API_URL}/postParam`, payload);

    console.log("Log enviado para banco na nuvem:", response.data);
    return response.data;
  } catch (error) {
    console.error("Erro ao enviar log para banco na nuvem:", error.message);
    if (error.response) {
      console.error("Detalhes do erro:", error.response.data);
    }
    return null;
  }
}

//funcao para chamar a apiREST que chama todos os logs
async function viewAllLogs() {
  try {
    const response = await axios.get(`${API_URL}/viewAllLogs`);
    return response.data;
  } catch (error) {
    console.error(error);
  }
}

// Função auxiliar para publicar a resposta no MQTT
function publicarRespostaMQTT(msg) {
  try {
    const TOPICO_RESPOSTA = "acesso/resposta/";
    const mensagem = JSON.stringify(msg);

    broker.publish(TOPICO_RESPOSTA, mensagem, (err) => {
      if (err) {
        console.error("Erro ao publicar resposta no MQTT:", err);
      } else {
        console.log(`Resposta publicada no tópico ${TOPICO_RESPOSTA}:`);
      }
    });
  } catch (error) {
    console.error("Erro ao publicar no MQTT:", error.message);
  }
}

/**
 * Registra o log de acesso no Supabase
 * Converte os dados do JSON MQTT para o formato da tabela access_logs
 */
async function registrarLogAcesso(data, resultadoVerificacao) {
  try {
    // Extrai informações do JSON MQTT
    const id_card = data.ID_RFID
    const espID = data.espID;

    // Determina o resultado do acesso (mais tolerante com formatos)
    const acessoField = resultadoVerificacao.Acesso
    const access_result = (acessoField === "Accept" || acessoField === "accept") ? "granted" : "denied";
    let saida = resultadoVerificacao.saida;
    if(saida != "saida"){
      saida = "entrada"
    }

    // Busca o id_lock baseado no espID
    let id_lock = null;
    try {
      const lockResponse = await axios.post(`${API_URL}/getLockByEspID`, {
        espID,
      });
      id_lock = lockResponse.data?.id_lock;
    } catch (err) {
      console.warn(
        `Não foi possível obter id_lock para espID ${espID}:`,
        err.message
      );
    }

    // Monta o payload para registrar o log
    const logPayload = {
      id_card: id_card,
      id_lock: id_lock,
      access_result: access_result,
      user_id: null, 
      group_id: null, 
      pin_validated: data.HASH ? 1 : 0,
      saida: saida
    };
    
    const response = await axios.post(`${API_URL}/`, logPayload);

    console.log(
      `[LOG] Acesso registrado no Supabase - Cartão: ${id_card}, Lock: ${id_lock}, Resultado: ${access_result}`
    );

    return response.data;
  } 
  catch (error) {
    console.error("[LOG] Erro ao registrar log de acesso:", error.message);
    if (error.response) {
      console.error("[LOG] Detalhes:", error.response.data);
    }
    return null;
  }
}

async function verificarUsuário(data) {
  try{
    // Extrai os dados necessários do payload MQTT
    // O formato esperado é: {ID_RFID, espID, HASH}
    const id_card = data.ID_RFID || data.id_card;
    const espID = data.espID;
    const HASH = data.HASH;
    if(data.saida == true){
      const resposta = {
        "Acesso": "Accept",
        "ID_Broker": "ValidationServer_1",
        "espID": espID,
        "saida": "saida"
      };

      // Publica a resposta no MQTT se o broker estiver disponível
      if (broker && broker.connected) {
        publicarRespostaMQTT(resposta);
        registrarLogAcesso(data, resposta)
      }

      return resposta;
    }


    // Valida se os campos obrigatórios estão presentes
    if (!id_card || !espID || !HASH) {
      console.error('Dados incompletos para verificação:', {
        id_card: !!id_card,
        espID: !!espID,
        HASH: !!HASH
      });
            
      const respostaNegada = {
        "Acesso": "Deny",
        "ID_Broker": "ValidationServer_1",
        "espID": espID || "unknown",
        "motivo": "Dados incompletos"
      };

      // Publica a resposta no MQTT se o broker estiver disponível
      if (broker && broker.connected) {
        publicarRespostaMQTT(respostaNegada);
      }

      return respostaNegada;
    }

    // Monta o payload para o endpoint /verify
    let payload = {
      id_card: id_card,  
      espID: espID,      
      HASH: HASH         
    };

    // Chama o endpoint /verify que faz todas as verificações:
    try {
      const response = await axios.post(`${API_URL}/verify`, payload);

      // Normaliza o objeto de resposta
      const resultado = response.data || { Acesso: "Deny", motivo: "Sem resposta" };

      // Log do resultado
      if (resultado.Acesso === "Accept") {
        console.log(`Acesso PERMITIDO - Cartão ${id_card} autorizado para ESP ${espID}`);
      } else {
        console.log(`Acesso NEGADO - Cartão ${id_card} não autorizado para ESP ${espID}`);
      }

      // Publica a resposta no tópico acesso/resposta
      if (broker && broker.connected) {
        publicarRespostaMQTT(resultado);
      } else {
        console.warn('Broker MQTT não disponível para publicar resposta');
      }

      // Registra o log de acesso (baseado no resultado da verificação)
      await registrarLogAcesso(data, resultado);

      return resultado;
    } catch (err) {
      console.error('Erro ao chamar /verify:', err.message);
      const respostaErro = {
        Acesso: "Deny",
        ID_Broker: "ValidationServer_1",
        espID: data?.espID || "unknown",
        motivo: err.message || "Erro na verificação",
      };

      // Registra e publica o log de erro
      await registrarLogAcesso(data, respostaErro);
      if (broker && broker.connected) {
        publicarRespostaMQTT(respostaErro);
      }
      return respostaErro;
    }
  }
    catch (error) {
      console.error("Erro ao verificar usuário:", error.message);
      if (error.response) {
        console.error("   Detalhes:", error.response.data);
    }
    // Registra o log de acesso (permitido ou negado)
    await registrarLogAcesso(data, response.data);

    // Publica a resposta no tópico acesso/resposta
    if (broker && broker.connected) {
      publicarRespostaMQTT(response.data);
    } else {
      console.warn("Broker MQTT não disponível para publicar resposta");
    }

    return response.data;
  }
}

//exporta as funcoes
module.exports = {
  enviar_log_nuvem,
  viewAllLogs,
  verificarUsuário,
};
