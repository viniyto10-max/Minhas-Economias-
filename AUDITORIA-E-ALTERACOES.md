# Minhas Economias — relatório de auditoria e alterações

Data: 22/10/2026

## Alterações aplicadas neste pacote

1. **Conversão monetária (`src/lib/utils.ts`)**
   - Trata valores no formato brasileiro, como `R$ 1.234,56`, e decimais simples, como `1234.56`.
   - Valores inválidos passam a resultar em `NaN` para que possam ser rejeitados, em vez de serem silenciosamente convertidos em zero.

2. **Importação e normalização (`src/hooks/useLancamentos.ts`)**
   - O app não inicializa mais com transações fictícias.
   - Não substitui datas inválidas pela data atual.
   - Reconhece tipos de movimento conhecidos e ignora linhas malformadas, exibindo um aviso.
   - Um campo `Confirmado` vazio passa a ser tratado como não confirmado.
   - Valida o cache local e evita novas recargas disparadas por mudanças no array de lançamentos.
   - Mostra erro de sincronização em vez de substituir dados reais por dados de demonstração.

3. **Indicador de última sincronização**
   - As telas Home e Lançamentos mostram “Aguardando primeira sincronização” até a primeira leitura bem-sucedida.

4. **Envio de webhook (`src/services/webhookService.ts`)**
   - Remove o log do payload financeiro completo.
   - Exige HTTPS, exceto localhost em desenvolvimento.
   - Rejeita credenciais embutidas na URL, impede redirecionamentos e aplica timeout de 15 segundos.
   - Mantém mensagens de erro sem imprimir o conteúdo do lançamento.

5. **Configuração de integração (`ModalIntegracoes.tsx`)**
   - Salvar uma URL não significa mais que o webhook está conectado.
   - Valida a URL e diferencia configuração, teste bem-sucedido e falha.

6. **Service worker (`public/sw.js`)**
   - Só intercepta requisições GET de recursos estáticos da mesma origem.
   - Não armazena em cache APIs, páginas HTML, webhooks ou respostas externas.
   - Atualiza o nome do cache para invalidar caches antigos.

7. **Servidor (`server.ts` e `server.js`)**
   - Adiciona timeout à consulta da planilha, limite de tamanho da resposta e cabeçalhos contra cache/sniffing.
   - Não devolve mensagens técnicas brutas da origem ao cliente.
   - Permite configurar a URL da planilha via `SHEET_CSV_URL`.
   - Desativa o cabeçalho `X-Powered-By`.

## Riscos que ainda exigem ação externa ou mudança de arquitetura

### A. A planilha continua sendo uma publicação pública
O código original usa uma URL `docs.google.com/spreadsheets/d/e/.../pub`. Se a planilha tiver dados privados, qualquer pessoa que consiga a URL publicada poderá tentar lê-la. As alterações deste pacote não transformam uma publicação pública em privada.

**Ação:** desativar a publicação pública e substituir a leitura por Google Sheets API autenticada no servidor.

### B. A rota `/api/sheet-csv` ainda não tem autenticação de usuário
A rota continua entregando o CSV para compatibilidade com a aplicação. Os cabeçalhos e o timeout não são autenticação.

**Ação:** implementar autenticação e autorização no servidor antes de usar dados financeiros confidenciais. Não basta esconder a rota ou criar uma tela de login apenas no frontend.

### C. O webhook pode registrar parcelas parcialmente
O formulário ainda envia parcelas uma por uma. Uma falha no meio do envio pode deixar a compra incompleta, e uma nova submissão pode duplicar parcelas.

**Ação:** implementar identificador idempotente no destino (por exemplo, Make/planilha), persistir o estado de cada parcela e permitir retomar apenas as que faltaram. O endpoint receptor precisa reconhecer a mesma chave de idempotência; apenas o frontend não consegue garantir isso.

### D. Implantação e testes
Não foi possível executar `npm install`, o build ou o TypeScript checker neste ambiente porque as dependências do projeto não estavam instaladas e não havia uma instalação concluída. O ZIP precisa ser validado no ambiente de desenvolvimento antes de publicar.

## Antes de publicar

- Faça uma cópia de segurança da planilha.
- Teste leitura de dados reais, valores com e sem separador de milhar, datas válidas e inválidas, entradas/saídas e lançamentos pendentes.
- Teste o webhook com uma compra pequena de teste e verifique a planilha antes de repetir qualquer envio.
- Configure acesso privado à fonte de dados antes de inserir informações financeiras confidenciais.
- Rode `npm install`, `npm run lint` e `npm run build` no ambiente de destino.
