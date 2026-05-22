import { pool } from './config/database';
import * as fs from 'fs';
import * as path from 'path';
import { hashPassword } from './utils/hash';

async function migrate() {
  console.log('Running migrations...');

  const migrationFile = path.join(__dirname, '..', 'migrations', '001_initial_schema.sql');
  const migrationSQL = fs.readFileSync(migrationFile, 'utf-8');

  try {
    await pool.query(migrationSQL);
    console.log('Migrations completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }

  // Check for --seed flag
  if (process.argv.includes('--seed')) {
    console.log('Running seed...');

    // Generate proper bcrypt hash at runtime (avoids shell escaping issues with $)
    const adminPassword = await hashPassword('admin123');

    // Insert admin user
    await pool.query(`
      INSERT INTO users (id, name, email, password, role, salary, meal_allowance)
      VALUES (
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        'Admin',
        'admin@financeku.com',
        $1,
        'admin',
        5000000,
        30000
      ) ON CONFLICT (email) DO UPDATE SET password = $1
    `, [adminPassword]);

    // Run rest of seed (categories, settings)
    const seedFile = path.join(__dirname, '..', 'migrations', '002_seed_data.sql');
    const seedSQL = fs.readFileSync(seedFile, 'utf-8');

    try {
      await pool.query(seedSQL);
      console.log('Seed completed successfully!');
    } catch (err) {
      console.error('Seed failed:', err);
      process.exit(1);
    }
  }

  await pool.end();
}

migrate();
