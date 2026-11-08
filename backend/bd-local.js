require('dotenv').config();
const mysql = require('mysql/promise');

const pool = mysql.createPool({
    host:'localhost',
    prot:'3306',
    user:'root',
    password:'n0m3l0',
    database:'bookbin',
    dateStrings:true
})

module.exports = pool;