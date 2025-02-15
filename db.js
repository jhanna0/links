import pkg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pkg;

// Destructure the result of dotenv.config()
const result = dotenv.config();
if (result.error) {
    throw result.error;
}
const env = result.parsed; // Now 'env' holds your parsed environment variables

const pool = new Pool({
    user: env.USER,
    host: env.HOST,
    database: env.DB,
    password: env.PASSWORD,
    port: env.PORT,
    ssl: { rejectUnauthorized: false }
});

// Test PostgreSQL connection
pool.connect()
    .then(() => {
        console.log('✅ Connected to PostgreSQL');
    })
    .catch(err => {
        console.error('❌ PostgreSQL connection error:', err);
        process.exit(1);
    });

// Initialize the database (create table if it doesn't exist)
const initDB = async () => {
    const createTableQuery = `
    CREATE TABLE IF NOT EXISTS links (
      id SERIAL PRIMARY KEY,
      page TEXT NOT NULL,
      link TEXT NOT NULL,
      description TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `;
    try {
        await pool.query(createTableQuery);
        console.log('Database initialized.');
    } catch (err) {
        console.error('Error initializing database:', err);
    }
};

initDB();

export default pool;
