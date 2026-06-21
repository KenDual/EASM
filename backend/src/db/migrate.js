import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getDb } from './connection.js';
import logger from '../config/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, 'migrations');

export function runMigrations() {
    const db = getDb();

    db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      filename TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

    const applied = new Set(
        db
            .prepare('SELECT filename FROM _migrations')
            .all()
            .map((r) => r.filename)
    );

    const files = readdirSync(MIGRATIONS_DIR)
        .filter((f) => f.endsWith('.sql'))
        .sort();

    for (const file of files) {
        if (applied.has(file)) continue;
        const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf-8');
        db.transaction(() => {
            db.exec(sql);
            db.prepare('INSERT INTO _migrations (filename) VALUES (?)').run(file);
        })();
        logger.info({ file }, 'Migration applied');
    }
}

// Run directly: node src/db/migrate.js
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    import('dotenv/config').then(() => {
        runMigrations();
        logger.info('All migrations complete');
    });
}
