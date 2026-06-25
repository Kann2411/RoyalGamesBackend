const { Client } = require('pg');

async function main() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'postgres',
  });

  try {
    await client.connect();
    console.log('Connected to DB');

    const queries = [
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatarData" jsonb;`,
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS avatar_bin bytea;`,
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS avatar_mime varchar;`,
    ];

    for (const q of queries) {
      console.log('Executing:', q);
      await client.query(q);
    }

    console.log('Migration SQL applied successfully');
  } catch (err) {
    console.error('Error applying migration SQL:', err);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();
