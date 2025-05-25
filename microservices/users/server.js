const express = require('express');
const app = express();
const port = 4000;

const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

const { Pool } = require('pg');
const pool = new Pool({connectionString: process.env.DATABASE_URL});

const bcrypt = require('bcryptjs');

app.use(express.json());

app.get('/', (req, res) => {
    res.send(JSON.stringify({service: 'users', status: 'ok'}));
});

//functions and datas
async function getRoleID(role_name) {
    const res = await pool.query('SELECT "ID" FROM roles WHERE name = $1', [role_name]);
    if(res.rowCount < 1)
        return -1;
    return res.rows[0]['ID'];
}

function generateUserJWT(user_info) {
    return jwt.sign({user_id: user_info['ID'], user_role_id: user_info['id_role']}, JWT_SECRET, {expiresIn: '1d'});
}

const error_messages = {
    500: 'Internal server error',
    501: 'Email already registered'
};

function sendError(res, status) {
    res.status(status);
    res.send(JSON.stringify({error: error_messages[status] || 'Internal server error'}));
}

//routes
app.post('/user', async (req, res) => {
    const {email, name, surname, password} = req.body;

    const password_hash = bcrypt.hashSync(password, 10);
    const id_customer = await getRoleID('customer');

    if(id_customer === -1) {
        sendError(res, 500);
        return;
    }

    try {
        const sql_res = await pool.query('INSERT INTO users(email, name, surname, password, id_role) VALUES ($1, $2, $3, $4, $5) RETURNING "ID", email, name, surname', [email, name, surname, password_hash, id_customer]);

        const user_info = sql_res.rows[0];

        res.send(JSON.stringify({
            email: user_info['email'],
            name: user_info['name'],
            surname: user_info['surname'],
            jwt: generateUserJWT(user_info)
        }));
    } catch(err) {
        if(err.code == 23505) //unique_violation https://www.postgresql.org/docs/current/errcodes-appendix.html
            sendError(res, 501);
        else
            sendError(res, 500);
    }
});

app.listen(port, () => {
    console.log('Users microservice online');
});