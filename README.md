# Ezern Admin (simplificado)

Painel administrativo enxuto: autenticação JWT, gestão de usuários e dashboard base.

## Stack

- **Backend:** Node.js, Express, Sequelize, MySQL, JWT
- **Frontend:** React, Vite, Tailwind, Tabler Icons, Google Fonts
- **Extras essenciais:** Microsoft Graph (e-mail), Azure Blob (arquivos)

## Setup

```bash
cd ezern_admin
cp backend/.env.example backend/.env   # ajuste DB_* e JWT_SECRET
npm install
npm run db:create
npm run seed
npm run dev
```

- Web: http://localhost:5173  
- API: http://localhost:3001  

## Produção

```bash
npm run build
NODE_ENV=production npm start
```

A API serve o build do frontend quando `SERVE_WEB=true`.
