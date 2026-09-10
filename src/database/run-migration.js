import fs from 'fs';
import path from 'path';
import sequelize from '../config/database.js';

// Runs every pending *.sql file in /migrations exactly once,
// tracked in the schema_migrations table.
// Usage:
//   node src/database/run-migration.js                    (run all pending)
//   node src/database/run-migration.js <file-name.sql>     (run one file if pending)

const MIGRATIONS_DIR = path.join(process.cwd(), 'migrations');

const ensureTrackingTable = async () => {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
};

const getAppliedFiles = async () => {
  const rows = await sequelize.query('SELECT filename FROM schema_migrations;', {
    type: sequelize.QueryTypes.SELECT
  });
  return new Set(rows.map((r) => r.filename));
};

const runMigration = async () => {
  const onlyFile = process.argv[2];

  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    await ensureTrackingTable();
    const applied = await getAppliedFiles();

    if (!fs.existsSync(MIGRATIONS_DIR)) {
      console.log('No migrations directory found, nothing to do.');
      process.exit(0);
    }

    let files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();

    if (onlyFile) {
      if (!files.includes(onlyFile)) {
        console.error(`Migration file not found: ${onlyFile}`);
        process.exit(1);
      }
      files = [onlyFile];
    }

    const pending = files.filter((f) => !applied.has(f));

    if (pending.length === 0) {
      console.log('No pending migrations, database is up to date.');
      process.exit(0);
    }

    for (const file of pending) {
      console.log(`Applying migration: ${file}...`);
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      await sequelize.query(sql);
      await sequelize.query('INSERT INTO schema_migrations (filename) VALUES (:filename);', {
        replacements: { filename: file }
      });
      console.log(`Applied: ${file}`);
    }

    console.log('All migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

runMigration();
