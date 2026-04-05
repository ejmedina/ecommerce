import "dotenv/config";
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
  const maxAttempts = 15;

  while (attempts < maxAttempts) {
    const client = new Client({
      connectionString: url,
      connectionTimeoutMillis: 10000,
    });

    try {
      attempts++;
      console.log(`⏳ Attempt ${attempts}/${maxAttempts}: Connecting to database...`);
      await client.connect();
      console.log('✅ Database is awake and reachable!');
      await client.end();
      
      // Añadir una pausa extra para que el pooler/Neon se estabilice antes de Prisma
      console.log('⌛ Waiting 5 seconds for stability...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      return;
    } catch (error) {
      console.log(`⚠️ Attempt ${attempts}/${maxAttempts} failed: Database still waking up...`);
      if (attempts === maxAttempts) {
        console.error('❌ Could not wake up database:', error);
        process.exit(1);
      }
      // Wait 3 seconds before next attempt
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
}

warmup();
