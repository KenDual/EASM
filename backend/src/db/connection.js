import Database from 'better-sqlite3';
import { env } from '../config/env.js';
import logger from '../config/logger.js';

let db;

export function getDb() {
    if (!db) {
        db = new Database(env.DB_PATH);
        db.pragma('journal_mode = WAL');
        db.pragma('foreign_keys = ON');
        logger.info({ path: env.DB_PATH }, 'Database connected');
    }
    return db;
}

export default getDb;
