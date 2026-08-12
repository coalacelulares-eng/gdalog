# Plano de Endurecimento de Segurança

Este plano aborda as vulnerabilidades identificadas durante a auditoria manual, focando em RLS, XSS e integridade de autenticação.

## 1. Segurança do Banco de Dados (Supabase)
- **RLS Granular**: Refinar a tabela `app_state` para que cada usuário acesse apenas seus próprios dados.
- **Grants Explícitos**: Garantir que apenas funções necessárias sejam concedidas a `authenticated`.

## 2. Prevenção de Injeção (XSS)
- **Refatoração de CSS Inline**: Mover os estilos injetados via `dangerouslySetInnerHTML` em `src/routes/index.tsx` para o arquivo `src/styles.css` ou usar o sistema de utilitários do Tailwind.
- **Sanitização de Gráficos**: Revisar `src/components/ui/chart.tsx`.

## 3. Integridade de Usuários
- **Remoção de Persistência Insegura**: Parar de salvar a lista `system_users` como um blob JSON genérico em `app_state`.
- **Implementação de User Roles**: Criar uma estrutura de tabelas para gerenciar colaboradores de forma segura via `auth.users`.

## Detalhes Técnicos
- Migração SQL para adicionar `user_id` em `app_state`.
- Substituição de `void saveToDB("system_users", ...)` por gerenciamento via Supabase Auth.
- Remoção de tags `<style dangerouslySetInnerHTML>` no frontend.
