import pg from 'pg';

const { Client } = pg;

async function checkSchema() {
  const client = new Client({ 
    connectionString: process.env.DATABASE_URL 
  });

  try {
    await client.connect();
    console.log('✓ Connected to database\n');

    // Check which schemas have a users table
    const schemaCheck = await client.query(`
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_name = 'users'
      ORDER BY table_schema;
    `);
    
    console.log('Tables named "users":');
    schemaCheck.rows.forEach(row => {
      console.log(`  - ${row.table_schema}.${row.table_name}`);
    });

    // Check columns in public.users specifically
    console.log('\n--- Checking public.users columns ---');
    const publicUsersColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema='public' AND table_name='users' 
      ORDER BY ordinal_position;
    `);
    
    if (publicUsersColumns.rows.length > 0) {
      console.log('Columns in public.users:', publicUsersColumns.rows.map(r => r.column_name).join(', '));
    } else {
      console.log('⚠ public.users table does NOT exist!');
    }

    // Check columns in auth.users specifically
    console.log('\n--- Checking auth.users columns ---');
    const authUsersColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema='auth' AND table_name='users' 
      ORDER BY ordinal_position;
    `);
    
    if (authUsersColumns.rows.length > 0) {
      console.log('Columns in auth.users:', authUsersColumns.rows.map(r => r.column_name).slice(0, 10).join(', '), '...');
    } else {
      console.log('auth.users table does not exist');
    }

    await client.end();
    console.log('\n✓ Schema check complete!');
  } catch (err) {
    console.error('\n✗ Error:', err.message);
    await client.end();
    process.exit(1);
  }
}

checkSchema();
