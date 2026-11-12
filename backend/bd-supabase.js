require('dotenv').config();
const { Pool, types } = require('pg');

// bigint (int8) llega como texto por defecto; lo pasamos a número
types.setTypeParser(20, (v) => Number(v));

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 10,
});

module.exports = pool;