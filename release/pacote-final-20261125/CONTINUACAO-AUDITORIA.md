# Continuação da auditoria do NeoPep

As branches continuam a partir de `8e2fe515` (Teste) e `71e692bd` (Produção). Consulte [a matriz original](AUDITORIA-FINAL.md) para as referências Git, Vercel, Supabase e QA da rodada anterior. A tabela abaixo atualiza seu estado após a correção de escopo.

| Frente | Situação nesta rodada |
|---|---|
| A01 · Pacote 25/11 | Preservado nas respectivas bases. |
| A02 · Calculadora e frasco | Preservados com os testes existentes. |
| A03 · Capa automática da Biblioteca | Preservada. A captura no editor da Central foi reforçada em A11. |
| A04 · Cadastro | Homologação e PWA de Teste preservadas. Sem equivalente habilitado em Produção. |
| A05 · Contadores | Tema claro e contadores preservados. |
| A06 · Antes e Depois | JPEG adaptado ao tema preservado. |
| A07 · Atendimento da Loja | Atalho reutilizado preservado. |
| A08 · Campanhas manuais | Exclusão lógica implementada e ensaiada com vínculo explícito. Quatro registros encontrados em leitura, dois por ambiente, sem vínculo verificável pela Central ou pelo editor. A ação nesses registros depende de prova externa por ambiente para cadastro no novo contrato. |
| A09 · Publicação individual | Implementação anterior preservada e reensaiada em banco isolado. |
| A10 · Recorrência | Implementação anterior preservada e reensaiada em banco isolado. |
| A11 · Mídia WhatsApp | O editor gera JPEG a partir de um quadro útil do vídeo autorizado. Prévia de PDF e contrato privado JPEG com link preservados. PDF e MP4 originais ficam fora do escopo. |
| A12 · Grupos e status | Fluxos preservados, sem envio real. |
| A13 · Central 014 | Estrutura e fluxo de publicação preservados. Exclusão manual usa confirmação própria. |
| A14 · Etapas 001–011 | Implementações anteriores preservadas. |
| A15 · Connect Windows | Ambos reportam dispositivo aprovado recente em 0.2.13. Ledger de releases aprovados em Teste contém 0.2.12 e 0.2.13. Em Produção nenhum registro de distribuição 0.2.12–0.2.19 apareceu na consulta. Nenhuma compilação, assinatura ou distribuição iniciada. |
| A16 · PWA | Cache da aplicação e URLs do editor e da Central versionados. Atualização em PWA física ainda a validar. |
| A17 · Loja e finanças | Checkout, estoque, meios de pagamento e contratos oficiais preservados. |
| A18 · Biblioteca e visualizadores | Prévia de PDF e leitor preservados. Os testes de navegador são emulação Chromium, sem Safari físico. |

## Propriedade de campanha manual

`neo_private.campaigns` não oferece proprietário para o fluxo manual. Vínculos da Central, versões de editor e quem confirmou uma publicação são evidências de papéis distintos. A autoria não foi atribuída com base em atividade administrativa, conta atual, título ou recibo. Campanhas ligadas à Central ou a versões do editor usam seus próprios contratos.

`20261125224000_campaign_manual_delete.sql` cria um registro privado de associação e exclusão. O vínculo exige cadastro por operador de banco autorizado, com ID real de quem verificou, ID do proprietário, campanha e referência verificável de evidência. A tabela tem RLS e nenhum grant para público, anônimo, autenticado ou `service_role`. As RPCs mantêm a validação existente de administrador e emissor do JWT. O proprietário documentado deve confirmar a operação. Nenhum vínculo é criado automaticamente.

O contrato é restrito a campanhas manuais exclusivamente WhatsApp, com popup e push desativados. Há travas para serializar novos vínculos e publicações com a exclusão. A operação arquiva a campanha, cancela pendências manuais sem lote e grava a data e o autor da exclusão. Recebimentos, confirmações e registros já concluídos são preservados. Uma fila automatizada presente em estado aguardando, reservado, iniciado ou incerto impede a exclusão. Fazer nova chamada com o mesmo proprietário após exclusão devolve o mesmo resultado.

## Mídia e Connect

O editor usa acesso de visualização do material autorizado para capturar até três pontos do vídeo e rejeita quadros quase pretos. A imagem vai para o upload privado existente, com o limite JPEG de 1 MiB. O contrato de fila já instalado revalida o material e o JPEG, mantém a legenda e gera o link HTTPS do ambiente. Falha na extração permite escolher uma capa alternativa e impede salvar referência de vídeo sem capa quando o JPEG é necessário. O trabalho mantém a trilha de JPEG aprovada do PDF.

O Connect 0.2.13 é a referência observada e usa o protocolo existente de imagens. O protótipo de suporte a mídia original permanece recuperável no histórico em `6b7a4e7…c0a346f`. Essa linha inclui PDF e vídeo e precisa ser recortada e validada separadamente para qualquer preparação futura de vídeo no Windows. Nenhuma distribuição ou habilitação foi feita nesta rodada.

## Gates e procedimento de publicação

1. Revalidar o ledger e catálogo na conexão explicitamente selecionada de Teste ou Produção. As consultas somente leitura desta rodada confirmaram a ausência da coluna `campaign_central_publications.deleted_at`, do controle de colisão de vários horários e da tabela de propriedade manual nos dois ambientes. O pacote anterior consta como `20261125184208` em Teste e `20261125184400` em Produção.
2. Após autorização separada, executar o preflight e aplicar, em Teste, somente as migrações pendentes `20261125222000`, `20261125223000` e `20261125224000`, na ordem. Executar o postflight anterior, verificar a nova tabela e o gatilho de exclusão e executar a suíte de regressão. Não executar o diretório inteiro como um lote.
3. Cadastrar eventual associação de campanha manual apenas com evidência e autorização, mediante operação controlada de banco, registrando a referência mínima e preservando os dados anteriores. Ensaiar conta autorizada e outra administradora. A ausência de evidência mantém a ação indisponível naquela campanha.
4. Publicar Teste somente após aceitação, preservando Supabase e variáveis de homologação. Validar fluxo autenticado, preview de vídeo com autorização, PDF, iPhone/Safari/PWA instalada e fila de teste controlada. Nenhum disparo é necessário para os testes de edição, persistência e simulação.
5. Depois do aceite e da autorização de Produção, conferir os mesmos contratos e aplicar somente o delta necessário. Promover o SHA revisado, checar domínio, cache e integrações oficiais. Em recuperação, reverter o frontend com o filtro de exclusão preservado e aplicar correção incremental no banco, evitando reativar campanhas excluídas ou apagar auditoria. Em erro dentro da migração, a transação é revertida.
6. Push depende de confirmação efetiva de ausência de deployment automático. Os dois projetos Vercel continuam ligados ao Git, sem comando de ignorar build observado. O bloqueio do `vercel.json` foi preservado, mas sua eficácia para pushes nestas duas branches não foi comprovada no ambiente remoto. A entrega usa commits locais, patches e bundle recuperável.

Nenhuma mudança de banco remoto, merge, push, deploy, distribuição Windows ou envio de WhatsApp foi executada.
