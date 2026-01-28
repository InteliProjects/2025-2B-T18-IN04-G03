# Inteli - Instituto de Tecnologia e Liderança

<p align="center">
<a href= "https://www.inteli.edu.br/"><img src="assets/inteli.png" alt="Inteli - Instituto de Tecnologia e Liderança" border="0" width=40% height=40%></a>
</p>

<br>

# Lock-in

## DesTremidos

## 👨‍🎓 Integrantes:

- <a href="https://www.linkedin.com/in/christian-de-carvalho-lawrence">Christian de Carvalho Lawrence</a>
- <a href="https://www.linkedin.com/in/vin%C3%ADcius-rangel-marques/">Vinícius Rangel Marques</a>
- <a href="https://www.linkedin.com/in/yan-de-oliveira-ribeiro-0a55a3356/">Yan de Oliveira Ribeiro</a>
- <a href="https://www.linkedin.com/in/wendel-feitosa-975bb1346/">Wendel Hebert Feitosa</a>
- <a href="https://www.linkedin.com/in/nicholas-millani-83a950357/">Nicholas Millani</a>
- <a href="https://www.linkedin.com/in/matheusscapolan/">Matheus Henrique Scapolan Silva</a>

## 👩‍🏫 Professores:

### Orientador(a)

- <a href="https://www.linkedin.com/in/fabiana-martins-de-oliveira-8993b0b2/">Fabiana Martins de Oliveira</a>

### Instrutores

- <a href="https://www.linkedin.com/in/gui-cestari/">Guilherme Henrique de Oliveira Cestari</a>
- <a href="https://www.linkedin.com/in/bryan-kano/">Bryan Kano Ferreira</a>
- <a href="https://www.linkedin.com/in/pedroteberga/">Pedro Martins Freire Teberga</a>
- <a href="https://www.linkedin.com/in/fernando-pizzo-208b526a/">Fernando Pizzo</a>
- <a href="https://www.linkedin.com/in/laizaribeiro/">Laíza Ribeiro Silva</a>

## 📜 Descrição

<br>

O **Lock-in** é um sistema inteligente de controle de acessos desenvolvido para a **TIC Trens**, destinado à gestão e monitoramento de entradas e saídas em áreas de alta criticidade, como subestações de energia e salas técnicas da infraestrutura ferroviária. A solução combina hardware embarcado (ESP32), comunicação IoT (MQTT), autenticação multifator e persistência de dados em nuvem (Supabase/PostgreSQL) e local (SQLite).

### 🎯 Objetivo

Garantir que apenas colaboradores devidamente autorizados e capacitados possam acessar ambientes técnicos sensíveis, assegurando conformidade com normas de segurança e protocolos operacionais da empresa, com rastreabilidade completa de todos os eventos de acesso.

### 🔐 Arquitetura de Segurança

**Autenticação Multifator (2FA):**

- **1ª Camada**: Leitura de cartão RFID corporativo (Mifare Classic 1K)
- **2ª Camada**: Validação de senha pessoal via keypad 4x3
- **Validação**: Hash SHA-256 da senha comparado com banco de dados

**Controle Físico:**

- Acionamento de relé para destrancamento temporizado (6 segundos)
- Feedback visual (LCD 16x2) e sonoro (buzzer)

### 🏗️ Arquitetura Técnica

**Hardware (Edge):**

- **ESP32 DevKit V1**: Microcontrolador com Wi-Fi integrado
- **RFID MFRC522**: Leitor 13.56 MHz (protocolo SPI)
- **Keypad 4x3**: Entrada de senha
- **LCD I2C 16x2**: Display de status (endereço 0x27)
- **Relé**: Controle de fechadura eletrônica

**Software (Backend):**

- **Broker MQTT (Mosquitto)**: Comunicação assíncrona entre ESP32 e servidor
- **Microserviços Node.js**: Processamento de autenticação e logs
- **API REST**: Interface com banco de dados Supabase (PostgreSQL)
- **SQLite Local**: Banco offline para redundância e cache
- **Docker Compose**: Orquestração de 3 containers (microsservico, banco_nuvem, broker_mqtt)

**Fluxo de Dados:**

```
ESP32 → MQTT (acesso/credenciais) → Broker → Microserviço → API REST → Supabase
                                                    ↓
                                              SQLite Local
```

### 📊 Registro e Rastreabilidade

Cada evento de acesso (permitido ou negado) é **automaticamente registrado** em duas camadas:

1. **Banco Nuvem (Supabase/PostgreSQL)**: Tabela `access_logs` com campos:

   - `id_card`: ID do cartão RFID
   - `id_lock`: ID da fechadura/ESP32
   - `access_time`: Timestamp do evento
   - `access_result`: "granted" ou "denied"
   - `user_id`, `group_id`, `pin_validated`: Metadados de autenticação

2. **Banco Local (SQLite)**: Espelho do banco nuvem para operação offline

**Conversão Automática JSON → SQL:**
O sistema converte automaticamente os dados do JSON MQTT (ID_RFID, espID, HASH) para o formato da tabela SQL, permitindo auditoria completa e geração de relatórios.

### 🚀 Benefícios

**Segurança Robusta**: Autenticação 2FA + validação física
**Rastreabilidade Total**: Logs automáticos de todos os acessos
**Operação Offline**: SQLite local garante funcionamento sem internet
**Escalabilidade**: Arquitetura de microserviços permite expansão
**Auditoria Completa**: Relatórios detalhados de quem, quando e onde
**Detecção de Emergências**: Sensor de fumaça com destrancamento automático

### 🎯 Impacto

O Lock-in moderniza a gestão de acessos da TIC Trens, substituindo processos manuais por uma solução automatizada, rastreável e escalável. A integração entre hardware embarcado, IoT e cloud computing garante segurança operacional, conformidade regulatória e otimização de recursos na infraestrutura ferroviária crítica.

Vídeo de demonstração do projeto: https://drive.google.com/file/d/1E5OgWNFiQVYJMdpRzCKIEIm0eK7Wbgi5/view?usp=sharing

<br>

## 📂 Estrutura de Pastas do Projeto

<br>

```
2025-2B-T18-IN04-G03/
│
├── assets/                          # Recursos visuais e mídia
│   ├── componentes/                 # Imagens de componentes eletrônicos
│   └── *.png, *.jpg, *.mp4         # Diagramas, fotos, vídeos de demonstração
│
├── document/                        # Documentação do projeto
│   ├── outros/                      # Documentos complementares
│   └── documentacao.md              # Documentação técnica principal
│
├── src/                             # Código-fonte do projeto
│   ├── firmware/                    # Código embarcado (ESP32)
│   │   ├── codigoEbarcado1.ino     # Firmware versão 1
│   │   └── codigoembarcado2.ino    # Firmware versão 2 (atual)
│   │
│   ├── microsservico/               # Microserviços backend
│   │   ├── banco_Nuvem/            # API REST - Supabase (PostgreSQL)
│   │   │   ├── controller/         # Controladores da API
│   │   │   │   ├── logsController.js
│   │   │   │   └── verifyController.js
│   │   │   ├── db_Config/          # Configuração do banco
│   │   │   │   └── dbNuvem.js
│   │   │   ├── fetch/              # Integração MQTT + API
│   │   │   │   └── fetch.js
│   │   │   ├── model/              # Modelos de dados
│   │   │   │   ├── logsModel.js
│   │   │   │   └── verifyModel.js
│   │   │   ├── routes/             # Rotas da API
│   │   │   │   └── routes.js
│   │   │   └── Dockerfile          # Container da API
│   │   ├── dasboard/               # Pasta mãe do dashboard
│   │   ├── banco_local/            # Banco SQLite local
│   │   │   └── create/
│   │   │       ├── controle_acesso.db
│   │   │       ├── create_sqlite.js
│   │   │       ├── migrate_data.js
│   │   │       └── schema.sql
│   │   │
│   │   ├── brokerSubscribe.js      # Subscriber MQTT principal
│   │   └── Dockerfile              # Container do microsserviço
│   │
│   └── mosquitto/                   # Broker MQTT
│       └── config/                  # Configurações do Mosquitto
│
├── app.js                           # Aplicação principal Node.js
├── compose.yaml                     # Docker Compose (orquestração)
├── Dockerfile                       # Container principal
├── package.json                     # Dependências Node.js
├── package-lock.json
├── controle_acesso.db              # Banco SQLite (gerado)
└── README.md                        # Este arquivo
```

<br>

### 📁 Descrição das Pastas Principais

#### `assets/`

Contém todos os **recursos visuais e de mídia** utilizados no projeto:

- Imagens de componentes eletrônicos
- Diagramas de arquitetura (UML, fluxogramas)
- Capturas de tela de testes
- Vídeos de demonstração (`.mp4`)
- Análises de negócio (SWOT, Porter, Canvas)
- Personas, jornadas de usuário e storyboards

---

#### `document/`

Diretório destinado à **documentação formal e técnica** do projeto:

- **`documentacao.md`**: Documentação técnica completa do projeto
- **`outros/`**: Documentos complementares, anotações e referências

---

#### `src/`

Pasta principal de **código-fonte** do projeto, dividida em três módulos:

##### `src/firmware/`

Código embarcado executado no **ESP32 DevKit V1**:

- **`codigoembarcado2.ino`**: Firmware atual com autenticação 2FA (RFID + senha)
- Integração com: RFID MFRC522, Keypad 4x3, LCD I2C, Sensor MQ-2, Relé
- Comunicação via MQTT com o broker

##### `src/microsservico/`

Arquitetura de microserviços backend:

**`banco_Nuvem/`** - API REST para Supabase (PostgreSQL):

- **`controller/`**: Lógica de negócio (logs, verificação de acesso)
- **`model/`**: Modelos de dados e queries SQL
- **`routes/`**: Endpoints da API REST
- **`fetch/`**: Integração MQTT + API (conversão JSON → SQL)
- **`db_Config/`**: Configuração de conexão com Supabase

**`banco_local/`** - Banco SQLite para operação offline:

- **`schema.sql`**: Estrutura das tabelas (espelho do Supabase)
- **`create_sqlite.js`**: Script de criação do banco
- **`migrate_data.js`**: Migração de dados

**`brokerSubscribe.js`**: Subscriber MQTT que recebe mensagens do ESP32 e processa autenticação

##### `src/mosquitto/`

Configurações do **broker MQTT Mosquitto** (containerizado)

---

#### `compose.yaml`

Arquivo de orquestração **Docker Compose** que gerencia 3 containers:

1. **microsservico**: Subscriber MQTT + lógica de negócio
2. **banco_nuvem**: API REST para Supabase
3. **broker_mqtt**: Broker Mosquitto

---

#### `app.js`

Aplicação principal Node.js que inicializa o sistema

---

### 🔧 Arquivos de Configuração

- **`package.json`**: Dependências Node.js (mqtt, axios, sqlite3, express, pg)
- **`Dockerfile`**: Imagem Docker do projeto
- **`controle_acesso.db`**: Banco SQLite gerado automaticamente

## 🔧 Instalação e Execução

Este guia apresenta os pré-requisitos e o passo a passo para executar o projeto em seu ambiente local.

---

### 📋 Pré-requisitos

Antes de iniciar, certifique-se de ter instalado:

#### Software Necessário:

| Software           | Versão Mínima        | Descrição                       |
| ------------------ | -------------------- | ------------------------------- |
| **Node.js**        | v18.0.0 ou superior  | Runtime JavaScript para backend |
| **Docker**         | v20.10.0 ou superior | Containerização dos serviços    |
| **Docker Compose** | v2.0.0 ou superior   | Orquestração de containers      |
| **Git**            | v2.30.0 ou superior  | Controle de versão              |
| **Arduino IDE**    | v2.0.0 ou superior   | Upload do firmware no ESP32     |

#### Hardware Necessário (para o protótipo físico):

- **ESP32 DevKit V1** (ESP-WROOM-32)
- **RFID MFRC522** (leitor 13.56 MHz)
- **Cartões Mifare Classic 1K**
- **Keypad 4x3**
- **LCD I2C 16x2** (endereço 0x27)
- **Módulo Relé 5V**
- **Buzzer Ativo 5V**
- **Protoboard e jumpers**
- **Fonte de alimentação 5V**

#### Serviços em Nuvem:

- **Conta Supabase** (PostgreSQL hospedado) - [supabase.com](https://supabase.com)
- **Credenciais de acesso ao banco** (fornecidas no `compose.yaml`)

---

### 🚀 Guia de Execução

#### **Passo 1: Clonar o Repositório**

```bash
git clone https://github.com/Inteli-College/2025-2B-T18-IN04-G03.git
cd 2025-2B-T18-IN04-G03
```

---

#### **Passo 2: Configurar Variáveis de Ambiente**

As variáveis de ambiente já estão configuradas no arquivo `compose.yaml`.

---

#### **Passo 3: Executar com Docker Compose (Recomendado)**

Este método inicia automaticamente os 3 serviços: **microsservico**, **banco_nuvem** (API REST) e **broker_mqtt**.

```bash
# Construir e iniciar os containers
docker-compose up --build

# Ou executar em segundo plano (detached mode)
docker-compose up -d --build
```

**Verificar se os serviços estão rodando:**

```bash
docker-compose ps
```

Você deve ver 3 containers ativos:

- `banco_nuvem_api` (porta 3001)
- `broker_mqtt` (porta 1883)
- `microsservico`

**Logs dos containers:**

```bash
# Ver logs de todos os serviços
docker-compose logs -f

# Ver logs de um serviço específico
docker-compose logs -f banco_nuvem
```

**Parar os serviços:**

```bash
docker-compose down
```

---

#### **Passo 4: Executar Localmente (Sem Docker)**

Se preferir executar sem Docker, siga estes passos:

**4.1. Instalar Dependências Node.js:**

```bash
npm install
```

Dependências instaladas:

- `mqtt` (v5.14.1) - Cliente MQTT
- `axios` (v1.13.2) - Requisições HTTP
- `express` (v5.1.0) - Framework web
- `pg` (v8.16.3) - Cliente PostgreSQL
- `sqlite3` (v5.1.7) - Banco local
- `dotenv` (v17.2.3) - Variáveis de ambiente

**4.2. Iniciar o Broker MQTT (Mosquitto):**

Instalar Mosquitto localmente
Windows: https://mosquitto.org/download/

Com o mosquitto instalado: abra o cmd e digite mosquitto -c "caminho da config mosquitto" -v

**4.3. Criar o Banco SQLite Local:**

```bash
cd src/microsservico/banco_local/create
node create_sqlite.js
```

Saída esperada:

```
Banco de dados SQLite criado com sucesso!
Tabelas criadas: users, cards, locks, access_logs, etc.
```

**4.4. Iniciar a API REST (banco_nuvem):**

```bash
cd src/microsservico/banco_Nuvem
node routes/routes.js
```

A API estará disponível em: `http://localhost:3001`

**4.5. Iniciar o Microserviço MQTT:**

```bash
cd src/microsservico
node brokerSubscribe.js
```

Saída esperada:

```
Conectado ao broker MQTT
Assinado no tópico: acesso/credenciais
```

---

#### **Passo 5: Configurar e Carregar o Firmware no ESP32**

**5.1. Abrir o Arduino IDE**

**5.2. Instalar Bibliotecas Necessárias:**

Vá em **Sketch → Include Library → Manage Libraries** e instale:

- `MFRC522` (by GithubCommunity)
- `LiquidCrystal_I2C` (by Frank de Brabander)
- `Keypad` (by Mark Stanley)
- `PubSubClient` (by Nick O'Leary)
- `ArduinoJson` (by Benoit Blanchon)

**5.3. Configurar a Placa ESP32:**

- Vá em **File → Preferences**
- Em "Additional Board Manager URLs", adicione:
  ```
  https://dl.espressif.com/dl/package_esp32_index.json
  ```
- Vá em **Tools → Board → Boards Manager**
- Procure por "ESP32" e instale **esp32 by Espressif Systems**
- Selecione **Tools → Board → ESP32 Dev Module**

**5.4. Configurar Wi-Fi e MQTT no Firmware:**

Abra o arquivo `src/firmware/codigoembarcado2.ino` e edite:

```cpp
// Configurações Wi-Fi (linhas ~30-31)
const char* WIFI_SSID = "SEU_WIFI_AQUI";
const char* WIFI_PASSWORD = "SUA_SENHA_AQUI";

// Configurações MQTT (linhas ~35-36)
const char* MQTT_SERVER = "SEU_IP_DO_BROKER";  // Ex: "192.168.1.100"
const int MQTT_PORT = 1883;
```

**5.5. Conectar o ESP32 e Fazer Upload:**

- Conecte o ESP32 via USB
- Selecione a porta em **Tools → Port**
- Clique em **Upload** (seta →)

**5.6. Monitorar Serial:**

- Abra **Tools → Serial Monitor** (115200 baud)
- Você verá mensagens de conexão Wi-Fi e MQTT

---

#### **Passo 6: Testar o Sistema**

**6.1. Verificar Conexões:**

```bash
# Testar API REST
curl http://localhost:3001/

# Testar broker MQTT (se tiver mosquitto_pub instalado)
mosquitto_pub -h "IP DO BROKER" -t "acesso/credenciais" -m '{"ID_RFID":"123","espID":"AA:BB:CC:DD:EE:FF","HASH":"test"}'
```

**6.2. Testar Autenticação com RFID:**

1. Aproxime um cartão RFID do leitor
2. Digite a senha no keypad
3. Pressione `#` para confirmar
4. Observe o LCD e o relé

**6.3. Verificar Logs no Supabase:**

Acesse o painel do Supabase e verifique a tabela `access_logs` para ver os registros de acesso.

---

### 📚 Recursos Adicionais

#### Manual de Instruções Completo:

[Click aqui para acessar o manual detalhado](https://docs.google.com/document/d/14e_mGTY-lcXRuED1yVxyHp7KY-1CXsFu/edit)

#### Endpoints da API REST:

- `POST /verify` - Verificar acesso (RFID + senha)
- `POST /` - Inserir log de acesso
- `GET /` - Listar todos os logs
- `POST /getLockByEspID` - Buscar tranca por espID

#### Tópicos MQTT:

- **Publicação (ESP32)**: `acesso/credenciais`
- **Assinatura (ESP32)**: `acesso/resposta/`

---

### ✅ Checklist de Instalação

- [ ] Node.js instalado (v18+)
- [ ] Docker e Docker Compose instalados
- [ ] Repositório clonado
- [ ] Containers Docker rodando (`docker-compose ps`)
- [ ] Broker MQTT ativo (porta 1883)
- [ ] API REST ativa (porta 3001)
- [ ] Banco SQLite criado
- [ ] Firmware carregado no ESP32
- [ ] ESP32 conectado ao Wi-Fi
- [ ] ESP32 conectado ao broker MQTT
- [ ] Teste de autenticação realizado com sucesso

## 🗃 Histórico de lançamentos

- 0.5.0 - 19/12/2025
  ```
    ├── Protótipo final
    ├── Publicação
  ```
- 0.4.0 - 05/12/2025
```
    ├── Entregas da sprint 4
        ├── Manual de instruções
        ├── Arquitetura do protótipo aprimorada
```
- 0.3.0 - 19/11/2025
```
    ├── Entregas da Sprint 3
        ├── Protótipo com conexão mqtt e i2c
        ├── Arquitetura da solução
        ├── Circuito RC
```
- 0.2.0 - 07/11/2025
```
    ├── Entregas da Sprint 2:
        ├── Primeiro protótipo físico(offline)
        ├── Requisitos não funcionais
        ├── Jornada do usuário
```
- 0.1.0 - 24/10/2025

```
    ├── Entregas da Sprint 1:
        ├── 5 Forças de Porter
        ├── Analise SWOT
        ├── Matriz de Risco
        ├── Descrição da Solução
        ├── Requisitos Funcionais
        ├── Bill of Materials
        ├── Protótipo no simulador Wokwi
        ├── Personas
        └── Modelo da LGPD
```

<br>

## 📋 Licença/License

<a href="https://github.com/Inteli-College/2025-2B-T18-IN04-G03">LOCK-in</a> © 2025 by <a href="https://github.com/Inteli-College/2025-2B-T18-IN04-G03">INTELI, Christian de Carvalho Lawrence, Matheus Henrique Scapolan Silva, Wendel Hebert Feitosa, Nicholas Millani, Vinícius Rangel Marques, Yan de Oliveira Ribeiro</a> is licensed under <a href="https://creativecommons.org/licenses/by/4.0/">Creative Commons Attribution 4.0 International</a><img src="https://mirrors.creativecommons.org/presskit/icons/cc.svg" style="max-width: 1em;max-height:1em;margin-left: .2em;"><img src="https://mirrors.creativecommons.org/presskit/icons/by.svg" style="max-width: 1em;max-height:1em;margin-left: .2em;">
