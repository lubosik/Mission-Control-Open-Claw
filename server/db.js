import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, 'db', 'mission-control.db');
const db = new Database(dbPath);

// Initialize schema
const schema = readFileSync(join(__dirname, 'db', 'schema.sql'), 'utf-8');
db.exec(schema);

console.log('✅ Database initialized at:', dbPath);

export default db;
