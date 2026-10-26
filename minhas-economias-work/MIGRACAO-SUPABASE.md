# Migração do Minhas Economias para Supabase

## O que foi preparado
- Login OAuth com Google via Supabase Auth.
- Exibição do nome, e-mail e avatar da conta conectada.
- Leitura de lançamentos do Supabase com filtro pelo usuário autenticado.
- Salvamento de lançamentos e parcelas no Supabase; categorias são criadas por usuário quando necessário.
- Remoção do endpoint público `/api/sheet-csv`, que expunha a planilha publicada.
- Script de banco em `supabase/schema.sql`.

## Antes de publicar
1. Faça backup da planilha e do repositório.
2. No Supabase SQL Editor, revise e execute `supabase/schema.sql` no projeto correto.
3. Em Authentication > Providers, habilite Google e confira o callback OAuth mostrado pelo Supabase. No Google Cloud, cadastre esse callback como URI de redirecionamento autorizado.
4. Em Authentication > URL Configuration, configure a URL real do app como Site URL e adicione as URLs de produção e desenvolvimento em Redirect URLs.
5. Configure na hospedagem `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` (ou `VITE_SUPABASE_ANON_KEY`) com os valores do seu projeto e faça novo deploy.
6. Confirme que o lockfile usado pela hospedagem foi atualizado com `@supabase/supabase-js` e execute `npm install` e `npm run build` localmente. O ambiente desta revisão não conseguiu concluir a instalação de dependências, portanto o build ainda precisa ser validado.
7. Faça login com Google e teste criação, leitura, edição e exclusão de lançamentos com duas contas diferentes.
8. Só depois planeje a importação da planilha antiga. A migração de dados NÃO é automática neste pacote; mantenha a planilha intacta até comparar contagens e totais.

## Atenção
- Nunca use a chave `service_role` ou uma chave secreta em variável `VITE_`.
- O SQL usa `DROP TRIGGER` e `DROP POLICY IF EXISTS` apenas para recriar esses objetos de segurança; não apaga tabelas nem registros financeiros.
- A integração antiga de webhook deixa de ser usada para salvar lançamentos. O componente de configurações de webhook ainda pode ser removido numa limpeza posterior.
- Confirme os nomes dos campos e teste o build no seu ambiente antes de substituir a versão publicada.
