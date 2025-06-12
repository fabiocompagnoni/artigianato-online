const express = require('express');
const cookieParser = require('cookie-parser');
const app = express();
const port = 4000;

const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

const { Pool } = require('pg');
const pool = new Pool({connectionString: process.env.DATABASE_URL});

const bcrypt = require('bcryptjs');

app.use(express.json());
app.use(cookieParser());

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

const status_error_messages = {
    500: 'Internal server error',
    512: 'Email already registered',
    513: 'Email address not found',
    514: 'Wrong password',
    515: 'User not found',
    516: 'Invalid password format',
    517: 'Invalid email format',
    518: 'Invalid user name or surname',
    401: 'Unauthorized',
    403: 'Forbidden',
};

function sendError(res, status) {
    res.status(status);
    res.send(JSON.stringify({error: status_error_messages[status] || 'Internal server error'}));
}

function sendUserData(res, user_info) {
    res.cookie('jwt', generateUserJWT(user_info), {httpOnly: true, sameSite: 'Strict', maxAge: 24 * 60 * 60 * 1000});
    res.send(JSON.stringify({
        email: user_info.email,
        name: user_info.name,
        surname: user_info.surname
    }));
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
        console.log(req)
        const token = req.cookies.jwt;

        if(!token) {
            sendError(res, 401);
            return;
        }

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

/*
Requirements:
-length between 8 and 32 characters
-one uppercase letter
-one lowercase
-one digit
-one special character
*/
function checkPassword(password) {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])[\s\S]{8,32}$/;
    return regex.test(password);
}

function checkEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

function getTrimmedName(name) {
    let trim = '';
    for(const c of name) {
        const code = c.charCodeAt(0);
        if(code >= 97 && code <= 122 || code >= 65 && code <= 90)
            trim += c.toLowerCase();
    }

    return trim;
}

//not immune to race conditions, DBMS will handle that
async function generateUserSlug(name, surname) {
    const first = getTrimmedName(name);
    const second = getTrimmedName(surname);

    if(first === '' || second === '')
        throw new Error('Unable to generate slug from user name and surname');

    const slug = first + '-' + second;
    let res = await pool.query('SELECT slug FROM users WHERE slug = $1', [slug]);

    //no users with this slug were found
    if(res.rowCount < 1)
        return slug;

    res = await pool.query('SELECT COUNT(*) AS num FROM users WHERE slug LIKE $1', [slug + '-%']);
    const num = parseInt(res.rows[0].num) + 1;

    return slug + '-' + num;
}


//routes
app.post('/user', async (req, res) => {
    const {email, name, surname, password} = req.body;
    let slug = '';
    try {
        slug = await generateUserSlug(name, surname);
    } catch(e) {
        sendError(res, 518);
        return;
    }

    if(!checkPassword(password)) {
        sendError(res, 516);
        return;
    }

    if(!checkEmail(email)) {
        sendError(res, 517);
        return;
    }

    const password_hash = generatePasswordHash(password);
    const id_customer = await getRoleID('customer');

    if(id_customer === -1) {
        console.log("No id for role 'customer' was found");
        sendError(res, 500);
        return;
    }

    let slug_error = false;
    do {
        try {
            slug_error = false;
            const sql_res = await pool.query('INSERT INTO users(email, name, surname, password, id_role, slug) VALUES ($1, $2, $3, $4, $5, $6) RETURNING "ID", email, name, surname', [email, name, surname, password_hash, id_customer, slug]);

            const user_info = sql_res.rows[0];

            sendUserData(res, user_info);
        } catch(err) {
            if(err.code === '23505') { //unique_violation https://www.postgresql.org/docs/current/errcodes-appendix.html
                if(err.detail.startsWith('Key (email)'))
                    sendError(res, 512);
                else if(err.detail.startsWith('Key (slug)')) {
                    slug_error = true;
                    slug = generateUserSlug(name, surname);
                }
                else {
                    console.log(err);
                    sendError(res, 500);
                }
            }
            else {
                console.log(err);
                sendError(res, 500);
            }
        }
    } while(slug_error);
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
        sendUserData(res, user_info);
    else
        sendError(res, 514);
});

app.get('/user/:user_slug', async (req, res) => {
    const user_slug = req.params.user_slug;

    const sql_res = await pool.query('SELECT users.name AS user_name, surname, roles.name AS role_name, bio, id_profile_picture FROM users JOIN roles ON id_role = roles."ID" WHERE slug = $1', [user_slug]);

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

    if(typeof(edits.password) !== 'undefined' && !checkPassword(edits.password)) {
        sendError(res, 516);
        return;
    }

    if(typeof(edits.email) !== 'undefined' && !checkEmail(edits.email)) {
        sendError(res, 517);
        return;
    }

    if(typeof(edits.name) !== 'undefined' && edits.name.length < 1 ||
    typeof(edits.surname) !== 'undefined' && edits.surname.length < 1) {
        sendError(res, 518);
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
        await client.query('ROLLBACK');
    } finally {
        client.release();
    }
});

app.listen(port, () => {
    console.log('Users microservice online');
});