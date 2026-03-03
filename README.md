## Atlas Wallet Desktop – Instalação e uso

Esta é uma wallet desktop simples de Bitcoin (Atlas Wallet) construída em **Electron + TypeScript**.  
Ela é **não custodial**: a seed phrase fica somente com você e é criptografada localmente.

> **Aviso importante:** use esta wallet apenas para **testes e valores pequenos**.  
> Não é um produto auditado para uso em produção com grandes quantias.

---

### 1. Pré‑requisitos

- **Windows 10 ou superior**
- **Node.js + npm** instalados (versão LTS recomendada)  
  - Baixe em: `https://nodejs.org`

Depois de instalar o Node.js, abra um **Prompt de Comando** (cmd) novo para garantir que `node` e `npm` sejam reconhecidos.

---

### 2. Instalação das dependências

No Prompt de Comando, entre na pasta do projeto:

```bash
cd "C:\Users\Lucas Gabriel\Documents\bitcoin-wallet"
```

Instale as dependências:

```bash
npm install
```

---

### 3. Rodar em modo desenvolvimento

Ainda dentro da pasta do projeto:

```bash
npm run dev
```

Isso vai:

- Compilar o código TypeScript em modo *watch*.
- Abrir a aplicação Electron com a interface da wallet.

---

### 4. Gerar instalador para Windows

Para gerar um instalador `.exe` (usando **electron-builder**):

```bash
npm run dist
```

Ao final, o instalador será gerado na pasta:

```text
release\
```

Você pode copiar esse `.exe` para outro computador Windows e instalar a wallet normalmente.

---

### 5. Uso básico da wallet (com frase de recuperação)

1. **Criar nova carteira**
   - Na tela inicial, escolha “Criar carteira”.
   - Defina uma **senha** (mínimo 8 caracteres).
   - A aplicação vai exibir a **frase de recuperação (12 palavras)**.
   - Você precisa **confirmar 3 palavras** (posições aleatórias) para conseguir **salvar** a carteira.
   - Depois de salvar, a frase some da tela. Anote em papel e guarde em um local seguro. **Nunca tire print.**

2. **Restaurar carteira existente**
   - Na tela inicial, aba “Restaurar”.
   - Cole/digite sua seed phrase (12 ou 24 palavras).
   - Defina uma nova senha para criptografar o arquivo local.

3. **Bloqueio / desbloqueio**
   - A carteira fica **desbloqueada por alguns minutos** (padrão 5) e depois você precisa **desbloquear novamente** com a senha.
   - Você também pode clicar em **“Bloquear”** no topo da janela.

3. **Ver saldo e receber BTC**
   - Na tela de carteira, copie o **endereço Bitcoin** exibido.
   - Use esse endereço em outra wallet ou serviço para enviar BTC para cá.

4. **Enviar BTC**
   - Vá na seção “Enviar BTC”.
   - Informe o endereço de destino, o valor em BTC e a taxa em `sats/vbyte`.
   - Confirme o envio no aviso que aparecer.

---

### 6. Script de setup rápido (opcional)

Na raiz do projeto há um arquivo `setup.bat` que automatiza:

1. `npm install`
2. `npm run dist`

Para usar:

1. Clique duas vezes em `setup.bat` **ou**
2. Execute no Prompt de Comando dentro da pasta do projeto:

```bash
setup.bat
```

Ao terminar, o instalador estará na pasta `release\`.

