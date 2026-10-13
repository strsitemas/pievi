# Pievi Club — Next.js + PostgreSQL

Projeto reconstruído a partir do `index.html`, da planilha e do manual enviados. O site preserva o visual da landing page original; o catálogo público lê os produtos do PostgreSQL. O painel fica em `/admin`.

## Requisitos

- Node.js 20 ou superior
- PostgreSQL 14 ou superior

## Preparação

1. Crie um banco vazio chamado `pievi_club` no PostgreSQL.
2. Copie `.env.example` para `.env.local` e informe a conexão em `DATABASE_URL`.
3. Troque `SESSION_SECRET` por uma chave aleatória com pelo menos 32 caracteres.
4. Mantenha `SITE_URL=http://localhost:3000` durante o desenvolvimento local.
5. No terminal, dentro da pasta do projeto, execute:

```powershell
npm install
npm run db:migrate
npm run dev
```

Abra `http://localhost:3000`. No primeiro acesso, o painel solicitará a criação do administrador. O catálogo de demonstração aparece depois da migração. A planilha original está em `public/reference/`.

## Painel

- `/admin`: primeiro acesso, login e administração
- Peças: cadastro, edição e exclusão; imagens armazenadas no PostgreSQL
- Curadoria pública: mostra imagens cadastradas e categorias, sem preços, promoções ou indicação de disponibilidade
- WhatsApp: canal de contato para pedir informações; o site não conclui compras nem pagamentos
- Categorias: cadastro, renomeação e exclusão (categorias com peças precisam ser esvaziadas antes)
- Textos do site: título, descrição e links para WhatsApp e Instagram
- Importação: planilha Excel com uma aba `Catálogo` e colunas `categoria`, `marca`, `nome`, `tamanhos`, `status`, `foto` e `cor`
- Usuários: criação de contas de administrador e editor

## Segurança e produção

Senhas são armazenadas com bcrypt; a sessão usa cookie `HttpOnly`, `SameSite=Lax` e assinatura HMAC. Antes de publicar, configure `SITE_URL` com a origem HTTPS real e defina um `SESSION_SECRET` forte. Não publique `.env.local`. Crie backup do PostgreSQL antes de importar catálogo em produção.

As fotos enviadas pelo painel ficam no PostgreSQL, com limite de 5 MB por imagem. A importação XLSX importa os dados textuais e não baixa URLs de fotos externas; depois da importação, envie as fotos pelo cadastro/edição do painel. Itens sem foto não são exibidos na curadoria pública. Colunas de preço/oferta de versões anteriores podem continuar no banco por compatibilidade, mas não são usadas nem enviadas pela API pública.

## Conteúdo de referência

O manual e a planilha originais ficam em `public/reference/`. O site antigo foi copiado para `public/site.html` e modificado para carregar catálogo e links do banco.
