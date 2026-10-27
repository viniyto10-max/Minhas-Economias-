# Minhas Economias 💰

Aplicativo completo de gestão de finanças pessoais, moderno, seguro e responsivo. Desenvolvido em React, Vite, Tailwind CSS e integrado ao Supabase para autenticação e persistência de dados em tempo real.

---

## 🚀 Funcionalidades

- **Autenticação com Google (Supabase Auth)** com controle de sessão e isolamento total entre usuários.
- **Onboarding no Primeiro Acesso**: Cadastro inicial de responsáveis e cartões/contas.
- **Gestão de Lançamentos**: Adição, edição e exclusão de lançamentos simples e parcelados (com opção de alterar ou apagar parcelas individuais ou em série).
- **Filtros Dinâmicos**: Filtragem por tipo (Entrada/Saída), categoria, responsável, forma de pagamento e status de confirmação.
- **Análises e Gráficos**: Visão mensal e comparativa com resumos de receitas, despesas, sobra, projeção e maiores gastos.
- **Exportação de Dados**: Download de dados em CSV protegido contra injeção de fórmulas.
- **Privacidade e LGPD**: Exclusão definitiva da conta e dados pelo próprio usuário, páginas públicas de Política de Privacidade e Termos de Uso.
- **PWA e Suporte Offline**: Instalável como aplicativo nativo no celular e desktop.

---

## 🛠️ Tecnologias Utilizadas

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide React, Recharts, Framer Motion.
- **Backend & Banco de Dados**: Supabase (PostgreSQL + RLS + Edge Functions + Auth).

---

## 📋 Tabelas do Supabase

O banco de dados utiliza Row Level Security (RLS) para garantir o isolamento absoluto por `user_id`:

1. `profiles`: Perfis dos usuários (`id`, `full_name`, `email`, `avatar_url`, `onboarded_at`, `created_at`).
2. `transactions`: Lançamentos financeiros (`id`, `user_id`, `data_hora`, `movimento`, `descricao`, `valor`, `category_id`, `responsavel_id`, `payment_method_id`, `banco`, `responsavel`, `confirmado`, `created_at`).
3. `categories`: Categorias de receitas e despesas (`id`, `user_id`, `nome`, `tipo`, `cor`, `icone`, `created_at`).
4. `responsaveis`: Responsáveis pelos lançamentos (`id`, `user_id`, `nome`, `cor`, `created_at`).
5. `payment_methods`: Formas de pagamento, cartões e contas (`id`, `user_id`, `nome`, `tipo`, `cor`, `created_at`).

---

## 💻 Como Rodar Localmente

### Pré-requisitos
- Node.js 18 ou superior
- Uma conta no Supabase com o projeto configurado

### Passo a Passo

1. **Instale as dependências**:
   ```bash
   npm install
   ```

2. **Configure as Variáveis de Ambiente**:
   Crie um arquivo `.env.local` na raiz do projeto com as credenciais do seu projeto Supabase:
   ```env
   VITE_SUPABASE_URL=https://seu-projeto.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sua-chave-anon-publica
   ```

3. **Inicie o Servidor de Desenvolvimento**:
   ```bash
   npm run dev
   ```
   Acesse no navegador: `http://localhost:3000`

---

## 🌐 Como Publicar na Vercel

1. Suba o código para um repositório no **GitHub**.
2. Acesse o painel da [Vercel](https://vercel.com) e clique em **New Project**.
3. Importe o repositório do projeto.
4. Em **Environment Variables**, adicione:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
5. Em **Build and Output Settings**, garanta as configurações padrão:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
6. Clique em **Deploy**.

> **Nota para o Login Google**: Adicione o domínio da Vercel (ex: `https://seu-app.vercel.app`) em **Authentication > URL Configuration > Redirect URLs** no seu painel do Supabase.

---

## 📄 Licença

Este projeto é disponibilizado sob a licença MIT.
