import EmbeddedPostgres from 'embedded-postgres';
import path from 'path';
import fs from 'fs';

async function main() {
  const dataDir = path.resolve(process.cwd(), 'data/postgres');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  console.log('Initializing Embedded PostgreSQL on port 5432...');
  const pg = new EmbeddedPostgres({
    databaseDir: dataDir,
    port: 5432,
    user: 'postgres',
    password: 'password',
    databaseDirPermissions: '0700'
  });

  try {
    await pg.initialise();
    console.log('PostgreSQL cluster initialised.');
  } catch (err) {
    console.log('Initialise message:', err.message);
  }

  await pg.start();
  console.log('Embedded PostgreSQL is running on port 5432!');

  try {
    await pg.createDatabase('vetvision_ai');
    console.log('Database vetvision_ai created or verified.');
  } catch (err) {
    console.log('createDatabase message:', err.message);
  }
}

main().catch(console.error);
