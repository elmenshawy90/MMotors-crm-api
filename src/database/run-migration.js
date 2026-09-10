
import fs from 'fs';
import path from 'path';
import sequelize from '../config/database.js';

const MIGRATIONS_DIR = path.join(process.cwd(), 'migrations');

// ─── Tracking table ───────────────────────────────────────────────────────────

const ensureTrackingTable = async () => {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename   VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      checksum   VARCHAR(64)
    );
  `);
};

const getAppliedFiles = async () => {
  const rows = await sequelize.query(
    'SELECT filename FROM schema_migrations ORDER BY applied_at;',
    { type: sequelize.QueryTypes.SELECT }
  );
  return new Set(rows.map((r) => r.filename));
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getMigrationFiles = () => {
  if (!fs.existsSync(MIGRATIONS_DIR)) return [];
  return fs.readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort(); 
};

const simpleChecksum = (content) => {
  // checksum 
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    hash = (Math.imul(31, hash) + content.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
};

const formatDuration = (ms) =>
  ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`;

// ─── Main ─────────────────────────────────────────────────────────────────────

const runMigration = async () => {
  const args = process.argv.slice(2);
  const onlyFile  = args.find((a) => a.endsWith('.sql'));
  const showStatus = args.includes('--status');

  try {
    await sequelize.authenticate();
    console.log('✔ Database connected');

    await ensureTrackingTable();
    const applied = await getAppliedFiles();

    const allFiles = getMigrationFiles();

    // ── Status mode ──────────────────────────────────────────────────────────
    if (showStatus) {
      console.log('\nMigration status:');
      if (allFiles.length === 0) {
        console.log('  No migration files found in /migrations');
      } else {
        for (const f of allFiles) {
          const state = applied.has(f) ? '✔ applied' : '○ pending';
          console.log(`  ${state}  ${f}`);
        }
      }
      const pending = allFiles.filter((f) => !applied.has(f));
      console.log(`\n  ${allFiles.length} total, ${applied.size} applied, ${pending.length} pending`);
      process.exit(0);
    }

    // ── Resolve files to run ─────────────────────────────────────────────────
    let files = allFiles;

    if (onlyFile) {
      if (!allFiles.includes(onlyFile)) {
        console.error(`✖ Migration file not found: ${onlyFile}`);
        process.exit(1);
      }
      files = [onlyFile];
    }

    const pending = files.filter((f) => !applied.has(f));

    if (pending.length === 0) {
      console.log('✔ No pending migrations, database is up to date.');
      process.exit(0);
    }

    console.log(`\nRunning ${pending.length} pending migration(s)...\n`);

    // ── Run each file in its own transaction ─────────────────────────────────
    for (const file of pending) {
      const filePath = path.join(MIGRATIONS_DIR, file);
      const sql      = fs.readFileSync(filePath, 'utf8').trim();
      const checksum = simpleChecksum(sql);

      if (!sql) {
        console.warn(`  ⚠ Skipping empty file: ${file}`);
        continue;
      }

      const t0 = Date.now();
      process.stdout.write(`  → ${file} ... `);

      const transaction = await sequelize.transaction();
      try {
        await sequelize.query(sql, { transaction });

        await sequelize.query(
          'INSERT INTO schema_migrations (filename, checksum) VALUES (:filename, :checksum);',
          { replacements: { filename: file, checksum }, transaction }
        );

        await transaction.commit();
        console.log(`done (${formatDuration(Date.now() - t0)})`);
      } catch (err) {
        await transaction.rollback();
        console.error(`FAILED\n`);
        console.error(`  Error in ${file}:`);
        console.error(`  ${err.message}`);
        console.error('\n  Transaction rolled back. Stopping.');
        process.exit(1);
      }
    }

    console.log('\n✔ All migrations applied successfully!');
    process.exit(0);

  } catch (error) {
    console.error('✖ Migration runner failed:', error.message);
    process.exit(1);
  }
};

runMigration();
