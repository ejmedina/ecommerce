import "dotenv/config";
import { Client } from 'pg';

async function cleanup() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('❌ No DATABASE_URL found in .env');
    return;
  }

  console.log('🧹 Attempting forceful cleanup of PROD DB:', url.split('@')[1]);
  const client = new Client({ connectionString: url });

  try {
    await client.connect();
    console.log('✅ Connected to database. Dropping public schema...');
    
    await client.query('DROP SCHEMA IF EXISTS public CASCADE');
    await client.query('CREATE SCHEMA public');
    await client.query('GRANT ALL ON SCHEMA public TO public');
    await client.query('GRANT ALL ON SCHEMA public TO neondb_owner');
    
    console.log('✨ Cleanup successful! The database is now empty.');
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await client.end();
  }
}

cleanup();
