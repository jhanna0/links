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
    const createLinksTable = `
    CREATE TABLE IF NOT EXISTS links (
      id SERIAL PRIMARY KEY,
      page TEXT NOT NULL,
      link TEXT NOT NULL,
      description TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT unique_page_link_description UNIQUE (page, link, description)
    );`;

    const createPrivatePagesTable = `
    CREATE TABLE IF NOT EXISTS private_pages (
      id SERIAL PRIMARY KEY,
      page TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL DEFAULT 'Page Title',
      posting_password TEXT NOT NULL,
      viewing_password TEXT NOT NULL,
      salt TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );`;

    try {
        await pool.query(createLinksTable);
        await pool.query(createPrivatePagesTable);
        console.log('✅ Database initialized.');
    } catch (err) {
        console.error('❌ Error initializing database:', err);
    }
};

// Reset the database (delete all records)
// const resetDB = async () => {
//     try {
//         await pool.query("TRUNCATE TABLE links, private_pages RESTART IDENTITY CASCADE;");
//         console.log("✅ Database reset: All data cleared.");
//     } catch (err) {
//         console.error("❌ Error resetting database:", err);
//     }
// };

initDB();

export default pool;
