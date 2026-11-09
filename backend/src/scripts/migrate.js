import { connectDb } from '../db/index.js';
import { syncModels } from '../models/index.js';

await connectDb();
await syncModels();
console.log('Migração concluída.');
process.exit(0);
