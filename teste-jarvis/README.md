# J.A.R.V.I.S - Sistema de Controle de Recepção

## 📋 Descrição

O **J.A.R.V.I.S** (Jarvis Assistant) é um sistema completo de controle de recepção desenvolvido em Next.js, projetado para gerenciar visitantes em ambientes corporativos ou institucionais. O sistema oferece funcionalidades avançadas de cadastro, check-in/check-out, controle de capacidade de salas e logs detalhados de todas as operações.

## ✨ Funcionalidades Principais

### 🔐 Sistema de Autenticação
- **Login/Registro**: Sistema completo de autenticação com CPF e senha
- **Proteção de Rotas**: Middleware para proteger páginas restritas
- **Sessões Seguras**: Gerenciamento de tokens JWT
- **Logs de Acesso**: Registro detalhado de todas as ações dos usuários

### 👥 Gestão de Visitantes
- **Cadastro Completo**: Nome, CPF, sala destino, data de nascimento e email
- **Máscara de CPF**: Formatação automática durante a digitação
- **Validação de Dados**: Verificação de campos obrigatórios e formatos
- **Busca por CPF**: Localização rápida de visitantes existentes

### 🏢 Controle de Salas
- **5 Salas Disponíveis**: Sistema limitado a 5 salas (Sala 1 a Sala 5)
- **Capacidade Limitada**: Máximo de 3 visitantes por sala
- **Status em Tempo Real**: Visualização do status de ocupação de cada sala
- **Validação de Capacidade**: Impede check-in quando sala está cheia

### 📊 Sistema de Check-in/Check-out
- **Check-in Simples**: Processo rápido para visitantes existentes
- **Check-out Automático**: Registro de saída com timestamp
- **Histórico Completo**: Rastreamento de todas as entradas e saídas
- **Cálculo de Duração**: Tempo total de permanência por visitante

### 🗂️ Gerenciamento de Dados
- **Visitantes Ativos**: Lista em tempo real dos visitantes presentes
- **Visitantes Inativos**: Gerenciamento de registros antigos
- **Exclusão Segura**: Remoção apenas de visitantes que fizeram check-out
- **Histórico Detalhado**: Log completo de todas as operações

### 📈 Logs e Relatórios
- **Logs do Sistema**: Registro detalhado de todas as ações
- **Estatísticas**: Contadores de visitantes ativos, totais e checkouts
- **Rastreabilidade**: IP, user agent e timestamp de cada ação
- **Interface de Consulta**: Visualização organizada dos logs

## 🛠️ Tecnologias Utilizadas

- **Frontend**: Next.js 14, React, TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: SQLite com Prisma ORM
- **Autenticação**: JWT (JSON Web Tokens)
- **Validação**: Zod
- **Fonte Personalizada**: GoodTiming (arquivo .otf)

## 🚀 Como Executar o Projeto

### Pré-requisitos
- Node.js 18+ instalado
- npm ou yarn

### Passo a Passo

1. **Clone o repositório**
   ```bash
   git clone [URL_DO_REPOSITORIO]
   cd teste-jarvis
   ```

2. **Instale as dependências**
   ```bash
   npm install
   # ou
   yarn install
   ```

3. **Configure o banco de dados**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. **Adicione os arquivos necessários**
   - Coloque o arquivo `good timing bd.otf` na pasta `public/`
   - Coloque o arquivo `background.jpg` na pasta `public/`

5. **Execute o projeto**
   ```bash
   npm run dev
   # ou
   yarn dev
   ```

6. **Acesse a aplicação**
   - Abra [http://localhost:3000](http://localhost:3000) no navegador

## 📁 Estrutura do Projeto

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx          # Página de login
│   │   └── register/page.tsx       # Página de registro
│   ├── api/
│   │   ├── auth/                   # APIs de autenticação
│   │   ├── visitors/               # APIs de visitantes
│   │   └── system/                 # APIs do sistema
│   ├── controle/
│   │   └── page.tsx                # Página principal do sistema
│   ├── globals.css                 # Estilos globais
│   ├── layout.tsx                  # Layout principal
│   └── page.tsx                    # Página inicial
├── lib/
│   ├── auth.ts                     # Utilitários de autenticação
│   ├── logger.ts                   # Sistema de logs
│   └── prisma.ts                   # Configuração do Prisma
├── middleware.ts                   # Middleware de proteção
└── prisma/
    └── schema.prisma               # Schema do banco de dados
```

## 🎨 Características Visuais

### Design System
- **Fonte Personalizada**: GoodTiming para identidade visual única
- **Paleta de Cores**: Azul (#6c91bf) e roxo (#602080) como cores principais
- **Background**: Imagem de fundo fixa para todas as páginas
- **Barras de Rolagem**: Estilização personalizada com transparência
- **Responsividade**: Design adaptável para diferentes tamanhos de tela

### Interface
- **Glassmorphism**: Efeitos de transparência e blur
- **Animações**: Transições suaves e feedback visual
- **Toast Notifications**: Mensagens de sucesso e erro com timeout
- **Loading States**: Indicadores visuais durante operações

## 🔧 Configurações

### Variáveis de Ambiente
Crie um arquivo `.env.local` na raiz do projeto:
```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="sua_chave_secreta_aqui"
```

### Banco de Dados
O sistema utiliza SQLite por padrão. Para migrar o banco:
```bash
npx prisma migrate dev
```

## 📱 Funcionalidades por Página

### Página Inicial (`/`)
- Logo J.A.R.V.I.S com fonte personalizada
- Botões de acesso ao sistema
- Redirecionamento automático baseado no status de login

### Login (`/login`)
- Formulário com máscara de CPF
- Validação em tempo real
- Redirecionamento após autenticação

### Registro (`/register`)
- Cadastro de novos usuários
- Validação de dados
- Campos obrigatórios e opcionais

### Controle (`/controle`)
- Dashboard principal do sistema
- Status das salas em tempo real
- Todas as funcionalidades de gestão

## 🔒 Segurança

- **Autenticação JWT**: Tokens seguros para sessões
- **Middleware de Proteção**: Rotas protegidas automaticamente
- **Validação de Dados**: Verificação de entrada em todas as APIs
- **Logs de Auditoria**: Rastreamento completo de ações
- **Sanitização**: Limpeza de dados de entrada

## 📊 Monitoramento

O sistema inclui logs detalhados para:
- Login/logout de usuários
- Criação, edição e exclusão de visitantes
- Check-in e check-out
- Acessos ao sistema
- Erros e exceções

## 🤝 Contribuição

Para contribuir com o projeto:
1. Faça um fork do repositório
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT.

---

**Desenvolvido com ❤️ para facilitar o controle de recepção e gestão de visitantes.**
