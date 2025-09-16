import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function globalSetup() {
  console.log('🔄 Setting up test environment...');

  try {
    // Reset database with force flag (uses .env.development by default)
    console.log('📦 Resetting database...');
    await execAsync('npx prisma migrate reset --force --skip-generate');

    // Seed the database with test data
    console.log('🌱 Seeding database with test data...');
    await execAsync('npm run db:seed');

    console.log('✅ Test environment setup complete');
  } catch (err) {
    console.error('❌ Failed to setup test environment:', err);
    throw err;
  }
}

export default globalSetup;