import { getDb } from '../db/connection.js';

export const assetRepository = {
    findAll({ page = 1, limit = 20 } = {}) {
        const db = getDb();
        const offset = (page - 1) * limit;
        const rows = db
            .prepare('SELECT * FROM assets ORDER BY created_at DESC LIMIT ? OFFSET ?')
            .all(limit, offset);
        const { total } = db.prepare('SELECT COUNT(*) as total FROM assets').get();
        return { data: rows, total, page, limit };
    },

    findById(id) {
        return getDb().prepare('SELECT * FROM assets WHERE id = ?').get(id) ?? null;
    },

    create({ id, name, type, status }) {
        const db = getDb();
        db.prepare('INSERT INTO assets (id, name, type, status) VALUES (?, ?, ?, ?)').run(
            id,
            name,
            type,
            status
        );
        return this.findById(id);
    },

    delete(id) {
        const { changes } = getDb().prepare('DELETE FROM assets WHERE id = ?').run(id);
        return changes > 0;
    },
};
