# NeoPep — Auditoria do pacote de 25/11/2026

A auditoria distingue o HEAD no Git, a revisão servida pela Vercel e os contratos do Supabase. Nesta rodada, as mudanças ficaram em duas branches locais. Não houve push, merge, deploy ou mutação remota. Também não houve disparos, cobrança ou instalação do Connect.

| Ambiente | Base Git | Deployment ativo observado | Supabase |
|---|---|---|---|
| Teste | `ceec882d495a55be7946eeccdb563584cad3ee42`, homologação | `dpl_Eg5eoBGcdxzj7CWsR6D6QyWsaWFY`, `caa7ddd52eaef1b5684a97bfc48134c8e3597755` | `qnuluspqfazdppciermw` |
| Produção | `d7f9ffd415effddf8e7c57d52c4b7f321394928a`, main | `dpl_hRahRCoWxPAnZBiXs9cEmXQ4gjP2`, `e5bbb72dd609201a9ad78cd42468b842a5561360` | `cpslafpzjtbpmoxxysaa` |

As PRs #76, #79, #80, #81 e #82 já estão no Git de Teste, além do SHA efetivamente servido. A candidata de Produção acrescenta seletivamente #76, #81 e #82 à base oficial. O cadastro público de homologação e a identificação de Teste das PRs #79 e #80 permanecem exclusivos daquele ambiente. A lógica de checkout, pagamento, autenticação, notificações, estoque, IA, Edge Functions e as configurações oficiais permanecem nas respectivas bases.

## Matriz de aceitação

| Frente | Estado das candidatas e evidência | Falta validar ou implementar |
|---|---|---|
| A01 · Pacote de 25/11 | Bases das PRs #74 e #75 mantidas. Suíte da Central cobre consentimento, player neutro, prévia JPEG e link completo. Lotes anteriores constam no ledger dos dois Supabase. | Conferir o pacote acumulado em PWA instalada após eventual publicação. |
| A02 · Frasco e dosagens | PR #76 consolidada nas duas candidatas. `src/app.js`, `tests/vial-cover-regression.test.cjs`, `tests/ui.test.cjs`. Asserções cobrem associação explícita, três capacidades e última dosagem salva. | Conferência em iPhone físico. |
| A03 · Capa automática de vídeo | PR #76, `dist/library-files.js`, testes da Biblioteca e de geração de capa. | Validar codecs e vídeo privado real em Safari físico. |
| A04 · Cadastro | PRs #79 e #80 mantidas em Teste. Verificações do build de homologação e configuração de cadastro. | Cadastro completo com conta descartável no ambiente. |
| A05 · Contadores | PRs #81 e #82 consolidadas. `tests/notification-badges-light.test.cjs` cobre contraste e restauração visual. | Contadores reais por perfil e Realtime em dispositivos. |
| A06 · Exportação Antes/Depois | `src/app.js` e bundle `dist/app.js`. Paleta segue o tema efetivo do documento. O desenho escuro usa as cores originais. Prévia e saídas continuam a partir do mesmo JPEG. Teste executa a curva com as duas paletas. | Comparar o JPEG completo visualmente e validar compartilhamento/armazenamento autenticados. |
| A07 · Atendimento da Loja | `dist/shop.js` chama o mesmo `homeSupport` no catálogo. `tests/shop-ui.test.cjs` compara os dois atalhos e cobre fallback sem link e checkout simulado. | Toque no atalho em sessão real. |
| A08 · Campanhas legadas | Exclusão lógica da Central já instalada. Campanhas manuais residem em `neo_private.campaigns`, sem identificador de proprietário no esquema base. A fila manual tem confirmação e recorrência próprias. | Implementar exclusão das campanhas manuais com fonte de propriedade comprovada e política para filas manuais. |
| A09 · Exclusão de publicação | Nova migração, ação da Central e botão na Agenda. Preserva histórico e recibos, cancela estados aguardando/reservado e recusa envio iniciado. Série ativa precisa ser cancelada primeiro. PGlite cobre confirmação, repetição e registro de auditoria. | Aplicar migração autorizada e validar disputa worker/operador em infraestrutura real. |
| A10 · Recorrência | Contrato semanal existente ampliado para diária e semanal com até oito horários e 24 ocorrências, em São Paulo. Agendamento avulso mantém o fluxo existente. Prévia explícita, edição, pausa e cancelamento. PGlite cobre regra anterior, dois horários e repetição idempotente. | Ensaio concorrente em PostgreSQL independente e execução com Connect autorizado. O bloqueio de duplicação é conservador por publicação de origem e horário e cobre séries, sem reconciliar agendamentos avulsos independentes. |
| A11 · PDF e MP4 reais | Fluxo JPEG + link preservado. Protótipo recuperável em `6b7a4e7…c0a346f` abrange fila, Bridge e Windows. | Conciliar SQL do protótipo com JPEG, múltiplos grupos e worker oficial. Compilar/assinar candidato Windows, provar download privado e recibo com provedor simulado, depois homologar com autorização. |
| A12 · Grupos e status | Contratos de #64, #66 e #67 preservados. Testes isolados usam destinos sintéticos e recusam despacho sem presença. | Validar seleção múltipla e chegada de estados em iPhone com Connect de homologação. |
| A13 · Central 014 | Preservadas as implementações já integradas nas bases. Testes da Central cobrem criar, editar, duplicar, agendar e cancelar com simulação; A09 e A10 ampliam a Agenda. | A08 e A11 e validação autenticada de ponta a ponta. |
| A14 · Etapas 001–011 | Base preservada. Suítes de onboarding, tema, comparações, Biblioteca, Loja, seringa, financeiro e lote exercitam regressões dos módulos. | Homologação funcional autenticada transversal. Os ajustes #004 e #012 não foram incluídos. |
| A15 · Connect Windows | Contratos de presença e despacho mantidos. Referência operacional informada anteriormente é 0.2.12; o SQL do protótipo de mídia exige 0.2.14. | Confirmar versão realmente instalada e versão oficial assinada, logins isolados, CAPTCHA, duas sessões, atualização, QR, entrega/recibo. |
| A16 · Cache e carregamento | Chave de cache atualizada nos dois builds. `tests/staging-pwa.test.cjs` valida o manifesto e escopos de instalação da raiz e de `/neo/`. | Atualização sobre instalação física anterior, sem limpar dados. |
| A17 · Loja | Testes do catálogo e checkout com mocks e suítes SQL de visibilidade, gestão e estoque. `neo_shop_bulk_v1` e `neo_shop_reconciliation_v1` são dependências existentes. | Reembolso antes da expedição, integridade financeira e permissões com contas de homologação. |
| A18 · Player, PDF, Biblioteca, Fotos e Comunidade | Player imersivo, leitor PDF, Biblioteca privada e Comunidade permanecem nas duas bases. Suítes locais cobrem UI e resolução de permissões com fixtures. | Validar sessão autenticada, PWA real, fotos e Realtime, sem compartilhar dados de usuários. |

## Migrações e recuperação

O pacote de 25/11 já consta como `20261125184208` em Teste e `20261125184400` em Produção. As duas candidatas preservam os contratos existentes. A leitura remota encontrou `neo_campaign_weekly_v1(text,jsonb)` e confirmou a ausência de `campaign_central_publications.deleted_at` em ambos os ambientes. O inventário remoto desta rodada foi limitado aos contratos afetados diretamente.

Em `release/pacote-final-20261125/`:

1. `auditoria-final-preflight.sql` mostra objetos, coluna, privilégios e configuração de segurança usando leitura.
2. `20261125222000_campaign_publication_delete.sql` adiciona `deleted_at`, adapta a RPC e reforça o gatilho de despacho existente.
3. `20261125223000_campaign_recurrence_times.sql` amplia a RPC existente, preservando o formato antigo e o bloqueio por campanha.
4. `auditoria-final-postflight.sql` verifica os contratos e os grants. Nenhuma migração toca dados de pagamento, arquivos, flags de envio ou credenciais.

As migrações abortam em caso de definição incompatível. Em erro antes do commit, o PostgreSQL desfaz o lote. Depois de aplicado, preferir correção incremental e rollback do frontend com a renderização de exclusões preservada. Restaurar cegamente a RPC anterior faria publicações excluídas reaparecerem. Não limpar `deleted_at` nem alterar estados/recibos para desfazer a entrega. Se houver uso real de uma série, cancelar pendências usando o contrato vigente e preservar resultados iniciados, incertos ou aceitos.

## Procedimento futuro, após autorização

1. Confirmar em ambos os projetos Vercel as regras efetivas para as branches, ignorados de build, integração Git e workflows. Os nomes das duas candidatas estão em `git.deploymentEnabled: false`. Correlacionar o evento com os projetos antes de efetuar push.
2. Registrar o SHA, o deployment anterior de cada domínio e o plano de recuperação. Verificar novamente o ledger e as definições instaladas. Rodar preflight na conexão explicitamente selecionada, com `psql -X -v ON_ERROR_STOP=1 -f auditoria-final-preflight.sql`, usando autenticação do ambiente fora do comando.
3. Em Teste, depois dos gates funcionais, aplicar na ordem 222000 e 223000 pelo processo de migrações autorizado, registrar o ledger e executar postflight. Promover somente o SHA revisado pelo fluxo de Teste com marca d'água, projeto e Supabase exclusivos.
4. Validar perfis Free, Premium e administrativo, cache de PWA instalada, temas claro e escuro, JPEG exportado e compartilhado, catálogo e atendimento, campanhas legadas, exclusão de publicação, horários e recibos simulados. Validar no iPhone físico e no Connect se disponíveis.
5. Produção só após aceite, dependências fechadas e aprovação específica. Revalidar o catálogo e o ledger oficial, aplicar somente o delta necessário, rodar postflight, revisar a candidata derivada de `main` e promover um único artefato Vercel. Conferir domínio, SHA, cache, Auth e fluxos essenciais sem gerar transações. Manter despachos, workers e releases Windows nas configurações existentes.

## Bloqueios

- Implementação: remoção de campanhas manuais legadas (A08) e entrega de PDF/MP4 originais (A11).
- Banco: aprovação para aplicar as duas novas migrações e verificação do catálogo no momento da operação.
- QA: ensaio de concorrência dos contratos novos e validação autenticada de integrações. Os testes PGlite usam banco isolado.
- Validação humana: iPhone/Safari/PWA físicos, Windows e grupo WhatsApp real autorizado.
- Publicação: suspensa nesta rodada. Não houve tentativa para aferir a disponibilidade de deployment.

## Evidências locais

- Chromium desktop, iPhone 13 e Pixel 7 emulados passaram nos testes do editor e na abertura da miniatura e do leitor de PDF.
- A Central em navegador passou por criação, reabertura, duplicação e agendamento simulado com confirmação.
- A geração de JPEG no fluxo real da aplicação foi executada com fotos de exemplo. O pixel de fundo foi conferido nos temas claro e escuro. As duas imagens e as capturas do diálogo estão na pasta de evidências.
- A atualização offline do service worker foi validada separadamente.
- O teste de MP4 real em Chromium excedeu o tempo ao esperar os controles sumirem na primeira reprodução desktop. O roteiro completo de vídeo não passou.
