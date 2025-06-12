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
    return res.rows[0].ID;
}

function generateUserJWT(user_info) {
    return jwt.sign({user_id: user_info.ID, user_role_id: user_info.id_role}, JWT_SECRET, {expiresIn: '1d'});
}

const error_messages = {
    500: 'Internal server error',
    512: 'Email already registered',
    513: 'Email address not found',
    514: 'Wrong password',
    515: 'User id not found',
    401: 'Unauthorized',
    403: 'Forbidden',
};

function sendError(res, status) {
    res.status(status);
    res.send(JSON.stringify({error: error_messages[status] || 'Internal server error'}));
}

async function getUserPropicUrl(image_id) {
    const sql_res = await pool.query('SELECT url FROM images WHERE "ID" = $1', [image_id]);

    if(sql_res.rowCount < 1)
        return null;
    return sql_res.rows[0].url;
}

//jwt auth middleware
function authJWT(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];

        if(typeof(token) === 'undefined')
            sendError(res, 401);

        jwt.verify(token, JWT_SECRET, (err, user) => {
            if(err) {
                sendError(res, 403);
                return;
            }

            req.user = user;
            next();
        });
    } catch(err) {
        console.log(err);
        sendError(res, 500);
    }
}

function generatePasswordHash(password) {
    return bcrypt.hashSync(password, 12);
}


//routes
app.post('/user', async (req, res) => {
    const {email, name, surname, password} = req.body;

    const password_hash = generatePasswordHash(password);
    const id_customer = await getRoleID('customer');

    if(id_customer === -1) {
        console.log("No id for role 'customer' was found");
        sendError(res, 500);
        return;
    }

    try {
        const sql_res = await pool.query('INSERT INTO users(email, name, surname, password, id_role) VALUES ($1, $2, $3, $4, $5) RETURNING "ID", email, name, surname', [email, name, surname, password_hash, id_customer]);

        const user_info = sql_res.rows[0];

        res.send(JSON.stringify({
            email: user_info.email,
            name: user_info.name,
            surname: user_info.surname,
            jwt: generateUserJWT(user_info)
        }));
    } catch(err) {
        if(err.code === '23505') //unique_violation https://www.postgresql.org/docs/current/errcodes-appendix.html
            sendError(res, 512);
        else {
            console.log(err);
            sendError(res, 500);
        }
    }
});

app.post('/login', async (req, res) => {
    const {email, password} = req.body;

    const sql_res = await pool.query('SELECT "ID", email, name, surname, id_role, password FROM users WHERE email = $1', [email]);

    if(sql_res.rowCount < 1) {
        sendError(res, 513);
        return;
    }

    const user_info = sql_res.rows[0];

    if(bcrypt.compareSync(password, user_info.password))
        res.send(JSON.stringify({
            email: user_info.email,
            name: user_info.name,
            surname: user_info.surname,
            jwt: generateUserJWT(user_info)
        }));
    else
        sendError(res, 514);
});

app.get('/user/:user_id', async (req, res) => {
    const user_id = req.user.user_id;

    const sql_res = await pool.query('SELECT users.name AS user_name, surname, roles.name AS role_name, bio, id_profile_picture FROM users JOIN roles ON id_role = roles."ID" WHERE users."ID" = $1', [user_id]);

    if(sql_res.rowCount < 1) {
        sendError(res, 515);
        return;
    }

    const user_data = sql_res.rows[0];

    const propic_url = await getUserPropicUrl(user_data.id_profile_picture);

    res.send(JSON.stringify({
        name: user_data.user_name,
        surname: user_data.surname,
        role: user_data.role_name,
        bio: user_data.bio,
        url_profile_picture: propic_url
    }));
});

app.put('/user', authJWT, async (req, res) => {
    const user_id = req.user.user_id;
    const edits = req.body;

    if(typeof(edits) === 'undefined') {
        sendError(res, 401);
        return;
    }

    //TODO: implement system to update profile picture
    const actions = ['email', 'name', 'surname', 'bio'];

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const response = {password_changed: false};
        for(const act of actions)
            if(typeof(edits[act]) !== 'undefined') {
                const sql_res = await client.query(`UPDATE users SET ${act} = $1 WHERE "ID" = $2 RETURNING ${act}`, [edits[act], user_id]);
                response[act] = sql_res.rows[0][act];
            }
        
        if(typeof(edits.password) !== 'undefined') {
            const password_hash = generatePasswordHash(edits.password);
            await client.query('UPDATE users SET password = $1 WHERE "ID" = $2', [password_hash, user_id]);
            response.password_changed = true;
            //TODO: consider blacklisting the JWT
        }

        await client.query('COMMIT');

        res.send(JSON.stringify(response));
    } catch(err) {
        if(err.code === '23505') //unique_violation https://www.postgresql.org/docs/current/errcodes-appendix.html
            sendError(res, 512);
        else {
            console.log(err);
            sendError(res, 500);
        }
    } finally {
        await client.query('ROLLBACK');
        client.release();
    }
});

app.listen(port, () => {
    console.log('Users microservice online');
});