# Plano de Implementação: Agrupamento por Reboque e Compartilhamento Detalhado

Este plano detalha a implementação do agrupamento de despesas por tipo de reboque no relatório financeiro e a inclusão de detalhes dos reboques nos compartilhamentos via WhatsApp (Frota e Financeiro).

## Alterações Técnicas

### 1. Interface e Tipagem (`src/components/financial-report.tsx`)
- Atualizar `FinVehicle` para incluir o campo opcional `reboques: string[]`.

### 2. Lógica do Relatório Financeiro (`src/components/financial-report.tsx`)
- Modificar o `useMemo` de `byVehicle` para capturar os reboques do veículo correspondente.
- Criar um novo `useMemo` chamado `byTrailerType` que:
    - Mapeia as despesas, receitas e saldos de cada veículo para seus tipos de reboques.
    - Se um veículo tem múltiplos reboques (ex: "SIDER", "GRANELEIRA"), seus valores financeiros são atribuídos a cada categoria para análise comparativa.
    - Se não tem reboques, agrupa como "Sem Reboque".

### 3. Interface do Usuário (`src/components/financial-report.tsx`)
- Adicionar uma nova seção visual "Resultado por Tipo de Reboque" abaixo da "Apuração final de margem por placa".
- Esta seção exibirá uma tabela com: Tipo de Reboque, Receita, Despesa, Saldo e Margem %.

### 4. Compartilhamento via WhatsApp (`src/components/financial-report.tsx`)
- Atualizar a função `handleShareWhatsApp` no relatório financeiro para incluir o resumo por tipo de reboque no texto da mensagem.

### 5. Compartilhamento via WhatsApp na Frota (`src/routes/index.tsx`)
- Atualizar o botão de compartilhamento no card de veículo para incluir a lista de reboques selecionados na mensagem.

### 6. Integração de Dados (`src/routes/index.tsx`)
- Garantir que ao renderizar o `<FinancialReport />`, a lista de `vehicles` passada contenha a informação de `reboques`.

## Detalhes para o Usuário
- O sistema agora permitirá ver qual tipo de operação (Sider, Baú, etc.) é mais rentável.
- As mensagens enviadas para o WhatsApp serão mais completas, informando não apenas o caminhão, mas também quais implementos (reboques) ele está utilizando.
