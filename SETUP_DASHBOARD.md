# Guia de Configuração do Dashboard

## Problema: API não está conectando

O erro `ERR_CONNECTION_REFUSED` na porta 3001 indica que a API backend não está rodando.

## Solução Passo a Passo

### 1. Criar arquivo `.env` na raiz do projeto

Crie um arquivo `.env` na raiz do projeto (mesmo nível do `package.json`) com o seguinte conteúdo:

```env
# Configurações do Banco de Dados PostgreSQL (Supabase)
DB_HOST=aws-1-sa-east-1.pooler.supabase.com
DB_PORT=5432
DB_USER=postgres.wdopoyvobeoyclxwfndr
DB_PASSWORD=desTREMidos
DB_DATABASE=postgres
DB_SSL=true

# Configurações do Broker MQTT (opcional para o dashboard)
BROKER_URL=mqtt://localhost:1883

# URL da API (para o microsserviço)
BANCO_NUVEM_API_URL=http://localhost:3001
```

### 2. Instalar dependências (se ainda não instalou)

```bash
npm install
```

### 3. Iniciar a API Backend

Em um terminal, execute:

```bash
npm run api
```

Ou diretamente:

```bash
node app.js
```

Você deve ver a mensagem: `app rodando em localhost:3001`

### 4. Instalar dependências do Dashboard

Em outro terminal, execute:

```bash
cd src/dashboard
npm install
```

### 5. Iniciar o Dashboard

Ainda no diretório `src/dashboard`, execute:

```bash
npm run dev
```

Ou da raiz do projeto:

```bash
npm run dashboard
```

### 6. Acessar o Dashboard

Abra o navegador em: `http://localhost:3000`

## Verificação

- ✅ API rodando na porta 3001
- ✅ Dashboard rodando na porta 3000
- ✅ Arquivo `.env` criado com as credenciais corretas
- ✅ Banco de dados acessível (verifique as credenciais do Supabase)

## Troubleshooting

### Se a API não conectar ao banco:

1. Verifique se as credenciais do `.env` estão corretas
2. Verifique se o banco Supabase está acessível
3. Verifique se a porta 3001 não está sendo usada por outro processo

### Se o dashboard não carregar dados:

1. Verifique se a API está rodando (`http://localhost:3001`)
2. Teste manualmente: `curl http://localhost:3001/` (deve retornar os logs)
3. Verifique o console do navegador para erros de CORS

### Se houver erros de CORS:

O CORS já está configurado no `app.js`. Se ainda houver problemas, verifique se a API está realmente rodando.

## Estrutura de Terminais

Você precisa de **2 terminais**:

**Terminal 1 - API:**
```bash
npm run api
```

**Terminal 2 - Dashboard:**
```bash
npm run dashboard
```

