require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host:'localhost',
    port:'3306',
    user:'root',
    password:'root',
    database:'bookbin',
    dateStrings:true
})

module.exports = pool;