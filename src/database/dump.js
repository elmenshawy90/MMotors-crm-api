/**
 * dump.js — يولّد ملف SQL كامل (schema + data) من قاعدة البيانات
 *
 * الاستخدام:
 *   node src/database/dump.js                     ← schema + data
 *   node src/database/dump.js --schema-only        ← schema فقط
 *   node src/database/dump.js --data-only          ← data فقط
 *   node src/database/dump.js --table=users        ← جدول واحد
 *
 * الناتج: dumps/dump_YYYY-MM-DD_HH-MM-SS.sql
 */

import fs from 'fs';
import path from 'path';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

// ─── Config ───────────────────────────────────────────────────────────────────

const args        = process.argv.slice(2);
const SCHEMA_ONLY = args.includes('--schema-only');
const DATA_ONLY   = args.includes('--data-only');
const TABLE_FILTER = (args.find(a => a.startsWith('--table=')) || '').replace('--table=', '') || null;

const DUMPS_DIR = path.join(process.cwd(), 'dumps');

const timestamp = new Date()
  .toISOString()
  .replace(/T/, '_')
  .replace(/:/g, '-')
  .slice(0, 19);

const outFile = path.join(
  DUMPS_DIR,
  `dump_${timestamp}${TABLE_FILTER ? '_' + TABLE_FILTER : ''}${SCHEMA_ONLY ? '_schema' : DATA_ONLY ? '_data' : ''}.sql`
);

// ─── DB Client ────────────────────────────────────────────────────────────────

const client = new Client({
  host:     process.env.DB_HOST,
  port:     parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl:      process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

const out = [];
const w = (line = '') => out.push(line);

const escStr = (val) => {
  if (val === null || val === undefined) return 'NULL';
  const s = String(val)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "''");
  return `'${s}'`;
};

const formatValue = (val, dataType) => {
  if (val === null || val === undefined) return 'NULL';
  const t = (dataType || '').toLowerCase();

  if (t.includes('bool')) return val ? 'TRUE' : 'FALSE';
  if (t.includes('int') || t.includes('numeric') || t.includes('decimal') || t.includes('float') || t.includes('real')) {
    return String(val);
  }
  if (t.includes('json') || t.includes('array') || t === 'ARRAY') {
    return escStr(typeof val === 'string' ? val : JSON.stringify(val));
  }
  if (t.includes('timestamp') || t.includes('date') || t.includes('time')) {
    return escStr(val instanceof Date ? val.toISOString() : String(val));
  }
  return escStr(String(val));
};

// ─── Schema Fetchers ──────────────────────────────────────────────────────────

const getTables = async () => {
  const res = await client.query(`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename != 'schema_migrations'
    ORDER BY tablename;
  `);
  return res.rows.map(r => r.tablename);
};

const getEnumTypes = async () => {
  const res = await client.query(`
    SELECT t.typname AS name,
           array_agg(e.enumlabel ORDER BY e.enumsortorder) AS values
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
    GROUP BY t.typname
    ORDER BY t.typname;
  `);
  return res.rows;
};

const getTableDDL = async (table) => {
  // Columns
  const colRes = await client.query(`
    SELECT
      c.column_name,
      c.udt_name,
      c.data_type,
      c.character_maximum_length,
      c.numeric_precision,
      c.numeric_scale,
      c.is_nullable,
      c.column_default,
      c.ordinal_position
    FROM information_schema.columns c
    WHERE c.table_schema = 'public' AND c.table_name = $1
    ORDER BY c.ordinal_position;
  `, [table]);

  // Primary keys
  const pkRes = await client.query(`
    SELECT kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    WHERE tc.table_schema = 'public'
      AND tc.table_name = $1
      AND tc.constraint_type = 'PRIMARY KEY'
    ORDER BY kcu.ordinal_position;
  `, [table]);
  const pks = new Set(pkRes.rows.map(r => r.column_name));

  // Unique constraints
  const uqRes = await client.query(`
    SELECT kcu.column_name, tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    WHERE tc.table_schema = 'public'
      AND tc.table_name = $1
      AND tc.constraint_type = 'UNIQUE';
  `, [table]);

  // Foreign keys
  const fkRes = await client.query(`
    SELECT
      kcu.column_name,
      ccu.table_name  AS ref_table,
      ccu.column_name AS ref_column,
      rc.delete_rule,
      rc.update_rule,
      tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
    JOIN information_schema.referential_constraints rc
      ON rc.constraint_name = tc.constraint_name
    WHERE tc.table_schema = 'public'
      AND tc.table_name = $1
      AND tc.constraint_type = 'FOREIGN KEY';
  `, [table]);

  // Indexes (non-primary, non-unique-constraint)
  const idxRes = await client.query(`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = $1
      AND indexname NOT LIKE '%_pkey'
    ORDER BY indexname;
  `, [table]);

  const cols = colRes.rows;

  // Build column definitions
  const colDefs = cols.map(c => {
    let typeDef;

    if (c.udt_name.startsWith('enum_')) {
      typeDef = `"public"."${c.udt_name}"`;
    } else if (c.data_type === 'character varying') {
      typeDef = c.character_maximum_length ? `VARCHAR(${c.character_maximum_length})` : 'VARCHAR';
    } else if (c.data_type === 'character') {
      typeDef = `CHAR(${c.character_maximum_length || 1})`;
    } else if (c.data_type === 'numeric') {
      typeDef = c.numeric_precision
        ? `NUMERIC(${c.numeric_precision},${c.numeric_scale || 0})`
        : 'NUMERIC';
    } else if (c.data_type === 'ARRAY') {
      typeDef = `${c.udt_name.replace(/^_/, '')}[]`;
    } else {
      typeDef = c.data_type.toUpperCase();
    }

    let def = `  "${c.column_name}" ${typeDef}`;
    if (c.column_default !== null) def += ` DEFAULT ${c.column_default}`;
    if (c.is_nullable === 'NO') def += ' NOT NULL';
    if (pks.has(c.column_name)) def += ' PRIMARY KEY';
    return def;
  });

  // Unique constraints
  const uqByConstraint = {};
  for (const r of uqRes.rows) {
    if (!uqByConstraint[r.constraint_name]) uqByConstraint[r.constraint_name] = [];
    uqByConstraint[r.constraint_name].push(`"${r.column_name}"`);
  }
  for (const [name, columns] of Object.entries(uqByConstraint)) {
    colDefs.push(`  CONSTRAINT "${name}" UNIQUE (${columns.join(', ')})`);
  }

  // Foreign keys
  for (const fk of fkRes.rows) {
    const onDelete = fk.delete_rule !== 'NO ACTION' ? ` ON DELETE ${fk.delete_rule}` : '';
    const onUpdate = fk.update_rule !== 'NO ACTION' ? ` ON UPDATE ${fk.update_rule}` : '';
    colDefs.push(
      `  CONSTRAINT "${fk.constraint_name}" FOREIGN KEY ("${fk.column_name}") REFERENCES "${fk.ref_table}" ("${fk.ref_column}")${onDelete}${onUpdate}`
    );
  }

  let ddl = `CREATE TABLE IF NOT EXISTS "${table}" (\n${colDefs.join(',\n')}\n);`;

  // Extra indexes
  const extraIndexes = idxRes.rows
    .filter(r => !Object.values(uqByConstraint).some(cols => r.indexdef.includes('UNIQUE')))
    .map(r => `${r.indexdef};`);

  return { ddl, indexes: extraIndexes };
};

// ─── Data Dumper ──────────────────────────────────────────────────────────────

const dumpTableData = async (table) => {
  // Get column type info
  const colRes = await client.query(`
    SELECT column_name, data_type, udt_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = $1
    ORDER BY ordinal_position;
  `, [table]);

  const columns  = colRes.rows.map(r => r.column_name);
  const typeMap  = Object.fromEntries(colRes.rows.map(r => [r.column_name, r.data_type || r.udt_name]));

  // Count rows
  const countRes = await client.query(`SELECT COUNT(*) FROM "${table}";`);
  const total    = parseInt(countRes.rows[0].count);

  if (total === 0) return;

  w(`-- Data for table: ${table} (${total} rows)`);
  w(`ALTER TABLE "${table}" DISABLE TRIGGER ALL;`);

  const BATCH = 500;
  for (let offset = 0; offset < total; offset += BATCH) {
    const dataRes = await client.query(
      `SELECT * FROM "${table}" ORDER BY (SELECT NULL) LIMIT $1 OFFSET $2;`,
      [BATCH, offset]
    );

    const colList = columns.map(c => `"${c}"`).join(', ');
    const valRows = dataRes.rows.map(row => {
      const vals = columns.map(col => formatValue(row[col], typeMap[col]));
      return `  (${vals.join(', ')})`;
    });

    w(`INSERT INTO "${table}" (${colList}) VALUES`);
    w(valRows.join(',\n') + ';');
  }

  w(`ALTER TABLE "${table}" ENABLE TRIGGER ALL;`);
  w('');
};

// ─── Main ─────────────────────────────────────────────────────────────────────

const main = async () => {
  if (!fs.existsSync(DUMPS_DIR)) fs.mkdirSync(DUMPS_DIR, { recursive: true });

  console.log('Connecting to database...');
  await client.connect();
  console.log('Connected.\n');

  // Header
  w('-- ============================================================');
  w(`-- Database dump: ${process.env.DB_NAME}`);
  w(`-- Host:          ${process.env.DB_HOST}`);
  w(`-- Generated:     ${new Date().toISOString()}`);
  if (TABLE_FILTER) w(`-- Table filter:  ${TABLE_FILTER}`);
  w('-- ============================================================');
  w('');
  w('SET client_encoding = \'UTF8\';');
  w('SET standard_conforming_strings = on;');
  w('SET check_function_bodies = false;');
  w('SET client_min_messages = warning;');
  w('');

  let tables = TABLE_FILTER ? [TABLE_FILTER] : await getTables();

  // ── SCHEMA ────────────────────────────────────────────────────────────────
  if (!DATA_ONLY) {
    // ENUM types
    const enums = await getEnumTypes();
    if (enums.length > 0) {
      w('-- ENUM Types');
      for (const en of enums) {
    const vals = (Array.isArray(en.values) ? en.values : en.values.replace(/[{}]/g, '').split(',')).map(v => `'${v.trim()}'`).join(', ');
        w(`DO $$ BEGIN`);
        w(`  CREATE TYPE "public"."${en.name}" AS ENUM (${vals});`);
        w(`EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
      }
      w('');
    }

    // Tables
    w('-- Tables');
    for (const table of tables) {
      process.stdout.write(`  Schema: ${table} ... `);
      try {
        const { ddl, indexes } = await getTableDDL(table);
        w(`-- Table: ${table}`);
        w(ddl);
        if (indexes.length > 0) {
          w('');
          indexes.forEach(idx => w(idx));
        }
        w('');
        console.log('done');
      } catch (e) {
        console.log(`WARN: ${e.message}`);
      }
    }
  }

  // ── DATA ──────────────────────────────────────────────────────────────────
  if (!SCHEMA_ONLY) {
    w('-- Data');
    w('SET session_replication_role = replica; -- disable FK checks during restore');
    w('');

    for (const table of tables) {
      process.stdout.write(`  Data:   ${table} ... `);
      try {
        await dumpTableData(table);
        console.log('done');
      } catch (e) {
        console.log(`WARN: ${e.message}`);
      }
    }

    w('SET session_replication_role = DEFAULT;');
  }

  // Write file
  fs.writeFileSync(outFile, out.join('\n'), 'utf8');
  const sizeKB = (fs.statSync(outFile).size / 1024).toFixed(1);

  await client.end();

  console.log(`\n✔ Dump saved: ${outFile} (${sizeKB} KB)`);
};

main().catch(err => {
  console.error('Dump failed:', err.message);
  process.exit(1);
});
