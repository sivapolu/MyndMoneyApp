import pg from 'pg';

const { Client } = pg;

async function fixDatabase() {
  const client = new Client({ 
    connectionString: process.env.DATABASE_URL 
  });

  try {
    await client.connect();
    console.log('✓ Connected to database');

    // Check existing columns
    const result = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='users' 
      ORDER BY ordinal_position;
    `);
    
    const columns = result.rows.map(r => r.column_name);
    console.log('\nCurrent columns in users table:', columns.join(', '));

    // Add missing columns if needed
    const hasResetToken = columns.includes('reset_token');
    const hasResetTokenExpiry = columns.includes('reset_token_expiry');

    if (!hasResetToken || !hasResetTokenExpiry) {
      console.log('\n⚠ Missing columns detected. Adding them now...');
      
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS reset_token VARCHAR,
        ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMP;
      `);
      
      console.log('✓ Columns added successfully!');
    } else {
      console.log('\n✓ All required columns already exist');
    }

    await client.end();
    console.log('\n✓ Database check complete!');
  } catch (err) {
    console.error('\n✗ Error:', err.message);
    await client.end();
    process.exit(1);
  }
}

fixDatabase();
