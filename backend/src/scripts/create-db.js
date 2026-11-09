import mysql from 'mysql2/promise';
import { env } from '../config/env.js';

const conn = await mysql.createConnection({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  ssl: env.db.ssl ? { rejectUnauthorized: true } : undefined,
});

await conn.query(
  `CREATE DATABASE IF NOT EXISTS \`${env.db.name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`,
);
console.log(`Database ready: ${env.db.name}`);
await conn.end();
