import { Client } from 'pg';

async function warmup() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.log('No DATABASE_URL found, skipping warmup.');
    return;
  }

  console.log('🚀 Waking up database...');
  const client = new Client({
    connectionString: url,
    connectionTimeoutMillis: 5000,
  });

  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    try {
      await client.connect();
      console.log('✅ Database is awake and reachable!');
      await client.end();
      return;
    } catch (error) {
      attempts++;
      console.log(`⏳ Attempt ${attempts}/${maxAttempts}: Database still waking up...`);
      if (attempts === maxAttempts) {
        console.error('❌ Could not wake up database');
        process.exit(1);
      }
      // Wait 2 seconds before next attempt
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}

warmup();
